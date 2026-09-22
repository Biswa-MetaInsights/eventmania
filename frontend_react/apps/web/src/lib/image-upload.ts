// ─────────────────────────────────────────────────────────────────────────────
//  The picture "upload" — a picked file, downscaled in the browser.
//
//  TWO SIZES, ONE PIPELINE: `fileToCoverDataUrl` for an event's cover photo and
//  `fileToAvatarDataUrl` for a participant's profile picture. Same decode, same
//  quality ladder, same `data:` URL; they differ only in how big the result may
//  be and whether it is cropped square. **Do not add a third by copying this
//  file — pass another `Recipe`.**
//
//  ⚠️ THERE IS NO UPLOAD ENDPOINT AND NO FILE STORAGE. The events backend has
//  neither (TODO.md §19.12; `image_url` is in `EXTRA_KEYS` for the related
//  reason that `EventUpdate` has no field for it), so a picked file is resized
//  here and carried INLINE as a `data:` URL in the event's own `image_url` —
//  the very field a pasted link goes into. That is the whole trick: every
//  surface that already renders `image_url` — the hero, the edit dialog's
//  preview, the share image — renders an uploaded picture with no change at all.
//
//  When a real endpoint lands, `fileToCoverDataUrl` becomes the POST and returns
//  the stored URL; no call site has to move.
//
//  ⚠️ THE SIZE CAPS ARE LOAD-BEARING, NOT COSMETIC. In dummy mode the event is
//  written to localStorage, whose quota is ~5 MB for the WHOLE app. A phone
//  photo is 4 MB on its own, and base64 inflates it by a third — without the
//  downscale the create would fail on save with nothing on screen but "Failed to
//  save event".
// ─────────────────────────────────────────────────────────────────────────────

/** Refused before we even decode it. Generous — this is the "that is a RAW file"
 *  guard, not the size rule; the real limit is what survives the downscale. */
export const MAX_FILE_BYTES = 12 * 1024 * 1024;

/** Tried in order until one fits. 0.82 is the visual default; the lower two are
 *  for a photograph busy enough that the target size still will not fit. */
const QUALITIES = [0.82, 0.68, 0.54];

/** What one kind of picture is allowed to be. See the two below. */
interface Recipe {
  /** Longest edge kept. */
  maxEdge: number;
  /** What the downscaled result must fit in, decoded. See the quota note above. */
  maxBytes: number;
  /** Centre-crop to a square before scaling — for a picture shown in a circle. */
  square?: boolean;
  /** The last-resort message when even the lowest quality will not fit. */
  tooDetailed: string;
}

/** The hero renders at 1920 but behind a scrim, where 1280 is indistinguishable
 *  and a quarter of the bytes. */
const COVER: Recipe = {
  maxEdge: 1280,
  maxBytes: 800 * 1024,
  tooDetailed: "That image is too detailed to store on this device. Try one under 1500px wide.",
};

/** The profile picture is never drawn larger than the dashboard's 112px disc, so
 *  320px covers a 2× screen with room to spare — and 150 KB keeps a whole
 *  household of accounts inside the ~5 MB localStorage the wishlist also shares. */
const AVATAR: Recipe = {
  maxEdge: 320,
  maxBytes: 150 * 1024,
  square: true,
  tooDetailed: "That picture could not be made small enough. Try a different photo.",
};

export type CoverImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

/**
 * A file from an `<input type="file">` → a `data:` URL small enough to store.
 *
 * ⚠️ Browser-only (canvas). Call it from an event handler, never from render or
 * anything that runs on the server.
 */
export function fileToCoverDataUrl(file: File): Promise<CoverImageResult> {
  return fileToDataUrl(file, COVER);
}

/** The same, for a profile picture: smaller, and cropped square for its circle. */
export function fileToAvatarDataUrl(file: File): Promise<CoverImageResult> {
  return fileToDataUrl(file, AVATAR);
}

async function fileToDataUrl(file: File, recipe: Recipe): Promise<CoverImageResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "That file is not an image." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "That image is over 12 MB. Pick a smaller one." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, message: "That image could not be read. Try a JPG, PNG or WebP." };
  }

  /* The source rectangle: the whole picture for a cover, its biggest centred
     square for an avatar. Cropping HERE rather than leaning on the CSS
     `object-cover` of whatever renders it means the bytes we store are the bytes
     that get shown — a 4:3 photo does not pay for the third of itself that the
     circle hides. */
  const side = Math.min(bitmap.width, bitmap.height);
  const src = recipe.square
    ? { x: (bitmap.width - side) / 2, y: (bitmap.height - side) / 2, w: side, h: side }
    : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };

  const scale = Math.min(1, recipe.maxEdge / Math.max(src.w, src.h));
  const width = Math.max(1, Math.round(src.w * scale));
  const height = Math.max(1, Math.round(src.h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { ok: false, message: "This browser could not process that image." };
  }

  /* ⚠️ Paint the ground FIRST. The output is JPEG, which has no alpha channel —
     a transparent PNG drawn straight onto a fresh canvas comes out with BLACK
     wherever it was see-through. */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, src.x, src.y, src.w, src.h, 0, 0, width, height);
  bitmap.close();

  for (const quality of QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (decodedBytes(dataUrl) <= recipe.maxBytes) return { ok: true, dataUrl };
  }
  return { ok: false, message: recipe.tooDetailed };
}

/** Bytes the base64 payload decodes to — three bytes per four characters. */
function decodedBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

const HTTP_SRC = /^https?:\/\/\S+$/i;
const DATA_SRC = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i;

/**
 * ⚠️ THE ONE TEST FOR A COVER IMAGE, and both forms must use it. A cover image
 * that 404s is the hero of the page an organiser is about to share — but since
 * an upload IS a `data:` URL now, a create form that only accepted `http(s)`
 * would reject the file it had just accepted from the file picker.
 */
export function isImageSrc(value: string): boolean {
  const v = value.trim();
  return HTTP_SRC.test(v) || DATA_SRC.test(v);
}

/** The wording both forms show when `isImageSrc` says no. One sentence, one place. */
export const IMAGE_SRC_ERROR =
  "Upload a file, or paste a full image URL starting with http:// or https://";

/** True for a picture that came off this device rather than a pasted link. */
export const isUploadedImage = (value: string): boolean => value.trim().startsWith("data:");

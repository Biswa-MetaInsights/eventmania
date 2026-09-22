// ─────────────────────────────────────────────────────────────────────────────
//  THE CSV download. One definition — the attendees export and the earnings
//  statement both come through here.
//
//  ⚠️ It is a BROWSER-ONLY side effect (Blob + object URL + a synthetic click),
//  so call it from an event handler, never from render or a server component.
//
//  ⚠️ A CSV IS NOT `values.join(",")`. Three separate things break that: a comma
//  inside a venue name, a quote inside a title, and a newline inside a
//  description — each silently shifts every later column of that row, which is
//  worse than failing, because the file still opens. `cell()` below is the whole
//  fix and every value goes through it.
// ─────────────────────────────────────────────────────────────────────────────

export type CsvValue = string | number | null | undefined;

/**
 * One field, RFC 4180 style: quote it if it could confuse a parser, and double
 * any quote inside it.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with a tab as well. Spreadsheets
 * treat those as the start of a FORMULA, so an attendee whose name or "how did
 * you hear about us" answer begins with one becomes executable content in the
 * organiser's spreadsheet. The tab keeps the text intact and visible while
 * making it inert.
 */
function cell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `\t${s}`;
  return /[",\r\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows → a CSV string. Exported separately so it can be unit-tested without a DOM. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  // CRLF, not LF: Excel is the tool an organiser will actually open this in.
  return [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
}

/**
 * Build the file and hand it to the browser.
 *
 * The BOM is not decoration — without it Excel reads the file as the system
 * codepage and every non-ASCII name, and every ₹, arrives mojibake.
 */
export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([`﻿${toCsv(headers, rows)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously cancels the download in Safari; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `Attendees · Cyanotype Lab` → `attendees-cyanotype-lab-2026-08-24.csv`. */
export function csvFilename(...parts: string[]): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "export"}-${stamp}.csv`;
}

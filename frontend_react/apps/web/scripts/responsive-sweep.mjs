// Responsive sweep — measures `document.scrollWidth === clientWidth` on every
// route at the nine widths apps/web/CLAUDE.md names, and lists the elements
// that poke past the viewport when it is not. Drives the installed Chrome over
// raw DevTools Protocol, so there is no npm dependency (Node 22+ has fetch and
// WebSocket built in).
//
//   pnpm --filter @eventmind/web sweep                       # public routes
//   pnpm --filter @eventmind/web sweep -- --shots            # + full-page JPEGs
//   pnpm --filter @eventmind/web sweep -- --email=a@b.c --password=…
//                                                            # + signed-in routes
//   pnpm --filter @eventmind/web sweep -- --routes=/,/explore --widths=320,1024
//
// The dev server must already be running (default http://localhost:3000; pass
// --base=… to override). Screenshots land in scripts/sweep-shots/.
//
// ⚠️ /dashboard, /organizer/create and /checkout/[id] redirect to /auth on a
// HARD load before the persisted session rehydrates (their guards do not wait
// for `_hasHydrated`). With credentials the sweep reaches them through the
// navbar menus instead, as a user would.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  }),
);
const BASE = args.base ?? "http://localhost:3000";
const API = args.api ?? "http://localhost:8000";
// Comma OR space separated — PowerShell rewrites `a,b` as `a b` before pnpm sees it.
const list = (v) => String(v).trim().split(/[,\s]+/).filter(Boolean);
const WIDTHS = args.widths ? list(args.widths).map(Number) : [320, 375, 414, 768, 1024, 1100, 1280, 1440, 1920];
const PORT = Number(args.port ?? 9333);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "sweep-shots");

const CHROME =
  args.chrome ??
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
if (!CHROME) { console.error("No Chrome/Edge found — pass --chrome=<path>"); process.exit(1); }

const PUBLIC_ROUTES = ["/", "/explore", "/auth", "/organizer/onboarding", "/badge-preview"];
// ⚠️ No bare "/organizer" — it is a redirect to /organizer/events since the
// console's Dashboard was folded into Events (2026-09-07), so sweeping it would
// measure the same page twice under a route name that never renders.
const AUTH_ROUTES = ["/dashboard", "/chat", "/organizer/events", "/organizer/attendees", "/organizer/earnings", "/organizer/create"];
// Reached by clicking the navbar item with this label (see the header note).
const MENU_LABEL = { "/dashboard": "My Dashboard", "/organizer/create": "Create Event" };

// ── CDP plumbing ─────────────────────────────────────────────────────────────
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${path.join(process.env.TEMP ?? "/tmp", `nf-sweep-${PORT}`)}`, "about:blank",
], { stdio: "ignore" });
process.on("exit", () => { try { chrome.kill(); } catch {} });

async function waitForChrome() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return r.json(); } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      const p = m.id && this.pending.get(m.id);
      if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, sessionId })); });
  }
}

async function evalJS(page, expression) {
  const r = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}

// Anything (not fixed-positioned, not inside an intentional horizontal
// scroller) whose box crosses the viewport's edge.
const PROBE = `(() => {
  const de = document.documentElement, cw = de.clientWidth, sw = de.scrollWidth, bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (getComputedStyle(el).position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || (r.right <= cw + 1 && r.left >= -1)) continue;
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; }
    if (clipped) continue;
    const cls = (typeof el.className === 'string' ? el.className : '').split(/\\s+/).slice(0, 6).join(' ');
    bad.push({ tag: el.tagName.toLowerCase(), cls, txt: (el.textContent || '').trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
    if (bad.length >= 8) break;
  }
  return { cw, sw, sh: de.scrollHeight, overflow: sw - cw, bad, path: location.pathname };
})()`;

async function login() {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: args.email, password: args.password }) });
  if (!r.ok) throw new Error(`login failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  const ver = await waitForChrome();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const page = { send: (m, p) => cdp.send(m, p, sessionId) };
  await page.send("Page.enable"); await page.send("Runtime.enable");

  const authed = !!(args.email && args.password);
  if (authed) {
    const tokens = await login();
    const persisted = JSON.stringify({ state: { userEmail: args.email, tokens, isAuthenticated: true, _hasHydrated: false }, version: 0 });
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.setItem("eventmind-auth", ${JSON.stringify(persisted)}); } catch {}` });
  }

  let routes = args.routes ? list(args.routes) : [...PUBLIC_ROUTES, ...(authed ? AUTH_ROUTES : [])];
  if (!args.routes) {
    // The event pages are client-rendered, so pick a live id off /explore.
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send("Page.navigate", { url: `${BASE}/explore` }); await sleep(6000);
    const [ev] = await evalJS(page, `[...new Set([...document.querySelectorAll('a[href^="/event/"]')].map(a => a.getAttribute('href').split('?')[0]))]`);
    if (ev) routes.push(ev, ...(authed ? ["/checkout/" + ev.split("/").pop()] : []));
  }

  if (args.shots) mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const route of routes) {
    for (const w of WIDTHS) {
      await page.send("Emulation.setDeviceMetricsOverride", { width: w, height: w < 800 ? 800 : 900, deviceScaleFactor: 1, mobile: w < 800 });
      if (authed && MENU_LABEL[route]) {
        await page.send("Page.navigate", { url: BASE + "/" }); await sleep(3000);
        const ok = await evalJS(page, `(async () => {
          const label = ${JSON.stringify(MENU_LABEL[route])}, wait = (ms) => new Promise(r => setTimeout(r, ms));
          const find = () => [...document.querySelectorAll('button')].find(b => b.textContent.replace(/\\s+/g, ' ').trim().endsWith(label) && b.getClientRects().length);
          let t = find();
          if (!t) { const burger = document.querySelector('button[aria-label="Open menu"]'); if (burger?.getClientRects().length) { burger.click(); await wait(300); t = find(); } }
          if (!t) for (const trig of document.querySelectorAll('button[aria-haspopup="menu"]')) { trig.click(); await wait(250); if ((t = find())) break; }
          if (!t) return false; t.click(); return true;
        })()`);
        if (!ok) console.log(`           (menu item "${MENU_LABEL[route]}" not in the navbar for this account)`);
      } else {
        await page.send("Page.navigate", { url: BASE + route });
      }
      await sleep(w === WIDTHS[0] ? 4000 : 2500);
      let probe;
      try { probe = await evalJS(page, PROBE); } catch (e) { probe = { cw: w, sw: -1, overflow: NaN, bad: [], err: String(e) }; }
      const flag = probe.overflow > 0 ? "OVERFLOW" : "ok";
      const note = probe.path && probe.path !== route ? `  -> landed on ${probe.path}` : "";
      console.log(`${flag.padEnd(8)} ${String(w).padStart(4)}  ${route.padEnd(40)} sw=${probe.sw} cw=${probe.cw}${note}`);
      for (const b of probe.bad) console.log(`           <${b.tag} class="${b.cls}"> left=${b.left} right=${b.right} "${b.txt}"`);
      results.push({ route, w, ...probe });
      if (args.shots) {
        const shot = await page.send("Page.captureScreenshot", { format: "jpeg", quality: 60, captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(probe.sh || 900, 4000), scale: 1 } });
        writeFileSync(path.join(OUT, `${route.replace(/[/[\]]/g, "_") || "home"}@${w}.jpg`), Buffer.from(shot.data, "base64"));
      }
    }
  }
  const bad = results.filter((r) => r.overflow > 0);
  console.log(`\n${bad.length} overflowing route×width combos of ${results.length}`);
  ws.close(); // before killing Chrome, or libuv asserts on the half-open socket
  await sleep(200);
  chrome.kill();
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });

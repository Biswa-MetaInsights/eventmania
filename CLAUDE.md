# NewFind — Standing Rules

> **This file is loaded into every session automatically.** Everything in it is a rule you need in
> context **before you know you need it** — the things you would otherwise get confidently wrong
> without ever suspecting a house rule existed. Everything else is one hop away and named below.
>
> **⚠️ THE BUDGET IS 12 KB.** Check with `(Get-Item CLAUDE.md).Length/1KB`. Over it, **move a section
> to `HANDOVER.md` and leave a pointer — do not compress sentences.** Every line here is paid for on
> every turn of every session, including the ones that never touch the thing it describes. **Each
> addition will feel individually justified; that is exactly how the old combined file reached
> 104 KB.** The question is never "is this line worth adding" but "is it worth adding *here*."

> **⚠️ Folder name has a space.** The parent folder is `Event mind` (with a space). Always quote
> paths in the terminal: `cd "c:\...\Event mind\eventmind"`. Forgetting the quotes breaks commands
> silently.

---

## Where everything lives

> ⚠️ **Read the SECTION, not the file.** `TODO.md` and `COMPONENTS.md` are each many times the size
> of this one — opening either whole costs more context than every rule you are working from, to
> answer one question. **All of these are greppable by heading; the third column says how.** A
> whole-file read is a mistake, not thoroughness.

| You need | File | How to read it |
|---|---|---|
| How to run it, architecture, repo layout, the component index | **`HANDOVER.md`** | Grep `^## ` for the one section |
| Brand, colour, typography, shape, borders, hover, responsiveness | **`frontend_react/apps/web/CLAUDE.md`** | **Loads itself** when you touch web files |
| What state something is in — shipped / partial / not started / known-wrong | **`STATUS.md`** | Five `## ` headings; read the one that answers you. Whole file only on a genuine cold start. |
| The gotcha for one component — the thing you'd get wrong without being told | **`COMPONENTS.md`** | **Grep the filename.** One table row is the whole answer. |
| Specs for unbuilt work, and what's blocked on a decision | **`TODO.md`** | Index table at the top, then grep `^## N\.`. A `§19.12` reference means heading `## 19.` |
| Why the design is the way it is — measurements, rejected alternatives | **`DESIGN_NOTES.md`** | Grep `^## N\.` for the § you were sent to |
| When or why something changed | **`CHANGELOG.md`** | Newest first under `## YYYY-MM-DD`. **Never read it whole** — it only grows. |
| Product direction — PRD, competitor analysis, migration notes | `Eventmind_files/` | **Only when Gautham asks.** Not for fixing a bug or implementing a decided feature. |

**Where new writing goes:** conventions and gotchas still true tomorrow → `HANDOVER.md` (or here, if
every session must have it). "What I did" → `CHANGELOG.md`. "What state it's in" → `STATUS.md`.
"What's left" → `TODO.md`. "Why it looks like that" → `DESIGN_NOTES.md`.

Separately: **don't build a feature that wasn't asked for.** Confirm scope with Gautham first.

---

## What Is NewFind?

NewFind (formerly EventMind internally) is an AI-powered event discovery platform — think Eventbrite
meets Meetup, with an AI layer for personalised recommendations and community matching. Users
discover events, register, buy tickets, and chat with other attendees. Organisers create and manage
events.

The project is mid-build. The frontend is a React/Next.js web app in `frontend_react/`. It was
originally migrated from a Flutter Web prototype; that Flutter app has since been **deleted**.

> **This is React/Next.js — NOT React Native.** React Native is a mobile framework. This is a
> Next.js web app. Do not confuse the two.

`eventmind` survives as the internal package scope (`@eventmind/web`) and the localStorage key
prefix. **NewFind** is the user-facing name.

---

## Execution Rules (read before every task)

- Before starting any task, identify the exact files needed. Open **only** those files.
- Do **not** explore the full project structure unless explicitly asked.
- Do **not** read `node_modules`, `.next`, `.venv`, `__pycache__`, or any build/cache directory. **One exception, and it is narrow:** `node_modules/next/dist/docs/` when you are about to use a Next.js API and are unsure of its current shape — this is Next 16 and training data goes stale. **Grep for the one file; never browse the tree.** Conditions in `apps/web/AGENTS.md`.
- Do **not** re-read files you have already read in this session.
- If a task touches only one component, open only that component file.
- **After any TypeScript change**, run `pnpm --filter @eventmind/web type-check`. Do not report a task done if it fails. ⚠️ **The ONE exception is an edit the compiler cannot see** — copy inside JSX, a `--brand-*` value in `globals.css`, a Tailwind class string, a comment, a markdown doc. **A prop, an import, a type, a signature, a conditional, or a file being created / renamed / deleted is NOT that** — run it. **Unsure? Run it.** The check costs seconds; skipping it wrongly costs a bug reported as done.
- **`pnpm lint` is CONDITIONAL, type-check is not.** Run it only when the change can trip a rule it owns — a hook, `<img>` vs `next/image`, `<a>` vs `next/link`, an unused import, `Date.now()` in a component body. It is slower than type-check and finds nothing on a padding tweak.
- **For UI changes, run the dev server and verify visually.** Type-checking does not catch visual bugs. **Scope it to what actually changed:** geometry, a new component, or anything responsive needs real eyes (plus the 1024px re-measure). A colour token or a copy swap does not — **unless it changes a width**, and a longer label always does.
- **If you change something these docs describe, fix the description in the same task** — not at the end, not next session. **A stale instruction is worse than no instruction:** it doesn't just waste tokens, it actively produces wrong work.
- After completing a task, list only the files you modified.
- **Before building anything complex, state your interpretation and confirm before proceeding.** Especially when an image or asset is uploaded (do not hand-draw or reconstruct it — ask how to use it), when the request is ambiguous, or when the implementation could go several ways. A brief "Here's what I'm planning — does that sound right?" prevents wasted effort.

---

## Performance Rules

- **Use `next/image` for images.** The one deliberate exception is `HeroCarousel`, which needs `<img>` because its wipe relies on `clip-path` (eslint-disabled inline). **Do not "fix" it.** Any new `<img>` needs the same kind of justification.
- **Use `next/link` for internal navigation.** Never a bare `<a>`.
- **Always give `<Image>` a meaningful `sizes` prop** — do not leave the default.
- Lazy-load below-the-fold components with `next/dynamic` where appropriate.
- **Do not add npm dependencies without asking.** Do not import from `node_modules` paths that aren't in `package.json`.

---

## Contribution Guidelines

1. **(MANDATORY) Update `STATUS.md`** whenever something moves between shipped / partial / not started, or is reverted. **Rewrite the section in place — never append.** It describes the present only, so a stale entry there is a bug.
2. **Add to `CHANGELOG.md` only for a meaningful change** — a feature landing, a decision, a revert — **one short line**, newest first. **Not** every file edit. Skip it entirely for small tweaks, refactors and work in progress, and **never log churn reverted in the same session.** Unsure? Then it isn't meaningful — update `STATUS.md` and skip the changelog.
3. **Update the handover docs only for things still true tomorrow** — conventions and gotchas. They are instructions, not a record and not a status board. "What I did" → `CHANGELOG.md`; "what state it's in" → `STATUS.md`; "what's left" → `TODO.md`; "why it looks like that" → `DESIGN_NOTES.md`.
4. **Update `COMPONENTS.md`** when a component is created or its purpose changes — one row, and only the gotcha someone would get wrong without it. Not a description of the work. **Add the file to `HANDOVER.md`'s *Component Registry* index too** (one short line, no gotcha), or it exists in the registry and nowhere anyone will look. ⚠️ **A row that has grown into an essay is a bug** — the reasoning belongs in `DESIGN_NOTES.md` with a pointer left behind. The registry hit 67 KB before it was split out; **keeping it small is what keeps it read.**
5. **Run `pnpm --filter @eventmind/web type-check` before finishing** — mandatory, with the one narrow exception stated in *Execution Rules*. **Lint and visual verification are conditional; their conditions are stated there too.** Do not restate any of the three here — one definition or they drift.
6. **Match the brand system** — tokens from `globals.css`, one font, no new colours or fonts without approval. The rules are in `frontend_react/apps/web/CLAUDE.md`, which loads itself when you touch web files.
7. **Save new project documents to `Eventmind_files/`**, not inside `eventmind/`.
8. **Never commit `.env.local`, `.env` or `start.bat`** — all git-ignored, all hold secrets.
9. **Keep Node at v20+** — `.nvmrc` pins 24.16.0; run `nvm use` inside `frontend_react/`.
10. **If you delete `platform_dev.db`** — restart all services first (so the community service creates the `communities` table), then re-run `seed_events.py`.
11. **Always stop the dev server with `Ctrl+C` in its terminal** — never just close the window. Killing the terminal on Windows orphans the Next.js worker processes; they accumulate across runs (we once found 321 zombie `node` processes), eat RAM, and cause heap-allocation crashes on later runs. Clean up orphans after a crash:
    ```powershell
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'next' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    ```
    **If it OOMs, delete `.next` and retry BEFORE falling back to `dev:webpack`** — a stale Turbopack cache is the usual culprit, and plain `dev` is ~12x faster. Details: `HANDOVER.md` → *How to Run*.
12. **Never attribute commits to a tool.** No `Co-Authored-By:` trailers for AI assistants, no "Generated with…" lines, no tool attribution in commit messages or PR descriptions. **Biswajith and Gautham are the only contributors on this repo.**
13. **⚠️ STRIP THE DEV BYPASS BEFORE DEPLOYING.** `lib/dev-flags.ts` holds the developer escape hatches — today `SKIP_ORGANIZER_VERIFICATION`, which opens `/organizer/create` with no verified organiser profile and adds a dev strip to `/organizer/onboarding`. **The removal checklist is in `HANDOVER.md` → *Shipping checklist*; run it as part of shipping.**

    **What this is NOT:** it is not a live hole in production. Every flag is `NODE_ENV === "development" && <env var>`, both halves statically replaced at build time, so a production build already evaluates each to `false` and the bundler drops the code behind it — **setting the env var in a deploy environment does nothing.** **The corollary matters more than the checklist: if you ever find a flag in that file missing its `NODE_ENV` half, that one IS a live bypass — fix it before anything else ships.**

---

## Keeping this file true

- **Point at the source of truth; don't copy it.** Colours, fonts, ports, limits and env vars are *defined* in `globals.css`, `layout.tsx`, `start.bat`, `config.py`, `.env.example`. **Name the file instead of restating the value** — a pointer can't rot, a copy silently does. **This is the strongest rule here:** it makes a whole class of drift structurally impossible.
- **Verify before you write.** Check any factual claim against the code — not against memory, and not against what another section says. A wrong line will happily propagate itself.
- **Correct in place; never append.** When a rule changes, **edit the original sentence.** Do not add "actually, now…" underneath it. `CHANGELOG.md` is where the before/after belongs; these docs state only what is true right now.

# EventMind — Session Log (CLAUDE_gk.md)

> Reference doc for Gautham Krishna. Summarises everything done across all sessions so the next conversation can pick up without re-explaining context.

---

## Project Overview

**EventMind** — AI-powered event discovery platform (Flutter Web + FastAPI + PostgreSQL).

- Frontend: Flutter Web (`eventmind/frontend/`) with Riverpod + GoRouter
- Backend: FastAPI (`eventmind/backend/`) — auth, events, websocket chat
- Color palette: `#184E4A` (deep forest green) + `#F2EFEA` (linen/cream) + `#111827` (near-black text)
- Design reference: functionhealth.com aesthetic, austoentertainment.com color pair

---

## Sessions 1 & 2 — UI / Navbar

### 1. Brand Color System

Replaced all blue/teal/generic Material colors with the brand palette across every screen:

| Token | Hex | Usage |
|---|---|---|
| `_kGreen` | `#184E4A` | Wordmark, buttons, badges, icons |
| `_kLinen` | `#F2EFEA` | Navbar bg, dropdown bg, scaffold bg |
| `_kText` | `#111827` | Body text, nav labels |
| `_kBorder` | `#E2DDD5` | Input borders, dividers |

Updated in: `main.dart` (ThemeData), `event_card.dart`, `discovery_page.dart`, `event_navbar.dart`.

---

### 2. Sticky Navbar — `frontend/lib/ui/components/event_navbar.dart` (new file)

Full navbar built from scratch. Layout (left → right):

```
[Logo + EventMind wordmark] [Search bar: 380px] ··· [Events ▾] [Groups ▾] [Help] [🔔] [Name + Avatar ▾]
```

**Key design decisions:**
- Linen (`#F2EFEA`) background — makes `#184E4A` read as clearly green (not near-black as on pure white)
- Bottom border `#C8C1B8` — slightly darker than linen for visibility
- All dropdowns use `MenuAnchor` + `MenuController` (Material 3)
- Hover state: dark green fill (`#184E4A`) + linen text/icon — applied via `WidgetStateProperty.resolveWith`
- Child `Text`/`Icon` widgets have **no explicit `color:`** so they inherit `foregroundColor` from `ButtonStyle` on hover

**Shared style helpers:**
```dart
ButtonStyle _hoverStyle({...})          // for TextButton nav items
ButtonStyle _hoverMenuItemStyle({...})  // for MenuItemButton dropdown items
```

**Dropdown exclusivity (hover-open pattern):**
- Three `MenuController`s owned by `_EventNavbarState`: `_eventsController`, `_groupsController`, `_avatarController`
- Each dropdown's `onHoverOpen` closes the other two
- Logo, search, Help, bell: all wrapped in `MouseRegion(onEnter: (_) => _closeAllMenus())`
- `_closeAllMenus()` closes all three controllers

**Events dropdown items:**
- 🔍 Explore Events → `/`
- ➕ Create Event → `/organizer/create`
- 📅 My Events → `/dashboard` (or `/auth` if not logged in)

**Groups dropdown items:**
- All three items show a "coming soon" SnackBar (Event Groups is MVP but not yet built)

**Avatar menu:**
- Opens on hover (same pattern as Events/Groups)
- Settings → `/dashboard`
- Log Out → calls `authProvider.notifier.logout()`
- Log Out default colour is green (`_kGreen`), turns linen on hover (consistent, not red)
- Avatar trigger (name + circle) uses `TextButton` with `_hoverStyle` so name and icon both go linen on hover

**Notification bell:**
- Logged-in only
- `IconButton` with `ButtonStyle` using `WidgetStateProperty.resolveWith` — goes green fill + linen icon on hover

---

### 3. Discovery Page — `frontend/lib/ui/views/discovery_page.dart`

- Removed old inline navbar from the hero section
- Added `SliverPersistentHeader(pinned: true, delegate: _StickyNavDelegate())` so navbar sticks on scroll
- `_StickyNavDelegate`: `minExtent = maxExtent = 72`, returns `const EventNavbar()`
- Search bar moved into the navbar; hero section is now purely the brand statement
- Fixed `desiredAccuracy` deprecation → `locationSettings: const LocationSettings(accuracy: LocationAccuracy.low)`

---

### 4. Auth Provider Fix — `frontend/lib/blocs/auth_provider.dart`

**Problem:** After a hot restart, `isAuthenticated` was restored from secure storage but `userEmail` was not, so the username next to the avatar was blank.

**Fix:**
- `login()` now writes `user_email` to secure storage alongside the tokens
- `_checkStatus()` reads `user_email` back and restores it to state

> Note: users who were already logged in before this fix must log out once and log back in to persist the email.

---

### 5. Event Card — `frontend/lib/ui/components/event_card.dart`

- Changed `_kGreen` from `#00B67A` → `#184E4A` to match brand palette
- Card shows: category label, title, date/time, location, price badge, "Register →" CTA

---

### 6. Main App — `frontend/lib/main.dart`

Updated `ThemeData`:
```dart
scaffoldBackgroundColor: const Color(0xFFF2EFEA),
colorScheme: ColorScheme.fromSeed(
  seedColor: const Color(0xFF184E4A),
  primary: const Color(0xFF184E4A),
  secondary: const Color(0xFF2D7D78),
  surface: const Color(0xFFF2EFEA),
),
```

---

### 7. PRD Update — `Eventmind_files/eventmind_prd.md`

Added item 38 to Phase 5 (Mature Integrations & Technical Scalability):

> Multilingual Interface (i18n): Navbar language switcher and full platform translation starting with English + 2–3 high-demand languages based on user geography data.

---

---

## Session 3 — Auth Fix, Navbar Polish, Hero Carousel

### 8. GoRouter Recreation Bug — `frontend/lib/main.dart`

**Problem:** Signing in / signing up always redirected to the home page even when the attempt failed.

**Root cause:** `routerProvider` used `ref.watch(authProvider)` → GoRouter was recreated every time `isLoading` changed → `initialLocation: '/'` fired on every state transition.

**Fix:** Bridged Riverpod into GoRouter's `refreshListenable` via `_RouterNotifier extends ChangeNotifier`:

```dart
class _RouterNotifier extends ChangeNotifier {
  final Ref _ref;
  _RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (_, __) => notifyListeners());
  }
  String? redirect(BuildContext context, GoRouterState state) {
    final isAuth = _ref.read(authProvider).isAuthenticated;
    final path = state.uri.path;
    if (!isAuth && (path.startsWith('/checkout') || path.startsWith('/dashboard')
        || path.startsWith('/chat') || path.startsWith('/organizer'))) {
      return '/auth';
    }
    return null;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);
  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [...],
  );
});
```

GoRouter is now created **once**; `notifyListeners()` triggers re-evaluation of the redirect guard only, not recreation.

---

### 9. Navbar Polish — `frontend/lib/ui/components/event_navbar.dart`

**"Explore Events" wrapping to 2 lines on first hover:**
- Cause: Google Fonts loads asynchronously; fallback font is slightly wider, causing text to wrap before the custom font kicks in.
- Fix: Added `softWrap: false` to all `MenuItemButton` Text widgets.

**"Add Location" text style:**
- Changed from green/bold (`#184E4A`, `FontWeight.w500`, size 13) to match search hint text (grey `#9CA3AF`, size 14, default weight).
- Location icon also changed from `_kGreen` to `Color(0xFF9CA3AF)`.

---

### 10. Diagonal Crossfade Hero Carousel — `frontend/lib/ui/views/discovery_page.dart`

Replaced the static text-only hero with a full-bleed image carousel using a **diagonal ShaderMask wipe**:

**Behaviour:**
- 4 images (`assets/images/hero1–4.jpg`), 560px tall
- Auto-advances every 4 seconds; clickable navigation dots
- Transition: 1500ms `easeInOut` diagonal left-to-right wipe (15° tilt)
- Outgoing image: completely static underneath — no animation
- Incoming image: revealed by an animated `ShaderMask` alpha mask

**Mask math (key implementation detail):**
```dart
// In shaderCallback(bounds):
final softW = w * 0.22;                        // feather width ≈ 22% of image width
final gx    = t * (w + softW) - softW;         // sweeps: t=0 → gx=-softW (image hidden)
                                               //          t=1 → gx=+w    (image fully shown)
final dy    = softW * tan(15.0 * pi / 180.0);  // 15° diagonal tilt

return ui.Gradient.linear(
  Offset(gx,         h * 0.5 + dy * 0.5),     // left edge, slightly lower
  Offset(gx + softW, h * 0.5 - dy * 0.5),     // right edge, slightly higher
  [Colors.black, Colors.transparent],
);
// BlendMode.dstIn: black=alpha 1 → child shown; transparent=alpha 0 → child hidden
```

**Stack layers (bottom to top):**
1. Outgoing image (static)
2. Incoming image behind `ShaderMask` (when `_animating`)
3. Left-side gradient (`0%→40%: black 0.55 → 0.15; 75%: transparent`) — text legibility
4. Bottom 100px fade to `_kBg` — blends into page
5. Text overlay: badge pill + "Experience the Extraordinary." headline + subline
6. Navigation dots: pill shape, 28px wide (active) / 8px (inactive), bottom-center

> **Asset note:** New image assets require a **full stop + restart** (`q` then `flutter run -d chrome`). Hot restart (`R`) does not pick up new assets in Flutter Web.

---

## Bugs Fixed

| Session | Bug | Root Cause | Fix |
|---|---|---|---|
| 1–2 | Both dropdowns open simultaneously | No sibling-close on hover | Each dropdown gets its own `MenuController`; `onHoverOpen` closes the sibling |
| 1–2 | Dropdown stays open when cursor leaves | No external close trigger | `MouseRegion.onEnter` on logo/search/help/bell/avatar calls `_closeAllMenus()` |
| 1–2 | Username blank on existing session | `_checkStatus()` didn't restore `userEmail` | `login()` persists `user_email`; `_checkStatus()` reads it back |
| 1–2 | Bottom border invisible | Color too close to linen | Moved inside `EventNavbar` `BoxDecoration`; darkened to `#C8C1B8` |
| 1–2 | Green not visible on white | `#184E4A` looks near-black on pure white | Changed navbar/dropdown bg to linen `#F2EFEA` |
| 1–2 | Hover color too faint | `overlayColor` at 5% opacity | Full `WidgetStateProperty.resolveWith` on `backgroundColor` + `foregroundColor` |
| 1–2 | `desiredAccuracy` deprecation | API changed in newer geolocator | `locationSettings: const LocationSettings(accuracy: LocationAccuracy.low)` |
| 1–2 | Log Out was red | Default Material destructive styling | `_hoverMenuItemStyle(defaultFg: _kGreen)` |
| 1–2 | Bell icon no hover effect | `color:` set directly on `IconButton` | Removed `color:`, added `ButtonStyle` with `WidgetStateProperty.resolveWith` |
| 1–2 | Avatar menu opens on click only | Used `GestureDetector` | Replaced with `TextButton` + `MouseRegion.onEnter` pattern |
| 1–2 | Avatar name/icon didn't turn linen on hover | Explicit `color:` on `Text` and `Icon` | Removed explicit colors; inherit `foregroundColor` from `_hoverStyle` |
| 3 | Sign in/up always redirected home on failure | `ref.watch(authProvider)` in `routerProvider` recreated GoRouter on every state change | `_RouterNotifier extends ChangeNotifier` + `refreshListenable` (GoRouter created once) |
| 3 | "Explore Events" wrapping to 2 lines on first hover | Google Fonts async load; fallback font wider | `softWrap: false` on all `MenuItemButton` Text widgets |
| 3 | "Add Location" style didn't match search hint | Was green + bold; intended to be a hint-like placeholder | Changed to `Color(0xFF9CA3AF)`, size 14, no explicit weight |
| 3 | `withOpacity()` deprecation warnings | Old API | Replaced all instances with `.withValues(alpha: x)` |

---

## Pending / Next Steps

- ~~**Hero section redesign**~~ ✅ Done — diagonal crossfade carousel implemented
- **Event Groups backend** — confirmed MVP feature, not yet built; Groups dropdown shows "coming soon"
- **Notification bell** — `onPressed: () {}` placeholder; needs a notifications panel
- **Help page** — `onPressed: () {}` placeholder
- **"Add Location"** in search bar — style fixed; geocoder functionality still placeholder
- **Chat** — `ChatPage` exists at `/chat/:id`; not exposed in navbar by design (for now)
- **Seed events** — backend seed script must be run once after initial setup

---

## How to Run

### Frontend
```bash
cd eventmind/frontend
flutter run -d chrome
```
- Hot restart: press `R` in the Flutter terminal
- **New assets** (images, fonts): requires full stop (`q`) + `flutter run -d chrome` — hot restart does NOT pick up new assets

### Backend — Shadow Mode (no Docker / Kafka / PostgreSQL needed)
```powershell
# Activate virtual environment (PowerShell)
.\backend\.venv\Scripts\Activate.ps1   # or wherever the venv lives

# Start all 7 microservices via shadow runner
python eventmind/backend/scripts/shadow_runner.py
```

Shadow Mode starts the following services on SQLite (`platform_dev.db`) with mocked Kafka and Redis:

| Service | Port |
|---|---|
| Gateway | 8000 |
| Auth | 8001 |
| User | 8002 |
| Event | 8003 |
| Ticketing | 8004 |
| Notification | 8006 |
| Agents | 8010 |

Press `Ctrl+C` to shut everything down.

---

## Architecture Notes

- State management: **Riverpod** (`StateNotifierProvider`)
- Routing: **GoRouter** — recreated **once** via `Provider<GoRouter>`; auth redirects re-evaluate through `_RouterNotifier.refreshListenable` (not by recreating the router)
- Protected routes: `/checkout`, `/dashboard`, `/chat`, `/organizer` — redirect to `/auth` when unauthenticated
- Auth tokens stored in `flutter_secure_storage`
- API base URLs configured in `frontend/lib/api/api_client.dart`
- Backend is a **microservices architecture** (7 services behind a gateway), runnable locally in Shadow Mode without any external infrastructure
- Dummy/seed events created via a backend seed script (run once during initial setup)

# SHLDR Mobile App — Plan & Implementation Strategy

Status: proposal
Target: iOS + Android, React Native (Expo), shipping against the existing SHLDR API.

---

## 1. Executive summary

SHLDR is a Next.js 16 app (`app/`) with a REST API (`app/api/**`), Better Auth sessions,
Drizzle/Postgres, and a MUI-based design system. The good news is that the codebase is already
shaped for a second client:

| What we have | Why it matters for mobile |
| --- | --- |
| 41 `route.ts` files under `app/api/**`, all returning plain JSON | The API is already a real API. Mobile consumes it as-is. |
| Every route auths identically: `auth.api.getSession({ headers: request.headers })` | Header-based, not cookie-coupled. Adding a bearer-token flow is a plugin, not a rewrite. |
| `components/ui/` — 76 thin wrappers over MUI behind a barrel `index.ts` | A seam. Screens import `@/components/ui`, not `@mui/material`. A native design system can implement the same export names. |
| `lib/theme.ts` + `lib/colors.ts` are pure token data (palette, typography, shape) | Portable to React Native verbatim. Brand identity survives the port. |
| `hooks/use-trips.ts` splits pure transforms (`formatTrip`, `filterTrips`) from `fetch` | The transforms are platform-agnostic and move into a shared package untouched. |
| `lib/map/*` (`arcRoutes`, `airportCoords`, `wishlistMatcher`) is pure TypeScript | Map *logic* is shared; only the renderer swaps. |

The honest constraint: **MUI Material cannot render in React Native.** It is a DOM/Emotion library.
"Reuse the same components" therefore means *reuse the same component API and the same design
tokens*, with a native implementation behind them — not literally shipping `@mui/material` to a
phone. This plan makes that substitution cheap by exploiting the wrapper layer that already exists.

**Recommended approach: Expo (React Native) app inside a restructured pnpm/Turborepo monorepo,
sharing types, API client, business logic, and design tokens with the web app.**

---

## 2. Options considered

### Option A — Expo app in a shared monorepo ✅ recommended

Restructure to `apps/web` + `apps/mobile` + `packages/*`. Web and mobile share types, the API
client, validation schemas, pure business logic, and design tokens. Two UI implementations
(MUI on web, native on mobile) behind one component contract.

- **Pros:** real native UX; maximum non-UI code reuse; one source of truth for API types and
  tokens; a change to a Zod schema or a trip transform lands in both clients at once.
- **Cons:** upfront restructure cost (~1 week); two UI implementations to maintain.
- `turbostarter/core` in this workspace is a working reference for exactly this layout
  (`apps/web`, `apps/mobile`, `packages/{api,auth,ui}`), including Better Auth's Expo plugin.

### Option B — WebView wrapper

Ship the existing Next app inside a native shell.

- **Pros:** days, not weeks.
- **Cons:** no native navigation, gestures, or offline; poor list performance on the itinerary
  view; App Store 4.2 "minimum functionality" rejection risk; push, document picking, and
  background sync all need bridges anyway. Rejected for a product whose core value is
  *travel* — i.e. used on planes, in airports, on bad networks.

### Option C — Standalone Expo repo, API over HTTPS only

- **Pros:** zero disruption to the web repo.
- **Cons:** types, Zod schemas, and theme tokens get duplicated and drift immediately. The 20+
  `API*` interfaces in `hooks/use-trips.ts` and `hooks/use-reservations.ts` would be
  hand-copied and silently rot. Rejected.

A pragmatic middle path exists: start with Option C's *directory* (`apps/mobile` with its own
deps) but do the Option A extraction incrementally, package by package, as Phase 0 below
describes.

---

## 3. Target architecture

```
shldr/
├── apps/
│   ├── web/                    # existing Next.js app, moved
│   └── mobile/                 # new Expo app (expo-router)
│       └── src/
│           ├── app/            # file routes mirroring web IA
│           ├── components/
│           └── lib/
├── packages/
│   ├── shared/                 # types, Zod schemas, pure transforms, date/format utils
│   ├── api-client/             # typed fetch client + TanStack Query hooks (web + mobile)
│   ├── auth/                   # Better Auth server config + web/mobile clients
│   ├── db/                     # Drizzle schema + migrations (server-only)
│   ├── design-tokens/          # colors.ts, spacing, typography, radii — platform-neutral
│   ├── ui-web/                 # existing components/ui (MUI wrappers)
│   └── ui-mobile/              # NEW: same export names, native implementation
└── turbo.json / pnpm-workspace.yaml
```

### The design-system contract

The key move. `packages/design-tokens` holds the raw values (today's `lib/colors.ts` moves here
essentially unchanged). Both UI packages consume it:

- `packages/ui-web/theme.ts` — today's `lib/theme.ts`, `createTheme()` from tokens. Unchanged behavior.
- `packages/ui-mobile/theme.ts` — maps the same tokens into a React Native theme.

Both `ui-web` and `ui-mobile` export the *same names*: `Button`, `Card`, `Typography`, `Stack`,
`TextField`, `Dialog`, `Chip`, `Avatar`, `Switch`, `Snackbar`, `Divider`, `List`. A shared feature
component can then import from `@shldr/ui` and be resolved per-platform by Metro/webpack aliasing.
We will **not** try to make all 76 wrappers cross-platform — see §6 for the realistic subset.

**Native base library: `react-native-paper`.** It is Material Design 3 for RN, its theming accepts
a fully custom color scheme (so SHLDR's green `brand` ramp carries over), and its component
inventory maps closely onto the existing wrapper list: `Button`, `Card`, `Chip`, `Avatar`, `Badge`,
`Dialog`, `Divider`, `List`, `Menu`, `Snackbar`, `Switch`, `ProgressBar`, `TextInput` (← `TextField`),
`Appbar` (← `AppBar`/`Toolbar`). Layout primitives (`Box`, `Stack`, `Grid`, `Container`) are
implemented directly on `View` with a small style helper — they are trivial and Paper has no
equivalent. Escape hatch: any screen may drop to raw RN primitives; the contract is a convenience,
not a cage.

### Data layer

Today's `hooks/use-trips.ts` is a hand-rolled `useState` + `useEffect` + `fetch` loop with a
`cancelled` flag, and there are ~66 direct `fetch('/api/...')` call sites across components. For
mobile this is not viable — we need caching, retry, background refetch, and offline persistence.

**Adopt TanStack Query in `packages/api-client`**, wrapping a typed `fetch` client:

```ts
// packages/api-client/src/client.ts
export function createClient({ baseUrl, getAuthHeaders }: ClientConfig) { ... }

// packages/api-client/src/trips.ts
export function useTrips(accountId: string) {
  return useQuery({
    queryKey: ['trips', accountId],
    queryFn: () => client.get<APITrip[]>('/api/trips', { accountId }),
    select: (data) => data.map(formatTrip),   // ← today's pure transform, unchanged
  });
}
```

The web app can migrate to these hooks opportunistically; nothing forces a big-bang refactor.
`formatTrip` and `filterTrips` move to `packages/shared` and are imported by both.

---

## 4. Reusing the existing API — what actually has to change

The API needs **four** targeted changes. Everything else works as-is.

### 4.1 Better Auth: add the Expo plugin

`lib/auth.ts` currently has no `expo()` plugin, so there is no bearer-token session path.

```ts
// lib/auth.ts (server)
import { expo } from '@better-auth/expo';

export const auth = betterAuth({
  // ...existing config unchanged...
  plugins: [expo()],
  trustedOrigins: [process.env.APP_URL!, 'shldr://', 'exp://'],
});
```

```ts
// packages/auth/src/client/mobile.ts
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  plugins: [expoClient({ scheme: 'shldr', storagePrefix: 'shldr', storage: SecureStore })],
});
```

Because every route already reads `request.headers`, bearer tokens flow through all 41 routes with
**zero per-route changes**. This is the single biggest reason the port is cheap.

### 4.2 `proxy.ts`: return 401 JSON for API paths instead of redirecting to `/login`

Current behavior redirects *any* unauthenticated non-public path — including `/api/trips` — to
`/login`, which returns HTML. A mobile client hitting an expired session would get a 200 HTML page
where it expects JSON, and fail confusingly.

```ts
// proxy.ts
const session = await auth.api.getSession({ headers: request.headers });
if (!session) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}
```

This is a correctness fix for the web app too.

### 4.3 CORS for the mobile origin

Native `fetch` from Expo sends `Origin: null` or the app scheme. Add a small CORS allowance on
`/api/**` for the app scheme + `exp://` during development, scoped narrowly — not `*`.

### 4.4 Deep links for email-driven flows

`emailAndPassword.requireEmailVerification` is `true`, and there are invite (`/invite/[token]`,
`/team-invite/[token]`), account-invite, and email-change flows that all land on web URLs. Add
Universal Links / App Links (`apple-app-site-association`, `assetlinks.json` in `public/`) so
`https://app.shldr.../invite/xyz` opens the app when installed and the web page otherwise. The
email templates in `lib/auth.ts` and `lib/mailer.ts` need no content change.

### 4.5 API contract hardening (recommended, not blocking)

Several routes return raw Drizzle relation queries (`with: { tripDestinations: true, tripMembers: { with: { user: true } } }`).
That is convenient but leaks schema shape into the wire format and makes mobile brittle to schema
changes. Introduce explicit response serializers + Zod response schemas in `packages/shared` so both
clients validate what they receive. Do this incrementally, starting with `/api/trips` and
`/api/trips/[tripId]`.

---

## 5. Feature scope

### v1 (ship this)

| Feature | Web source | Mobile notes |
| --- | --- | --- |
| Auth: email/password, Google, Microsoft | `app/login`, `app/signup`, `lib/auth.ts` | Native Google Sign-In + `expo-auth-session` for Microsoft; Apple Sign-In **required** by App Store guideline 4.8 since third-party login is offered — add `socialProviders.apple` server-side |
| Account/onboarding | `app/onboarding/account` | Reuse `/api/accounts` |
| Trips list (Upcoming / Active / Past) | `app/trips`, `components/TripCards.tsx`, `filterTrips` | `FlashList`; `filterTrips` reused verbatim |
| Trip detail + day-by-day itinerary | `app/tripdetails/[tripId]`, `TripDetail.tsx`, `TripDayDetail.tsx` | The flagship screen. Sectioned `FlashList`, native date handling |
| Reservation detail (flight/lodging/transport/…) | `TripEventDetail.tsx`, `db/schema/reservations.ts` | Type-discriminated cards off `reservationTypeEnum` |
| Add / edit trip & plan | `AddTripDialog.tsx`, `PlanDialog.tsx` | Native modals + `react-hook-form` + the same Zod schemas |
| Documents | `app/documents`, `lib/r2.ts` | `expo-document-picker` → existing presigned-URL flow works unchanged |
| Notifications | `app/api/notifications/*`, `lib/notifications.ts` | In-app list **+ real push** (§7) |
| Trip sharing / invites | `ShareTripDialog.tsx`, `/api/trips/[tripId]/invite` | Native share sheet |
| Settings, theme (light/dark) | `app/settings/*`, `ThemeProviderWrapper.tsx` | `localStorage` → `expo-secure-store`/`AsyncStorage`; same `ColorMode` contract |

### v1.1

- Travel map (`app/maps`) — see §8.
- Wishlist (`/api/wishlist`).
- Gmail / TripIt integration connect flows — the OAuth callbacks are web routes
  (`/api/integrations/gmail/callback`); open them in `expo-web-browser` and return via deep link
  rather than reimplementing.
- Offline read cache for the active trip (§9).

### Explicitly out of scope for v1

`app/design-system` (internal), `marketing/`, the Bull Board queue UI (`scripts/queues-server.ts`),
`xlsx` export, and the public share viewer (`app/public/[token]` — that is a link people open in a
browser, and it should stay that way).

---

## 6. Design system port — concrete approach

Do **not** port all 76 wrappers. Audit says roughly:

- **~30 map cleanly** to `react-native-paper` or trivial `View` compositions: `Box`, `Stack`,
  `Container`, `Paper`, `Typography`, `Button`, `IconButton`, `TextField`, `Checkbox`, `Switch`,
  `Radio`, `Select`, `Card*`, `Chip`, `Avatar`, `Badge`, `Divider`, `List*`, `Dialog*`, `Menu`,
  `MenuItem`, `Snackbar`, `Alert`, `Progress`, `Skeleton`, `Tabs`, `Tooltip`, `Fab`, `Drawer`,
  `Accordion*`.
- **~15 need a native rethink** rather than a port: `Grid`/`Masonry` (→ flex/`FlashList` columns),
  `Table` (→ list rows), `Popper`/`Popover`/`Portal`/`ClickAwayListener`/`Backdrop`/`Modal`
  (→ RN `Modal` + bottom sheets), `Autocomplete` (→ native searchable list), `Stepper`,
  `Pagination` (→ infinite scroll), `TransferList`, `SpeedDial`, `Timeline`.
- **~30 are web-only or unused on mobile**: `AppBar`/`Toolbar` (→ expo-router headers),
  `CssBaseline`, `Link`, `ImageList`, `TextareaAutosize`, `Slider`, `Rating`, `ButtonGroup`,
  `ToggleButton`, etc. Port on demand.

**Sequencing:** implement the ~30 that map cleanly in one pass (roughly 2 dev-days once the token
bridge exists — most are 5–15 line files, symmetric to today's web wrappers), then add from the
second bucket as screens demand them.

**Token bridge** (`packages/ui-mobile/src/theme.ts`):

```ts
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { brand, gray, green, orange, red } from '@shldr/design-tokens';

export function getMobileTheme(mode: ColorMode) {
  const isDark = mode === 'dark';
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: brand[400],            // same values as lib/theme.ts
      onPrimary: brand[50],
      background: isDark ? '#000902' : '#f3faf9',
      surface:    isDark ? '#151917' : '#e5f0e5',
      error: red[400], /* ... */
    },
  };
}
```

Because both themes read from one token module, a brand color change is a one-line edit that lands
on web and mobile simultaneously. Fonts: today's stack is Inter — load it with
`@expo-google-fonts/inter` so type matches too.

A visual-parity checklist (trip card, itinerary row, reservation card, primary/secondary buttons,
empty states, both color modes) should be signed off before Phase 3 screens are built out.

---

## 7. Push notifications

`lib/notifications.ts` + `lib/workers/notifications.ts` already generate in-app notifications
server-side. Extend rather than replace:

1. New table `push_tokens` (`db/schema/notifications.ts`): `userId`, `token`, `platform`,
   `deviceId`, `createdAt`, `lastSeenAt`.
2. New route `POST /api/notifications/push-token` to register/refresh, and `DELETE` on sign-out.
3. In `lib/notifications.ts`, after persisting a notification, fan out to the Expo Push API for
   that user's registered tokens. Handle `DeviceNotRegistered` receipts by pruning tokens.
4. Client: `expo-notifications`, permission prompt deferred until the user has a trip (asking on
   first launch tanks opt-in rates), tap handler deep-links to the relevant trip/reservation.

High-value triggers already exist in the domain: reservation auto-imported from Gmail, trip merge
suggestion, invite received, and (new) flight-day reminders.

---

## 8. Maps

`app/maps` uses `maplibre-gl` + `react-map-gl` + `@react-google-maps/api` — all DOM-bound. But
`lib/map/arcRoutes.ts`, `lib/map/airportCoords.ts`, and `lib/map/wishlistMatcher.ts` are pure TS
and move to `packages/shared` untouched.

Renderer: `@maplibre/maplibre-react-native`. It consumes the same style URLs and the same GeoJSON
that `arcRoutes` produces, so the great-circle arc logic, airport lookups, and wishlist matching are
genuinely shared — only the `<Source>`/`<Layer>` JSX is rewritten against MapLibre's native
components. `/api/trips/map-data` needs no change.

This is why maps sit in v1.1: the logic reuse is high but the renderer rewrite is a self-contained
chunk that shouldn't block the itinerary experience.

---

## 9. Offline & performance

Travel apps get used with no signal. Non-negotiable for v1:

- **TanStack Query persistence** to AsyncStorage/MMKV, so the last-loaded trips and the active
  trip's itinerary render instantly on cold start and remain readable offline.
- **`FlashList`** for the trips list and the itinerary — the day/plan structure (`PlanDay[]` →
  `PlanItem[]`) is exactly the nested list shape that kills naive `ScrollView` implementations.
- **Cached document/cover images** via `expo-image` (`cachePolicy: 'memory-disk'`); today's
  `picsum.photos` fallback in `formatTrip` should become a local asset so offline cards aren't blank.
- **Optimistic mutations** for note edits and plan reordering, reconciled on reconnect.
- Deeper write-side offline sync (a queued mutation log) is deliberately **deferred** — it is a
  large correctness surface, and read-offline covers the dominant "check my itinerary at the gate"
  use case.

---

## 10. Phased delivery

Estimates assume one full-time engineer; parallelizes across two.

| Phase | Work | Est. |
| --- | --- | --- |
| **0. Monorepo & extraction** | pnpm workspaces + Turborepo; move Next app to `apps/web`; extract `packages/{shared,design-tokens,api-client,auth}`; web stays green throughout | 1 wk |
| **1. API & auth readiness** | `expo()` plugin; `proxy.ts` 401 fix; CORS; Apple Sign-In; deep-link association files; response schemas for trips endpoints | 1 wk |
| **2. Mobile design system** | Expo app scaffold + expo-router; token bridge; the ~30 clean-mapping components; Inter fonts; light/dark parity sign-off | 1.5 wk |
| **3. Core screens** | Auth flow, onboarding, trips list, trip detail + itinerary, reservation detail | 2 wk |
| **4. Create/edit + documents + settings** | Trip/plan forms w/ shared Zod, document upload via existing R2 presign, share/invite, settings & theme | 1.5 wk |
| **5. Notifications & push** | `push_tokens` table + route, Expo Push fan-out in `lib/notifications.ts`, client handling, deep links | 1 wk |
| **6. Offline, polish, release** | Query persistence, FlashList tuning, empty/error states, EAS build + TestFlight + Play internal track, store assets | 1.5 wk |
| **7. (v1.1) Maps, wishlist, integrations** | MapLibre RN, wishlist, Gmail/TripIt connect via `expo-web-browser` | 2 wk |

**~9.5 weeks to a v1 submission**, ~11.5 including v1.1.

Phase 0 and Phase 1 are independent of each other and of design work — a designer can be producing
native screen specs during them.

---

## 11. Tooling & release

- **Expo SDK (managed) + `expo-dev-client`** — dev builds for native modules (Google Sign-In,
  MapLibre, notifications) without ejecting.
- **EAS Build + EAS Submit** for both stores; **EAS Update** for JS-only hotfixes.
- **Environments:** `EXPO_PUBLIC_API_URL` per profile (`development` → LAN/staging,
  `preview` → staging, `production` → prod). Mirrors today's `NEXT_PUBLIC_APP_URL`.
- **Testing:** Vitest for `packages/shared` transforms (`formatTrip`, `filterTrips`, `arcRoutes`
  are pure and cheap to cover); Maestro for critical mobile flows (sign in → view trip → add plan).
- **CI:** extend the existing setup with a Turborepo-filtered pipeline so a web-only change doesn't
  trigger a mobile build.

---

## 12. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| **MUI is not portable** — biggest source of "reuse" disappointment | Set the expectation now: shared *tokens + component API*, native implementation. The existing `components/ui` wrapper layer is what makes this a substitution instead of a rewrite. |
| Monorepo restructure destabilizes the shipping web app | Phase 0 is mechanical file moves + path aliases, no behavior change. Land it behind a single PR with a full web smoke test; `@/*` aliases keep import sites stable. |
| Metro vs. Next module resolution differences in shared packages | Keep `packages/shared` and `packages/design-tokens` dependency-free and platform-neutral — no `next/*`, no DOM, no Node built-ins. Enforce with an ESLint `no-restricted-imports` boundary rule. |
| Apple 4.8 (Sign in with Apple) rejection | Add Apple as a social provider in Phase 1, not at submission time. |
| Push permission opt-in rates | Defer the prompt to a moment of demonstrated value (first trip created / first invite). |
| Server-only code leaking into the mobile bundle | `packages/db`, `lib/workers/*`, `googleapis`, `bullmq`, `ioredis` stay server-side; mobile depends only on `shared`/`api-client`/`design-tokens`/`ui-mobile`. Enforce via workspace dependency boundaries. |
| API response drift breaking shipped app binaries | Zod response validation + additive-only changes; version the API (`/api/v1`) before the first store release, while it is still free to do so. |

---

## 13. First concrete steps

1. Land the `proxy.ts` 401 fix — small, independently valuable, unblocks any API client.
2. Add `expo()` to `lib/auth.ts` plugins and `trustedOrigins` — verify bearer auth against
   `/api/trips` with `curl` before any RN code exists.
3. Extract `lib/colors.ts` → `packages/design-tokens` and have `lib/theme.ts` import from it.
   Proves the monorepo seam with the lowest-risk file in the repo.
4. Scaffold `apps/mobile` with expo-router + a single screen that authenticates and renders the
   real trips list from the real API. This is the walking skeleton — it validates auth, networking,
   deep links, and the token bridge end to end in days, before committing to the full build.

# SHLDR mobile

Expo (React Native) client for SHLDR. Talks to the same Next.js API in `../app/api/**`
as the web app — see `../docs/mobile-app-plan.md` for the full architecture writeup.

This is its own pnpm workspace (`mobile/pnpm-workspace.yaml`, scoped to `.` and
`../packages/*`) rather than a member of a repo-root workspace — the web app's Docker
deploy installs via `npm ci` at the repo root, and folding that into a pnpm workspace
disturbed it. All commands below run from inside `mobile/`, not the repo root.

## Setup

```bash
cd mobile
pnpm install
cp .env.example .env
```

Point `EXPO_PUBLIC_API_URL` at a running instance of the web app (`npm run dev` at the
repo root). On a physical device, use your machine's LAN IP rather than `localhost` —
the device can't reach the Metro host's `localhost`.

The web app also needs a database migration applied for push notifications:
`npm run db:migrate` at the repo root picks up `drizzle/0016_military_wasp.sql`
(the `push_tokens` table).

## Run

```bash
pnpm dev        # Metro bundler + QR code
pnpm dev:ios    # iOS simulator (macOS only)
pnpm dev:android
pnpm typecheck
```

**This app cannot run in plain Expo Go.** `@maplibre/maplibre-react-native` is a native
module, so it needs a custom dev client:

```bash
npx expo prebuild             # generates ios/ and android/ (gitignored, regenerate anytime)
npx expo run:ios              # or run:android — builds and installs the dev client
```

or build one remotely with `eas build --profile development` once an EAS project exists
(see "Not built" below). After that, `pnpm dev` connects to the installed dev client the
same way it would to Expo Go.

## Structure

```
src/
├── app/                       # expo-router routes
│   ├── (auth)/login.tsx
│   └── (app)/                 # gated behind an active session
│       ├── _layout.tsx        # session + onboarding gate, registers push token
│       ├── onboarding.tsx     # first-run: create an account
│       ├── settings/
│       │   ├── index.tsx      # theme (system/light/dark), sign out
│       │   └── integrations.tsx  # Gmail connect/disconnect, TripIt feed + sync
│       ├── maps.tsx           # account-wide travel map (clustered pins, flight arcs,
│       │                        wishlist, stats)
│       └── trips/
│           ├── index.tsx      # list, Upcoming/Active/Past, FAB → new
│           ├── new.tsx        # create trip form
│           └── [tripId]/
│               ├── index.tsx  # detail + reservation list
│               ├── map.tsx    # trip route map (numbered stops, flight/transit lines)
│               ├── documents.tsx
│               └── share.tsx  # generate + share an invite link
├── components/
│   ├── ui/                    # design-system wrappers over react-native-paper
│   │                            (Button, TextField, Card, Chip, Dialog, ...) —
│   │                            same names as web's components/ui, native impl
│   ├── map/                   # PinBadge, StatChip, Add/List/Item wishlist dialogs
│   └── TripCard.tsx, ReservationRow.tsx, DateField.tsx
├── hooks/                      # useTrips, useTrip, useReservations, useAccounts,
│                                  useCreateTrip, useDocuments, useCreateTripInvite,
│                                  useRegisterPushToken, useAccountMapData, useTripRoute,
│                                  useCreate/Update/DeleteWishlistItem,
│                                  useGmailAccounts, useConnectGmail, useDisconnectGmail,
│                                  useTripitFeed, useSaveTripitFeed, useSyncTripit
└── lib/
    ├── api-client.ts           # typed JSON fetch over the shared API
    ├── auth-client.ts          # better-auth React client + Expo bearer-token plugin
    ├── color-mode.tsx          # persisted theme preference (AsyncStorage)
    ├── query-client.ts         # TanStack Query client + AsyncStorage persister
    ├── use-notification-tap.ts # push tap → deep link to the trip
    ├── map-bounds.ts            # LngLatBounds from a set of points
    ├── config.ts                # EXPO_PUBLIC_API_URL resolution
    └── theme.ts                  # @shldr/design-tokens → react-native-paper MD3 theme
```

Map logic lives in `@shldr/shared`'s `map/` module — `arcRoutes`, `airportCoords`,
`cityCoords`, `wishlistMatcher`, `deriveMapData`, `stats`, `curvedLine` — ported from
web's `lib/map/*.ts` and `hooks/useTravelMapData.ts`/`useTravelStats.ts` (copied, not
imported, since the web app isn't in this pnpm workspace — see "Isolated workspace"
above). Only the renderer differs: web draws these through `react-map-gl`/MapLibre GL JS,
mobile draws the same GeoJSON through `@maplibre/maplibre-react-native`'s `Map` /
`Camera` / `GeoJSONSource` / `Layer` / `Marker`. Both use the same OpenFreeMap style URLs
(`MAP_STYLE_LIGHT`/`MAP_STYLE_DARK` in `@shldr/shared`) as web's `components/map/*`.

### Wishlist

`(app)/maps.tsx`'s heart icon opens the wishlist list (remove, toggle visited); the
star FAB opens an add form. Mobile has no Google Places autocomplete, so
`AddWishlistDialog` resolves coordinates itself from `@shldr/shared`'s
`getCityCoords`/`COUNTRY_CENTROIDS` — the same fallback chain `getCityCoords` on web
uses — rather than a geocoding API call. Only `city`-type items render as map pins
(matching web's `WishlistMarkers`, which does the same); `country`-type items still
save, list, and delete correctly, they just don't have a single point to pin.

### Clustering

City pins on the account-wide map use a real `GeoJSONSource cluster` (not a
client-side grouping) with the same `clusterMaxZoom`/`clusterRadius` and step-expression
colors as web's `components/map/layers/MarkerLayer.tsx`, so both clients cluster
identically at the same zoom levels.

### Gmail / TripIt as map data sources

Connecting either integration doesn't touch the map code at all — it makes the account's
`trips`/`reservations` tables grow, and `/api/trips/map-data` (the only thing the map
screens read) already includes every trip regardless of where it came from. So
"Gmail/TripIt as map data sources" is really "let the mobile app drive those existing
import pipelines"; `(app)/settings/integrations.tsx` does that:

- **TripIt** is a plain `.ics` URL — save it, then Sync now (`POST
  /api/integrations/tripit/sync`) to import.
- **Gmail** needs OAuth, which took one small, additive server change.
  `app/api/integrations/gmail/auth/route.ts` normally 302s straight to Google; the mobile
  fetch client can't hand a redirect off to a browser, so it now returns `{ url }` as JSON
  when called with `?json=1`. The mobile app opens that URL with
  `expo-web-browser`'s `openAuthSessionAsync`. On the way back,
  `app/api/integrations/gmail/callback/route.ts` normally redirects to the web
  `/settings/integrations` page; it now redirects to `shldr://settings/integrations`
  instead whenever the signed OAuth `state` carries `platform: "mobile"` (added to
  `AuthState` in `lib/gmail.ts`), which `openAuthSessionAsync` is watching for and
  resolves on. Both changes are additive — the default (`platform` unset) still does
  exactly what the web app needs.

## What's real vs. what's next

Real, against the live API: auth, onboarding, the trips list and its Upcoming/Active/Past
filter (shared with web via `@shldr/shared`), trip detail with reservations, creating a
trip, generating and sharing an invite link, document upload, push notification
registration and delivery (Expo Push, fanned out from `lib/notifications.ts` on the
server), a persisted light/dark/system theme, offline read access to the last-loaded
trips (TanStack Query cached to AsyncStorage), an account-wide travel map with clustered
city pins, flight great-circle arcs, and wishlist add/remove/mark-visited, a per-trip
route map (numbered stops, flight/transit lines), and Gmail connect/disconnect + TripIt
feed save/sync/disconnect.

Not built: editing an existing trip or reservation, a country-highlight overlay for
country-type wishlist entries (web has one; mobile just doesn't render a pin for those —
see "Wishlist" above), and an EAS project/store submission (`eas.json` has build profiles
but no real `projectId` — that needs an Expo account to create). The design-system
wrapper layer covers what the built screens use, not the full ~30-component "clean
mapping" set from the plan; more get added as needed.

Testing here was `tsc --noEmit` (clean), `expo export` (a full Metro bundle, resolving
every workspace and native dependency, including maplibre), and `expo prebuild` (confirms
the maplibre config plugin patches the generated Android project without error) — this
environment can't run an iOS/Android simulator, so the maps and the Gmail OAuth round
trip have not been exercised on a device. Building a dev client and testing on a real
device or simulator — including actually completing a Gmail connect flow and confirming
the deep link brings the app back to the foreground — is the next gate before this ships.

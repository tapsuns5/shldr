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

## Structure

```
src/
├── app/                       # expo-router routes
│   ├── (auth)/login.tsx
│   └── (app)/                 # gated behind an active session
│       ├── _layout.tsx        # session + onboarding gate, registers push token
│       ├── onboarding.tsx     # first-run: create an account
│       ├── settings.tsx       # theme (system/light/dark), sign out
│       └── trips/
│           ├── index.tsx      # list, Upcoming/Active/Past, FAB → new
│           ├── new.tsx        # create trip form
│           └── [tripId]/
│               ├── index.tsx  # detail + reservation list
│               ├── documents.tsx
│               └── share.tsx  # generate + share an invite link
├── components/
│   ├── ui/                    # design-system wrappers over react-native-paper
│   │                            (Button, TextField, Card, Chip, Dialog, ...) —
│   │                            same names as web's components/ui, native impl
│   ├── TripCard.tsx, ReservationRow.tsx, DateField.tsx
├── hooks/                      # useTrips, useTrip, useReservations, useAccounts,
│                                  useCreateTrip, useDocuments, useCreateTripInvite,
│                                  useRegisterPushToken
└── lib/
    ├── api-client.ts           # typed JSON fetch over the shared API
    ├── auth-client.ts          # better-auth React client + Expo bearer-token plugin
    ├── color-mode.tsx          # persisted theme preference (AsyncStorage)
    ├── query-client.ts         # TanStack Query client + AsyncStorage persister
    ├── use-notification-tap.ts # push tap → deep link to the trip
    ├── config.ts                # EXPO_PUBLIC_API_URL resolution
    └── theme.ts                  # @shldr/design-tokens → react-native-paper MD3 theme
```

## What's real vs. what's next

Real, against the live API: auth, onboarding, the trips list and its Upcoming/Active/Past
filter (shared with web via `@shldr/shared`), trip detail with reservations, creating a
trip, generating and sharing an invite link, document upload, push notification
registration and delivery (Expo Push, fanned out from `lib/notifications.ts` on the
server), a persisted light/dark/system theme, and offline read access to the last-loaded
trips (TanStack Query cached to AsyncStorage).

Not built: editing an existing trip or reservation, the travel map (`app/maps` on web —
needs a native MapLibre renderer, see the plan's §8), wishlist, Gmail/TripIt integration
connect flows, and an EAS project/store submission (`eas.json` has build profiles but no
real `projectId` — that needs an Expo account). The design-system wrapper layer covers
the ~18 components used by the screens built so far, not the full ~30-component "clean
mapping" set from the plan; more get added as new screens need them.

Testing here was `tsc --noEmit` (clean) and `expo export` (a full Metro bundle, resolving
every workspace and native dependency) — this environment can't run an iOS/Android
simulator, so real device testing is still needed.

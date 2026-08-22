# SHLDR mobile

Expo (React Native) client for SHLDR. Talks to the same Next.js API in `../app/api/**`
as the web app — see `../docs/mobile-app-plan.md` for the full architecture writeup.

## Setup

```bash
# from the repo root
pnpm install
cp mobile/.env.example mobile/.env
```

Point `EXPO_PUBLIC_API_URL` at a running instance of the web app (`pnpm dev` at the repo
root). On a physical device, use your machine's LAN IP rather than `localhost`.

## Run

```bash
pnpm --filter mobile dev        # Metro bundler + QR code
pnpm --filter mobile dev:ios    # iOS simulator (macOS only)
pnpm --filter mobile dev:android
```

## Structure

```
src/
├── app/              # expo-router routes
│   ├── (auth)/login.tsx
│   ├── (app)/         # gated behind an active session
│   │   └── trips/
│   └── _layout.tsx    # providers: React Query, Paper theme, safe area
├── components/        # TripCard, ReservationRow, ...
├── hooks/              # useTrips, useTrip, useReservations, useAccounts
└── lib/
    ├── api-client.ts   # typed fetch over the shared API, via authClient.$fetch
    ├── auth-client.ts  # better-auth React client + Expo bearer-token plugin
    ├── config.ts        # EXPO_PUBLIC_API_URL resolution
    └── theme.ts          # @shldr/design-tokens → react-native-paper MD3 theme
```

## What's real vs. stubbed

Auth (email/password), trips list with the same Upcoming/Active/Past filter as web,
and trip detail with a live reservation list all hit the real API. Everything else
in `docs/mobile-app-plan.md`'s v1 scope (create/edit flows, documents, push,
settings) is not built yet — this is the walking skeleton described in that plan's
"first concrete steps", proving auth, networking, and the token/theme bridge end to
end before the rest of the screens are built out.

# 231Rentals Mobile

Native iOS/Android app for 231Rentals, built with Expo. This is a
standalone project inside the same repo as the Next.js web app (see the
repo root) — its own `package.json`/`node_modules`, not a pnpm/Turborepo
workspace. It reuses the **same Supabase backend** and the **same
Claymorphism design tokens** as the web app; there is no shared code
package between the two (see "Keeping in sync with the web app" below).

## Stack

- Expo (managed workflow) + Expo Router (file-based routing, `app/`)
- TypeScript, strict mode
- NativeWind (Tailwind for React Native) — `tailwind.config.js` is a
  hand-port of `../app/globals.css`'s color/radius tokens
- `@supabase/supabase-js`, session persisted via
  `@react-native-async-storage/async-storage`
- TanStack Query, React Hook Form + Zod
- `@expo-google-fonts/manrope` + `@expo-google-fonts/plus-jakarta-sans`
  (same pairing as the web app's `next/font` setup)

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local   # fill in the same Supabase project's URL + anon key
npm run web     # fastest smoke-test loop (no simulator needed)
npm run ios     # requires Xcode / a configured iOS simulator
npm run android # requires an Android emulator
```

Never put the Supabase **service-role** key here — only the public anon
key, same rule as the web app's `.env.example`.

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # expo lint
npx expo-doctor        # SDK/dependency compatibility check
npx expo export --platform ios     # build-time bundle check, no simulator needed
npx expo export --platform android # same, for Android
```

## Keeping in sync with the web app

There is **no shared package** between `mobile/` and the web app at the
repo root (a deliberate choice — see
`/root/.claude/plans/master-build-prompt-build-swift-shannon.md`'s
mobile-app plan for why). When one side's business rules, validation
schemas, or design tokens change, the other needs a matching hand-edit:

- **Design tokens**: `tailwind.config.js` here vs. `../app/globals.css`.
- **Validation schemas**: ported by hand from `../lib/validation/*.ts`
  as each one is needed on mobile (none ported yet — Foundation
  milestone only).
- **Database types**: `lib/database.types.ts` here vs.
  `../types/database.ts` on web — both hand-maintained against the same
  Supabase schema in `../supabase/migrations/`.
- **Business rules / RLS**: enforced identically for both clients by the
  *database* (RLS policies, `SECURITY DEFINER` functions) — this is the
  one thing that can't drift, since both apps hit the same backend with
  only the anon key, same as any other untrusted client.

## Status

Foundation milestone only: Expo Router shell, tab navigation (Home /
Search / Saved / Messages), NativeWind design tokens, Supabase client +
session provider, font loading. Every other screen is a placeholder
stating which milestone it lands in — see the mobile-app plan referenced
above for the full milestone breakdown.

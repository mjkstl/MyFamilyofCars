# My Family of Cars — Phase 1 MVP

A React Native (Expo) + Supabase app where a family builds a shared,
visual record of every car they've ever owned.

**Start here:** [SETUP.md](./SETUP.md) — step-by-step, written for someone
who has Node installed but hasn't used Expo or Supabase before.

## What's in Phase 1

- Create or join a family (no login wall — anonymous auth under the hood)
- Add cars with make/model autocomplete (NHTSA), color, photo, nickname
- Photo quality check on upload (flags likely non-vehicle images)
- Flat family grid → tap a member → swipeable carousel of their cars
-
- Relationship-inference when adding family members (name + relationship
  term suggest a generational link, always confirmed by a one tap — never
  auto-committed silently)
- Two share flows: invite a family member (text/link via native share
  sheet) and share a family poster (captured image via native share sheet)

## What's intentionally deferred
 Tap a car's fun fact to expand it (seeded trivia, ~50-model target)
Generational tree *rendering* (zoom, print/export), cartoony trivia
illustrations, notifications/badges, and monetization are Phase 2/3 per
the build prompt — the schema already has the hooks for them
(`parent_member_id`, etc.) so none of it requires a schema migration
later.

## Project structure

```
App.tsx                        entry point
src/
  screens/                     Onboarding, Tree, MemberCarousel, AddCar, Family
  components/                  MemberTile, CarCard, FamilyPoster
  hooks/                       useFamily, useMembers, useCars, useAllFamilyCars
  utils/                       relationshipInference, nhtsa
  lib/supabase.ts              Supabase client + anonymous session helper
  types/database.ts            TS types mirroring the Postgres schema
  data/seedTrivia.json         starter trivia rows
supabase/
  migrations/0001_init.sql     schema + RLS policies + storage bucket
  functions/check-photo/       Edge Function: vehicle photo classification
scripts/seedTrivia.mjs         loads seedTrivia.json into car_facts
```

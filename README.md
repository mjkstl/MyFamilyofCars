# My Family of Cars — Cars collection foundation

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

## Adding a future collection type

The Phase 3 foundation keeps `cars` as the vehicle-specific compatibility
table while every family also receives one private `collections` row of type
`cars`. Each legacy car is linked to one generic `items` row, with common
stories, photos, tags, dates, and people relationships available through the
generic tables. The migration is additive and rerunnable; it never deletes
legacy car data.

To add a future collection type:

1. Add its literal type and typed configuration to
   `src/config/collectionTypes.ts`; keep it out of the UI until its RLS and
   migration are complete.
2. Add a vehicle/category-specific table linked to `items.id`, rather than
   copying common fields into the new table.
3. Add an additive Supabase migration with a unique `(family_id, type)` row,
   RLS policies based on `is_family_member`, and an idempotent backfill if
   needed.
4. Extend `AuthorizedCollectionExport` only with typed category data; keep
   `exportAuthorizedFamilyCollection` as the permission boundary.
5. Validate a fresh family, a migrated family, rerunning the migration, RLS
   access for a non-member, and rollback by disabling the new UI and dropping
   only the new category extension after validation.

Migration operators can verify the backfill with:

```sql
select migration_key, status, migrated_count, started_at, completed_at, error_message
from public.collection_migration_runs
order by started_at desc;

select count(*) as legacy_cars,
       count(*) filter (where collection_id is not null) as cars_with_collection,
       count(*) filter (where item_id is not null) as cars_with_item
from public.cars;
```

Rollback is intentionally non-destructive: first deploy the prior client build
or hide any future collection UI, then remove only the Phase 3 objects after
exporting/validating the new data:

```sql
drop trigger if exists cars_sync_collection_item on public.cars;
drop trigger if exists families_create_cars_collection on public.families;
alter table public.cars drop column if exists item_id;
alter table public.cars drop column if exists collection_id;
drop function if exists public.sync_car_collection_item();
drop function if exists public.migrate_legacy_cars_to_collections();
drop function if exists public.ensure_family_cars_collection();
drop table if exists public.item_photos;
drop table if exists public.item_people;
drop table if exists public.items;
drop table if exists public.collections;
drop table if exists public.collection_migration_runs;
```

The legacy `cars` rows and their original `photo_url`, `memories`, and
vehicle-specific fields remain available throughout that rollback.

## Phase 4 Storybook and keepsake

The `Our Story` tab is a narrative view over the private Cars collection. It
supports sorting by date added, year, person, and status, handles missing
photos/stories, displays ordered `item_photos` captions, and links to the
existing authorized car edit/detail flow. `Create a keepsake` opens a
browser-native print preview with a cover, an index for larger collections,
and one print page per car. It does not create PDFs or expose collection data
outside the existing authenticated Supabase/RLS path.

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

# Setup Guide — My Family of Cars (Phase 1)

You have Node installed already, so this picks up from there. Follow these
in order — each step depends on the one before it.

---

## 1. Install the Expo CLI tooling and project dependencies

```bash
cd my-family-of-cars
npm install
```

This installs everything, including a few packages pinned to versions that
were current as of early 2026. Expo SDK versions move fast, so immediately
after `npm install`, run:

```bash
npx expo install --fix
```

This lets Expo itself correct any package to the exact version your
installed Expo SDK expects — trust this over the versions in
`package.json`, since Expo dependency mismatches are one of the most common
sources of cryptic runtime crashes in React Native.

---

## 2. Create your Supabase project

1. Go to supabase.com and create a free account, then "New Project."
2. Once it's provisioned, go to **Project Settings → API**. You'll need two
   values from here in a minute: the **Project URL** and the **anon public
   key**.
3. Go to **Authentication → Providers** and enable **Anonymous Sign-Ins**.
   This app has no login wall in Phase 1 — every device signs in
   anonymously in the background, and that anonymous identity is what our
   Row Level Security policies key off. If you skip this step, every
   database call will fail with a permissions error.
4. Go to the **SQL Editor**, open `supabase/migrations/0001_init.sql` from
   this project, paste its full contents in, and run it. This creates all
   tables, the security policies, and the `car-photos` storage bucket in
   one shot.
5. Verify it worked: go to **Table Editor** — you should see `families`,
   `members`, `cars`, `car_facts`, and `family_shares`.
6. Run the remaining SQL migrations in filename order:
   `supabase/migrations/0002_car_status_and_fun_fact.sql`, then
   `supabase/migrations/0003_collections_items_foundation.sql`. The Phase 3
   migration creates one private Cars collection per family, links legacy cars
   to generic items, and records the migration result in
   `collection_migration_runs`. It is additive and safe to rerun.

---

## 3. Connect the app to your Supabase project

```bash
cp .env.example .env
```

Open `.env` and fill in the two values from step 2.2:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Restart the Expo dev server any time you change `.env`** — these values
are baked in at bundle time, not read live.

---

## 4. Deploy the photo quality-check Edge Function

This is a separate deploy step from the SQL migration, and it needs the
Supabase CLI.

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy check-photo
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get an Anthropic API key from console.anthropic.com if you don't have one.
This key lives only as a Supabase secret — it is never in the app bundle,
by design (see the Edge Function comments for why).

**If you skip this step:** the app still works. `useCars.ts` is written to
degrade gracefully — a failed or missing quality-check call just leaves
the photo as `pending` instead of blocking the save. You can deploy this
function later without touching any client code.

---

## 5. (Optional) Seed starter trivia

The app ships with 10 sample facts in `src/data/seedTrivia.json` as a
starting point toward the ~50 the Phase 1 spec calls for. To load them:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/seedTrivia.mjs
```

The service role key is in **Project Settings → API** — treat it like a
password, never commit it or put it in `.env` (it bypasses every RLS
policy we just wrote).

---

## 6. Run it

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (iOS or Android),
or press `i` / `a` in the terminal to open an iOS Simulator / Android
Emulator if you have one installed.

---

## 7. Validate before you trust it

Two commands worth running any time you (or I) change code, before
assuming something works:

```bash
npx tsc --noEmit    # type errors — should output nothing
npx expo start       # then actually click through: create family →
                      # add a member → confirm/skip the relationship link →
                      # add a car with a photo → see it in the Tree tab
```

I hand-verified every file in this project with `tsc --noEmit` before
handing it to you (zero errors), but I can't run a live simulator from my
side — this last click-through is the one verification step I genuinely
need you to do, since it's the only way to catch anything environment- or
device-specific.

---

## Known Phase 1 limitations (by design, not bugs)

- **Tree tab is a flat grid**, not a generational layout — that's Phase 3,
  once `parent_member_id` data exists to render from.
- **One poster share template** — "Share My Family of Cars" on the Tree
  tab captures a simple grid poster (up to 9 cars) and opens the native
  share sheet. More styles/no-watermark is a Phase 3 premium feature per
  the monetization table.
- **Trivia is static**, matched by exact make/model/year — no fuzzy
  matching or LLM generation yet (that's Phase 2).

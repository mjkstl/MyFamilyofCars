# My Family of Cars — Release Guide

**Written 2026-11-17. Read this first.** It is the short, ordered answer to
"what is left before the App Store, and who does it." Detail and evidence
live in two companion files:

- `docs/APP_STORE_RELEASE_PROGRESS.md` — release-gate phases, with proof
- `docs/UI_ITERATION_NOTES.md` — screen-by-screen UI history

## 1. Where things stand

| Area | Status | Proof |
|---|---|---|
| Family access lockdown (Phase 2A) | **Done and verified live** | Migration 0008 applied 2026-11-17; 8 of 8 live checks pass (stranger sees nothing, no join without an invite, valid invite joins, no test rows left behind) |
| AI photo check off (Phase 3) | Done | Flag in `src/config/featureFlags.ts`; no network call when off |
| Tooling (Phase 1) | Done | typecheck, lint, test, web build all exit 0 |
| UI rounds 1 and 2 | Done, expect more rounds | Rendered at 390pt and 320pt from the real web build |
| New logo + app icon files | Done | `assets/` — icon, adaptive icon, splash, favicon |
| Settings + legal pages (Phase 4) | Shell built; support email still a placeholder | Section 6 |
| Everything else | Not started | See section 3 |

The app is **not** ready for TestFlight or the App Store. The two biggest
gaps are the Expo version (cannot be submitted as-is) and photo privacy.

## 2. Things only Malcolm can do (start these now)

| # | Action | Why it blocks | Effort |
|---|---|---|---|
| 1 | Pay for the Apple Developer Program ($99/yr) at developer.apple.com | No TestFlight, no submission, no iPhone build without it. Approval is not instant. | 15 min + wait |
| 2 | Choose a support email address for the app | Shown in Settings, the legal pages and the App Store listing. Put it in `src/config/legal.ts`. | 5 min |
| 3 | Decide: iPad support on or off for v1 | `app.json` has `supportsTablet: true`, so Apple reviews an iPad layout nobody designed. Recommendation: set it to `false`. | 1 min |
| 4 | Have someone qualified read the Privacy Policy and Terms drafts | They are drafts written from the code, not legal advice. | — |
| 5 | Create a free expo.dev account | Needed for cloud iPhone builds (EAS) — you are on Windows, so builds happen in Expo's cloud, no Mac needed. | 10 min |
| 6 | Have an iPhone on hand for testing | Nothing in this app has ever run as a real iPhone build. | — |

## 3. Remaining work, in order

Order matters: each row assumes the ones above it are done.

| # | Work | Track | Type of decision | Notes |
|---|---|---|---|---|
| 1 | **Expo SDK 52 → current (54 minimum)** | Release gate (new "Phase 0") | Sequencing | Apple only accepts builds made with Xcode 26 / iOS 26 SDK. Upgrade ONE version at a time (52→53→54…), running typecheck, lint, test, web build after each. `package.json` changes — review every diff. Then first real iPhone build with EAS. Expect surprises here; this is the least predictable item. |
| 2 | **Phase 2B — private photos** | Release gate | **Architectural** | Today the `car-photos` bucket is public: anyone with a photo link can view it, and any signed-in session can upload or overwrite. Needs: private bucket, per-family paths, signed links, a backfill of existing photos, server-side size/type limits. Must be tested against live Supabase — cannot be fully verified in a sandbox. |
| 3 | Phase 4 — finish Settings + legal pages | Release gate | Sequencing | Shell exists (section 6). Left: real support email, legal review. |
| 4 | **Phase 5 — email sign-in (magic link) + "Secure your family"** | Release gate | **Architectural** | Today identity is an anonymous session stored on the device: delete the app and the family is unreachable. Claim flow must keep the same user id so nothing is duplicated. |
| 5 | Phase 6 — delete account, transfer ownership | Release gate | Architectural | Apple requires in-app account deletion once accounts exist. Must run on the server. |
| 6 | Phase 7 — report content, remove member | Release gate | Sequencing | New `reports` table + a "Report" action on cars/photos/stories; family owner can remove a member. |
| 7 | Phase 9 — privacy inventory + App Store privacy labels | Release gate | Sequencing | Draft inventory: `docs/PRIVACY_DATA_INVENTORY.md`. Finalise after Phases 2B–7, since they change the data flows. |
| 8 | Phase 10 — automated tests + TestFlight checklist | Release gate | Sequencing | 10 unit tests and 17 database access checks exist (section 6). Still needed: tests for sign-in, deletion, photos; the manual TestFlight checklist. |
| 9 | App Store listing | Marketing | Taste | Screenshots (6.9" iPhone), description, keywords, age rating, privacy labels, review notes. Do last — screenshots should show the final UI. |
| 10 | Remaining UI screens | UI | Taste (rounds) | Keepsake preview, the two member pop-ups, car reordering, onboarding polish. Can run any time; does not block the gate. |

**Dropped from v1:** Phase 8 (Sign in with Apple). Apple requires it only
when an app offers another company's login (Google, Facebook…). Email
magic link alone does not trigger it.

## 4. Known risks and loose ends

- **Storage is still open** until Phase 2B (row 2 above). Do not invite
  real families to upload personal photos before then.
- **`package-lock.json`:** an older local change to it failed a clean
  install. If it shows as changed, discard it; never commit it blind.
- **Hand-made database policies:** several policies exist on live
  Supabase that are in no migration file. The dangerous ones are gone
  (0008). The rest are harmless duplicates. Rule going forward: never
  create or edit a policy in the dashboard — only through a numbered
  migration file.
- **Makes save in capitals** ("FORD") because that is how the lookup
  service returns them. Cosmetic.
- **GitHub had commits your computer did not** (found 2026-11-16).
  Before starting work, always "Fetch origin" in GitHub Desktop.
- **Six lint warnings** (data-loading pattern in five hooks/screens) are
  known and documented in the progress file. Not blocking.

## 5. How to check the work yourself

Run these in a terminal opened in the repo folder. Each should end with
no errors.

1. `npm run typecheck`
2. `npm run lint` (0 errors; 6 known warnings)
3. `npm run test`
4. `npm run build:web`

Database access rules: see `supabase/tests/README.md` for
the script that proves a stranger cannot read or join a family.

## 6. Added in the 2026-11-17 session (after sections 1–5 were written)

All verified by typecheck, lint, 10 tests and a web build; Settings
rendered at phone width.

- **Phase 4 shell — built.** A Settings screen (gear icon on the Family
  Tree screen) with Account, Family members, Privacy & data, Help. Legal
  pages are live web pages once pushed:
  `/privacy.html`, `/terms.html`, `/support.html` (source in `public/`).
  **Not finished:** the support email is a placeholder — Settings shows
  a red warning until `src/config/legal.ts` and the three HTML files are
  updated (search for `SUPPORT_EMAIL`). Deletion, member removal and
  content reports are email requests for now; Phases 6 and 7 replace
  them with real in-app actions.
- **Phase 9 draft** — `docs/PRIVACY_DATA_INVENTORY.md`, with the App
  Store privacy-label category for each kind of data and five open
  questions.
- **Phase 10 start** — 10 automated tests (was 1), plus
  `supabase/tests/run_access_checks.py`: 17 database access checks that
  run the real migration files on a local Postgres.
- **Cleanup** — the temporary join fallback in `useFamily.ts` is removed
  (migration 0008 is live).

## 7. How to start the next session

Paste this:

> Read `docs/RELEASE_GUIDE.md`, then `docs/APP_STORE_RELEASE_PROGRESS.md`.
> Check the repo matches GitHub (fetch first). Then start row 1 of
> section 3: the Expo SDK upgrade, one version at a time, on a separate
> branch, verifying after each step.

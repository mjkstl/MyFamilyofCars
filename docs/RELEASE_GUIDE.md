# My Family of Cars — Release Guide

**Written 2026-11-17, updated the same day (Session 4). Read this first.**
It is the short, ordered answer to "what is left before the App Store, and
who does it." Detail and evidence live in two companion files:

- `docs/APP_STORE_RELEASE_PROGRESS.md` — release-gate phases, with proof
- `docs/UI_ITERATION_NOTES.md` — screen-by-screen UI history

**Two decisions made in Session 4 that shape this guide:**

1. **The Apple Developer Program ($99/yr) is deferred on purpose.** Malcolm
   will enroll **as an individual** once Phases 2B, 5, 6 and 7 are done —
   not before. Until then there is no TestFlight, no EAS iPhone build and
   no submission, and that is fine: none of those phases need them.
2. **iPhone testing happens in Expo Go** (the free App Store app) until
   enrollment. Expo Go runs only the newest Expo SDK, so the project had to
   reach SDK 58 first. That upgrade is done on a branch (section 1).

## 1. Where things stand

| Area | Status | Proof |
|---|---|---|
| **Expo SDK 52 → 58** | **Done on branch `chore/expo-sdk-upgrade`, not merged yet** | One commit per version (53, 54, 55, 56, 57, 58). After each: clean install, typecheck, lint, 10 tests, web build and an iPhone JavaScript bundle all pass. **Not yet verified on a real iPhone** — that is your Expo Go test (section 3). |
| Family access lockdown (Phase 2A) | **Done and verified live** | Migration 0008 applied 2026-11-17; 8 of 8 live checks pass (stranger sees nothing, no join without an invite, valid invite joins, no test rows left behind) |
| AI photo check off (Phase 3) | Done | Flag in `src/config/featureFlags.ts`; no network call when off |
| Tooling (Phase 1) | Done | typecheck, lint, test, web build all exit 0 |
| UI rounds 1 and 2 | Done, expect more rounds | Rendered at 390pt and 320pt from the real web build |
| New logo + app icon files | Done | `assets/` — icon, adaptive icon, splash, favicon |
| Settings + legal pages (Phase 4) | Shell built; support email still a placeholder | Section 7 |
| Everything else | Not started | See section 4 |

The app is **not** ready for TestFlight or the App Store. The biggest
remaining gaps are photo privacy (Phase 2B) and real accounts (Phases 5–6).

## 2. Things only Malcolm can do

| # | Action | When | Why | Effort |
|---|---|---|---|---|
| 1 | **Test the upgrade in Expo Go on your iPhone**, then merge the branch | Now | Proves SDK 58 works on a real phone. Step-by-step in section 3. | 30–45 min |
| 2 | Check your computer's Node.js version: type `node -v` in a terminal | Now | SDK 58 needs Node **22.13 or newer** (or 24.3+). Older Node fails in confusing ways. If it is older, install the "LTS" version from nodejs.org. | 5 min |
| 3 | Choose a support email address for the app | Any time before Phase 9 | Shown in Settings, the legal pages and the App Store listing. Put it in `src/config/legal.ts`. | 5 min |
| 4 | Decide: iPad support on or off for v1 | Before enrollment | `app.json` has `supportsTablet: true`, so Apple reviews an iPad layout nobody designed. Recommendation: set it to `false`. | 1 min |
| 5 | Have someone qualified read the Privacy Policy and Terms drafts | Before submission | They are drafts written from the code, not legal advice. | — |
| 6 | **Enroll in the Apple Developer Program as an individual** ($99/yr, developer.apple.com) | **After Phases 2B, 5, 6 and 7 are done** | Needed for TestFlight, real iPhone builds and submission. Approval is not instant — allow a few days. As an individual, the App Store shows your personal legal name as the seller. Apple lets an individual account be converted to an organization later if that ever matters. | 15 min + wait |
| 7 | Create a free expo.dev account | **Now** | Expo Go on a real iPhone only opens a project when Expo Go **and** the terminal (`npx expo login`) are signed in to the **same** Expo account (found 2026-11-17 — the first version of this guide got this wrong). Also needed later for cloud iPhone builds (EAS). | 10 min |

## 3. Testing on your iPhone with Expo Go (do this next)

What this does: your Windows PC runs a small "development server" that
sends the app's code to the Expo Go app on your iPhone over Wi-Fi. Nothing
is installed on the phone except Expo Go itself.

**Important:** the app on your phone talks to your **live** Supabase
project. Anything you create while testing (a test family, test cars) is
real data. Name it something obvious like "Test Family Nov 17" so it is
easy to find and delete later.

### 3a. Get the branch onto your computer (GitHub Desktop)

1. Open **GitHub Desktop** and make sure the current repository is
   `MyFamilyofCars`.
2. Click **Fetch origin** (top bar). This downloads anything new on GitHub,
   including the upgrade branch. Wait until it finishes.
3. Click **Current branch** (top bar), then pick
   **`chore/expo-sdk-upgrade`** from the list. If it is under "Other
   branches", click it there. GitHub Desktop switches your files to that
   branch.
4. If GitHub Desktop says you have uncommitted changes and asks what to
   do, choose **leave my changes on main** (or "stash"), not "bring my
   changes". The upgrade should be tested on a clean copy.

### 3b. Install the new packages (terminal)

1. In GitHub Desktop choose **Repository → Open in Command Prompt** (or
   PowerShell). A terminal opens in the right folder.
2. Type `node -v` and press Enter. It must say `v22.13` or higher, or
   `v24.3` or higher (see section 2, row 2).
3. Type `npm ci` and press Enter. This deletes the old `node_modules`
   folder and installs exactly the versions the branch was tested with.
   It takes 1–3 minutes. Near the end you should see
   `Applying patches... react-native-draggable-flatlist@4.0.3 ✔` — that
   line matters (see section 5).
4. Optional but useful: type `npx expo-doctor@latest` and press Enter. It
   should say all checks passed. (Two of its checks need the internet,
   which is why they could not run in Larry's sandbox.)

### 3c. Start the app and open it on your iPhone

1. On the iPhone, install **Expo Go** from the App Store (or update it if
   you already have it). The App Store version runs SDK 58. If it is ever
   on a different SDK, Expo Go says so when you open the project
   ("incompatible SDK version") — send Larry that message.
2. **Sign in on both sides with the same free expo.dev account.**
   On the PC: run `npx expo login` in the project terminal and follow the
   browser sign-in. On the iPhone: open Expo Go → **Home** → tap the
   round avatar icon (top right) → sign in. Without this, Expo Go shows
   "You need to be signed in to Expo Go and Expo CLI".
3. Make sure the iPhone and the PC are on the **same Wi-Fi network**.
4. In the terminal, type `npx expo start` and press Enter. After a few
   seconds a QR code appears in the terminal.
5. On the iPhone, open the regular **Camera** app and point it at the QR
   code. Tap the "Open in Expo Go" banner. The first load takes up to a
   minute.
6. If the phone cannot connect (spinner forever, or "could not connect to
   development server"): press `Ctrl + C` in the terminal to stop, then
   run `npx expo start --tunnel` instead and scan the new QR code. Windows
   Firewall may ask whether to allow Node.js — choose **Allow**.

### 3d. What to try (and what to report back)

Work through this list. For anything that fails, take a screenshot — a red
error screen in Expo Go is the most useful thing you can send back.

| # | Try this | Why it is on the list |
|---|---|---|
| 1 | Start a new family (family name + your name), optional photo | First run, anonymous sign-in, photo picker |
| 2 | Add a car using the make/model search | NHTSA lookups, keyboard, scrolling |
| 3 | Add a photo to a car — once from your library, once with the camera | Permissions on a real phone (never tested before) |
| 4 | **Reorder cars** by dragging (the reorder screen) | The drag library needed a patch for SDK 58 — this is the screen most likely to misbehave. Drag a car, let go, drag again. |
| 5 | Open Storybook and Print preview | Larger screens, images |
| 6 | Open Settings (gear icon); tap Privacy, Terms, Support | Links open Safari |
| 7 | Share an invite link | Share sheet. Note: invite links open the **web** app, not Expo Go — that is expected. |
| 8 | Scroll every screen, try a long family name, and open the keyboard on each form | Layout on a real screen (the app is portrait-only, so rotation is not part of the test) |

**Expected differences in Expo Go (not bugs):** the app icon, splash
screen and app name are Expo Go's, not ours; the `familyofcars://` link
scheme does not apply. Those only appear in a real build after enrollment.

### 3e. If everything works: merge the branch (GitHub website)

1. Go to github.com/mjkstl/MyFamilyofCars. GitHub usually shows a yellow
   bar "chore/expo-sdk-upgrade had recent pushes" with a **Compare & pull
   request** button — click it. (If not: **Pull requests → New pull
   request**, base `main`, compare `chore/expo-sdk-upgrade`.)
2. Click **Create pull request**. GitHub Actions runs the CI check
   (typecheck + web build). Wait for the green check mark — 2–4 minutes.
   If it shows a red X, click **Details** and send Larry the log.
3. Click **Merge pull request**, then **Confirm merge**.
4. Vercel deploys `main` automatically. Open
   my-familyof-cars.vercel.app afterwards and check the app still loads.
5. Back in GitHub Desktop: switch **Current branch** to `main`, click
   **Fetch origin**, then **Pull origin**. Run `npm ci` again in the
   terminal, because `main` now has the new packages.

If something fails on the phone, **do not merge** — `main` stays on SDK 52
and keeps working, and the next session fixes the branch.

## 4. Remaining work, in order

Order matters: each row assumes the ones above it are done.

| # | Work | Track | Type of decision | Notes |
|---|---|---|---|---|
| 1 | **Expo SDK 52 → 58** | Release gate ("Phase 0") | Sequencing | **Code done** on `chore/expo-sdk-upgrade` (see Session 4 in the progress file). Left: Malcolm's Expo Go test (section 3), then merge. |
| 2 | **Phase 2B — private photos** | Release gate | **Architectural** | Today the `car-photos` bucket is public: anyone with a photo link can view it, and any signed-in session can upload or overwrite. Needs: private bucket, per-family paths, signed links, a backfill of existing photos, server-side size/type limits. Must be tested against live Supabase — cannot be fully verified in a sandbox. Can be tested in Expo Go. |
| 3 | Phase 4 — finish Settings + legal pages | Release gate | Sequencing | Shell exists (section 7). Left: real support email, legal review. |
| 4 | **Phase 5 — email sign-in (magic link) + "Secure your family"** | Release gate | **Architectural** | Today identity is an anonymous session stored on the device: delete the app and the family is unreachable. Claim flow must keep the same user id so nothing is duplicated. Magic-link emails need a link that opens the app; in Expo Go that link is different from a real build, so the design must handle both. |
| 5 | Phase 6 — delete account, transfer ownership | Release gate | Architectural | Apple requires in-app account deletion once accounts exist. Must run on the server. |
| 6 | Phase 7 — report content, remove member | Release gate | Sequencing | New `reports` table + a "Report" action on cars/photos/stories; family owner can remove a member. |
| 7 | **Apple Developer enrollment (individual) + first real iPhone build** | Release gate | Sequencing | Malcolm enrolls (section 2, row 6) → create expo.dev account → `eas build` for iOS in Expo's cloud → TestFlight. First time the real icon, splash, name and `familyofcars://` links run on a phone. Expect a few surprises here. |
| 8 | Phase 9 — privacy inventory + App Store privacy labels | Release gate | Sequencing | Draft inventory: `docs/PRIVACY_DATA_INVENTORY.md`. Finalise after Phases 2B–7, since they change the data flows. |
| 9 | Phase 10 — automated tests + TestFlight checklist | Release gate | Sequencing | 10 unit tests and 17 database access checks exist (section 7). Still needed: tests for sign-in, deletion, photos; the manual TestFlight checklist (needs row 7). |
| 10 | App Store listing | Marketing | Taste | Screenshots (6.9" iPhone), description, keywords, age rating, privacy labels, review notes. Do last — screenshots should show the final UI. |
| 11 | Remaining UI screens | UI | Taste (rounds) | Keepsake preview, the two member pop-ups, car reordering, onboarding polish. Can run any time; does not block the gate. |

**Dropped from v1:** Phase 8 (Sign in with Apple). Apple requires it only
when an app offers another company's login (Google, Facebook…). Email
magic link alone does not trigger it.

## 5. Known risks and loose ends

- **Storage is still open** until Phase 2B (section 4, row 2). Do not
  invite real families to upload personal photos before then.
- **The drag-to-reorder library is patched.** `react-native-draggable-flatlist`
  (last release May 2025) still calls a React Native function that was
  removed in React Native 0.87, which would crash the Reorder Cars screen.
  The fix lives in `patches/react-native-draggable-flatlist+4.0.3.patch`
  and is re-applied automatically after every `npm install` / `npm ci`
  (the `postinstall` script). The library is pinned to exactly 4.0.3 so
  the patch keeps matching. Longer term: replace the library or rebuild
  that screen (UI track decision — see the progress file).
- **Expo Go only runs the newest SDK.** When Expo releases SDK 59 and the
  App Store Expo Go moves to it, this project will stop opening in Expo Go
  until it is upgraded again. Plan one upgrade step whenever that happens,
  until enrollment makes Expo Go unnecessary.
- **`package-lock.json`:** it changes on purpose in the upgrade branch
  (the new package versions live there). Outside an upgrade, if it shows
  as changed and you did not install anything, discard it; never commit
  it blind.
- **Hand-made database policies:** several policies exist on live
  Supabase that are in no migration file. The dangerous ones are gone
  (0008). The rest are harmless duplicates. Rule going forward: never
  create or edit a policy in the dashboard — only through a numbered
  migration file.
- **Makes save in capitals** ("FORD") because that is how the lookup
  service returns them. Cosmetic.
- **Always "Fetch origin" in GitHub Desktop before starting work.**
  GitHub has had commits your computer did not (found 2026-11-16).
- **Six lint warnings** (data-loading pattern in five hooks/screens) are
  known and documented in the progress file. Not blocking.

## 6. How to check the work yourself

Run these in a terminal opened in the repo folder. Each should end with
no errors.

1. `npm ci` (clean install; must show the patch being applied)
2. `npm run typecheck`
3. `npm run lint` (0 errors; 6 known warnings)
4. `npm run test`
5. `npm run build:web`
6. `npx expo-doctor@latest` (all checks should pass on your machine)

Database access rules: see `supabase/tests/README.md` for
the script that proves a stranger cannot read or join a family.

## 7. Added in the 2026-11-17 Session 3 (Phase 4 shell and friends)

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

## 8. How to start the next session

If the Expo Go test **passed and the branch is merged**, paste this:

> Read `docs/RELEASE_GUIDE.md`, then `docs/APP_STORE_RELEASE_PROGRESS.md`.
> Check the repo matches GitHub (fetch first). The SDK 58 upgrade is
> merged and passed my Expo Go test. Start Phase 2B (private photos).

If something **failed** in Expo Go, paste this plus your screenshots:

> Read `docs/RELEASE_GUIDE.md`, then `docs/APP_STORE_RELEASE_PROGRESS.md`.
> Check the repo matches GitHub (fetch first). My Expo Go test of
> `chore/expo-sdk-upgrade` failed at step [number] of section 3d —
> screenshots attached. Fix it on the branch.

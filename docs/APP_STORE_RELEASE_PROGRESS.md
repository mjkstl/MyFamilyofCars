# App Store v1 Release Gate — Progress Tracker

**Read this file first if you're picking this work up in a new session.**
It exists specifically so work can pause and resume across separate sessions
(e.g. daily usage limits) without re-planning or losing context. Update the
checklist and the "Session Log" at the bottom every time you complete or
pause a piece of work — that log is the source of truth for what's actually
true right now, more than any conversation history.

Source spec: the original brief is preserved in full at the bottom of this
file under "Original Brief," so this doc is self-contained even if the
original request is lost.

## Ground rules (apply to every phase)

- Never leave the repo in a half-working state at the end of a session.
  Each phase below is scoped so it can be fully completed, verified
  (`npx tsc --noEmit` clean, and where applicable a real build/export),
  and committed before stopping — even if that means doing a smaller
  phase than planned for a given session.
- New migrations only. Never edit an already-applied migration.
- Every phase must preserve existing families/members/cars/photos/
  invitations. If a phase requires a schema change, it ships alongside a
  backfill plan and does not delete legacy data until the new path is
  verified.
- Do not claim App Store readiness until every phase is checked off AND
  verified — not just implemented.

## Phase order and why

1. **Tooling & tracking foundation** — scripts and this doc must exist
   before anything else, so every later phase can be verified consistently
   and progress survives interruptions.
2. **RLS & privacy fixes (spec §2)** — the spec explicitly calls these
   release-blocking (public photo bucket, broad invite-code read policy).
   Fixing the biggest exposure first is the correct security posture
   regardless of what's convenient to build.
3. **AI photo classification (spec §3)** — small, bounded, and unblocks
   "saving a car must work without it." Doing this right after the RLS
   work means the photo-upload path only needs to be touched once.
4. **Settings screen shell + legal page placeholders (part of spec §1, §6)**
   — needed as the home for account/privacy/deletion UI in the next
   phases; low risk to build early.
5. **Identity: email magic link + account claim flow (spec §1)** —
   the achievable-on-web half of identity work. Sign in with Apple is
   split out separately (see Phase 8) because it requires native iOS
   builds and Malcolm's own Apple Developer account — real external
   dependencies, not something to block the rest of the work on.
6. **Account deletion & ownership transfer (spec §4)** — depends on real
   accounts existing (Phase 5), so sequenced after it.
7. **Content safety: report content, remove member (spec §5)** — largely
   independent of identity work; can slot in after core privacy/identity
   is stable.
8. **Sign in with Apple (spec §1, native half)** — requires Malcolm's
   Apple Developer account, EAS Build config, and a real device/TestFlight
   to test. Flagged as blocked-on-external-input until that's in hand.
9. **Privacy documentation & App Store inventory (spec §6)** — reflects
   the final state of all data flows, so it's most accurate done last,
   though it can be drafted incrementally as each phase lands.
10. **Testing & release-readiness statement (spec §7)** — the automated
    test suite and manual regression checklist only mean something once
    the features they test actually exist.

## Status checklist

- [ ] **Phase 1 — Tooling & tracking foundation**
  - [x] This progress doc created
  - [x] `lint`, `typecheck`, `test`, `build:web` npm scripts added and
        verified with real exit codes (not just claimed):
        - `npm run typecheck` → exit 0, zero errors
        - `npm run test` → exit 0, 1/1 passing (jest-expo@52.0.6,
          correctly matched to the SDK 52 runtime, not the latest
          version which would have pulled in an incompatible React 19
          peer dependency — same version-drift mistake as the
          `expo-font` bug earlier, caught before install this time)
        - `npm run lint` → exit 0, 0 errors, 6 warnings (see below)
        - `npm run build:web` → exit 0, real Metro bundle produced.
          Note: a true native EAS build script isn't possible yet since
          Phase 8's Apple Developer Program blocker also affects
          iOS builds; `build:web` is the meaningful, currently-
          achievable build validation. Add a native `build` script once
          Phase 8's blocker clears.
  - [x] Minimal test runner installed and wired (`jest-expo@52.0.6` +
        `jest.config.js` + one smoke test at
        `src/__tests__/smoke.test.ts` proving the runner works — real
        feature tests come in Phase 10, once those features exist)
  - [x] ESLint installed (`eslint@8.57.0` — pinned to the last v8
        release specifically so the simple, well-documented legacy
        `.eslintrc.js` format works, rather than fighting ESLint 9's
        newer flat-config format under time pressure) with
        `eslint-config-expo`
  - [x] **Known, documented lint debt (not fixed in this phase, not
        hidden either):** `react-hooks/set-state-in-effect` fires on 6
        pre-existing files that all call `refresh()`/setState directly
        inside a mount `useEffect` — a common React data-fetching
        pattern, but one the newer stricter lint rule flags. Fixing all
        six is a genuine data-layer refactor, not a tooling task, so the
        rule is downgraded to `warn` (not disabled) with a comment in
        `.eslintrc.js` explaining why. Affected files, for whoever picks
        up that refactor later:
        - `src/hooks/useFamily.ts:88`
        - `src/hooks/useMembers.ts:25`
        - `src/hooks/useCars.ts:26`
        - `src/hooks/useAllFamilyCars.ts:69`
        - `src/screens/CarReorderScreen.tsx:21`
        - `src/components/MemberEditModal.tsx:21`

**Phase 1: COMPLETE.**
- [ ] **Phase 2 — RLS & privacy fixes** *(split into 2A and 2B — each
      independently completable, per the "never leave things half-done"
      rule)*
  - [x] **Phase 2A — Family access lockdown: COMPLETE and verified
        live 2026-11-17** (migrations 0007 + 0008; see Session 3).
    - [x] New migration `0007_secure_family_invite_access.sql`:
          - Drops the broad `"families can be found by invite code"`
            policy (`invite_code is not null` was true for every row —
            effectively no restriction at all; confirmed by reading the
            live migration before writing the fix, not assumed)
          - Adds high-entropy `invite_token` (192 bits, `gen_random_bytes(24)`
            hex) alongside the legacy `invite_code` (32 bits) — backfilled
            for every existing family, so nothing breaks and everyone
            gets the stronger scheme immediately
          - `invite_code` made nullable; rotating an invite clears it
            permanently (true revocation of whatever was previously
            shared, not just "also add a new one")
          - New `lookup_invite(p_code)` function: `SECURITY DEFINER`,
            returns only `{family_id, family_name}` — never a full row,
            never creator info, never anything for a revoked invite
          - New `revoke_and_rotate_invite(p_family_id)` function:
            callable only by an existing member (checked via
            `is_family_member`), clears the old code, issues a fresh
            token
    - [x] Client: `useFamily.ts`'s `joinFamily` no longer does
          `select * from families where invite_code = ...` (the exact
          exploitable query) — now calls `lookup_invite` RPC for the
          minimal preview, inserts the member, and only THEN fetches the
          full family row (which normal RLS now permits, since the
          insert just made this session a real member)
    - [x] Client: new `rotateInvite()` function added to `useFamily.ts`,
          wired to a "Get a new invite link" button in `MyTreeScreen.tsx`
          with a confirm dialog (since it invalidates existing shared
          links — a real, irreversible action)
    - [x] Types: `Family.invite_code` now `string | null`,
          `invite_token: string` and `invite_revoked_at: string | null`
          added to `src/types/database.ts`
    - [x] **Verified with real exit codes, not just claimed:**
          `npm run typecheck` → 0, `npm run build:web` → 0 (real Metro
          bundle), `npm run lint` → 0 errors / 6 warnings (the same
          pre-existing 6 from Phase 1, zero new ones introduced)
    - [ ] **Not yet verified: the actual live database behavior**
          (running the migration against real Supabase, joining a
          family with an old vs. new code, confirming a non-member
          truly cannot read family rows via `select *` anymore). This
          requires Malcolm to run the migration and test — I cannot
          execute SQL against his live Supabase project from this
          sandbox. Flagging honestly rather than claiming full
          verification I don't have.
  - [ ] **Phase 2B — Photo storage privacy: NOT STARTED.** Private
        bucket, signed URLs, backfill of existing public photo
        references, removed-member access revocation, server-side
        upload validation. This is the next piece of Phase 2.
- [ ] **Phase 3 — AI photo classification**
  - [x] Decision confirmed with Malcolm: **disable behind a feature flag**
        (spec's preferred option). Note for accuracy: this is not itself
        a literal Apple review gate — Apple doesn't audit backend URL
        validation. The real App Store requirement is *disclosure* if
        the feature stays on (Privacy Policy + App Privacy Nutrition
        Label must accurately state photos are sent to a third-party AI
        provider, per Guideline 5.1). Disabling sidesteps both the
        disclosure obligation and the security exposure at once, which
        is why it's the pragmatic choice even though it wasn't a strict
        "must." The other hardening items in the spec (auth checks, rate
        limiting, no wildcard CORS) remain good general practice
        regardless, just not blocking for this phase since the feature
        is being turned off.
  - [x] Implemented per decision; car save works with it fully off
        (`src/config/featureFlags.ts` + `src/hooks/useCars.ts` short-
        circuit — no network call to check-photo happens at all when
        the flag is off). Verified: `npx tsc --noEmit` clean.
        **Correction 2026-11-16:** this was not actually present in the
        repo when re-checked (see Session 2 in the log). It has now been
        re-implemented and verified (typecheck, lint, test, web build
        all exit 0).

**Phase 3: COMPLETE.**
- [ ] **Phase 4 — Settings shell + legal placeholders**
  - [ ] Settings screen with all 7 listed sections (stubs acceptable
        where a later phase fills in real logic)
  - [ ] Terms of Use / Privacy Policy / Support placeholder pages + config
- [ ] **Phase 5 — Identity: email magic link + claim flow**
  - [ ] "Secure your family" prompt after activation threshold (family +
        1 car)
  - [ ] Email magic link auth wired (Supabase Auth)
  - [ ] Claim flow: idempotent, recoverable after network failure, no
        duplicate family/member creation
  - [ ] Migration behavior documented
- [ ] **Phase 6 — Account deletion & ownership transfer**
  - [ ] Non-owner deletion path
  - [ ] Owner deletion path with ownership-transfer offer
  - [ ] Owner deletion with no eligible transferee (clear warning + delete)
  - [ ] Server-side deletion, not client-only
- [ ] **Phase 7 — Content safety**
  - [ ] Reports table (new migration) + moderation process doc
  - [ ] Report content UI on car/photo/story surfaces
  - [ ] Family-admin remove-member + immediate access revocation
  - [ ] Accessible Terms / community standards content
- [ ] **Phase 8 — Sign in with Apple** *(blocked: Malcolm has a free
      Apple ID but not yet the paid Apple Developer Program enrollment
      required for this capability + TestFlight)*
  - [ ] `expo-apple-authentication` wired
  - [ ] Tested via TestFlight (cannot be verified via web/Expo Go)
- [ ] **Phase 9 — Privacy documentation & inventory**
  - [ ] Full data-type inventory table (spec §6 list)
  - [ ] Public Privacy Policy / Terms / Support URLs finalized
- [ ] **Phase 10 — Testing & release-readiness statement**
  - [ ] Automated tests for every flow listed in spec §7
  - [ ] Manual TestFlight regression checklist executed
  - [ ] Final honest readiness statement (ready / not ready, with reasons)

## External dependencies (Malcolm needs to provide/decide these)

- **Apple Developer Program paid enrollment ($99/year)** — Malcolm has a
  free Apple ID registered at developer.apple.com but has NOT yet paid
  for Program enrollment. The free tier does not unlock Sign in with
  Apple capability, TestFlight distribution, or App Store submission —
  all of Phase 8 and the manual-TestFlight portion of Phase 10 are
  blocked until this is paid for. Not urgent yet since several phases
  come first, but flagging now so it's not a surprise later.
- **Support email/URL** — needed for Settings → Support and for the
  report-content confirmation flow (Phase 7).
- **Where Privacy Policy / Terms of Use will be publicly hosted** — the
  App Store requires public URLs; I can draft the content, but hosting is
  an external decision (could be as simple as a static page on the
  existing Vercel deployment).
- **Decision on AI photo classification** (Phase 3) — confirm the
  disable-behind-flag approach before I build it, since the spec allows
  either path and they have very different scope.

## Session Log

*(Newest entry at the top. Each entry: date, what was completed/verified,
what's next, anything discovered that changes the plan.)*

- **Session 3 — 2026-11-17.** `docs/RELEASE_GUIDE.md` added: the short
  ordered list of what is left and who does it — read it first.
  - **Migration 0008 APPLIED to live Supabase and verified live.** A
    self-undoing check run in the SQL editor as a real non-member user:
    target family rows visible 0; member rows visible 0; direct insert
    refused by RLS; bad code → "Invite not found"; valid invite joins
    and the family becomes visible (then rolled back); 0 leftover test
    rows; 0 loose policies remaining; immutability trigger present —
    8 of 8. Deployed web bundle confirmed to contain the new join call
    before the migration ran. **Phase 2A is now complete AND verified.**
  - Transitional join fallback removed from `useFamily.ts`.
  - **Phase 4 shell built:** `SettingsScreen`, `src/config/legal.ts`,
    public `privacy.html` / `terms.html` / `support.html`. Blocked on a
    real support email (placeholder + visible in-app warning) and legal
    review. Deletion / member removal / reports are email requests
    until Phases 6 and 7.
  - **Phase 9 draft:** `docs/PRIVACY_DATA_INVENTORY.md`.
  - **Phase 10 start:** 10 jest tests; `supabase/tests/` access checks
    (17 of 17 on local Postgres 16, running migrations 0001–0008).
  - Merged two GitHub-only commits from 2026-10-04 that were never
    pulled locally (UI notes file; CarCard 4:3 photo box — kept).
  - Verified: typecheck 0, lint 0 errors (6 known warnings), jest 10/10,
    web build 0. NOT verified: real iPhone; mailto links on a device.

- **Session 2 (continued) — 2026-11-16, policy audit + migration 0008.**
  Ran a read-only `pg_policies` query on live Supabase (35 policies).
  Findings beyond the one already logged below:
  - `members_insert_self_or_family` (hand-made) let any signed-in
    session insert ITSELF into any family whose id it knew — no invite
    needed. It was also the only reason invite-joining worked, because
    the migration-defined insert policy only admits the creator or an
    existing member.
  - "members can be updated by family members" has no WITH CHECK, so a
    member could re-point their own row at another family.
  - The remaining hand-made policies (`cars_*_family_only`,
    `families_insert_own`, `families_update_members_only`,
    `family_shares_*`, `members_select/update_family_only`,
    `car_facts_select_all`) duplicate or match the strict ones — left
    alone. Storage policies (public read, any-session upload/update)
    are too broad but belong to Phase 2B.
  **Written: `supabase/migrations/0008_close_family_access_gaps.sql`**
  — drops the two loose policies, adds `join_family_with_invite()`
  (server-side, invite-validated, idempotent join) and a trigger making
  `members.family_id` immutable. Client: `useFamily.joinFamily` now
  calls the new function, with a fallback to the old flow while 0008 is
  not yet applied (remove the fallback once 0008 is confirmed live).
  **Verified in a local Postgres 16 stand-in** (Supabase `auth` stubbed,
  migrations 0001–0007 applied, the two hand-made policies recreated):
  both holes reproduced BEFORE 0008; after it, 18 of 18 checks pass
  (stranger sees 0 families/members; direct insert refused; bad code,
  blank name, revoked token and signed-out caller refused; valid invite
  joins; repeat call returns the same member; create-family, add-relative
  and member-edit still work; family_id change refused; file re-runs
  cleanly). **NOT yet verified: live Supabase — 0008 has not been
  applied there.** Deploy order: push app code first, then run 0008,
  then repeat the stranger/join checks against the live project.
  **UI track, same session:** replaced the logo (the old one resembled
  Pixar's Cars characters) with an original mark — a road that branches
  into a family tree — and added the missing `assets/icon.png`, plus
  Android adaptive icon, splash and favicon (wired in `app.json`).
  Second UI round on the member car screen and Our Story.

- **Session 2 — 2026-11-16 (review after a ~6-week pause).** Mostly a
  UI-track session (see "UI track" note at the end of this entry), but
  it surfaced four release-gate facts that change the plan:
  1. **Phase 3 was marked COMPLETE but was not in the repo.**
     `src/config/featureFlags.ts` did not exist and `useCars.ts` still
     called the `check-photo` Edge Function on every photo upload.
     Re-implemented this session: flag file added,
     `runPhotoQualityCheck` returns `'pending'` before any network call
     when the flag is off. Verified by typecheck/lint/test/web build
     (all exit 0). Lesson: this doc's checkboxes were trusted over the
     code — from now on verify a "complete" phase against the repo
     before building on it.
  2. **Phase 2A is applied on live Supabase, but is currently defeated
     by a policy that is not in any migration.** Checked in the
     dashboard: `lookup_invite` and `revoke_and_rotate_invite` exist and
     the old "families can be found by invite code" policy is gone, so
     migration 0007 ran. HOWEVER the `families` table also has a policy
     named `families_select_any_authenticated` — `for select to public
     using (auth.uid() is not null)` — which lets ANY signed-in session
     (anonymous ones included) read every family row, invite token
     included. Postgres ORs permissive policies together, so this one
     policy re-opens exactly the hole 0007 closed. It was created
     directly in the dashboard (it appears in no file under
     `supabase/migrations/`), as were `families_insert_own`,
     `families_update_members_only` and four `cars_*_family_only`
     policies. **Phase 2A is therefore NOT verified. Next step: list
     every live policy (read-only query on `pg_policies`), then write
     additive migration 0008 that drops the over-broad ones, and re-test
     that a non-member cannot `select` a family.**
  3. **NEW gate — Expo SDK upgrade (call it Phase 0).** Since
     2026-04-28 App Store Connect only accepts builds made with
     Xcode 26 / the iOS 26 SDK; Expo's guidance is SDK 54 at minimum and
     the current release is SDK 58. This project is on SDK 52, so it
     cannot be submitted, and Expo Go on a physical iPhone no longer
     runs it. The app has also never been run as a native iOS build.
     Upgrade one SDK version at a time, verifying after each.
  4. **Phase 8 (Sign in with Apple) can leave v1 scope.** Guideline 4.8
     only applies when an app offers a third-party/social login. With
     email magic link as the only sign-in, it does not apply. The $99
     Apple Developer Program fee is still required for TestFlight and
     submission.
  Also noted: `app.json` points at `./assets/icon.png`, which does not
  exist (only `logo.png` does) — a native build needs a real 1024px
  icon; `ios.supportsTablet` is `true`, which puts an undesigned iPad
  layout in front of App Review (recommend `false` for v1); and the
  uncommitted `package-lock.json` in the working folder fails `npm ci`
  (out of sync on `@emnapi/*`) — do not commit it as-is.
  **UI track (separate from the release gate, do not conflate):** added
  `src/theme/tokens.ts`; reworked the Family Tree home screen, the Add
  Car form and its success screen, and the member tile; fixed five
  bugs (invite on the success screen shared a null legacy code; "new
  invite link" did nothing on web; a car photo could not be replaced;
  empty-state text named a tab that no longer exists; errors were
  shown via `Alert.alert`, which is invisible on web). Web invite links
  now open "Join a family" with the code pre-filled.
  **Revised order of work:** pay Apple Developer fee → policy audit +
  migration 0008 → Expo SDK upgrade + first real iPhone build → 2B → 4
  → 5 → 6 → 7 → 9 → 10.

- **Session 1 (continued)** — Phase 2A (family access lockdown) fully
  implemented and verified via typecheck/lint/build (all real exit
  codes, see Phase 2A checklist for exact evidence). Confirmed the
  exploit precisely before fixing it: the old policy's condition
  (`invite_code is not null`) was true for every family row ever
  created, so it was effectively a no-op restriction — any authenticated
  or anonymous session could `select * from families` and read every
  family's name, code, and creator id. New migration adds a 192-bit
  invite token, makes rotation into true revocation (old code is cleared,
  not just supplemented), and replaces the exploitable direct client
  query with a minimal-data RPC. One thing I genuinely cannot verify
  from this sandbox: the live database behavior once the migration
  actually runs (I have no execution access to Malcolm's real Supabase
  project) — that verification has to happen on his end.
  **Next: Phase 2B — photo storage privacy (private bucket, signed
  URLs, backfill, removed-member revocation). This is the other half of
  Phase 2 and was deliberately split out as its own completable chunk.**
- **Session 1 (continued)** — Phase 1 fully complete and verified with
  real exit codes for all 4 scripts (typecheck/test/lint/build:web — see
  Phase 1 checklist for exact evidence). Hit and fixed a version-drift
  trap identical to the earlier `expo-font` bug: `npm install jest-expo`
  with no version pin grabbed the latest release (built for a much newer
  Expo SDK, incompatible React 19 peer dep) — pinned to `~52.0.0`
  instead, matching this project's actual SDK. Also downgraded ESLint to
  8.57.0 to use the simpler legacy config format rather than fighting
  ESLint 9's flat config under time pressure. Lint found 6 genuine,
  pre-existing findings (all the same `setState`-in-mount-effect
  pattern) — documented as known lint debt with exact file:line
  locations rather than fixed now (real refactor, not a tooling task)
  or silently ignored (rule kept at `warn`, not disabled).
  Malcolm confirmed: Apple Developer account is open but NOT yet on the
  paid Program tier — Phase 8 and the manual-TestFlight part of Phase 10
  stay blocked on that until he upgrades.
  **Next up: Phase 2 — RLS & privacy fixes (public photo bucket,
  broad invite-code read policy). This is the highest-priority
  remaining item per the original spec's own "release-blocking"
  framing.**
- **Session 1 (continued)** — Phase 3 fully implemented and verified:
  added `src/config/featureFlags.ts`, wired `aiPhotoClassificationEnabled:
  false` into `useCars.ts`'s `runPhotoQualityCheck` as an early
  short-circuit (no network call at all when off). `npx tsc --noEmit`
  clean. Phase 3 is done. Still waiting on Malcolm's answer about
  whether he has an Apple Developer account (needed to properly
  sequence/flag Phase 8). Next: Phase 1 (tooling — lint/typecheck/test
  scripts), then Phase 2 (RLS & privacy fixes, the highest-priority
  remaining item).
- **Session 1** — Created this tracking document and the phase plan.
  No code changes yet. Next: confirm the Phase 3 AI-classification
  decision with Malcolm, then begin Phase 1 (tooling) and Phase 2 (RLS/
  privacy fixes), in that order.

---

## Original Brief

*(Preserved verbatim below so this document is self-contained.)*

# App Store v1 Release Gate — Security, Privacy, Identity, and Test Hardening

You are working in the existing `mjkstl/MyFamilyofCars` repository: an Expo 52 / React Native / TypeScript application backed by Supabase.

The app already includes onboarding, anonymous Supabase sessions, private family data, cars, photos, invitations, Storybook, print preview, keepsake-interest collection, and partner attribution.

Do not add new consumer features, payments, print fulfillment, subscriptions, public sharing, ads, or the Next Car Predictor in this task.

Your sole goal is to make the existing app safe and credible for a private App Store release.

## Non-negotiable constraints

- Preserve existing families, members, cars, stories, photos, collections, invitations, and product behavior.
- Do not edit or rewrite old applied migrations. Add new additive migrations only.
- Do not silently weaken existing access controls.
- Keep families private by default.
- Do not claim App Store compliance until every requirement below has been implemented and verified.
- Run `npm run typecheck`, add lint/test/build scripts where absent, and provide pass/fail evidence.

## 1. Replace anonymous-only identity with durable account ownership

The current app uses `signInAnonymously()` with AsyncStorage. This is not adequate for account recovery, ownership transfer, cross-device access, or reliable deletion.

Implement a gradual account-claim flow:

- Keep anonymous use temporarily so current users are not stranded.
- Add an explicit `Secure your family` prompt after meaningful activation: family created plus at least one car.
- Support Sign in with Apple and one first-party authentication path, preferably passwordless email magic link.
- Use `expo-apple-authentication` and `expo-secure-store` where appropriate.
- Preserve the anonymous user's existing family/member ownership and data when they claim an account.
- Make claiming idempotent and recoverable after network failure.
- Do not duplicate families or members when an anonymous session becomes an identified account.
- Document the exact anonymous-to-account migration behavior.

Add a Settings screen with:

- Account
- Privacy & Data
- Family members
- Support
- Terms of Use
- Privacy Policy
- Delete account

## 2. Fix Supabase privacy and row-level security

The current schema has two release-blocking privacy problems:

- `car-photos` is public and its objects are publicly readable.
- The `families can be found by invite code` policy permits broad reads of family rows.

Create a new additive Supabase migration that:

### Family access

- Removes the broad invite-code select policy.
- Ensures ordinary family reads are limited to creator or verified family member.
- Replaces client-side family lookup by invite code with a narrowly scoped, secure RPC or Edge Function.
- The invite lookup must return only the minimum data needed to preview and join a valid invitation.
- Require a valid opaque invite token, not a guessable general family query.
- Use a new high-entropy invite-token scheme for newly created invitations.
- Preserve legacy invite links/codes with a safe migration/rotation strategy.
- Support invitation revocation.
- Do not leak family names, member names, collection contents, or invitation metadata to non-members.

### Photo storage

- Create a private replacement storage path/bucket for family photos.
- Store photo paths rather than permanent public URLs where practical.
- Use RLS policies that permit only authorized family members to read/write the relevant family's objects.
- Generate time-limited signed URLs only after an authorization check.
- Migrate existing public photo references safely without deleting legacy records until validation succeeds.
- Ensure removed family members immediately lose image access.
- Validate file MIME type, file size, path ownership, and upload authorization server-side.

Provide a migration and rollback plan. Never drop legacy data before validated backfill and authorization testing are complete.

## 3. Secure or disable AI photo classification for App Store v1

The existing `supabase/functions/check-photo/index.ts` accepts an arbitrary `photoUrl`, uses permissive CORS, and sends images to Anthropic.

For the App Store v1 release, choose the safest option:

Preferred option: disable AI photo classification behind a feature flag and remove it from the critical upload path. Saving a car must work without it.

If retaining it:

- Accept only a verified private storage object path, never arbitrary URLs.
- Require authenticated requests.
- Verify that the caller is an authorized member of the relevant family before processing.
- Fetch the image server-side through controlled storage access.
- Restrict CORS to supported app origins; do not use wildcard CORS.
- Add rate limiting and abuse controls.
- Add explicit user-facing disclosure before an image is sent to a third-party AI provider.
- Update the privacy data inventory to include this processing.
- Never expose the Anthropic key, signed URLs, or internal error details to the client.
- Return safe, generic errors.

Do not use AI classification to block a user from saving a car.

## 4. Add account deletion and family ownership handling

Implement real in-app account deletion.

Requirements:

- Settings → Account → Delete account.
- Explain what will be removed before confirmation.
- Require deliberate final confirmation.
- A non-owner's deletion must revoke their access and remove/anonymize personal profile data according to documented rules.
- If an owner deletes their account and eligible adult members exist, offer ownership transfer first.
- If no eligible owner exists, clearly explain that deleting the owner deletes the private family collection.
- Use a secure server-side deletion path; do not rely on client-only deletes.
- Remove/revoke associated private storage objects and invitations as appropriate.
- Ensure deleted users cannot sign back in or access private collection data.
- Include loading, failure, retry, and success states.

## 5. Add minimum user-content safety controls

Because family members upload photos and stories:

- Add `Report content` to car/photo/story detail surfaces.
- Add report categories: inappropriate, harassment, copyright/privacy concern, other.
- Add an accessible confirmation state and support contact.
- Add family-admin `Remove member`.
- Revoke removed-member data access immediately.
- Add accessible Terms and community/content standards.
- Do not create public feeds, comments, direct messages, or anonymous sharing.

Create a minimal secure reports table and documented moderation process. Do not claim automatic moderation unless it truly exists.

## 6. Privacy documentation and App Store inventory

Add or update developer-facing documentation that maps every data type to:

- where it originates
- why it is used
- where it is stored
- retention/deletion behavior
- which third parties receive it
- App Store privacy-label category
- whether it is linked to identity or used for tracking

Include:

- names
- email
- family/member data
- car data
- photos
- stories
- invitation data
- analytics events
- keepsake-interest email
- Supabase
- image storage
- Sign in with Apple
- any analytics/crash SDK
- AI photo classification, if retained

Add public Privacy Policy, Terms of Use, and Support URL placeholders/configuration with clear notes for production deployment.

## 7. Build, test, and release readiness

The project currently lacks a complete quality gate.

Add appropriate scripts:

- `lint`
- `typecheck`
- `test`
- production build validation appropriate for Expo/EAS

Use the smallest practical tooling compatible with the project. Add tests for:

- anonymous session claiming to identified account
- no duplicate family/member during account claim
- family creator/member/non-member RLS behavior
- invite lookup does not reveal unauthorized family data
- valid, invalid, revoked, expired, and legacy invite handling
- private photo access for member, non-member, and removed member
- photo upload validation
- account deletion for member and owner
- ownership transfer
- report-content submission
- member removal and access revocation
- denied photo/camera permission
- offline/network failure and retry for critical flows

Also provide a manual TestFlight regression checklist covering:

- fresh install
- create family
- join family
- add/edit car and photo
- Storybook and print preview
- account claim
- account deletion
- invitation revocation
- member removal
- report content
- iPhone small/large screens
- dynamic type
- VoiceOver labels
- privacy-policy, terms, and support links

## Required final output

Provide:

1. Changed files and purpose.
2. New migration names and exact deploy order.
3. Data migration/backfill and rollback plan.
4. RLS authorization matrix.
5. Photo-storage authorization flow diagram in Markdown.
6. App Store privacy inventory.
7. Automated test results and manual regression results.
8. Any unresolved App Store risk.
9. A clear statement confirming whether the app is ready for TestFlight, not merely whether code compiles.

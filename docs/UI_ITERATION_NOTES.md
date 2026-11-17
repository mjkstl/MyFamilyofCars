# UI / UX Iteration Notes

**Read this file first if you're picking up screen layout or look-and-feel
work in a new session.** This is the companion tracker to
`docs/APP_STORE_RELEASE_PROGRESS.md`. The two tracks are independent —
release-gate work does not block UI iteration and vice versa — but both get
tracked with the same discipline: nothing is "done" until it's verified, and
nothing stays undocumented between sessions.

This track has no fixed finish line the way the release-gate phases do.
Screens get revisited multiple times as real usage surfaces what doesn't
read right on an actual phone. Expect rounds, not a single final pass.

## Ground rules (apply to every item below)

- Every screen is high-mobile-usage. Always check narrow-width (phone)
  rendering, not just desktop-width — a fix that looks right on a wide
  browser window is not verified until it's checked at phone width.
- Bolt mockups are the design source of truth where one exists for a
  screen. If a request conflicts with an existing Bolt reference, flag
  that explicitly rather than silently deviating.
- Every fix gets the same verification discipline as code fixes:
  `npx tsc --noEmit` and a real `expo export --platform web` build, plus
  a visual check (screenshot or description of what changed) — not just
  "should look fine now."
- Update the status table and Session Log below every time an item moves,
  even partially. This file is the source of truth for what's actually
  true right now, more than any conversation history.
- When closing an item, note *why* it was broken, not just that it's
  fixed — the same root cause (e.g. a component sized for one context
  reused in another) tends to recur in new screens.

## Status legend

- 🔴 Open — not yet addressed
- 🟡 In progress — partially fixed or fix unverified on a real device
- 🟢 Resolved — fixed and verified (typecheck/build + visual check)

## Known issues

| # | Screen / area | Issue | Status | Notes |
|---|---|---|---|---|
| 1 | Our Story page (`StoryCarCard.tsx` → `CollectionPhotoGallery.tsx`) | Car photo cropped, didn't render bumper-to-bumper/top-to-bottom | 🟢 Resolved | `resizeMode` changed `cover` → `contain` |
| 2 | Family Tree page — per-member thumbnails (`MemberTile.tsx`) | Same cropping issue as #1 | 🟢 Resolved | Same `resizeMode` fix applied |
| 3 | Family Tree page — Collection section placards | Car image rendered blank (no image at all), while per-member thumbnails above worked fine | 🟢 Resolved | Root cause: `CarCard` (built for the Member Edit single-card carousel, fixed-width ~82% of screen) was reused in a scrollable list context it wasn't designed for. Fixed by building a purpose-made `CollectionCarRow.tsx` instead of forcing `CarCard` into a second context. |
| 4 | General | Screens were originally designed to match Bolt reference mockups 1:1; several have since drifted through iterative fixes (navigation restructuring, tab renames, merges) and may need a fresh side-by-side pass against the original Bolt references | 🔴 Open | Not yet scoped into specific screens — flag during next design pass |
| 5 | General | No systematic phone-width visual regression check exists yet (verification so far has been typecheck/build + manual description, not an actual rendered screenshot at mobile width) | 🟡 In progress | Blocked on live Supabase credentials in the dev sandbox — see Session Log 2026-10-04. Code-level audit substituted this round; a real rendered screenshot still needs Malcolm's own environment or shared credentials. |
| 6 | Member Edit carousel (`CarCard.tsx`) | Two compounding bugs: (1) `CARD_WIDTH` was computed once at module load from `Dimensions.get('window').width`, so on web it never updated if the browser window was resized after first load; (2) the photo box was a fixed 90px tall inside a card ~82% of screen width (~307px on a typical phone) — a ~3.4:1 letterbox. `resizeMode="contain"` (already fixed from `cover`) stopped cropping, but left the car rendering tiny inside a wide, mostly-empty box. | 🟢 Resolved | Switched to `useWindowDimensions()` (reactive per render) and made the photo box a 4:3-of-card-width ratio instead of a fixed height. Verified: typecheck, lint (0 new issues), `expo export --platform web` all pass. Visual confirmation at real mobile width still pending — see #5. |
| 7 | Family Tree home (`MyTreeScreen.tsx`, `MemberTile.tsx`) | 250px logo banner and the full car list pushed family members off the first screen; member tiles laid out four fixed 63px thumbnails (270px) in a ~160px tile, spilling into the next column; custom scroll arrows | 🟡 In progress | Reworked 2026-11-16: small mark beside the family name, members first, three flexible thumbnails + "+N", arrows removed. Rendered at 390pt and 320pt from the real web build — real iPhone still pending. |
| 8 | Add Car (`AddCarScreen.tsx`) | Year/Make/Model three-across (~100px each); story hidden under "More details"; photo could not be replaced; two stacked title bars when opened from a member; errors shown via `Alert.alert` (invisible on web) | 🟡 In progress | Reworked 2026-11-16. Same verification as #7. |
| 9 | Our Story (`StoryCarCard.tsx`) | Photo gallery width was guessed from the window width and ignored the card's own padding, so photos overhung the card's right edge | 🟡 In progress | Card now measures itself and passes the exact width. Same verification as #7. |
| 10 | Member car screen (`MemberEditScreen.tsx`, `CarCard.tsx`) | Prev/next arrows floated over the card; "Fun facts coming soon" placeholder on every card (App Review risk); long stories could be cut off | 🟡 In progress | One bottom bar (Reorder, "1 of N", Add); placeholder removed; each page scrolls. Keeps the 4:3 photo box from #6. Same verification as #7. |
| 11 | Brand | Logo's cartoon cars resembled Pixar's Cars characters | 🟢 Resolved | Replaced 2026-11-16 with an original mark (a road branching into a family tree); app icon, adaptive icon, splash and favicon added. |
| 12 | All inputs | Placeholder text too faint on a real iPhone (first Expo Go test) | 🟡 In progress | 2026-11-17: new `colors.placeholder` (#64748B, 4.8:1) on all 19 inputs. Root cause: onboarding used the iOS default grey; other screens used `colors.faint` (2.6:1). Needs Malcolm's eye on the phone. |
| 13 | Add / Edit car (`AddCarScreen.tsx`) | Malcolm, 2026-11-17 (Expo Go): Year and Make should be scroll lists; Trim should sit under Model with a list; Story should be below Fun fact; "How long was it in the family?" wrong for Currently driving; "See ones like it for sale" opened Google Shopping (parts) | 🟡 In progress | Done 2026-11-17 (decisions by Malcolm): slide-up list sheets (`PickerSheet.tsx`) for Year, Make (EPA brands for that year, 1984+; curated `classicMakes.ts` otherwise; "Not listed? Type it") and Trim (EPA engine/transmission options, typing fallback); Model now prefers EPA names so Trim can match; duration question follows status (hidden for Dream car); story after the extra details; Google "All" results. Rendered at 390/320 with faked Supabase+EPA responses. NOT checked: real EPA responses (sandbox has no network to it), whether EPA allows browser requests (web build falls back to typing if not), iPhone feel. |

*(Add new rows as issues are reported. Keep resolved rows — don't delete
them — so the history of what broke and why stays visible.)*

## Session Log

*(Newest entry at the top. Each entry: date, what was reviewed/changed,
what's still open, anything discovered that changes how a screen should be
approached.)*

- **2026-11-17 — first real-iPhone feedback (Expo Go, SDK 58 branch).**
  Rows 12 and 13 added and worked. Pattern worth remembering: things that
  look fine in a desktop browser (placeholder grey, typing a year) read
  very differently on a phone. Also fixed in edit mode: clearing trim,
  color, story or fun fact now really clears it (empty fields used to be
  sent as `undefined`, which the update silently skipped).

- **2026-11-16** — Two UI rounds in one session (items #7–#11). Added a
  shared token file (`src/theme/tokens.ts`) so colour, spacing and type
  come from one place; new or reworked screens should import from it.
  **Item #5 is now partly answered:** screens were rendered at 390pt and
  320pt from the real `expo export` web build, driven by a headless
  browser with Supabase and NHTSA responses stubbed and sample data — a
  real rendered check, but with stand-in data and not on a physical
  phone. Screens not yet restyled: keepsake preview, the two member
  pop-ups, car reordering, onboarding (logo only). Bolt mockups were not
  consulted this session (not available in the sandbox) — item #4 stays
  open. Merge note: the 2026-10-04 `CarCard` fix (#6) landed on GitHub
  but had never been pulled locally; its 4:3 photo box is preserved in
  the reworked card.

- **2026-10-04 (continued)** — Audited every photo-rendering component in
  the app (`CarCard.tsx`, `CollectionCarRow.tsx`, `MemberTile.tsx`,
  `CollectionPhotoGallery.tsx`/`StoryCarCard.tsx`) for the same class of
  bug that caused #1–#3: a sizing box built for one context reused
  somewhere it doesn't fit. Found and fixed a real one in `CarCard.tsx`
  (item #6 — see table): a module-load-time `Dimensions.get` call that
  never updated on web window resize, plus a disproportionate fixed-
  height photo box that made car photos render tiny once cropping was
  already fixed. Verified via typecheck/lint/build, all passing.
  **Discovered blocker for #5 (real visual verification):** this dev
  sandbox has no Supabase credentials (`.env` is gitignored, no
  `.env.example` exists), so the live app can't actually be run here —
  it would show the "missing config" error screen, not real screens with
  real car photos. A genuine phone-width screenshot check needs either
  (a) Malcolm running it locally and sharing screenshots, or (b) a safe
  way to share read-only Supabase credentials into this environment, or
  (c) a seeded local/test Supabase project dedicated to this kind of
  verification. Flagging rather than claiming a visual check that didn't
  actually happen.
- **2026-10-04** — File created to formalize UI/UX iteration as its own
  tracked workstream, separate from the App Store release-gate phases.
  Backfilled known-issue history (#1–#3) from prior session work, both
  already resolved and verified via typecheck/build at the time. Added
  #4 and #5 as open follow-ups: a fresh Bolt-reference comparison pass,
  and a real phone-width visual verification step, neither of which has
  been done systematically yet. No screen work done in this entry beyond
  creating the tracker.

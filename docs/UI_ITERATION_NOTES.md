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
| 5 | General | No systematic phone-width visual regression check exists yet (verification so far has been typecheck/build + manual description, not an actual rendered screenshot at mobile width) | 🔴 Open | Consider adding a lightweight visual check step before claiming a layout fix is done |

*(Add new rows as issues are reported. Keep resolved rows — don't delete
them — so the history of what broke and why stays visible.)*

## Session Log

*(Newest entry at the top. Each entry: date, what was reviewed/changed,
what's still open, anything discovered that changes how a screen should be
approached.)*

- **2026-10-04** — File created to formalize UI/UX iteration as its own
  tracked workstream, separate from the App Store release-gate phases.
  Backfilled known-issue history (#1–#3) from prior session work, both
  already resolved and verified via typecheck/build at the time. Added
  #4 and #5 as open follow-ups: a fresh Bolt-reference comparison pass,
  and a real phone-width visual verification step, neither of which has
  been done systematically yet. No screen work done in this entry beyond
  creating the tracker.

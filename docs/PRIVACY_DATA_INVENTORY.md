# Privacy data inventory (DRAFT)

**Release-gate Phase 9. Drafted 2026-11-17 from the code as it is today.**
Re-check every row after Phases 2B, 5, 6 and 7 — each changes a data flow.
The last two columns are what to enter in App Store Connect → App Privacy.
"Linked" = tied to the person's identity. Nothing below is used for
tracking (no ad SDKs, no data brokers, no cross-app identifiers).

| Data | Where it comes from | Why | Stored in | Kept until | Third parties | App Store category | Linked? |
|---|---|---|---|---|---|---|---|
| Display names of the user and relatives; relationships | Typed by a family member | Family tree | Supabase `members` | Deletion request (Phase 6: in-app) | Supabase | Contact Info → Name | Yes |
| Family name | Typed | Label the family | Supabase `families` | Family deleted | Supabase | User Content → Other | Yes |
| Cars: year, make, model, color, trim, nickname, status, duration | Typed / picked | Collection | Supabase `cars`, `items` | Car or family deleted | Supabase | User Content → Other | Yes |
| Stories and fun facts | Typed | Storybook | Supabase `cars.memories`, `fun_fact` | Car or family deleted | Supabase | User Content → Other | Yes |
| Photos (cars, optional profile photo) | Photo library, chosen by the user | Shown to family | Supabase Storage `car-photos` (**public bucket today — Phase 2B**) | Deletion request | Supabase | User Content → Photos or Videos | Yes |
| Anonymous sign-in id | Created automatically | Privacy rules, ownership | Supabase Auth; device storage | Account deleted | Supabase | Identifiers → User ID | Yes |
| Invite token / legacy code | Generated | Let relatives join | Supabase `families` | Reset or family deleted | Supabase | (not a listed type) | — |
| Email address | Typed, only in the keepsake-interest form, with consent tick | Notify about printed keepsakes | Supabase `keepsake_interest` | Deletion request | Supabase | Contact Info → Email Address (purpose: Product Personalization / Developer's Advertising or Marketing) | Yes |
| Usage events (`family_created`, `invite_opened`, …) with family id; no entry content | App | Understand feature use | Supabase `analytics_events` | Not yet defined — **set a retention period** | Supabase | Usage Data → Product Interaction (purpose: Analytics) | Yes (family id) |
| Referral partner / campaign code from the link | URL | Credit a partner | Supabase `referral_attributions` | Family deleted | Supabase | Usage Data → Advertising Data? **confirm** | Yes |
| Make text + model year | Typed in Add Car | Suggestions | Not stored by NHTSA lookup | — | NHTSA vPIC (US government API) | Not collected (not linked, transient) | No |
| Car search terms | Tapped link-outs | Find a photo / cars for sale | Not stored | — | Google (in the user's browser) | Not collected by the app | No |

## Not collected

Precise or coarse location, contacts, health, financial or payment data,
browsing history, advertising identifiers, crash/diagnostic SDK data.
Camera and photo-library permission strings exist in `app.json`; only
the photo library is used today.

## AI processing

Photo classification by a third-party AI provider exists in code
(`supabase/functions/check-photo`) but is **off** behind
`featureFlags.aiPhotoClassificationEnabled`. While off, no photo is sent.
If it is ever turned on, add a row here and disclose it in the Privacy
Policy first.

## Open questions before submission

1. Retention period for `analytics_events`.
2. Whether `analytics_events` should stop storing `family_id` (would make
   usage data "not linked").
3. Camera permission: remove `NSCameraUsageDescription` / `CAMERA` if the
   camera is never opened, or add a "Take photo" option.
4. Age rating answers (user-generated content: yes, private to family).
5. Where deletion requests are logged and who actions them until Phase 6.

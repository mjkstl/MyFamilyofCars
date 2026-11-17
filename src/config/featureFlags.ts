/**
 * Feature flags — simple on/off switches for features that exist in the
 * code but should not run in the released app yet.
 *
 * RELEASE-GATE TRACK (Phase 3 in docs/APP_STORE_RELEASE_PROGRESS.md).
 */
export const featureFlags = {
  /**
   * AI photo classification (the check-photo Supabase Edge Function,
   * which sends an uploaded image to a third-party AI provider).
   *
   * OFF for App Store v1. While this is false the app makes NO network
   * call to check-photo at all, so no photo leaves Supabase. Turning it
   * back on requires (a) hardening the Edge Function per the release
   * brief §3 and (b) disclosing the processing in the Privacy Policy and
   * App Store privacy labels first.
   */
  aiPhotoClassificationEnabled: false,
} as const;

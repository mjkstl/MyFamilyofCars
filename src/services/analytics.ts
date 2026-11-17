import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { PARTNERS } from '@/config/partners';

export type AnalyticsEvent =
  | 'family_created'
  | 'first_car_saved'
  | 'first_story_saved'
  | 'invite_opened'
  | 'invite_accepted'
  | 'storybook_opened'
  | 'print_preview_opened'
  | 'keepsake_interest_opened'
  | 'keepsake_interest_submitted'
  | 'referral_attributed'
  | 'activation_completed';

type SafeProperties = Record<string, string | number | boolean | null>;

/**
 * Analytics is best-effort and must NEVER break the action it describes.
 * It runs after the real work (family created, car saved…) has already
 * succeeded, so a failure here used to show the user an error for
 * something that had actually worked. Returns whether the event was saved;
 * never throws.
 */
export async function trackEvent(eventName: AnalyticsEvent, properties: SafeProperties = {}, familyId?: string | null): Promise<boolean> {
  try {
    const { error } = await supabase.from('analytics_events').insert({
      event_name: eventName,
      family_id: familyId ?? null,
      properties,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    if (__DEV__) console.warn(`[analytics] ${eventName} not recorded:`, error);
    return false;
  }
}

export function getReferralFromUrl(): { sourceType: 'referral_code' | 'url_parameter'; partnerId: string | null; campaignId: string | null } | null {
  // Web only. On iOS/Android `window` exists but `window.location` does
  // not, so the old `typeof window` check let this read
  // `undefined.search` and crash "Create" on a real iPhone.
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location) return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref')?.trim().toLowerCase();
  const campaign = params.get('campaign')?.trim().slice(0, 80) || null;
  if (!code && !campaign) return null;
  return { sourceType: code ? 'referral_code' : 'url_parameter', partnerId: code || null, campaignId: campaign };
}

/** Best-effort, like trackEvent: never throws. */
export async function recordReferralAttribution(familyId: string): Promise<boolean> {
  try {
    return await saveReferralAttribution(familyId);
  } catch (error) {
    if (__DEV__) console.warn('[analytics] referral attribution not recorded:', error);
    return false;
  }
}

async function saveReferralAttribution(familyId: string): Promise<boolean> {
  const referral = getReferralFromUrl();
  if (!referral) return false;
  const partner = referral.partnerId ? PARTNERS.find((item) => item.code === referral.partnerId && item.active) : null;
  if (referral.partnerId && !partner) return false;
  const { error } = await supabase.from('referral_attributions').upsert({
    family_id: familyId,
    source_type: referral.sourceType,
    partner_id: partner?.id ?? null,
    campaign_id: referral.campaignId,
    first_seen_at: new Date().toISOString(),
    conversion_milestones: {},
  }, { onConflict: 'family_id', ignoreDuplicates: true });
  if (error) throw error;
  await trackEvent('referral_attributed', { source_type: referral.sourceType, has_partner: Boolean(partner), has_campaign: Boolean(referral.campaignId) }, familyId);
  return true;
}

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

export async function trackEvent(eventName: AnalyticsEvent, properties: SafeProperties = {}, familyId?: string | null) {
  const { error } = await supabase.from('analytics_events').insert({
    event_name: eventName,
    family_id: familyId ?? null,
    properties,
  });
  if (error) throw error;
}

export function getReferralFromUrl(): { sourceType: 'referral_code' | 'url_parameter'; partnerId: string | null; campaignId: string | null } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref')?.trim().toLowerCase();
  const campaign = params.get('campaign')?.trim().slice(0, 80) || null;
  if (!code && !campaign) return null;
  return { sourceType: code ? 'referral_code' : 'url_parameter', partnerId: code || null, campaignId: campaign };
}

export async function recordReferralAttribution(familyId: string) {
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

import { featureFlags } from '@/config/featureFlags';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_IS_PLACEHOLDER } from '@/config/legal';

describe('release guards', () => {
  it('keeps AI photo classification OFF for App Store v1 (Phase 3)', () => {
    // If this fails, someone turned the flag on. Do not "fix" the test —
    // turning it on requires hardening the Edge Function and disclosing
    // the processing in the Privacy Policy first.
    expect(featureFlags.aiPhotoClassificationEnabled).toBe(false);
  });

  it('flags a placeholder support email consistently', () => {
    expect(SUPPORT_EMAIL_IS_PLACEHOLDER).toBe(SUPPORT_EMAIL.includes('NOT_SET'));
  });
});

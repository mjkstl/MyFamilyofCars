/**
 * Regression tests for the first real-iPhone test (2026-11-17): tapping
 * "Create" showed "Cannot read property 'search' of undefined" even
 * though the family had been saved. Two causes, both covered here:
 *  1. getReferralFromUrl read window.location.search on iOS, where
 *     `window` exists but `window.location` does not.
 *  2. Analytics errors were re-thrown, so a failed analytics write was
 *     reported to the user as a failed "Create".
 */
import { getReferralFromUrl, recordReferralAttribution, trackEvent } from '@/services/analytics';

// jest.mock calls are hoisted above imports by babel-jest, so this mock
// is in place before analytics.ts loads.
const mockInsert = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => (table === 'referral_attributions' ? { upsert: mockUpsert } : { insert: mockInsert }),
  },
}));

describe('analytics never breaks the action it records', () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockUpsert.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('getReferralFromUrl returns null on iOS even though `window` exists without `location`', () => {
    // jest-expo's default platform is iOS, like Expo Go on an iPhone.
    expect(typeof window).not.toBe('undefined');
    expect(() => getReferralFromUrl()).not.toThrow();
    expect(getReferralFromUrl()).toBeNull();
  });

  it('recordReferralAttribution resolves false on iOS and writes nothing', async () => {
    await expect(recordReferralAttribution('family-1')).resolves.toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('trackEvent resolves true when the event is saved', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await expect(trackEvent('family_created', {}, 'family-1')).resolves.toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({ event_name: 'family_created', family_id: 'family-1', properties: {} });
  });

  it('trackEvent resolves false (does not throw) when the database refuses the event', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'row-level security policy' } });
    await expect(trackEvent('family_created', {}, 'family-1')).resolves.toBe(false);
  });

  it('trackEvent resolves false (does not throw) when the network call itself fails', async () => {
    mockInsert.mockRejectedValue(new Error('offline'));
    await expect(trackEvent('first_car_saved', {})).resolves.toBe(false);
  });
});

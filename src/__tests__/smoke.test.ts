/**
 * Smoke test only — proves the jest-expo runner is correctly wired for
 * Phase 1 of the App Store release gate. Real feature tests (account
 * claim, RLS behavior, invite handling, etc.) are added in Phase 10,
 * once those features exist. See docs/APP_STORE_RELEASE_PROGRESS.md.
 */
describe('test runner smoke test', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});

import { buildInviteMessage, buildInviteUrl, getInviteTokenFromUrl } from '@/utils/inviteLink';

describe('invite links', () => {
  const token = 'a3f9c1d27b8e4f60912cdd4e7a51b3c88f02e6d47a9b1c35';

  it('builds a link that carries the token', () => {
    expect(buildInviteUrl(token)).toBe(`https://my-familyof-cars.vercel.app/?invite=${token}`);
  });

  it('puts the link (not a bare code) in the share message', () => {
    expect(buildInviteMessage(token)).toContain(buildInviteUrl(token));
  });

  it('returns null off the web, where there is no address bar', () => {
    // jest-expo's default platform is iOS.
    expect(getInviteTokenFromUrl()).toBeNull();
  });
});

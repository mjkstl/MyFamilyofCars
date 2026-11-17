/**
 * Legal + support settings — the ONE place these values live.
 * RELEASE-GATE TRACK (Phase 4 in docs/APP_STORE_RELEASE_PROGRESS.md).
 *
 * BEFORE RELEASE, Malcolm must:
 *   1. Replace SUPPORT_EMAIL with a real, monitored address. The same
 *      address must be typed into public/privacy.html, public/terms.html
 *      and public/support.html (search those files for "SUPPORT_EMAIL").
 *   2. Have the policy and terms text reviewed — they are drafts.
 * The App Store listing needs the three URLs below exactly as written.
 */
const SITE = 'https://my-familyof-cars.vercel.app';

/** True until a real support address is filled in. Settings shows a
 * visible warning while this is true so it cannot ship by accident. */
export const SUPPORT_EMAIL = 'SUPPORT_EMAIL_NOT_SET@example.com';
export const SUPPORT_EMAIL_IS_PLACEHOLDER = SUPPORT_EMAIL.startsWith('SUPPORT_EMAIL_NOT_SET');

export const LEGAL = {
  appName: 'My Family of Cars',
  privacyUrl: `${SITE}/privacy.html`,
  termsUrl: `${SITE}/terms.html`,
  supportUrl: `${SITE}/support.html`,
  lastUpdated: '2026-11-17',
} as const;

export function supportMailto(subject: string, body = ''): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
}

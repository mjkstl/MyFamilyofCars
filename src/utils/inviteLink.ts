import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Everything about turning a family's invite token into something a
 * person can send — kept in ONE place so the Family Tree invite sheet
 * and the "car saved" screen can never drift apart again. (They did
 * once: the saved screen kept sharing the legacy `invite_code`, which is
 * null after an invite is rotated, so its button silently did nothing.)
 */
const WEB_APP_URL = 'https://my-familyof-cars.vercel.app';

export function buildInviteUrl(inviteToken: string): string {
  return `${WEB_APP_URL}/?invite=${encodeURIComponent(inviteToken)}`;
}

export function buildInviteMessage(inviteToken: string): string {
  return `Join our family on My Family of Cars and add the cars you've owned: ${buildInviteUrl(inviteToken)}`;
}

/**
 * Web only: reads `?invite=...` from the address bar so someone who taps
 * an invite link lands on "Join a family" with the code already filled
 * in, instead of having to copy and paste a 48-character token.
 * Returns null on native (no address bar) or when the link has no invite.
 */
export function getInviteTokenFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const token = new URLSearchParams(window.location.search).get('invite')?.trim().toLowerCase();
    // Tokens are hex (new scheme) or short alphanumeric (legacy code).
    // Reject anything else rather than pre-filling arbitrary URL text.
    return token && /^[a-z0-9]{6,64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

export type ShareInviteResult = 'shared' | 'copied' | 'dismissed';

/**
 * Opens the system share sheet with the invite message. Desktop browsers
 * often have no share sheet at all (Share.share rejects there), so this
 * falls back to copying the link and tells the caller which one happened
 * so the UI can say "Link copied" instead of appearing to do nothing.
 */
export async function shareInvite(inviteToken: string): Promise<ShareInviteResult> {
  const message = buildInviteMessage(inviteToken);
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch (err) {
    // The person closing the browser share sheet is not an error.
    if (err instanceof Error && err.name === 'AbortError') return 'dismissed';
    await Clipboard.setStringAsync(buildInviteUrl(inviteToken));
    return 'copied';
  }
}

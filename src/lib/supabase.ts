import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * If these are missing, we deliberately do NOT throw here. A throw at
 * module-load time happens before React ever mounts — in the Expo dev
 * server that's caught and shown as a helpful red error overlay, but in
 * a production build (e.g. deployed to Vercel) there is no such overlay:
 * the crash is silent and the result is a blank page with zero
 * indication of what went wrong. Instead, we surface this as a value
 * that App.tsx checks and renders as a clear, visible on-screen message.
 */
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'If you\u2019re running locally, copy .env.example to .env and fill in your Supabase project values, ' +
      'then restart the dev server (env vars are read at bundle time). ' +
      'If this is a deployed build, check that both variables are set for the Production environment ' +
      'in your hosting provider\u2019s dashboard, not just Development/Preview.'
    : null;

// createClient validates its arguments and would itself throw on empty
// strings, which would reintroduce the exact silent-crash problem above.
// When config is missing, pass harmless placeholder values instead — the
// app never actually uses this client for real requests in that case,
// since App.tsx renders the config-error screen before RootNavigator
// (and anything that would call supabase.*) ever mounts.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Ensures there's a signed-in (anonymous) Supabase auth session.
 * Phase 1 has no login wall, so every device gets an anonymous auth.uid()
 * the first time it opens the app; that uid is what RLS policies key off.
 *
 * This is deliberately deduped via a module-level in-flight promise.
 * Without this, two callers firing at nearly the same time (e.g. React 18
 * StrictMode double-invoking the mount effect in dev, or a screen mounting
 * while a background refresh is in flight) can each see "no session yet"
 * and both call signInAnonymously(), creating two different anonymous
 * auth.users rows. Whichever sign-in resolves last silently becomes the
 * client's active session — so code holding a reference to the "loser"
 * session's user.id can end up sending a user_id that no longer matches
 * the auth.uid() actually attached to later requests, which surfaces as
 * a confusing 403 "row-level security policy" error even though the
 * policy and the token are each individually correct.
 */
let inFlightSessionRequest: Promise<Session | null> | null = null;

export async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  if (inFlightSessionRequest) {
    return inFlightSessionRequest;
  }

  inFlightSessionRequest = (async () => {
    try {
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return signInData.session;
    } finally {
      inFlightSessionRequest = null;
    }
  })();

  return inFlightSessionRequest;
}

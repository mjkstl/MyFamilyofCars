import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostgrestError } from '@supabase/supabase-js';
import { ensureAnonymousSession, supabase } from '@/lib/supabase';
import type { Family, Member } from '@/types/database';

const STORAGE_KEYS = {
  familyId: 'familyofcars.familyId',
  memberId: 'familyofcars.memberId',
} as const;

/**
 * Wraps a Supabase/PostgREST error with the real code and details visible,
 * e.g. "adding you as the first member failed (42501): new row violates
 * row-level security policy for table "members"". A generic
 * "something went wrong" message is what turned a config problem into an
 * hours-long DevTools investigation last time — this makes the actual
 * cause visible on screen the moment it happens, every time.
 */
function toDescriptiveError(pgErr: PostgrestError, action: string): Error {
  const codePart = pgErr.code ? ` (${pgErr.code})` : '';
  const hintPart = pgErr.hint ? ` Hint: ${pgErr.hint}` : '';
  const detailsPart = pgErr.details ? ` Details: ${pgErr.details}` : '';
  return new Error(`${action} failed${codePart}: ${pgErr.message}.${hintPart}${detailsPart}`);
}

interface FamilyState {
  loading: boolean;
  family: Family | null;
  currentMember: Member | null;
  error: string | null;
}

export function useFamily() {
  const [state, setState] = useState<FamilyState>({
    loading: true,
    family: null,
    currentMember: null,
    error: null,
  });

  const loadPersisted = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await ensureAnonymousSession();
      const [familyId, memberId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.familyId),
        AsyncStorage.getItem(STORAGE_KEYS.memberId),
      ]);

      if (!familyId || !memberId) {
        setState({ loading: false, family: null, currentMember: null, error: null });
        return;
      }

      const [{ data: family, error: famErr }, { data: member, error: memErr }] = await Promise.all([
        supabase.from('families').select('*').eq('id', familyId).single(),
        supabase.from('members').select('*').eq('id', memberId).single(),
      ]);

      if (famErr || memErr) throw famErr ?? memErr;

      setState({ loading: false, family: family as Family, currentMember: member as Member, error: null });
    } catch (err) {
      setState({
        loading: false,
        family: null,
        currentMember: null,
        error: err instanceof Error ? err.message : 'Failed to load family.',
      });
    }
  }, []);

  useEffect(() => {
    loadPersisted();
  }, [loadPersisted]);

  const createFamily = useCallback(async (familyName: string, yourDisplayName: string) => {
    const session = await ensureAnonymousSession();
    if (!session) throw new Error('No auth session.');

    const { data: family, error: famErr } = await supabase
      .from('families')
      .insert({ name: familyName, created_by: session.user.id })
      .select()
      .single();
    if (famErr) throw toDescriptiveError(famErr, 'creating the family');

    // Re-confirm the session immediately before this insert rather than
    // reusing the `session` captured above. If a background token refresh
    // (or a second ensureAnonymousSession caller) swapped the active
    // session in between these two awaited calls, this guarantees the
    // user_id we send here matches the auth.uid() the request will
    // actually carry, instead of a possibly-stale value.
    const freshSession = await ensureAnonymousSession();
    if (!freshSession) throw new Error('No auth session.');

    const { data: member, error: memErr } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        display_name: yourDisplayName,
        relationship: 'Me',
        user_id: freshSession.user.id,
      })
      .select()
      .single();
    if (memErr) throw toDescriptiveError(memErr, 'adding you as the first member');

    await AsyncStorage.setItem(STORAGE_KEYS.familyId, family.id);
    await AsyncStorage.setItem(STORAGE_KEYS.memberId, member.id);
    setState({ loading: false, family: family as Family, currentMember: member as Member, error: null });
    return { family: family as Family, member: member as Member };
  }, []);

  const joinFamily = useCallback(async (inviteCode: string, yourDisplayName: string) => {
    const session = await ensureAnonymousSession();
    if (!session) throw new Error('No auth session.');

    const { data: family, error: famErr } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single();
    if (famErr || !family) throw new Error('Invite code not found — double-check it and try again.');

    const freshSession = await ensureAnonymousSession();
    if (!freshSession) throw new Error('No auth session.');

    const { data: member, error: memErr } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        display_name: yourDisplayName,
        user_id: freshSession.user.id,
      })
      .select()
      .single();
    if (memErr) throw toDescriptiveError(memErr, 'adding you to the family');

    await AsyncStorage.setItem(STORAGE_KEYS.familyId, family.id);
    await AsyncStorage.setItem(STORAGE_KEYS.memberId, member.id);
    setState({ loading: false, family: family as Family, currentMember: member as Member, error: null });
    return { family: family as Family, member: member as Member };
  }, []);

  return { ...state, createFamily, joinFamily, refresh: loadPersisted };
}

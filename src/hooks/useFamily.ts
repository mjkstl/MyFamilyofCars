import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAnonymousSession, supabase } from '@/lib/supabase';
import type { Family, Member } from '@/types/database';

const STORAGE_KEYS = {
  familyId: 'familyofcars.familyId',
  memberId: 'familyofcars.memberId',
} as const;

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
    if (famErr) throw famErr;

    const { data: member, error: memErr } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        display_name: yourDisplayName,
        relationship: 'Me',
        user_id: session.user.id,
      })
      .select()
      .single();
    if (memErr) throw memErr;

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

    const { data: member, error: memErr } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        display_name: yourDisplayName,
        user_id: session.user.id,
      })
      .select()
      .single();
    if (memErr) throw memErr;

    await AsyncStorage.setItem(STORAGE_KEYS.familyId, family.id);
    await AsyncStorage.setItem(STORAGE_KEYS.memberId, member.id);
    setState({ loading: false, family: family as Family, currentMember: member as Member, error: null });
    return { family: family as Family, member: member as Member };
  }, []);

  return { ...state, createFamily, joinFamily, refresh: loadPersisted };
}

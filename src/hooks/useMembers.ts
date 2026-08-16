import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member, ParentLinkConfidence } from '@/types/database';
import { inferParentLink } from '@/utils/relationshipInference';

export function useMembers(familyId: string | undefined) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });
    if (err) setError(err.message);
    else setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Adds a new member, using relationship-term + name inference to suggest
   * (but not silently commit) a parent_member_id link. Returns the
   * inference result so the UI can show a one-tap confirm, or a manual
   * picker when confidence is low.
   */
  const addMemberWithInference = useCallback(
    async (params: {
      displayName: string;
      relationshipLabel: string;
      referenceName?: string;
      enteredByMemberId: string | null;
    }) => {
      if (!familyId) throw new Error('No family loaded.');

      const inference = inferParentLink(
        params.relationshipLabel,
        params.referenceName,
        members,
        params.enteredByMemberId
      );

      const { data, error: err } = await supabase
        .from('members')
        .insert({
          family_id: familyId,
          display_name: params.displayName,
          relationship: params.relationshipLabel,
          parent_member_id: inference.confidence === 'high' ? inference.suggestedParent?.id ?? null : null,
          parent_link_confidence: inference.confidence,
          // High-confidence links still wait for the user's tap in the UI
          // before being marked confirmed — insert defaults to false.
          parent_link_confirmed: false,
        })
        .select()
        .single();

      if (err) throw err;
      await refresh();
      return { member: data as Member, inference };
    },
    [familyId, members, refresh]
  );

  const confirmParentLink = useCallback(
    async (memberId: string, parentMemberId: string | null, confidence: ParentLinkConfidence) => {
      const { error: err } = await supabase
        .from('members')
        .update({
          parent_member_id: parentMemberId,
          parent_link_confidence: confidence,
          parent_link_confirmed: true,
        })
        .eq('id', memberId);
      if (err) throw err;
      await refresh();
    },
    [refresh]
  );

  return { members, loading, error, refresh, addMemberWithInference, confirmParentLink };
}

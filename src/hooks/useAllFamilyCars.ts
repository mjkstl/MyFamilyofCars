import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Car } from '@/types/database';

export interface FamilyCar extends Car {
  member_display_name: string;
}

/**
 * All cars belonging to any member of a family, for the "whole family"
 * poster share. Relies on the same RLS policy as useCars (family
 * membership via the owning member row).
 */
export function useAllFamilyCars(familyId: string | undefined) {
  const [cars, setCars] = useState<FamilyCar[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cars')
      .select('*, members!inner(display_name, family_id)')
      .eq('members.family_id', familyId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setCars(
        data.map((row: any) => ({
          ...row,
          member_display_name: row.members?.display_name ?? 'Family',
        }))
      );
    }
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cars, loading, refresh };
}

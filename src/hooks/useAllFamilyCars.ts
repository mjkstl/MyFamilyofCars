import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Car, ItemPhoto, Member } from '@/types/database';

export interface FamilyCar extends Car {
  member_display_name: string;
  photos: ItemPhoto[];
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
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, display_name')
      .eq('family_id', familyId);
    if (membersError || !members?.length) {
      setCars([]);
      setLoading(false);
      return;
    }

    const memberNames = new Map((members as Pick<Member, 'id' | 'display_name'>[]).map((member) => [member.id, member.display_name]));
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .in('member_id', members.map((member) => member.id))
      .order('created_at', { ascending: true });

    if (!error && data) {
      const itemIds = data.map((car) => car.item_id).filter((itemId): itemId is string => !!itemId);
      const { data: photoRows } = itemIds.length
        ? await supabase.from('item_photos').select('*').in('item_id', itemIds).order('order_index', { ascending: true })
        : { data: [] };
      const photosByItem = new Map<string, ItemPhoto[]>();
      (photoRows ?? []).forEach((photo) => {
        const current = photosByItem.get(photo.item_id) ?? [];
        current.push(photo as ItemPhoto);
        photosByItem.set(photo.item_id, current);
      });
      setCars(data.map((car) => ({
        ...(car as Car),
        member_display_name: memberNames.get(car.member_id) ?? 'Family',
        photos: photosByItem.get(car.item_id ?? '') ?? (
          car.photo_url ? [{
            id: `${car.id}-legacy-photo`,
            item_id: car.item_id ?? '',
            url: car.photo_url,
            caption: null,
            order_index: 0,
            created_at: car.created_at,
          }] : []
        ),
      })));
    }
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cars, loading, refresh };
}

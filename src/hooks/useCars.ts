import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Car, CarInsert } from '@/types/database';

export function useCars(memberId: string | undefined) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cars')
      .select('*')
      .eq('member_id', memberId)
      .order('order_index', { ascending: true });
    if (err) setError(err.message);
    else setCars((data ?? []) as Car[]);
    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Uploads a local photo URI to Storage and returns its public URL. */
  const uploadPhoto = useCallback(async (localUri: string, carId: string): Promise<string> => {
    const response = await fetch(localUri);
    if (!response.ok) throw new Error(`Could not read the selected photo (${response.status}).`);
    const imageData = await response.arrayBuffer();
    const path = `${carId}/${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('car-photos')
      .upload(path, imageData, { contentType: 'image/jpeg', upsert: true });
    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from('car-photos').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  /**
   * Calls the check-photo Edge Function to classify whether the uploaded
   * image contains a vehicle. Never hard-blocks on failure — degrades to
   * 'pending' so a flaky network call doesn't stop someone from saving
   * their car.
   */
  const runPhotoQualityCheck = useCallback(async (photoUrl: string): Promise<'approved' | 'flagged' | 'pending'> => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('check-photo', {
        body: { photoUrl },
      });
      if (fnErr) return 'pending';
      if (data?.isVehicle === true && (data?.confidence ?? 0) >= 0.7) return 'approved';
      if (data?.isVehicle === false && (data?.confidence ?? 0) >= 0.7) return 'flagged';
      return 'pending';
    } catch {
      return 'pending';
    }
  }, []);

  const addCar = useCallback(
    async (input: Omit<CarInsert, 'member_id'>, localPhotoUri?: string) => {
      if (!memberId) throw new Error('No member selected.');

      const { data: inserted, error: insertErr } = await supabase
        .from('cars')
        .insert({ ...input, member_id: memberId })
        .select()
        .single();
      if (insertErr) throw insertErr;

      let car = inserted as Car;

      if (localPhotoUri) {
        const photoUrl = await uploadPhoto(localPhotoUri, car.id);
        const qualityStatus = await runPhotoQualityCheck(photoUrl);

        const { data: updated, error: updateErr } = await supabase
          .from('cars')
          .update({ photo_url: photoUrl, photo_quality_status: qualityStatus })
          .eq('id', car.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        car = updated as Car;
      }

      await refresh();
      return car;
    },
    [memberId, refresh, uploadPhoto, runPhotoQualityCheck]
  );

  const updateCar = useCallback(
    async (carId: string, changes: Partial<Car>, localPhotoUri?: string) => {
      let photoPatch: Partial<Car> = {};
      if (localPhotoUri) {
        const photoUrl = await uploadPhoto(localPhotoUri, carId);
        const qualityStatus = await runPhotoQualityCheck(photoUrl);
        photoPatch = { photo_url: photoUrl, photo_quality_status: qualityStatus };
      }

      const { data, error: updateErr } = await supabase
        .from('cars')
        .update({ ...changes, ...photoPatch })
        .eq('id', carId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      await refresh();
      return data as Car;
    },
    [refresh, uploadPhoto, runPhotoQualityCheck]
  );

  const deleteCar = useCallback(async (carId: string) => {
    const { error: deleteErr } = await supabase.from('cars').delete().eq('id', carId);
    if (deleteErr) throw deleteErr;
    await refresh();
  }, [refresh]);

  return { cars, loading, error, refresh, addCar, updateCar, deleteCar };
}

import { supabase } from '@/lib/supabase';
import type { Car, Collection, Family, Item, ItemPerson, ItemPhoto, Member } from '@/types/database';

export interface AuthorizedCollectionExport {
  exported_at: string;
  family: Pick<Family, 'id' | 'name' | 'created_at'>;
  people: Member[];
  collections: Array<{
    collection: Collection;
    items: Array<{
      item: Item;
      car: Car | null;
      photos: ItemPhoto[];
      people: ItemPerson[];
    }>;
  }>;
}

/**
 * Reads only through Supabase's authenticated client/RLS path. This is
 * intentionally a serialization boundary so a future print/export surface
 * does not couple itself to screen-specific query shapes.
 */
export async function exportAuthorizedFamilyCollection(familyId: string): Promise<AuthorizedCollectionExport> {
  const [{ data: family, error: familyError }, { data: people, error: peopleError }, { data: collections, error: collectionsError }] =
    await Promise.all([
      supabase.from('families').select('id, name, created_at').eq('id', familyId).single(),
      supabase.from('members').select('*').eq('family_id', familyId).order('created_at', { ascending: true }),
      supabase.from('collections').select('*').eq('family_id', familyId).order('created_at', { ascending: true }),
    ]);

  if (familyError) throw familyError;
  if (peopleError) throw peopleError;
  if (collectionsError) throw collectionsError;
  if (!family || !collections) throw new Error('Family export is unavailable.');

  const collectionIds = collections.map((collection) => collection.id);
  const [{ data: items, error: itemsError }, { data: cars, error: carsError }] = await Promise.all([
    collectionIds.length
      ? supabase.from('items').select('*').in('collection_id', collectionIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('cars').select('*').in('member_id', (people ?? []).map((person) => person.id)),
  ]);
  if (itemsError) throw itemsError;
  if (carsError) throw carsError;

  const itemIds = (items ?? []).map((item) => item.id);
  const [{ data: photos, error: photosError }, { data: itemPeople, error: itemPeopleError }] = await Promise.all([
    itemIds.length
      ? supabase.from('item_photos').select('*').in('item_id', itemIds).order('order_index', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase.from('item_people').select('*').in('item_id', itemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (photosError) throw photosError;
  if (itemPeopleError) throw itemPeopleError;

  const carByItemId = new Map((cars ?? []).map((car) => [(car as Car).item_id, car as Car]));
  return {
    exported_at: new Date().toISOString(),
    family: family as Pick<Family, 'id' | 'name' | 'created_at'>,
    people: (people ?? []) as Member[],
    collections: (collections as Collection[]).map((collection) => ({
      collection,
      items: (items as Item[]).filter((item) => item.collection_id === collection.id).map((item) => ({
        item,
        car: carByItemId.get(item.id) ?? null,
        photos: (photos ?? []).filter((photo) => photo.item_id === item.id) as ItemPhoto[],
        people: (itemPeople ?? []).filter((person) => person.item_id === item.id) as ItemPerson[],
      })),
    })),
  };
}

-- Keep the generic item relationship aligned when a car is reassigned.
-- Cars remain the source of truth for the vehicle's connected member.
create or replace function public.sync_car_collection_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  family_uuid uuid;
  collection_uuid uuid;
  item_uuid uuid;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select family_id into family_uuid from public.members where id = new.member_id;
  insert into public.collections (family_id, type, name, visibility, created_by)
  select family_uuid, 'cars', 'Cars', 'private', f.created_by
  from public.families f
  where f.id = family_uuid
  on conflict (family_id, type) do nothing;

  select id into collection_uuid
  from public.collections
  where family_id = family_uuid and type = 'cars';

  if new.item_id is null then
    insert into public.items (collection_id, title, story, created_at, updated_at)
    values (collection_uuid, new.year || ' ' || new.make || ' ' || new.model, new.memories, new.created_at, now())
    returning id into item_uuid;
    new.item_id := item_uuid;
  else
    item_uuid := new.item_id;
  end if;

  new.collection_id := coalesce(new.collection_id, collection_uuid);
  new.updated_at := now();

  if tg_op = 'UPDATE' and old.member_id is distinct from new.member_id then
    delete from public.item_people
    where item_id = item_uuid and member_id = old.member_id;
  end if;

  insert into public.item_people (item_id, member_id)
  values (item_uuid, new.member_id)
  on conflict (item_id, member_id) do nothing;

  update public.items
  set title = coalesce(nullif(trim(new.nickname), ''), new.year || ' ' || new.make || ' ' || new.model),
      story = new.memories,
      updated_at = now()
  where id = item_uuid;

  if new.photo_url is not null
     and not exists (
       select 1 from public.item_photos
       where item_id = item_uuid and url = new.photo_url
     ) then
    insert into public.item_photos (item_id, url, order_index)
    values (item_uuid, new.photo_url, 0);
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_car_collection_item() from public, anon, authenticated;

-- Repair relationships left behind by reassignments made before this migration.
delete from public.item_people old_people
using public.cars car
where old_people.item_id = car.item_id
  and old_people.member_id <> car.member_id;

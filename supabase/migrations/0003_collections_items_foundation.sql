-- Phase 3: generic collection/item foundation.
-- This migration is additive. Legacy families, members, cars, photos, stories,
-- invite codes, and RLS policies remain in place for rollback safety.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type text not null,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private', 'family')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, type)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  story text,
  tags text[] not null default '{}',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_people (
  item_id uuid not null references public.items(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  relationship text,
  created_at timestamptz not null default now(),
  primary key (item_id, member_id)
);

create table if not exists public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  url text not null,
  caption text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_migration_runs (
  id uuid primary key default gen_random_uuid(),
  migration_key text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  migrated_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

alter table public.cars add column if not exists collection_id uuid references public.collections(id) on delete set null;
alter table public.cars add column if not exists item_id uuid references public.items(id) on delete set null;
alter table public.cars add column if not exists updated_at timestamptz not null default now();
alter table public.cars add column if not exists memories text;

create unique index if not exists cars_item_id_unique_idx on public.cars(item_id) where item_id is not null;
create index if not exists collections_family_id_idx on public.collections(family_id);
create index if not exists items_collection_id_idx on public.items(collection_id);
create index if not exists item_people_member_id_idx on public.item_people(member_id);
create index if not exists item_photos_item_id_idx on public.item_photos(item_id);

alter table public.collections enable row level security;
alter table public.items enable row level security;
alter table public.item_people enable row level security;
alter table public.item_photos enable row level security;
alter table public.collection_migration_runs enable row level security;

drop policy if exists "family members can manage collections" on public.collections;
create policy "family members can manage collections"
  on public.collections for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists "family members can manage items" on public.items;
create policy "family members can manage items"
  on public.items for all
  using (exists (select 1 from public.collections c where c.id = items.collection_id and public.is_family_member(c.family_id)))
  with check (exists (select 1 from public.collections c where c.id = items.collection_id and public.is_family_member(c.family_id)));

drop policy if exists "family members can manage item people" on public.item_people;
create policy "family members can manage item people"
  on public.item_people for all
  using (exists (
    select 1 from public.items i join public.collections c on c.id = i.collection_id
    where i.id = item_people.item_id and public.is_family_member(c.family_id)
  ))
  with check (exists (
    select 1 from public.items i join public.collections c on c.id = i.collection_id
    where i.id = item_people.item_id and public.is_family_member(c.family_id)
  ));

drop policy if exists "family members can manage item photos" on public.item_photos;
create policy "family members can manage item photos"
  on public.item_photos for all
  using (exists (
    select 1 from public.items i join public.collections c on c.id = i.collection_id
    where i.id = item_photos.item_id and public.is_family_member(c.family_id)
  ))
  with check (exists (
    select 1 from public.items i join public.collections c on c.id = i.collection_id
    where i.id = item_photos.item_id and public.is_family_member(c.family_id)
  ));

create or replace function public.ensure_family_cars_collection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.collections (family_id, type, name, visibility, created_by)
  values (new.id, 'cars', 'Cars', 'private', new.created_by)
  on conflict (family_id, type) do nothing;
  return new;
end;
$$;

drop trigger if exists families_create_cars_collection on public.families;
create trigger families_create_cars_collection
  after insert on public.families
  for each row execute function public.ensure_family_cars_collection();

create or replace function public.migrate_legacy_cars_to_collections()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  car_row record;
  collection_uuid uuid;
  item_uuid uuid;
  migrated_total integer := 0;
  run_uuid uuid;
begin
  insert into public.collection_migration_runs (migration_key, status)
  values ('0003_legacy_cars_to_items', 'running')
  returning id into run_uuid;

  insert into public.collections (family_id, type, name, visibility, created_by)
  select f.id, 'cars', 'Cars', 'private', f.created_by
  from public.families f
  on conflict (family_id, type) do nothing;

  for car_row in
    select c.*, m.family_id
    from public.cars c
    join public.members m on m.id = c.member_id
  loop
    select id into collection_uuid
    from public.collections
    where family_id = car_row.family_id and type = 'cars';

    if car_row.item_id is null then
      insert into public.items (collection_id, title, story, created_at, updated_at)
      values (
        collection_uuid,
        coalesce(nullif(trim(car_row.nickname), ''), car_row.year || ' ' || car_row.make || ' ' || car_row.model),
        car_row.memories,
        car_row.created_at,
        coalesce(car_row.updated_at, car_row.created_at)
      )
      returning id into item_uuid;

      update public.cars
      set item_id = item_uuid, collection_id = collection_uuid, updated_at = now()
      where id = car_row.id;

      insert into public.item_people (item_id, member_id)
      values (item_uuid, car_row.member_id)
      on conflict (item_id, member_id) do nothing;

      if car_row.photo_url is not null then
        insert into public.item_photos (item_id, url, order_index)
        values (item_uuid, car_row.photo_url, 0);
      end if;
      migrated_total := migrated_total + 1;
    elsif car_row.collection_id is null then
      update public.cars set collection_id = collection_uuid, updated_at = now() where id = car_row.id;
    end if;
  end loop;

  update public.collection_migration_runs
  set status = 'completed', migrated_count = migrated_total, completed_at = now()
  where id = run_uuid;
  return migrated_total;
exception when others then
  update public.collection_migration_runs
  set status = 'failed', error_message = sqlerrm, completed_at = now()
  where id = run_uuid;
  raise;
end;
$$;

revoke execute on function public.migrate_legacy_cars_to_collections() from public, anon, authenticated;
revoke execute on function public.ensure_family_cars_collection() from public, anon, authenticated;
select public.migrate_legacy_cars_to_collections();

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

  select id into collection_uuid from public.collections where family_id = family_uuid and type = 'cars';
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

  insert into public.item_people (item_id, member_id)
  values (item_uuid, new.member_id)
  on conflict (item_id, member_id) do nothing;
  update public.items
  set title = coalesce(nullif(trim(new.nickname), ''), new.year || ' ' || new.make || ' ' || new.model),
      story = new.memories,
      updated_at = now()
  where id = item_uuid;
  if new.photo_url is not null and not exists (select 1 from public.item_photos where item_id = item_uuid and url = new.photo_url) then
    insert into public.item_photos (item_id, url, order_index) values (item_uuid, new.photo_url, 0);
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_car_collection_item() from public, anon, authenticated;

drop trigger if exists cars_sync_collection_item on public.cars;
create trigger cars_sync_collection_item
  before insert or update of member_id, make, model, year, nickname, memories, photo_url, collection_id, item_id
  on public.cars
  for each row execute function public.sync_car_collection_item();

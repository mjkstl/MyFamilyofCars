-- =========================================================================
-- My Family of Cars — Phase 1 schema
-- Run this in the Supabase SQL Editor (or `supabase db push`) on a fresh
-- project. Requires "Anonymous sign-ins" enabled under
-- Authentication -> Providers (Phase 1 has no login wall).
-- =========================================================================

create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- Tables
-- -------------------------------------------------------------------------

create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  display_name text not null,
  relationship text, -- free text label, e.g. "Dad", "Grandma", "Me"
  avatar_url text,
  user_id uuid references auth.users(id) on delete set null, -- null until that person joins via invite
  parent_member_id uuid references members(id) on delete set null,
  parent_link_confidence text check (parent_link_confidence in ('high', 'low', 'manual')),
  parent_link_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table cars (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references members(id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null check (year between 1885 and 2100),
  trim text,
  color text,
  nickname text,
  photo_url text,
  photo_quality_status text not null default 'pending'
    check (photo_quality_status in ('pending', 'approved', 'flagged')),
  purchase_date date,
  sold_date date,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table car_facts (
  id uuid primary key default uuid_generate_v4(),
  make text not null,
  model text not null,
  year integer not null,
  fact_text text not null,
  fact_type text not null check (fact_type in ('trivia', 'history', 'spec')),
  source_confidence text check (source_confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);
create index car_facts_lookup on car_facts (make, model, year);

create table family_shares (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  share_type text not null check (share_type in ('invite', 'poster')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can call them
-- without recursive-policy issues)
-- -------------------------------------------------------------------------

create or replace function is_family_member(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create or replace function is_family_member_via_car(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from cars c
    join members m on m.id = c.member_id
    where c.id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function is_family_member_via_member_row(mid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from members target
    join members me on me.family_id = target.family_id
    where target.id = mid and me.user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table families enable row level security;
alter table members enable row level security;
alter table cars enable row level security;
alter table car_facts enable row level security;
alter table family_shares enable row level security;

-- families: anyone authenticated (incl. anonymous) can look up a family by
-- invite code to join it, and can create a new family. Only members can
-- update it.
create policy "families_select_any_authenticated" on families
  for select using (auth.uid() is not null);

create policy "families_insert_own" on families
  for insert with check (created_by = auth.uid());

create policy "families_update_members_only" on families
  for update using (is_family_member(id));

-- members: readable/insertable/updatable only within your own family, EXCEPT
-- the very first insert (joining a family you just discovered via invite
-- code) which is allowed for any authenticated user inserting themself.
create policy "members_select_family_only" on members
  for select using (is_family_member(family_id));

create policy "members_insert_self_or_family" on members
  for insert with check (
    user_id = auth.uid() or is_family_member(family_id)
  );

create policy "members_update_family_only" on members
  for update using (is_family_member(family_id));

-- cars: scoped through the owning member's family
create policy "cars_select_family_only" on cars
  for select using (is_family_member_via_member_row(member_id));

create policy "cars_insert_family_only" on cars
  for insert with check (is_family_member_via_member_row(member_id));

create policy "cars_update_family_only" on cars
  for update using (is_family_member_via_member_row(member_id));

create policy "cars_delete_family_only" on cars
  for delete using (is_family_member_via_member_row(member_id));

-- car_facts: global read-only reference data, writable only by the service
-- role (Edge Functions), never directly by clients.
create policy "car_facts_select_all" on car_facts
  for select using (true);

-- family_shares: scoped to family membership
create policy "family_shares_select_family_only" on family_shares
  for select using (is_family_member(family_id));

create policy "family_shares_insert_family_only" on family_shares
  for insert with check (is_family_member(family_id));

-- -------------------------------------------------------------------------
-- Storage: car photo bucket
-- -------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

create policy "car_photos_public_read" on storage.objects
  for select using (bucket_id = 'car-photos');

create policy "car_photos_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'car-photos' and auth.uid() is not null);

create policy "car_photos_authenticated_update" on storage.objects
  for update using (bucket_id = 'car-photos' and auth.uid() is not null);

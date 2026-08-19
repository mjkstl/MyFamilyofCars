create extension if not exists pgcrypto;

create or replace function public.generate_invite_code()
returns text
language sql
volatile
as $$
  select lower(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
$$;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  invite_code text not null unique default public.generate_invite_code(),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  relationship text,
  avatar_url text,
  user_id uuid references auth.users(id) on delete set null,
  parent_member_id uuid references public.members(id) on delete set null,
  parent_link_confidence text check (parent_link_confidence in ('high', 'low', 'manual')),
  parent_link_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  make text not null check (length(trim(make)) > 0),
  model text not null check (length(trim(model)) > 0),
  year integer not null check (year between 1886 and 2100),
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

create table if not exists public.car_facts (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year integer not null,
  fact_text text not null,
  fact_type text not null check (fact_type in ('trivia', 'history', 'spec')),
  source_confidence text check (source_confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

create table if not exists public.family_shares (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  share_type text not null check (share_type in ('invite', 'poster')),
  created_at timestamptz not null default now()
);

create index if not exists members_family_id_idx on public.members(family_id);
create index if not exists members_user_id_idx on public.members(user_id);
create index if not exists cars_member_id_idx on public.cars(member_id);
create index if not exists car_facts_lookup_idx on public.car_facts(make, model, year);

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.cars enable row level security;
alter table public.car_facts enable row level security;
alter table public.family_shares enable row level security;

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create policy "families can be created by the signed-in user"
  on public.families for insert
  with check (created_by = auth.uid());

create policy "families are visible to their creator or members"
  on public.families for select
  using (
    created_by = auth.uid()
    or public.is_family_member(id)
  );

create policy "families can be found by invite code"
  on public.families for select
  using (invite_code is not null);

create policy "members can be added by family members or creators"
  on public.members for insert
  with check (
    exists (
      select 1 from public.families
      where families.id = members.family_id
        and families.created_by = auth.uid()
    )
    or public.is_family_member(family_id)
  );

create policy "members are visible to family members"
  on public.members for select
  using (user_id = auth.uid() or public.is_family_member(family_id));

create policy "members can be updated by family members"
  on public.members for update
  using (user_id = auth.uid() or public.is_family_member(family_id));

create policy "cars are managed by family members"
  on public.cars for all
  using (exists (
    select 1 from public.members
    where members.id = cars.member_id
  ) and public.is_family_member((select family_id from public.members where id = cars.member_id)))
  with check (exists (
    select 1 from public.members
    where members.id = cars.member_id
  ) and public.is_family_member((select family_id from public.members where id = cars.member_id)));

create policy "car facts are readable"
  on public.car_facts for select
  using (true);

create policy "family shares are managed by family members"
  on public.family_shares for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

create policy "family members can upload car photos"
  on storage.objects for insert
  with check (bucket_id = 'car-photos' and auth.role() = 'authenticated');

create policy "car photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'car-photos');
-- Phase 5: demand validation and privacy-preserving partner attribution.
-- No payment, fulfillment, shipping, or public collection data is stored.

create table if not exists public.keepsake_interest (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  product_id text not null,
  format text not null check (format in ('hardcover', 'poster', 'cards')),
  copies_requested integer check (copies_requested is null or copies_requested between 1 and 100),
  email text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  family_id uuid references public.families(id) on delete set null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  source_type text not null check (source_type in ('referral_code', 'url_parameter', 'co_branded_page')),
  partner_id text,
  campaign_id text,
  first_seen_at timestamptz not null default now(),
  conversion_milestones jsonb not null default '{}',
  unique (family_id)
);

alter table public.keepsake_interest enable row level security;
alter table public.analytics_events enable row level security;
alter table public.referral_attributions enable row level security;

drop policy if exists "family members can submit keepsake interest" on public.keepsake_interest;
create policy "family members can submit keepsake interest"
  on public.keepsake_interest for insert
  with check (public.is_family_member(family_id));
drop policy if exists "family members can view their keepsake interest" on public.keepsake_interest;
create policy "family members can view their keepsake interest"
  on public.keepsake_interest for select
  using (public.is_family_member(family_id));

drop policy if exists "family members can record safe analytics" on public.analytics_events;
create policy "family members can record safe analytics"
  on public.analytics_events for insert
  with check (family_id is null or public.is_family_member(family_id));

drop policy if exists "family members can record attribution" on public.referral_attributions;
create policy "family members can record attribution"
  on public.referral_attributions for insert
  with check (public.is_family_member(family_id));
drop policy if exists "family members can view attribution" on public.referral_attributions;
create policy "family members can view attribution"
  on public.referral_attributions for select
  using (public.is_family_member(family_id));

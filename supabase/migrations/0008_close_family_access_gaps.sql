-- PHASE 2A follow-up of the App Store release gate
-- (see docs/APP_STORE_RELEASE_PROGRESS.md, Session 2 — 2026-11-16).
--
-- WHY THIS EXISTS
-- A read-only audit of the LIVE database (pg_policies) found policies
-- that were created by hand in the Supabase dashboard and appear in no
-- migration file. Postgres combines permissive policies with OR, so one
-- loose policy overrides every strict one beside it. Two of them
-- re-opened what 0007 closed:
--
--   families_select_any_authenticated
--       for select using (auth.uid() is not null)
--     -> any signed-in session (anonymous ones included) could read
--        EVERY family row: name, creator id and invite token.
--
--   members_insert_self_or_family
--       for insert with check (user_id = auth.uid() or is_family_member(family_id))
--     -> any signed-in session could insert ITSELF as a member of any
--        family whose id it knew, with no invite at all. (It was also
--        the only thing letting a legitimate invitee join, because the
--        original insert policy only admits the creator or an existing
--        member — so it cannot simply be dropped; step 2 replaces it.)
--
-- A third gap was in an original policy: "members can be updated by
-- family members" has no WITH CHECK, so a member could re-point their
-- own row's family_id at a different family and so join it.
--
-- This migration is ADDITIVE and touches no data: no table, column or
-- row is removed. It is safe to run more than once.
--
-- DEPLOY ORDER: push the app code that calls join_family_with_invite
-- FIRST (it falls back to the old direct insert while this migration is
-- not yet applied), THEN run this file.

-- ---------------------------------------------------------------------
-- 1. Close the read hole. Family rows are once again visible only
--    through "families are visible to their creator or members".
-- ---------------------------------------------------------------------
drop policy if exists "families_select_any_authenticated" on public.families;

-- ---------------------------------------------------------------------
-- 2. Joining a family now REQUIRES a valid invite, checked on the
--    server. The client calls this instead of inserting into `members`
--    directly. SECURITY DEFINER lets it insert despite the locked-down
--    table, but only after the invite is validated by the same
--    lookup_invite() that 0007 introduced (so revoked invites fail here
--    too). The caller can only ever add THEMSELVES (user_id = auth.uid()).
--    Idempotent: calling it twice returns the same member row rather
--    than creating a duplicate — safe to retry after a network failure.
-- ---------------------------------------------------------------------
create or replace function public.join_family_with_invite(p_code text, p_display_name text)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_display_name, ''));
  v_family_id uuid;
  v_member public.members;
begin
  if v_uid is null then
    raise exception 'You must be signed in to join a family.' using errcode = '28000';
  end if;
  if length(v_name) = 0 then
    raise exception 'A name is required to join a family.' using errcode = '22023';
  end if;
  if length(v_name) > 80 then
    raise exception 'That name is too long.' using errcode = '22023';
  end if;

  select li.family_id into v_family_id
  from public.lookup_invite(p_code) li
  limit 1;

  if v_family_id is null then
    raise exception 'Invite not found.' using errcode = 'P0002';
  end if;

  select m.* into v_member
  from public.members m
  where m.family_id = v_family_id and m.user_id = v_uid
  order by m.created_at
  limit 1;
  if found then
    return v_member;
  end if;

  insert into public.members (family_id, display_name, user_id)
  values (v_family_id, v_name, v_uid)
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_family_with_invite(text, text) from public;
revoke all on function public.join_family_with_invite(text, text) from anon;
grant execute on function public.join_family_with_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. With a safe way to join in place, remove the policy that let any
--    session insert itself into any family. Inserts are now governed
--    only by "members can be added by family members or creators".
-- ---------------------------------------------------------------------
drop policy if exists "members_insert_self_or_family" on public.members;

-- ---------------------------------------------------------------------
-- 4. A member row can never move to another family. Enforced with a
--    trigger rather than a policy so it holds no matter which policies
--    exist now or are added later.
-- ---------------------------------------------------------------------
create or replace function public.prevent_member_family_change()
returns trigger
language plpgsql
as $$
begin
  if new.family_id is distinct from old.family_id then
    raise exception 'A family member cannot be moved to a different family.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists members_family_id_immutable on public.members;
create trigger members_family_id_immutable
  before update of family_id on public.members
  for each row execute function public.prevent_member_family_change();

-- ---------------------------------------------------------------------
-- NOT changed here, recorded so the next reader is not surprised:
--   * Other hand-made policies (cars_*_family_only, families_insert_own,
--     families_update_members_only, family_shares_*_family_only,
--     members_select_family_only, members_update_family_only,
--     car_facts_select_all) are duplicates of, or as strict as, the
--     migration-defined ones. They grant nothing extra, so they stay.
--   * storage.objects policies (public read of car-photos; upload and
--     update by any signed-in session) ARE too broad, but fixing them is
--     Phase 2B (private bucket + signed URLs) and needs a photo backfill
--     plan — deliberately not bundled into this migration.
--
-- ROLLBACK (only if joining breaks and the app code cannot be fixed
-- quickly — this re-opens the join hole, so treat it as temporary):
--   create policy "members_insert_self_or_family" on public.members
--     for insert with check (user_id = auth.uid() or public.is_family_member(family_id));
-- Do NOT recreate families_select_any_authenticated; nothing needs it.

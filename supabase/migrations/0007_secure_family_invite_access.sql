-- PHASE 2A of the App Store release gate (see docs/APP_STORE_RELEASE_PROGRESS.md).
-- Fixes the release-blocking issue: "families can be found by invite
-- code" used `invite_code is not null`, which is true for every family
-- row that has ever existed — meaning any authenticated (including
-- anonymous) user could read every family's name, invite code, and
-- creator id with a plain `select * from families`. This migration
-- removes that policy entirely and replaces client-side invite lookup
-- with a narrow, minimal-data server-side function.

-- ---------------------------------------------------------------------
-- 1. Remove the broad policy. Ordinary reads now only work via the
--    existing "families are visible to their creator or members" policy
--    (unaffected, unchanged) — i.e. you must already be in the family.
-- ---------------------------------------------------------------------
drop policy if exists "families can be found by invite code" on public.families;

-- ---------------------------------------------------------------------
-- 2. Add a high-entropy invite token (192 bits) alongside the legacy
--    invite_code (32 bits). invite_code becomes nullable: it stays
--    valid until a family explicitly rotates their invite, at which
--    point it's cleared and only the strong token works from then on.
--    This is the "safe migration/rotation strategy" — nothing breaks
--    for existing shared links until the family owner acts.
-- ---------------------------------------------------------------------
alter table public.families alter column invite_code drop not null;
alter table public.families add column if not exists invite_token text unique;
alter table public.families add column if not exists invite_revoked_at timestamptz;

-- Backfill: every existing family gets a strong token immediately, so
-- the UI can start offering the stronger scheme right away without
-- waiting for anyone to take action. Legacy invite_code is untouched.
update public.families
set invite_token = lower(encode(gen_random_bytes(24), 'hex'))
where invite_token is null;

alter table public.families alter column invite_token set not null;
alter table public.families alter column invite_token
  set default (lower(encode(gen_random_bytes(24), 'hex')));

-- ---------------------------------------------------------------------
-- 3. Secure, minimal-data invite lookup. This is what the client calls
--    instead of `select * from families where invite_code = ...`.
--    SECURITY DEFINER lets it read the families table despite the
--    now-locked-down RLS, but it deliberately returns only what's
--    needed to preview and join — never a full row, never creator info,
--    never anything for a revoked invite.
-- ---------------------------------------------------------------------
create or replace function public.lookup_invite(p_code text)
returns table (family_id uuid, family_name text)
language sql
security definer
set search_path = public
as $$
  select id, name
  from families
  where (
      (invite_code is not null and invite_code = lower(trim(p_code)))
      or invite_token = lower(trim(p_code))
    )
    and invite_revoked_at is null;
$$;

revoke all on function public.lookup_invite(text) from public;
grant execute on function public.lookup_invite(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Rotation = revocation. Callable only by an existing member of the
--    family. Clears the legacy invite_code (if it was still active,
--    this permanently kills it — true revocation, not just "also add a
--    new one") and issues a fresh high-entropy token.
-- ---------------------------------------------------------------------
create or replace function public.revoke_and_rotate_invite(p_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'Not authorized for this family';
  end if;

  new_token := lower(encode(gen_random_bytes(24), 'hex'));
  update families
  set invite_token = new_token,
      invite_code = null,
      invite_revoked_at = null
  where id = p_family_id;

  return new_token;
end;
$$;

revoke all on function public.revoke_and_rotate_invite(uuid) from public;
grant execute on function public.revoke_and_rotate_invite(uuid) to authenticated;

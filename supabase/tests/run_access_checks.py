#!/usr/bin/env python3
"""
Proves the family access rules on a throwaway local Postgres.

It applies supabase/tests/auth_stub.sql, then every migration in
supabase/migrations in order, then acts as three different signed-in
people and checks what each can and cannot do.

Usage (needs Postgres 15+ and psql on PATH, and an EMPTY database):
    createdb mfoc_test
    python3 supabase/tests/run_access_checks.py "dbname=mfoc_test"

Exit code 0 = every check passed. Never point this at the live database.
"""
import glob, os, subprocess, sys

CONN = sys.argv[1] if len(sys.argv) > 1 else "dbname=mfoc_test"
HERE = os.path.dirname(os.path.abspath(__file__))
A, B, C = ("aaaaaaaa-0000-0000-0000-000000000001", "bbbbbbbb-0000-0000-0000-000000000002",
           "cccccccc-0000-0000-0000-000000000003")
NOISE = ("SET", "INSERT ", "UPDATE ", "DELETE ")


def psql(args):
    return subprocess.run(["psql", CONN, "-At", "-v", "ON_ERROR_STOP=1"] + args, capture_output=True, text=True)


def q(uid, sql, as_owner=False, role="authenticated"):
    pre = "" if as_owner else (f"set role {role}; set request.jwt.claim.sub='{uid or ''}'; "
                               f"set request.jwt.claim.role='{role}'; ")
    r = psql(["-c", pre + sql])
    out = [l for l in r.stdout.strip().split("\n") if l and not l.startswith(NOISE)]
    return r.returncode == 0, out, (r.stderr.strip().split("\n") or [""])[0][:100]


results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(("PASS  " if ok else "FAIL  ") + name + (f"   [{detail}]" if detail and not ok else ""))


def main():
    files = [os.path.join(HERE, "auth_stub.sql")] + sorted(glob.glob(os.path.join(HERE, "..", "migrations", "*.sql")))
    for f in files:
        r = psql(["-q", "-f", f])
        if r.returncode != 0:
            sys.exit(f"Could not apply {os.path.basename(f)}: {r.stderr.strip()[:300]}")
    q(None, f"insert into auth.users values ('{A}'),('{B}'),('{C}'); "
            "grant all on all tables in schema public to anon, authenticated", as_owner=True)

    ok, o, e = q(A, f"insert into families(name,created_by) values ('Keegan','{A}') returning id")
    check("creator can create a family", ok and len(o) == 1, e)
    fam = o[0]
    ok, o, e = q(A, f"insert into members(family_id,display_name,relationship,user_id) values ('{fam}','Malcolm','Me','{A}')")
    check("creator can add themselves as the first member", ok, e)
    tok = q(None, f"select invite_token from families where id='{fam}'", as_owner=True)[1][0]

    ok, o, e = q(B, "select count(*) from families"); check("stranger sees 0 families", o == ["0"], str(o))
    ok, o, e = q(B, "select count(*) from members"); check("stranger sees 0 members", o == ["0"], str(o))
    ok, o, e = q(B, "select count(*) from cars"); check("stranger sees 0 cars", o == ["0"], str(o))
    ok, o, e = q(C, f"insert into members(family_id,display_name,user_id) values ('{fam}','Intruder','{C}')")
    check("joining without an invite is refused", not ok, e)
    ok, o, e = q(B, "select (join_family_with_invite('nope','Bea')).id"); check("bad invite code is refused", not ok, e)
    ok, o, e = q(B, f"select (join_family_with_invite('{tok}','  ')).id"); check("blank name is refused", not ok, e)
    ok, o, e = q(None, "select (join_family_with_invite('x','y')).id", role="anon"); check("signed-out caller is refused", not ok, e)
    ok, o, e = q(B, f"select (join_family_with_invite('{tok}','Bea')).id"); check("valid invite joins", ok and len(o) == 1, e)
    mid = o[0] if o else ""
    ok, o, e = q(B, f"select (join_family_with_invite('{tok.upper()}','Bea again')).id")
    check("joining twice returns the same member (no duplicate)", o == [mid], str(o) + e)
    ok, o, e = q(B, "select name from families"); check("joined member can read the family", o == ["Keegan"], str(o))
    ok, o, e = q(A, f"insert into members(family_id,display_name,relationship) values ('{fam}','Grandpa Joe','Grandfather')")
    check("member can add a relative", ok, e)
    ok, o, e = q(B, f"update members set display_name='Beatrice' where id='{mid}' returning display_name")
    check("member can edit their own entry", o == ["Beatrice"], str(o) + e)

    ok, o, e = q(C, f"insert into families(name,created_by) values ('Other','{C}') returning id"); fam2 = o[0]
    q(C, f"insert into members(family_id,display_name,relationship,user_id) values ('{fam2}','Cee','Me','{C}')")
    ok, o, e = q(B, f"update members set family_id='{fam2}' where id='{mid}'")
    check("member cannot move themselves into another family", not ok, e)

    ok, o, e = q(A, f"select revoke_and_rotate_invite('{fam}')"); new_tok = o[0] if o else ""
    ok, o, e = q(C, f"select (join_family_with_invite('{tok}','Cee')).id"); check("old invite is refused after a reset", not ok, e)
    ok, o, e = q(C, f"select (join_family_with_invite('{new_tok}','Cee')).id"); check("new invite works after a reset", ok, e)

    print(f"\n{sum(results)} of {len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()

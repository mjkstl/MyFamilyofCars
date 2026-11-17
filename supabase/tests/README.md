# Database access checks

`run_access_checks.py` proves, on a throwaway local Postgres, that a
stranger cannot read or join a family and that invites behave correctly.
It runs the real migration files, so it catches a migration that
accidentally loosens access.

Run it whenever a migration touches `families`, `members`, `cars` or any
policy:

1. Install Postgres (15 or newer) so `psql` and `createdb` are available.
2. `createdb mfoc_test` (use a fresh, empty database each time; delete it
   afterwards with `dropdb mfoc_test`).
3. `python3 supabase/tests/run_access_checks.py "dbname=mfoc_test"`
4. Every line should start with `PASS`, ending with "N of N checks passed".

`auth_stub.sql` is a minimal stand-in for Supabase's `auth` and `storage`
schemas. It is for these tests only — never run it on the live project.

Not covered here: photo storage rules (Phase 2B) and anything that needs
the real Supabase Auth or Storage services.

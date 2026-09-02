-- New fields for the redesigned Add Car screen:
-- status: whether this is a car the family currently drives, a past
--   memory, or an aspirational "dream car" they don't own yet. Defaults
--   to 'current' so every existing row gets a sensible value with no
--   manual backfill needed.
-- fun_fact: a short user-entered quirky detail, distinct from the
--   longer free-form `memories` field and distinct from the researched
--   car_facts lookup table (make/model/year based, not per-car).

alter table cars
  add column if not exists status text not null default 'current'
    check (status in ('current', 'memory', 'dream'));

alter table cars add column if not exists fun_fact text;

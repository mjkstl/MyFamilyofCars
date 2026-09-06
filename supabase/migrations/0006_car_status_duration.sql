alter table public.cars
  add column if not exists ownership_duration text
    check (ownership_duration in ('under_2_years', 'under_5_years', 'five_plus_years'));

alter table public.cars drop constraint if exists cars_status_check;
alter table public.cars
  add constraint cars_status_check
  check (status in ('first', 'current', 'memory', 'dream'));

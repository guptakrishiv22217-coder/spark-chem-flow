
create table public.material_safety_data (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique references public.commodities(symbol) on delete cascade,
  cas_number text,
  ghs_classification text[],
  hazard_statements text[],
  precautionary_statements text[],
  signal_word text check (signal_word in ('Danger', 'Warning')),
  pictograms text[],
  storage_requirements text,
  handling_notes text,
  sds_file_url text,
  reach_registered boolean default false,
  last_reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.material_safety_data to authenticated;
grant all on public.material_safety_data to service_role;

alter table public.material_safety_data enable row level security;

create policy "Team members can view safety data"
  on public.material_safety_data for select
  to authenticated
  using (true);

create policy "Team members can modify safety data"
  on public.material_safety_data for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_material_safety_data_updated_at
  before update on public.material_safety_data
  for each row execute function public.update_updated_at_column();

create policy "Team can read SDS files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'sds-documents');

create policy "Team can upload SDS files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sds-documents');

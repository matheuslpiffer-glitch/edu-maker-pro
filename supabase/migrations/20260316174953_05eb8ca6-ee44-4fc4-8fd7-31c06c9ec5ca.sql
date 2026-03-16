-- Queue-based async generation for simulators
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_type text not null default 'simulator',
  status text not null default 'pending',
  progress integer not null default 0,
  prompt_payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  partial_result jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint generation_jobs_progress_range check (progress >= 0 and progress <= 100),
  constraint generation_jobs_status_check check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

alter table public.generation_jobs enable row level security;

create index if not exists idx_generation_jobs_user_created_at on public.generation_jobs(user_id, created_at desc);
create index if not exists idx_generation_jobs_status_created_at on public.generation_jobs(status, created_at asc);

create policy "Users can create their own generation jobs"
on public.generation_jobs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own generation jobs"
on public.generation_jobs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own generation jobs"
on public.generation_jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_generation_jobs_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_generation_jobs_updated_at
before update on public.generation_jobs
for each row
execute function public.set_generation_jobs_updated_at();
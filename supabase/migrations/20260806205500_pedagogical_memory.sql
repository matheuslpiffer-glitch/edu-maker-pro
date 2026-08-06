-- Create table for user pedagogical memory
create table if not exists public.user_pedagogical_memory (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    memory_fact text not null,
    category text, -- e.g., 'preference', 'grade_level', 'subject', 'methodology'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups
create index if not exists user_pedagogical_memory_user_id_idx on public.user_pedagogical_memory(user_id);

-- Enable RLS
alter table public.user_pedagogical_memory enable row level security;

-- Policies
create policy "Users can view their own memory"
on public.user_pedagogical_memory for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own memory"
on public.user_pedagogical_memory for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own memory"
on public.user_pedagogical_memory for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own memory"
on public.user_pedagogical_memory for delete
to authenticated
using (auth.uid() = user_id);

-- Grant access to authenticated users
grant select, insert, update, delete on public.user_pedagogical_memory to authenticated;
grant all on public.user_pedagogical_memory to service_role;


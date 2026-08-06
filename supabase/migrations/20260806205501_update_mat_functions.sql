-- Function to get or store pedagogical memory
create or replace function public.get_user_pedagogical_memory(p_user_id uuid)
returns table (fact text)
language plpgsql
security definer
as $$
begin
  return query
  select memory_fact
  from public.user_pedagogical_memory
  where user_id = p_user_id
  order by updated_at desc;
end;
$;

-- Function to save pedagogical memory
create or replace function public.save_user_pedagogical_memory(p_user_id uuid, p_fact text)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.user_pedagogical_memory (user_id, memory_fact)
  values (p_user_id, p_fact)
  on conflict (id) -- if we had a unique constraint, but here we just append facts. 
  -- Maybe append to existing if similar? For now just insert.
  do nothing;
end;
$;

GRANT EXECUTE ON FUNCTION public.get_user_pedagogical_memory TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_pedagogical_memory TO authenticated;

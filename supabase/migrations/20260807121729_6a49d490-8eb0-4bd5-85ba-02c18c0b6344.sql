create table public.documentos_pedagogicos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade,
  titulo text not null,
  tipo_documento text not null,
  nivel_complexidade integer default 2,
  componente_curricular text,
  conteudo_json jsonb not null,
  tags_bncc text[]
);

-- Permissões de acesso para usuários autenticados e service_role
grant select, insert, update, delete on public.documentos_pedagogicos to authenticated;
grant all on public.documentos_pedagogicos to service_role;

-- Habilitar RLS (Row Level Security)
alter table public.documentos_pedagogicos enable row level security;

-- Política para permitir que usuários gerenciem apenas seus próprios documentos
create policy "Users can manage their own pedagogical documents"
on public.documentos_pedagogicos
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
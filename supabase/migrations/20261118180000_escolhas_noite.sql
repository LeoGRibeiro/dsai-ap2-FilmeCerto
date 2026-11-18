-- "Como foi?" (SPEC/2026-11-18-como-foi.md): a escolha do "Vou ver esse!" fica guardada
-- para o dashboard perguntar depois como foi. Só o título escolhido, nunca as respostas do wizard.

-- Filme ou série. A spec de séries reaproveita este enum em reacoes e lista_itens.
create type public.tipo_midia as enum ('filme', 'serie');

create table public.escolhas_noite (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo public.tipo_midia not null default 'filme',
  tmdb_id int not null check (tmdb_id > 0),
  titulo text not null check (char_length(titulo) between 1 and 300),
  escolhido_em timestamptz not null default now(),
  perguntado_em timestamptz,
  vezes_perguntado smallint not null default 0 check (vezes_perguntado between 0 and 2),
  respondido_em timestamptz
);

comment on table public.escolhas_noite is 'Títulos escolhidos no wizard ("Vou ver esse!"), para a pergunta "Como foi?".';
comment on column public.escolhas_noite.titulo is 'Título vindo do TMDB no momento da escolha.';
comment on column public.escolhas_noite.perguntado_em is 'Última visita em que a pergunta apareceu.';
comment on column public.escolhas_noite.vezes_perguntado is 'Visitas em que a pergunta apareceu (no máximo 2).';
comment on column public.escolhas_noite.respondido_em is 'Quando a pessoa respondeu, inclusive "Não cheguei a ver".';

create index escolhas_noite_usuario_escolhido_em on public.escolhas_noite (usuario_id, escolhido_em desc);

alter table public.escolhas_noite enable row level security;

create policy "escolhas_noite: dono lê as próprias"
  on public.escolhas_noite for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "escolhas_noite: dono cria as próprias"
  on public.escolhas_noite for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "escolhas_noite: dono atualiza as próprias"
  on public.escolhas_noite for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

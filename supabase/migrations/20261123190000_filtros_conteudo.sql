-- Filtro de conteúdo sensível (SPEC/2026-11-23-filtro-conteudo.md): limite de classificação
-- indicativa e o que fazer com o que passa dele. Sem linha aqui, o filtro está desligado.
-- A idade de quem usa a conta não é guardada.

create type public.modo_filtro_conteudo as enum ('avisar', 'ocultar', 'bloquear');

create table public.filtros_conteudo (
  usuario_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Sem '18': um limite de 18 é o mesmo que o filtro desligado.
  classificacao_max text not null check (classificacao_max in ('L', '10', '12', '14', '16')),
  modo public.modo_filtro_conteudo not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.filtros_conteudo is 'Filtro de conteúdo sensível de cada conta; sem linha, o filtro está desligado.';
comment on column public.filtros_conteudo.classificacao_max is 'Classificação indicativa brasileira mais alta vista normalmente (L, 10, 12, 14 ou 16).';
comment on column public.filtros_conteudo.modo is 'O que acontece com o que passa do limite: avisar (borrado), ocultar ou bloquear.';

alter table public.filtros_conteudo enable row level security;

create policy "filtros_conteudo: dono lê o próprio"
  on public.filtros_conteudo for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "filtros_conteudo: dono cria o próprio"
  on public.filtros_conteudo for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "filtros_conteudo: dono atualiza o próprio"
  on public.filtros_conteudo for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "filtros_conteudo: dono apaga o próprio"
  on public.filtros_conteudo for delete
  to authenticated
  using (usuario_id = (select auth.uid()));

create trigger filtros_conteudo_atualizado_em
  before update on public.filtros_conteudo
  for each row execute function public.tocar_atualizado_em();

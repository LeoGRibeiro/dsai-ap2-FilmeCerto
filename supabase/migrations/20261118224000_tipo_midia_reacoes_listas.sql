-- Séries (SPEC/2026-11-18-series-base.md): reações e listas passam a guardar o tipo do título.
-- No TMDB, filme e série têm sequências de ID independentes: o mesmo tmdb_id pode ser um filme
-- e uma série diferentes, então o tipo entra na chave. As linhas atuais viram filmes pelo padrão
-- da coluna. Nada é apagado nem recriado: a produção tem dados reais.
-- RLS, gatilhos e funções não mudam: as políticas usam só usuario_id.

alter table public.reacoes
  add column tipo public.tipo_midia not null default 'filme';

alter table public.reacoes
  drop constraint reacoes_pkey,
  add primary key (usuario_id, tipo, tmdb_id);

comment on table public.reacoes is 'Reação de cada usuário a cada título; uma por usuário, tipo e tmdb_id.';
comment on column public.reacoes.tipo is 'Filme ou série. Junto com tmdb_id, identifica o título no TMDB.';

alter table public.lista_itens
  add column tipo public.tipo_midia not null default 'filme';

alter table public.lista_itens
  drop constraint lista_itens_pkey,
  add primary key (usuario_id, tipo, tmdb_id);

comment on table public.lista_itens is 'Títulos nas listas de cada usuário; um status por usuário, tipo e tmdb_id.';
comment on column public.lista_itens.tipo is 'Filme ou série. Junto com tmdb_id, identifica o título no TMDB.';

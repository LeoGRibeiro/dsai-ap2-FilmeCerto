create table public.acompanhamentos_series (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  serie_tmdb_id integer not null check (serie_tmdb_id > 0),
  titulo text not null check (char_length(titulo) between 1 and 300),
  poster_path text,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, serie_tmdb_id)
);

create table public.avisos_episodios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  serie_tmdb_id integer not null check (serie_tmdb_id > 0),
  serie_titulo text not null check (char_length(serie_titulo) between 1 and 300),
  episodio_tmdb_id integer,
  temporada_numero integer not null check (temporada_numero >= 0),
  episodio_numero integer not null check (episodio_numero > 0),
  episodio_nome text not null check (char_length(episodio_nome) between 1 and 300),
  data_estreia date not null,
  lido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, serie_tmdb_id, temporada_numero, episodio_numero)
);

create index avisos_episodios_usuario_data_idx
  on public.avisos_episodios (usuario_id, data_estreia desc);

create index avisos_episodios_usuario_nao_lidos_idx
  on public.avisos_episodios (usuario_id, data_estreia desc)
  where lido_em is null;

alter table public.acompanhamentos_series enable row level security;
alter table public.avisos_episodios enable row level security;

create policy "acompanhamentos: dono lê os próprios"
  on public.acompanhamentos_series for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "acompanhamentos: dono cria os próprios"
  on public.acompanhamentos_series for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "acompanhamentos: dono apaga os próprios"
  on public.acompanhamentos_series for delete to authenticated
  using (usuario_id = (select auth.uid()));

create policy "avisos: dono lê os próprios"
  on public.avisos_episodios for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "avisos: dono atualiza os próprios"
  on public.avisos_episodios for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create trigger avisos_episodios_atualizado_em
  before update on public.avisos_episodios
  for each row execute function public.tocar_atualizado_em();






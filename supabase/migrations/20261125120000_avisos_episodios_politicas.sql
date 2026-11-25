-- Avisos de episódio novo (SPEC/2026-11-25-avisos-episodios.md): o início grava os avisos com a
-- sessão da própria pessoa, sem cron nem chave de serviço, então faltam as políticas de insert e
-- de delete. A migration 20261124145207 já está na produção e não é editada.

-- Só cria aviso de série que a própria pessoa acompanha: ninguém grava para outra conta, nem de
-- série que deixou de acompanhar entre a leitura e a gravação.
create policy "avisos: dono cria os de séries que acompanha"
  on public.avisos_episodios for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1
        from public.acompanhamentos_series a
       where a.usuario_id = (select auth.uid())
         and a.serie_tmdb_id = avisos_episodios.serie_tmdb_id
    )
  );

-- Deixar de acompanhar apaga os avisos daquela série.
create policy "avisos: dono apaga os próprios"
  on public.avisos_episodios for delete
  to authenticated
  using (usuario_id = (select auth.uid()));

comment on table public.acompanhamentos_series is 'Séries que a pessoa acompanha ("Avisar sobre novos episódios").';
comment on column public.acompanhamentos_series.titulo is 'Título vindo do TMDB no momento em que a pessoa passou a acompanhar.';
comment on column public.acompanhamentos_series.criado_em is 'Quando a pessoa passou a acompanhar: episódios exibidos antes deste dia não viram aviso.';

comment on table public.avisos_episodios is 'Episódios das séries acompanhadas, gravados ao abrir o início; o cartão mostra os não lidos que já estrearam.';
comment on column public.avisos_episodios.serie_titulo is 'Título da série vindo do TMDB na última gravação.';
comment on column public.avisos_episodios.episodio_tmdb_id is 'ID do episódio no TMDB, quando ele informa.';
comment on column public.avisos_episodios.episodio_nome is 'Nome do episódio no TMDB, ou "Episódio N" sem nome.';
comment on column public.avisos_episodios.data_estreia is 'Data de exibição no TMDB; muda quando o TMDB muda, sem duplicar o aviso.';
comment on column public.avisos_episodios.lido_em is 'Quando a pessoa marcou como lido; o aviso sai do cartão.';

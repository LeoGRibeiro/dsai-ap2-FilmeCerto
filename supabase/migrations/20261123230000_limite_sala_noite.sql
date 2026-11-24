-- Noite a dois com filtro por idade (SPEC/2026-11-23-filtro-idade.md): as recomendações vão só
-- até o limite do filtro, então a sala precisa do limite mais restrito dos dois participantes,
-- e não só de saber se algum tem filtro.

drop function public.filtro_na_sala_noite(uuid);

-- Os limites são '10', '14' e '18': a ordem do texto é a da idade, então min() é o mais restrito.
create function public.limite_filtro_sala_noite(p_sala uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select min(f.limite)
    from public.salas_noite s
    join public.filtros_conteudo f on f.usuario_id in (s.criador_id, s.convidado_id)
   where s.id = p_sala
     and public.participa_sala_noite(s);
$$;

comment on function public.limite_filtro_sala_noite is 'O menor limite do filtro por idade entre os participantes da sala, ou null se nenhum tem filtro; só para quem está na sala.';

revoke execute on function public.limite_filtro_sala_noite(uuid) from public, anon;
grant execute on function public.limite_filtro_sala_noite(uuid) to authenticated;

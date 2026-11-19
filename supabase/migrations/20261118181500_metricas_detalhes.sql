-- Detalhes dos eventos para o funil do /metricas (SPEC/2026-11-18-metricas-funil.md).
-- Nenhuma tabela muda: a função só soma o que já está em eventos.dados, e só para a equipe.

create function public.metricas_detalhes()
returns table (nome text, chave text, valor text, total bigint, sem_equipe bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_equipe_metricas();
  return query
    select e.nome,
           d.chave,
           d.valor,
           count(*),
           count(*) filter (where e.usuario_id not in (select q.usuario_id from public.equipe_metricas q))
    from public.eventos e
    cross join lateral jsonb_each_text(e.dados) as d (chave, valor)
    group by e.nome, d.chave, d.valor
    order by e.nome, d.chave, 4 desc;
end;
$$;

comment on function public.metricas_detalhes is
  'Totais por evento e valor de cada chave de dados (motivo, resposta, origem, etapa, trocas), com e sem a equipe.';

-- Funções são executáveis por public por padrão: restringe a quem está logado.
revoke execute on function public.metricas_detalhes() from public, anon;
grant execute on function public.metricas_detalhes() to authenticated;

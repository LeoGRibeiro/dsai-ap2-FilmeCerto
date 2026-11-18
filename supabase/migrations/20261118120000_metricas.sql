-- Métricas de uso (SPEC/2026-11-18-metricas.md). Ninguém lê estas tabelas pela API:
-- os eventos só aceitam insert, e os totais saem de funções que só respondem à equipe.

-- Eventos de uso. Lista fechada; nenhum dado pessoal além do usuario_id.
create table public.eventos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (nome in (
    'wizard_iniciado', 'wizard_concluido', 'wizard_troca', 'wizard_escolheu', 'wizard_abandonado',
    'como_foi_exibido', 'como_foi_respondido', 'trailer_aberto'
  )),
  dados jsonb not null default '{}'
    check (jsonb_typeof(dados) = 'object')
    -- As respostas de clima do wizard nunca ficam junto ao usuário (pedido do cliente, 3.1).
    check (not (dados ?| array['humor', 'experiencia', 'companhia']))
    check (pg_column_size(dados) <= 1024),
  criado_em timestamptz not null default now()
);

comment on table public.eventos is 'Eventos de uso (wizard, "Como foi?", trailer). Só insert pela API.';
comment on column public.eventos.nome is 'Nome do evento, da lista fechada de SPEC/2026-11-18-metricas.md.';
comment on column public.eventos.dados is 'Detalhes do evento (motivo, resposta, origem). Nunca o clima do wizard.';

create index eventos_nome_criado_em on public.eventos (nome, criado_em);

alter table public.eventos enable row level security;

create policy "eventos: usuário registra os próprios"
  on public.eventos for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

-- Climas escolhidos no wizard, contados sem vínculo com a pessoa: por dia e por pergunta.
create table public.contagem_climas (
  dia date not null,
  pergunta text not null check (pergunta in ('humor', 'experiencia', 'companhia')),
  resposta text not null,
  total int not null default 0 check (total >= 0),
  primary key (dia, pergunta, resposta),
  check (
    (pergunta = 'humor' and resposta in ('cansado', 'animado', 'pra-baixo', 'nostalgico', 'ansioso', 'de-boa'))
    or (pergunta = 'experiencia' and resposta in ('rir', 'emocionar', 'susto', 'tenso', 'pensar', 'distrair'))
    or (pergunta = 'companhia' and resposta in ('sozinho', 'a-dois', 'familia', 'amigos'))
  )
);

comment on table public.contagem_climas is 'Contagem anônima das respostas do wizard, por dia e por pergunta. Escrita só por registrar_clima.';

alter table public.contagem_climas enable row level security;

-- Quem pode ver os totais: a dupla e os clientes. Preenchida à mão no editor SQL.
create table public.equipe_metricas (
  usuario_id uuid primary key references auth.users (id) on delete cascade
);

comment on table public.equipe_metricas is 'Contas que podem ver /metricas. Sem políticas: só o editor SQL altera.';

alter table public.equipe_metricas enable row level security;

-- Conta um clima do wizard: uma linha por pergunta no dia de hoje (horário de Brasília).
create function public.registrar_clima(p_humor text, p_experiencia text, p_companhia text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then
    raise exception 'sessão obrigatória' using errcode = 'insufficient_privilege';
  end if;

  insert into public.contagem_climas as c (dia, pergunta, resposta, total)
  values (hoje, 'humor', p_humor, 1),
         (hoje, 'experiencia', p_experiencia, 1),
         (hoje, 'companhia', p_companhia, 1)
  on conflict (dia, pergunta, resposta) do update set total = c.total + 1;
end;
$$;

comment on function public.registrar_clima is 'Incrementa a contagem anônima das três respostas do wizard.';

-- Falha com 42501 para quem não está em equipe_metricas.
create function public.exigir_equipe_metricas()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.equipe_metricas where usuario_id = auth.uid()) then
    raise exception 'acesso só para a equipe' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create function public.metricas_eventos()
returns table (nome text, total bigint, pessoas bigint, sem_equipe bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_equipe_metricas();
  return query
    select e.nome,
           count(*),
           count(distinct e.usuario_id),
           count(*) filter (where e.usuario_id not in (select q.usuario_id from public.equipe_metricas q))
    from public.eventos e
    group by e.nome
    order by e.nome;
end;
$$;

comment on function public.metricas_eventos is 'Totais por evento: ocorrências, pessoas distintas e ocorrências fora da equipe.';

create function public.metricas_climas()
returns table (pergunta text, resposta text, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_equipe_metricas();
  return query
    select c.pergunta, c.resposta, sum(c.total)::bigint
    from public.contagem_climas c
    group by c.pergunta, c.resposta
    order by c.pergunta, 3 desc;
end;
$$;

comment on function public.metricas_climas is 'Totais de cada resposta do wizard, somando todos os dias.';

-- Funções são executáveis por public por padrão: restringe a quem está logado.
revoke execute on function public.registrar_clima(text, text, text) from public, anon;
revoke execute on function public.exigir_equipe_metricas() from public, anon, authenticated;
revoke execute on function public.metricas_eventos() from public, anon;
revoke execute on function public.metricas_climas() from public, anon;
grant execute on function public.registrar_clima(text, text, text) to authenticated;
grant execute on function public.metricas_eventos() to authenticated;
grant execute on function public.metricas_climas() to authenticated;

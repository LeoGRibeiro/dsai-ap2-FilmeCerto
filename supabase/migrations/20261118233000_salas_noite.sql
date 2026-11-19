-- "Noite a dois" (SPEC/2026-11-18-noite-a-dois.md): duas pessoas respondem o wizard, cada uma
-- no próprio celular, e o app sugere um filme para as duas. A sala é curta: expira em 3 h, e as
-- respostas são apagadas assim que o resultado é gravado. Nada aqui vira preferência.
--
-- A tabela só é lida pela API (criador e convidado). Toda escrita passa pelas funções abaixo,
-- com as checagens explícitas: não há política de insert, update nem delete.

create table public.salas_noite (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  convidado_id uuid references auth.users (id) on delete cascade,
  respostas_criador jsonb,
  respostas_convidado jsonb,
  resultado jsonb
    check (resultado is null or (jsonb_typeof(resultado) = 'object' and pg_column_size(resultado) <= 4096)),
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '3 hours',
  check (convidado_id is null or convidado_id <> criador_id),
  check (expira_em > criada_em)
);

comment on table public.salas_noite is 'Salas da "Noite a dois": duas pessoas, respostas temporárias e o filme sugerido. Escrita só pelas funções *_sala_noite.';
comment on column public.salas_noite.id is 'Aleatório (gen_random_uuid): é o segredo do link /noite/juntos/{id}.';
comment on column public.salas_noite.convidado_id is 'A segunda pessoa, que entrou pelo link. Nula enquanto a vaga está livre.';
comment on column public.salas_noite.respostas_criador is 'Respostas de quem criou ({humor, experiencia, companhia}); apagadas quando o resultado é gravado.';
comment on column public.salas_noite.respostas_convidado is 'Respostas da segunda pessoa; apagadas quando o resultado é gravado.';
comment on column public.salas_noite.resultado is 'Filmes sugeridos para as duas ({filmes: [{id, motivo}]}).';
comment on column public.salas_noite.expira_em is 'Depois disso, ninguém lê nem entra. Padrão: 3 h depois da criação.';

create index salas_noite_criador on public.salas_noite (criador_id);

alter table public.salas_noite enable row level security;

create policy "salas_noite: participantes leem até expirar"
  on public.salas_noite for select
  to authenticated
  using (
    (select auth.uid()) in (criador_id, convidado_id)
    and expira_em > now()
  );

-- Quem chama é o criador ou o convidado. Com "is distinct from", a vaga livre (convidado nulo)
-- nunca deixa passar quem não entrou, o que um "not in (criador, convidado)" com nulo deixaria.
create function public.participa_sala_noite(p_sala public.salas_noite)
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and (auth.uid() = p_sala.criador_id or auth.uid() is not distinct from p_sala.convidado_id);
$$;

comment on function public.participa_sala_noite is 'Se quem chama é o criador ou o convidado da sala.';

-- Cria a sala de quem chama e devolve o ID. A validade pode ser menor que 3 h, nunca maior
-- (os testes usam poucos segundos). Aproveita para apagar as salas expiradas da pessoa.
create function public.criar_sala_noite(p_segundos int default 10800)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'sessão obrigatória' using errcode = 'insufficient_privilege';
  end if;
  if p_segundos is null or p_segundos not between 1 and 10800 then
    raise exception 'validade inválida' using errcode = 'invalid_parameter_value';
  end if;

  delete from public.salas_noite where criador_id = auth.uid() and expira_em <= now();

  insert into public.salas_noite (criador_id, expira_em)
  values (auth.uid(), now() + make_interval(secs => p_segundos))
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.criar_sala_noite is 'Cria uma sala da "Noite a dois" para quem chama e devolve o ID.';

-- Entra pelo link: quem criou continua criador; a primeira outra pessoa ocupa a vaga.
-- Devolve 'criador', 'convidado', 'cheia', 'expirada' ou 'inexistente'.
create function public.entrar_sala_noite(p_sala uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sala public.salas_noite;
begin
  if auth.uid() is null then
    raise exception 'sessão obrigatória' using errcode = 'insufficient_privilege';
  end if;

  -- for update: duas pessoas abrindo o link ao mesmo tempo não ocupam a mesma vaga.
  select * into v_sala from public.salas_noite where id = p_sala for update;
  if not found then
    return 'inexistente';
  end if;
  if v_sala.expira_em <= now() then
    return 'expirada';
  end if;
  if v_sala.criador_id = auth.uid() then
    return 'criador';
  end if;
  if v_sala.convidado_id = auth.uid() then
    return 'convidado';
  end if;
  if v_sala.convidado_id is not null then
    return 'cheia';
  end if;

  update public.salas_noite set convidado_id = auth.uid() where id = p_sala;
  return 'convidado';
end;
$$;

comment on function public.entrar_sala_noite is 'Entra numa sala pelo link, se a vaga estiver livre e a sala não tiver expirado.';

-- Grava as respostas de quem chama, e só dele: a coluna sai de auth.uid(), nunca de parâmetro.
create function public.responder_sala_noite(
  p_sala uuid,
  p_humor text,
  p_experiencia text,
  p_companhia text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sala public.salas_noite;
  v_respostas jsonb;
begin
  select * into v_sala from public.salas_noite where id = p_sala for update;
  if not found or not public.participa_sala_noite(v_sala) then
    raise exception 'só quem está na sala responde' using errcode = 'insufficient_privilege';
  end if;
  if v_sala.expira_em <= now() or v_sala.resultado is not null then
    raise exception 'sala encerrada' using errcode = 'P0001';
  end if;
  if p_humor is null or p_humor not in ('cansado', 'animado', 'pra-baixo', 'nostalgico', 'ansioso', 'de-boa')
    or p_experiencia is null or p_experiencia not in ('rir', 'emocionar', 'susto', 'tenso', 'pensar', 'distrair')
    or p_companhia is null or p_companhia not in ('sozinho', 'a-dois', 'familia', 'amigos') then
    raise exception 'resposta inválida' using errcode = 'invalid_parameter_value';
  end if;

  v_respostas := jsonb_build_object('humor', p_humor, 'experiencia', p_experiencia, 'companhia', p_companhia);
  if auth.uid() = v_sala.criador_id then
    update public.salas_noite set respostas_criador = v_respostas where id = p_sala;
  else
    update public.salas_noite set respostas_convidado = v_respostas where id = p_sala;
  end if;
end;
$$;

comment on function public.responder_sala_noite is 'Grava as respostas de quem chama, enquanto a sala não expirou nem tem resultado.';

-- Para montar a sugestão: as respostas das duas pessoas, a união dos gêneros evitados e dos
-- streamings e os filmes que nenhuma das duas quer ver ("Já assisti" e reações; a sala é só de filmes).
create function public.restricoes_sala_noite(p_sala uuid)
returns table (
  respostas_criador jsonb,
  respostas_convidado jsonb,
  evitados int[],
  streamings int[],
  excluir int[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sala public.salas_noite;
  v_pessoas uuid[];
begin
  select * into v_sala from public.salas_noite where id = p_sala;
  if not found or not public.participa_sala_noite(v_sala) then
    raise exception 'só quem está na sala monta a sugestão' using errcode = 'insufficient_privilege';
  end if;
  if v_sala.expira_em <= now() or v_sala.respostas_criador is null or v_sala.respostas_convidado is null then
    raise exception 'a sala ainda não tem as duas respostas' using errcode = 'P0001';
  end if;

  v_pessoas := array[v_sala.criador_id, v_sala.convidado_id];
  return query
    select v_sala.respostas_criador,
           v_sala.respostas_convidado,
           coalesce((select array_agg(distinct g) from public.preferencias p, unnest(p.generos_evitados) g
                     where p.usuario_id = any (v_pessoas)), '{}'),
           coalesce((select array_agg(distinct s) from public.preferencias p, unnest(p.streamings) s
                     where p.usuario_id = any (v_pessoas)), '{}'),
           coalesce((select array_agg(distinct t.tmdb_id) from (
                       select l.tmdb_id from public.lista_itens l
                       where l.usuario_id = any (v_pessoas) and l.tipo = 'filme' and l.status = 'assistido'
                       union
                       select r.tmdb_id from public.reacoes r
                       where r.usuario_id = any (v_pessoas) and r.tipo = 'filme'
                     ) t), '{}');
end;
$$;

comment on function public.restricoes_sala_noite is 'Respostas e restrições somadas das duas pessoas, só para quem está na sala.';

-- Grava o resultado uma vez só e apaga as respostas, que deixam de valer. A sala fica pelo
-- menos mais 1 h, para as duas pessoas verem a sugestão. Devolve se gravou.
create function public.concluir_sala_noite(p_sala uuid, p_resultado jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sala public.salas_noite;
begin
  select * into v_sala from public.salas_noite where id = p_sala for update;
  if not found or not public.participa_sala_noite(v_sala) then
    raise exception 'só quem está na sala grava o resultado' using errcode = 'insufficient_privilege';
  end if;
  if v_sala.expira_em <= now() or v_sala.resultado is not null then
    return false;
  end if;
  if v_sala.respostas_criador is null or v_sala.respostas_convidado is null then
    raise exception 'a sala ainda não tem as duas respostas' using errcode = 'P0001';
  end if;
  if p_resultado is null or jsonb_typeof(p_resultado -> 'filmes') is distinct from 'array' then
    raise exception 'resultado inválido' using errcode = 'invalid_parameter_value';
  end if;

  update public.salas_noite
     set resultado = p_resultado,
         respostas_criador = null,
         respostas_convidado = null,
         expira_em = greatest(expira_em, now() + interval '1 hour')
   where id = p_sala;
  return true;
end;
$$;

comment on function public.concluir_sala_noite is 'Grava o filme sugerido (uma vez só) e apaga as respostas da sala.';

-- Funções são executáveis por public por padrão: só quem está logado usa.
revoke execute on function public.participa_sala_noite(public.salas_noite) from public, anon, authenticated;
revoke execute on function public.criar_sala_noite(int) from public, anon;
revoke execute on function public.entrar_sala_noite(uuid) from public, anon;
revoke execute on function public.responder_sala_noite(uuid, text, text, text) from public, anon;
revoke execute on function public.restricoes_sala_noite(uuid) from public, anon;
revoke execute on function public.concluir_sala_noite(uuid, jsonb) from public, anon;
grant execute on function public.criar_sala_noite(int) to authenticated;
grant execute on function public.entrar_sala_noite(uuid) to authenticated;
grant execute on function public.responder_sala_noite(uuid, text, text, text) to authenticated;
grant execute on function public.restricoes_sala_noite(uuid) to authenticated;
grant execute on function public.concluir_sala_noite(uuid, jsonb) to authenticated;

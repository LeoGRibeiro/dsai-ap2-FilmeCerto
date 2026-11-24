-- Filtro por idade (SPEC/2026-11-23-filtro-idade.md), que substitui o filtro de conteúdo de
-- 20261123190000_filtros_conteudo: sai o modo, e o limite passa a ser a opção do perfil.
-- 10 e 14: acima disso, a página abre com aviso; 18: só "Sem conteúdo +18". Em todas, +18 é
-- bloqueado. Sem linha, "Sem filtro". A idade de quem usa a conta continua sem ser guardada.

alter table public.filtros_conteudo drop column modo;
drop type public.modo_filtro_conteudo;

alter table public.filtros_conteudo rename column classificacao_max to limite;
alter table public.filtros_conteudo drop constraint filtros_conteudo_classificacao_max_check;

-- Limites da spec anterior, para nenhuma linha ficar fora da regra nova (a mais próxima e mais
-- restrita que eles).
update public.filtros_conteudo
   set limite = case when limite in ('L', '10', '12') then '10'
                     when limite = '14' then '14'
                     else '18' end;

alter table public.filtros_conteudo
  add constraint filtros_conteudo_limite_check check (limite in ('10', '14', '18'));

comment on table public.filtros_conteudo is 'Filtro por idade de cada conta; sem linha, "Sem filtro".';
comment on column public.filtros_conteudo.limite is 'Até 10 anos, até 14 anos ou sem conteúdo +18 (18). Em todas, títulos 18 são bloqueados.';

-- "Noite a dois": se qualquer um dos dois tem filtro, o resultado da sala não pode ter +18.
-- Diz só se algum dos dois tem filtro, nunca qual; quem não está na sala recebe false.
create function public.filtro_na_sala_noite(p_sala uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.salas_noite s
      join public.filtros_conteudo f on f.usuario_id in (s.criador_id, s.convidado_id)
     where s.id = p_sala
       and public.participa_sala_noite(s)
  );
$$;

comment on function public.filtro_na_sala_noite is 'Se algum participante da sala tem filtro por idade; só para quem está na sala.';

revoke execute on function public.filtro_na_sala_noite(uuid) from public, anon;
grant execute on function public.filtro_na_sala_noite(uuid) to authenticated;

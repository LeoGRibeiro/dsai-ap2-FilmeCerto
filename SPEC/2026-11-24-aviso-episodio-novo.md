# Aviso de episódio novo

- Data: 2026-11-24
- Componente: Séries / Notificações / Supabase
- Status: Proposta
- Substitui: Nenhuma
- Issue: #45

## O quê

Permitir que usuários acompanhem séries e recebam avisos dentro do FilmeCerto quando novos episódios tiverem estreia prevista.

O sistema deverá registrar acompanhamentos por usuário, identificar novos episódios disponíveis no TMDB e apresentar avisos sem duplicidade.

## Por quê

A funcionalidade complementa a seção 3.5 — Suporte completo a séries — de `docs/ap2/pedido-do-cliente.md`.

A página de detalhes já apresenta informações sobre o próximo episódio. Esta implementação acrescenta acompanhamento persistente e avisos individualizados.

## Decisões técnicas

| Decisão | Abordagem |
|---|---|
| Acompanhamento | Registrar usuário e identificador da série do TMDB no Supabase. |
| Avisos | Persistir série, temporada, episódio, data prevista e estado de leitura. |
| Duplicidade | Restrição única por usuário e episódio identificado. |
| Segurança | RLS para garantir acesso somente aos dados do próprio usuário. |
| Fonte de dados | Reutilizar o cliente TMDB existente e validar os dados recebidos. |
| Verificação periódica | Investigar mecanismo compatível com a infraestrutura de produção; não depender de execução no navegador. |
| Falhas externas | Tratar indisponibilidade, limites do TMDB e datas ausentes sem gerar avisos incorretos. |
| Datas alteradas | Atualizar a previsão do episódio sem criar avisos duplicados. |
| Apresentação | Disponibilizar avisos no aplicativo, com opção de marcar como lidos. |

## Banco de dados

Criar migrations novas, sem modificar migrations antigas.

As tabelas de acompanhamento e avisos deverão:
- possuir vínculo com o usuário autenticado;
- possuir políticas RLS para leitura e alteração restritas ao proprietário;
- possuir restrições de integridade e unicidade para impedir duplicidades;
- possuir índices adequados às consultas por usuário e estado de leitura.

Atualizar `src/lib/supabase/database.types.ts` conforme o esquema final.

## Critérios de aceitação

1. Usuário autenticado consegue acompanhar uma série.
2. Usuário consegue deixar de acompanhar uma série.
3. Usuário consulta somente seus próprios acompanhamentos e avisos.
4. Um episódio gera no máximo um aviso por usuário.
5. O aviso apresenta nome da série, temporada, episódio e data prevista.
6. O aviso pode ser marcado como lido.
7. Alterações na data prevista atualizam o aviso sem duplicá-lo.
8. Episódios sem data e séries sem próximo episódio não geram avisos incorretos.
9. Falhas e limites do TMDB são tratados sem comprometer os dados persistidos.
10. A verificação periódica pode ser executada em produção por mecanismo documentado e testável.
11. Existem testes unitários, de integração/RLS e E2E para os fluxos implementados.
12. Migrations, políticas RLS e tipos do banco estão atualizados.

## Fora do escopo

- Notificações por e-mail, SMS ou push.
- Criar novo catálogo ou carrossel de séries.
- Alterações não relacionadas ao acompanhamento de séries.

## Pergunta para o cliente

A seção 3.5 do pedido não especifica o canal dos avisos. A decisão conservadora é apresentar notificações exclusivamente dentro do aplicativo. Confirmar se esse comportamento atende à necessidade.

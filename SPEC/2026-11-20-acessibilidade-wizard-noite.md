# Acessibilidade do wizard da noite

**Data:** 2026-11-20
**Componente:** Wizard `/noite`
**Status:** Proposta
**Substitui:** Nenhuma

## O quê

Melhorar a acessibilidade do wizard `/noite`, com atenção à navegação por teclado, ao gerenciamento do foco nas mudanças de etapa e à comunicação dos estados dinâmicos para tecnologias assistivas.

A implementação deve aproveitar os recursos já existentes e corrigir somente as lacunas identificadas.

## Por quê

Atende à seção **3.2 — Wizard "O que ver hoje?"** de `docs/ap2/pedido-do-cliente.md`.

O fluxo deve oferecer uma experiência simples e acessível, permitindo que pessoas com diferentes formas de interação respondam às perguntas e compreendam as recomendações.

## Decisões técnicas

| Área | Decisão |
|---|---|
| Navegação por teclado | Preservar links e botões nativos e garantir acesso às ações do wizard sem mouse. |
| Indicador de foco | Preservar os indicadores `focus-visible` e corrigir eventuais lacunas nos controles interativos. |
| Mudança de pergunta | Aproveitar o anúncio de navegação do Next.js, que utiliza o título da página ou o primeiro `h1`. |
| Etapa "Esse não" | Ao abrir os motivos, posicionar o foco no primeiro motivo disponível. |
| Etapa "Já vi" | Ao abrir a confirmação, posicionar o foco em seu título para contextualizar a nova etapa. |
| Confirmação da escolha | Preservar o `role="status"` existente em "Boa sessão!". |
| Erros | Preservar os anúncios existentes com `role="alert"`. |
| Carregamento | Preservar o `role="status"` existente no esqueleto de carregamento. |
| Testes | Ampliar os testes unitários existentes para verificar foco, teclado e anúncios, sem duplicar testes de regras de negócio. |

## Banco de dados

Nenhuma alteração necessária.

## Critérios de aceitação

1. O fluxo principal pode ser utilizado somente com teclado.
2. Os elementos interativos possuem indicadores de foco visíveis.
3. Ao abrir os motivos de "Esse não", o foco é direcionado ao primeiro motivo.
4. Ao selecionar "Já vi", o foco é direcionado ao título da etapa de confirmação.
5. A navegação entre perguntas continua identificável por tecnologias assistivas.
6. A confirmação "Boa sessão!" continua sendo anunciada por uma região de status.
7. Mensagens de erro continuam sendo anunciadas por uma região de alerta.
8. Não são introduzidos anúncios duplicados ou desnecessários.
9. Os testes automatizados verificam os comportamentos de acessibilidade implementados.
10. Os seguintes comandos são executados com sucesso:
    - `pnpm lint`
    - `pnpm typecheck`
    - `pnpm test`
    - `pnpm check:secrets`

## Fora do escopo

- Alterar regras ou filtros de recomendação.
- Modificar o armazenamento das respostas do wizard.
- Redesenhar as telas ou adicionar etapas.
- Alterar o fluxo da "Noite a dois", salvo necessidade de compatibilidade em componentes compartilhados.
- Reescrever componentes que já atendem aos critérios de acessibilidade.

**Agent:** none

# Solicitação de novo item por participante remoto

## Interface e contrato

Na Compra em andamento, `contextoUsuario.podeSolicitarItemRemoto === true`
exibe **+ Solicitar novo item** no lugar da inclusão direta. O modal reutiliza
`AdicionarItemCompraDialog`, `ItemFieldsForm` e o autosuggest da família/lista.
Não aceita marca/observações, pois não fazem parte deste contrato.

Envia somente `descricao`, `quantidade` e `unidadeMedida` para
`POST /api/compras/{compraId}/solicitacoes-itens`, esperando `201`.
Descrição usa o trim existente e limita-se a 200 caracteres. Quantidade/unidade
são opcionais (null); quantidade informada deve ser positiva, com até três casas
decimais, conforme o contrato backend. O fluxo presencial mantém seus defaults.

O feedback confirma **Solicitação enviada**. `SolicitacoesItensCompra` mostra os
pedidos próprios como **Aguardando aprovação**, com descrição e quantidade/unidade.
A identidade do participante só filtra os pedidos próprios, nunca concede acesso.

`contextoUsuario.podeDecidirSolicitacoesItens === true` exibe todas as pendentes,
com o nome histórico do solicitante e ações **Recusar** / **Aprovar**. Papel familiar
e presença isolada não concedem permissão. As duas decisões usam `POST` em
`/api/compras/{compraId}/solicitacoes-itens/{id}/recusar|aprovar`, esperando `200`.

As pendências vêm exclusivamente de `CompraResponse.solicitacoesItensPendentes`.
Não há GET periódico da coleção, timer novo, websocket ou estado permanente paralelo.
O polling de cinco segundos da Compra segue o mesmo mecanismo, com proteção contra
respostas antigas, pausa offline/aba oculta e serialização de comandos.

Após o POST, um GET da Compra pelo helper existente reconcilia a representação:
aprovadas/recusadas saem da coleção e somente o item criado pelo backend aparece
na lista normal como PENDENTE. Nenhum ItemCompra é construído no frontend.
Falha do POST preserva formulário/pedido e exibe erro; `401` segue o logout atual.
Duplo envio é bloqueado por ref/estado e os controles ficam desabilitados.

Se o POST confirmar e somente o GET falhar, informa-se que a operação foi confirmada,
bloqueando novo comando deste fluxo até **Atualizar compra** ou o polling recuperar
o snapshot. Isso evita reenviar uma criação/decisão já concluída.

Reutilizados os limites em `dvh`, scroll interno, ações sticky, safe area, foco de
retorno e bloqueio de fechamento durante envio. Os cards têm ações com área mínima
de toque e feedback `status`/`alert`/`aria-busy`. Não foi possível realizar inspeção
visual real de viewport/teclado: nenhum navegador estava conectado nesta sessão.

Nenhuma mudança no backend, regras de carrinho, presença, responsabilidade ou remoção.

## Validação

- `npx.cmd vitest run tests/solicitacao-item-remoto.test.tsx`: 24 testes verdes.
  Cobrem capabilities, presença, identidade, payload, autosuggest, validação,
  pendências, aprovação/recusa, refresh, erros, duplo clique, 401 e timer único.
- TypeScript da aplicação (`tsc -b` e `tsc -p tsconfig.app.json --noEmit --incremental false`): aprovado.
- `npm.cmd run lint`: aprovado, apenas warning preexistente
  `react(set-state-in-effect)` em `MinhaContaPage.tsx:23`.
- `npm.cmd run build`: aprovado, apenas aviso preexistente de chunk maior que 500 kB.
- `npm.cmd test`: bloqueado na checagem de tipos dos testes pelos dois erros abaixo,
  reproduzidos no HEAD original. A suíte runtime foi executada diretamente com Vitest.
- `git diff --check`: aprovado.

## Falhas preexistentes comprovadas

Comparação com cópia temporária integral do HEAD original **bb0bc8c**, usando as
mesmas dependências, configuração e comandos. Não houve alteração nos testes antigos
nem desabilitação de testes. Os relatórios JSON foram comparados por arquivo e nome
de caso: **nenhuma falha nova**.

TypeScript dos testes possui os mesmos dois erros em ambos os estados:

- `alerta-continuidade-compra.test.tsx:40`: estado inferido não admite
  `AlertaContinuidadeCompraResponse | null`.
- `inicio-listas-ativas.test.tsx:54`: fixture `string[]` não tipada como `Status[]`.

Runtime original: 373 casos, 342 passaram, 31 falharam.
Runtime desta entrega: 397 casos, 366 passaram, as mesmas 31 falharam.

Distribuição das falhas antigas, sem alteração de seus casos:

| Arquivo de teste | Falhas |
| --- | ---: |
| compra-encerramento-administrativo.test.tsx | 1 |
| compra-finalizacao.test.mjs | 1 |
| compra-finalizada-aviso.test.tsx | 1 |
| compra-polling.test.tsx | 2 |
| compra-remocao-direta.test.tsx | 2 |
| item-lista-remocao.test.tsx | 2 |
| lista-contador-itens.test.tsx | 3 |
| lista-criador.test.tsx | 1 |
| lista-dados-basicos.test.tsx | 9 |
| lista-estimativa-preco.test.tsx | 1 |
| lista-participantes.test.tsx | 1 |
| lista-permissao-iniciar-compra.test.tsx | 1 |
| lista-polling.test.tsx | 1 |
| presenca-operacional.test.tsx | 3 |
| reaproveitar-itens-fora.test.tsx | 1 |
| reutilizar-lista.test.tsx | 1 |

Os mesmos avisos de lint/build também foram reproduzidos no original.

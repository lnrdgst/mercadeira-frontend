# Marco Compra 4 — Restauração de ItemCompra

Checkpoint concluído: implementação do frontend conforme o contrato definitivo do backend e validação manual aprovada pelo usuário em 13/09/2026.

## Integração visual

A ação operacional permanece em `/listas/:listaId/compra`, dentro do `ItemCompraCard`. O item `REMOVIDO` conserva descrição atenuada, badge e auditoria da remoção. Quando `item.acoes.podeRestaurarNoCarrinho` é `true`, o card mostra “Restaurar ao carrinho”. A revisão e o resumo final permanecem somente leitura.

Enquanto o POST está em andamento, o card apresenta feedback e desabilita suas ações. A trava síncrona impede duplo clique antes da atualização do React.

## Contrato e tipos

`AcoesItemCompraResponse` inclui `podeRestaurarNoCarrinho`. `ItemCompraResponse` inclui `restauracao`, nula ou composta por `restauradoPor` e `restauradoEm`. A referência do participante mantém `participanteCompraId`, `membroFamiliaId`, `usuarioId` e o nome histórico retornado pelo backend.

O frontend usa exclusivamente a capability para apresentar a ação. Não reconstrói autorização por papel, participação inferida, usuário atual ou autoria da remoção.

## API e atualização local

O comando usa:

`POST /api/familias/{familiaId}/listas/{listaId}/compra/itens/{itemCompraId}/restaurar-no-carrinho`

A requisição usa Bearer JWT e não contém body. O service exige `200 OK` com `ItemCompraResponse` completo; `201`, `204` e resposta vazia não confirmam sucesso. O response substitui integralmente o item com o mesmo id. O frontend não altera manualmente status, restauração ou responsável operacional.

Replay autorizado é tratado como sucesso normal. Não há mensagem, retry ou interface específica de replay.

## Estado e auditoria

Após sucesso, o estado retornado é `NO_CARRINHO`. O card volta ao visual normal e renderiza `colocadoNoCarrinhoPor` e `colocadoNoCarrinhoEm` atuais. Também mantém a auditoria aprovada em `remocao` e exibe “Restaurado por {nome} · {data/hora}” a partir de `restauracao`.

O frontend representa apenas o ciclo atual/mais recente de remoção e a última restauração presentes no response. Novos ciclos substituem naturalmente esses campos; nenhum histórico adicional é armazenado ou inferido.

## Concorrência e recuperação

Erros seguem a infraestrutura HTTP existente. `401` encerra a sessão mesmo sem JSON. `403` e `404` usam a mensagem disponível ou o fallback genérico, sem revelar regras inferidas.

Em `409`, o card apresenta feedback e chama o GET da Compra. O item é reconciliado com a resposta atual; se a Compra já estiver `FINALIZADA`, a página adota a Compra completa e remove os controles. O fluxo não compara o texto da mensagem para decidir a reconciliação.

O GET em `/api/familias/{familiaId}/listas/{listaId}/compra` continua sendo a fonte de verdade para acesso direto e F5. Status, responsável atual, remoção, restauração e capabilities são sempre renderizados a partir dele.

## Compra finalizada

`CompraResumo` usa o card em modo somente leitura. Assim, nenhuma ação de restauração aparece em `FINALIZADA`, enquanto as auditorias retornadas continuam visíveis.

## Testes

Os testes de Compra cobrem capability verdadeira e falsa, POST sem body e com Bearer, resposta completa, replay 200, rejeição de 201/204/body vazio, preservação dos status 401/403/404/409, auditoria de remoção, auditoria de restauração, responsável operacional, renderização equivalente ao GET/F5 e ausência de mutações no resumo final.

## Validação

Build, lint e os 19 testes frontend foram aprovados na execução anterior. Não foram repetidos neste checkpoint, pois não houve correção de código.

Em 13/09/2026, o usuário informou que todos os seis cenários do roteiro manual passaram: restauração com atualização de estado/responsável/auditorias; proteção contra duplo envio; F5; novo ciclo e segunda restauração; POST 409 seguido de GET após finalização em outra aba; e FINALIZADA após F5 sem ações. O teste com outro participante era opcional no roteiro e não recebeu confirmação individual.

Esta evidência é relato de validação manual do usuário, não execução automatizada observada pelo agente. Replay permanece coberto pelos testes simulados frontend e pelos testes backend descritos em `docs/contratos-compra-4.md`; não houve relato separado de replay manual. A automação integrada reproduzível continua no backlog, sem impedir o fechamento deste marco.

## Git

Sem commit e sem push. Alterações mantidas no working tree para revisão.

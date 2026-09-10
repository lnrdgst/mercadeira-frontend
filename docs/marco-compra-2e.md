# Marco Compra 2E — Remoção controlada

Implementação concluída no frontend. Build, lint e sete testes locais passaram. A validação manual com backend real permanece pendente: o backend configurado em `http://localhost:8080` não respondeu e o Browser não encontrou navegador conectado nesta sessão.

## Arquivos investigados

- `src/features/shopping/pages/CompraAndamentoPage.tsx`: GET, contexto, atualizações funcionais e lista de cards.
- `src/features/shopping/types/shopping.ts`: CompraAtivaResponse, ItemCompraResponse e referências de autoria.
- `src/features/shopping/api/shoppingApi.ts`: caminhos REST, identidade operacional e respostas completas.
- `src/features/shopping/components/ItemCompraCard.tsx`: loading, trava síncrona, autoria e erros por item.
- `src/features/shopping/components/IniciarCompraButton.tsx`: padrão de confirmação com dialog nativo.
- `src/shared/api/apiClient.ts`: Bearer JWT, POST sem body e erro por status HTTP.
- `src/app/layouts/TransactionalShell.tsx`: estrutura transacional preservada.
- `src/index.css`: tokens, contraste, espaçamento e alvos de toque.
- `docs/prototipo-stitch/mercadeira-stitch/compra_em_andamento_carrefour/code.html` e `screen.png`: referência visual.
- `README.md`, `package.json`, `vite.config.ts` e `.env.development`: documentação, validações e destino da API.

Não foi necessário criar componente, biblioteca ou modificar o shell. Os novos estados cabem no card existente.

## Arquivos criados

- `tests/compra-remocao.test.mjs`: testes de contrato HTTP com fetch simulado e renderização estática React.
- `docs/marco-compra-2e.md`: este relatório.

## Arquivos alterados

- `src/features/shopping/types/shopping.ts`
- `src/features/shopping/api/shoppingApi.ts`
- `src/features/shopping/pages/CompraAndamentoPage.tsx`
- `src/features/shopping/components/ItemCompraCard.tsx`
- `README.md`

## Tipos adicionados

`ReferenciaParticipanteCompra`, `AcoesItemCompraResponse`, `RemocaoItemCompraResponse` e `AcaoRemocaoItemCompra`. `AutorItemCompraResponse` reutiliza a referência por alias. ItemCompraResponse contempla os quatro estados, `remocao` anulável e `acoes` obrigatória.

## Capabilities por item

Solicitar usa exclusivamente `item.acoes.podeSolicitarRemocao === true`; aprovar/rejeitar usam exclusivamente `item.acoes.podeDecidirRemocao === true`. Não há inferência por identidade, autor, administrador ou participante. Participação continua sendo usada somente nas ações preexistentes de inclusão/carrinho.

## Solicitar remoção

POST em `.../compra/itens/{itemCompraId}/solicitar-remocao`, com Bearer e sem body. Loading e trava síncrona do card impedem mutações concorrentes no mesmo item. Outros itens continuam disponíveis.

As ações são diretas, com rótulos explícitos. Após avaliar o dialog existente e o Stitch, optou-se por não acrescentar confirmações neste fluxo de remoção lógica: o item permanece visível e as ações de solicitação e decisão são distintas. Não há ícone ambíguo de exclusão.

## Autoaprovação

A resposta de solicitar pode trazer diretamente REMOVIDO e APROVADA. O frontend renderiza o response completo e não cria etapa intermediária nem segunda chamada de aprovação.

## Aprovar

POST em `.../aprovar-remocao`, sem body. O item retornado substitui integralmente o anterior. Não são construídos status, auditoria ou capabilities no cliente.

## Rejeitar

POST em `.../rejeitar-remocao`, sem body. O response pode voltar a NO_CARRINHO mantendo decisão REJEITADA; essa auditoria continua visível.

## Estado REMOCAO_SOLICITADA

Badge “Remoção solicitada”, fundo/borda de atenção e informação de solicitante/data no card. Aprovar e rejeitar aparecem conforme capability. Corrigida a condição anterior que tratava qualquer estado diferente de NO_CARRINHO como disponível para colocar no carrinho: agora essa ação preexistente exige PENDENTE.

## Estado REMOVIDO

Item permanece na coleção, na contagem e na ordenação existentes. Badge “Removido”, descrição riscada e superfície atenuada distinguem o estado mantendo a legibilidade. Não há filtro ou exclusão física.

## Histórico do ciclo

O card exibe solicitação e decisão disponível, com nomes históricos e timestamps em PT-BR usando elementos `time`. Não consulta nomes atuais nem cria histórico paralelo. A autoria original do carrinho permanece visível nos novos estados.

## Nova solicitação após rejeição

O botão reaparece quando o response trouxer podeSolicitarRemocao=true, inclusive com decisão REJEITADA. O próximo response substitui o ciclo anterior, sem limpar campos manualmente.

## Atualização local

POST bem-sucedido substitui o ItemCompra completo pelo mesmo `id` com atualização funcional. Não dispara GET. Proteções de contexto, Compra e token evitam aplicar resposta em outro contexto/sessão. Não há persistência de capabilities.

## Replay

200 é tratado como sucesso usando a resposta recebida, sem botões especiais, retry automático ou regra local sobre validade de replay. Capabilities determinam apenas as ações oferecidas na UI normal.

## Concorrência / 409

Qualquer mutação do card que retorna HTTP 409 apresenta feedback e aguarda GET da Compra, reconciliando o item afetado com o estado do servidor. O GET não desmonta a tela nem sobrescreve respostas de outros cards. Nenhuma decisão de fluxo compara mensagem textual.

Se o GET falhar, novas mutações do card ficam suspensas e “Atualizar item” permite repetir somente a consulta. O feedback explica a falha; 401 encerra a sessão. Erros 403/404 permanecem no card com mensagem do backend. A trava por item também cobre o período de reconciliação.

A corrida real entre dois usuários e a interação de retry ainda exigem validação manual; os testes locais não simulam eventos de navegador.

## GET / F5

O GET permanece fonte de verdade na entrada/reload e inclui todos os itens, estados, auditoria e capabilities. A renderização não depende de mutação anterior. Ao mudar o token, os dados antigos deixam de ser apresentados enquanto a nova consulta carrega.

## Observador

Com capabilities falsas, não há ações de remoção, independentemente do papel familiar. Estado e auditoria continuam visíveis. Testes locais cobrem ausência de ações tanto para observador quanto para participante com capabilities falsas.

## Uso do Stitch

Foram inspecionados o PNG e o HTML exportados. O destaque de “Removal Requested” foi adaptado para os tokens de atenção existentes, badge em PT-BR e ações dentro do card. Mantidos layout mobile-first, botões empilhados em telas pequenas, alvos de toque e foco visível. Não foi copiado HTML bruto nem acrescentado resumo/finalização do protótipo.

## Funcionalidades adiadas

Finalização, realtime/WebSocket/STOMP, notificações, histórico de múltiplos ciclos, timeline, entrada/saída tardia, reordenação, edição, exclusão física e desfazer remoção aprovada permanecem fora deste marco.

## Build

`npm.cmd run build`: aprovado (TypeScript e Vite). Usado o executável `.cmd` porque a política do PowerShell bloqueia `npm.ps1`, sem alterar políticas da máquina.

## Lint

`npm.cmd run lint`: aprovado. `git diff --check`: sem erros de whitespace.

## Dev

`npm.cmd run dev -- --host 127.0.0.1`: iniciou em `http://127.0.0.1:5173/`, com HTTP 200 confirmado. Isso valida o servidor de desenvolvimento, não o fluxo autenticado.

## Testes manuais

Nenhuma suíte de testes existia no projeto. Foram adicionados e executados sete testes locais com `node --test tests/compra-remocao.test.mjs`, todos aprovados:

1. Caminhos, ItemCompra.id, Bearer, ausência de body e respostas completas dos três POSTs, incluindo autoaprovação.
2. Propagação de status HTTP 401, 403, 404 e 409 independentemente da mensagem.
3. Solicitação por capability após rejeição, com auditoria preservada.
4. Aprovar/rejeitar por capability sem inferência de participação.
5. Capabilities falsas ocultam botões e preservam auditoria e timestamp.
6. Removido permanece renderizado com badge, autoria e timestamp.
7. Regressão de carrinho: somente pendente e participante recebem a ação.

São testes com HTTP simulado e renderização estática, sem comprovação de fluxo interativo/F5 ou integração real. Backend local não respondeu e a descoberta de navegadores retornou lista vazia. Roteiro A–J pendente para ambiente integrado:

| Caso | Validação real necessária | Situação |
| --- | --- | --- |
| A | Outro participante solicita e recebe REMOCAO_SOLICITADA | Pendente |
| B | Responsável recebe podeDecidirRemocao=true e vê as decisões | Pendente |
| C | Participante sem responsabilidade visualiza sem decidir | Pendente |
| D | Aprovação mantém REMOVIDO e decisor visíveis | Pendente |
| E | Rejeição mantém auditoria e permite nova solicitação por capability | Pendente |
| F | Solicitação pelo responsável retorna REMOVIDO diretamente | Pendente |
| G | F5 recupera pendência, aprovação e rejeição com timestamps | Pendente |
| H | Observador/administrador não participante vê auditoria sem ações | Pendente |
| I | Decisões concorrentes produzem 409 e GET apresenta vencedor | Pendente |
| J | REMOVIDO permanece após F5 | Pendente |

## Git

Sem commit e sem push. Alterações permanecem no workspace para revisão.

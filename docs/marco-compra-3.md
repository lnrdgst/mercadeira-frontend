# Marco Compra 3 — Revisão e Finalização

Implementação do frontend concluída. A revisão usa GET próprio, finalização por capability e resposta completa do backend. A validação interativa com backend real permanece pendente: backend e dev acessíveis, porém nenhum navegador/sessão autenticada disponível para automação nesta execução.

## Arquivos investigados

Páginas CompraAndamentoPage, CompraRevisaoPage (placeholder), ListasPage e ListaDetalhePage; tipos shopping.ts; shoppingApi.ts; AppRouter.tsx; TransactionalShell.tsx; ItemCompraCard, IniciarCompraButton e AdicionarItemCompraDialog; apiClient.ts; package.json; testes de remoção; README; PNG e HTML do Stitch em `docs/prototipo-stitch/mercadeira-stitch/resumo_da_compra/`.

A rota antiga só era referenciada pelo router e pela documentação, sem links funcionais no código. O shell existente já atende à revisão. A confirmação segue o dialog nativo usado para iniciar a Compra.

## Arquivos criados

- `src/features/shopping/components/CompraResumo.tsx`
- `tests/compra-finalizacao.test.mjs`
- `docs/marco-compra-3.md`

## Arquivos alterados

- `src/features/shopping/types/shopping.ts`
- `src/features/shopping/api/shoppingApi.ts`
- `src/features/shopping/pages/CompraAndamentoPage.tsx`
- `src/features/shopping/pages/CompraRevisaoPage.tsx`
- `src/features/shopping/components/ItemCompraCard.tsx`
- `src/features/shopping-lists/pages/ListasPage.tsx`
- `src/app/router/AppRouter.tsx`
- `README.md`

## Tipos Compra

CompraAtivaResponse foi renomeado localmente para CompraResponse. Status aceita somente EM_ANDAMENTO e FINALIZADA. Adicionados finalizadaPor (ReferenciaParticipanteCompra ou null), finalizadaEm (string ou null) e contextoUsuario.podeFinalizarCompra (boolean). Campos e estados de ItemCompra preservados.

## Rota de revisão

`/listas/:listaId/compra/revisao`, no TransactionalShell. Substitui `/compras/:compraId/revisao`; não foi mantido alias que confundisse compraId com listaId. GET usa família selecionada e listaId da rota. A página isola estado por família, lista e token, descartando respostas após desmontagem.

## Revisão como UX

“Revisar compra” está disponível para quem consulta a Compra. Revisão não cria estado de domínio, não envia mutações de itens e não congela a Compra. O badge permanece Em andamento até o backend responder FINALIZADA.

## Resumo dos itens

Contagem total e quatro categorias, seguidas dos grupos completos, ordenados por ordemExibicao dentro de cada grupo. Sem truncar itens ou calcular dinheiro. ItemCompraCard foi ampliado com modo somenteLeitura tipado, sem callbacks de mutação nesse modo. Esse modo preserva descrições, quantidades, marcas, observações e auditoria.

## PENDENTE

Grupo Não comprados e aviso antes de finalizar. O frontend não converte status; PENDENTE permanece no response e no resumo final.

## NO_CARRINHO

Grupo Comprados. A autoria original do carrinho permanece visível. Nenhuma conversão após finalizar.

## REMOVIDO

Grupo Removidos, com descrição atenuada/riscada e auditoria preservada. Continua na contagem e na coleção. Não constitui bloqueio local de finalização.

## REMOCAO_SOLICITADA

Grupo Remoção pendente e aviso destacado para voltar à Compra e resolver. O contrato do backend fornece capability falsa nesse cenário; a varredura de itens serve somente para apresentar o aviso.

## Capability podeFinalizarCompra

O CTA usa exclusivamente `compra.contextoUsuario.podeFinalizarCompra === true`. Não combina participação, papel, criador, autor, quantidade ou status de item para determinar autorização. Loading e falha de reconciliação impedem envio enquanto a operação está em curso ou os dados precisam ser recuperados.

## Confirmação

Dialog nativo explica encerramento, pendentes não comprados e impossibilidade de alterar os itens depois. Cancelar fecha sem request. Confirmar finalização usa trava síncrona e loading. Cancelamento por Escape é impedido durante o envio. Foco retorna ao CTA ou ao título quando o CTA deixa de existir.

## POST finalizar

`POST /api/familias/{familiaId}/listas/{listaId}/compra/finalizar`, Bearer JWT, sem body. Service exige 200 com body; 201 e sucesso vazio não são aceitos como finalização confirmada. Resposta substitui a Compra local inteira, incluindo itens, status, capabilities e autoria. Não dispara GET no sucesso.

## Replay

200 é sucesso tanto na primeira finalização quanto no replay autorizado. A autoria/data vêm exclusivamente do response. Não há retry automático nem interface especial. Falhas permitem nova tentativa explícita; um replay pode recuperar a Compra já finalizada.

## Estado FINALIZADA

A revisão permanece aberta como resumo e informa Compra finalizada. A rota da Compra também renderiza CompraResumo somente leitura quando GET retorna FINALIZADA, sem redirecionamento ou loop. Não oferece inclusão, carrinho ou remoção. O contrato retorna podeFinalizarCompra=false, retirando o CTA normal de finalização.

Na reconciliação de um card em 409, se GET revelar FINALIZADA, a página adota a Compra completa para encerrar os controles. Respostas tardias de itens não sobrescrevem esse estado final.

## finalizadaPor/finalizadaEm

Exibe “Finalizada por {nome}” e data/hora em PT-BR usando `time`. A referência histórica do backend é usada diretamente; não se consulta nome atual.

## GET/F5

Revisão faz GET na montagem, sem depender de navigation state. GET de Compra FINALIZADA é tratado normalmente e preserva todos os grupos e auditoria. F5 interativo ainda precisa ser validado no navegador real.

## Minhas Listas

Ao retornar, a página mantém sua consulta própria. FINALIZADA oferece “Ver resumo” apontando para a nova rota. EM_COMPRA mantém “Ver compra” e EM_PREPARACAO mantém “Abrir lista”. Não há histórico agregado implementado.

## Concorrência/409

POST 409 apresenta mensagem e executa GET da Compra, substituindo a revisão completa pelo estado vigente. Dialog fecha para permitir ler o resumo reconciliado. Se GET falhar, o feedback orienta “Atualizar compra” e novas finalizações ficam suspensas até a consulta ter sucesso. Não há resultado local presumido nem comparação de mensagem para decidir fluxo.

## Erros

401 chama logout, inclusive sem JSON. O cliente HTTP existente já suporta corpo vazio/inválido. 403/404/409 preservam mensagem do envelope quando disponível. GET 404 informa Compra indisponível e permite tentar consultar novamente. Nenhum novo endpoint ou código de autorização foi inventado.

## Stitch

PNG e HTML do resumo foram inspecionados antes da implementação. Adotadas contagens, hierarquia de grupos, destaque de pendências e CTA claro, com tokens e PT-BR do projeto. Os cards existentes preservam a identidade visual. Decisões de remoção continuam na Compra; a revisão orienta voltar. Não foram copiados HTML, fotos fictícias, edição sem contrato, promessa de histórico ou informações financeiras do protótipo.

## Funcionalidades adiadas

Reabertura, cancelamento operacional, realtime/WebSocket/STOMP, notificações, histórico agregado ou de múltiplos ciclos, pagamento, preços e mutações após FINALIZADA. Nenhum estado adicional de revisão foi criado.

## Build

`npm.cmd run build`: aprovado, TypeScript e Vite. Executável `.cmd` usado para compatibilidade com a política de scripts do PowerShell.

## Lint

`npm.cmd run lint`: aprovado.

## Testes

Sete testes existentes de remoção passaram. Sete novos testes locais cobrem:

1. POST/replay com Bearer, sem body, preservando Compra completa e sem GET automático no service.
2. GET de FINALIZADA com itens e auditoria.
3. Erros 401 sem JSON e 403/404/409 com envelope.
4. Rejeição de 200 vazio, 204 e 201 na finalização.
5. Resumo final com grupos, autoria, timestamps e nenhuma mutação, mesmo se uma fixture fornecer capabilities de item verdadeiras.
6. Avisos de pendentes/remoções preservando status e capabilities da entrada.
7. Apresentação de `REMOCAO_SOLICITADA` como bloqueio visual, mantendo `podeFinalizarCompra` como fonte da autorização.

São testes com HTTP simulado e renderização estática; não comprovam execução real de replay no backend, cliques, focus, F5 ou corrida 409. Dev respondeu HTTP 200 em `http://127.0.0.1:5173/`; backend respondeu 401 sem JWT em `http://localhost:8080/api/familias`. Browser retornou lista vazia de navegadores.

Roteiro manual A–K pendente por ausência de navegador/sessão autenticada: revisão normal; PENDENTE; REMOVIDO; remoção pendente/capability; confirmação e finalização; F5; preservação dos estados dos itens; ausência de mutações; acesso por listas; replay; 409 com reconciliação. Também pendentes a validação visual mobile/teclado e duplo clique em ambiente integrado. Nenhuma mutação real foi enviada nesta validação.

## Git

Sem commit e sem push. Alterações mantidas no workspace para revisão.

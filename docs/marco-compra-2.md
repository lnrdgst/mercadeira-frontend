# Marco Compra 2 — Interação com itens

## Arquivos investigados

Página `CompraAndamentoPage.tsx`, tipos `shopping.ts`, API `shoppingApi.ts`, formulário de preparação `ItemForm.tsx`, `TransactionalShell.tsx`, `apiClient.ts`, `familyContext.ts`, protótipo Stitch `compra_em_andamento_carrefour/code.html` e scripts em `package.json`. Os cards estavam inline na página; o GET mantinha a Compra no estado `resultado`, identificado por família/lista/tentativa.

## Arquivos criados

- `src/features/shopping/components/ItemCompraCard.tsx`
- `src/features/shopping/components/AdicionarItemCompraDialog.tsx`
- `src/shared/components/ItemFieldsForm.tsx`
- `docs/marco-compra-2.md`

## Arquivos alterados

- `src/features/shopping/types/shopping.ts`
- `src/features/shopping/api/shoppingApi.ts`
- `src/features/shopping/pages/CompraAndamentoPage.tsx`
- `src/features/shopping-lists/components/ItemForm.tsx`

## Tipos ItemCompra

Status limitados a PENDENTE e NO_CARRINHO. Adicionados `AutorItemCompraResponse`, `adicionadoPor`, `adicionadoEm`, `colocadoNoCarrinhoPor` e `colocadoNoCarrinhoEm`, com nullables previstos. Campos anteriores preservados. `AdicionarItemCompraRequest` permanece específico da Compra.

## Colocar no carrinho

POST sem body em `/api/familias/{familiaId}/listas/{listaId}/compra/itens/{itemCompraId}/colocar-no-carrinho`. A identidade enviada é `ItemCompra.id`. O retorno completo substitui o item local; não há GET após a mutação. Estado No carrinho tem badge verde e não oferece desfazer.

## Idempotência

API aceita o 200 de execução ou replay. Autoria e timestamp são os retornados pelo backend. Não há chave de idempotência, alteração otimista de status ou repetição automática de POST.

## Loading por item

Cada card mantém sua própria ref síncrona de exclusão de chamadas, loading e erro. Um envio não bloqueia outros cards. Botão com área de toque confortável e texto de andamento.

## Adicionar item

Dialog nativo com nome acessível, campos comuns e retorno de foco/scroll ao fechar. POST `/api/familias/{familiaId}/listas/{listaId}/compra/itens` envia explicitamente apenas descrição, quantidade, unidade, marca e observações. O ItemCompra retornado pelo 201 é incluído localmente; renderização respeita `ordemExibicao` do backend.

O formulário compartilhado contém somente valores editáveis e apresentação. O wrapper de preparação mantém seu request e tipo de ItemLista; o dialog da Compra usa `AdicionarItemCompraRequest`. Não há conversão de ItemLista em ItemCompra.

## Proteção contra duplo submit

Ref síncrona impede segundo envio antes mesmo do rerender. Campos, submit e Cancelar ficam desabilitados durante a chamada; Escape é bloqueado nesse período. Dialog fecha apenas no sucesso, preservando campos em erro. Inclusão não tem retry automático.

## Atualização local

Atualização funcional de `resultado.compra.itens` preserva respostas concorrentes de itens diferentes. Substituição por id ou inclusão do retorno sem duplicar a identidade. Verificação da chave do contexto e do compraId evita aplicar resposta em outra Compra carregada. Não há POST de ordem nem recarga da preparação.

## Autoria de inclusão

“Adicionado por …” e data/hora em PT-BR aparecem quando o item foi adicionado durante a Compra e há autor retornado. Itens originados da preparação não recebem autoria inventada.

## Autoria de colocação

“Colocado no carrinho por …” e data/hora usam exclusivamente os snapshots retornados no ItemCompra. Nenhuma consulta a usuários ou membros para substituir nomes.

## Observador

`contextoUsuario.participanteCompra` é a única regra de participação usada. Observadores mantêm consulta, aviso, estados e autoria, sem adicionar ou colocar no carrinho. Papel de administrador não concede exceção.

## GET/F5

Carregamento inicial e recuperação por GET continuam independentes da memória dos POSTs, na rota `/listas/:listaId/compra`. O GET recupera os novos campos e estados. Não foi introduzido polling.

## Erros

Mensagens reais do backend são preservadas pelo apiClient. Erro ao colocar fica no card, mantendo o item anterior e permitindo tentativa explícita. Erro na inclusão fica dentro do dialog com os valores preservados. 401 usa logout existente. Falhas não são convertidas em sucesso.

## Uso do Stitch

Cards, hierarquia, destaque verde para No carrinho, texto secundário para autoria e layout mobile-first. Ação explícita Colocar no carrinho, sem checkbox de alternância que sugira desfazer. TransactionalShell preservado.

## Funcionalidades deliberadamente adiadas

Remoção e suas aprovações, desfazer, edição, reordenação, finalização, reabertura, entrada tardia, realtime, feed, polling, push e histórico. Nenhum endpoint adicional ou alteração de backend.

## Build

`npm.cmd run build`: aprovado (TypeScript e Vite).

## Lint

`npm.cmd run lint`: aprovado. `git diff --check`: aprovado. Launcher `.cmd` usado em razão da política PowerShell já identificada nesta sessão.

## Dev

`npm.cmd run dev -- --host 127.0.0.1`: iniciado em `http://127.0.0.1:5174/`, porque 5173 estava ocupada. GET HTTP direto em `/listas/validacao/compra` retornou 200, confirmando o fallback SPA, sem comprovar a renderização autenticada.

## Testes reais

Backend em `localhost:8080` acessível, respondendo 401 à consulta sem autenticação. Nenhum navegador conectado foi encontrado. Assim, os testes manuais A–J (cliques, POSTs autenticados, autoria persistida, F5, duplo clique e observador) permanecem pendentes; não foram declarados aprovados por build/lint ou pela análise do código.

O frontend não possui script nem arquivos de testes automatizados existentes encontrados. Não foram criados mocks nem alterados dados reais para substituir os testes manuais.

## Git

Sem commit e sem push. Alterações apenas no frontend, mantidas no workspace.

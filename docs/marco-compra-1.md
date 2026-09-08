# Marco Compra 1 — Iniciar e recuperar Compra

## Arquivos investigados

- `src/features/shopping-lists/pages/ListaDetalhePage.tsx`
- `src/features/shopping-lists/types/shoppingList.ts`
- `src/features/shopping-lists/api/shoppingListsApi.ts`
- `src/features/shopping/pages/CompraAndamentoPage.tsx` e `CompraRevisaoPage.tsx`
- `src/app/router/AppRouter.tsx` e `src/app/layouts/TransactionalShell.tsx`
- `src/features/family/session/familyContext.ts` e `FamilyProvider.tsx`
- `src/shared/api/apiClient.ts`
- As duas referências Stitch indicadas (`code.html`).
- Após a inspeção inicial: `ListasPage.tsx`, `package.json`, `src/config/environment.ts`, `vite.config.ts` e configuração de desenvolvimento para navegação e validação.

## Arquivos criados

- `src/features/shopping/types/shopping.ts`
- `src/features/shopping/api/shoppingApi.ts`
- `src/features/shopping/components/IniciarCompraButton.tsx`
- `docs/marco-compra-1.md`

## Arquivos alterados

- `src/features/shopping/pages/CompraAndamentoPage.tsx`
- `src/features/shopping-lists/pages/ListaDetalhePage.tsx`
- `src/features/shopping-lists/pages/ListasPage.tsx`
- `src/app/router/AppRouter.tsx`

## Tipos de Compra

Interfaces explícitas: `CompraAtivaResponse`, `ParticipanteCompraResponse`, `ItemCompraResponse` e `ContextoUsuarioCompraResponse`. Categoria e unidade reutilizam os tipos existentes. Quantidade, unidade, marca e observações preservam nullable. `itemListaOrigemId?: string | null` permite ausência. Os únicos status modelados são `EM_ANDAMENTO` e `PENDENTE`, respectivamente.

## POST iniciar

`iniciarCompra` usa POST `/api/familias/{familiaId}/listas/{listaId}/compra` via cliente existente, sem body nem identificadores de executor. Retorna `CompraAtivaResponse`; resposta sem dados produz erro recuperável.

## Idempotência 201/200

O cliente aceita respostas 2xx, incluindo criação 201 e replay 200. Ref síncrona impede POSTs simultâneos; botões ficam desabilitados durante envio. Erros liberam nova tentativa. Nenhuma chave de idempotência é gerada no frontend.

## Confirmação

Dialog nativo modal, nome e descrição acessíveis, layout responsivo e retorno de foco ao botão. Cancelar recebe foco inicial e não faz POST. Durante envio, Cancelar e Escape não fecham o dialog. Texto explica o registro dos participantes e itens e a saída da preparação, sem prometer notificações ou tempo real.

## Regra participanteAtivo

Iniciar compra aparece somente para `EM_PREPARACAO` com `contextoUsuario.participanteAtivo === true`. Papel de administrador não concede acesso. Operações locais de preparação em curso desabilitam temporariamente o início.

## Navegação

Após sucesso do POST, navega para `/listas/{listaId}/compra`. A tela consulta o backend; não converte ItemLista nem transporta snapshots no navigation state.

## Rota por listaId

Rota funcional `/listas/:listaId/compra` dentro de `TransactionalShell`. Placeholder `/compras/:compraId/andamento` substituído. Revisão permanece inalterada.

## GET/reload

`buscarCompra` faz GET no mesmo endpoint usando família do contexto e lista da URL. Executado na entrada e em nova tentativa; funciona sem memória do POST. Efeito descarta respostas após desmontagem ou troca de contexto. O GET devolve também o compraId real.

## Tela de Compra

Consulta com nome da lista, categoria, estabelecimento quando presente, estado Em andamento, início formatado em PT-BR, itens e participantes. Cards responsivos, contagem de itens e estados vazios; sem progresso fictício.

## Participantes snapshot

Nome e papel vêm exclusivamente da Compra. Papéis exibidos como Administrador/Membro. Identidade visual sem avatar real, presença ou localização inventados.

## Itens snapshot

Exibidos diretamente do GET, ordenados por `ordemExibicao`, com `ItemCompra.id` como chave. Mostra descrição, quantidade, unidade, marca, observações e Pendente. Nenhum controle de mutação.

## participanteCompra

Participantes veem informação discreta. Observadores veem “Você pode acompanhar esta compra, mas não participa dela.” A consulta não é bloqueada e não há botão para entrar.

## Adaptação da preparação EM_COMPRA

Controles de itens e participantes exigem também `EM_PREPARACAO`, além das capabilities existentes. Handlers revalidam essa condição local. Lista em compra mostra aviso de preparação encerrada e link Ver compra em andamento.

## Minhas Listas

Cards EM_COMPRA mostram Ver compra e abrem a rota por listaId. EM_PREPARACAO mantém Abrir lista. Comportamentos de FINALIZADA/CANCELADA preservados.

## Loading/erros

GET possui loading próprio, retry e link às listas. 404 mostra “Esta compra ainda não está disponível.” POST preserva mensagem do backend para 403/409 e demais erros. 401 usa logout da infraestrutura existente. Nenhuma validação manual de quantidade de itens ou participantes foi adicionada.

## Stitch

Referências adaptadas para modal centralizado, destaque verde de estado, hierarquia de compra, cards e mobile-first, usando tokens existentes. TransactionalShell preservado. Não foi possível fazer inspeção visual em navegador nesta sessão.

## Funcionalidades deliberadamente adiadas

Todas as ações de ItemCompra, entrada posterior, revisão/finalização ampliada, WebSocket, notificações, presença, localização, histórico e capabilities adicionais. Nenhum mock criado.

## Build

`npm.cmd run build`: aprovado (TypeScript e Vite). Usado o launcher `.cmd` porque PowerShell bloqueia `npm.ps1` por política de execução, sem alterar a política do sistema.

## Lint

`npm.cmd run lint`: aprovado. `git diff --check`: sem erros de whitespace.

## Dev

`npm.cmd run dev -- --host 127.0.0.1`: Vite iniciou em `http://127.0.0.1:5173/`. GET HTTP da rota direta `/listas/validacao/compra` retornou 200, verificando fallback SPA; isso não valida autenticação nem recuperação da Compra.

## Testes reais

Não há script de testes nem arquivos de teste encontrados no projeto. Build/lint não substituem os cenários reais A–I solicitados.

O backend configurado (`http://localhost:8080`) não respondeu à consulta de conectividade em `/api/familias` (HTTP 000). O runtime de navegador não encontrou browsers conectados. Portanto não foram executados os cenários reais de permissões, cancelamento, POST 201, replay 200 com mesmo compraId, F5/GET, preparação após início e observador. Identidade dos itens foi verificada no código, sem confirmação por resposta real.

Esses cenários permanecem pendentes de backend acessível e sessão autenticada. Não foram criadas contas, dados fictícios ou mocks para substituí-los.

## Git

Sem commit e sem push. Alterações mantidas no workspace.

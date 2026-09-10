# Mercadeira

Frontend do Mercadeira, uma aplicação colaborativa para organização de compras entre membros de famílias e grupos.

A aplicação segue abordagem mobile-first, priorizando smartphones, navegação simples, contexto familiar explícito e fluxos colaborativos.

## Stack

React 19

TypeScript 6

Vite 8

Tailwind CSS 4

React Router 7

Oxlint

Fetch API nativa

## Estrutura

```text
src/
├── app/
│   ├── layouts/
│   ├── providers/
│   └── router/
├── config/
├── features/
│   ├── auth/
│   ├── family/
│   ├── history/
│   ├── home/
│   ├── shopping/
│   └── shopping-lists/
├── shared/
│   ├── api/
│   └── components/
├── App.tsx
├── index.css
└── main.tsx

docs/
└── prototipo-stitch/
```

O código é organizado principalmente por feature/domínio, evitando grandes diretórios globais de páginas, serviços ou modelos.

Os arquivos em docs/prototipo-stitch/mercadeira-stitch/ são referências visuais e de UX exportadas do Google Stitch. Esse material não representa a arquitetura nem o código de produção.

## Arquitetura de estado

Autenticação, identidade do usuário e contexto familiar são responsabilidades separadas:

```text
SessionProvider
├── token
├── expiração
└── estado de autenticação

AuthenticatedUserProvider
├── id
├── nome
└── email

FamilyProvider
├── famílias disponíveis
└── família selecionada
```

O SessionProvider não contém família, papel ou dados de perfil.

O AuthenticatedUserProvider consulta a identidade real do usuário autenticado e não persiste o perfil como fonte de verdade.

O FamilyProvider concentra a coleção de famílias e o contexto familiar atual. A família selecionada é contexto de navegação e uso, não prova de autorização.

## Navegação

### Aplicação principal

As áreas principais utilizam o AppShell e compartilham navegação global:

| Rota | Área |
| --- | --- |
| `/inicio` | Dashboard |
| `/listas` | Minhas listas |
| `/familia` | Família selecionada |
| `/historico` | Estrutura de histórico; dados reais ainda pendentes |

Em dispositivos móveis, essas áreas utilizam navegação inferior com alvos de toque adequados e respeito à safe area.

O AppShell também disponibiliza logout global para as áreas autenticadas principais.

### Listas

| Rota | Área |
| --- | --- |
| `/listas/nova` | Criar nova lista |
| `/listas/:listaId` | Preparação da lista |

O familiaId não faz parte da URL do frontend. O contexto familiar vem do FamilyProvider e é enviado explicitamente às APIs quando o contrato exige.

### Fluxos transacionais

As rotas transacionais utilizam `TransactionalShell`, separado da navegação global:

| Rota | Área |
| --- | --- |
| `/listas/:listaId/compra` | Compra em andamento, com integração REST real |
| `/compras/:compraId/revisao` | Estrutura de revisão; fluxo ainda pendente |

A Compra em andamento é recuperada usando o `familiaId` da família selecionada e o `listaId` da rota. Não depende de `compraId` na URL. O identificador real da Compra continua disponível na resposta do backend.

### Autenticação, onboarding e seleção de família

| Rota | Área |
| --- | --- |
| `/login` | Login |
| `/cadastro` | Cadastro |
| `/familia/entrada` | Criar família ou solicitar entrada |
| `/familia/selecionar` | Selecionar contexto familiar |

Também existe tratamento para rotas inexistentes.

## Autenticação

A API utiliza Bearer JWT.

Após o login, o frontend persiste somente:

- token

- instante de expiração.

A senha nunca é persistida.

A sessão:

- é restaurada após atualização da página

- valida a expiração antes de reutilizar o token

- limpa credenciais expiradas ou inválidas

- não utiliza refresh token atualmente.

O JWT contém somente o UUID do usuário no claim sub.

Família, papel e permissões não são inferidos do token.

## Usuário autenticado

A identidade do usuário é carregada por:

`GET /api/usuarios/me`

Resposta:

```json
{
  "id": "uuid",
  "nome": "Leonardo",
  "email": "leo@email.com"
}
```

O frontend não extrai nome ou email do JWT e não reutiliza valores digitados no cadastro ou login como fonte de verdade.

Após F5, a sessão é restaurada e o perfil é consultado novamente.

## Múltiplas famílias

Um usuário pode participar simultaneamente de zero, uma ou várias famílias ativas.

Exemplo:

```text
Usuário
├── Minha Casa       — Administrador
├── Casa dos pais    — Membro
└── Viagem           — Administrador
```

O papel é específico de cada vínculo familiar.

As famílias são carregadas por:

`GET /api/familias`

A resposta é sempre 200 OK, inclusive quando não existem famílias:

[]

### Família selecionada

Somente o UUID da família selecionada é persistido em:

mercadeira.familia.selecionada

O objeto completo da família não é persistido como fonte de verdade.

Após carregar GET /api/familias, o ID salvo é validado contra a coleção atual.

### Resolução inicial

```text
Login / restauração
        ↓
GET /api/familias
        │
        ├── []
        │    └── /familia/entrada
        │
        ├── [A]
        │    └── seleciona A automaticamente
        │         └── /inicio
        │
        └── [A, B, ...]
             │
             ├── seleção salva válida
             │    └── restaura seleção
             │         └── /inicio
             │
             └── sem seleção válida
                  └── /familia/selecionar
```

Quando existem várias famílias e nenhuma seleção válida, o frontend não escolhe uma arbitrariamente.

## Onboarding familiar

A página /familia/entrada permite:

- criar uma família

- solicitar entrada por código

- visualizar solicitações pendentes do próprio usuário

- verificar novamente o estado das solicitações.

Pendências do usuário:

`GET /api/familias/solicitacoes/minhas-pendentes`

Sem pendências, o backend pode retornar 204 No Content.

Não há polling automático nem WebSocket nesta fase.

### Criar família

`POST /api/familias`

Após sucesso:

- as famílias são recarregadas

- a nova família é selecionada

- seu UUID é persistido como contexto atual

- a aplicação navega para /inicio.

Criar uma família não substitui vínculos existentes.

### Solicitar entrada

`POST /api/familias/solicitacoes`

Solicitar entrada em outra família não altera automaticamente a família selecionada.

## Guia Família

A rota /familia representa a família atualmente selecionada.

A tela exibe:

- nome da família

- papel do usuário

- código de ingresso

- copiar código

- compartilhar código

- solicitações administrativas, quando aplicável

- troca de família.

O código utiliza Clipboard API e, quando disponível, Web Share API.

### Solicitações administrativas

Para administrador:

`GET /api/familias/{familiaId}/solicitacoes`

Aprovar:

`POST /api/familias/{familiaId}/solicitacoes/{solicitacaoId}/aprovar`

Rejeitar:

`POST /api/familias/{familiaId}/solicitacoes/{solicitacaoId}/rejeitar`

A identidade do executor não é enviada pelo frontend.

Quando o usuário é MEMBRO, a interface não apresenta as ações administrativas. A autorização real continua sendo responsabilidade do backend.

### Membros da família

Os membros ativos podem ser consultados por:

`GET /api/familias/{familiaId}/membros`

Esse contrato já é utilizado no fluxo de participantes das listas.

A Guia Família ainda não possui uma área completa de gestão de membros.

## Dashboard

A rota /inicio já utiliza dados reais.

O dashboard apresenta:

- saudação com o usuário autenticado

- família selecionada

- papel do usuário naquela família

- até três listas EM_PREPARACAO, priorizando as atualizadas mais recentemente

- acesso às listas

- criação de nova lista

- acesso à Guia Família

- troca de contexto familiar.

O dashboard não exibe resumo de compra ativa, presença, localização, progresso ou dados em tempo real. A Compra em andamento é acessada pelas listas.

## Listas de compra

Toda API de lista é escopada pela família selecionada:

`/api/familias/{familiaId}/listas`

Ao trocar de família, dados do contexto anterior não devem ser reaproveitados.

### Minhas listas

`GET /api/familias/{familiaId}/listas`

A tela /listas apresenta:

- nome

- categoria

- estabelecimento, quando informado

- status

- acesso ao detalhe.

Estados de loading, vazio e erro são tratados separadamente.

Cards `EM_PREPARACAO` oferecem Abrir lista e levam a `/listas/{id}`. Cards `EM_COMPRA` oferecem Ver compra e levam a `/listas/{id}/compra`.

### Criar lista

`POST /api/familias/{familiaId}/listas`

Campos atuais:

- nome

- categoria

- estabelecimento opcional.

O criador entra automaticamente como participante ativo.

Após criação, a aplicação navega para:

/listas/:listaId

### Detalhe da lista

`GET /api/familias/{familiaId}/listas/{listaId}`

O detalhe retorna, além dos dados básicos:

- criador

- contexto do usuário autenticado

- capabilities fornecidas pelo backend.

Exemplo conceitual:

```json
{
  "criador": {
    "membroFamiliaId": "uuid",
    "usuarioId": "uuid",
    "nome": "Leonardo"
  },
  "contextoUsuario": {
    "membroFamiliaId": "uuid",
    "papelFamilia": "ADMINISTRADOR",
    "participanteAtivo": true,
    "podeGerenciarParticipantes": true,
    "podeAlterarItens": true
  }
}
```

### Capabilities de lista

O frontend não reconstrói regras de autorização combinando papel, criador e participação.

A interface utiliza diretamente:

- participanteAtivo

- podeGerenciarParticipantes

- podeAlterarItens.

As mutações continuam sendo revalidadas pelo backend.

Um ADMINISTRADOR da família que não participa da lista pode gerenciar participantes, mas não pode alterar itens somente por ser administrador.

### Participantes da lista

Listar participantes:

`GET /api/familias/{familiaId}/listas/{listaId}/participantes`

Adicionar ou reativar participante:

`POST /api/familias/{familiaId}/listas/{listaId}/participantes`

Remover participante:

`DELETE /api/familias/{familiaId}/listas/{listaId}/participantes/{membroFamiliaId}`

O criador da lista não pode ser removido.

Quando permitido pelo backend, um administrador não participante pode entrar explicitamente na lista por meio da ação Participar desta lista.

Não existe autoentrada silenciosa.

### Itens da lista

Listar:

`GET /api/familias/{familiaId}/listas/{listaId}/itens`

Adicionar:

`POST /api/familias/{familiaId}/listas/{listaId}/itens`

Editar:

`PUT /api/familias/{familiaId}/listas/{listaId}/itens/{itemId}`

Remover:

`DELETE /api/familias/{familiaId}/listas/{listaId}/itens/{itemId}`

Campos disponíveis:

- descrição

- quantidade

- unidade de medida

- marca

- observações.

Descrição é obrigatória; os demais campos são opcionais.

Adicionar e editar utilizam o mesmo formulário em dialog.

Na preparação da lista não existem checkboxes de compra.

### Reordenação de itens

Endpoint:

`PUT /api/familias/{familiaId}/listas/{listaId}/itens/ordem`

A requisição envia todos os IDs ativos na nova sequência.

A interface usa controles de seta para cima/baixo, sem dependência de drag-and-drop.

A reordenação é atualizada localmente e persistida no backend, evitando recargas que desloquem o viewport.

Itens recém-adicionados são colocados no topo e a nova ordem é persistida.

### Status e categorias

Categorias:

```text
SUPERMERCADO
ROUPAS
BRINQUEDOS
ACESSORIOS
UTENSILIOS
OUTROS
```

Status possíveis:

```text
EM_PREPARACAO
EM_COMPRA
FINALIZADA
CANCELADA
```

O frontend possui fluxos funcionais para `EM_PREPARACAO` e `EM_COMPRA`. `FINALIZADA` e `CANCELADA` não recebem novos comportamentos de navegação ou mutação.

Após iniciar a Compra, a ListaCompra passa de `EM_PREPARACAO` para `EM_COMPRA`. A preparação deixa de oferecer mutações de itens e participantes e mostra Ver compra em andamento. As capabilities continuam sendo fornecidas e revalidadas pelo backend.

## Compra em andamento

A rota `/listas/:listaId/compra` apresenta nome da lista, categoria, estabelecimento quando informado, status Em andamento, data/hora de início em PT-BR, participantes e itens da Compra.

### Iniciar Compra

`POST /api/familias/{familiaId}/listas/{listaId}/compra`

Sem body. Iniciar compra aparece somente quando a ListaCompra está `EM_PREPARACAO` e `contextoUsuario.participanteAtivo = true`. Ser `ADMINISTRADOR` não concede essa permissão: administrador não participante não pode iniciar.

Um dialog confirma o registro dos participantes e itens atuais e a saída do modo de preparação. Cancelar não inicia a Compra. Durante o POST, o botão fica desabilitado e uma proteção síncrona impede chamadas simultâneas.

O backend retorna `CompraAtivaResponse` tanto em `201 Created` quanto em `200 OK` no replay idempotente. Ambos são sucesso e levam a `/listas/:listaId/compra`. Não há chave de idempotência gerada pelo frontend.

### Recuperação e snapshots

`GET /api/familias/{familiaId}/listas/{listaId}/compra`

O GET é a fonte de verdade para entrada, retorno, reload e F5. A tela é reconstruída usando família selecionada e lista da rota, sem depender do estado em memória produzido pelo POST inicial.

Ao iniciar, o backend registra os participantes ativos da ListaCompra como snapshots de `ParticipanteCompra` e os itens ativos da preparação como `ItemCompra`. Nomes e papéis exibidos vêm desses snapshots.

`ItemLista` e `ItemCompra` são conceitos distintos. Durante a Compra, **`ItemCompra.id` é a identidade operacional**. `itemListaOrigemId` é apenas o vínculo com a origem; não é usado para mutações. O frontend não converte ItemLista em ItemCompra.

### Participação e observadores

`compra.contextoUsuario.participanteCompra` define as ações de inclusão e colocação no carrinho:

- `true`: permite adicionar item e colocar itens pendentes no carrinho.
- `false`: permite consultar estados e autoria, sem ações de mutação, com o aviso “Você pode acompanhar esta compra, mas não participa dela.”

Não há entrada tardia implementada, nem permissão inferida pelo papel `ADMINISTRADOR`. O backend revalida cada operação.

As ações de remoção usam exclusivamente `item.acoes.podeSolicitarRemocao` e `item.acoes.podeDecidirRemocao`, calculadas pelo backend para o JWT atual.

### Colocar item no carrinho

`POST /api/familias/{familiaId}/listas/{listaId}/compra/itens/{itemCompraId}/colocar-no-carrinho`

Sem body, somente para ParticipanteCompra. A transição implementada é `PENDENTE → NO_CARRINHO`, com resposta `200 OK` contendo o `ItemCompraResponse` atualizado. Repetir a operação em um item já no carrinho é idempotente e preserva a primeira autoria e timestamp.

Cada card possui loading e proteção contra duplo clique próprios, sem bloquear os outros itens. A resposta substitui o item correspondente no estado local; não é feito GET completo apenas para refletir a mutação. Falhas mantêm o item anterior e apresentam a mensagem do backend no card.

A UI mostra Pendente ou ✓ No carrinho. Quando presentes, `colocadoNoCarrinhoPor.nome` e `colocadoNoCarrinhoEm` são exibidos discretamente, por exemplo “Colocado no carrinho por Leonardo”, com data/hora. São snapshots históricos; não são substituídos pelo cadastro atual do usuário.

### Adicionar item durante a Compra

`POST /api/familias/{familiaId}/listas/{listaId}/compra/itens`

Somente participantes veem Adicionar item. O dialog reutiliza a apresentação dos campos comuns da preparação, mantendo requests específicos de cada domínio.

O request envia somente:

```json
{
  "descricao": "Arroz",
  "quantidade": 1,
  "unidadeMedida": "PACOTE",
  "marca": null,
  "observacoes": null
}
```

Quantidade, unidade, marca e observações permitem `null`. Identidade do executor, `compraId`, `participanteCompraId`, origem, status, ordem, autoria e timestamps não são enviados: pertencem ao backend.

A resposta `201 Created` contém o `ItemCompraResponse` completo. O novo item pertence somente à Compra, não cria ItemLista nem altera retroativamente a preparação. Inicia `PENDENTE` e aparece ao final, respeitando a `ordemExibicao` definida pelo backend, sem POST de ordem.

Adicionar item **não é idempotente**: dois POSTs válidos criam dois itens. O submit fica desabilitado e uma proteção síncrona impede segundo envio. Não há repetição automática. O dialog fecha somente após sucesso; em erro, mantém os campos preenchidos e mostra a mensagem do backend.

### Origem e autoria dos itens

| Campo | Item originado da preparação | Item adicionado durante a Compra |
| --- | --- | --- |
| `itemListaOrigemId` | Identificador da origem | `null` |
| `adicionadoDuranteCompra` | `false` | `true` |
| `adicionadoPor` | `null` | Snapshot do autor |
| `adicionadoEm` | `null` | Timestamp da inclusão |

`adicionadoPor` e `colocadoNoCarrinhoPor`, quando presentes, contêm `participanteCompraId`, `membroFamiliaId`, `usuarioId` e `nome`. A UI exibe “Adicionado por …” com data/hora para itens criados durante a Compra; não inventa autoria de inclusão para itens vindos da preparação.

Após colocar no carrinho, o response substitui o item local. Após adicionar, o response é incluído na coleção local. Atualizações funcionais preservam respostas concorrentes de itens diferentes. Status, autores e timestamps vêm do backend; o GET continua recuperando todos esses dados após F5.

### Remoção controlada de ItemCompra — Compra 2E

Os três POSTs abaixo não enviam body; o executor vem do Bearer JWT:

- `/api/familias/{familiaId}/listas/{listaId}/compra/itens/{itemCompraId}/solicitar-remocao`
- `/api/familias/{familiaId}/listas/{listaId}/compra/itens/{itemCompraId}/aprovar-remocao`
- `/api/familias/{familiaId}/listas/{listaId}/compra/itens/{itemCompraId}/rejeitar-remocao`

“Solicitar remoção” aparece somente com `podeSolicitarRemocao=true`. “Aprovar remoção” e “Rejeitar remoção” aparecem somente com `podeDecidirRemocao=true`. O frontend não deduz responsabilidade, participação ou permissão pelos autores ou papéis familiares.

Cada resposta substitui o ItemCompra completo pelo mesmo `id`, sem GET em sucesso. Autoaprovação pode retornar diretamente `REMOVIDO`. Esse estado permanece na coleção e na tela, com badge e descrição atenuada. `REMOCAO_SOLICITADA` recebe destaque e autoria dentro do card. Uma rejeição preserva o ciclo em `remocao`, mesmo em `NO_CARRINHO`, e permite nova solicitação se a capability retornada autorizar.

Solicitante, decisor e timestamps são snapshots do ciclo atual/mais recente. Não há consulta de nomes atuais nem histórico local de ciclos anteriores. Ações são diretas e explícitas, com loading e proteção síncrona compartilhados por card.

Em HTTP 409, o card mostra feedback e consulta a Compra por GET para reconciliar aquele item. Os demais cards permanecem interativos e suas respostas locais são preservadas. Se o GET falhar, o card oferece “Atualizar item” e suspende novas mutações até recuperar o estado. HTTP 401 utiliza logout; demais erros preservam a mensagem do backend. Nenhum fluxo compara texto de mensagem.

O GET/F5 recupera todos os estados, auditoria e capabilities. As capabilities ficam somente em memória e dados de uma sessão anterior não são reaproveitados ao mudar o token.

Relatório e roteiro de validação: [Marco Compra 2E](docs/marco-compra-2e.md). Testes locais: `node --test tests/compra-remocao.test.mjs`.

### Limites atuais e realtime

Os estados funcionais de ItemCompra são `PENDENTE`, `NO_CARRINHO`, `REMOCAO_SOLICITADA` e `REMOVIDO`. Desfazer remoção e finalização continuam fora do escopo implementado.

Autoria e timestamps permitem futuramente apresentar eventos como “Leonardo adicionou Arroz” ou “Camila colocou Leite no carrinho”. Hoje são exibidos no próprio item a partir do estado REST. Não há WebSocket, STOMP, polling, notificações em tempo real ou feed global de atividade.

O carregamento possui estado próprio e nova tentativa. GET 404 informa “Esta compra ainda não está disponível.” As mutações preservam as mensagens de validação, permissão e conflito retornadas pelo backend; 401 utiliza a infraestrutura existente de sessão.

## Logout

O logout global está disponível no AppShell.

As páginas autenticadas fora dele, como /familia/entrada e /familia/selecionar, possuem ação própria de logout.

O logout limpa:

- token

- expiração

- identidade do usuário em memória

- contexto familiar em memória

- `mercadeira.familia.selecionada`.

Depois, a aplicação retorna para /login.

## Configuração da API

A configuração é centralizada em:

src/config/environment.ts

| Variável | Uso | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base das chamadas REST | `/api` |
| `DEV_API_PROXY_TARGET` | Destino do proxy Vite em desenvolvimento | `http://localhost:8080` |

Exemplo:

```dotenv
VITE_API_BASE_URL=/api
DEV_API_PROXY_TARGET=http://localhost:8080
```

Variáveis VITE_* são incorporadas ao build e não devem conter segredos.

## Proxy de desenvolvimento

Em desenvolvimento:

```text
Browser
  -> http://localhost:5173/api/...

Vite proxy
  -> http://localhost:8080/api/...
```

A porta do Vite pode variar sem alterar o destino do backend.

O proxy existe somente no servidor de desenvolvimento.

### Produção

O frontend utiliza /api como base padrão.

Se frontend e backend forem publicados sob a mesma origem, um reverse proxy pode encaminhar /api para o backend.

Se a API estiver em outra origem:

`VITE_API_BASE_URL=https://api.exemplo.com/api`

não é necessário alterar código-fonte.

### Configuração local

O arquivo .env.development contém os defaults de desenvolvimento.

Configurações específicas da máquina podem ficar em:

.env.local
.env.development.local

Esses arquivos não devem ser versionados.

## Execução local

Instalar dependências:

`npm install`

Executar:

`npm run dev`

Build:

`npm run build`

Lint:

`npm run lint`

## Backend local

Por padrão:

`http://localhost:8080`

Rotas REST:

/api

O destino é configurável por DEV_API_PROXY_TARGET.

## Tratamento de erros

A API utiliza estrutura centralizada:

```json
{
  "timestamp": "2026-09-04T12:00:00Z",
  "status": 409,
  "erro": "...",
  "mensagem": "...",
  "path": "/api/..."
}
```

Erros de validação podem incluir:

```json
{
  "campos": {}
}
```

### Status relevantes:

- 400 — dados inválidos

- 401 — autenticação ausente, inválida ou expirada

- 403 — sem permissão

- 404 — recurso inexistente naquele contexto

- 409 — conflito de domínio.

O frontend utiliza preferencialmente mensagem e não exibe stack traces.

## Estado atual

### Implementado:

- fundação React + TypeScript + Vite

- Tailwind CSS e tokens visuais

- roteamento

- AppShell

- TransactionalShell

- Cadastro

- Login

- exibição/ocultação de senha

- JWT Bearer

- persistência e restauração da sessão

- expiração

- guards

- logout global

- cliente HTTP

- configuração de ambiente

- proxy de desenvolvimento

- AuthenticatedUserProvider

- consulta do usuário autenticado

- múltiplas famílias

- FamilyProvider

- persistência e restauração da família selecionada

- onboarding familiar

- criação e entrada em família

- seleção e troca de família

- solicitações administrativas

- aprovação e rejeição

- Guia Família

- Dashboard real

- Minhas Listas

- criação de lista

- detalhe/preparação da lista

- participantes

- gerenciamento de participantes

- capabilities de lista

- adicionar, editar e remover itens da preparação (ItemLista)

- reordenação de itens da preparação

- formulário de item em dialog

- preservação de scroll/foco durante edição e reordenação
- início real de Compra com confirmação e proteção contra duplo clique
- criação 201 e replay idempotente 200 no início
- rota da Compra por listaId e recuperação por GET/F5
- snapshots de participantes e itens, com ItemCompra.id como identidade operacional
- observador em modo somente leitura
- transição PENDENTE → NO_CARRINHO com loading por item e replay idempotente
- atualização local pelas respostas reais das mutações
- inclusão de item durante Compra com proteção contra duplo envio
- autoria de inclusão e de colocação no carrinho, com timestamps históricos
- remoção controlada por capabilities do item, com solicitação, autoaprovação, aprovação e rejeição
- auditoria do ciclo de remoção e reconciliação do item por GET em conflitos 409

### Ainda pendente:

- edição dos dados básicos da lista, como nome, categoria e estabelecimento

- atalho de UX para criar ou entrar em outra família quando o usuário já possui contexto familiar

- gestão completa dos membros pela Guia Família

- promoção/rebaixamento de membros

- saída da família

- edição/desativação da família

- solicitação de participação em ListaCompra
- entrada tardia em Compra
- desfazer remoção aprovada de ItemCompra
- editar ItemCompra durante Compra
- reordenar ItemCompra
- finalizar ou reabrir Compra

- revisão/finalização

- histórico real

- WebSocket/STOMP

- notificações e atualização em tempo real

Esses itens representam backlog; não indicam contratos REST já disponíveis.

## Design

A interface segue abordagem mobile-first.

Princípios atuais:

- idioma em PT-BR

- Plus Jakarta Sans

- alvos de toque adequados

- espaçamentos e cores centralizados em tokens

- navegação simples

- feedback de loading e erro

- foco visível

- navegação por teclado

- confirmações somente quando necessárias

- ausência de dependências visuais desnecessárias.

O Stitch é referência de UX e identidade visual. Seu HTML exportado não deve ser copiado diretamente para a aplicação.

## Cuidados

Não versione .env.local ou variantes locais.

Não coloque tokens, senhas ou segredos em variáveis VITE_*.

Não extraia nome/email do JWT.

Não use o JWT para inferir família, papel ou permissões.

Não persista o objeto completo da família selecionada como fonte de verdade.

Não trate a família selecionada como prova de autorização.

Não reconstrua no frontend capabilities que já são fornecidas pelo backend.

Não envie usuarioId, executorId ou papel como prova de autorização.

Use familiaId explicitamente quando o contrato REST exigir contexto familiar.

Não invente contratos REST para áreas ainda não disponibilizadas.

Não trate 204 No Content como erro quando o contrato o utilizar como estado funcional.

Não implemente polling ou WebSocket antes do contrato correspondente.

Não copie diretamente o HTML/Tailwind gerado pelo Stitch.

Não use ItemLista.id ou itemListaOrigemId para mutações da Compra; use ItemCompra.id.

Não infira participação na lista ou na Compra pela função ADMINISTRADOR.

Não envie identidade do executor nas mutações da Compra.

Não converta ItemLista em ItemCompra no frontend.

Não crie endpoints de transição de status além dos contratos disponíveis.

Use respostas do backend como fonte da mutação confirmada e GET da Compra como fonte de recuperação.

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
│   └── api/
├── App.tsx
├── index.css
└── main.tsx

docs/
└── prototipo-stitch/

O código é organizado principalmente por feature/domínio, evitando grandes diretórios globais de páginas, serviços ou modelos.

Os arquivos em docs/prototipo-stitch/mercadeira-stitch/ são referências visuais e de UX exportadas do Google Stitch. Esse material não representa a arquitetura nem o código de produção.

## Arquitetura de estado

Autenticação, identidade do usuário e contexto familiar são responsabilidades separadas:

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

O SessionProvider não contém família, papel ou dados de perfil.

O AuthenticatedUserProvider consulta a identidade real do usuário autenticado e não persiste o perfil como fonte de verdade.

O FamilyProvider concentra a coleção de famílias e o contexto familiar atual. A família selecionada é contexto de navegação e uso, não prova de autorização.

Navegação

Aplicação principal

As áreas principais utilizam o AppShell e compartilham navegação global:

Rota

Área

/inicio

## Dashboard

/listas

### Minhas listas

/familia

Família selecionada

/historico

Histórico

Em dispositivos móveis, essas áreas utilizam navegação inferior com alvos de toque adequados e respeito à safe area.

O AppShell também disponibiliza logout global para as áreas autenticadas principais.

### Listas

Rota

Área

/listas/nova

Criar nova lista

/listas/:listaId

Preparação da lista

O familiaId não faz parte da URL do frontend. O contexto familiar vem do FamilyProvider e é enviado explicitamente às APIs quando o contrato exige.

### Fluxos transacionais

As rotas abaixo já possuem estrutura dedicada com TransactionalShell, mas os fluxos de compra ainda não estão implementados:

Rota

Área

/compras/:compraId/andamento

Compra em andamento

/compras/:compraId/revisao

Revisão da compra

Autenticação, onboarding e seleção de família

Rota

Área

/login

Login

/cadastro

Cadastro

/familia/entrada

Criar família ou solicitar entrada

/familia/selecionar

Selecionar contexto familiar

Também existe tratamento para rotas inexistentes.

Autenticação

A API utiliza Bearer JWT.

Após o login, o frontend persiste somente:

- token

instante de expiração.

A senha nunca é persistida.

A sessão:

- é restaurada após atualização da página

- valida a expiração antes de reutilizar o token

- limpa credenciais expiradas ou inválidas

não utiliza refresh token atualmente.

O JWT contém somente o UUID do usuário no claim sub.

Família, papel e permissões não são inferidos do token.

Usuário autenticado

A identidade do usuário é carregada por:

`GET /api/usuarios/me`

Resposta:

{
  "id": "uuid",
  "nome": "Leonardo",
  "email": "leo@email.com"
}

O frontend não extrai nome ou email do JWT e não reutiliza valores digitados no cadastro ou login como fonte de verdade.

Após F5, a sessão é restaurada e o perfil é consultado novamente.

Múltiplas famílias

Um usuário pode participar simultaneamente de zero, uma ou várias famílias ativas.

Exemplo:

Usuário
├── Minha Casa       — Administrador
├── Casa dos pais    — Membro
└── Viagem           — Administrador

O papel é específico de cada vínculo familiar.

As famílias são carregadas por:

`GET /api/familias`

A resposta é sempre 200 OK, inclusive quando não existem famílias:

[]

Família selecionada

Somente o UUID da família selecionada é persistido em:

mercadeira.familia.selecionada

O objeto completo da família não é persistido como fonte de verdade.

Após carregar GET /api/familias, o ID salvo é validado contra a coleção atual.

Resolução inicial

Login / restauração
        ↓
`GET /api/familias`
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

Quando existem várias famílias e nenhuma seleção válida, o frontend não escolhe uma arbitrariamente.

## Onboarding familiar

A página /familia/entrada permite:

- criar uma família

- solicitar entrada por código

- visualizar solicitações pendentes do próprio usuário

verificar novamente o estado das solicitações.

Pendências do usuário:

`GET /api/familias/solicitacoes/minhas-pendentes`

Sem pendências, o backend pode retornar 204 No Content.

Não há polling automático nem WebSocket nesta fase.

Criar família

`POST /api/familias`

Após sucesso:

- as famílias são recarregadas

- a nova família é selecionada

- seu UUID é persistido como contexto atual

a aplicação navega para /inicio.

Criar uma família não substitui vínculos existentes.

### Solicitar entrada

`POST /api/familias/solicitacoes`

Solicitar entrada em outra família não altera automaticamente a família selecionada.

Guia Família

A rota /familia representa a família atualmente selecionada.

A tela exibe:

- nome da família

- papel do usuário

- código de ingresso

- copiar código

- compartilhar código

- solicitações administrativas, quando aplicável

troca de família.

O código utiliza Clipboard API e, quando disponível, Web Share API.

Solicitações administrativas

Para administrador:

`GET /api/familias/{familiaId}/solicitacoes`

Aprovar:

`POST /api/familias/{familiaId}/solicitacoes/{solicitacaoId}/aprovar`

Rejeitar:

`POST /api/familias/{familiaId}/solicitacoes/{solicitacaoId}/rejeitar`

A identidade do executor não é enviada pelo frontend.

Quando o usuário é MEMBRO, a interface não apresenta as ações administrativas. A autorização real continua sendo responsabilidade do backend.

Membros da família

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

troca de contexto familiar.

O dashboard não inventa compra ativa, presença, localização, progresso ou dados em tempo real.

Essas áreas serão adicionadas somente quando existirem contratos backend correspondentes.

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

acesso ao detalhe.

Estados de loading, vazio e erro são tratados separadamente.

### Criar lista

`POST /api/familias/{familiaId}/listas`

Campos atuais:

- nome

- categoria

estabelecimento opcional.

O criador entra automaticamente como participante ativo.

Após criação, a aplicação navega para:

/listas/:listaId

### Detalhe da lista

`GET /api/familias/{familiaId}/listas/{listaId}`

O detalhe retorna, além dos dados básicos:

- criador

- contexto do usuário autenticado

capabilities fornecidas pelo backend.

Exemplo conceitual:

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

### Capabilities de lista

O frontend não reconstrói regras de autorização combinando papel, criador e participação.

A interface utiliza diretamente:

- participanteAtivo

- podeGerenciarParticipantes

podeAlterarItens.

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

observações.

Descrição é obrigatória; os demais campos são opcionais.

Adicionar e editar utilizam o mesmo formulário em dialog.

Na preparação da lista não existem checkboxes de compra.

Reordenação de itens

Endpoint:

`PUT /api/familias/{familiaId}/listas/{listaId}/itens/ordem`

A requisição envia todos os IDs ativos na nova sequência.

A interface usa controles de seta para cima/baixo, sem dependência de drag-and-drop.

A reordenação é atualizada localmente e persistida no backend, evitando recargas que desloquem o viewport.

Itens recém-adicionados são colocados no topo e a nova ordem é persistida.

### Status e categorias

Categorias:

SUPERMERCADO
ROUPAS
BRINQUEDOS
ACESSORIOS
UTENSILIOS
OUTROS

Status possíveis:

EM_PREPARACAO
EM_COMPRA
FINALIZADA
CANCELADA

Nesta fase, o frontend trabalha funcionalmente principalmente com EM_PREPARACAO.

Estados posteriores não recebem comportamento inventado.

## Logout

O logout global está disponível no AppShell.

As páginas autenticadas fora dele, como /familia/entrada e /familia/selecionar, possuem ação própria de logout.

O logout limpa:

- token

- expiração

- identidade do usuário em memória

- contexto familiar em memória

mercadeira.familia.selecionada.

Depois, a aplicação retorna para /login.

Configuração da API

A configuração é centralizada em:

src/config/environment.ts

Variável

Uso

Default

`VITE_API_BASE_URL`

Base das chamadas REST

/api

DEV_API_PROXY_TARGET

Destino do proxy Vite em desenvolvimento

`http://localhost:8080`

Exemplo:

`VITE_API_BASE_URL=/api`
DEV_API_PROXY_TARGET=http://localhost:8080

Variáveis VITE_* são incorporadas ao build e não devem conter segredos.

## Proxy de desenvolvimento

Em desenvolvimento:

Browser
  -> http://localhost:5173/api/...

Vite proxy
  -> http://localhost:8080/api/...

A porta do Vite pode variar sem alterar o destino do backend.

O proxy existe somente no servidor de desenvolvimento.

Produção

O frontend utiliza /api como base padrão.

Se frontend e backend forem publicados sob a mesma origem, um reverse proxy pode encaminhar /api para o backend.

Se a API estiver em outra origem:

`VITE_API_BASE_URL=https://api.exemplo.com/api`

não é necessário alterar código-fonte.

Configuração local

O arquivo .env.development contém os defaults de desenvolvimento.

Configurações específicas da máquina podem ficar em:

.env.local
.env.development.local

Esses arquivos não devem ser versionados.

Execução local

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

{
  "timestamp": "2026-09-04T12:00:00Z",
  "status": 409,
  "erro": "...",
  "mensagem": "...",
  "path": "/api/..."
}

Erros de validação podem incluir:

{
  "campos": {}
}

### Status relevantes:

- 400 — dados inválidos

- 401 — autenticação ausente, inválida ou expirada

- 403 — sem permissão

- 404 — recurso inexistente naquele contexto

409 — conflito de domínio.

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

- adicionar, editar e remover itens

- reordenação de itens

- formulário de item em dialog

preservação de scroll/foco durante edição e reordenação.

### Ainda pendente:

- edição dos dados básicos da lista, como nome, categoria e estabelecimento

- atalho de UX para criar ou entrar em outra família quando o usuário já possui contexto familiar

- gestão completa dos membros pela Guia Família

- promoção/rebaixamento de membros

- saída da família

- edição/desativação da família

- iniciar compra

- compra ativa

- estados de item durante a compra

- revisão/finalização

- histórico real

- WebSocket/STOMP

notificações e atualização em tempo real.

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

ausência de dependências visuais desnecessárias.

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

Não copie diretamente o HTML/Tailwind gerado pelo Stitch.ecionada como fonte de verdade.
Não trate a família selecionada como prova de autorização.
Não envie usuarioId, executorId ou papel como prova de autorização.
Utilize o familiaId explicitamente quando o contrato REST exigir contexto familiar.
Não invente contratos REST para áreas ainda não disponibilizadas pelo backend.
Não trate 204 No Content como erro quando o contrato o utilizar como estado funcional.
Não implemente polling ou WebSocket antes do contrato correspondente.
Não copie diretamente o código HTML/Tailwind gerado pelo Stitch.


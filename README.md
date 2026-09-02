# Mercadeira

Frontend do **Mercadeira**, uma aplicação colaborativa para organização de compras entre membros de famílias e grupos.

A aplicação é desenvolvida com abordagem **mobile-first**, priorizando o uso em smartphones, navegação simples e fluxos colaborativos.

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router 7
- Oxlint
- Fetch API nativa

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
│   └── api/
├── App.tsx
├── index.css
└── main.tsx

docs/
└── prototipo-stitch/

O código é organizado principalmente por feature/domínio, evitando grandes diretórios globais de páginas, serviços ou modelos.

Os arquivos em docs/prototipo-stitch/mercadeira-stitch/ são referências visuais e de UX exportadas do Google Stitch. Esse material não representa a arquitetura nem o código de produção.

Navegação

A aplicação possui dois contextos principais de navegação.

Aplicação principal

As áreas principais utilizam o AppShell e compartilham a navegação global:

Rota	Área
/inicio	Início
/listas	Listas
/familia	Família
/historico	Histórico

Em dispositivos móveis, essas áreas utilizam navegação inferior com foco em alvos de toque adequados e respeito à safe area.

A arquitetura desktop definitiva ainda não foi fechada. O foco atual permanece mobile-first.

Fluxos transacionais

Fluxos que exigem maior foco utilizam o TransactionalShell e não exibem a navegação global.

Rota	Área
/compras/:compraId/andamento	Compra em andamento
/compras/:compraId/revisao	Revisão da compra

Esse isolamento permite que processos como compra ativa e finalização evoluam sem ficarem acoplados ao layout principal da aplicação.

Rotas públicas, onboarding e seleção
Rota	Área
/login	Login
/cadastro	Cadastro
/familia/entrada	Criar família ou solicitar entrada
/familia/selecionar	Seleção do contexto familiar

Também existe tratamento específico para rotas inexistentes.

Sessão e autenticação

O frontend utiliza a API REST do Mercadeira com autenticação Bearer JWT.

Após o login, são armazenados localmente somente:

token;
instante de expiração.

A senha nunca é persistida pelo frontend.

A sessão:

é restaurada após atualização da página;
valida a expiração antes de reutilizar o token;
limpa credenciais expiradas ou inválidas;
não utiliza refresh token atualmente.

O JWT contém apenas o UUID do usuário no claim sub.

Informações como família, papel e permissões não são obtidas do token.

A autenticação e o contexto familiar são conceitos separados:

Sessão
├── token
└── expiração

Contexto familiar
├── famílias disponíveis
└── família selecionada

A família selecionada representa somente o contexto atual de navegação e uso da aplicação. Ela não é prova de autorização.

O backend permanece responsável por validar vínculo, papel e permissões em cada operação protegida.

Múltiplas famílias

Um usuário pode participar simultaneamente de zero, uma ou várias famílias ativas.

Exemplo:

Usuário
├── Minha Casa          — Administrador
├── Casa dos pais       — Membro
└── Viagem              — Administrador

O papel é específico de cada vínculo familiar.

O mesmo usuário pode ser ADMINISTRADOR em uma família e MEMBRO em outra.

As famílias disponíveis são carregadas por:

GET /api/familias

A resposta é sempre 200 OK, inclusive quando não existem famílias:

[]

Quando existem famílias:

[
  {
    "id": "uuid",
    "nome": "Minha Casa",
    "codigoIngresso": "ABC123XY",
    "status": "ATIVA",
    "papel": "ADMINISTRADOR"
  }
]
Contexto familiar selecionado

O frontend mantém explicitamente uma família selecionada.

Somente o UUID dessa família é persistido no navegador, usando a chave:

mercadeira.familia.selecionada

O objeto completo da família não é persistido como fonte de verdade.

A cada restauração da aplicação, o ID salvo é validado contra a resposta atual de:

GET /api/familias

Se o ID não estiver mais entre as famílias disponíveis, ele é descartado.

Resolução inicial

Após login ou restauração da sessão:

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

Quando há várias famílias e nenhuma preferência válida, o frontend não escolhe uma arbitrariamente.

Onboarding familiar

A página /familia/entrada permite:

criar uma nova família;
solicitar entrada em uma família por código;
visualizar solicitações de entrada pendentes;
verificar novamente o estado das solicitações.

O usuário pode utilizar essa página mesmo já participando de outras famílias.

Solicitações pendentes do próprio usuário

Endpoint:

GET /api/familias/solicitacoes/minhas-pendentes

Com pendências:

[
  {
    "id": "uuid",
    "status": "PENDENTE",
    "solicitadaEm": "2026-09-02T13:00:00Z",
    "familia": {
      "id": "uuid",
      "nome": "Família Silva"
    }
  }
]

Sem pendências:

204 No Content

Um usuário pode possuir múltiplas solicitações pendentes simultaneamente.

A ação Verificar novamente atualiza o estado manualmente enquanto o projeto ainda não possui atualização em tempo real por WebSocket.

Não há polling automático.

Criar família
POST /api/familias

Após a criação:

a lista de famílias é recarregada;
a nova família é selecionada;
seu ID é persistido como contexto atual;
a aplicação navega para /inicio.

Criar uma nova família não substitui as famílias existentes.

Solicitar entrada
POST /api/familias/solicitacoes

Solicitar entrada em uma nova família não altera automaticamente o contexto familiar selecionado.

Guia Família

A rota /familia representa a família atualmente selecionada.

A tela exibe:

nome da família;
papel do usuário;
código de ingresso;
cópia do código;
compartilhamento;
solicitações administrativas, quando aplicável;
troca de família;
logout.
Código de ingresso

O código pode ser copiado usando a Clipboard API.

Quando disponível, o navegador também pode utilizar a Web Share API para compartilhar uma mensagem com o código da família.

Quando a Web Share API não está disponível, a aplicação utiliza a cópia do código como fallback.

Não existem integrações específicas com WhatsApp, e-mail ou SMS.

Administrador

Quando o usuário possui papel ADMINISTRADOR, a tela consulta as solicitações pendentes da família selecionada:

GET /api/familias/{familiaId}/solicitacoes

Cada solicitação pode ser:

POST /api/familias/{familiaId}/solicitacoes/{solicitacaoId}/aprovar

ou:

POST /api/familias/{familiaId}/solicitacoes/{solicitacaoId}/rejeitar

A identidade do administrador não é enviada pelo frontend. O backend obtém o executor pelo JWT e valida novamente:

vínculo ativo;
papel de administrador;
família informada no path;
pertencimento da solicitação à família.

Após aprovação ou rejeição, a lista de solicitações é recarregada.

Membro

Quando o papel da família selecionada é MEMBRO, o frontend:

não consulta o endpoint administrativo de solicitações;
não exibe ações de Aprovar ou Rejeitar;
informa que o usuário participa daquela família como membro.

Essa decisão é apenas de apresentação da interface. A autorização real continua sendo responsabilidade do backend.

Troca de família

A ação Trocar família navega para:

/familia/selecionar

A página apresenta todas as famílias disponíveis e o papel correspondente do usuário.

Ao selecionar uma família:

o FamilyContext atualiza a família selecionada;
somente o UUID é persistido;
a aplicação navega para um contexto seguro;
dados dependentes da família anterior não devem ser reaproveitados.

O familiaId não faz parte atualmente das URLs principais da aplicação.

Chamadas REST que exigirem escopo familiar devem enviar explicitamente o familiaId conforme o contrato do backend.

Logout

O logout está disponível tanto na área principal quanto nos fluxos autenticados que ficam fora do AppShell, como:

/familia/entrada;
/familia/selecionar.

O logout limpa:

token;
expiração;
contexto familiar em memória;
mercadeira.familia.selecionada.

Depois, a aplicação retorna para /login.

Configuração da API

O código React acessa a configuração da API por meio de:

src/config/environment.ts

Esse arquivo centraliza o acesso às variáveis fornecidas pelo Vite.

Variável	Uso	Default
VITE_API_BASE_URL	Base utilizada pelo frontend para chamadas REST	/api
DEV_API_PROXY_TARGET	Destino do proxy do Vite em desenvolvimento	http://localhost:8080

Exemplo:

VITE_API_BASE_URL=/api
DEV_API_PROXY_TARGET=http://localhost:8080

VITE_API_BASE_URL é utilizada pelo código da aplicação.

DEV_API_PROXY_TARGET é utilizada somente pela configuração do servidor de desenvolvimento do Vite.

Proxy de desenvolvimento

Durante o desenvolvimento, o navegador pode chamar normalmente:

/api/usuarios

e o Vite encaminha a requisição para o backend local.

Exemplo:

Browser
  -> http://localhost:5173/api/usuarios

Vite proxy
  -> http://localhost:8080/api/usuarios

A porta do frontend pode variar (5173, 5174, etc.) sem afetar a comunicação com o backend.

O proxy existe apenas no ambiente de desenvolvimento.

Produção

O frontend utiliza /api como base padrão.

Em uma implantação em que frontend e backend sejam publicados sob a mesma origem, um reverse proxy poderá encaminhar /api para o backend.

Caso a API seja publicada em outra origem, o build/deploy poderá definir:

VITE_API_BASE_URL=https://api.exemplo.com/api

sem necessidade de alteração no código-fonte.

Variáveis VITE_* são incorporadas durante o build e não devem conter segredos.

Configuração local

O arquivo .env.development contém os defaults de desenvolvimento.

Configurações específicas da máquina podem ser colocadas em arquivos locais, por exemplo:

.env.local
.env.development.local

Esses arquivos não devem ser versionados.

Execução local

Instale as dependências:

npm install

Inicie o frontend:

npm run dev

Build:

npm run build

Lint:

npm run lint

O Vite informará no terminal a URL local utilizada.

Backend local

Para integração local, o backend Mercadeira é esperado por padrão em:

http://localhost:8080

com rotas REST sob:

/api

Esse endereço é configurável por DEV_API_PROXY_TARGET.

Tratamento de erros

A API possui um contrato padronizado de erro:

{
  "timestamp": "2026-09-02T13:00:00Z",
  "status": 409,
  "erro": "...",
  "mensagem": "...",
  "path": "/api/..."
}

Erros de validação podem possuir também:

{
  "campos": {}
}

A estrutura interna de campos ainda não deve ser assumida rigidamente pelo frontend.

Status relevantes:

400 — request ou validação inválida;
401 — sessão ausente, inválida ou expirada;
403 — usuário autenticado sem permissão;
404 — recurso inexistente;
409 — conflito de domínio.

O frontend utiliza preferencialmente a mensagem retornada pelo backend e não exibe detalhes internos ou stack traces.

Estado atual

Implementado:

fundação React + TypeScript + Vite;
Tailwind CSS e tokens visuais;
roteamento;
AppShell;
TransactionalShell;
Cadastro;
Login;
exibição/ocultação de senha;
JWT Bearer;
persistência e restauração da sessão;
expiração;
guards;
logout;
cliente HTTP;
configuração de ambiente;
proxy de desenvolvimento;
múltiplas famílias por usuário;
FamilyContext;
persistência da família selecionada;
resolução de 0, 1 ou N famílias;
seleção e troca de contexto familiar;
onboarding familiar;
criação de família;
solicitação de entrada por código;
múltiplas solicitações pendentes;
ação manual para verificar aprovação;
Guia Família;
código de ingresso;
cópia e compartilhamento do código;
solicitações administrativas;
aprovação e rejeição de entrada;
comportamento distinto para ADMINISTRADOR e MEMBRO.

Ainda pendente:

consulta/perfil do usuário autenticado;
gestão/listagem de membros da família;
promoção ou rebaixamento de membros;
saída da família;
edição/desativação da família;
listas de compras;
preparação de itens;
compra ativa;
revisão/finalização;
histórico;
WebSocket/STOMP;
atualização em tempo real.
Design

A interface segue abordagem mobile-first.

Princípios atuais:

idioma da aplicação em PT-BR;
Plus Jakarta Sans;
alvos de toque mínimos;
espaçamentos e cores centralizados em tokens;
navegação simples;
feedback de loading e erro;
foco visível e navegação por teclado;
confirmações somente quando necessárias;
nenhuma dependência visual desnecessária.

O Stitch é utilizado apenas como referência de UX e identidade visual. Seu HTML não deve ser copiado diretamente para a aplicação.

Cuidados
Não versione .env.local ou variantes locais.
Não coloque tokens, senhas ou segredos em variáveis VITE_*.
Não use o JWT para inferir família, papel ou permissões.
Não persista o objeto completo da família selecionada como fonte de verdade.
Não trate a família selecionada como prova de autorização.
Não envie usuarioId, executorId ou papel como prova de autorização.
Utilize o familiaId explicitamente quando o contrato REST exigir contexto familiar.
Não invente contratos REST para áreas ainda não disponibilizadas pelo backend.
Não trate 204 No Content como erro quando o contrato o utilizar como estado funcional.
Não implemente polling ou WebSocket antes do contrato correspondente.
Não copie diretamente o código HTML/Tailwind gerado pelo Stitch.
# Mercadeira

Frontend do **Mercadeira**, uma aplicação colaborativa para organização de compras entre membros de famílias e grupos.

A aplicação é desenvolvida com abordagem **mobile-first**, priorizando uso em smartphones, navegação simples e fluxos colaborativos.

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

Rotas públicas e onboarding
Rota	Área
/login	Login
/cadastro	Cadastro
/familia/entrada	Entrada/onboarding familiar

Também existe tratamento específico para rotas inexistentes.

Sessão e autenticação

O frontend utiliza a API REST do Mercadeira com autenticação Bearer JWT.

Após login, são armazenados localmente somente:

token;
instante de expiração.

A senha nunca é persistida pelo frontend.

A sessão:

é restaurada após atualização da página;
valida a expiração antes de reutilizar o token;
limpa credenciais expiradas ou inválidas;
não utiliza refresh token atualmente.

O JWT contém apenas o UUID do usuário no claim sub.

Informações como família, papel e permissões não são obtidas do token e nunca são utilizadas pelo frontend como prova de autorização.

O backend permanece responsável pela validação real das permissões.

Regras atuais de navegação autenticada

O comportamento implementado atualmente distingue:

Não autenticado
    -> /login

Autenticado sem contexto familiar disponível
    -> /familia/entrada

Autenticado com contexto familiar disponível
    -> /inicio

Rotas protegidas redirecionam usuários não autenticados para /login.

Durante a restauração da sessão e resolução do contexto familiar, a aplicação aguarda o resultado antes de renderizar uma área incompatível, evitando transições visuais incorretas.

Atenção — domínio Família em evolução

O backend está evoluindo para permitir que um usuário possa pertencer simultaneamente a mais de uma família ou grupo.

Por isso, o comportamento atual baseado em uma única família ativa deve ser considerado provisório.

A direção em estudo prevê:

Usuário autenticado
├── Família A
├── Família B
└── Família C

com uma família/contexto selecionado para navegação e operações.

Ainda não devem ser assumidos como definitivos:

contrato de listagem das famílias do usuário;
forma de seleção da família atual;
impacto nos guards;
impacto nas rotas;
persistência do contexto familiar selecionado.

Nenhuma dessas regras deve ser implementada por inferência antes do contrato definitivo do backend.

Onboarding familiar

O fluxo atualmente implementado consulta o estado familiar após autenticação.

Quando não há família disponível no contrato atual, a página /familia/entrada consulta as solicitações pendentes do usuário.

Fluxo atual:

Login
  -> consulta família

     -> família encontrada
        -> /inicio

     -> nenhuma família
        -> consulta solicitações pendentes

           -> nenhuma pendência
              -> criar família
              -> entrar por código

           -> uma ou mais pendências
              -> aguardando aprovação
              -> ainda pode criar família
              -> ainda pode solicitar entrada em outra

Um usuário pode possuir múltiplas solicitações de entrada pendentes.

A tela possui ação manual Verificar novamente para atualizar o estado enquanto a atualização em tempo real por WebSocket ainda não estiver disponível.

Não há polling automático.

Configuração da API

O código React acessa a configuração da API por meio de:

src/config/environment.ts

Esse arquivo centraliza o acesso às variáveis fornecidas pelo Vite.

Variáveis disponíveis:

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

e o Vite encaminha a requisição para o backend local:

http://localhost:8080/api/usuarios

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
  "timestamp": "2026-08-31T12:00:00Z",
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
JWT Bearer;
persistência e restauração da sessão;
expiração;
guards;
logout;
cliente HTTP;
configuração de ambiente;
proxy de desenvolvimento;
consulta de família;
onboarding familiar;
criação de família;
solicitação de entrada por código;
múltiplas solicitações pendentes;
ação manual para verificar aprovação.

Ainda pendente:

adequação ao novo modelo de múltiplas famílias;
seleção de contexto familiar;
administração das solicitações recebidas;
gestão de membros;
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
confirmação apenas em operações que realmente exigem;
nenhuma dependência visual desnecessária.

O Stitch é utilizado apenas como referência de UX e identidade visual. Seu HTML não deve ser copiado diretamente para a aplicação.

Cuidados
Não versione .env.local ou variantes locais.
Não coloque tokens, senhas ou segredos em variáveis VITE_*.
Não use o JWT para inferir família, papel ou permissões.
Não envie usuarioId, executorId ou papel como prova de autorização.
Não invente contratos REST para áreas ainda não disponibilizadas pelo backend.
Não trate 204 No Content como erro quando o contrato o utilizar como estado funcional.
Não implemente polling ou WebSocket antes do contrato correspondente.
Não copie diretamente o código HTML/Tailwind gerado pelo Stitch.
Não assuma uma única família por usuário enquanto a revisão do domínio estiver em andamento.
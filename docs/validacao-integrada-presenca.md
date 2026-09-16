# Validação integrada de presença — 16/09/2026

## Resultado

**Atualização após o refinamento UX:** o usuário informou homologação visual manual da versão anterior e autorizou commit/push após os gates automatizados, mesmo sem navegador conectado nesta sessão. O bloqueio abaixo registra a conclusão da etapa anterior; as verificações manuais pendentes continuam necessárias para homologação final e fechamento das Issues, mas não bloqueiam o versionamento agora autorizado.

**Bloqueada para aprovação final:** os cenários HTTP reais passaram, mas não havia navegador conectado à sessão para executar a homologação da interface. Não considerar os testes HTTP como substitutos de F5, duas abas reais, console e homologação visual.

## Ambiente utilizado

- Backend local em `http://localhost:8080`, repositório `lnrdgst/mercadeira`, HEAD `f42fc70e48f95acb691fe60ffbc3e0c9ea492c96`. Working tree limpo.
- O backend já estava iniciado. Consulta somente leitura a `flyway_schema_history` confirmou migrations V1–V10 com sucesso. Não foi necessário reiniciá-lo.
- Frontend `lnrdgst/mercadeira-frontend`, branch `main`, HEAD `e45fdc305b9a08deb291d8e8a2059acb674b4426`, com a implementação #17 ainda sem commit.
- Vite iniciado em `http://127.0.0.1:5180`, usando `/api` com proxy para `localhost:8080`. A porta 5173 pertencia a outro projeto, preservado sem alterações.
- Autenticação e operações reais foram executadas por HTTP através desse proxy. Não houve mock nesses cenários.

## Dados exclusivos da execução aprovada de HTTP

- A: `presenca.a.1789579666297@example.test`.
- B: `presenca.b.1789579666297@example.test`.
- Família: `fa1c7235-95d6-4e6b-9954-65fc8e60db92`.
- Lista: `0e9ff9df-3b1e-4dc6-83df-be62bbd210ac`.
- Compra: `ec1aad06-1e47-4d58-9851-bb8423c76d8c`, finalizada ao terminar a execução.
- Uma execução preliminar também criou dados de teste e parou numa expectativa incorreta de replay do roteiro auxiliar. Não foram apagados dados do banco nem alteradas contas preexistentes. Senhas e tokens não integram este relatório.

## Cenários e evidências

| Cenário | Resultado observado |
| --- | --- |
| Autenticação | Cadastro/login de A e B funcionaram; identidade de A confirmada em `/usuarios/me`. |
| Início | A inicia PRESENTE; B permanece NAO_INFORMADA com timestamp nulo. |
| Participante remoto | B adiciona item PENDENTE; capabilities de colocar/restaurar falsas; comandos reais recusados com 409. |
| Entrada presencial | PUT PRESENTE retorna Compra completa com ambas capabilities corretas por item. Repetição preserva timestamp. |
| Colocar/restaurar | B executa ambas operações; restauração registra B na auditoria. |
| Saída | PUT NAO_PRESENTE revoga colocar/restaurar, preservando operações remotas. |
| Remoção | B não presente realiza autoaprovação, rejeição e aprovação; autoria e auditorias conferidas. Replay de aprovação preserva auditoria. |
| Finalização | B autorizado finaliza com zero presentes; declarações e timestamps permanecem iguais; alterar presença após encerramento retorna 409. |
| Reconstrução via GET | Nova consulta recupera estados, participantes, presenças, capabilities e auditoria. **F5 no navegador não executado.** |
| Cliente desatualizado | Dois estados do mesmo usuário simulados por requisições: após saída, ação baseada no GET anterior recebe 409; novo GET revoga capability antiga. **Duas abas e resposta atrasada no navegador não executadas.** |
| Visual mobile/desktop | Não executado: navegador indisponível. |
| Console do navegador | Não inspecionado. |
| Rede/resultado incerto | Não simulado no ambiente real. Há cobertura automatizada com HTTP simulado na suíte frontend; não equivale a homologação integrada. |

Nove grupos de verificações HTTP passaram. A aplicação da resposta pela interface sem refresh ainda depende da homologação no navegador, embora tenha cobertura nos testes de componentes.

## Falhas e correções

Nenhum defeito de produto identificado nos cenários executados. **Nenhuma correção de código foi necessária.**

O roteiro auxiliar inicialmente esperava 200 ao solicitar remoção novamente depois de autoaprovação. O contrato existente exige 409 nesse estado; replay de aprovação retorna 200. A expectativa auxiliar foi corrigida e a execução completa passou. Nenhuma regra de remoção foi alterada.

## Validações e estado final

- `npm.cmd test`: 106 testes aprovados em 11 arquivos, incluindo TypeScript dos testes.
- `npm.cmd run build`: TypeScript da aplicação e build Vite aprovados.
- `npm.cmd run lint`: aprovado.
- `git diff --check`: aprovado.
- Working tree frontend preserva a implementação não commitada; este relatório é a única adição desta validação.
- Backend permanece sem alterações.
- Nenhum commit, push ou mudança de status de Issue foi realizado.

## Pendências para aprovação

Conectar um navegador e executar os mesmos fluxos na interface, incluindo F5, duas abas, resposta atrasada, inspeção de console e viewports mobile/desktop. Se viável, simular resultado incerto de PUT e conferir reconciliação sem retry automático.

**Recomendação: bloqueado para aprovação integrada e commit até concluir essas verificações.**

Essa recomendação de bloquear commit foi substituída pela autorização explícita de versionamento após o refinamento UX. Aprovação integrada final continua pendente. O refinamento não muda endpoints, estados, payloads ou regras operacionais.

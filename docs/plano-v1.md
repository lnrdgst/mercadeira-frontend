# Plano de fechamento da primeira versão

Proposta de 13/09/2026, após o checkpoint Compra 4. Não altera prioridades/status do GitHub nem autoriza automaticamente novas funcionalidades.

## Base e limite da análise

Consultados router, páginas de Família, Listas, Histórico, preparação e Compra, APIs frontend, guards, scripts, README, controllers/consulta de listas backend, contratos Compra e os 21 itens do Project. Não foi realizada auditoria visual completa nem validação de implantação em produção.

O fluxo principal já permite cadastrar, entrar/criar família, preparar lista e participantes, comprar, remover/restaurar, revisar e finalizar. `ListasPage` abre o resumo das finalizadas; `ListarListasFamilia` consulta todos os estados. Portanto, a compra concluída já é recuperável. A rota `/historico` ainda é placeholder; a consulta atual de listas não traz autor/data da finalização nem ordenação por finalização.

Proposta: V1 inicial para uso acompanhado por famílias convidadas. Lançamento público irrestrito exige decidir também gestão de acesso familiar e operação/recuperação de contas. Essa distinção é decisão de produto pendente, não requisito já aprovado.

## A. Obrigatório para a V1 proposta

| Entrega | Issues (FE = mercadeira-frontend; BE = mercadeira) | Critério de encerramento |
| --- | --- | --- |
| Suíte frontend reproduzível | [FE #8](https://github.com/lnrdgst/mercadeira-frontend/issues/8), Alta, Pronto para desenvolver | `npm test`, ambiente DOM, preservação dos 19 testes atuais, guards, contexto familiar e estados assíncronos; sem CI/E2E dentro desta Issue. |
| Confirmação de remoção acessível | [FE #1](https://github.com/lnrdgst/mercadeira-frontend/issues/1), Média, Backlog | Foco, Tab, Escape e retorno ao acionador corretos; a confirmação atual usa div com aria-modal, sem comportamento modal completo. |
| Histórico mínimo real | [BE #2](https://github.com/lnrdgst/mercadeira/issues/2) → [FE #4](https://github.com/lnrdgst/mercadeira-frontend/issues/4), Alta, Backlog | Finalizadas por família, ordem por finalização, resumo existente, loading/vazio/erro/retry e isolamento ao trocar família. Propor paginação simples ao refinar o contrato; sem relatórios financeiros ou auditoria completa. |
| Edição básica da lista | [BE #1](https://github.com/lnrdgst/mercadeira/issues/1) → [FE #2](https://github.com/lnrdgst/mercadeira-frontend/issues/2), Média, Backlog | Corrigir nome, categoria e estabelecimento em preparação com capability e validação backend. Evita recriar lista para corrigir dados básicos; contrato ainda precisa ser implementado. |
| Documentação operacional correta | [BE #8](https://github.com/lnrdgst/mercadeira/issues/8), Média, Backlog; README frontend conforme mudanças | Execução, configuração, testes e contratos atuais documentados. README backend ainda diz que REST de listas e Compra estão pendentes. |
| Verificação final de uso e ambiente de entrega | Gate de lançamento, sem nova Issue criada | Jornada com duas contas, troca de família, sessão expirada, erros/retry, estados vazios, F5, teclado e viewport móvel; corrigir somente falhas impeditivas. Confirmar endereço de acesso, configuração da API, HTTPS e recuperação do banco no ambiente escolhido antes da publicação. |

Histórico dedicado não é necessário para recuperar uma compra hoje, mas é recomendado nesta V1 para entregar a área já presente na navegação com utilidade real. Se a prioridade for um piloto ainda menor, a alternativa é adiar BE #2/FE #4 e retirar o acesso ao placeholder, mantendo resumos por Minhas Listas. Essa redução requer decisão do usuário; não executar ambas as alternativas.

## B. Importante, mas pode vir depois

| Entrega | Issues/dependências | Motivo |
| --- | --- | --- |
| Atalho para outra família | [FE #3](https://github.com/lnrdgst/mercadeira-frontend/issues/3), Baixa | Melhora descoberta; criação/entrada inicial já existem. |
| Gestão de membros | [BE #3](https://github.com/lnrdgst/mercadeira/issues/3) + [BE #4](https://github.com/lnrdgst/mercadeira/issues/4) → [FE #5](https://github.com/lnrdgst/mercadeira-frontend/issues/5), Média | Aprovação de entrada já funciona; promoção, saída e remoção exigem política do último administrador. Para abertura pública, revisar esta classificação: encerrar acesso não deve depender indefinidamente de intervenção técnica. |
| Cancelamento operacional | [BE #5](https://github.com/lnrdgst/mercadeira/issues/5) → [FE #6](https://github.com/lnrdgst/mercadeira-frontend/issues/6), Média | Útil para desistência/limpeza, mas não impede concluir a jornada principal. |
| CI dos dois repositórios | [FE #9](https://github.com/lnrdgst/mercadeira-frontend/issues/9) depende de FE #8; [BE #9](https://github.com/lnrdgst/mercadeira/issues/9), Média | Recomendado logo após a suíte estável; durante o piloto, validações locais registradas podem servir como gate. |
| Jornada E2E reproduzível | [BE #10](https://github.com/lnrdgst/mercadeira/issues/10) + FE #8 → [FE #10](https://github.com/lnrdgst/mercadeira-frontend/issues/10), Alta no Project | Reduz repetição manual; aprovação manual atual não encerra essas Issues. Pode seguir ao piloto; a classificação V1 não altera a prioridade técnica existente. |

## C. Backlog futuro

- Solicitação/decisão de participação: [BE #6](https://github.com/lnrdgst/mercadeira/issues/6) → [BE #7](https://github.com/lnrdgst/mercadeira/issues/7) → [FE #7](https://github.com/lnrdgst/mercadeira-frontend/issues/7), Média. Hoje participantes já podem ser geridos por usuário autorizado na preparação.
- Demora de shutdown da suíte backend: [FE #11](https://github.com/lnrdgst/mercadeira-frontend/issues/11), sem prioridade preenchida. Reavaliar se causar falhas, timeout ou processos órfãos. A Issue está no frontend apesar do assunto backend; não mover automaticamente.
- WebSocket/realtime, notificações, reabertura, entrada tardia na Compra, histórico completo de ciclos, refinamentos cosméticos e funcionalidades especulativas. Sem novos contratos ou Issues criados nesta análise.

## Ordem recomendada e critério de parada

1. FE #8, respeitando o único item atualmente pronto no Project.
2. FE #1; documentação BE #8 quando houver acesso de escrita autorizado ao backend.
3. BE #2 → FE #4 para histórico mínimo, se confirmado no escopo V1.
4. BE #1 → FE #2 para edição básica.
5. Verificação final do fluxo completo e do ambiente de entrega; corrigir bloqueios encontrados e encerrar a V1 sem incorporar o restante do backlog.

Não iniciar automaticamente Issues em Backlog nem publicar com base apenas neste documento. Refino das regras novas deve preceder implementação backend/frontend. Commit/push continuam sob autorização explícita.

## Inconsistências e candidatos a backlog

- FE #8 ainda fala em 14 cenários; a migração deve preservar os 19 existentes após Compra 4. FE/BE #10 devem considerar restauração no refinamento futuro, sem perder cenários anteriores.
- README backend desatualizado já é coberto por BE #8; não criar duplicata.
- Preparação do ambiente de entrega e roteiro de aceitação móvel/teclado são candidatos a registro operacional, caso não existam fora do Project consultado. Não foram criadas Issues.

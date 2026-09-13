# Estado do Mercadeira

Atualizado em 13/09/2026. Registro de retomada; README documenta o produto e GitHub Project mantém o backlog.

- **Repositórios:** frontend em `C:\Users\leoaf\projetos\mercadeira-frontend`; backend em `C:\Users\leoaf\projetos\mercadeira.api`.
- **Backlog:** https://github.com/users/lnrdgst/projects/1 — consultar prioridade, status e dependências antes de escolher uma Issue. Não criar Issues automaticamente.
- **Produto:** fluxo de autenticação, família, preparação de listas e Compra até revisão/finalização implementado. Último marco concluído: Compra 4, com os seis cenários manuais aprovados pelo usuário em 13/09/2026; detalhes em `marco-compra-4.md`.
- **Trabalho atual:** checkpoint Compra 4 fechado; implementação permanece no working tree, sem commit/push. Backend limpo na conferência. Plano de fechamento da V1 proposto em `plano-v1.md`, ainda sujeito à decisão de escopo do usuário.
- **Contrato:** backend `docs/contratos-compra-4.md`, validado em 12/09/2026. Contratos atuais, código e testes do backend prevalecem sobre documentação antiga.
- **Decisões:** backend define domínio, autorização e capabilities; frontend consome respostas completas. Restauração usa POST sem body, 200 com ItemCompra completo, capability exclusiva, auditorias preservadas e GET em 409. Revisão/finalização não oferecem mutações de itens.
- **Evidências:** build, lint e 19 testes frontend aprovados anteriormente; contrato backend registra 305 testes aprovados. Não repetidos neste checkpoint. Validação integrada manual aprovada por relato do usuário; não confundir com automação E2E.
- **Pendência imediata:** confirmar escopo da V1 e público inicial. Project consultado: 21 itens; somente frontend #8 está em Pronto para desenvolver. A descrição dessa Issue ainda cita 14 testes; preservar os 19 atuais.
- **Próxima tarefa recomendada:** frontend #8 (suíte única, DOM, guards e contexto familiar), sem incluir CI ou E2E nessa Issue. Demais entregas e dependências propostas em `plano-v1.md`; não implementadas nem repriorizadas no GitHub.
- **Controle:** autonomia dentro do escopo aprovado; não fazer commit, push, merge ou alterações destrutivas sem autorização. Relatar candidatos a backlog sem implementar melhorias laterais.

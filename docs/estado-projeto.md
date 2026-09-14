# Estado do Mercadeira

Atualizado em 14/09/2026. Backlog oficial: GitHub Project Mercadeira, owner lnrdgst.

- **Último marco concluído:** reutilização BE #12 / FE #14 aprovada manualmente pelo usuário em 14/09/2026; checkpoint em main autorizado. Sugestões BE #11 / FE #13 já enviadas em 44a087a / 75148f2.
- **Trabalho atual:** reutilização BE #12 / FE #14 validada. Fonte: ItemCompra FINALIZADA, NO_CARRINHO/PENDENTE (inclusive inclusões durante Compra), excluindo REMOVIDO. Novos ItemLista independentes; somente executor participa inicialmente. Capability podeReutilizarLista, POST sem body, 201 com nova lista. Contrato: backend docs/contrato-reutilizacao-lista.md. Sem migration. Commit/push autorizado após aprovação manual.
- **Evidências:** 34 testes backend aprovados (6 novos + 28 de finalização), com PostgreSQL e rollback. Frontend: suíte completa de 88 aprovada; após adicionar regressão de saída da página, os 11 testes de reutilização e tsc passaram (89 cenários no total, 78 anteriores preservados). Build/lint e diff-check aprovados. Validação manual integrada aprovada pelo usuário. Observações fora da reutilização registradas em FE #15 (sugestões durante Compra) e FE #16 (atualização periódica), ambas Backlog/Média.

- **Próxima tarefa:** seguir plano-v1.md: UX essencial e gestão familiar mínima, então gate final do piloto. Não implementar Histórico dedicado ou backlog lateral nesta etapa.

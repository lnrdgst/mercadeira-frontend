# Estado do Mercadeira

Atualizado em 14/09/2026. Backlog oficial: GitHub Project Mercadeira, owner lnrdgst.

- **Último marco concluído:** BE #1 / FE #2, edição básica da lista, enviados em 09f4e11 / 6418567; testes manuais aprovados pelo usuário.
- **Trabalho atual:** sugestões da família implementadas em BE #11 / FE #13. Endpoint consulta ItemLista em preparação e ItemCompra em andamento/finalizada, sem removidos/canceladas; 10 descrições distintas por recência. Autocomplete acessível no formulário de inclusão/edição da preparação; preenche somente descrição/unidade. Contrato: backend docs/contrato-sugestoes-itens.md. Sem migration, biblioteca nova ou cadastro mestre.
- **Evidências:** backend 28 testes aprovados (6 novos + regressões de lista); frontend 78 testes aprovados (69 anteriores + 9 novos), build/lint sem avisos e diff-check aprovado. Testes HTTP backend com PostgreSQL; frontend com DOM/HTTP simulado. Sem validação visual em navegador conectado nesta entrega. Checkpoint automático autorizado, separado por repositório.
- **Próxima tarefa:** reutilização de lista finalizada; definir se a fonte é a preparação original ou os itens efetivos da Compra, incluindo os adicionados durante ela. Depois: UX essencial e gestão familiar mínima, encerrando o piloto sem aba Histórico ou funcionalidades futuras. Não encerrar V1 antes dessas etapas.

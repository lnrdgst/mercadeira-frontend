# Estado do Mercadeira

Atualizado em 13/09/2026. Registro de retomada; README documenta o produto e GitHub Project mantém o backlog.

- **Repositórios:** frontend em `C:\Users\leoaf\projetos\mercadeira-frontend`; backend em `C:\Users\leoaf\projetos\mercadeira.api`.
- **Backlog:** https://github.com/users/lnrdgst/projects/1 — consultar prioridade, status e dependências antes de escolher uma Issue. Não criar Issues automaticamente.
- **Produto:** fluxo de autenticação, família, preparação de listas e Compra até revisão/finalização implementado. Último marco concluído: Compra 4, com os seis cenários manuais aprovados pelo usuário em 13/09/2026; detalhes em `marco-compra-4.md`.
- **Trabalho atual:** piloto reduzido confirmado, sem Histórico dedicado. Navegação com Início/Listas/Família; `/historico` redireciona para `/listas`; componente preservado. Issue frontend #8 implementada localmente e pronta para revisão. Working tree estava limpo no início desta tarefa; nenhuma alteração do Compra 4 foi descartada.
- **Contrato:** backend `docs/contratos-compra-4.md`, validado em 12/09/2026. Contratos atuais, código e testes do backend prevalecem sobre documentação antiga.
- **Decisões:** backend define domínio, autorização e capabilities; frontend consome respostas completas. Restauração usa POST sem body, 200 com ItemCompra completo, capability exclusiva, auditorias preservadas e GET em 409. Revisão/finalização não oferecem mutações de itens.
- **Evidências:** `npm test` verifica tipos e executa Vitest/jsdom: 49 testes aprovados (19 anteriores preservados + 30 novos). Build/lint aprovados; código de saída 1 comprovado com falha temporária removida. Sem colisão de porta. Compra 4 tem aceite manual do usuário; suíte frontend não equivale a E2E. Backend não foi alterado nem retestado.
- **Pendência imediata:** revisão das alterações locais da Issue #8 e do piloto. GitHub não foi atualizado; #8 ainda aparece como Pronto para desenvolver e cita 14 testes antigos. Histórico BE #2/FE #4 adiado para depois da V1.
- **Próxima tarefa recomendada:** FE #1, confirmação de remoção acessível. CI/E2E permanecem em #9/#10; edição básica e documentação backend seguem o plano do piloto. Não iniciar melhorias laterais.
- **Controle:** autonomia dentro do escopo aprovado; não fazer commit, push, merge ou alterações destrutivas sem autorização. Relatar candidatos a backlog sem implementar melhorias laterais.

# FE #16 — Atualização periódica da Compra

## Escopo

Antes desta entrega, CompraAndamentoPage consultava a Compra na entrada e em reconciliações de operações. Agora a tela consulta o mesmo GET completo a cada **15 segundos** enquanto o estado é EM_ANDAMENTO e o documento está visível. O intervalo reduz a necessidade de F5 sem consultas por item/participante ou carga de atualização instantânea. Nenhuma alteração backend, WebSocket ou SSE.

## Atualização e ciclo de vida

- Respostas válidas substituem a Compra inteira: itens, participantes, presença, contexto, capabilities, remoções, decisões, restaurações, autoria e finalização.
- O loading inicial permanece separado. O polling não ativa loading global, não desabilita controles nem altera presença.
- Há um único intervalo por tela, sem sobrepor GETs periódicos. Uma consulta lenta impede outra até terminar ou ser cancelada.
- Documento oculto remove o intervalo e aborta a consulta periódica. Ao voltar, consulta imediatamente e retoma os 15 segundos. Foco de janela também consulta quando visível. Request em andamento e janela de deduplicação de 1 segundo evitam GETs duplicados de focus/visibilitychange.
- Operação local ou reconciliação em andamento tem prioridade. O retorno de foco durante uma operação não dispara outra leitura: o ciclo seguinte retoma normalmente.
- FINALIZADA usa a tela de resumo já existente e encerra o intervalo, removendo controles operacionais. Outros estados não EM_ANDAMENTO também não iniciam polling.
- Desmontagem/troca de família, lista ou token cancela GET periódico, remove listeners e timer. O GET inicial também recebe AbortSignal e é cancelado na limpeza.

## Concorrência

Comandos e reconciliações locais continuam serializados pela trava existente. Ao começar, incrementam uma geração e abortam/inutilizam qualquer leitura periódica anterior. A resposta do polling só é aplicada se a geração for atual, o signal não tiver sido abortado e o efeito ainda estiver ativo. Isso também protege contra transporte que entregue resposta mesmo depois de abortar.

O polling não usa a trava visual das mutações, permitindo executar ações enquanto a leitura está em andamento. Não dispara GET imediato após sucesso local; usa o próximo ciclo, evitando também uma consulta a menos de 1 segundo do término da operação. Reconciliações por conflito permanecem inalteradas e aplicam a Compra completa.

## Formulários, erros e autorização

Chaves de componentes não dependem da resposta periódica. Enquanto o contexto e a participação permanecem válidos, modal, campos digitados e foco são preservados. Finalização remota remove os controles conforme o fluxo anterior. Nenhuma permissão é inferida pelo polling: a API revalida todas as mutações.

Falha de rede ou HTTP diferente de 401 preserva a última Compra válida e tenta novamente no próximo ciclo, sem alertas repetidos. Isso também vale para 403/404; o estado exibido pode estar desatualizado e não concede autorização. 401 encerra a sessão e para consultas mesmo antes de a tela desmontar. Erros/respostas de consultas canceladas são ignorados.

## Validação

21 cenários em `tests/compra-polling.test.tsx`, com relógio controlado e HTTP simulado: intervalo, substituição integral, novos itens, contexto/presença/capabilities, carrinho/remoção/restauração e auditoria, finalização remota, visibilidade/foco, escrita concorrente, resposta atrasada, falha/recovery, 401, limpeza, troca de lista e formulário/foco preservados.

Executar testes focados, `npm.cmd test`, `npm.cmd run build` (inclui TypeScript), `npm.cmd run lint` e `git diff --check`.

Validação em 17/09/2026: 21 testes focados e 131 testes da suíte completa aprovados em 12 arquivos. TypeScript, build Vite, lint e `git diff --check` aprovados; diff revisado. Backend preservado no commit `f42fc70` com working tree limpo.

Navegador não disponível nesta sessão: acompanhamento real entre duas contas, sem F5, permanece pendente para homologação. A Issue fica aberta em Em teste após a validação automatizada e o versionamento. Limite esperado: sincronização eventual de 15 segundos, acrescida do tempo de rede, e pausada durante escrita/aba oculta; não há garantia de atualização instantânea.

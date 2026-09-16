# Presença operacional na Compra

Issue frontend #17. Depende de `lnrdgst/mercadeira#13`, contrato validado no commit backend `f42fc70e48f95acb691fe60ffbc3e0c9ea492c96`.

## Interface e contrato

A tela da Compra mostra uma única área compacta de participantes entre o aviso de participação e a ação Revisar compra. Os chips exibem nome e um dos três rótulos: Presença não informada, No mercado ou Não está no mercado. Participação continua separada de presença. Nenhum estado representa conexão, localização verificada ou presença durante toda a Compra.

A identidade já carregada por `/usuarios/me` identifica o próprio participante pelo `usuarioId`; não confere autorização. O bloco Minha presença no mercado aparece apenas enquanto esse participante está NAO_INFORMADA. Após a primeira declaração, o bloco desaparece e o próprio chip oferece Entrar/Sair, exclusivamente com `podeAlterarPresenca === true`. Terceiros são informativos, mesmo com nome igual ao usuário. Identidade ausente ou em carregamento não é inferida por nome, papel ou posição.

O chip usa botão nativo com nome acessível contendo participante, estado e ação explícita. Enter/Espaço executam a ação. Após a resposta, o foco retorna ao chip; se a permissão desaparece, retorna ao título da área; falha que exige reconciliação direciona ao botão Atualizar compra. Estados têm texto próprio, sem depender de cor. Chips usam flex-wrap, largura máxima e quebra de nomes longos para mobile, larguras intermediárias e desktop, ainda sujeitos à homologação visual final.

Quando `contextoUsuario.podeAlterarPresenca` é explicitamente verdadeiro, as ações “Estou no mercado” e “Não estou no mercado” enviam `PUT /api/familias/{familiaId}/listas/{listaId}/compra/minha-presenca`, com Bearer e somente `{ "estado": "PRESENTE" }` ou `{ "estado": "NAO_PRESENTE" }`. Não há toggle nem envio de identidade/timestamp. A resposta 200 substitui a Compra completa, sem atualização otimista.

O chip oferece a declaração oposta ao estado retornado, mas o comando continua enviando um estado explícito, sem endpoint de toggle. Loading, trava contra duplicação e tratamento de resultado incerto permanecem os mesmos.

Colocar no carrinho usa exclusivamente `item.acoes.podeColocarNoCarrinho === true`. Restauração mantém `podeRestaurarNoCarrinho`. Capability ausente não libera a ação por participação. Presença ausente no response aparece como indisponível, sem inventar uma declaração.

Inclusão de itens permanece vinculada à participação. Remoção, aprovação, rejeição e finalização preservam suas capabilities e regras. A revisão e o resumo final permanecem sem controles de presença.

## Requisições e recuperação

Comandos e reconciliações da tela são serializados para evitar GET obsoleto sobrescrevendo mutação posterior. Controles ficam temporariamente indisponíveis durante a requisição. A troca de família, lista ou token remonta o contexto e descarta respostas da tela anterior.

Todo GET de reconciliação aplica a Compra inteira, inclusive participantes e capabilities de todos os itens. Uma resposta FINALIZADA remove os controles operacionais.

Erros de declaração, exceto 401 (encerra a sessão), consultam o GET antes de permitir outra declaração. Se a consulta falhar, a interface exige “Atualizar compra”. Nenhum PUT é repetido automaticamente. Em falha de conexão, o usuário confere o estado retornado antes de decidir enviar outra declaração.

## Validação

Testes de interface com HTTP simulado cobrem estados, capabilities, payload/Bearer, substituição integral, duplo clique, erros HTTP/rede, reconciliação manual, finalização concorrente e troca de contexto. A suíte existente preserva as regressões de remoção, restauração e finalização.

Executar `npm.cmd test`, `npm.cmd run build`, `npm.cmd run lint` e `git diff --check`.

Refinamento UX: 21 testes focados de presença e 110 testes na suíte completa aprovados. TypeScript, build, lint e verificação de whitespace aprovados. A cobertura adicional verifica a transição do bloco inicial para chip, alteração por teclado, retorno de foco, unicidade/posição da seção e controles exclusivos do próprio participante sujeitos à capability. Navegador indisponível nesta sessão; homologação final mobile/intermediária/desktop continua pendente, sem bloquear o versionamento explicitamente autorizado.

A validação ponta a ponta com backend real e a homologação visual continuam separadas dos testes automatizados desta entrega. A publicação deve ser coordenada com o backend V10; abas antigas precisam ser recarregadas. Sem polling ou WebSocket neste marco.

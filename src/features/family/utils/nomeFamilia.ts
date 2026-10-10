export function normalizarNomeFamilia(nome: string) {
  return nome.trim()
}

export function contemPalavraFamilia(nome: string) {
  return /\bfamilia\b/i.test(
    nome.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  )
}

export function validarNomeFamilia(nome: string) {
  const nomeNormalizado = normalizarNomeFamilia(nome)

  if (nomeNormalizado.length < 2) {
    return { valido: false, nome: nomeNormalizado, mensagem: 'Informe pelo menos 2 caracteres.' }
  }

  if (nomeNormalizado.length > 120) {
    return { valido: false, nome: nomeNormalizado, mensagem: 'Informe no máximo 120 caracteres.' }
  }

  if (contemPalavraFamilia(nomeNormalizado)) {
    return { valido: false, nome: nomeNormalizado, mensagem: 'Digite apenas o nome, sem a palavra "Família".' }
  }

  return { valido: true, nome: nomeNormalizado, mensagem: null }
}

type OpcoesFormatacaoDataContextual = {
  incluirHora?: boolean
  agora?: Date
}

function iniciarDiaLocal(data: Date) {
  return Date.UTC(data.getFullYear(), data.getMonth(), data.getDate())
}

function capitalizar(valor: string) {
  return valor ? `${valor[0].toUpperCase()}${valor.slice(1)}` : valor
}

/** Formata datas de apresentação pelo calendário local do dispositivo. */
export function formatarDataContextual(valor: string | Date, opcoes: OpcoesFormatacaoDataContextual = {}) {
  const data = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(data.getTime())) return ''

  const agora = opcoes.agora ?? new Date()
  const diferencaEmDias = (iniciarDiaLocal(agora) - iniciarDiaLocal(data)) / 86_400_000
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data)
  const prefixo = diferencaEmDias === 0
    ? 'Hoje'
    : diferencaEmDias === 1
      ? 'Ontem'
      : capitalizar(new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(data))
  const horario = opcoes.incluirHora
    ? ` às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(data)}`
    : ''

  return `${prefixo}, ${dataFormatada}${horario}`
}

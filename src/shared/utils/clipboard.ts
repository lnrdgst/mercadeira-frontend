export async function copiarTexto(texto: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Contextos não seguros e alguns navegadores bloqueiam a Clipboard API.
  }

  const campo = document.createElement('textarea')
  campo.value = texto
  campo.setAttribute('readonly', '')
  campo.style.position = 'fixed'
  campo.style.opacity = '0'
  document.body.appendChild(campo)

  try {
    campo.select()
    campo.setSelectionRange(0, campo.value.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    campo.remove()
  }
}

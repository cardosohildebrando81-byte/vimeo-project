// Utilitários para sanitização e construção segura de URLs de redirect
// Evita quebras de linha (CRLF) e espaços que possam gerar 500 no GoTrue ao usar redirect_to

// Remove CRLF codificados (%0D%0A) e caracteres reais \r\n
export function stripCrlf(input: string): string {
  return (input || '')
    .replace(/%0D/gi, '')
    .replace(/%0A/gi, '')
    .replace(/[\r\n]+/g, '')
}

// Limpa a URL removendo CRLF e espaços extras; tenta manter apenas caracteres válidos de URL
export function cleanUrl(raw: string): string {
  const withoutCrlf = stripCrlf(raw)
  // Remove espaços em branco (inclui tabs) e recorta
  const noWhitespace = withoutCrlf.replace(/\s+/g, '')
  return noWhitespace.trim()
}

// Normaliza base (sem barra final)
export function normalizeBase(base: string): string {
  const cleaned = cleanUrl(base)
  return cleaned.replace(/\/+$/g, '')
}

// Normaliza caminho (com barra inicial)
export function normalizePath(path: string): string {
  const cleaned = stripCrlf(path).trim()
  if (!cleaned) return '/'
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

// Constrói URL absoluta de redirect de forma segura a partir de uma base e caminho
// - Se base for undefined, usa window.location.origin (quando disponível)
// - Garante que não existam CRLF nem espaços
// - Junta corretamente evitando barra duplicada
export function buildRedirectUrl(base?: string, path: string = '/reset-password'): string {
  try {
    const pathClean = normalizePath(path)

    // Resolve base preferencialmente do parâmetro; caso contrário, tenta window.origin
    let baseCandidate = base
    if (!baseCandidate && typeof window !== 'undefined' && window.location?.origin) {
      baseCandidate = window.location.origin
    }

    const baseClean = baseCandidate ? normalizeBase(baseCandidate) : ''

    if (baseClean) {
      try {
        // Usa o construtor URL para garantir validade e normalização
        const url = new URL(pathClean, baseClean)
        return url.toString()
      } catch (_) {
        // Fallback de concatenação direta (já normalizada)
        return `${baseClean}${pathClean}`
      }
    }

    // Fallback final: assume localhost seguro
    return `https://localhost${pathClean}`
  } catch (_) {
    // Em caso de erros inesperados, retorna um caminho seguro padrão
    return 'https://localhost/reset-password'
  }
}
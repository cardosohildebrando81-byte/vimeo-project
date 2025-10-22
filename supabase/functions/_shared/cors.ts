// Em: supabase/_shared/cors.ts

// 1. Lista de origens permitidas
const allowedOrigins = [
  'https://vimeo-project-tdvoutor.vercel.app',
  'http://localhost:8081', // Adicionamos o localhost
]

export const corsHeaders = (requestOrigin: string | null) => {
  // 2. Verifica se a origem da requisição está na nossa lista
  const origin = (requestOrigin && allowedOrigins.includes(requestOrigin))
    ? requestOrigin
    : allowedOrigins[0] // Usa a Vercel como padrão

  // 3. Retorna os headers
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
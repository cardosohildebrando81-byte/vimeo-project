import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// FIX 1: Importamos a *função* corsHeaders
import { corsHeaders } from '../_shared/cors.ts'

interface CreateUserRequest {
  email: string
  password: string
  metadata?: {
    full_name?: string
    role?: string // Ex: "Comum", "Administrativo"
    organization_id?: string
  }
}

// FIX 2: Mapeamento dos papéis do frontend para os papéis do DB
const roleMapping: { [key: string]: string } = {
  'comum': 'CLIENT',
  'manager': 'MANAGER', // Adicione outros se precisar
  'admin': 'ADMIN',
  'administrativo': 'ADMIN'
};

serve(async (req) => {
  // FIX 1: Gerar headers dinamicamente
  const requestOrigin = req.headers.get('Origin');
  const headers = corsHeaders(requestOrigin);

  // Responder ao preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  // Verificar se é uma requisição POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método não permitido. Use POST.' 
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }, // FIX 1
        status: 405,
      }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, password, metadata }: CreateUserRequest = await req.json()

    // --- Validações (Seu código aqui estava ótimo) ---
    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Email e senha são obrigatórios' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 400 } // FIX 1
      )
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ success: false, error: 'A senha deve ter no mínimo 8 caracteres' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 400 } // FIX 1
      )
    }
    // --- Fim Validações ---


    // FIX 2: Sanitizar o "Papel" antes de enviar para o Auth
    // Pega o papel vindo do frontend (ex: "Comum"), converte para minúsculo
    const incomingRole = metadata?.role?.toLowerCase() || 'client';
    // Mapeia para o valor do DB (ex: "CLIENT") ou usa 'CLIENT' como padrão
    const validDbRole = roleMapping[incomingRole] || 'CLIENT';


    // Criar usuário usando Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: metadata?.full_name || email.split('@')[0],
        role: validDbRole, // FIX 2: Usamos o papel válido
        organization_id: metadata?.organization_id || '1'
        // 'is_admin' removido pois 'role' já faz isso
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message || 'Erro ao criar usuário' 
        }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 400 } // FIX 1
      )
    }

    // FIX 3: REMOVIDO BLOCO DE SINCRONIZAÇÃO MANUAL
    // O trigger "handle_new_user" que já criamos
    // vai ler o 'user_metadata.role' (que agora é 'CLIENT')
    // e fazer a inserção correta na tabela public."User" automaticamente.

    // Resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        message: `Usuário ${email} criado com sucesso`
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }, // FIX 1
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro inesperado na Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }, // FIX 1
        status: 500,
      }
    )
  }
})
import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzUyOTEsImV4cCI6MjA3NTc1MTI5MX0.h_1BqXgl5tCBguK_1UNmGJVb9vXDu8tct2z5cYuW1Jc';

// Criação do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipos para autenticação
export interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    role?: string
    user_role?: string
    profile_role?: string
    is_admin?: boolean
    admin?: boolean
    isAdmin?: boolean
  }
  created_at?: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: AuthUser
}

// Tipos para resposta de autenticação
export interface AuthResponse {
  data: {
    user: AuthUser | null
    session: AuthSession | null
  }
  error: Error | null
}

// Tipos para perfil de usuário (exemplo)
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Classe de serviço para operações do Supabase
export class SupabaseService {
  private client = supabase

  // Teste de conexão
  async testConnection(): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      // Tenta obter a sessão atual
      const { data: { session }, error } = await this.client.auth.getSession()
      
      if (error) {
        return {
          success: false,
          message: `Erro na conexão: ${error.message}`
        }
      }

      // Se há uma sessão ativa
      if (session?.user) {
        return {
          success: true,
          message: 'Conectado com sucesso! Usuário autenticado.',
          user: session.user as AuthUser
        }
      }

      // Testa a conexão fazendo uma query simples
      const { error: testError } = await this.client
        .from('_test_connection')
        .select('*')
        .limit(1)

      // Se não há erro ou é um erro de tabela não encontrada (esperado)
      if (!testError || testError.code === 'PGRST116') {
        return {
          success: true,
          message: 'Conexão com Supabase estabelecida com sucesso!'
        }
      }

      return {
        success: false,
        message: `Erro no teste de conexão: ${testError.message}`
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  // Autenticação com email e senha
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    })

    return { data, error }
  }

  // Registro com email e senha
  async signUpWithEmail(email: string, password: string, metadata?: object): Promise<AuthResponse> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        // Define explicitamente a URL de redirecionamento para confirmação de e-mail
        // Evita depender apenas da configuração de "Site URL" do projeto na Supabase
        emailRedirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/reset-password`
      }
    })

    return { data, error }
  }

  // Enviar email de redefinição de senha
  async resetPassword(email: string, redirectTo?: string): Promise<{ error: Error | null }> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    return { error }
  }

  // Atualizar metadata do usuário atual
  async updateCurrentUser(metadata: object): Promise<{ error: Error | null }> {
    const { error } = await this.client.auth.updateUser({
      data: metadata as any,
    })
    return { error }
  }

  // Logout
  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await this.client.auth.signOut()
    return { error }
  }

  // Obter usuário atual
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: Error | null }> {
    const { data: { user }, error } = await this.client.auth.getUser()
    return { user: user as AuthUser | null, error }
  }

  // Obter sessão atual
  async getCurrentSession(): Promise<{ session: AuthSession | null; error: Error | null }> {
    const { data: { session }, error } = await this.client.auth.getSession()
    return { session: session as AuthSession | null, error }
  }

  // Escutar mudanças de autenticação
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    return this.client.auth.onAuthStateChange(callback)
  }

  // Operações de banco de dados genéricas
  async select<T>(table: string, columns = '*', filters?: object): Promise<{ data: T[] | null; error: Error | null }> {
    let query = this.client.from(table).select(columns)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query
    return { data: data as T[] | null, error }
  }

  async insert<T>(table: string, data: Partial<T>): Promise<{ data: T[] | null; error: Error | null }> {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()

    return { data: result as T[] | null, error }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<{ data: T[] | null; error: Error | null }> {
    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()

    return { data: result as T[] | null, error }
  }

  async delete(table: string, id: string): Promise<{ error: Error | null }> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id)

    return { error }
  }
}

// Instância singleton do serviço
export const supabaseService = new SupabaseService()

// Hook personalizado para usar o Supabase (será usado nos componentes React)
export const useSupabase = () => {
  return {
    client: supabase,
    service: supabaseService,
    testConnection: () => supabaseService.testConnection(),
    signIn: (email: string, password: string) => supabaseService.signInWithEmail(email, password),
    signUp: (email: string, password: string, metadata?: object) => supabaseService.signUpWithEmail(email, password, metadata),
    resetPassword: (email: string, redirectTo?: string) => supabaseService.resetPassword(email, redirectTo),
    updateCurrentUser: (metadata: object) => supabaseService.updateCurrentUser(metadata),
    signOut: () => supabaseService.signOut(),
    getCurrentUser: () => supabaseService.getCurrentUser(),
    getCurrentSession: () => supabaseService.getCurrentSession(),
    onAuthStateChange: (callback: (event: string, session: AuthSession | null) => void) => 
      supabaseService.onAuthStateChange(callback)
  }
}
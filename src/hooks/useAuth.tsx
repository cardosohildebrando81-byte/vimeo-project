import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useSupabase, AuthUser, AuthSession } from '../lib/supabase'

interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, metadata?: object) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  refreshSession: () => Promise<void>
}

// Contexto global de autenticação para garantir um único estado compartilhado em toda a aplicação
const AuthContext = createContext<(AuthState & AuthActions) | null>(null)

// Implementação interna do estado/ações de autenticação (antes era exportada diretamente)
const useAuthInternal = (): AuthState & AuthActions => {
  const { getCurrentUser, getCurrentSession, signIn: supabaseSignIn, signUp: supabaseSignUp, signOut: supabaseSignOut, onAuthStateChange } = useSupabase()
  
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false
  })

  // Função para atualizar o estado do usuário
  const updateAuthState = useCallback(async () => {
    try {
      const [userResult, sessionResult] = await Promise.all([
        getCurrentUser(),
        getCurrentSession()
      ])

      setState(prev => ({
        ...prev,
        user: userResult.user,
        session: sessionResult.session,
        loading: false,
        initialized: true
      }))
    } catch (error) {
      console.error('Erro ao atualizar estado de autenticação:', error)
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        loading: false,
        initialized: true
      }))
    }
  }, [getCurrentUser, getCurrentSession])

  // Inicializar estado de autenticação
  useEffect(() => {
    updateAuthState()
  }, [updateAuthState])

  // Escutar mudanças de autenticação
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session)
      
      setState(prev => ({
        ...prev,
        user: (session?.user as AuthUser) || null,
        session: (session as AuthSession) || null,
        loading: false,
        initialized: true
      }))
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [onAuthStateChange])

  // Função de login
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { data, error } = await supabaseSignIn(email, password)
      
      if (error) {
        setState(prev => ({ ...prev, loading: false }))
        return { 
          success: false, 
          error: error.message || 'Erro ao fazer login' 
        }
      }

      // O estado será atualizado automaticamente pelo listener
      return { success: true }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }))
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro inesperado' 
      }
    }
  }, [supabaseSignIn])

  // Função de registro
  const signUp = useCallback(async (email: string, password: string, metadata?: object) => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { data, error } = await supabaseSignUp(email, password, metadata)
      
      if (error) {
        setState(prev => ({ ...prev, loading: false }))
        return { 
          success: false, 
          error: error.message || 'Erro ao criar conta' 
        }
      }

      // O estado será atualizado automaticamente pelo listener
      return { success: true }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }))
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro inesperado' 
      }
    }
  }, [supabaseSignUp])

  // Função de logout
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { error } = await supabaseSignOut()
      
      if (error) {
        setState(prev => ({ ...prev, loading: false }))
        return { 
          success: false, 
          error: error.message || 'Erro ao fazer logout' 
        }
      }

      // O estado será atualizado automaticamente pelo listener
      return { success: true }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }))
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro inesperado' 
      }
    }
  }, [supabaseSignOut])

  // Função para atualizar sessão
  const refreshSession = useCallback(async () => {
    await updateAuthState()
  }, [updateAuthState])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession
  }
}

// Provider global de autenticação
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthInternal()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

// Hook público que consome o contexto; se não houver Provider, cai no modo local
export const useAuth = (): AuthState & AuthActions => {
  const ctx = useContext(AuthContext)
  return ctx ?? useAuthInternal()
}

// Hook para verificar se o usuário está autenticado
export const useRequireAuth = () => {
  const auth = useAuth()
  
  useEffect(() => {
    if (auth.initialized && !auth.loading && !auth.user) {
      // Redirecionar para login se não estiver autenticado
      console.warn('Usuário não autenticado')
    }
  }, [auth.initialized, auth.loading, auth.user])

  return auth
}

// Hook para dados do usuário com loading state
export const useUser = () => {
  const { user, loading, initialized } = useAuth()
  
  return {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    isLoading: loading || !initialized
  }
}
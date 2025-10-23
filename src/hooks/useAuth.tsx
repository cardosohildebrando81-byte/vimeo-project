import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useSupabase, AuthUser, AuthSession } from '@/lib/supabase';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: object) => Promise<{ success: boolean; error?: string; user?: AuthUser | null }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

const useAuthInternal = (): AuthState & AuthActions => {
  const { 
    getCurrentUser,
    getCurrentSession,
    signIn: supabaseSignIn,
    signUp: supabaseSignUp,
    signOut: supabaseSignOut,
    onAuthStateChange,
    ensureDbUserForSession
  } = useSupabase();

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false
  });

  const updateAuthState = useCallback(async () => {
    try {
      const [userResult, sessionResult] = await Promise.all([
        getCurrentUser(),
        getCurrentSession()
      ]);

      // 🧠 Prioriza sempre o user da sessão (contém app_metadata completo)
      const supabaseUser = sessionResult.session?.user ?? userResult.user ?? null;

      setState({
        user: supabaseUser,
        session: sessionResult.session,
        loading: false,
        initialized: !!supabaseUser
      });

      // Sincroniza user no DB, se ativado
      if (supabaseUser && import.meta.env.VITE_SYNC_USER_CLIENT_SIDE === 'true') {
        ensureDbUserForSession(sessionResult.session);
      }
    } catch (error) {
      console.error('[Auth] Falha ao atualizar estado:', error);
      setState({
        user: null,
        session: null,
        loading: false,
        initialized: true
      });
    }
  }, [getCurrentUser, getCurrentSession, ensureDbUserForSession]);

  // 🔁 Atualiza ao iniciar
  useEffect(() => {
    updateAuthState();
  }, [updateAuthState]);

  // 🔄 Listener de eventos (login/logout/refresh)
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event);
      const sessionUser = session?.user ?? null;

      setState({
        user: sessionUser,
        session: session ?? null,
        loading: false,
        initialized: true
      });

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && import.meta.env.VITE_SYNC_USER_CLIENT_SIDE === 'true') {
        ensureDbUserForSession(session);
      }
    });

    return () => subscription?.unsubscribe();
  }, [onAuthStateChange, ensureDbUserForSession]);

  // 🔐 Ações
  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true }));
    const { error } = await supabaseSignIn(email, password);
    if (error) {
      setState((s) => ({ ...s, loading: false }));
      return { success: false, error: error.message };
    }
    return { success: true };
  }, [supabaseSignIn]);

  const signUp = useCallback(async (email: string, password: string, metadata?: object) => {
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabaseSignUp(email, password, metadata);
    if (error) {
      setState((s) => ({ ...s, loading: false }));
      return { success: false, error: error.message };
    }
    return { success: true, user: data?.user ?? null };
  }, [supabaseSignUp]);

  const signOut = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const { error } = await supabaseSignOut();
    setState((s) => ({ ...s, loading: false }));
    return { success: !error, error: error?.message };
  }, [supabaseSignOut]);

  const refreshSession = useCallback(async () => {
    await updateAuthState();
  }, [updateAuthState]);

  return { ...state, signIn, signUp, signOut, refreshSession };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthInternal();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState & AuthActions => {
  const ctx = useContext(AuthContext);
  return ctx ?? useAuthInternal();
};

// Conveniência: hook que retorna dados mais simples de consumo em componentes de teste
export const useUser = () => {
  const { user, loading } = useAuth();
  return {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
  } as const;
};

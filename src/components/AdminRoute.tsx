import { ReactNode, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading, initialized: authInitialized } = useAuth();
  const { isAdmin, loading: roleLoading, initialized: roleInitialized } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Memoiza os estados para evitar re-renders desnecessários
  const authState = useMemo(() => ({
    initialized: authInitialized && roleInitialized,
    loading: authLoading || roleLoading,
    hasUser: !!user,
    isAdmin
  }), [authInitialized, roleInitialized, authLoading, roleLoading, user, isAdmin]);

  // Memoiza a função de navegação para evitar re-criações
  const handleNavigation = useCallback(() => {
    if (!authState.initialized || authState.loading) {
      return; // Ainda carregando, não navega
    }

    if (!authState.hasUser) {
      navigate('/login', { state: { from: location }, replace: true });
    } else if (!authState.isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [authState, navigate, location]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Loading state
  if (!authState.initialized || authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Não autorizado
  if (!authState.hasUser || !authState.isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default AdminRoute;
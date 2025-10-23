import { ReactNode, useEffect } from 'react';
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

  useEffect(() => {
    const initialized = authInitialized && roleInitialized;
    const loading = authLoading || roleLoading;

    if (initialized && !loading) {
      if (!user) {
        navigate('/login', { state: { from: location }, replace: true });
      } else if (!isAdmin) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, roleLoading, authInitialized, roleInitialized, isAdmin, navigate, location]);

  const initialized = authInitialized && roleInitialized;
  const loading = authLoading || roleLoading;

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default AdminRoute;
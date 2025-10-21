import { ReactNode, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = useMemo(() => {
    const md = (user?.user_metadata as any) || {};
    const role = (md?.role || md?.user_role || md?.profile_role || '').toString().toLowerCase();
    const flags = [md?.is_admin, md?.admin, md?.isAdmin];
    return !!user && (role === 'admin' || flags.some((v: any) => v === true));
  }, [user]);

  useEffect(() => {
    if (initialized && !loading) {
      if (!user) {
        navigate('/login', { state: { from: location }, replace: true });
      } else if (!isAdmin) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, initialized, isAdmin, navigate, location]);

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
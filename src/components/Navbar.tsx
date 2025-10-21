import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Video, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, initialized, loading } = useAuth();

  // Removido array de navegação para uso interno
  const navigation: any[] = [];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary shadow-primary transition-transform group-hover:scale-105">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">TV Doutor</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Gestão de Vídeos Médicos</span>
            </div>
          </Link>

          {/* Desktop Navigation - Removido para uso interno */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Menu vazio para uso interno */}
          </div>

          {/* Auth Buttons - Condicional baseado no estado de autenticação */}
          <div className="hidden md:flex items-center space-x-3">
            {initialized && !loading && !user && (
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button - Removido pois não há itens de menu */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
            style={{ display: 'none' }} // Oculto pois não há menu
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu - Removido para uso interno */}
      {isOpen && (
        <div className="md:hidden border-t border-border animate-fade-in" style={{ display: 'none' }}>
          <div className="container mx-auto px-4 py-4 space-y-2">
            {/* Menu mobile vazio */}
            <div className="pt-4 space-y-2 border-t border-border">
              {initialized && !loading && !user && (
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full justify-start">
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

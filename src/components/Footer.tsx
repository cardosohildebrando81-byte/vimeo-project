import { Video } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const { user, initialized, loading } = useAuth();

  const isLoggedIn = initialized && !loading && !!user;
  const isLanding = location.pathname === "/";
  const showSections = !isLoggedIn && isLanding;

  return (
    <footer className="w-full border-t border-border bg-card">
      <div className={`container mx-auto px-4 ${showSections ? "py-12" : "py-4"}`}>
        {showSections && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">TV Doutor</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma profissional para gestão inteligente de conteúdo médico educacional em vídeo.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/search" className="hover:text-primary transition-colors">
                    Buscar Vídeos
                  </Link>
                </li>
                <li>
                  <Link to="/lists" className="hover:text-primary transition-colors">
                    Listas Salvas
                  </Link>
                </li>
                <li>
                  <Link to="/analytics" className="hover:text-primary transition-colors">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Sobre Nós
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacidade
                  </a>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className={`${showSections ? "mt-12 pt-8" : "mt-4 pt-4"} border-t border-border text-center text-sm text-muted-foreground`}>
          <p>&copy; {currentYear} TV Doutor. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

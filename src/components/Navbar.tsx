import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Video, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/*
  Navbar acessível com:
  - Header sticky + backdrop blur + sombra leve
  - CTA sempre visível (Acessar sistema)
  - Menu mobile com aria-* e foco ciclado; fecha com Esc e clique fora
*/

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) navigate("/");
  };

  // Fechar com ESC e clique fora
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      // Trap de foco simples: Tab cicla dentro do menu quando aberto
      if (isOpen && e.key === "Tab" && menuRef.current) {
        const focusables = Array.from(
          menuRef.current.querySelectorAll<HTMLElement>(
            'a, button, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const goingBackward = (e.shiftKey === true);
        if (!goingBackward && active === last) {
          e.preventDefault();
          first.focus();
        } else if (goingBackward && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [isOpen]);

  useEffect(() => {
    // Fecha menu ao navegar
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" aria-label="Ir para a página inicial">
            <Video className="w-6 h-6 text-primary" />
            <span className="font-semibold">TV Doutor</span>
          </Link>

          {/* Navegação desktop */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
            <Link to="/" className={`text-sm hover:text-primary transition-smooth ${isActive('/') ? 'text-primary' : ''}`}>Início</Link>
            <a href="#como-funciona" className="text-sm hover:text-primary transition-smooth">Como funciona</a>
            <a href="#vitrine" className="text-sm hover:text-primary transition-smooth">Exemplos</a>
            <a href="#faq" className="text-sm hover:text-primary transition-smooth">FAQ</a>
          </nav>

          {/* CTA sempre visível */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Button size="sm" variant="outline" onClick={handleSignOut}>Sair</Button>
            ) : (
              <Link to="/login">
                <Button size="sm" className="gradient-primary shadow-primary">Acessar sistema</Button>
              </Link>
            )}
          </div>

          {/* Botão do menu mobile */}
          <div className="md:hidden">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsOpen(v => !v)}
              aria-label="Abrir menu"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border bg-white/70"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 md:hidden" aria-hidden="true" />}

      {/* Menu mobile acessível */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'} transition-smooth`}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-2" aria-label="Navegação móvel">
              <Link to="/" className="px-2 py-2 rounded hover:bg-secondary">Início</Link>
              <a href="#como-funciona" className="px-2 py-2 rounded hover:bg-secondary">Como funciona</a>
              <a href="#vitrine" className="px-2 py-2 rounded hover:bg-secondary">Exemplos</a>
              <a href="#faq" className="px-2 py-2 rounded hover:bg-secondary">FAQ</a>
              <div className="pt-2">
                {user ? (
                  <Button className="w-full" variant="outline" onClick={handleSignOut}>Sair</Button>
                ) : (
                  <Link to="/login" className="w-full">
                    <Button className="w-full gradient-primary shadow-primary">Acessar sistema</Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

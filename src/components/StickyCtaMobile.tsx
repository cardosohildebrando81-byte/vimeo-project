import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const StickyCtaMobile = () => {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(false);
  const SHOW_STICKY_CTA = false; // Ocultar CTA fixa temporariamente

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isLanding = pathname === "/";

    // Reserva espaço no body para evitar CLS quando a barra aparece
    if (isLanding) {
      document.body.classList.add("sticky-cta-active");
    } else {
      document.body.classList.remove("sticky-cta-active");
    }

    // Oculta a CTA quando foco em campos de formulário (teclado móvel)
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName.toLowerCase();
      const isFormEl =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        t.isContentEditable;
      const isMobile = window.innerWidth < 768;
      if (isFormEl && isMobile) setHidden(true);
    };
    const onFocusOut = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) setHidden(false);
    };
    document.addEventListener("focusin", onFocusIn as any);
    document.addEventListener("focusout", onFocusOut as any);
    return () => {
      document.removeEventListener("focusin", onFocusIn as any);
      document.removeEventListener("focusout", onFocusOut as any);
    };
  }, [pathname]);

  if (pathname !== "/" || !SHOW_STICKY_CTA) return null;

  return (
    <div
      aria-hidden={hidden}
      className={`md:hidden fixed inset-x-0 bottom-0 z-50 ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-screen-md px-4 pb-4">
        <Link to="/login" aria-label="Solicitar demo do sistema">
          <button className="w-full h-12 rounded-full gradient-primary shadow-primary border border-white/30 text-white font-medium flex items-center justify-center gap-2 transition-base">
            Solicitar demo
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
      </div>
    </div>
  );
};

export default StickyCtaMobile;
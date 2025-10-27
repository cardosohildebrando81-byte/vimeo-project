import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/hooks/useRole";

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut, initialized } = useAuth();
  const { isAdmin } = useRole();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("sidebar:collapsed");
      return raw === "true";
    } catch {}
    return false;
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar:collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  // Removed old heuristic; use hook-derived isAdmin
  const isActive = (to: string) => {
    if (to === "/dashboard") {
      return pathname.startsWith("/dashboard");
    }
    return pathname === to;
  };

  const paddingX = collapsed ? "px-2" : "px-4";
  const gapClass = collapsed ? "gap-0" : "gap-3";
  const justifyClass = collapsed ? "justify-center" : "";

  const itemClass = (active: boolean) =>
    `flex items-center ${gapClass} ${paddingX} py-3 rounded-xl transition-colors ${justifyClass} ${
      active ? "bg-white/15 text-white shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  const handleSignOut = async () => {
    const { success } = await signOut();
    if (success) {
      navigate("/", { replace: true });
    }
  };

  const avatarUrl = (user?.user_metadata as any)?.avatar_url as string | undefined;
  const displayName =
    ((user?.user_metadata as any)?.full_name as string | undefined) ||
    (user?.email ? user.email.split("@")[0] : "Usuário");

  useEffect(() => {
    console.log("[Sidebar] pathname:", pathname, "user:", user?.id, "isAdmin:", isAdmin);
  }, [pathname, user?.id, isAdmin]);

  return (
    <aside className={`${collapsed ? "w-20" : "w-72"} shrink-0 min-h-screen flex flex-col border-r border-white/20 gradient-sidebar text-white relative z-40`}>
      {/* Header brand */}
      <div className="p-4 border-b border-white/20">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-cyan-600 text-white font-bold">TV</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1">
              <div className="font-semibold leading-tight text-white">TV Doutor Vimeo</div>
              <div className="text-xs text-white/70">Gestão de playlist de vídeos</div>
            </div>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            onClick={() => setCollapsed((v) => !v)}
            className={`ml-auto h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center ${collapsed ? "" : ""}`}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-white/70" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-white/70" />
            )}
          </button>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-4 space-y-1">
        {/* Comum */}
        <nav className="space-y-1">
          <Link to="/dashboard" className={itemClass(isActive("/dashboard"))} onClick={() => console.log("[Sidebar] Click: /dashboard") } title="Dashboard">
            <LayoutDashboard className="h-4 w-4" />
            {!collapsed && <span>Dashboard</span>}
          </Link>
          <Link to="/playlist" className={itemClass(isActive("/playlist"))} onClick={() => console.log("[Sidebar] Click: /playlist") } title="Playlist">
            <List className="h-4 w-4" />
            {!collapsed && <span>Playlist</span>}
          </Link>
          <Link to="/analytics" className={itemClass(isActive("/analytics"))} onClick={() => console.log("[Sidebar] Click: /analytics") } title="Meus Relatórios">
            <BarChart3 className="h-4 w-4" />
            {!collapsed && <span>Meus Relatórios</span>}
          </Link>
        </nav>

        {/* Admin */}
        {initialized && isAdmin && (
          <nav className="space-y-1 pt-2">
            <Link to="/admin/users" className={itemClass(isActive("/admin/users"))} onClick={() => console.log("[Sidebar] Click: /admin/users") } title="Usuários">
              <Users className="h-4 w-4" />
              {!collapsed && <span>Usuários</span>}
            </Link>
            <Link to="/admin/analytics" className={itemClass(isActive("/admin/analytics"))} onClick={() => console.log("[Sidebar] Click: /admin/analytics") } title="Relatórios Gerais">
              <BarChart3 className="h-4 w-4" />
              {!collapsed && <span>Relatórios Gerais</span>}
            </Link>
          </nav>
        )}

        {/* Configurações visível para usuários autenticados */}
        {initialized && !!user && (
          <nav className="space-y-1 pt-2">
            <Link to="/settings" className={itemClass(isActive("/settings"))} onClick={() => console.log("[Sidebar] Click: /settings") } title="Configurações">
              <SettingsIcon className="h-4 w-4" />
              {!collapsed && <span>Configurações</span>}
            </Link>
          </nav>
        )}
      </div>

      {/* User card + menu */}
      <div className="mt-auto p-4 border-t border-white/20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors`}>
              <Avatar className="h-10 w-10">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : (
                  <AvatarFallback className="bg-gray-600 text-white">
                    {displayName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium leading-tight text-white">{displayName}</div>
                  <div className="text-xs text-white/70 truncate">{user?.email || ""}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-64">
            <DropdownMenuItem onSelect={() => navigate("/settings")}>Mude Sua Foto de Perfil!</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/settings")}> 
              <SettingsIcon className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSignOut}> 
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default Sidebar;
import { Link } from "react-router-dom";
import { Video, BarChart3, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  const { user } = useAuth();
  const [playlistsCount, setPlaylistsCount] = useState(0);

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      (user?.email ? user.email.split("@")[0] : undefined) ||
      "Usuário"
    );
  }, [user?.user_metadata?.full_name, user?.email]);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      if (!user?.id) return;
      const { data, count, error } = await supabase
        .from("playlists")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);
      if (error) {
        console.warn("Erro ao obter contagem de playlists:", error.message);
        return;
      }
      if (active) setPlaylistsCount((count ?? data?.length ?? 0));
    };
    fetchCount();
    return () => { active = false; };
  }, [user?.id]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero / Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground mt-2">Bem-vindo de volta, {displayName}!</p>
                </div>
                <Badge variant="secondary">Playlists salvas: {playlistsCount}</Badge>
              </div>
              {/* Banner opcional – pode ser removido se preferir algo mais minimalista */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-border">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Comece por aqui</h2>
                      <p className="text-muted-foreground">Acesse rapidamente as áreas mais usadas</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-100 text-blue-700" variant="secondary">Dicas de UX ativas</Badge>
                      <Badge className="bg-indigo-100 text-indigo-700" variant="secondary">Fluxo simplificado</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <Link to="/search">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-blue-500" />
                      Buscar Vídeos
                    </CardTitle>
                    <CardDescription>Encontre vídeos por código, nome ou categoria</CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <Link to="/lists">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-green-500" />
                      Minhas Listas
                    </CardTitle>
                    <CardDescription>Gerencie suas listas de vídeos salvos</CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <Link to="/analytics">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      Analytics
                    </CardTitle>
                    <CardDescription>Visualize estatísticas e métricas</CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </div>

            {/* Atividade Recente */}
            <Card>
              <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
                <CardDescription>Suas últimas ações na plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Login realizado com sucesso</p>
                      <p className="text-xs text-muted-foreground">Agora mesmo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Conta criada</p>
                      <p className="text-xs text-muted-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "N/A"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;
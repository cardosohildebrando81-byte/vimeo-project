import { Link } from "react-router-dom";
import { 
  Video, 
  BarChart3, 
  Settings, 
  Users, 
  Play, 
  TrendingUp, 
  Clock, 
  Download,
  Activity,
  Eye,
  Calendar,
  ArrowUpRight,
  Plus,
  Star
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/hooks/useRole";

const Dashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [playlistsCount, setPlaylistsCount] = useState(0);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    avgRating: 0,
    recentActivity: 0
  });

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      (user?.email ? user.email.split("@")[0] : undefined) ||
      "Usuário"
    );
  }, [user?.user_metadata?.full_name, user?.email]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        // Fetch playlists count
        const { data: playlistData, count: playlistCount, error: playlistError } = await supabase
          .from("playlists")
          .select("id", { count: "exact" })
          .eq("user_id", user.id);
        
        if (playlistError) {
          console.warn("Erro ao obter contagem de playlists:", playlistError.message);
        } else if (active) {
          setPlaylistsCount(playlistCount ?? playlistData?.length ?? 0);
        }

        // Fetch real analytics data
        if (active) {
          // Total de vídeos adicionados (somar payload.count dos eventos video_added)
          const { data: videoEvents, error: videoError } = await supabase
            .from('analytics_events')
            .select('payload')
            .eq('user_id', user.id)
            .eq('type', 'video_added');

          const totalVideos = videoError ? 0 : 
            (videoEvents || []).reduce((sum, e: any) => sum + (e?.payload?.count || 0), 0);

          // Total de buscas realizadas
          const { count: searchCount, error: searchError } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'search');

          const totalSearches = searchError ? 0 : (searchCount || 0);

          // Total de exportações realizadas
          const { count: exportCount, error: exportError } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'export');

          const totalExports = exportError ? 0 : (exportCount || 0);

          // Atividade recente (eventos dos últimos 7 dias)
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { count: recentCount, error: recentError } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', sevenDaysAgo);

          const recentActivity = recentError ? 0 : (recentCount || 0);

          setStats({
            totalVideos,
            totalViews: totalSearches, // Usando buscas como "visualizações"
            avgRating: totalExports, // Usando exportações como "avaliação média"
            recentActivity
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        if (active) {
          setStats({
            totalVideos: 0,
            totalViews: 0,
            avgRating: 0,
            recentActivity: 0
          });
        }
      }
    };
    
    fetchData();
    return () => { active = false; };
  }, [user?.id]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Hero Header com Gradiente */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">{greeting}, {displayName}! 👋</h1>
                    <p className="text-blue-100 text-lg">Aqui está um resumo da sua atividade hoje</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Playlist
                    </Button>
                    <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm">
                      <Video className="h-4 w-4 mr-2" />
                      Buscar Vídeos
                    </Button>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
            </div>

            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-600">Playlists</p>
                      <p className="text-3xl font-bold text-blue-900">{playlistsCount}</p>
                      <p className="text-xs text-blue-600/70 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +12% este mês
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Settings className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600">Vídeos Adicionados</p>
                      <p className="text-3xl font-bold text-green-900">{stats.totalVideos.toLocaleString()}</p>
                      <p className="text-xs text-green-600/70 flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Total em playlists
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Video className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-600">Buscas Realizadas</p>
                      <p className="text-3xl font-bold text-purple-900">{stats.totalViews.toLocaleString()}</p>
                      <p className="text-xs text-purple-600/70 flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        Total de pesquisas
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-600">Exportações</p>
                      <p className="text-3xl font-bold text-orange-900">{stats.avgRating}</p>
                      <p className="text-xs text-orange-600/70 flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Total realizadas
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                      <Download className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ações Rápidas Redesenhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Ações Rápidas
                  </CardTitle>
                  <CardDescription>Acesse rapidamente as funcionalidades mais utilizadas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/search" className="group">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Video className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-900">Buscar Vídeos</h3>
                            <p className="text-sm text-blue-600/70">Encontre conteúdo rapidamente</p>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <Link to="/lists" className="group">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:border-green-200 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Settings className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-green-900">Minhas Listas</h3>
                            <p className="text-sm text-green-600/70">Gerencie suas playlists</p>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <Link to="/analytics" className="group">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 hover:border-purple-200 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-purple-900">Analytics</h3>
                            <p className="text-sm text-purple-600/70">Visualize métricas detalhadas</p>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {isAdmin && (
                      <Link to="/admin/users">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 hover:border-orange-200 transition-all duration-200 hover:shadow-md cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-orange-900">Colaboradores</h3>
                              <p className="text-sm text-orange-600/70">Gerencie sua equipe</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Progresso e Metas */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Progresso Mensal
                  </CardTitle>
                  <CardDescription>Suas metas e conquistas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Playlists criadas</span>
                      <span className="font-medium">{playlistsCount}/10</span>
                    </div>
                    <Progress value={(playlistsCount / 10) * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vídeos assistidos</span>
                      <span className="font-medium">47/50</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avaliações dadas</span>
                      <span className="font-medium">23/30</span>
                    </div>
                    <Progress value={76} className="h-2" />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span>Você está 85% mais ativo este mês!</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Atividade Recente Melhorada */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Atividade Recente
                  </CardTitle>
                  <CardDescription>Suas últimas ações na plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                      <div className="h-3 w-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900">Login realizado com sucesso</p>
                        <p className="text-xs text-green-600/70 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Agora mesmo
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <div className="h-3 w-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900">Nova playlist criada</p>
                        <p className="text-xs text-blue-600/70 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          2 horas atrás
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                      <div className="h-3 w-3 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-900">Conta criada</p>
                        <p className="text-xs text-purple-600/70 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dicas e Insights */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Dicas Personalizadas
                  </CardTitle>
                  <CardDescription>Sugestões para melhorar sua experiência</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40">
                    <h4 className="font-medium text-indigo-900 mb-2">💡 Organize melhor</h4>
                    <p className="text-sm text-indigo-700/80">Crie tags para suas playlists e encontre conteúdo mais rapidamente.</p>
                  </div>
                  
                  <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40">
                    <h4 className="font-medium text-purple-900 mb-2">🎯 Meta do mês</h4>
                    <p className="text-sm text-purple-700/80">Você está próximo de completar 50 vídeos assistidos este mês!</p>
                  </div>
                  
                  <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40">
                    <h4 className="font-medium text-pink-900 mb-2">⭐ Avalie conteúdos</h4>
                    <p className="text-sm text-pink-700/80">Suas avaliações ajudam a melhorar as recomendações.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;
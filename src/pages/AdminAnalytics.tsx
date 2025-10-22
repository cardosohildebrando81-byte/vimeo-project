import { useEffect, useMemo, useState } from "react";
import { BarChart3, Video, List, Download, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface SpecialtyStat { name: string; count: number; percentage: number }
interface UserStat { email: string; searches: number; playlists: number; exports: number }

type Period = "all" | "30d" | "7d";

const AdminAnalytics = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSearches: 0,
    totalVideosAdded: 0,
    totalPlaylists: 0,
    totalExports: 0,
    xlsxExports: 0,
    docxExports: 0,
    exportSuccessRate: 0,
    topSpecialties: [] as SpecialtyStat[],
    topUsers: [] as UserStat[],
  });

  const sinceISO = useMemo(() => {
    if (period === "30d") {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return d.toISOString();
    } else if (period === "7d") {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    return null;
  }, [period]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);

      try {
        // Total de usuários
        const { count: totalUsersCount, error: usersError } = await supabase
          .from('User')
          .select('id', { count: 'exact', head: true });
        if (usersError) throw usersError;

        // Usuários ativos (que fizeram alguma ação no período)
        let activeUsersQuery = supabase
          .from('analytics_events')
          .select('user_id', { count: 'exact', head: true });
        if (sinceISO) activeUsersQuery = activeUsersQuery.gte('created_at', sinceISO);
        const { count: activeUsersCount, error: activeUsersError } = await activeUsersQuery;
        if (activeUsersError) throw activeUsersError;

        // Total de buscas
        let searchQuery = supabase.from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'search');
        if (sinceISO) searchQuery = searchQuery.gte('created_at', sinceISO);
        const { count: searchesCount, error: searchesError } = await searchQuery;
        if (searchesError) throw searchesError;

        // Vídeos adicionados (somar payload.count)
        let videoQuery = supabase.from('analytics_events')
          .select('payload')
          .eq('type', 'video_added');
        if (sinceISO) videoQuery = videoQuery.gte('created_at', sinceISO);
        const { data: videoEvents, error: videoErr } = await videoQuery;
        if (videoErr) throw videoErr;
        const videosAdded = (videoEvents || []).reduce((sum, e: any) => sum + (e?.payload?.count || 0), 0);

        // Total de playlists
        let playlistsQuery = supabase
          .from('playlists')
          .select('id', { count: 'exact', head: true });
        if (sinceISO) playlistsQuery = playlistsQuery.gte('created_at', sinceISO);
        const { count: playlistsCount, error: playlistsErr } = await playlistsQuery;
        if (playlistsErr) throw playlistsErr;

        // Exportações
        let exportQuery = supabase.from('analytics_events')
          .select('payload')
          .eq('type', 'export');
        if (sinceISO) exportQuery = exportQuery.gte('created_at', sinceISO);
        const { data: exportEvents, error: exportErr } = await exportQuery;
        if (exportErr) throw exportErr;

        const totalExports = exportEvents?.length || 0;
        const xlsxExports = exportEvents?.filter((e: any) => e?.payload?.format === 'xlsx').length || 0;
        const docxExports = exportEvents?.filter((e: any) => e?.payload?.format === 'docx').length || 0;
        const successfulExports = exportEvents?.filter((e: any) => e?.payload?.success === true).length || 0;
        const exportSuccessRate = totalExports > 0 ? Math.round((successfulExports / totalExports) * 100) : 0;

        // Top especialidades
        let specialtyQuery = supabase.from('analytics_events')
          .select('payload')
          .eq('type', 'search');
        if (sinceISO) specialtyQuery = specialtyQuery.gte('created_at', sinceISO);
        const { data: specialtyEvents, error: specialtyErr } = await specialtyQuery;
        if (specialtyErr) throw specialtyErr;

        const specialtyCounts: Record<string, number> = {};
        specialtyEvents?.forEach((e: any) => {
          const specialty = e?.payload?.specialty;
          if (specialty) {
            specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
          }
        });

        const totalSpecialtySearches = Object.values(specialtyCounts).reduce((sum, count) => sum + count, 0);
        const topSpecialties = Object.entries(specialtyCounts)
          .map(([name, count]) => ({
            name,
            count,
            percentage: totalSpecialtySearches > 0 ? Math.round((count / totalSpecialtySearches) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Top usuários (mais ativos)
        const userStats: Record<string, { searches: number; playlists: number; exports: number; email?: string }> = {};
        
        // Contar buscas por usuário
        let userSearchQuery = supabase.from('analytics_events')
          .select('user_id')
          .eq('type', 'search');
        if (sinceISO) userSearchQuery = userSearchQuery.gte('created_at', sinceISO);
        const { data: userSearchEvents, error: userSearchErr } = await userSearchQuery;
        if (userSearchErr) throw userSearchErr;

        userSearchEvents?.forEach((e: any) => {
          const userId = e.user_id;
          if (!userStats[userId]) userStats[userId] = { searches: 0, playlists: 0, exports: 0 };
          userStats[userId].searches++;
        });

        // Contar playlists por usuário
        let userPlaylistQuery = supabase
          .from('playlists')
          .select('user_id');
        if (sinceISO) userPlaylistQuery = userPlaylistQuery.gte('created_at', sinceISO);
        const { data: userPlaylists, error: userPlaylistErr } = await userPlaylistQuery;
        if (userPlaylistErr) throw userPlaylistErr;

        userPlaylists?.forEach((p: any) => {
          const userId = p.user_id;
          if (!userStats[userId]) userStats[userId] = { searches: 0, playlists: 0, exports: 0 };
          userStats[userId].playlists++;
        });

        // Contar exportações por usuário
        userSearchEvents?.forEach((e: any) => {
          const userId = e.user_id;
          if (!userStats[userId]) userStats[userId] = { searches: 0, playlists: 0, exports: 0 };
          userStats[userId].exports++;
        });

        // Buscar emails dos usuários
        const userIds = Object.keys(userStats);
        if (userIds.length > 0) {
          const { data: profiles, error: profilesErr } = await supabase
            .from('User')
            .select('id, email')
            .in('id', userIds);
          
          if (!profilesErr && profiles) {
            profiles.forEach((profile: any) => {
              if (userStats[profile.id]) {
                userStats[profile.id].email = profile.email;
              }
            });
          }
        }

        const topUsers = Object.entries(userStats)
          .map(([userId, stats]) => ({
            email: stats.email || 'Email não encontrado',
            searches: stats.searches,
            playlists: stats.playlists,
            exports: stats.exports,
          }))
          .sort((a, b) => (b.searches + b.playlists + b.exports) - (a.searches + a.playlists + a.exports))
          .slice(0, 5);

        setStats({
          totalUsers: totalUsersCount || 0,
          activeUsers: activeUsersCount || 0,
          totalSearches: searchesCount || 0,
          totalVideosAdded: videosAdded,
          totalPlaylists: playlistsCount || 0,
          totalExports,
          xlsxExports,
          docxExports,
          exportSuccessRate,
          topSpecialties,
          topUsers,
        });
      } catch (err) {
        console.error("Erro ao carregar analytics administrativos:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id, sinceISO]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-muted-foreground">Carregando analytics administrativos...</div>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-destructive">Erro: {error}</div>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics Administrativos</h1>
                <p className="text-muted-foreground">Relatórios gerais da plataforma</p>
              </div>
              <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tempos</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} ativos no período
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Buscas</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSearches.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Pesquisas realizadas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vídeos Adicionados</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVideosAdded.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Vídeos em playlists
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Playlists Criadas</CardTitle>
                  <List className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPlaylists.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de playlists
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Exportações */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Exportações</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalExports.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Taxa de sucesso: {stats.exportSuccessRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Exportações XLSX</CardTitle>
                  <Download className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.xlsxExports.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalExports > 0 ? Math.round((stats.xlsxExports / stats.totalExports) * 100) : 0}% do total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Exportações DOCX</CardTitle>
                  <Download className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.docxExports.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalExports > 0 ? Math.round((stats.docxExports / stats.totalExports) * 100) : 0}% do total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Especialidades e Usuários */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Especialidades</CardTitle>
                  <CardDescription>Especialidades mais pesquisadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topSpecialties.map((specialty, index) => (
                      <div key={specialty.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{specialty.name}</p>
                            <p className="text-sm text-muted-foreground">{specialty.count} buscas</p>
                          </div>
                        </div>
                        <div className="text-sm font-medium">{specialty.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usuários Mais Ativos</CardTitle>
                  <CardDescription>Usuários com mais atividade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topUsers.map((userStat, index) => (
                      <div key={userStat.email} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{userStat.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {userStat.searches} buscas • {userStat.playlists} playlists • {userStat.exports} exports
                            </p>
                          </div>
                        </div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
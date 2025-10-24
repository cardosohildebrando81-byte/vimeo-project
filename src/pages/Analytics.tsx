import { useEffect, useMemo, useState } from "react";
import { BarChart3, Video, List, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface SpecialtyStat { name: string; count: number; percentage: number }

type Period = "all" | "30d";

const Analytics = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    searches: 0,
    videosAdded: 0,
    playlists: 0,
    exports: 0,
    xlsx: 0,
    docx: 0,
    exportSuccessRate: 0,
    topSpecialties: [] as SpecialtyStat[],
  });

  const sinceISO = useMemo(() => {
    if (period === "30d") {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    return null;
  }, [period]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        setError('Você precisa estar logado para ver seus relatórios.');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Total de buscas (contagem de eventos)
        let searchQuery = supabase.from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'search');
        if (sinceISO) searchQuery = searchQuery.gte('created_at', sinceISO);
        const { count: searchesCount, error: searchesError } = await searchQuery;
        if (searchesError) throw searchesError;

        // Vídeos adicionados (somar payload.count)
        let videoQuery = supabase.from('analytics_events')
          .select('payload')
          .eq('user_id', user.id)
          .eq('type', 'video_added');
        if (sinceISO) videoQuery = videoQuery.gte('created_at', sinceISO);
        const { data: videoEvents, error: videoErr } = await videoQuery;
        if (videoErr) throw videoErr;
        const videosAdded = (videoEvents || []).reduce((sum, e: any) => sum + (e?.payload?.count || 0), 0);

        // Playlists criadas (total em tabela)
        let playlistsQuery = supabase
          .from('playlists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (sinceISO) playlistsQuery = playlistsQuery.gte('created_at', sinceISO);
        const { count: playlistsCount, error: playlistsErr } = await playlistsQuery;
        if (playlistsErr) throw playlistsErr;

        // Exportações (contagem e por formato)
        let exportQuery = supabase.from('analytics_events')
          .select('payload')
          .eq('user_id', user.id)
          .eq('type', 'export');
        if (sinceISO) exportQuery = exportQuery.gte('created_at', sinceISO);
        const { data: exportEvents, error: exportErr } = await exportQuery;
        if (exportErr) throw exportErr;
        const totalExports = exportEvents?.length || 0;
        const xlsx = (exportEvents || []).filter((e: any) => e?.payload?.format === 'xlsx').length;
        const docx = (exportEvents || []).filter((e: any) => e?.payload?.format === 'docx').length;
        const successCount = (exportEvents || []).filter((e: any) => e?.payload?.success).length;
        const exportSuccessRate = totalExports === 0 ? 0 : Math.round((successCount / totalExports) * 1000) / 10; // 1 casa

        // Top especialidades (agregado de categorias usadas nos vídeos adicionados)
        const counts = new Map<string, number>();
        (videoEvents || []).forEach((e: any) => {
          const cats: string[] = e?.payload?.categories || [];
          cats.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
        });
        const totalCat = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        const topSpecialties = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count, percentage: totalCat === 0 ? 0 : Math.round((count * 100) / totalCat) }));

        setStats({
          searches: searchesCount || 0,
          videosAdded,
          playlists: playlistsCount || 0,
          exports: totalExports,
          xlsx,
          docx,
          exportSuccessRate,
          topSpecialties,
        });
      } catch (e: any) {
        console.error('[Analytics] Erro ao carregar dados:', e);
        setError(e?.message || 'Falha ao carregar analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, sinceISO]);

  const StatCard = ({ icon: Icon, title, value }: { icon: any; title: string; value: number }) => (
    <Card className="hover-lift border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary shadow-primary">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <h3 className="text-3xl font-bold mb-1">{value.toLocaleString('pt-BR')}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Hero Header */}
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Meus Relatórios 📊</h1>
                <p className="text-blue-100">Acompanhe o desempenho das suas playlists e vídeos</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-100">Período</span>
                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <SelectTrigger className="w-[180px] bg-white/10 backdrop-blur-sm border-white/20 text-white">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto space-y-8">

            {/* Loading */}
            {loading && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[1,2,3,4].map((i) => (
                  <Card key={i} className="border-border">
                    <CardContent className="p-6">
                      <div className="h-6 w-20 bg-muted rounded mb-4 animate-pulse" />
                      <div className="h-8 w-32 bg-muted rounded mb-2 animate-pulse" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && (
              <>
                {/* Stats Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  <StatCard icon={BarChart3} title="Total de Buscas" value={stats.searches} />
                  <StatCard icon={Video} title="Vídeos Adicionados" value={stats.videosAdded} />
                  <StatCard icon={List} title="Listas Criadas" value={stats.playlists} />
                  <StatCard icon={Download} title="Exportações" value={stats.exports} />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Top Specialties */}
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Especialidades Mais Usadas</CardTitle>
                      <CardDescription>
                        Top 5 especialidades por número de seleções
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {stats.topSpecialties.length === 0 ? (
                        <p className="text-muted-foreground">Sem dados ainda. Adicione vídeos à playlist para ver as categorias mais usadas.</p>
                      ) : (
                        stats.topSpecialties.map((specialty, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{specialty.name}</span>
                              <span className="text-muted-foreground">{specialty.count}</span>
                            </div>
                            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full gradient-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, specialty.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Export Stats */}
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Estatísticas de Exportação</CardTitle>
                      <CardDescription>
                        Formatos mais utilizados e taxa de sucesso
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.exports === 0 ? (
                        <p className="text-muted-foreground">Sem exportações registradas ainda.</p>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">XLSX</p>
                              <p className="text-2xl font-bold">{Math.round((stats.xlsx * 100) / Math.max(1, stats.exports))}%</p>
                            </div>
                            <div className="flex items-center justify-center w-20 h-20 rounded-full gradient-primary">
                              <span className="text-2xl font-bold text-white">{stats.xlsx}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">DOCX</p>
                              <p className="text-2xl font-bold">{Math.round((stats.docx * 100) / Math.max(1, stats.exports))}%</p>
                            </div>
                            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-secondary">
                              <span className="text-2xl font-bold text-foreground">{stats.docx}</span>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Taxa de Sucesso</span>
                              <span className="text-success font-semibold">{stats.exportSuccessRate}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {error && (
              <div className="mt-6">
                <Card className="border-destructive">
                  <CardContent className="p-6">
                    <p className="text-destructive">{error}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Analytics;

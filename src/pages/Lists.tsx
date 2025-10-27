import { Plus, Trash2, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { usePlaylist } from "@/hooks/usePlaylist";
import { toast } from "sonner";

interface PlaylistRecord {
  id?: string;
  user_id: string;
  client_p_number: string;
  client_name: string;
  items: Array<{ id: string; uri: string; name: string; addedAt?: string }> | null;
  updated_at?: string;
  created_at?: string;
}

const Lists = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<PlaylistRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { clear } = usePlaylist();

  const handleCreateNewList = () => {
    try { clear(); } catch {}
    navigate("/playlist");
  };

  const handleDelete = async (list: PlaylistRecord) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("playlists")
        .delete()
        .match({ user_id: user.id, client_p_number: list.client_p_number, client_name: list.client_name });
      if (error) {
        console.warn("Erro ao excluir lista:", error.message);
        toast.error("Não foi possível excluir a lista", { description: error.message });
        return;
      }
      setLists((prev) => prev.filter((l) => !(l.client_p_number === list.client_p_number && l.client_name === list.client_name)));
      toast.success("Lista excluída");
    } catch (e: any) {
      console.error("Falha ao excluir lista:", e);
      toast.error("Falha ao excluir lista", { description: e?.message || "Erro desconhecido" });
    }
  };

  useEffect(() => {
    const fetchLists = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("playlists")
        .select("id, user_id, client_p_number, client_name, items, updated_at, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.warn("Erro ao carregar listas:", error.message);
        setLists([]);
      } else {
        setLists((data ?? []) as PlaylistRecord[]);
      }
      setLoading(false);
    };

    fetchLists();
  }, [user?.id]);

  const hasLists = useMemo(() => lists && lists.length > 0, [lists]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            {/* Hero Header */}
            <div className="relative mb-12 p-8 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-violet-700 text-white overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Minhas Listas</h1>
                  <p className="text-lg text-blue-100">Organize e gerencie suas coleções de vídeos</p>
                </div>
                <Button 
                  className="border-white/30 text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm" 
                  variant="outline" 
                  size="lg"
                  onClick={handleCreateNewList}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nova Lista
                </Button>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
            </div>

            {/* Lists Grid */}
            {!hasLists ? (
              <Card className="text-center py-16">
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                      <FolderOpen className="w-10 h-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Nenhuma lista criada</h3>
                    <p className="text-muted-foreground mb-6">Crie sua primeira lista para organizar seus vídeos</p>
                    <Button className="border-white/30 text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm" variant="outline" onClick={handleCreateNewList}>
                      <Plus className="w-5 h-5 mr-2" />
                      Criar Primeira Lista
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map((list) => {
                  const videoCount = Array.isArray(list.items) ? list.items.length : 0;
                  return (
                    <Card key={list.id ?? `${list.client_p_number}-${list.client_name}`} className="hover-lift border-border group">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                              {list.client_name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              Número P: {list.client_p_number}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Vídeos</span>
                          <span className="font-semibold">{videoCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Atualizado</span>
                          <span className="font-medium">{new Date(list.updated_at || list.created_at || new Date()).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate("/playlist", { state: { clientPNumber: list.client_p_number, clientName: list.client_name, listId: list.id } })}
                          >
                            Ver Lista
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toast.info("Exportação direta pela página de listas será adicionada em breve.")}> 
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(list)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Lists;

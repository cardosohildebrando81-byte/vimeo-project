import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
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

type UserPlaylistsGridProps = {
  onClose?: () => void;
};

const UserPlaylistsGrid: React.FC<UserPlaylistsGridProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [lists, setLists] = useState<PlaylistRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

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

  useEffect(() => { fetchLists(); }, [user?.id]);

  const hasLists = useMemo(() => lists && lists.length > 0, [lists]);

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

  return (
    <div className="space-y-6">
      {/* Header dentro do modal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Minhas Listas</h2>
          <p className="text-muted-foreground">Organize e gerencie suas coleções de vídeos</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        )}
      </div>

      {/* Estado de carregamento */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-4" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid de listas */}
      {!loading && !hasLists ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma lista criada</h3>
              <p className="text-muted-foreground">Crie sua primeira lista na página Playlist</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && hasLists && (
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
                  <div className="flex items-start gap-2 pt-2">
                    <div className="flex-1 flex flex-col gap-2">
                    {/* Ver Playlist: carrega a playlist no editor */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        navigate("/playlist", { state: { clientPNumber: list.client_p_number, clientName: list.client_name, listId: list.id, mode: 'view' } });
                        onClose?.();
                      }}
                    >
                      Ver Playlist
                    </Button>
                    {/* Editar Playlist: mesmo fluxo de navegação, com flag de modo de edição */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        navigate("/playlist", { state: { clientPNumber: list.client_p_number, clientName: list.client_name, listId: list.id, mode: 'edit' } });
                        onClose?.();
                      }}
                    >
                      Editar Playlist
                    </Button>
                    </div>
                    <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info("Exportação direta será adicionada em breve.")}> 
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(list)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserPlaylistsGrid;

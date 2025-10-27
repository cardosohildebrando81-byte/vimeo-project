import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import TopNavbar from '@/components/TopNavbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { FolderOpen, Video } from 'lucide-react';
import { usePlaylist } from '@/hooks/usePlaylist';
import { exportPlaylistToDOCX, exportPlaylistToXLSX } from '@/lib/export';
import type { VimeoVideo } from '@/lib/vimeo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

const Playlist: React.FC = () => {
  const { items, remove, clear } = usePlaylist();
  const [clientPNumber, setClientPNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const state = (location as any)?.state;
    if (state) {
      if (typeof state.clientPNumber === 'string') setClientPNumber(state.clientPNumber);
      if (typeof state.clientName === 'string') setClientName(state.clientName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid = useMemo(
    () => clientPNumber.trim() !== '' && clientName.trim() !== '' && items.length > 0,
    [clientPNumber, clientName, items.length]
  );

  const savePlaylistToDB = async (): Promise<boolean> => {
    if (!user?.id) return false;
    const p = clientPNumber.trim();
    const n = clientName.trim();
    if (!p || !n || items.length === 0) return false;

    const payload = {
      user_id: user.id,
      client_p_number: p,
      client_name: n,
      items: items.map(({ id, video, addedAt }) => ({ id, uri: video.uri, name: video.name, addedAt })),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('playlists').upsert(payload, { onConflict: 'user_id,client_p_number,client_name' });
    if (error) {
      console.warn('Erro ao salvar playlist:', error.message);
      toast.warning('Não foi possível salvar a playlist no Supabase', { description: error.message });
      return false;
    }
    return true;
  };

  // Log de exportações
  const logExportEvent = async (format: 'xlsx' | 'docx', success: boolean, errorMessage?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        type: 'export',
        payload: {
          format,
          success,
          error: errorMessage || null,
          itemsCount: items.length,
          clientPNumber: clientPNumber.trim(),
          clientName: clientName.trim(),
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Analytics] Falha ao registrar exportação:', e);
    }
  };

  // Log de playlists salvas
  const logPlaylistSavedEvent = async (mode: 'manual' | 'export') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        type: 'playlist_saved',
        payload: {
          mode,
          itemsCount: items.length,
          clientPNumber: clientPNumber.trim(),
          clientName: clientName.trim(),
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Analytics] Falha ao registrar playlist_saved:', e);
    }
  };

  const handleExport = async (type: 'xls' | 'docx') => {
    if (!isValid) {
      toast.error('Preencha os campos e adicione vídeos antes de exportar');
      return;
    }

    try {
      const saved = await savePlaylistToDB();
      if (saved) { await logPlaylistSavedEvent('export'); }
    } catch (e) { console.warn('[Export] Erro inesperado ao salvar:', e); }

    try {
      if (type === 'xls') {
        exportPlaylistToXLSX({ items: items.map((i) => i.video), clientPNumber, clientName });
        toast.success('Arquivo XLSX gerado com sucesso');
        logExportEvent('xlsx', true);
      } else {
        await exportPlaylistToDOCX({ items: items.map((i) => i.video), clientPNumber, clientName });
        toast.success('Arquivo DOCX gerado com sucesso');
        logExportEvent('docx', true);
      }
    } catch (e: any) {
      console.error('[Export] Falha ao exportar:', e);
      toast.error('Falha ao exportar playlist', { description: e?.message || 'Erro desconhecido' });
      logExportEvent(type === 'xls' ? 'xlsx' : 'docx', false, e?.message);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Preencha os campos e adicione vídeos antes de salvar');
      return;
    }
    try {
      setIsSaving(true);
      const ok = await savePlaylistToDB();
      if (ok) {
        toast.success('Playlist salva com sucesso');
        await logPlaylistSavedEvent('manual');
      }
    } catch (e: any) {
      console.error('[Playlist] Falha ao salvar:', e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      savePlaylistToDB();
    }, 1000);
    return () => clearTimeout(t);
  }, [items, clientPNumber, clientName, user?.id]);

  const renderVideoCard = (video: VimeoVideo, id: string) => (
    <Card key={id} className="hover-lift border-border">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="relative w-40 h-24 overflow-hidden rounded-lg shrink-0">
          <img src={video.pictures?.sizes?.[2]?.link || ''} alt={video.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-1">{video.name}</h3>
            <span className="px-2 py-1 bg-primary-light text-primary text-xs font-medium rounded shrink-0">{id}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
              {new Date(video.created_time).toLocaleDateString('pt-BR')}
            </span>
            <span className="px-2 py-1 bg-success-light text-success text-xs rounded">{video.status}</span>
          </div>
        </div>
        <div className="shrink-0">
          <Button size="sm" variant="outline" onClick={() => remove(id)}>Remover</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopNavbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Hero Header com Gradiente */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Minha Playlist 📋</h1>
                    <p className="text-blue-100 text-lg">Organize e exporte seus vídeos selecionados</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm" asChild>
                      <Link to="/search">
                        <Video className="h-4 w-4 mr-2" />
                        Buscar Vídeos
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
            </div>
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex gap-2">
                <Button variant="destructive" onClick={clear} disabled={items.length === 0}>Limpar Playlist</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!isValid || isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Playlist'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary" disabled={!isValid}>Exportar Playlist</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Escolha o formato</DialogTitle>
                      <DialogDescription>Selecione abaixo o tipo de arquivo para exportar a playlist.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                      <Button onClick={() => handleExport('xls')}>Exportar em .xlsx</Button>
                      <Button variant="outline" onClick={() => handleExport('docx')}>Exportar em .docx</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

          {/* Form Card */}
          <Card className="mb-8">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">Número P do cliente</Label>
                <Input placeholder="Ex: P12345" value={clientPNumber} onChange={(e) => setClientPNumber(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium">Nome do Cliente</Label>
                <Input placeholder="Ex: Maria Silva" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Videos Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Vídeos na playlist ({items.length})</h2>
              {items.length > 0 && (
                <Button variant="outline" asChild>
                  <Link to="/search">Adicionar mais vídeos</Link>
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                      <FolderOpen className="w-10 h-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Nenhum vídeo na playlist</h3>
                    <p className="text-muted-foreground mb-6">Volte à busca e adicione vídeos à sua playlist</p>
                    <Button className="gradient-primary" asChild>
                      <Link to="/search">Ir para Busca</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {items.map(({ id, video }) => renderVideoCard(video, id))}
              </div>
            )}
          </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Playlist;
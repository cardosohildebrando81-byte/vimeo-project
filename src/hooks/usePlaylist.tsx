import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { VimeoVideo } from '@/lib/vimeo';
import type { PlaylistItem } from '@/lib/export';
import { supabase } from '@/lib/supabase';
import { VideoCache } from '@/lib/videoCache';

// Estrutura de playlist do usuário (suporta N playlists)
interface UserPlaylist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: number;
  updatedAt: number;
}

interface PlaylistContextValue {
  // Compatibilidade com a API atual (playlist corrente)
  items: PlaylistItem[];
  addVideo: (video: VimeoVideo, playlistId?: string) => void;
  addMany: (videos: VimeoVideo[], playlistId?: string) => void;
  remove: (id: string, playlistId?: string) => void;
  clear: (playlistId?: string) => void;
  has: (id: string, playlistId?: string) => boolean;

  // Novo: suporte a múltiplas playlists
  playlists: UserPlaylist[];
  currentId: string | null;
  setCurrent: (id: string) => void;
  createPlaylist: (name?: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
}

const PlaylistContext = createContext<PlaylistContextValue | undefined>(undefined);

function getVideoId(video: VimeoVideo): string {
  try { return video.uri.split('/').pop() || video.uri; } catch { return video.uri; }
}

// Chave antiga (compatibilidade/migração)
const STORAGE_KEY_OLD = 'tempPlaylist:videos';
// Novas chaves
const STORAGE_PLAYLISTS_KEY = 'userPlaylists:v1';
const STORAGE_CURRENT_KEY = 'userPlaylists:currentId';

// Loga eventos de analytics no Supabase (fire-and-forget)
async function logAnalyticsEvent(type: 'video_added' | 'playlist_cleared', payload: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      type,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[Analytics] Falha ao registrar evento:', e);
  }
}

export const PlaylistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Carrega playlists do storage (ou migra do modelo antigo)
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as UserPlaylist[];
      }
    } catch {}
    // Migração do armazenamento antigo
    try {
      const oldRaw = localStorage.getItem(STORAGE_KEY_OLD);
      const oldItems = oldRaw ? (JSON.parse(oldRaw) as PlaylistItem[]) : [];
      const playlist: UserPlaylist = {
        id: 'default',
        name: 'Minha Playlist',
        items: Array.isArray(oldItems) ? oldItems : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return [playlist];
    } catch {
      const playlist: UserPlaylist = {
        id: 'default',
        name: 'Minha Playlist',
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return [playlist];
    }
  });

  const [currentId, setCurrentId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_KEY);
      if (raw) return raw;
    } catch {}
    return Array.isArray(playlists) && playlists[0]?.id ? playlists[0].id : null;
  });

  // Persiste mudanças
  useEffect(() => {
    try { localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists)); } catch {}
  }, [playlists]);

  useEffect(() => {
    try { if (currentId) localStorage.setItem(STORAGE_CURRENT_KEY, currentId); } catch {}
  }, [currentId]);

  // Remove storage antigo para evitar confusão
  useEffect(() => {
    try { localStorage.removeItem(STORAGE_KEY_OLD); } catch {}
  }, []);

  const updatePlaylistItems = (pid: string, updater: (prev: PlaylistItem[]) => PlaylistItem[]) => {
    setPlaylists((prev) => prev.map((p) => {
      if (p.id !== pid) return p;
      const nextItems = updater(p.items);
      return { ...p, items: nextItems, updatedAt: Date.now() };
    }));
  };

  const addVideo = (video: VimeoVideo, playlistId?: string) => {
    const targetId = playlistId ?? currentId;
    // Se não houver playlist, cria uma automaticamente
    const ensureTarget = () => {
      if (!targetId) {
        const id = 'pl-' + Date.now().toString(36);
        const playlist: UserPlaylist = { id, name: 'Minha Playlist', items: [], createdAt: Date.now(), updatedAt: Date.now() };
        setPlaylists((prev) => [...prev, playlist]);
        setCurrentId(id);
        return id;
      }
      return targetId as string;
    };

    const pid = ensureTarget();
    const id = getVideoId(video);
    const categories = VideoCache.getVideoCategories(video);
    updatePlaylistItems(pid, (prev) => prev.some((i) => i.id === id) ? prev : [...prev, { id, video, addedAt: Date.now() }]);
    // Log de analytics é assíncrono e não bloqueia UI
    logAnalyticsEvent('video_added', { count: 1, ids: [id], categories, playlistId: pid });
  };

  const addMany = (videos: VimeoVideo[], playlistId?: string) => {
    const pid = (playlistId ?? currentId) as string | null;
    if (!pid) return;
    const ids: string[] = [];
    const allCategories = new Set<string>();
    updatePlaylistItems(pid, (prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      videos.forEach((v) => {
        const id = getVideoId(v);
        ids.push(id);
        VideoCache.getVideoCategories(v).forEach((c) => allCategories.add(c));
        if (!map.has(id)) map.set(id, { id, video: v, addedAt: Date.now() });
      });
      return Array.from(map.values());
    });
    logAnalyticsEvent('video_added', { count: videos.length, ids, categories: Array.from(allCategories), playlistId: pid });
  };

  const remove = (id: string, playlistId?: string) => {
    const pid = (playlistId ?? currentId) as string | null;
    if (!pid) return;
    updatePlaylistItems(pid, (prev) => prev.filter((i) => i.id !== id));
  };

  const clear = (playlistId?: string) => {
    const pid = (playlistId ?? currentId) as string | null;
    if (!pid) return;
    updatePlaylistItems(pid, () => []);
    logAnalyticsEvent('playlist_cleared', { playlistId: pid });
  };

  const has = (id: string, playlistId?: string) => {
    const pid = (playlistId ?? currentId) as string | null;
    const p = playlists.find((pl) => pl.id === pid);
    return !!p?.items.some((i) => i.id === id);
  };

  // Gerenciamento de N playlists
  const createPlaylist = (name?: string) => {
    const id = 'pl-' + Date.now().toString(36);
    const playlist: UserPlaylist = { id, name: name || `Playlist ${playlists.length + 1}`, items: [], createdAt: Date.now(), updatedAt: Date.now() };
    setPlaylists((prev) => [...prev, playlist]);
    setCurrentId(id);
    return id;
  };

  const setCurrent = (id: string) => setCurrentId(id);

  const renamePlaylist = (id: string, name: string) => {
    setPlaylists((prev) => prev.map((p) => p.id === id ? { ...p, name, updatedAt: Date.now() } : p));
  };

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (currentId === id) {
      const next = playlists.find((p) => p.id !== id)?.id || null;
      setCurrentId(next);
    }
  };

  // Deriva os itens da playlist corrente
  const items = useMemo(() => {
    const p = playlists.find((pl) => pl.id === currentId);
    return p?.items ?? [];
  }, [playlists, currentId]);

  const value = useMemo(() => ({
    items,
    addVideo,
    addMany,
    remove,
    clear,
    has,
    playlists,
    currentId,
    setCurrent,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
  }), [items, playlists, currentId]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
};

export const usePlaylist = () => {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylist deve ser usado dentro de PlaylistProvider');
  return ctx;
};

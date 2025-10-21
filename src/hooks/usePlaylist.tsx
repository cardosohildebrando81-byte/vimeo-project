import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { VimeoVideo } from '@/lib/vimeo';
import type { PlaylistItem } from '@/lib/export';
import { supabase } from '@/lib/supabase';
import { VideoCache } from '@/lib/videoCache';

interface PlaylistContextValue {
  items: PlaylistItem[];
  addVideo: (video: VimeoVideo) => void;
  addMany: (videos: VimeoVideo[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const PlaylistContext = createContext<PlaylistContextValue | undefined>(undefined);

function getVideoId(video: VimeoVideo): string {
  try { return video.uri.split('/').pop() || video.uri; } catch { return video.uri; }
}

const STORAGE_KEY = 'tempPlaylist:videos';

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
  const [items, setItems] = useState<PlaylistItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PlaylistItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addVideo = (video: VimeoVideo) => {
    const id = getVideoId(video);
    const categories = VideoCache.getVideoCategories(video);
    setItems((prev) => prev.some((i) => i.id === id) ? prev : [...prev, { id, video, addedAt: Date.now() }]);
    // Log de analytics é assíncrono e não bloqueia UI
    logAnalyticsEvent('video_added', { count: 1, ids: [id], categories });
  };

  const addMany = (videos: VimeoVideo[]) => {
    const ids: string[] = [];
    const allCategories = new Set<string>();
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      videos.forEach((v) => {
        const id = getVideoId(v);
        ids.push(id);
        VideoCache.getVideoCategories(v).forEach((c) => allCategories.add(c));
        if (!map.has(id)) map.set(id, { id, video: v, addedAt: Date.now() });
      });
      return Array.from(map.values());
    });
    logAnalyticsEvent('video_added', { count: videos.length, ids, categories: Array.from(allCategories) });
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => { setItems([]); logAnalyticsEvent('playlist_cleared', {}); };
  const has = (id: string) => items.some((i) => i.id === id);

  const value = useMemo(() => ({ items, addVideo, addMany, remove, clear, has }), [items]);
  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
};

export const usePlaylist = () => {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylist deve ser usado dentro de PlaylistProvider');
  return ctx;
};
import { useState, useEffect, useCallback, useRef } from "react";
import { Search as SearchIcon, Filter, Grid, List as ListIcon, Loader2, AlertCircle, Settings, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useVimeo, VimeoVideo, VimeoApiResponse } from "@/lib/vimeo";
import { CacheManager } from '../components/CacheManager';
import { VideoCache } from '../lib/videoCache';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

// Interface para cache local
interface CacheEntry {
  data: VimeoApiResponse<VimeoVideo>;
  timestamp: number;
  query: string;
  specialty: string;
  category: string;
}

// Interface para filtros
interface SearchFilters {
  specialty: string;
  category: string;
}

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCacheManager, setShowCacheManager] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<SearchFilters>({
    specialty: "all",
    category: "all"
  });
  // Opções dinâmicas de categoria (mapeadas do conteúdo dos vídeos)
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["Todas"]);
  
  // Hooks da Playlist e Navegação
  const { items, addVideo, addMany, has } = usePlaylist();
  const navigate = useNavigate();

  // Define o tamanho fixo da página para paginação
  const PER_PAGE = 30;

  // Refs para debounce e cancelamento
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const { searchVideos, getUserVideos } = useVimeo();

  // Função para limpar cache e recarregar
  const clearCacheAndReload = async () => {
    console.log('🗑️ Limpando cache e forçando recarregamento completo...');
    VideoCache.clearCache();
    setVideos([]);
    setTotalVideos(0);
    setCurrentPage(1);
    
    // Forçar busca completa
    if (searchTerm.trim()) {
      await performSearch(searchTerm, 1);
    } else {
      await performSearch('', 1);
    }
  };

  // Cache local com TTL de 5 minutos
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milliseconds
  const CACHE_KEY = 'vimeo_search_cache';

  // Função para gerar chave do cache
  const generateCacheKey = (query: string, specialty: string, category: string, page: number) => {
    return `${query}_${specialty}_${category}_${page}`;
  };

  // Função para obter dados do cache
  const getFromCache = (cacheKey: string): CacheEntry | null => {
    try {
      const cache = localStorage.getItem(CACHE_KEY);
      if (!cache) return null;

      const parsedCache = JSON.parse(cache);
      const entry = parsedCache[cacheKey];

      if (!entry) return null;

      // Verificar se o cache ainda é válido
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        // Cache expirado, remover
        delete parsedCache[cacheKey];
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsedCache));
        return null;
      }

      return entry;
    } catch (error) {
      console.error('Erro ao acessar cache:', error);
      return null;
    }
  };

  // Função para salvar no cache
  const saveToCache = (cacheKey: string, data: VimeoApiResponse<VimeoVideo>, query: string, specialty: string, category: string) => {
    try {
      const cache = localStorage.getItem(CACHE_KEY);
      const parsedCache = cache ? JSON.parse(cache) : {};

      parsedCache[cacheKey] = {
        data,
        timestamp: Date.now(),
        query,
        specialty,
        category
      };

      // Limitar o tamanho do cache (máximo 50 entradas)
      const entries = Object.keys(parsedCache);
      if (entries.length > 50) {
        // Remover as entradas mais antigas
        const sortedEntries = entries.sort((a, b) => parsedCache[a].timestamp - parsedCache[b].timestamp);
        const toRemove = sortedEntries.slice(0, entries.length - 50);
        toRemove.forEach(key => delete parsedCache[key]);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(parsedCache));
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  };

  // Atualiza as opções de categoria com base no cache ou nos vídeos já carregados
  const refreshCategoryOptions = useCallback(() => {
    // Tenta ler do cache persistente primeiro (mais amplo)
    const cachedCategories = VideoCache.getAvailableCategories();
    if (cachedCategories.length > 0) {
      setCategoryOptions(["Todas", ...cachedCategories]);
      return;
    }
    // Fallback: usa os vídeos atualmente exibidos
    const fromResults = Array.from(new Set(videos.flatMap((v) => VideoCache.getVideoCategories(v)))).sort((a, b) => a.localeCompare(b));
    setCategoryOptions(["Todas", ...fromResults]);
  }, [videos]);

  // Loga evento de busca (dados reais)
  const logSearchEvent = async (payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        type: 'search',
        payload,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Analytics] Falha ao registrar busca:', e);
    }
  };

  // Função principal de busca
  const performSearch = useCallback(async (query: string = searchTerm, page: number = 1, useCache: boolean = true) => {
    // Cancelar requisição anterior se existir
    if (abortController.current) {
      abortController.current.abort();
    }
    
    // Criar novo controller para esta requisição
    abortController.current = new AbortController();

    // Evitar múltiplas buscas simultâneas usando uma flag local
    if (isLoading) {
      console.log('⏳ Busca já em andamento, ignorando nova requisição');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log(`🔍 SEARCH DEBUG: Iniciando busca para "${query}"`);

    try {
      const cacheKey = generateCacheKey(query, filters.specialty, filters.category, page);
      
      // Verificar cache primeiro
      if (useCache) {
        const cachedResult = getFromCache(cacheKey);
        if (cachedResult) {
          console.log('📦 Dados obtidos do cache local');
          setVideos(cachedResult.data.data);
          setTotalVideos(cachedResult.data.total);
          setCurrentPage(page);
          // Atualiza as opções de categoria conforme resultados
          refreshCategoryOptions();
          setIsLoading(false);
          // Log com indicador de cache
          logSearchEvent({ query, page, per_page: PER_PAGE, total: cachedResult.data.total, returned: cachedResult.data.data.length, usedCache: true, filters });
          return;
        }
      }

      let result: VimeoApiResponse<VimeoVideo>;

      if (query.trim()) {
        // Busca por termo específico - busca do tipo "contém"
        console.log('🔍 Buscando vídeos por termo (contém):', query);
        result = await searchVideos(query, page, PER_PAGE);
        console.log(`🔍 SEARCH DEBUG: Resultados da API: ${result.data.length}`);
        
        // Debug específico para vin636
        if (query.toLowerCase().includes('vin636')) {
          console.log(`🔍 SEARCH DEBUG: Busca específica por vin636`);
          const vin636Results = result.data.filter(video => 
            video.name?.toLowerCase().includes('vin636') ||
            video.description?.toLowerCase().includes('vin636') ||
            video.uri?.toLowerCase().includes('vin636')
          );
          console.log(`🔍 SEARCH DEBUG: Resultados vin636 da API: ${vin636Results.length}`);
          vin636Results.forEach(video => {
            console.log(`🔍 SEARCH DEBUG: VIN636 API - Nome: ${video.name}, URI: ${video.uri}`);
          });
        }
      } else {
        // Busca geral (vídeos do usuário)
        console.log('📹 Carregando vídeos do usuário');
        result = await getUserVideos(page, PER_PAGE);
        console.log(`🔍 SEARCH DEBUG: Total de vídeos carregados: ${result.data.length}`);
        
        // Debug específico para vin636 em busca geral
        const vin636Videos = result.data.filter(video => 
          video.name?.toLowerCase().includes('vin636') ||
          video.description?.toLowerCase().includes('vin636') ||
          video.uri?.toLowerCase().includes('vin636')
        );
        console.log(`🔍 SEARCH DEBUG: Vídeos com "vin636" encontrados: ${vin636Videos.length}`);
        vin636Videos.forEach(video => {
          console.log(`🔍 SEARCH DEBUG: VIN636 - Nome: ${video.name}, URI: ${video.uri}`);
        });
      }

      // Verificar se a requisição foi cancelada
      if (abortController.current?.signal.aborted) {
        console.log('🚫 Requisição cancelada');
        return;
      }

      // Aplicar filtros locais se necessário
      let filteredVideos = result.data;
      
      if (filters.specialty !== "all" || filters.category !== "all") {
        console.log(`🔍 SEARCH DEBUG: Aplicando filtros - Specialty: ${filters.specialty}, Category: ${filters.category}`);
        filteredVideos = result.data.filter(video => {
          const categories = VideoCache.getVideoCategories(video).map((c) => c.toLowerCase());
          // Filtro por Categoria
          const categoryPass = filters.category === "all" || categories.includes(filters.category.toLowerCase());
          // Filtro por Especialidade (usa o mesmo mapeamento de categorias médicas)
          const specialtyPass = filters.specialty === "all" || categories.includes(filters.specialty.toLowerCase());
          
          // Debug específico para vin636 com filtro
          if (query.toLowerCase().includes('vin636') && video.name?.toLowerCase().includes('vin636')) {
            console.log(`🔍 SEARCH DEBUG: VIN636 FILTRO - Vídeo: ${video.name}, Categorias: [${categories.join(', ')}], CategoryPass: ${categoryPass}, SpecialtyPass: ${specialtyPass}`);
          }
          
          return categoryPass && specialtyPass;
        });
        console.log(`🔍 SEARCH DEBUG: Vídeos após filtros: ${filteredVideos.length}`);
      }

      // Salvar no cache
      const cacheResult = { ...result, data: filteredVideos };
      saveToCache(cacheKey, cacheResult, query, filters.specialty, filters.category);

      setVideos(filteredVideos);
      setTotalVideos(result.total);
      setCurrentPage(page);
      // Atualiza as opções de categoria com base nos novos dados
      refreshCategoryOptions();
      
      console.log(`🔍 SEARCH DEBUG: Busca finalizada - ${filteredVideos.length} vídeos exibidos de ${result.total} total`);
      // Log de analytics
      logSearchEvent({ query, page, per_page: PER_PAGE, total: result.total, returned: filteredVideos.length, usedCache: false, filters });

    } catch (err: any) {
      // Não mostrar erro se foi cancelamento
      if (err.name === 'AbortError') {
        console.log('🚫 Busca cancelada pelo usuário');
        return;
      }
      
      console.error('Erro na busca:', err);
      setError(err.message || 'Erro ao buscar vídeos. Tente novamente.');
      setVideos([]);
      setTotalVideos(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filters.specialty, filters.category, searchVideos, getUserVideos, refreshCategoryOptions]);

  // Função para mudança do termo de busca (apenas atualiza o estado)
  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Limpar timer anterior se existir
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Apenas limpar resultados se o campo ficar vazio
    if (!value.trim()) {
      setVideos([]);
      setTotalVideos(0);
      setError(null);
    }
  }, []);

  // Função de busca chamada pelo botão ou Enter
  const handleSearch = () => {
    // Limpar debounce se existir
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    console.log('🔍 Busca manual ativada para:', searchTerm);
    setCurrentPage(1);
    performSearch(searchTerm, 1, false); // Forçar nova busca sem cache
  };

  // Função para mudança de filtros (apenas atualiza o estado)
  const handleFilterChange = (filterType: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    // Disparar busca automática para Categoria ou Especialidade
    const isAutoSearchFilter = filterType === 'category' || filterType === 'specialty';
    const hasChanged = (filters as any)[filterType] !== value;
    if (isAutoSearchFilter && hasChanged) {
      // Limpar debounce se existir
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      // Reinicia paginação e força nova busca sem cache, igual ao botão "Buscar Vídeos"
      setCurrentPage(1);
      console.log('🔍 Busca automática por filtro:', filterType, '=>', value);
      performSearch(searchTerm, 1, false);
    } else {
      console.log('🔧 Filtro atualizado:', filterType, '=', value);
    }
  };

  // Cleanup na desmontagem do componente
  useEffect(() => {
    return () => {
      // Limpar timers e cancelar requisições ao desmontar
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Carregar vídeos iniciais apenas uma vez
  useEffect(() => {
    performSearch("", 1, true);
  }, []); // Array vazio para executar apenas uma vez na montagem

  // Atualiza as opções de categoria quando a lista de vídeos muda
  useEffect(() => {
    refreshCategoryOptions();
  }, [videos, refreshCategoryOptions]);

  // Funções de paginação
  const goToPage = useCallback((page: number) => {
    const totalPages = Math.max(1, Math.ceil(totalVideos / PER_PAGE));
    let target = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(target);
    // Usa cache por página para melhorar a navegação
    performSearch(searchTerm, target, true);
  }, [performSearch, searchTerm, totalVideos]);

  const getPaginationItems = useCallback((current: number, total: number) => {
    const items: (number | '...')[] = [];
    const delta = 2; // páginas vizinhas
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    items.push(1);
    if (left > 2) items.push('...');
    for (let i = left; i <= right; i++) items.push(i);
    if (right < total - 1) items.push('...');
    if (total > 1) items.push(total);

    return items;
  }, []);

  // Função para formatar duração
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Função para extrair thumbnail do Vimeo
  const getVideoThumbnail = (video: VimeoVideo): string => {
    if (video.pictures?.sizes && video.pictures.sizes.length > 0) {
      const mediumSize = video.pictures.sizes.find(size => size.width >= 640) || video.pictures.sizes[0];
      return mediumSize.link;
    }
    return "https://images.unsplash.com/photo-1576091160550-2173dba999ef";
  };

  // Helpers e handlers da Playlist
  const getId = (video: VimeoVideo) => {
    try { return video.uri.split('/').pop() || video.uri; } catch { return video.uri; }
  };

  const handleAddVideo = (video: VimeoVideo) => {
    addVideo(video);
    toast({
      title: 'Adicionado à Playlist',
      description: `${video.name || 'Vídeo'} (${getId(video)})`
    });
  };

  const handleSelectAll = () => {
    if (videos.length === 0) return;
    const notAlready = videos.filter(v => !has(getId(v))).length;
    addMany(videos);
    toast({
      title: 'Playlist atualizada',
      description: `Adicionados ${notAlready} vídeo(s) desta página`
    });
  };

  const handleViewPlaylist = () => {
    navigate('/playlist');
  };

  const allSelected = videos.length > 0 && videos.every(v => has(getId(v)));

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="container mx-auto px-4">
            {/* Search Header */}
            <div className="space-y-6 mb-12">
              <div>
                <h1 className="text-4xl font-bold mb-2">Buscar Vídeos</h1>
                <p className="text-lg text-muted-foreground">
                  Explore nossa biblioteca com mais de 8.000 vídeos médicos
                </p>
              </div>

              {/* Search Controls */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, nome ou palavra-chave..."
                    value={searchTerm}
                    onChange={(e) => handleSearchTermChange(e.target.value)}
                    className="pl-10 h-12"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  onClick={handleSearch}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <SearchIcon className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Buscando...' : 'Buscar Vídeos'}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setViewMode("grid")}
                    disabled={isLoading}
                  >
                    <Grid className="w-5 h-5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setViewMode("list")}
                    disabled={isLoading}
                  >
                    <ListIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setShowCacheManager(true)}
                    title="Gerenciar Cache"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="mb-6 border-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State - Melhorado para UX */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" />
                    <div className="absolute inset-0 w-10 h-10 mx-auto border-2 border-blue-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-foreground">Buscando vídeos...</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? `Procurando por "${searchTerm}"` : 'Carregando biblioteca de vídeos'}
                    </p>
                  </div>
                  <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {!isLoading && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Exibindo <span className="font-semibold text-foreground">{videos.length}</span> de{" "}
                    <span className="font-semibold text-foreground">{totalVideos.toLocaleString()}</span> vídeos
                    {searchTerm && (
                      <span>
                        para "<span className="font-semibold text-foreground">{searchTerm}</span>"
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={isLoading || videos.length === 0 || allSelected}>
                      Selecionar Todos
                    </Button>
                    <Button variant="default" size="sm" onClick={handleViewPlaylist}>
                      {`Ver Playlist (${items.length})`}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Mais filtros
                    </Button>
                  </div>
                </div>

                {/* No Results */}
                {videos.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum vídeo encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Tente ajustar os termos de busca ou filtros
                    </p>
                    <Button onClick={() => {
                      setSearchTerm("");
                      setFilters({ specialty: "all", category: "all" });
                      performSearch("", 1, false);
                    }}>
                      Limpar filtros
                    </Button>
                  </div>
                )}

                {/* Video Grid/List */}
                {videos.length > 0 && (
                  <>
                    {viewMode === "grid" ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map((video) => (
                          <div
                            key={video.uri}
                            className="group bg-card border border-border rounded-xl overflow-hidden hover-lift"
                          >
                            <div className="relative aspect-video overflow-hidden">
                              <img
                                src={getVideoThumbnail(video)}
                                alt={video.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef";
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded">
                                {formatDuration(video.duration)}
                              </div>
                              {video.privacy?.view !== 'anybody' && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 text-white text-xs rounded">
                                  Privado
                                </div>
                              )}
                            </div>
                            <div className="p-5 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                  {video.name}
                                </h3>
                                <span className="px-2 py-1 bg-primary-light text-primary text-xs font-medium rounded shrink-0">
                                  {video.uri.split('/').pop()}
                                </span>
                              </div>
                              {video.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {video.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-success-light text-success text-xs rounded">
                                  {new Date(video.created_time).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                                  {video.status}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button className="flex-1 gradient-primary">
                                      Assistir
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl w-full">
                                    <DialogHeader>
                                      <DialogTitle>{video.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="aspect-video w-full">
                                       <iframe
                                        src={`https://player.vimeo.com/video/${video.uri.split('/').pop()}?autoplay=1&muted=1&playsinline=1`}
                                        className="w-full h-full rounded"
                                        frameBorder="0"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  className="flex-1"
                                  variant="outline"
                                  onClick={() => window.open(video.link, '_blank', 'noopener,noreferrer')}
                                >
                                  Ver no Vimeo
                                </Button>
                                <Button
                                  className="flex-1"
                                  onClick={() => handleAddVideo(video)}
                                  disabled={has(video.uri.split('/').pop() || video.uri)}
                                >
                                  Adicionar a Playlist
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {videos.map((video) => (
                          <div
                            key={video.uri}
                            className="w-full group bg-card border border-border rounded-xl overflow-hidden hover-lift flex items-start gap-4 p-4"
                          >
                            <div className="relative w-40 h-24 overflow-hidden rounded-lg shrink-0">
                              <img
                                src={getVideoThumbnail(video)}
                                alt={video.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef";
                                }}
                              />
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
                                {formatDuration(video.duration)}
                              </div>
                              {video.privacy?.view !== 'anybody' && (
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-yellow-500/90 text-white text-xs rounded">
                                  Privado
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors text-sm">
                                  {video.name}
                                </h3>
                                <span className="px-2 py-1 bg-primary-light text-primary text-xs font-medium rounded shrink-0">
                                  {video.uri.split('/').pop()}
                                </span>
                              </div>
                              {video.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {video.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1">
                                <span className="px-2 py-1 bg-success-light text-success text-xs rounded">
                                  {new Date(video.created_time).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                                  {video.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" className="gradient-primary">
                                    Assistir
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl w-full">
                                  <DialogHeader>
                                    <DialogTitle>{video.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="aspect-video w-full">
                                     <iframe
                                      src={`https://player.vimeo.com/video/${video.uri.split('/').pop()}?autoplay=1&muted=1&playsinline=1`}
                                      className="w-full h-full rounded"
                                      frameBorder="0"
                                      allow="autoplay; fullscreen; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(video.link, '_blank', 'noopener,noreferrer')}
                              >
                                Vimeo
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAddVideo(video)}
                                disabled={has(video.uri.split('/').pop() || video.uri)}
                              >
                                Adicionar a Playlist
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Paginação inferior */}
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(totalVideos / PER_PAGE));
                      const start = (currentPage - 1) * PER_PAGE + 1;
                      const end = Math.min(currentPage * PER_PAGE, totalVideos);
                      const items = getPaginationItems(currentPage, totalPages);
                      return (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            Página <span className="font-medium text-foreground">{currentPage}</span> de <span className="font-medium text-foreground">{totalPages}</span>
                            <span className="ml-2">— exibindo <span className="font-medium text-foreground">{start}</span>–<span className="font-medium text-foreground">{end}</span> de <span className="font-medium text-foreground">{totalVideos}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => goToPage(1)} disabled={currentPage === 1}>Primeira</Button>
                            <Button size="sm" variant="outline" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Anterior
                            </Button>
                            {items.map((item, idx) => (
                              typeof item === 'number' ? (
                                <Button
                                  key={`p-${idx}-${item}`}
                                  size="sm"
                                  variant={item === currentPage ? 'default' : 'outline'}
                                  onClick={() => goToPage(item)}
                                >
                                  {item}
                                </Button>
                              ) : (
                                <span key={`e-${idx}`} className="px-2 text-muted-foreground">…</span>
                              )
                            ))}
                            <Button size="sm" variant="outline" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                              Próxima
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages}>Última</Button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
      </main>

      {/* Modal do Gerenciador de Cache */}
      {showCacheManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gerenciador de Cache</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCacheManager(false)}
                >
                  Fechar
                </Button>
              </div>
              <CacheManager />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  </div>
  );
};

export default Search;

import { VimeoVideo } from './vimeo';

/**
 * Interface para entrada do cache
 */
interface CacheEntry {
  videos: VimeoVideo[];
  timestamp: number;
  totalVideos: number;
  lastPage: number;
  isComplete: boolean;
}

/**
 * Interface para índice de busca
 */
interface SearchIndex {
  [videoId: string]: {
    name: string;
    description: string;
    uri: string;
    tags: string[];
    searchableText: string;
  };
}

/**
 * Classe para gerenciar cache persistente de vídeos
 */
export class VideoCache {
  private static readonly CACHE_KEY = 'vimeo_videos_cache';
  private static readonly INDEX_KEY = 'vimeo_search_index';
  private static readonly CACHE_VERSION = '1.0';
  private static readonly TTL = 24 * 60 * 60 * 1000; // 24 horas em milliseconds
  private static readonly MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limite para evitar quota exceeded

  // Lista de categorias médicas conhecidas e sinônimos para mapeamento
  private static readonly MEDICAL_CATEGORIES: Record<string, string[]> = {
    Cardiologia: ['cardiologia', 'cardio', 'cardiopatia', 'cardiovascular'],
    Pediatria: ['pediatria', 'pediatrico', 'pediátrica', 'peds'],
    Cirurgia: ['cirurgia', 'cirurgico', 'cirúrgico', 'operacao', 'operatório', 'procedimento cirurgico', 'procedimento cirúrgico'],
    Neurologia: ['neurologia', 'neuro', 'neurologico', 'neurológico'],
    Ortopedia: ['ortopedia', 'ortopedico', 'ortopédico', 'traumato', 'traumatologia'],
    Dermatologia: ['dermatologia', 'dermato'],
    Oncologia: ['oncologia', 'onco', 'cancer', 'câncer'],
    Endocrinologia: ['endocrinologia', 'endocrino'],
    Ginecologia: ['ginecologia', 'gineco', 'obstetricia', 'obstetrícia', 'obstetra', 'gestacao', 'gestação', 'gravidez', 'prenatal', 'pré-natal', 'gestante', 'obstetric', 'obstetrics', 'pregnancy', 'pregnant'],
    Urologia: ['urologia', 'uro'],
    Psiquiatria: ['psiquiatria', 'psiquiatrico', 'psiquiátrico'],
    Oftalmologia: ['oftalmologia', 'oftalmo'],
    Otorrinolaringologia: ['otorrino', 'otorrinolaringologia'],
    Hematologia: ['hematologia', 'hemato'],
    Nefrologia: ['nefrologia', 'nefro'],
    Reumatologia: ['reumatologia', 'reumato'],
    Gastroenterologia: ['gastroenterologia', 'gastro'],
    Pneumologia: ['pneumologia', 'pneumo', 'pulmao', 'pulmão'],
    Infectologia: ['infectologia', 'infecto'],
    Anestesiologia: ['anestesiologia', 'anestesia'],
    Radiologia: ['radiologia', 'diagnostico por imagem', 'diagnóstico por imagem', 'imagem'],
    Odontologia: ['odontologia', 'dentaria', 'dentário', 'dentista'],
    Geriatria: ['geriatria', 'idoso', 'idosos', 'gerontologia', 'geronto', 'terceira idade'],
    Fisioterapia: ['fisioterapia', 'fisio'],
    Nutrição: ['nutricao', 'nutrição', 'gastronomia', 'alimentacao', 'alimentação', 'dieta', 'diet', 'nutrition', 'nutricional', 'nutritional'],
    Enfermagem: ['enfermagem', 'enfermeiro'],
  };

  // Normaliza texto removendo acentos e deixando minúsculo
  private static normalize(text: string): string {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // Verifica a ocorrência respeitando limites de palavra/frase para evitar falsos positivos
  private static matchesTerm(textRaw: string, termRaw: string): boolean {
    const text = this.normalize(textRaw);
    const term = this.normalize(termRaw);
    if (!term) return false;
    // Limites: início/fim ou separadores não alfanuméricos
    const pattern = new RegExp(`(^|\\W)${term}(\\W|$)`, 'i');
    return pattern.test(text);
  }

  private static canonicalizeCategory(raw: string): string | null {
    // Usa boundary-aware matching para reduzir falsos positivos
    for (const [canonical, synonyms] of Object.entries(this.MEDICAL_CATEGORIES)) {
      const candidates = [canonical, ...synonyms];
      if (candidates.some((c) => this.matchesTerm(raw, c))) {
        return canonical;
      }
    }
    return null;
  }

  // Retorna categorias médicas para um vídeo (a partir das tags e, como fallback, do nome/descrição)
  static getVideoCategories(video: VimeoVideo): string[] {
    const set = new Set<string>();

    // Pelo conjunto de tags (se disponível)
    if (video.tags && Array.isArray(video.tags)) {
      for (const t of video.tags) {
        const canonical = this.canonicalizeCategory(t?.name || '');
        if (canonical) set.add(canonical);
      }
    }

    // Fallback: analisando nome e descrição
    const text = `${video.name || ''} ${video.description || ''}`;
    for (const [canonical, synonyms] of Object.entries(this.MEDICAL_CATEGORIES)) {
      const patterns = [canonical, ...synonyms];
      if (patterns.some((p) => this.matchesTerm(text, p))) {
        set.add(canonical);
      }
    }

    return Array.from(set);
  }

  // Lista todas as categorias disponíveis com base no cache atual
  static getAvailableCategories(): string[] {
    const cached = this.loadVideos();
    const videos = cached?.videos || [];
    const all = new Set<string>();
    for (const v of videos) {
      for (const c of this.getVideoCategories(v)) {
        all.add(c);
      }
    }
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Verifica o tamanho atual do cache em bytes
   */
  private static getCurrentCacheSize(): number {
    try {
      const cacheData = localStorage.getItem(this.CACHE_KEY);
      const indexData = localStorage.getItem(this.INDEX_KEY);
      
      let totalSize = 0;
      if (cacheData) totalSize += new Blob([cacheData]).size;
      if (indexData) totalSize += new Blob([indexData]).size;
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Limpa cache automaticamente quando necessário
   */
  private static cleanupCacheIfNeeded(): void {
    try {
      const currentSize = this.getCurrentCacheSize();
      
      if (currentSize > this.MAX_CACHE_SIZE * 0.8) { // Limpar quando atingir 80% do limite
        console.log(`🧹 Cache muito grande (${(currentSize / 1024 / 1024).toFixed(2)}MB), limpando...`);
        this.clearCache();
      }
    } catch (error) {
      console.error('Erro ao verificar tamanho do cache:', error);
    }
  }

  /**
   * Salva vídeos no cache persistente
   */
  static saveVideos(videos: VimeoVideo[], totalVideos: number, lastPage: number, isComplete: boolean = false): void {
    try {
      // Verificar e limpar cache se necessário antes de salvar
      this.cleanupCacheIfNeeded();

      const cacheEntry: CacheEntry = {
        videos,
        timestamp: Date.now(),
        totalVideos,
        lastPage,
        isComplete
      };

      const cacheData = {
        version: this.CACHE_VERSION,
        data: cacheEntry
      };

      const dataToSave = JSON.stringify(cacheData);
      const dataSize = new Blob([dataToSave]).size;

      // Verificar se os dados cabem no limite
      if (dataSize > this.MAX_CACHE_SIZE) {
        console.warn(`⚠️ Dados muito grandes para cache (${(dataSize / 1024 / 1024).toFixed(2)}MB), reduzindo...`);
        
        // Reduzir o número de vídeos pela metade
        const reducedVideos = videos.slice(0, Math.floor(videos.length / 2));
        const reducedCacheEntry: CacheEntry = {
          videos: reducedVideos,
          timestamp: Date.now(),
          totalVideos,
          lastPage,
          isComplete: false // Marcar como incompleto se reduzimos
        };

        const reducedCacheData = {
          version: this.CACHE_VERSION,
          data: reducedCacheEntry
        };

        localStorage.setItem(this.CACHE_KEY, JSON.stringify(reducedCacheData));
        console.log(`💾 Cache salvo (reduzido): ${reducedVideos.length} vídeos, página ${lastPage}`);
      } else {
        localStorage.setItem(this.CACHE_KEY, dataToSave);
        console.log(`💾 Cache salvo: ${videos.length} vídeos, página ${lastPage}, completo: ${isComplete}`);
      }
      
      // Criar índice de busca se o cache estiver completo
      if (isComplete) {
        this.buildSearchIndex(videos);
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ Quota do localStorage excedida, limpando cache e tentando novamente...');
        
        // Limpar cache completamente
        this.clearCache();
        
        // Tentar salvar apenas uma versão reduzida
        try {
          const reducedVideos = videos.slice(0, Math.min(100, videos.length)); // Máximo 100 vídeos
          const reducedCacheEntry: CacheEntry = {
            videos: reducedVideos,
            timestamp: Date.now(),
            totalVideos,
            lastPage,
            isComplete: false
          };

          const reducedCacheData = {
            version: this.CACHE_VERSION,
            data: reducedCacheEntry
          };

          localStorage.setItem(this.CACHE_KEY, JSON.stringify(reducedCacheData));
          console.log(`💾 Cache salvo (emergência): ${reducedVideos.length} vídeos`);
        } catch (retryError) {
          console.error('❌ Falha ao salvar cache mesmo após limpeza:', retryError);
        }
      } else {
        console.error('❌ Erro ao salvar cache:', error);
      }
    }
  }

  /**
   * Carrega vídeos do cache persistente
   */
  static loadVideos(): CacheEntry | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Verificar versão do cache
      if (cacheData.version !== this.CACHE_VERSION) {
        console.log('🔄 Versão do cache desatualizada, limpando...');
        this.clearCache();
        return null;
      }

      const entry: CacheEntry = cacheData.data;
      
      // Verificar TTL
      if (Date.now() - entry.timestamp > this.TTL) {
        console.log('⏰ Cache expirado, limpando...');
        this.clearCache();
        return null;
      }

      console.log(`📦 Cache carregado: ${entry.videos.length} vídeos, completo: ${entry.isComplete}`);
      return entry;
    } catch (error) {
      console.error('❌ Erro ao carregar cache:', error);
      return null;
    }
  }

  /**
   * Adiciona novos vídeos ao cache existente
   */
  static appendVideos(newVideos: VimeoVideo[], totalVideos: number, lastPage: number, isComplete: boolean = false): void {
    try {
      const existing = this.loadVideos();
      
      if (existing) {
        // Combinar vídeos existentes com novos, evitando duplicatas
        const existingUris = new Set(existing.videos.map(v => v.uri));
        const uniqueNewVideos = newVideos.filter(v => !existingUris.has(v.uri));
        
        const allVideos = [...existing.videos, ...uniqueNewVideos];
        
        // Verificar se o cache combinado não ficará muito grande
        const estimatedSize = JSON.stringify(allVideos).length * 2; // Estimativa aproximada
        
        if (estimatedSize > this.MAX_CACHE_SIZE) {
          console.warn('⚠️ Cache ficaria muito grande, mantendo apenas vídeos mais recentes');
          
          // Manter apenas os vídeos mais recentes (últimos 500)
          const recentVideos = allVideos.slice(-500);
          this.saveVideos(recentVideos, totalVideos, lastPage, false);
        } else {
          this.saveVideos(allVideos, totalVideos, lastPage, isComplete);
        }
      } else {
        this.saveVideos(newVideos, totalVideos, lastPage, isComplete);
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar vídeos ao cache:', error);
      
      // Em caso de erro, tentar salvar apenas os novos vídeos
      try {
        this.saveVideos(newVideos, totalVideos, lastPage, isComplete);
      } catch (retryError) {
        console.error('❌ Falha ao salvar novos vídeos:', retryError);
      }
    }
  }

  /**
   * Constrói índice de busca para otimizar performance
   */
  private static buildSearchIndex(videos: VimeoVideo[]): void {
    try {
      const index: SearchIndex = {};

      videos.forEach(video => {
        const searchableText = [
          video.name || '',
          video.description || '',
          video.uri || '',
          ...(video.tags?.map(tag => tag.name) || [])
        ].join(' ').toLowerCase();

        index[video.uri] = {
          name: (video.name || '').toLowerCase(),
          description: (video.description || '').toLowerCase(),
          uri: (video.uri || '').toLowerCase(),
          tags: (video.tags?.map(tag => tag.name?.toLowerCase() || '') || []),
          searchableText
        };
      });

      localStorage.setItem(this.INDEX_KEY, JSON.stringify({
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        index
      }));

      console.log(`🔍 Índice de busca criado para ${Object.keys(index).length} vídeos`);
    } catch (error) {
      console.error('❌ Erro ao criar índice de busca:', error);
    }
  }

  /**
   * Busca vídeos usando o índice otimizado
   */
  static searchInIndex(query: string, videos: VimeoVideo[]): VimeoVideo[] {
    try {
      console.log(`🔍 DEBUG: Iniciando busca no índice para "${query}"`);
      console.log(`🔍 DEBUG: Total de vídeos recebidos: ${videos.length}`);
      
      const indexData = localStorage.getItem(this.INDEX_KEY);
      if (!indexData) {
        console.log(`🔍 DEBUG: Índice não encontrado, usando busca fallback`);
        // Fallback para busca tradicional
        return this.fallbackSearch(query, videos);
      }

      const { version, timestamp, index } = JSON.parse(indexData);
      
      // Verificar versão e TTL do índice
      if (version !== this.CACHE_VERSION || Date.now() - timestamp > this.TTL) {
        console.log(`🔍 DEBUG: Índice expirado ou versão incorreta, usando busca fallback`);
        return this.fallbackSearch(query, videos);
      }

      console.log(`🔍 DEBUG: Índice válido encontrado com ${Object.keys(index).length} entradas`);
      
      const searchTerm = query.toLowerCase().trim();
      const matchingUris = new Set<string>();

      // Busca por sequência exata (substring), incluindo normalização para ignorar separadores
      // Exemplo: 'vin636' casa com 'vin636', 'vin6367', 'VIN 636 - ...', 'vin-636', 'vin_636'
      const normalizedSearchTerm = searchTerm.replace(/[^a-z0-9]/g, '');
      Object.entries(index).forEach(([uri, data]) => {
        const text = data.searchableText;
        const normalizedText = text.replace(/[^a-z0-9]/g, '');
        
        if (text.includes(searchTerm) || normalizedText.includes(normalizedSearchTerm)) {
          matchingUris.add(uri);
        }
      });

      console.log(`🔍 DEBUG: URIs encontrados no índice: ${matchingUris.size}`);
      console.log(`🔍 DEBUG: URIs encontrados:`, Array.from(matchingUris).slice(0, 10));

      // Retornar vídeos correspondentes mantendo a ordem original
      const results = videos.filter(video => matchingUris.has(video.uri));
      
      console.log(`🔍 Busca no índice: ${results.length} resultados para "${query}"`);
      console.log(`🔍 DEBUG: Vídeos filtrados: ${results.length}`);
      
      return results;
    } catch (error) {
      console.error('❌ Erro na busca por índice:', error);
      return this.fallbackSearch(query, videos);
    }
  }

  /**
   * Busca tradicional como fallback
   */
  private static fallbackSearch(query: string, videos: VimeoVideo[]): VimeoVideo[] {
    const searchTerm = query.toLowerCase().trim();
    
    return videos.filter(video => {
      const nameMatch = video.name?.toLowerCase().includes(searchTerm);
      const descriptionMatch = video.description?.toLowerCase().includes(searchTerm);
      const uriMatch = video.uri?.toLowerCase().includes(searchTerm);
      const tagsMatch = video.tags?.some(tag => 
        tag.name?.toLowerCase().includes(searchTerm)
      );
      
      return nameMatch || descriptionMatch || uriMatch || tagsMatch;
    });
  }

  /**
   * Verifica se o cache está completo
   */
  static isCacheComplete(): boolean {
    const cached = this.loadVideos();
    return cached?.isComplete || false;
  }

  /**
   * Obtém informações do cache
   */
  static getCacheInfo(): { 
    hasCache: boolean; 
    videoCount: number; 
    isComplete: boolean; 
    lastPage: number;
    age: number;
  } {
    const cached = this.loadVideos();
    
    if (!cached) {
      return {
        hasCache: false,
        videoCount: 0,
        isComplete: false,
        lastPage: 0,
        age: 0
      };
    }

    return {
      hasCache: true,
      videoCount: cached.videos.length,
      isComplete: cached.isComplete,
      lastPage: cached.lastPage,
      age: Date.now() - cached.timestamp
    };
  }

  /**
   * Limpa todo o cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.INDEX_KEY);
      console.log('🗑️ Cache limpo completamente');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Força atualização do cache
   */
  static invalidateCache(): void {
    this.clearCache();
    console.log('♻️ Cache invalidado - próxima busca será completa');
  }

  /**
   * Obtém tamanho do cache em bytes (aproximado)
   */
  static getCacheSize(): number {
    try {
      const cacheData = localStorage.getItem(this.CACHE_KEY);
      const indexData = localStorage.getItem(this.INDEX_KEY);
      
      const cacheSize = cacheData ? new Blob([cacheData]).size : 0;
      const indexSize = indexData ? new Blob([indexData]).size : 0;
      
      return cacheSize + indexSize;
    } catch (error) {
      return 0;
    }
  }
}
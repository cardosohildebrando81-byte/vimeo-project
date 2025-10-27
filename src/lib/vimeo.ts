import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Tipos para a API do Vimeo
export interface VimeoUser {
  uri: string;
  name: string;
  link: string;
  location: string;
  bio: string;
  created_time: string;
  account: string;
}

export interface VimeoVideo {
  uri: string;
  name: string;
  description: string;
  link: string;
  duration: number;
  created_time: string;
  modified_time: string;
  status: string;
  privacy: {
    view: string;
    embed: string;
  };
  pictures: {
    uri: string;
    active: boolean;
    sizes: Array<{
      width: number;
      height: number;
      link: string;
    }>;
  };
  // Adiciona tags opcionais retornadas quando solicitamos fields=tags
  tags?: Array<{ name: string }>;
}

export interface VimeoApiResponse<T> {
  total: number;
  page: number;
  per_page: number;
  paging: {
    next: string | null;
    previous: string | null;
    first: string;
    last: string;
  };
  data: T[];
}

class VimeoService {
  private api: AxiosInstance;
  private accessToken: string;

  // Feature flags/limites controlados por env para evitar travamentos
  private readonly fallbackEnabled: boolean;
  private readonly maxPages: number;
  private readonly batchSize: number;
  private readonly videosPerRequest: number;
  // Enriquecimento de busca: incluir correspondências por tags via índice local
  private readonly enrichSearchWithTags: boolean;
  // Controle fino: evitar fetch incremental bloqueante durante enriquecimento por TAGs
  private readonly enrichSearchTagsFetchIncremental: boolean;

  constructor() {
    this.accessToken = import.meta.env.VITE_VIMEO_ACCESS_TOKEN || '';
    this.api = axios.create({
      baseURL: 'https://api.vimeo.com',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Flags/limites (valores seguros por padrão)
    // Para reativar o fallback pesado, defina VITE_VIMEO_FALLBACK_ENABLED=true
    this.fallbackEnabled = (import.meta.env.VITE_VIMEO_FALLBACK_ENABLED || 'false') !== 'false';
    this.maxPages = Number(import.meta.env.VITE_VIMEO_MAX_PAGES || 8); // antes era 50
    this.batchSize = Number(import.meta.env.VITE_VIMEO_BATCH_SIZE || 1); // antes 2
    this.videosPerRequest = Number(import.meta.env.VITE_VIMEO_VIDEOS_PER_REQUEST || 50); // antes 100
    this.enrichSearchWithTags = (import.meta.env.VITE_VIMEO_SEARCH_ENRICH_TAGS || 'true') !== 'false';
    // Por padrão NÃO realizar fetch incremental durante enriquecimento de busca, para evitar loops/bloqueios
    this.enrichSearchTagsFetchIncremental = (import.meta.env.VITE_VIMEO_SEARCH_TAGS_FETCH_INCREMENTAL || 'false') === 'true';

    // Interceptor para tratar erros globais
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          return Promise.reject(new Error('Falha de rede ao acessar a API do Vimeo'));
        }

        // Tratar erros específicos do Vimeo
        if (error.response.status === 429) {
          return Promise.reject(new Error('Limite de requisições do Vimeo excedido. Tente novamente mais tarde.'));
        }

        if (error.response.status === 401) {
          return Promise.reject(new Error('Token de acesso inválido ou expirado. Verifique suas credenciais.'));
        }

        return Promise.reject(error);
      }
    );
  }

  async testConnection(): Promise<{ success: boolean; message: string; user?: VimeoUser }> {
    if (!this.accessToken) {
      return { success: false, message: 'Token de acesso do Vimeo não configurado. Configure VITE_VIMEO_ACCESS_TOKEN nas variáveis de ambiente.' };
    }

    try {
      const response: AxiosResponse<VimeoUser> = await this.api.get('/me');
      return { success: true, message: 'Conexão OK', user: response.data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Busca vídeos do usuário autenticado
   */
  async getUserVideos(page = 1, perPage = 25): Promise<VimeoApiResponse<VimeoVideo>> {
    if (!this.accessToken) {
      throw new Error('Token de acesso do Vimeo não configurado. Configure VITE_VIMEO_ACCESS_TOKEN nas variáveis de ambiente.');
    }

    try {
      const response: AxiosResponse<VimeoApiResponse<VimeoVideo>> = await this.api.get('/me/videos', {
        params: {
          page,
          per_page: perPage,
          // Mantemos um conjunto de campos enxuto aqui; tags são carregadas no fluxo incremental
          fields: 'uri,name,description,link,duration,created_time,modified_time,status,privacy,pictures'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar vídeos:', error);
      throw new Error('Falha ao carregar vídeos do Vimeo');
    }
  }

  /**
   * Busca informações de um vídeo específico
   */
  async getVideo(videoId: string): Promise<VimeoVideo> {
    if (!this.accessToken) {
      throw new Error('Token de acesso do Vimeo não configurado. Configure VITE_VIMEO_ACCESS_TOKEN nas variáveis de ambiente.');
    }

    try {
      const response: AxiosResponse<VimeoVideo> = await this.api.get(`/videos/${videoId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar vídeo:', error);
      throw new Error('Falha ao carregar vídeo do Vimeo');
    }
  }

  /**
   * Busca vídeos por termo de pesquisa na conta do usuário autenticado
   * Prioriza a busca direta na API com parâmetro `query` e faz fallback para cache/index local se necessário
   */
  async searchVideos(query: string, page = 1, perPage = 30): Promise<VimeoApiResponse<VimeoVideo>> {
    if (!this.accessToken) {
      throw new Error('Token de acesso do Vimeo não configurado. Configure VITE_VIMEO_ACCESS_TOKEN nas variáveis de ambiente.');
    }

    const q = query.trim();
    try {
      console.log(`🔍 Buscando diretamente na API do Vimeo: query="${q}", page=${page}, per_page=${perPage}`);
      const response: AxiosResponse<VimeoApiResponse<VimeoVideo>> = await this.api.get('/me/videos', {
        params: {
          page,
          per_page: perPage,
          query: q,
          fields: 'uri,name,description,link,duration,created_time,modified_time,status,privacy,pictures,tags',
          sort: 'date',
          direction: 'desc'
        }
      });

      const data = response.data;
      console.log(`✅ Vimeo API retornou: total=${data.total}, page=${data.page}, itens=${data.data.length}`);

      // Se a API retornou resultados ou mesmo quando não, podemos enriquecer com uma BUSCA DIRETA por TAG na API
      // Isso alinha o comportamento com a busca da Web do Vimeo, que considera TAGs.
      if (this.enrichSearchWithTags && q.length > 0) {
        try {
          // 1) Busca adicional por TAG diretamente na API (sem carregar toda a biblioteca)
          // Observação: a API do Vimeo suporta filter_tag para retornar vídeos com uma tag específica.
          // Para capturar a maioria dos casos em uma única chamada, usamos per_page=100.
          const tagResp: AxiosResponse<VimeoApiResponse<VimeoVideo>> = await this.api.get('/me/videos', {
            params: {
              filter_tag: q,
              per_page: Math.max(100, perPage),
              page: 1,
              fields: 'uri,name,description,link,duration,created_time,modified_time,status,privacy,pictures,tags',
              sort: 'date',
              direction: 'desc'
            }
          });

          const tagData = tagResp.data;
          console.log(`🧩 API TAGS retornou: total=${tagData.total}, itens=${tagData.data.length}`);

          // 2) Unir e deduplicar resultados (priorizando a ordem dos retornos por query)
          const mapByUri = new Map<string, VimeoVideo>();
          data.data.forEach(v => mapByUri.set(v.uri, v));
          tagData.data.forEach(v => {
            if (!mapByUri.has(v.uri)) mapByUri.set(v.uri, v);
          });

          const combined = Array.from(mapByUri.values());
          const totalCombined = Math.max(data.total, tagData.total, combined.length);

          // 3) Paginar localmente o conjunto unido
          const startIndex = (page - 1) * perPage;
          const endIndex = Math.min(startIndex + perPage, combined.length);
          const paginated = combined.slice(startIndex, endIndex);
          const totalPages = Math.max(1, Math.ceil(totalCombined / perPage));

          const enriched: VimeoApiResponse<VimeoVideo> = {
            total: totalCombined,
            page,
            per_page: perPage,
            paging: {
              next: page < totalPages ? `/search?page=${page + 1}&per_page=${perPage}` : null,
              previous: page > 1 ? `/search?page=${page - 1}&per_page=${perPage}` : null,
              first: `/search?page=1&per_page=${perPage}`,
              last: `/search?page=${totalPages}&per_page=${perPage}`,
            },
            data: paginated,
          };

          return enriched;
        } catch (apiTagErr) {
          console.warn('⚠️ Falha na busca por TAG diretamente na API:', (apiTagErr as any)?.message || apiTagErr);
          // Se falhar o enriquecimento por TAG via API, retornamos a resposta original
          // e seguimos fluxo normal (inclusive fallback mais abaixo se aplicável)
          if ((data.data.length > 0 || data.total > 0)) {
            return data;
          }
        }
      }

      // Se ainda houver dados (query) retornados, entregar diretamente
      if ((data.data.length > 0 || data.total > 0)) {
        return data;
      }

      console.log('ℹ️ Nenhum resultado direto da API.');
      if (!this.fallbackEnabled) {
        // Retorna vazio de forma rápida para não travar a UI
        return {
          total: 0,
          page,
          per_page: perPage,
          paging: { next: null, previous: null, first: '', last: '' },
          data: []
        };
      }
      console.log('Ativando fallback para cache/index local...');
    } catch (error: any) {
      console.warn('⚠️ Falha na busca direta da API Vimeo', error?.message || error);
      if (!this.fallbackEnabled) {
        // Não fazer fallback pesado quando desabilitado
        throw new Error(error?.message || 'Falha ao buscar na API do Vimeo');
      }
      console.log('Usando fallback local por estar habilitado.');
    }

    // Fallback: busca local com cache e carregamento incremental
    try {
      console.log(`🔍 Fallback local para "${q}"`);
      const { VideoCache } = await import('./videoCache');

      // Verificar cache existente
      const cacheInfo = VideoCache.getCacheInfo();
      console.log(`📦 Cache existente? ${cacheInfo.hasCache}. Completo? ${cacheInfo.isComplete}. Última página: ${cacheInfo.lastPage}`);

      let allVideos: VimeoVideo[] = [];

      if (cacheInfo.hasCache) {
        const cached = VideoCache.loadVideos();
        if (cached) {
          allVideos = cached.videos;
          console.log(`📦 Usando ${allVideos.length} vídeos do cache`);
        }
      }

      // Se o cache não estiver completo, carregar incrementalmente
      if (!cacheInfo.isComplete) {
        console.log('🔄 Cache incompleto. Iniciando carregamento incremental...');
        const incrementallyLoaded = await this.loadVideosIncrementally(cacheInfo);
        if (incrementallyLoaded.length > 0) {
          allVideos = incrementallyLoaded;
        }
      }

      // Filtrar com base na consulta usando índice do cache
      const filteredVideos = (await import('./videoCache')).VideoCache.searchInIndex(q, allVideos);
      console.log(`🔍 searchVideos (fallback): ${filteredVideos.length} resultados após filtragem por índice`);

      // Paginação local
      const startIndex = (page - 1) * perPage;
      const endIndex = Math.min(startIndex + perPage, filteredVideos.length);
      const paginatedVideos = filteredVideos.slice(startIndex, endIndex);
      const totalPages = Math.ceil(filteredVideos.length / perPage);

      const paging = {
        next: page < totalPages ? `/search?page=${page + 1}&per_page=${perPage}` : null,
        previous: page > 1 ? `/search?page=${page - 1}&per_page=${perPage}` : null,
        first: `/search?page=1&per_page=${perPage}`,
        last: `/search?page=${totalPages}&per_page=${perPage}`
      };

      return {
        total: filteredVideos.length,
        page,
        per_page: perPage,
        paging,
        data: paginatedVideos
      };
    } catch (error: any) {
      console.error('❌ Erro ao pesquisar vídeos (fallback):', error);

      // Tratar erros específicos
      if (error.response?.status === 401) {
        throw new Error('Token de acesso do Vimeo inválido ou expirado');
      }
      if (error.response?.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos');
      }

      throw new Error(`Falha ao pesquisar vídeos na conta: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Carrega vídeos incrementalmente, usando cache quando possível
   */
  private async loadVideosIncrementally(cacheInfo: any): Promise<VimeoVideo[]> {
    const { VideoCache } = await import('./videoCache');
    
    let allVideos: VimeoVideo[] = [];
    let startPage = 1;
    
    // Se há cache parcial, começar de onde parou
    if (cacheInfo.hasCache && !cacheInfo.isComplete) {
      const cached = VideoCache.loadVideos();
      if (cached) {
        allVideos = cached.videos;
        startPage = cached.lastPage + 1;
        console.log(`📦 Continuando do cache: ${allVideos.length} vídeos, próxima página: ${startPage}`);
      }
    }
    
    let currentPage = startPage;
    let hasMorePages = true;
    const videosPerRequest = this.videosPerRequest; // Máximo permitido pela API (ajustável)
    const batchSize = this.batchSize; // Reduzido via env
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmptyPages = 2; // Reduzir para 2 páginas vazias
    const maxPages = this.maxPages; // Limite de segurança para evitar loop infinito
    let latestTotalFromApi = 0; // manter o total reportado pela API
    
    console.log(`📥 Carregando vídeos incrementalmente a partir da página ${startPage}... (até ${maxPages} páginas, batch=${batchSize}, per_page=${videosPerRequest})`);
    
    while (hasMorePages && consecutiveEmptyPages < maxConsecutiveEmptyPages && currentPage <= maxPages) {
      const batchVideos: VimeoVideo[] = [];
      let batchHasData = false;
      
      // Carregar um lote de páginas
      for (let i = 0; i < batchSize && hasMorePages && currentPage <= maxPages; i++) {
        console.log(`📄 Carregando página ${currentPage}...`);
        
        try {
          const response: AxiosResponse<VimeoApiResponse<VimeoVideo>> = await this.api.get('/me/videos', {
            params: {
              page: currentPage,
              per_page: videosPerRequest,
              fields: 'uri,name,description,link,duration,created_time,modified_time,status,privacy,pictures,tags',
              sort: 'date',
              direction: 'desc'
            }
          });
          
          const pageVideos = response.data.data;
          const totalFromApi = response.data.total;
          const paging = response.data.paging;
          latestTotalFromApi = totalFromApi || latestTotalFromApi;
          
          console.log(`📄 Página ${currentPage}: ${pageVideos.length} vídeos, Total API: ${totalFromApi}, Próxima: ${!!paging.next}`);
          
          if (pageVideos.length === 0) {
            consecutiveEmptyPages++;
            console.log(`⚠️ Página vazia ${currentPage}. Páginas vazias consecutivas: ${consecutiveEmptyPages}`);
          } else {
            consecutiveEmptyPages = 0; // Reset contador se encontrou vídeos
            batchVideos.push(...pageVideos);
            batchHasData = true;
          }
          
          // Verificações de parada mais rigorosas
          const videosLoadedSoFar = allVideos.length + batchVideos.length;
          
          // Parar se:
          // 1. API indica que não há próxima página
          // 2. Já carregamos todos os vídeos disponíveis
          // 3. Página atual é maior que o total calculado
          if (!paging.next || 
              (totalFromApi > 0 && videosLoadedSoFar >= totalFromApi) ||
              (totalFromApi > 0 && currentPage > Math.ceil(totalFromApi / videosPerRequest))) {
            console.log(`✅ Condição de parada atingida: next=${!!paging.next}, total=${totalFromApi}, carregados=${videosLoadedSoFar}, página=${currentPage}`);
            hasMorePages = false;
            break;
          }
          
          currentPage++;
          
        } catch (error: any) {
          console.error(`❌ Erro ao carregar página ${currentPage}:`, error.message || error);
          consecutiveEmptyPages++;
          
          // Se tiver muitos erros consecutivos, parar
          if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
            console.log(`❌ Muitas páginas com erro consecutivas (${consecutiveEmptyPages}), parando carregamento`);
            hasMorePages = false;
            break;
          }
          currentPage++;
        }
      }
      
      // Adicionar ao conjunto completo apenas se houver dados
      if (batchHasData && batchVideos.length > 0) {
        allVideos = [...allVideos, ...batchVideos];
        console.log(`📚 Total acumulado: ${allVideos.length} vídeos`);
      }
      
      // Condições de parada do loop principal
      const isComplete = !hasMorePages || 
                        consecutiveEmptyPages >= maxConsecutiveEmptyPages || 
                        currentPage > maxPages ||
                        !batchHasData;
      
      // Salvar progresso no cache (usar total reportado pela API quando disponível)
      // Importante: salvar apenas o batch atual para evitar cópias gigantes em cada iteração
      if (batchVideos.length > 0) {
        VideoCache.appendVideos(batchVideos, latestTotalFromApi || allVideos.length, currentPage - 1, isComplete);
      }
      
      if (isComplete) {
        console.log(`✅ Carregamento incremental concluído. Motivo: hasMorePages=${hasMorePages}, emptyPages=${consecutiveEmptyPages}, maxPages=${currentPage > maxPages}, noData=${!batchHasData}`);
        console.log(`✅ Total final: ${allVideos.length} vídeos (total API: ${latestTotalFromApi || 'desconhecido'})`);
        break;
      }
      
      // Pausa pequena entre batches para evitar rate limiting e dar respiro ao main thread
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    return allVideos;
  }
}

export const vimeoService = new VimeoService();

export const useVimeo = () => {
  const searchVideos = (query: string, page = 1, perPage = 30) => vimeoService.searchVideos(query, page, perPage);
  const getUserVideos = (page = 1, perPage = 25) => vimeoService.getUserVideos(page, perPage);
  const getVideo = (videoId: string) => vimeoService.getVideo(videoId);
  const testConnection = () => vimeoService.testConnection();
  
  return { searchVideos, getUserVideos, getVideo, testConnection };
};

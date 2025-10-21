import React, { useState, useEffect } from 'react';
import { VideoCache } from '../lib/videoCache';

interface CacheInfo {
  hasCache: boolean;
  videoCount: number;
  isComplete: boolean;
  lastPage: number;
  age: number;
}

export const CacheManager: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCacheInfo = () => {
    const info = VideoCache.getCacheInfo();
    setCacheInfo({
      hasCache: info.hasCache,
      videoCount: info.videoCount,
      isComplete: info.isComplete,
      lastPage: info.lastPage,
      age: info.age
    });
  };

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o cache? Isso fará com que os vídeos sejam recarregados na próxima busca.')) {
      return;
    }

    setIsClearing(true);
    try {
      VideoCache.clearCache();
      loadCacheInfo();
      alert('Cache limpo com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      alert('Erro ao limpar cache. Verifique o console para mais detalhes.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefreshCache = async () => {
    if (!confirm('Tem certeza que deseja atualizar o cache? Isso pode levar alguns minutos dependendo do número de vídeos.')) {
      return;
    }

    setIsRefreshing(true);
    try {
      // Limpar cache existente
      VideoCache.clearCache();
      
      // Recarregar informações
      loadCacheInfo();
      
      alert('Cache marcado para atualização! Na próxima busca, os vídeos serão recarregados automaticamente.');
    } catch (error) {
      console.error('Erro ao atualizar cache:', error);
      alert('Erro ao atualizar cache. Verifique o console para mais detalhes.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatAge = (ageInMs: number): string => {
    const minutes = Math.floor(ageInMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia(s)`;
    if (hours > 0) return `${hours} hora(s)`;
    return `${minutes} minuto(s)`;
  };

  const getStatusColor = (isComplete: boolean, age: number): string => {
    if (!isComplete) return 'text-yellow-600';
    if (age > 24 * 60 * 60 * 1000) return 'text-red-600'; // Mais de 24h
    return 'text-green-600';
  };

  const getStatusText = (hasCache: boolean, isComplete: boolean, age: number): string => {
    if (!hasCache) return 'Sem cache';
    if (!isComplete) return 'Cache parcial';
    if (age > 24 * 60 * 60 * 1000) return 'Cache expirado';
    return 'Cache atualizado';
  };

  if (!cacheInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Gerenciador de Cache
        </h3>
        <div className="text-gray-500">Carregando informações do cache...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Gerenciador de Cache
      </h3>
      
      <div className="space-y-4">
        {/* Status do Cache */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Status</div>
            <div className={`font-semibold ${getStatusColor(cacheInfo.isComplete, cacheInfo.age)}`}>
              {getStatusText(cacheInfo.hasCache, cacheInfo.isComplete, cacheInfo.age)}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Vídeos em Cache</div>
            <div className="font-semibold text-gray-900">
              {cacheInfo.videoCount.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Última Página</div>
            <div className="font-semibold text-gray-900">
              {cacheInfo.lastPage}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Idade do Cache</div>
            <div className="font-semibold text-gray-900">
              {cacheInfo.hasCache ? formatAge(cacheInfo.age) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex space-x-4 pt-4 border-t">
          <button
            onClick={handleRefreshCache}
            disabled={isRefreshing}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar Cache'}
          </button>
          
          <button
            onClick={handleClearCache}
            disabled={isClearing || !cacheInfo.hasCache}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isClearing ? 'Limpando...' : 'Limpar Cache'}
          </button>
        </div>

        {/* Informações Adicionais */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>• O cache é atualizado automaticamente a cada 24 horas</p>
          <p>• Vídeos são carregados incrementalmente para melhor performance</p>
          <p>• O cache é armazenado localmente no seu navegador</p>
        </div>
      </div>
    </div>
  );
};
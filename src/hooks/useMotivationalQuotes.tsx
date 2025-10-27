import { useState, useEffect } from 'react';

// Array de frases motivacionais em português
const motivationalQuotes = [
  "🌟 Cada vídeo que você cria é uma oportunidade de inspirar alguém!",
  "🚀 Sua criatividade não tem limites - continue explorando!",
  "💡 Grandes ideias começam com pequenos passos. Continue caminhando!",
  "🎬 O mundo precisa da sua perspectiva única através dos seus vídeos!",
  "⭐ Você está construindo algo incrível, um vídeo de cada vez!",
  "🌈 Sua jornada criativa está apenas começando - que venham mais conquistas!",
  "🔥 A paixão que você coloca em cada projeto é inspiradora!",
  "🎯 Foque no progresso, não na perfeição. Você está indo muito bem!",
  "💪 Cada desafio superado te torna um criador mais forte!",
  "🌸 Sua dedicação ao trabalho é admirável - continue brilhando!",
  "🎨 A arte de contar histórias através de vídeos é seu superpoder!",
  "🌟 Você tem o poder de transformar ideias em realidade visual!",
  "🚀 Sua criatividade é o combustível para projetos extraordinários!",
  "💫 Cada frame que você edita carrega um pedaço da sua alma criativa!",
  "🎪 O palco digital é seu - mostre ao mundo sua magia!"
];

interface UseMotivationalQuotesReturn {
  currentQuote: string;
  showQuote: boolean;
  dismissQuote: () => void;
}

export const useMotivationalQuotes = (): UseMotivationalQuotesReturn => {
  const [currentQuote, setCurrentQuote] = useState<string>('');
  const [showQuote, setShowQuote] = useState<boolean>(false);
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(0);

  // Função para obter uma frase aleatória
  const getRandomQuote = (): string => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    return motivationalQuotes[randomIndex];
  };

  // Função para verificar se deve mostrar uma nova frase
  const shouldShowNewQuote = (): boolean => {
    const now = Date.now();
    const timeDifference = now - lastQuoteTime;
    const twoHoursInMs = 120 * 60 * 1000; // 120 minutos em milissegundos
    
    return timeDifference >= twoHoursInMs;
  };

  // Função para mostrar uma nova frase
  const showNewQuote = () => {
    if (shouldShowNewQuote()) {
      const newQuote = getRandomQuote();
      setCurrentQuote(newQuote);
      setShowQuote(true);
      setLastQuoteTime(Date.now());
      
      // Salvar no localStorage para persistir entre sessões
      localStorage.setItem('lastMotivationalQuoteTime', Date.now().toString());
      localStorage.setItem('lastMotivationalQuote', newQuote);
    }
  };

  // Função para dispensar a frase
  const dismissQuote = () => {
    setShowQuote(false);
  };

  // Effect para inicializar e verificar periodicamente
  useEffect(() => {
    // Recuperar dados do localStorage
    const savedTime = localStorage.getItem('lastMotivationalQuoteTime');
    const savedQuote = localStorage.getItem('lastMotivationalQuote');
    
    if (savedTime) {
      setLastQuoteTime(parseInt(savedTime));
    }
    
    if (savedQuote) {
      setCurrentQuote(savedQuote);
    }

    // Verificar imediatamente se deve mostrar uma frase
    showNewQuote();

    // Configurar intervalo para verificar a cada 5 minutos
    const interval = setInterval(() => {
      showNewQuote();
    }, 5 * 60 * 1000); // Verifica a cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  return {
    currentQuote,
    showQuote,
    dismissQuote
  };
};
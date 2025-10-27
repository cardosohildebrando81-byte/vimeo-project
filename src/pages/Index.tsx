import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, List, Download, BarChart3, Shield, Zap, Users, Briefcase, Video, Megaphone, ClipboardList, Stethoscope, Brain, Bone, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

import thumb01 from "@/assets/thumb-01.jpg";
import thumb02 from "@/assets/thumb-02.jpg";
import thumb03 from "@/assets/thumb-03.jpg";
import thumb04 from "@/assets/thumb-04.jpg";
import thumb06 from "@/assets/thumb-06.jpg";
import thumb07 from "@/assets/thumb-07.jpg";
import thumb08 from "@/assets/thumb-08.jpg";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const features = [
    {
      icon: Search,
      title: "Busca Avançada",
      description: "Encontre vídeos por código, nome, especialidade ou categoria com sistema de busca inteligente.",
    },
    {
      icon: List,
      title: "Criação de Playlists",
      description: "Crie playlists personalizadas para cada cliente com base em suas necessidades específicas.",
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "Organize e gerencie playlists por cliente, mantendo histórico e preferências.",
    },
    {
      icon: Download,
      title: "Exportação Profissional",
      description: "Exporte playlists em diversos formatos para entrega aos clientes.",
    },
    {
      icon: BarChart3,
      title: "Relatórios Detalhados",
      description: "Acompanhe métricas de uso e engajamento das playlists criadas.",
    },
    {
      icon: Shield,
      title: "Controle de Acesso",
      description: "Sistema seguro com controle de permissões para equipe interna.",
    },
  ];

  const workflows = [
    {
      step: "1",
      title: "Buscar Conteúdo",
      description: "Use nossa busca avançada para encontrar vídeos relevantes no acervo de mais de 8.000 vídeos médicos.",
    },
    {
      step: "2", 
      title: "Criar Playlist",
      description: "Monte playlists personalizadas organizando os vídeos por especialidade ou tema específico.",
    },
    {
      step: "3",
      title: "Personalizar para Cliente",
      description: "Ajuste a playlist conforme as necessidades e preferências de cada cliente.",
    },
    {
      step: "4",
      title: "Entregar Conteúdo",
      description: "Exporte e entregue a playlist finalizada ao cliente em formato profissional.",
    },
  ];

  // Hero: carrossel de imagens 16:9; vídeo em seção própria via iframe
  const heroVideoId = 1123837779;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const SHOW_PAGE_CTA = true; // Restaurar CTAs na página
  const isMobile = useIsMobile();

  // Reinicia o vídeo ao terminar e evita telas de recomendação
  useEffect(() => {
    const ensureVimeoApi = () =>
      new Promise<any>((resolve) => {
        const w: any = window as any;
        if (w.Vimeo && w.Vimeo.Player) {
          resolve(w.Vimeo);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://player.vimeo.com/api/player.js";
        script.async = true;
        script.onload = () => resolve((window as any).Vimeo);
        document.head.appendChild(script);
      });

    ensureVimeoApi().then((Vimeo: any) => {
      if (!iframeRef.current) return;
      const player = new Vimeo.Player(iframeRef.current);
      // Ao terminar, voltar ao início e manter pausado (sem reiniciar automaticamente)
      player.setLoop(false).catch(() => {});
      player.on("ended", async () => {
        try {
          await player.setCurrentTime(0);
          await player.pause();
        } catch (e) {
          // Ignora erros
        }
      });
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">


      {/* Hero Section */}
      <section id="inicio" className="relative pt-4 md:pt-20 pb-20 md:pb-32 overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 gradient-subtle -z-10" />
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block px-4 py-2 bg-primary-light rounded-full">
                <span className="text-sm font-medium text-primary">
                  Sistema Interno TV Doutor
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-justify">
                Gestão inteligente de vídeos médicos para salas de espera e marketing da sua clínica
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl text-justify">
                Centralize, publique e mensure vídeos por especialidade — com catálogo aprovado e integrado ao Vimeo. Tenha acesso a mais de 8.000 vídeos validados
              </p>

{SHOW_PAGE_CTA && (
  <div className="flex flex-row gap-3 md:gap-4">
    <div className="flex-1">
      <Link to="/login" className="block w-full">
        <Button size={isMobile ? "sm" : "lg"} className="w-full gradient-primary shadow-primary group">
           <span className="text-xs md:text-sm lg:text-base">Acessar Sistema</span>
           <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
         </Button>
      </Link>
    </div>
    <div className="flex-1">
      <a href="mailto:contato@tvdoutor.com.br?subject=Solicitar%20demo" aria-label="Solicitar demo por e-mail" className="block w-full">
        <Button size={isMobile ? "sm" : "lg"} variant="outline" className="w-full border-border">
           <span className="text-xs md:text-sm lg:text-base">Solicitar Acesso</span>
         </Button>
      </a>
    </div>
  </div>
)}
{/* Ícones com texto abaixo do CTA */}
<div className="w-full flex flex-nowrap items-center gap-3 md:gap-4 text-sm md:text-base lg:text-lg text-muted-foreground">
  <div className="flex items-center gap-2 min-w-0">
    <Users className="w-4 h-4 md:w-5 md:h-5 text-green-600" aria-hidden="true" />
    <span className="whitespace-nowrap">Gestão centralizada</span>
  </div>
  <div className="flex items-center gap-2 min-w-0">
    <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-green-600" aria-hidden="true" />
    <span className="whitespace-nowrap">Catálogo aprovado</span>
  </div>
</div>
              </div>

            {/* Poster 16:9 com click-to-play */}
            <div className="relative animate-slide-up">
              <div className="absolute inset-0 gradient-hero opacity-20 blur-3xl rounded-full" />
              <div className="relative w-full aspect-video rounded-2xl shadow-2xl overflow-hidden">
                <Carousel
                  opts={{ loop: true, align: "start" }}
                  plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
                  className="w-full h-full"
                >
                  <CarouselContent className="h-full">
                    {[thumb01, thumb02, thumb03, thumb04, thumb06, thumb07, thumb08].map((src, i) => (
                      <CarouselItem key={i} className="h-full">
                        <img
                          src={src}
                          alt={`Slide ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading={isMobile ? "lazy" : "eager"}
                          decoding="async"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="bg-white/80 backdrop-blur" />
                  <CarouselNext className="bg-white/80 backdrop-blur" />
                </Carousel>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!isMobile && (
        <>
      {/* Vídeo de demonstração (iframe) */}
      <section className="py-24" id="video-demo">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
            <h2 className="text-3xl font-bold">Vídeo de demonstração</h2>
            <p className="text-muted-foreground">Assista ao funcionamento com um exemplo real</p>
          </div>
          <div className="mx-auto max-w-2xl sm:max-w-3xl">
            <div className="rounded-3xl bg-black border-8 border-gray-800 shadow-2xl p-3">
              <div className="relative aspect-video rounded-xl overflow-hidden ring-1 ring-white/10">
                <iframe
                  ref={iframeRef}
                  src={`https://player.vimeo.com/video/${heroVideoId}?autoplay=0&muted=0&playsinline=1&title=0&byline=0&portrait=0&loop=0&dnt=1&sidedock=0`}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  title="Vídeo de demonstração"
                />
              </div>
            </div>
            <div className="mx-auto mt-4 w-40 h-2 bg-gray-700 rounded-full shadow-md" aria-hidden="true" />
          </div>
        </div>
      </section>
        </>
      )}

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-bold">
              Ferramentas completas para sua equipe
            </h2>
            <p className="text-xl text-muted-foreground">
              Tudo que você precisa para criar e gerenciar playlists personalizadas para seus clientes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="hover-lift border-border bg-background"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary shadow-primary">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="como-funciona" className="py-24 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-bold">
              Fluxo de trabalho otimizado
            </h2>
            <p className="text-xl text-muted-foreground">
              Processo simples e eficiente para criação de playlists personalizadas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflows.map((workflow, index) => (
              <Card key={index} className="relative hover-lift border-border">
                <CardContent className="p-6 space-y-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold mx-auto">
                    {workflow.step}
                  </div>
                  <h3 className="text-xl font-semibold">{workflow.title}</h3>
                  <p className="text-muted-foreground text-sm">{workflow.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">8.000+</div>
              <div className="text-lg font-medium">Vídeos Disponíveis</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">120+</div>
              <div className="text-lg font-medium">Especialidades</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">10+</div>
              <div className="text-lg font-medium">Anos de Conteúdo</div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-bold">Para quem é</h2>
            <p className="text-xl text-muted-foreground">Equipes que usam vídeo como vetor de relacionamento e vendas</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Briefcase, title: "Comercial", bullets: ["Apresentações ágeis", "Playlists sob demanda", "Links compartilháveis"]},
              { icon: Video, title: "Conteúdo/Vídeo", bullets: ["Catálogo centralizado", "Curadoria por especialidade", "Exportação profissional"]},
              { icon: Megaphone, title: "Marketing", bullets: ["Campanhas com vídeo", "Segmentação por nicho", "Material de apoio"]},
              { icon: ClipboardList, title: "Coordenação", bullets: ["Controle de acesso", "Relatórios", "Organização por cliente"]},
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <Card key={i} className="hover-lift border-border">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary shadow-primary">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">{p.title}</h3>
                    <ul className="text-muted-foreground text-sm space-y-2">
                      {p.bullets.map((b, idx) => (
                        <li key={idx}>• {b}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">8.000+</div>
              <div className="text-lg font-medium">Vídeos Disponíveis</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">120+</div>
              <div className="text-lg font-medium">Especialidades</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">10+</div>
              <div className="text-lg font-medium">Anos de Conteúdo</div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase by specialty Section */}
      <section id="vitrine" className="py-24 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-4xl font-bold">Exemplos por especialidade</h2>
            <p className="text-xl text-muted-foreground">Veja como playlists podem se adaptar a diferentes áreas</p>
          </div>

          <ShowcaseGrid />
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Confiança de quem usa vídeo no dia a dia</h2>
            <p className="text-muted-foreground">Alguns dos setores atendidos</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
            {["Hospitais", "Clínicas", "Laboratórios", "Operadoras"].map((label, i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="bg-secondary rounded-2xl p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Pronto para começar?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Entre no sistema e crie playlists inteligentes para seus clientes com poucos cliques.
            </p>
{SHOW_PAGE_CTA && (
  <Link to="/login">
    <Button size="lg" className="gradient-primary shadow-primary">
      Acessar Sistema
      <ArrowRight className="ml-2 w-5 h-5" />
    </Button>
  </Link>
)}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Como acesso o sistema?", a: "Clique em 'Acessar Sistema' e faça login com suas credenciais internas." },
              { q: "Posso criar playlists para diferentes clientes?", a: "Sim, você pode organizar playlists por cliente e especialidade." },
              { q: "Consigo exportar o conteúdo?", a: "Há opções de exportação profissional para entregar ao cliente." },
            ].map((item, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium flex justify-between items-center">
                  {item.q}
                  <span className="text-muted-foreground group-open:hidden">+</span>
                  <span className="text-muted-foreground hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
};

// Showcase Grid component inline for clarity
const ShowcaseGrid = () => {
  const [segment, setSegment] = useState<string>("Cardiologia");
  const segments = ["Cardiologia", "Neurologia", "Ortopedia", "Dermatologia"];
  const thumbs = [thumb01, thumb02, thumb03, thumb04, thumb06, thumb07, thumb08];

  const icons: Record<string, any> = {
    Cardiologia: HeartPulse,
    Neurologia: Brain,
    Ortopedia: Bone,
    Dermatologia: Stethoscope,
  };
  const Icon = icons[segment] || Stethoscope;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {segments.map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={`px-4 py-2 rounded-full border ${segment === s ? "bg-primary text-primary-foreground border-transparent" : "bg-background text-foreground border-border"}`}
            aria-pressed={segment === s}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {thumbs.slice(0, 6).map((src, i) => (
          <Card key={i} className="relative hover-lift border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="relative" style={{ aspectRatio: "16 / 9" }}>
                <img
                  src={src}
                  alt={`${segment} - exemplo ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")}
                />
              </div>
              <div className="p-4 flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary" />
                <div className="text-sm">
                  <div className="font-medium">{segment}</div>
                  <div className="text-muted-foreground">Vídeo de exemplo</div>
                </div>
              </div>
            </CardContent>
            <Link to="/login" className="absolute inset-0" aria-label={`Ver detalhes de ${segment}`} />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;

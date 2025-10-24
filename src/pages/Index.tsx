import { Link } from "react-router-dom";
import { ArrowRight, Search, List, Download, BarChart3, Shield, Zap, Users, PlayCircle } from "lucide-react";
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

  // Slides do Hero usando imagens locais em src/assets
  const heroSlides = [
    { src: thumb01, alt: "Destaque 1" },
    { src: thumb02, alt: "Destaque 2" },
    { src: thumb03, alt: "Destaque 3" },
    { src: thumb04, alt: "Destaque 4" },
    { src: thumb06, alt: "Destaque 6" },
    { src: thumb07, alt: "Destaque 7" },
    { src: thumb08, alt: "Destaque 8" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 gradient-subtle -z-10" />
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block px-4 py-2 bg-primary-light rounded-full">
                <span className="text-sm font-medium text-primary">
                  Sistema Interno TV Doutor
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Crie playlists{" "}
                <span className="text-black">
                  personalizadas
                </span>{" "}
                para seus clientes
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Ferramenta interna para criação e gestão de playlists de vídeos médicos personalizadas. 
                Acesso a mais de 8.000 vídeos educacionais organizados por especialidade.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button size="lg" className="gradient-primary shadow-primary group">
                    Acessar Sistema
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                {/* Removido botão 'Ver Dashboard' da landing page */}
              </div>
              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-success" />
                  <span>Acesso restrito à equipe</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-success" />
                  <span>Gestão centralizada</span>
                </div>
              </div>
            </div>

            {/* Imagem Hero - Carrossel */}
            <div className="relative animate-slide-up">
              <div className="absolute inset-0 gradient-hero opacity-20 blur-3xl rounded-full" />
              <Carousel className="relative w-full" opts={{ loop: true }} plugins={[Autoplay({ delay: 5000 })]}>
                <CarouselContent>
                  {heroSlides.map((slide, idx) => (
                    <CarouselItem key={idx}>
                      <img
                        src={slide.src}
                        alt={slide.alt}
                        className="w-full h-[360px] object-cover rounded-2xl shadow-2xl"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          // Fallback para placeholder caso a imagem não esteja disponível ainda
                          (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white shadow-md" />
                <CarouselNext className="right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white shadow-md" />
              </Carousel>
            </div>
          </div>
        </div>
      </section>

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
      <section className="py-24">
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

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="bg-secondary rounded-2xl p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Pronto para começar?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Entre no sistema e crie playlists inteligentes para seus clientes com poucos cliques.
            </p>
            <Link to="/login">
              <Button size="lg" className="gradient-primary shadow-primary">
                Acessar Sistema
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

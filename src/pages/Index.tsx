import { Link } from "react-router-dom";
import { ArrowRight, Search, List, Download, BarChart3, Shield, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-medical.jpg";

const Index = () => {
  const features = [
    {
      icon: Search,
      title: "Busca Inteligente",
      description: "Encontre vídeos por código, nome, especialidade ou categoria com sistema de busca em 3 níveis.",
    },
    {
      icon: List,
      title: "Listas Personalizadas",
      description: "Organize seus vídeos em listas salvas e compartilhe com sua equipe.",
    },
    {
      icon: Download,
      title: "Exportação Profissional",
      description: "Exporte suas listas em formato XLSX ou DOCX com todos os metadados.",
    },
    {
      icon: BarChart3,
      title: "Analytics Completo",
      description: "Acompanhe métricas de uso, vídeos mais populares e tendências de conteúdo.",
    },
    {
      icon: Shield,
      title: "Segurança Enterprise",
      description: "Controle de acesso baseado em roles (RBAC) e criptografia de dados.",
    },
    {
      icon: Zap,
      title: "Performance Otimizada",
      description: "Sistema de cache inteligente e sincronização automática com Vimeo.",
    },
  ];

  const plans = [
    {
      name: "Client",
      price: "Gratuito",
      description: "Para uso individual",
      features: [
        "Busca ilimitada de vídeos",
        "Criar e gerenciar listas",
        "Exportação de listas próprias",
        "Acesso ao dashboard",
      ],
    },
    {
      name: "Manager",
      price: "R$ 49",
      description: "Para equipes",
      features: [
        "Tudo do plano Client",
        "Criar especialidades e categorias",
        "Visualizar todos os usuários",
        "Atribuir metadados aos vídeos",
        "Suporte prioritário",
      ],
      popular: true,
    },
    {
      name: "Admin",
      price: "R$ 99",
      description: "Para organizações",
      features: [
        "Tudo do plano Manager",
        "Gerenciar todos os usuários",
        "Acesso total ao painel admin",
        "Analytics completo",
        "Suporte dedicado 24/7",
      ],
    },
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
                  Plataforma SaaS para Gestão de Vídeos Médicos
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Organize seu conteúdo{" "}
                <span className="bg-clip-text text-transparent gradient-hero">
                  médico educacional
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Busque, organize e exporte vídeos médicos do Vimeo com inteligência e eficiência. 
                Mais de 7.000 vídeos disponíveis para sua equipe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="gradient-primary shadow-primary group">
                    Começar Grátis
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/search">
                  <Button size="lg" variant="outline">
                    <Search className="mr-2 w-5 h-5" />
                    Explorar Vídeos
                  </Button>
                </Link>
              </div>
              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-success" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-success" />
                  <span>Acesso imediato</span>
                </div>
              </div>
            </div>

            <div className="relative animate-slide-up">
              <div className="absolute inset-0 gradient-hero opacity-20 blur-3xl rounded-full" />
              <img
                src={heroImage}
                alt="Plataforma TV Doutor"
                className="relative rounded-2xl shadow-2xl hover-lift w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-bold">
              Recursos completos para gestão profissional
            </h2>
            <p className="text-xl text-muted-foreground">
              Tudo que você precisa para organizar, buscar e exportar conteúdo médico educacional
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

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-bold">
              Planos para cada necessidade
            </h2>
            <p className="text-xl text-muted-foreground">
              Escolha o plano ideal para você ou sua organização
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative hover-lift ${
                  plan.popular
                    ? "border-primary shadow-primary scale-105"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Gratuito" && (
                      <span className="text-muted-foreground ml-2">/mês</span>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button
                      className={`w-full ${
                        plan.popular ? "gradient-primary shadow-primary" : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Começar Agora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Pronto para transformar sua gestão de conteúdo médico?
            </h2>
            <p className="text-xl text-white/90">
              Junte-se a centenas de profissionais que já confiam no TV Doutor
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Começar Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

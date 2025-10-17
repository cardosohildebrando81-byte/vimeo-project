import { BarChart3, TrendingUp, Users, Video, List, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Analytics = () => {
  const stats = [
    {
      title: "Total de Buscas",
      value: "1,234",
      change: "+12.5%",
      icon: BarChart3,
      trend: "up",
    },
    {
      title: "Vídeos Adicionados",
      value: "456",
      change: "+8.2%",
      icon: Video,
      trend: "up",
    },
    {
      title: "Listas Criadas",
      value: "89",
      change: "+15.1%",
      icon: List,
      trend: "up",
    },
    {
      title: "Exportações",
      value: "234",
      change: "+5.7%",
      icon: Download,
      trend: "up",
    },
  ];

  const topSpecialties = [
    { name: "Pediatria", count: 67, percentage: 25 },
    { name: "Cardiologia", count: 54, percentage: 20 },
    { name: "Neurologia", count: 41, percentage: 15 },
    { name: "Cirurgia", count: 38, percentage: 14 },
    { name: "Ortopedia", count: 35, percentage: 13 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-2">Analytics</h1>
            <p className="text-lg text-muted-foreground">
              Acompanhe métricas e insights do seu uso da plataforma
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover-lift border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary shadow-primary">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="flex items-center text-sm font-medium text-success">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {stat.change}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Specialties */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Especialidades Mais Usadas</CardTitle>
                <CardDescription>
                  Top 5 especialidades por número de seleções
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topSpecialties.map((specialty, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{specialty.name}</span>
                      <span className="text-muted-foreground">{specialty.count}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all duration-500"
                        style={{ width: `${specialty.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Export Stats */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Estatísticas de Exportação</CardTitle>
                <CardDescription>
                  Formatos de exportação mais utilizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">XLSX</p>
                      <p className="text-2xl font-bold">70%</p>
                    </div>
                    <div className="flex items-center justify-center w-20 h-20 rounded-full gradient-primary">
                      <span className="text-2xl font-bold text-white">164</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">DOCX</p>
                      <p className="text-2xl font-bold">30%</p>
                    </div>
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-secondary">
                      <span className="text-2xl font-bold text-foreground">70</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de Sucesso</span>
                      <span className="text-success font-semibold">95.7%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Analytics;

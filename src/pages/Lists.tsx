import { Plus, Trash2, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Lists = () => {
  // Mock data
  const mockLists = [
    {
      id: 1,
      name: "Cardiologia - Procedimentos Avançados",
      description: "Coleção de vídeos sobre técnicas cardíacas avançadas",
      videoCount: 15,
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20",
    },
    {
      id: 2,
      name: "Pediatria - Diagnóstico por Imagem",
      description: "Vídeos educacionais sobre diagnóstico pediátrico",
      videoCount: 23,
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18",
    },
    {
      id: 3,
      name: "Cirurgia Minimamente Invasiva",
      description: "Técnicas e procedimentos cirúrgicos modernos",
      videoCount: 8,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-12",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <h1 className="text-4xl font-bold mb-2">Minhas Listas</h1>
              <p className="text-lg text-muted-foreground">
                Organize e gerencie suas coleções de vídeos
              </p>
            </div>
            <Button className="gradient-primary shadow-primary">
              <Plus className="w-5 h-5 mr-2" />
              Nova Lista
            </Button>
          </div>

          {/* Lists Grid */}
          {mockLists.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                    <FolderOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Nenhuma lista criada</h3>
                  <p className="text-muted-foreground mb-6">
                    Crie sua primeira lista para organizar seus vídeos
                  </p>
                  <Button className="gradient-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Primeira Lista
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockLists.map((list) => (
                <Card key={list.id} className="hover-lift border-border group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                          {list.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {list.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Vídeos</span>
                      <span className="font-semibold">{list.videoCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Atualizado</span>
                      <span className="font-medium">
                        {new Date(list.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Ver Lista
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Lists;

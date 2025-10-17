import { useState } from "react";
import { Search as SearchIcon, Filter, Grid, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Mock data
  const mockVideos = [
    {
      id: 1,
      code: "V0007",
      title: "Procedimento Cardíaco Avançado",
      thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef",
      specialty: "Cardiologia",
      category: "Procedimentos",
      duration: "15:30",
    },
    {
      id: 2,
      code: "VIN5890",
      title: "Diagnóstico por Imagem em Pediatria",
      thumbnail: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c",
      specialty: "Pediatria",
      category: "Diagnóstico",
      duration: "22:15",
    },
    {
      id: 3,
      code: "VT01",
      title: "Técnicas Cirúrgicas Minimamente Invasivas",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118",
      specialty: "Cirurgia",
      category: "Cirurgia",
      duration: "18:45",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="space-y-6 mb-12">
            <div>
              <h1 className="text-4xl font-bold mb-2">Buscar Vídeos</h1>
              <p className="text-lg text-muted-foreground">
                Explore nossa biblioteca com mais de 7.000 vídeos médicos
              </p>
            </div>

            {/* Search Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome ou palavra-chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              <Select defaultValue="all">
                <SelectTrigger className="w-full lg:w-48 h-12">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="cardio">Cardiologia</SelectItem>
                  <SelectItem value="pediatria">Pediatria</SelectItem>
                  <SelectItem value="cirurgia">Cirurgia</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-full lg:w-48 h-12">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                  <SelectItem value="procedimentos">Procedimentos</SelectItem>
                  <SelectItem value="cirurgia">Cirurgia</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-5 h-5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setViewMode("list")}
                >
                  <ListIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Exibindo <span className="font-semibold text-foreground">3</span> de{" "}
                <span className="font-semibold text-foreground">7,000+</span> vídeos
              </p>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Mais filtros
              </Button>
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {mockVideos.map((video) => (
                <div
                  key={video.id}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover-lift"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-xs rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <span className="px-2 py-1 bg-primary-light text-primary text-xs font-medium rounded shrink-0">
                        {video.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-success-light text-success text-xs rounded">
                        {video.specialty}
                      </span>
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                        {video.category}
                      </span>
                    </div>
                    <Button className="w-full gradient-primary">
                      Adicionar ao Carrinho
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;

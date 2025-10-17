import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle p-4">
      <div className="text-center space-y-8 max-w-md animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-9xl font-bold bg-clip-text text-transparent gradient-hero">
            404
          </h1>
          <h2 className="text-3xl font-bold">Página não encontrada</h2>
          <p className="text-lg text-muted-foreground">
            Ops! A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button className="gradient-primary shadow-primary">
              <Home className="w-5 h-5 mr-2" />
              Voltar ao Início
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline">
              <Search className="w-5 h-5 mr-2" />
              Buscar Vídeos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { VimeoConnectionTest } from "@/components/VimeoConnectionTest";

const VimeoTest = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Teste de Conexão com Vimeo
            </h1>
            <p className="text-xl text-muted-foreground">
              Verifique se a integração com a API do Vimeo está funcionando corretamente
            </p>
          </div>
          
          <VimeoConnectionTest />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default VimeoTest;
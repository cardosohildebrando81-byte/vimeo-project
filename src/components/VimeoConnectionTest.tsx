import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Wifi, User } from 'lucide-react';
import { useVimeo, VimeoUser } from '@/lib/vimeo';

interface ConnectionResult {
  success: boolean;
  message: string;
  user?: VimeoUser;
}

export const VimeoConnectionTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const { testConnection } = useVimeo();

  const handleTestConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const connectionResult = await testConnection();
      setResult(connectionResult);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro inesperado ao testar conexão'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Teste de Conexão com Vimeo
          </CardTitle>
          <CardDescription>
            Verifique se a integração com a API do Vimeo está funcionando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTestConnection} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando conexão...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {result?.success && result.user && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Informações do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nome:</label>
                    <p className="text-sm font-semibold">{result.user.name || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo de Conta:</label>
                    <Badge variant="secondary" className="ml-2">
                      {result.user.account || 'Básica'}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Localização:</label>
                    <p className="text-sm">{result.user.location || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Membro desde:</label>
                    <p className="text-sm">{formatDate(result.user.created_time)}</p>
                  </div>
                </div>
                
                {result.user.bio && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bio:</label>
                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{result.user.bio}</p>
                  </div>
                )}
                
                {result.user.link && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Perfil:</label>
                    <a 
                      href={result.user.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
                    >
                      Ver no Vimeo
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Para configurar a conexão:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Acesse <a href="https://developer.vimeo.com/apps" target="_blank" rel="noopener noreferrer" className="underline">developer.vimeo.com/apps</a></li>
              <li>Crie uma nova aplicação ou use uma existente</li>
              <li>Gere um Personal Access Token</li>
              <li>Adicione o token na variável <code className="bg-blue-100 px-1 rounded">VITE_VIMEO_ACCESS_TOKEN</code> no arquivo .env</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
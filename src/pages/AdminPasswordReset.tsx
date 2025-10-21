import { useState } from "react";
import { Video, User, Lock, Key, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useSupabase } from "@/lib/supabase";

const AdminPasswordReset = () => {
  const [email, setEmail] = useState("hildebrando.cardoso@tvdoutor.com.br");
  const [newPassword, setNewPassword] = useState("Suporte@2025!#@");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { client } = useSupabase();

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "A senha deve conter pelo menos um número";
    }
    return null;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !newPassword) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      // Primeiro, vamos tentar buscar o usuário pelo email
      const { data: users, error: searchError } = await client.auth.admin.listUsers();
      
      if (searchError) {
        toast.error("Erro ao buscar usuários: " + searchError.message);
        setIsLoading(false);
        return;
      }

      const targetUser = users.users.find(user => user.email === email);
      
      if (!targetUser) {
        toast.error("Usuário não encontrado com este email");
        setIsLoading(false);
        return;
      }

      // Agora vamos alterar a senha do usuário
      const { error: updateError } = await client.auth.admin.updateUserById(
        targetUser.id,
        { 
          password: newPassword,
          email_confirm: true // Confirma o email automaticamente
        }
      );

      if (updateError) {
        toast.error("Erro ao alterar senha: " + updateError.message);
      } else {
        setIsSuccess(true);
        toast.success("Senha alterada com sucesso!");
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-subtle">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <Card className="border-border shadow-xl">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-green-100 shadow-lg">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl">Senha alterada!</CardTitle>
                <CardDescription>
                  A senha do usuário foi alterada com sucesso
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  A senha do usuário <strong>{email}</strong> foi alterada para a nova senha especificada.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {email}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Nova senha:</strong> {newPassword}
                </p>
              </div>

              <Button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                  setNewPassword("");
                }}
                className="w-full gradient-primary shadow-primary"
              >
                Alterar outra senha
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-subtle">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl gradient-primary shadow-primary">
                <Key className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Alterar Senha de Usuário</CardTitle>
              <CardDescription>
                Ferramenta administrativa para redefinir senhas
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Esta é uma ferramenta administrativa. Use com responsabilidade.
              </AlertDescription>
            </Alert>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="text"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Requisitos da senha */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>A senha deve conter:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                    Pelo menos 8 caracteres
                  </li>
                  <li className={/(?=.*[a-z])/.test(newPassword) ? "text-green-600" : ""}>
                    Uma letra minúscula
                  </li>
                  <li className={/(?=.*[A-Z])/.test(newPassword) ? "text-green-600" : ""}>
                    Uma letra maiúscula
                  </li>
                  <li className={/(?=.*\d)/.test(newPassword) ? "text-green-600" : ""}>
                    Um número
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary shadow-primary"
                disabled={isLoading}
              >
                {isLoading ? "Alterando senha..." : "Alterar senha"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Esta operação requer privilégios administrativos no Supabase
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPasswordReset;
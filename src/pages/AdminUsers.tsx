import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, Mail, Info, Shield, CheckCircle2, Lock, ListOrdered, UploadCloud, UserCog } from "lucide-react";
import { useState } from "react";
import { useSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User as DbUser } from "@/types/database";

const AdminUsers = () => {
  const { signUp, resetPassword, service } = useSupabase();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("comum");

  const [resetEmail, setResetEmail] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({ title: "Campos obrigatórios", description: "Informe e-mail e senha para criar o usuário.", variant: "destructive" });
      return;
    }
    setLoadingCreate(true);
    try {
      const metadata = {
        full_name: newName || undefined,
        role: newRole,
        is_admin: newRole === "admin"
      };
      const { data, error } = await signUp(newEmail, newPassword, metadata);
      if (error) throw error;

      // Sincronização com public.User (client-side)
      const defaultOrgId = import.meta.env.VITE_DEFAULT_ORGANIZATION_ID as string | undefined;
      const authUserId = data?.user?.id;
      if (authUserId) {
        const mappedRole = newRole === "admin" ? "ADMIN" : "CLIENT";
        const payload: Partial<DbUser> = {
          organizationId: (defaultOrgId ?? undefined) as any,
          authProvider: "SUPABASE",
          authProviderId: authUserId,
          email: newEmail,
          displayName: newName || newEmail.split("@")[0],
          role: mappedRole,
          isActive: false,
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
        };
        try {
          const { error: insertError } = await service.insert<DbUser>("User", payload);
          if (insertError) {
            console.warn("[AdminUsers] Falha ao inserir em public.User:", insertError.message);
          }
        } catch (err: any) {
          console.warn("[AdminUsers] Erro na sincronização public.User:", err?.message);
        }
      }

      toast({
        title: "Usuário criado",
        description: data?.user?.email
          ? `Convite enviado para ${data.user.email}. O usuário deve confirmar o e-mail para concluir o cadastro.`
          : "Usuário criado. Um e-mail de confirmação foi enviado.",
      });
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("comum");
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleSendReset = async () => {
    if (!resetEmail) {
      toast({ title: "E-mail obrigatório", description: "Informe o e-mail do usuário para enviar o link de redefinição.", variant: "destructive" });
      return;
    }
    setLoadingReset(true);
    try {
      const { error } = await resetPassword(resetEmail, window.location.origin + "/reset-password");
      if (error) throw error as any;
      toast({ title: "E-mail enviado", description: "Se o e-mail existir, um link de redefinição foi encaminhado." });
      setResetEmail("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err?.message || "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setLoadingReset(false);
    }
  };

  const scrollToReset = () => {
    const el = document.getElementById("reset-email");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement).focus();
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Gerência de Usuários</h1>
              <p className="text-muted-foreground mt-1">Administre contas, permissões e status dos usuários</p>
            </div>
            <Button className="gradient-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reset de senha */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="w-4 h-4" /> Redefinição de Senha</CardTitle>
                <CardDescription>Envie um e‑mail de redefinição de senha para uma conta já existente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail do usuário</Label>
                  <Input id="reset-email" type="email" placeholder="usuario@exemplo.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                </div>
                <div className="flex justify-end">
                  <Button className="gradient-primary" onClick={handleSendReset} disabled={loadingReset}>
                    {loadingReset ? "Enviando..." : "Enviar Link"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Informações / Guia aprimorado */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Guia de gerenciamento de usuários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {/* Disponível agora */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">Convite por e‑mail</Badge>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">Redefinição por e‑mail</Badge>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">Papéis: administrativo e comum</Badge>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" /> Convites requerem confirmação de e‑mail para ativação da conta.</li>
                    <li className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 text-blue-600" /> Se o e‑mail não for localizado, verifique a pasta de spam e confirme o domínio remetente.</li>
                  </ul>
                </div>

                {/* Ações rápidas */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Ações rápidas</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button className="gradient-primary" onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Criar convite de acesso
                    </Button>
                    <Button variant="outline" onClick={scrollToReset}>
                      <Mail className="w-4 h-4 mr-2" /> Enviar link de redefinição
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" disabled>
                          <UploadCloud className="w-4 h-4 mr-2" /> Importar CSV
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Em breve: importação de lista de usuários (CSV)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Fluxo de convite */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Fluxo do convite</h3>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">1</span> Informe e‑mail, nome e papel. Opcionalmente, defina uma senha inicial.</li>
                    <li className="flex items-start gap-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">2</span> O usuário recebe o e‑mail de confirmação e ativa a conta.</li>
                    <li className="flex items-start gap-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">3</span> Após a ativação, utilize a redefinição de senha quando necessário.</li>
                  </ol>
                </div>

                {/* Limitações e aviso */}
                <Alert className="border-amber-200 bg-amber-50">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="text-amber-800">
                    Para listar, editar ou desativar usuários com segurança, recomenda‑se uma área administrativa avançada no backend (Edge Functions) utilizando chave de serviço. Esta seção concentra‑se em ações essenciais e seguras no cliente.
                  </AlertDescription>
                </Alert>

                {/* Ações avançadas (em breve) */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Avançado (em breve)</h3>
                  <div className="flex flex-wrap gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" disabled>
                          <ListOrdered className="w-4 h-4 mr-2" /> Listar usuários
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Requer backend protegido</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" disabled>
                          <UserCog className="w-4 h-4 mr-2" /> Editar/Desativar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Disponível em área administrativa avançada (backend protegido)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>

      {/* Dialog de criação */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados para enviar o convite de criação de conta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail</Label>
              <Input id="new-email" type="email" placeholder="usuario@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome (opcional)</Label>
              <Input id="new-name" type="text" placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pass">Senha inicial</Label>
              <Input id="new-pass" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comum">Comum</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button className="gradient-primary" onClick={handleCreateUser} disabled={loadingCreate}>
              {loadingCreate ? "Criando..." : "Criar e Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
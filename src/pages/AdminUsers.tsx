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
import { Users, Plus, Mail, Info, Shield, CheckCircle2, Lock, ListOrdered, UploadCloud, UserCog, PencilLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User as DbUser, Role } from "@/types/database";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

const AdminUsers = () => {
  const { signUp, resetPassword, service, client } = useSupabase();
  const { toast } = useToast();

  // Estados já existentes
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("comum");

  const [resetEmail, setResetEmail] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  // Estados novos para lista/edição
  const [users, setUsers] = useState<DbUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("CLIENT");
  const [editActive, setEditActive] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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

      // Sincronização opcional com public.User (controlada por flag VITE_SYNC_USER_CLIENT_SIDE)
      const shouldSyncClient = import.meta.env.VITE_SYNC_USER_CLIENT_SIDE === "true";
      if (shouldSyncClient) {
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

  // Carregar usuários
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      let query = client.from("User").select("*").order("createdAt", { ascending: false });
      if (roleFilter !== "all") query = query.eq("role", roleFilter);
      if (activeFilter !== "all") query = query.eq("isActive", activeFilter === "active");
      const { data, error } = await query;
      if (error) throw error;
      setUsers((data as DbUser[]) || []);
    } catch (e: any) {
      console.error("[AdminUsers] Falha ao listar usuários:", e?.message);
      setUsersError(e?.message || "Erro ao listar usuários");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, activeFilter]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      (u.email?.toLowerCase().includes(term) || u.displayName?.toLowerCase().includes(term))
    );
  }, [search, users]);

  const openEdit = (u: DbUser) => {
    setSelectedUser(u);
    setEditName(u.displayName || "");
    setEditRole(u.role);
    setEditActive(!!u.isActive);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedUser) return;
    setSavingEdit(true);
    try {
      const { data, error } = await service.update<DbUser>("User", selectedUser.id, {
        displayName: editName,
        role: editRole,
        isActive: editActive,
        updatedAt: new Date() as any,
      });
      if (error) throw error as any;
      toast({ title: "Usuário atualizado", description: `${selectedUser.email} foi atualizado com sucesso.` });
      setEditOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (u: DbUser, next: boolean) => {
    try {
      const { error } = await service.update<DbUser>("User", u.id, { isActive: next, updatedAt: new Date() as any });
      if (error) throw error as any;
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));
    } catch (e: any) {
      toast({ title: "Erro ao atualizar status", description: e?.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const scrollToList = () => {
    const el = document.getElementById("users-list");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <> 
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
                    <h3 className="text-base font-semibold">Avançado</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={scrollToList}>
                        <ListOrdered className="w-4 h-4 mr-2" /> Listar usuários
                      </Button>
                      <Button variant="outline" onClick={scrollToList}>
                        <UserCog className="w-4 h-4 mr-2" /> Editar/Desativar
                      </Button>
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

        {/* Lista de usuários */}
        <Card id="users-list" className="border-border mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Lista de Usuários</CardTitle>
            <CardDescription>Pesquisar, editar e ativar/desativar usuários cadastrados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="grow space-y-2 min-w-[240px]">
                <Label htmlFor="search">Buscar</Label>
                <Input id="search" placeholder="Nome ou e‑mail" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="w-[200px] space-y-2">
                <Label>Papel</Label>
                <Select value={roleFilter === "all" ? "all" : roleFilter} onValueChange={(v) => setRoleFilter(v === "all" ? "all" : (v as Role))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="CLIENT">Cliente</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px] space-y-2">
                <Label>Status</Label>
                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={loadUsers}>
                Atualizar
              </Button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              {usersLoading ? (
                <div className="p-6 text-muted-foreground">Carregando usuários...</div>
              ) : usersError ? (
                <div className="p-6 text-destructive">Erro: {usersError}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-muted-foreground">Nenhum usuário encontrado</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.displayName}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="uppercase">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!u.isActive} onCheckedChange={(checked) => toggleActive(u, !!checked)} />
                            <span className={u.isActive ? "text-green-600" : "text-muted-foreground"}>{u.isActive ? "Ativo" : "Inativo"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Editar">
                            <PencilLine className="w-4 h-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption>Mostrando {filteredUsers.length} de {users.length} usuários</TableCaption>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Atualize nome, papel e status do usuário selecionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Switch checked={editActive} onCheckedChange={(checked) => setEditActive(!!checked)} />
                <span className={editActive ? "text-green-600" : "text-muted-foreground"}>{editActive ? "Ativo" : "Inativo"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button className="gradient-primary" onClick={saveEdit} disabled={savingEdit || !selectedUser}>
              {savingEdit ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
);
};

export default AdminUsers;
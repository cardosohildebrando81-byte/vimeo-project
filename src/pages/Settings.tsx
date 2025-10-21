import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const Settings: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const { client } = useSupabase();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setFullName((user.user_metadata as any)?.full_name || "");
      setAvatarUrl((user.user_metadata as any)?.avatar_url || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data, error } = await client.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        },
      });
      if (error) throw error;
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
      await refreshSession();
    } catch (err) {
      toast({ title: "Erro ao salvar perfil", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Use no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas diferentes", description: "As senhas precisam coincidir.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha atualizada", description: "Sua senha foi alterada com sucesso." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({ title: "Erro ao alterar senha", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  // Nome do bucket configurável (padrão 'avatars')
  const AVATAR_BUCKET = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars";

  const handleAvatarUpload = async (file: File) => {
    if (!user) {
      toast({ title: "Não autenticado", description: "Você precisa estar logado para enviar uma foto.", variant: "destructive" });
      return;
    }
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem válida (jpg, png, etc).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo permitido: 5MB.", variant: "destructive" });
      return;
    }
  
    setAvatarUploading(true);
    // DEBUG: Log de ambiente e arquivo para diagnóstico de Storage
    console.info(`[Settings] Avatar upload iniciado`, { bucket: AVATAR_BUCKET, userId: user.id, fileName: file.name, fileType: file.type, fileSize: file.size });
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      // Caminho relativo ao bucket (NÃO incluir o nome do bucket aqui)
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
  
      const { error: uploadError } = await client.storage.from(AVATAR_BUCKET).upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError as Error;
      console.info(`[Settings] Upload concluído`, { bucket: AVATAR_BUCKET, path: filePath });
  
      const { data: publicData } = client.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;
      if (!publicUrl) {
        throw new Error("Não foi possível gerar a URL pública do avatar. Verifique se o bucket é público.");
      }
      console.info(`[Settings] URL pública gerada`, { publicUrl });
      setAvatarUrl(publicUrl);
  
      const { error: updateError } = await client.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError as Error;
  
      toast({ title: "Foto enviada", description: "Seu avatar foi atualizado com sucesso." });
      await refreshSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // DEBUG: Log detalhado do erro do Storage
      console.error(`[Settings] Erro no upload do avatar`, { bucket: AVATAR_BUCKET, error: err });
      // Instrução clara quando bucket não existe
      const suggestion = message.toLowerCase().includes("bucket")
        ? `Certifique-se de criar o bucket '${AVATAR_BUCKET}' no Supabase Storage e marcá-lo como público.`
        : "";
      toast({
        title: "Erro no upload da foto",
        description: `${message}${suggestion ? " — " + suggestion : ""}`,
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };
  
  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleAvatarUpload(file);
      // limpa o input para permitir reenvio do mesmo arquivo caso necessário
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="max-w-3xl mx-auto space-y-8 px-4">
            <header>
              <h1 className="text-2xl font-bold">Configurações</h1>
              <p className="text-muted-foreground">Altere seu nome, foto e senha. Seu email não pode ser alterado.</p>
            </header>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Perfil</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email (não editável)</label>
                  <Input value={email} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">URL da foto (avatar)</label>
                  <Input placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                </div>
                <div className="md:col-span-2 flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">Sem foto</div>
                  )}
                  <div className="flex-1">
                    <label className="text-sm font-medium">Enviar foto</label>
                    <Input type="file" accept="image/*" onChange={onAvatarFileChange} disabled={avatarUploading} />
                    {avatarUploading && <p className="text-xs text-muted-foreground mt-1">Enviando foto...</p>}
                    <p className="text-xs text-muted-foreground mt-1">Opcionalmente, você pode colar um URL acima.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Senha</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nova senha</label>
                  <Input type="password" placeholder="******" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirmar nova senha</label>
                  <Input type="password" placeholder="******" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Settings;
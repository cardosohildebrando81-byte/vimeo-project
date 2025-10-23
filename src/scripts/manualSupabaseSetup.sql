-- ========================================
-- CONFIGURAÇÃO MANUAL DO SUPABASE
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ========================================

-- 1. CRIAR TABELA USER
CREATE TABLE IF NOT EXISTS public."User" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "organizationId" TEXT NOT NULL DEFAULT '1',
    "authProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
    "authProviderId" UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    password TEXT,
    "displayName" TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'MANAGER', 'ADMIN')),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_auth_provider_id ON public."User"("authProviderId");
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON public."User"("organizationId");

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICA PERMISSIVA PARA DESENVOLVIMENTO
-- ATENÇÃO: Esta política é permissiva para facilitar o desenvolvimento
-- Em produção, considere políticas mais restritivas
DROP POLICY IF EXISTS "Enable all operations" ON public."User";
CREATE POLICY "Enable all operations" ON public."User"
    FOR ALL USING (true);

-- 5. CRIAR FUNÇÃO PARA ATUALIZAR updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. CRIAR TRIGGER PARA updatedAt
DROP TRIGGER IF EXISTS update_user_updated_at ON public."User";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON public."User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. CRIAR FUNÇÃO PARA SINCRONIZAR NOVOS USUÁRIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."User" (
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive"
    ) VALUES (
        COALESCE(NEW.raw_user_meta_data->>'organization_id', '1'),
        'SUPABASE',
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT'),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CRIAR TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. FAZER BACKFILL DOS USUÁRIOS EXISTENTES
-- Sincronizar usuários que já existem no auth.users mas não estão na tabela User
INSERT INTO public."User" (
    "organizationId", 
    "authProvider", 
    "authProviderId", 
    email, 
    "displayName", 
    role, 
    "isActive"
)
SELECT 
    COALESCE(u.raw_user_meta_data->>'organization_id', '1') as "organizationId",
    'SUPABASE' as "authProvider",
    u.id as "authProviderId",
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as "displayName",
    COALESCE(u.raw_user_meta_data->>'role', 'CLIENT') as role,
    true as "isActive"
FROM auth.users u
WHERE u.id NOT IN (SELECT "authProviderId" FROM public."User")
  AND u.email IS NOT NULL;

-- 10. VERIFICAR RESULTADOS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as clients,
    COUNT(CASE WHEN role = 'MANAGER' THEN 1 END) as managers,
    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
FROM public."User";

-- 11. LISTAR USUÁRIOS CRIADOS
SELECT 
    email,
    "displayName",
    role,
    "organizationId",
    "createdAt"
FROM public."User"
ORDER BY "createdAt" DESC;

-- ========================================
-- CONFIGURAÇÃO CONCLUÍDA!
-- 
-- Após executar este SQL:
-- 1. Verifique se os usuários foram criados
-- 2. Teste o registro de novos usuários
-- 3. Faça deploy na Vercel
-- ========================================
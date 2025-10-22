-- Script para criar a tabela User e configurar RLS no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Criar a tabela User se não existir
CREATE TABLE IF NOT EXISTS public."User" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
    "authProviderId" UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    password TEXT,
    "displayName" TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CLIENT', 'MANAGER', 'ADMIN')),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_auth_provider_id ON public."User"("authProviderId");
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON public."User"("organizationId");

-- 3. Habilitar RLS na tabela
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS

-- Política para permitir que usuários vejam apenas seus próprios dados
CREATE POLICY "Users can view own profile" ON public."User"
    FOR SELECT USING (auth.uid() = "authProviderId");

-- Política para permitir que usuários atualizem apenas seus próprios dados
CREATE POLICY "Users can update own profile" ON public."User"
    FOR UPDATE USING (auth.uid() = "authProviderId");

-- Política para permitir inserção durante o registro (service role)
CREATE POLICY "Enable insert for service role" ON public."User"
    FOR INSERT WITH CHECK (true);

-- Política para permitir que admins vejam todos os usuários
CREATE POLICY "Admins can view all users" ON public."User"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public."User" u 
            WHERE u."authProviderId" = auth.uid() 
            AND u.role = 'ADMIN'
        )
    );

-- Política para permitir que managers vejam usuários da mesma organização
CREATE POLICY "Managers can view org users" ON public."User"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public."User" u 
            WHERE u."authProviderId" = auth.uid() 
            AND u.role IN ('MANAGER', 'ADMIN')
            AND u."organizationId" = "User"."organizationId"
        )
    );

-- 5. Criar função para atualizar updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Criar trigger para atualizar updatedAt
DROP TRIGGER IF EXISTS update_user_updated_at ON public."User";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON public."User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Criar função para sincronizar usuários automaticamente
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

-- 8. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Comentários para documentação
COMMENT ON TABLE public."User" IS 'Tabela de usuários sincronizada com auth.users';
COMMENT ON COLUMN public."User"."authProviderId" IS 'ID do usuário no auth.users do Supabase';
COMMENT ON COLUMN public."User".role IS 'Papel do usuário: CLIENT, MANAGER ou ADMIN';
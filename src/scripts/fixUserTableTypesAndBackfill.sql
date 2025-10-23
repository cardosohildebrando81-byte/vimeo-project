-- ========================================
-- FIX: Alinhar tipos da tabela public."User" e executar backfill com segurança
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ========================================

-- 0) Criar o tipo ENUM "Role" se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'Role'
  ) THEN
    CREATE TYPE "Role" AS ENUM ('CLIENT', 'MANAGER', 'ADMIN');
  END IF;
END
$$;

-- 1) Garantir que a coluna authProviderId seja UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'authProviderId'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public."User"
      ALTER COLUMN "authProviderId" TYPE uuid
      USING NULLIF("authProviderId", '')::uuid;
  END IF;
END
$$;

-- 2) Garantir que a coluna role seja do tipo ENUM "Role" e normalizar valores inválidos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    -- Converter TEXT -> ENUM Role, mapeando valores inválidos para 'CLIENT'
    ALTER TABLE public."User"
      ALTER COLUMN role TYPE "Role"
      USING CASE
        WHEN role IN ('CLIENT','MANAGER','ADMIN') THEN role::"Role"
        ELSE 'CLIENT'::"Role"
      END;
  END IF;
END
$$;

-- 3) Função updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_updated_at ON public."User";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON public."User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4) Função para sincronizar novos usuários (com cast de role)
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
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT')::"Role",
        true
    )
    ON CONFLICT ("authProviderId") DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Trigger para sincronização automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Índices e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS user_auth_provider_id_unique ON public."User"("authProviderId");
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON public."User"("organizationId");

-- 7) RLS permissivo durante desenvolvimento
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations" ON public."User";
CREATE POLICY "Enable all operations" ON public."User"
    FOR ALL USING (true);

-- 8) Backfill seguro com ON CONFLICT e cast de role
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
    COALESCE(u.raw_user_meta_data->>'role', 'CLIENT')::"Role" as role,
    true as "isActive"
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT ("authProviderId") DO NOTHING;

-- 9) Verificações
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as clients,
    COUNT(CASE WHEN role = 'MANAGER' THEN 1 END) as managers,
    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
FROM public."User";

SELECT 
    email,
    "displayName",
    role,
    "organizationId",
    "createdAt"
FROM public."User"
ORDER BY "createdAt" DESC
LIMIT 20;
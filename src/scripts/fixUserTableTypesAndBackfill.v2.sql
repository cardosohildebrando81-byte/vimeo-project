-- ========================================
-- FIX v2: Alinhar tipos da tabela public."User" com segurança + backfill
-- Corrige:
-- 1) FK organizationId (usa organização real ou fallback informado)
-- 2) Coluna password (inclui condicionalmente se existir e for NOT NULL)
-- 3) Migração segura de authProviderId TEXT -> UUID (mapeando via email e cast condicional)
-- 4) RLS seguro (políticas por usuário, sem FOR ALL USING (true))
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

-- 1) Normalização segura de authProviderId (mantendo TEXT)
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
    -- Mapear possíveis valores inválidos usando email => auth.users.id, mantendo como texto
    UPDATE public."User" u
    SET "authProviderId" = au.id::text
    FROM auth.users au
    WHERE (
      u."authProviderId" IS NULL
      OR u."authProviderId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
      AND u.email IS NOT NULL
      AND au.email = u.email;

    -- Não converter o tipo para UUID nesta versão. Mantemos TEXT por compatibilidade.
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

-- 4) Função para sincronizar novos usuários (com organização real, password condicional e geração segura de id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $FN$
DECLARE
  has_password boolean;
  default_org_id text;
  id_is_uuid boolean;
BEGIN
  -- Detectar se coluna password existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='User' AND column_name='password'
  ) INTO has_password;

  -- Obter organizationId padrão da tabela Organization (se existir)
  default_org_id := NULL;
  BEGIN
    SELECT id INTO default_org_id FROM public."Organization" LIMIT 1;
  EXCEPTION WHEN others THEN
    default_org_id := NULL;
  END;
  IF default_org_id IS NULL THEN
    default_org_id := 'cmgo81nz0000akcj0lofmhh3';
  END IF;

  -- Detectar tipo da coluna id
  SELECT (data_type = 'uuid')
    INTO id_is_uuid
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id';

  IF id_is_uuid THEN
    IF has_password THEN
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive",
        password
      ) VALUES (
        gen_random_uuid(),
        COALESCE(NEW.raw_user_meta_data->>'organization_id', default_org_id),
        'SUPABASE',
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT')::"Role",
        true,
        COALESCE(NEW.raw_user_meta_data->>'password', 'not_used')
      )
      ON CONFLICT ("authProviderId") DO NOTHING;
    ELSE
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive"
      ) VALUES (
        gen_random_uuid(),
        COALESCE(NEW.raw_user_meta_data->>'organization_id', default_org_id),
        'SUPABASE',
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT')::"Role",
        true
      )
      ON CONFLICT ("authProviderId") DO NOTHING;
    END IF;
  ELSE
    IF has_password THEN
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive",
        password
      ) VALUES (
        gen_random_uuid()::text,
        COALESCE(NEW.raw_user_meta_data->>'organization_id', default_org_id),
        'SUPABASE',
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT')::"Role",
        true,
        COALESCE(NEW.raw_user_meta_data->>'password', 'not_used')
      )
      ON CONFLICT ("authProviderId") DO NOTHING;
    ELSE
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive"
      ) VALUES (
        gen_random_uuid()::text,
        COALESCE(NEW.raw_user_meta_data->>'organization_id', default_org_id),
        'SUPABASE',
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT')::"Role",
        true
      )
      ON CONFLICT ("authProviderId") DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$FN$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Trigger para sincronização automática
-- Observação: modificar triggers em auth.users normalmente exige ser o owner da tabela.
-- Para evitar o erro 42501 (must be owner of table users), este script não altera o trigger.
-- Se o trigger já existir e apontar para public.handle_new_user(), nada precisa ser feito.
-- Caso o trigger não exista, crie-o manualmente numa sessão com permissões de owner:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Índices e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS user_auth_provider_id_unique ON public."User"("authProviderId");
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON public."User"("organizationId");

-- 7) RLS seguro
DROP POLICY IF EXISTS "Enable all for authenticated" ON public."User";
DROP POLICY IF EXISTS "Allow select own" ON public."User";
CREATE POLICY "Allow select own" ON public."User"
  FOR SELECT USING ("authProviderId" = auth.uid()::text);

DROP POLICY IF EXISTS "Allow update own" ON public."User";
CREATE POLICY "Allow update own" ON public."User"
  FOR UPDATE USING ("authProviderId" = auth.uid()::text) WITH CHECK ("authProviderId" = auth.uid()::text);

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 8) Backfill seguro com ON CONFLICT, password condicional e geração explícita de id
DO $$
DECLARE
  has_password boolean;
  default_org_id text;
  id_is_uuid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='User' AND column_name='password'
  ) INTO has_password;

  -- Obter organizationId padrão
  default_org_id := NULL;
  BEGIN
    SELECT id INTO default_org_id FROM public."Organization" LIMIT 1;
  EXCEPTION WHEN others THEN
    default_org_id := NULL;
  END;
  IF default_org_id IS NULL THEN
    default_org_id := 'cmgo81nz0000akcj0lofmhh3';
  END IF;

  -- Detectar tipo da coluna id
  SELECT (data_type = 'uuid')
    INTO id_is_uuid
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id';

  -- Desabilitar RLS durante o backfill para evitar bloqueios
  EXECUTE 'ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY';

  IF id_is_uuid THEN
    IF has_password THEN
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive",
        password
      )
      SELECT 
        gen_random_uuid() as id,
        COALESCE(u.raw_user_meta_data->>'organization_id', default_org_id) as "organizationId",
        'SUPABASE' as "authProvider",
        u.id::text as "authProviderId",
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as "displayName",
        COALESCE(u.raw_user_meta_data->>'role', 'CLIENT')::"Role" as role,
        true as "isActive",
        COALESCE(u.raw_user_meta_data->>'password', 'not_used') as password
      FROM auth.users u
      WHERE u.email IS NOT NULL
      ON CONFLICT ("authProviderId") DO NOTHING;
    ELSE
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive"
      )
      SELECT 
        gen_random_uuid() as id,
        COALESCE(u.raw_user_meta_data->>'organization_id', default_org_id) as "organizationId",
        'SUPABASE' as "authProvider",
        u.id::text as "authProviderId",
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as "displayName",
        COALESCE(u.raw_user_meta_data->>'role', 'CLIENT')::"Role" as role,
        true as "isActive"
      FROM auth.users u
      WHERE u.email IS NOT NULL
      ON CONFLICT ("authProviderId") DO NOTHING;
    END IF;
  ELSE
    IF has_password THEN
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive",
        password
      )
      SELECT 
        gen_random_uuid()::text as id,
        COALESCE(u.raw_user_meta_data->>'organization_id', default_org_id) as "organizationId",
        'SUPABASE' as "authProvider",
        u.id::text as "authProviderId",
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as "displayName",
        COALESCE(u.raw_user_meta_data->>'role', 'CLIENT')::"Role" as role,
        true as "isActive",
        COALESCE(u.raw_user_meta_data->>'password', 'not_used') as password
      FROM auth.users u
      WHERE u.email IS NOT NULL
      ON CONFLICT ("authProviderId") DO NOTHING;
    ELSE
      INSERT INTO public."User" (
        id,
        "organizationId",
        "authProvider",
        "authProviderId",
        email,
        "displayName",
        role,
        "isActive"
      )
      SELECT 
        gen_random_uuid()::text as id,
        COALESCE(u.raw_user_meta_data->>'organization_id', default_org_id) as "organizationId",
        'SUPABASE' as "authProvider",
        u.id::text as "authProviderId",
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as "displayName",
        COALESCE(u.raw_user_meta_data->>'role', 'CLIENT')::"Role" as role,
        true as "isActive"
      FROM auth.users u
      WHERE u.email IS NOT NULL
      ON CONFLICT ("authProviderId") DO NOTHING;
    END IF;
  END IF;

  -- Reabilitar RLS após o backfill
  EXECUTE 'ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY';
END $$;

-- 9) Tentar restaurar NOT NULL em authProviderId se possível
DO $$
DECLARE nulls int;
BEGIN
  SELECT COUNT(*) INTO nulls FROM public."User" WHERE "authProviderId" IS NULL;
  IF nulls = 0 THEN
    EXECUTE 'ALTER TABLE public."User" ALTER COLUMN "authProviderId" SET NOT NULL';
  END IF;
END $$;

-- 10) Verificações
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
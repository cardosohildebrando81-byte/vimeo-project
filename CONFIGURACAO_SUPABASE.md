# 🔧 Configuração da Tabela User no Supabase

## Problema Identificado
O sistema não está salvando usuários novos no banco de dados porque a tabela `User` não existe ou não está configurada corretamente no Supabase.

## ✅ Solução: Configurar no Supabase Dashboard

### Passo 1: Acessar o Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `pugosmzjnzibqbyetbvu`

### Passo 2: Criar a Tabela User
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New Query"**
3. Cole o seguinte código SQL:

```sql
-- 1. Criar a tabela User
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

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_auth_provider_id ON public."User"("authProviderId");
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON public."User"("organizationId");

-- 3. Habilitar RLS na tabela
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS permissivas para desenvolvimento
CREATE POLICY "Enable all operations for authenticated users" ON public."User"
    FOR ALL USING (true);

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
```

4. Clique em **"Run"** para executar o script

### Passo 3: Fazer Backfill dos Usuários Existentes
Após criar a tabela, execute este SQL para sincronizar os usuários existentes:

```sql
-- Inserir usuários existentes do auth.users na tabela User
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
WHERE u.id NOT IN (SELECT "authProviderId" FROM public."User");
```

### Passo 4: Verificar se Funcionou
Execute esta query para verificar os usuários:

```sql
SELECT 
    u.id,
    u.email,
    u."displayName",
    u.role,
    u."organizationId",
    u."createdAt"
FROM public."User" u
ORDER BY u."createdAt" DESC;
```

## 🎯 Resultado Esperado
Após executar esses passos, você deve ver:
- ✅ Tabela `User` criada com sucesso
- ✅ Usuários existentes sincronizados (hildebrando.cardoso, suporte@tvdoutor.com.br, etc.)
- ✅ Novos registros funcionando automaticamente
- ✅ Sistema reconhecendo usuários existentes

## 🔄 Próximos Passos
Depois de configurar no Supabase:
1. Reinicie o servidor de desenvolvimento (`npm run dev`)
2. Teste o registro de novos usuários
3. Verifique se os usuários aparecem no dashboard

## 📞 Suporte
Se encontrar algum erro durante a execução, copie a mensagem de erro e me informe para ajudar na resolução.
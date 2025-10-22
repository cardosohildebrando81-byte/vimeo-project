import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas');
  process.exit(1);
}

// Cliente com service role para bypass do RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Configurando banco de dados no Supabase...\n');

  try {
    // 1. Criar a tabela User
    console.log('1️⃣ Criando tabela User...');
    const createTableSQL = `
      -- Criar a tabela User
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
    `;

    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL });
    if (createError && !createError.message.includes('already exists')) {
      console.log('⚠️ Tentando método alternativo para criar tabela...');
      // Método alternativo usando insert direto
      const { error: altError } = await supabase
        .from('User')
        .select('id')
        .limit(1);
      
      if (altError && altError.message.includes('does not exist')) {
        console.log('📋 Execute este SQL manualmente no Supabase Dashboard:');
        console.log('---');
        console.log(createTableSQL);
        console.log('---\n');
      }
    } else {
      console.log('✅ Tabela User criada/verificada');
    }

    // 2. Criar índices
    console.log('2️⃣ Criando índices...');
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_user_auth_provider_id ON public."User"("authProviderId");
      CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
      CREATE INDEX IF NOT EXISTS idx_user_organization_id ON public."User"("organizationId");
    `;

    await supabase.rpc('exec', { sql: indexesSQL });
    console.log('✅ Índices criados');

    // 3. Configurar RLS
    console.log('3️⃣ Configurando RLS...');
    const rlsSQL = `
      ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
      
      -- Política permissiva para desenvolvimento
      DROP POLICY IF EXISTS "Enable all operations" ON public."User";
      CREATE POLICY "Enable all operations" ON public."User"
          FOR ALL USING (true);
    `;

    await supabase.rpc('exec', { sql: rlsSQL });
    console.log('✅ RLS configurado');

    // 4. Criar função de trigger
    console.log('4️⃣ Criando função de sincronização...');
    const triggerSQL = `
      -- Função para atualizar updatedAt
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Trigger para updatedAt
      DROP TRIGGER IF EXISTS update_user_updated_at ON public."User";
      CREATE TRIGGER update_user_updated_at
          BEFORE UPDATE ON public."User"
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      -- Função para sincronizar novos usuários
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

      -- Trigger para sincronização automática
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    await supabase.rpc('exec', { sql: triggerSQL });
    console.log('✅ Funções e triggers criados');

    // 5. Fazer backfill dos usuários existentes
    console.log('5️⃣ Fazendo backfill dos usuários existentes...');
    
    // Buscar usuários do Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Erro ao buscar usuários do Auth:', authError.message);
      return;
    }

    console.log(`📋 Encontrados ${authUsers.users.length} usuários no Auth`);

    // Verificar usuários já existentes
    const { data: existingUsers, error: existingError } = await supabase
      .from('User')
      .select('authProviderId');

    if (existingError) {
      console.log('⚠️ Tabela User ainda não acessível, pulando backfill');
    } else {
      const existingAuthIds = new Set(existingUsers?.map(u => u.authProviderId) || []);
      const usersToCreate = authUsers.users.filter(user => !existingAuthIds.has(user.id));

      if (usersToCreate.length > 0) {
        console.log(`➕ Criando ${usersToCreate.length} usuários...`);
        
        const userRecords = usersToCreate.map(user => {
          const metadata = user.user_metadata || user.raw_user_meta_data || {};
          
          return {
            organizationId: metadata.organization_id || '1',
            authProvider: 'SUPABASE',
            authProviderId: user.id,
            email: user.email!,
            displayName: metadata.full_name || metadata.display_name || user.email!.split('@')[0],
            role: metadata.role || 'CLIENT',
            isActive: true
          };
        });

        const { data: insertedUsers, error: insertError } = await supabase
          .from('User')
          .insert(userRecords)
          .select();

        if (insertError) {
          console.error('❌ Erro ao inserir usuários:', insertError.message);
        } else {
          console.log(`✅ ${insertedUsers?.length || 0} usuários criados com sucesso!`);
          insertedUsers?.forEach(user => {
            console.log(`   📧 ${user.email} - ${user.role}`);
          });
        }
      } else {
        console.log('✅ Todos os usuários já estão sincronizados!');
      }
    }

    console.log('\n🎉 Configuração do banco concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Teste o registro de novos usuários');
    console.log('2. Verifique se os usuários aparecem no dashboard');
    console.log('3. Faça deploy na Vercel');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
    
    console.log('\n🔧 Configuração Manual Necessária:');
    console.log('Execute este SQL no Supabase Dashboard (SQL Editor):');
    console.log('---');
    console.log(`
-- 1. Criar tabela User
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

-- 2. Habilitar RLS
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 3. Criar política permissiva
CREATE POLICY "Enable all operations" ON public."User" FOR ALL USING (true);

-- 4. Fazer backfill
INSERT INTO public."User" (
    "organizationId", "authProvider", "authProviderId", email, "displayName", role, "isActive"
)
SELECT 
    '1', 'SUPABASE', u.id, u.email, split_part(u.email, '@', 1), 'CLIENT', true
FROM auth.users u
WHERE u.id NOT IN (SELECT "authProviderId" FROM public."User");
    `);
    console.log('---');
  }
}

setupDatabase();
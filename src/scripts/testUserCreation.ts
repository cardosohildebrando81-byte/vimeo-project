import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔧 Configuração:');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Configurada' : 'Não encontrada');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas');
  process.exit(1);
}

// Cliente com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testUserCreation() {
  console.log('\n🧪 Testando criação de usuário...');
  
  try {
    // 1. Testar se conseguimos acessar a tabela User
    console.log('1️⃣ Testando acesso à tabela User...');
    const { data: users, error: selectError } = await supabase
      .from('User')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Erro ao acessar tabela User:', selectError.message);
      
      // Tentar criar a tabela se não existir
      console.log('2️⃣ Tentando criar a tabela User...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public."User" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            "organizationId" TEXT NOT NULL DEFAULT '1',
            "authProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
            "authProviderId" UUID NOT NULL UNIQUE,
            email TEXT NOT NULL,
            "displayName" TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'MANAGER', 'ADMIN')),
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          
          ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY IF NOT EXISTS "Enable all for service role" ON public."User"
            FOR ALL USING (true);
        `
      });
      
      if (createError) {
        console.error('❌ Erro ao criar tabela:', createError.message);
        return;
      }
      
      console.log('✅ Tabela criada com sucesso!');
    } else {
      console.log('✅ Tabela User acessível:', users?.length || 0, 'registros encontrados');
    }

    // 2. Testar inserção de um usuário de teste
    console.log('3️⃣ Testando inserção de usuário...');
    const testUser = {
      organizationId: '1',
      authProvider: 'SUPABASE',
      authProviderId: '00000000-0000-0000-0000-000000000001', // UUID de teste
      email: 'teste@exemplo.com',
      displayName: 'Usuário Teste',
      role: 'CLIENT',
      isActive: true
    };

    const { data: insertedUser, error: insertError } = await supabase
      .from('User')
      .insert(testUser)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir usuário:', insertError.message);
    } else {
      console.log('✅ Usuário inserido com sucesso:', insertedUser);
      
      // Limpar o usuário de teste
      await supabase
        .from('User')
        .delete()
        .eq('id', insertedUser.id);
      console.log('🧹 Usuário de teste removido');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testUserCreation();
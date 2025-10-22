import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Cliente com service role para bypass do RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  raw_user_meta_data?: any;
  created_at: string;
}

interface UserRecord {
  organizationId: string;
  authProvider: string;
  authProviderId: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
}

async function backfillExistingUsers() {
  console.log('🔄 Iniciando backfill de usuários existentes...');
  
  try {
    // 1. Buscar todos os usuários do Auth
    console.log('📋 Buscando usuários no Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erro ao buscar usuários do Auth: ${authError.message}`);
    }

    console.log(`✅ Encontrados ${authUsers.users.length} usuários no Auth`);

    // 2. Buscar usuários já existentes na tabela User
    console.log('🔍 Verificando usuários já existentes na tabela User...');
    const { data: existingUsers, error: existingError } = await supabase
      .from('User')
      .select('authProviderId');

    if (existingError) {
      throw new Error(`Erro ao buscar usuários existentes: ${existingError.message}`);
    }

    const existingAuthIds = new Set(existingUsers?.map(u => u.authProviderId) || []);
    console.log(`📊 ${existingAuthIds.size} usuários já existem na tabela User`);

    // 3. Filtrar usuários que precisam ser criados
    const usersToCreate = authUsers.users.filter(user => !existingAuthIds.has(user.id));
    console.log(`➕ ${usersToCreate.length} usuários precisam ser criados`);

    if (usersToCreate.length === 0) {
      console.log('✅ Todos os usuários já estão sincronizados!');
      return;
    }

    // 4. Criar registros para usuários faltantes
    const userRecords: UserRecord[] = usersToCreate.map(user => {
      const metadata = user.user_metadata || user.raw_user_meta_data || {};
      
      return {
        organizationId: metadata.organization_id || '1', // Default organization
        authProvider: 'SUPABASE',
        authProviderId: user.id,
        email: user.email!,
        displayName: metadata.full_name || metadata.display_name || user.email!.split('@')[0],
        role: metadata.role || 'CLIENT', // Default role
        isActive: true
      };
    });

    console.log('💾 Inserindo usuários na tabela User...');
    const { data: insertedUsers, error: insertError } = await supabase
      .from('User')
      .insert(userRecords)
      .select();

    if (insertError) {
      throw new Error(`Erro ao inserir usuários: ${insertError.message}`);
    }

    console.log(`✅ ${insertedUsers?.length || 0} usuários criados com sucesso!`);
    
    // 5. Mostrar resumo
    console.log('\n📋 Resumo do backfill:');
    insertedUsers?.forEach(user => {
      console.log(`   📧 ${user.email} - ${user.role} (Org: ${user.organizationId})`);
    });

  } catch (error) {
    console.error('❌ Erro durante o backfill:', error);
    process.exit(1);
  }
}

// Executar o backfill
backfillExistingUsers();
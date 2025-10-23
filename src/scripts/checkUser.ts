import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (usando service role para acesso administrativo)
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3NTI5MSwiZXhwIjoyMDc1NzUxMjkxfQ.fyaxJO15UPERi9lMnmFdl6l3n9eLrnqkT8kLsgOfc04';

// Email do usuário para verificar
const userEmail = 'hildebrando.cardoso@tvdoutor.com.br';

async function checkUser() {
  console.log('🔍 Verificando usuário no Supabase Auth...');
  console.log('📧 Email:', userEmail);
  console.log('');

  try {
    // Criar cliente com service role para acesso administrativo
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar se o usuário existe no Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
      return;
    }

    // Procurar o usuário específico
    const user = users.users.find(u => u.email === userEmail);
    
    if (user) {
      console.log('✅ Usuário encontrado no Supabase Auth!');
      console.log('📋 Detalhes do usuário:');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Email confirmado:', user.email_confirmed_at ? '✅ Sim' : '❌ Não');
      console.log('  - Criado em:', new Date(user.created_at).toLocaleString('pt-BR'));
      console.log('  - Último login:', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca');
      console.log('  - Provedor:', user.app_metadata?.provider || 'email');
      console.log('  - Metadados:', JSON.stringify(user.user_metadata, null, 2));
      
      // Verificar se há problemas com a conta
      if (!user.email_confirmed_at) {
        console.log('⚠️  ATENÇÃO: Email não confirmado! Isso pode impedir o login.');
      }
      
      if (user.banned_until) {
        console.log('🚫 ATENÇÃO: Usuário banido até:', new Date(user.banned_until).toLocaleString('pt-BR'));
      }
      
    } else {
      console.log('❌ Usuário NÃO encontrado no Supabase Auth!');
      console.log('💡 Possíveis soluções:');
      console.log('  1. Verificar se o email está correto');
      console.log('  2. Criar o usuário usando o script createUser.ts');
      console.log('  3. Verificar se o usuário foi deletado acidentalmente');
    }

    // Verificar também na tabela public.users se existir
    console.log('');
    console.log('🔍 Verificando na tabela public.users...');
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail);
    
    if (dbError) {
      console.log('⚠️  Erro ao verificar tabela public.users:', dbError.message);
    } else if (dbUsers && dbUsers.length > 0) {
      console.log('✅ Usuário encontrado na tabela public.users:');
      console.log('  - ID:', dbUsers[0].id);
      console.log('  - Email:', dbUsers[0].email);
      console.log('  - Nome:', dbUsers[0].displayName || dbUsers[0].full_name);
      console.log('  - Ativo:', dbUsers[0].isActive ? '✅ Sim' : '❌ Não');
      console.log('  - Role:', dbUsers[0].role);
    } else {
      console.log('❌ Usuário NÃO encontrado na tabela public.users');
    }

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

// Executar a verificação
checkUser().then(() => {
  console.log('');
  console.log('✨ Verificação concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
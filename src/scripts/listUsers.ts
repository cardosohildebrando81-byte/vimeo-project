import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (usando as credenciais do .env)
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3NTI5MSwiZXhwIjoyMDc1NzUxMjkxfQ.fyaxJO15UPERi9lMnmFdl6l3n9eLrnqkT8kLsgOfc04';

async function listUsers() {
  try {
    console.log('🔄 Listando usuários do Supabase...');
    
    // Criar cliente com service key para operações administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar todos os usuários
    const { data, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error('❌ Erro ao buscar usuários:', searchError.message);
      return;
    }

    console.log(`✅ Total de usuários encontrados: ${data?.users?.length || 0}`);
    console.log('📋 Lista de usuários:');
    console.log('='.repeat(80));

    if (!data?.users || data.users.length === 0) {
      console.log('📭 Nenhum usuário encontrado no sistema.');
    } else {
      data.users.forEach((user: any, index: number) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
        console.log(`   Última atualização: ${new Date(user.updated_at).toLocaleString('pt-BR')}`);
        console.log(`   Email confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`   Telefone: ${user.phone || 'N/A'}`);
        console.log(`   Provedor: ${user.app_metadata?.provider || 'email'}`);
        console.log('-'.repeat(40));
      });
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar o script
listUsers();

export { listUsers };
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (usando as credenciais do .env)
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3NTI5MSwiZXhwIjoyMDc1NzUxMjkxfQ.fyaxJO15UPERi9lMnmFdl6l3n9eLrnqkT8kLsgOfc04';

// Dados do usuário
const userEmail = 'hildebrando.cardoso@tvdoutor.com.br';
const userPassword = 'Suporte@2025!#@';

async function createUser() {
  try {
    console.log('🔄 Criando usuário no Supabase...');
    console.log(`📧 Email: ${userEmail}`);
    console.log(`🔐 Senha: ${userPassword}`);
    
    // Criar cliente com service key para operações administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Criar usuário usando admin API
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: 'Hildebrando Cardoso',
        role: 'admin'
      }
    });
    
    if (createError) {
      console.error('❌ Erro ao criar usuário:', createError.message);
      return;
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log(`🆔 ID do usuário: ${user.user.id}`);
    console.log(`📧 Email: ${user.user.email}`);
    console.log(`📅 Criado em: ${new Date(user.user.created_at).toLocaleString('pt-BR')}`);
    console.log(`✅ Email confirmado: ${user.user.email_confirmed_at ? 'Sim' : 'Não'}`);

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar o script
createUser();

export { createUser };
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (usando as credenciais do .env)
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3NTI5MSwiZXhwIjoyMDc1NzUxMjkxfQ.fyaxJO15UPERi9lMnmFdl6l3n9eLrnqkT8kLsgOfc04';

// Dados do usuário
const userEmail = 'hildebrando.cardoso@tvdoutor.com.br';
const newPassword = 'Suporte@2025!#@';

async function changeUserPassword() {
  try {
    console.log('🔄 Iniciando alteração de senha...');
    console.log(`📧 Email: ${userEmail}`);
    console.log(`🔐 Nova senha: ${newPassword}`);
    
    // Criar cliente com service key para operações administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar o usuário pelo email
    console.log('🔍 Buscando usuário...');
    const { data, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error('❌ Erro ao buscar usuários:', searchError.message);
      return;
    }

    const targetUser = data?.users?.find((user: any) => user.email === userEmail);
    
    if (!targetUser) {
      console.error('❌ Usuário não encontrado com este email');
      return;
    }

    console.log(`✅ Usuário encontrado: ${targetUser.id}`);

    // Alterar a senha do usuário
    console.log('🔄 Alterando senha...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { 
        password: newPassword,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('❌ Erro ao alterar senha:', updateError.message);
      return;
    }

    console.log('✅ Senha alterada com sucesso!');
    console.log('📋 Resumo da operação:');
    console.log(`   - Email: ${userEmail}`);
    console.log(`   - Nova senha: ${newPassword}`);
    console.log(`   - ID do usuário: ${targetUser.id}`);
    console.log(`   - Data/hora: ${new Date().toLocaleString('pt-BR')}`);

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar o script
changeUserPassword();

export { changeUserPassword };
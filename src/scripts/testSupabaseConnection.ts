import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzUyOTEsImV4cCI6MjA3NTc1MTI5MX0.h_1BqXgl5tCBguK_1UNmGJVb9vXDu8tct2z5cYuW1Jc';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3NTI5MSwiZXhwIjoyMDc1NzUxMjkxfQ.fyaxJO15UPERi9lMnmFdl6l3n9eLrnqkT8kLsgOfc04';

// Credenciais de teste
const testEmail = 'hildebrando.cardoso@tvdoutor.com.br';
const testPassword = 'Suporte@2025!#@';

async function testSupabaseConnection() {
  console.log('🔧 Testando conexão com Supabase...');
  console.log('🌐 URL:', supabaseUrl);
  console.log('');

  try {
    // 1. Testar conexão básica com anon key
    console.log('1️⃣ Testando conexão básica (anon key)...');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    // Testar uma query simples
    const { data: healthCheck, error: healthError } = await supabaseAnon
      .from('_health_check')
      .select('*')
      .limit(1);
    
    if (healthError && !healthError.message.includes('does not exist')) {
      console.log('⚠️  Conexão básica: Erro esperado (tabela não existe):', healthError.message);
    } else {
      console.log('✅ Conexão básica: OK');
    }

    // 2. Testar autenticação
    console.log('');
    console.log('2️⃣ Testando autenticação...');
    
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      console.log('❌ Erro na autenticação:', authError.message);
      
      // Verificar tipos específicos de erro
      if (authError.message.includes('Invalid login credentials')) {
        console.log('💡 Possível causa: Senha incorreta');
      } else if (authError.message.includes('Email not confirmed')) {
        console.log('💡 Possível causa: Email não confirmado');
      } else if (authError.message.includes('Too many requests')) {
        console.log('💡 Possível causa: Muitas tentativas de login');
      }
    } else {
      console.log('✅ Autenticação: Sucesso!');
      console.log('  - User ID:', authData.user?.id);
      console.log('  - Email:', authData.user?.email);
      console.log('  - Session válida:', !!authData.session);
      
      // Fazer logout após teste
      await supabaseAnon.auth.signOut();
      console.log('🚪 Logout realizado');
    }

    // 3. Testar service role
    console.log('');
    console.log('3️⃣ Testando service role...');
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro com service role:', usersError.message);
    } else {
      console.log('✅ Service role: OK');
      console.log('  - Total de usuários:', users.users.length);
    }

    // 4. Testar configurações de ambiente
    console.log('');
    console.log('4️⃣ Verificando configurações de ambiente...');
    
    const envVars = {
      'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
      'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida',
      'SUPABASE_URL': process.env.SUPABASE_URL,
      'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida',
      'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ Não definida'
    };

    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value || '❌ Não definida'}`);
    });

    // 5. Testar configurações de Auth
    console.log('');
    console.log('5️⃣ Testando configurações de Auth...');
    
    const { data: settings, error: settingsError } = await supabaseAdmin.auth.admin.getSettings();
    
    if (settingsError) {
      console.log('❌ Erro ao obter configurações:', settingsError.message);
    } else {
      console.log('✅ Configurações de Auth:');
      console.log('  - Site URL:', settings.site_url);
      console.log('  - Disable signup:', settings.disable_signup);
      console.log('  - Email confirmação:', !settings.email_confirm_disabled);
    }

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

// Executar os testes
testSupabaseConnection().then(() => {
  console.log('');
  console.log('✨ Testes concluídos!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
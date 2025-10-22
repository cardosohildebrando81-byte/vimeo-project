import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzUyOTEsImV4cCI6MjA3NTc1MTI5MX0.h_1BqXgl5tCBguK_1UNmGJVb9vXDu8tct2z5cYuW1Jc';

// Credenciais de teste
const testEmail = 'hildebrando.cardoso@tvdoutor.com.br';
const testPassword = 'Suporte@2025!#@';

async function debugLogin() {
  console.log('🔍 Debugando processo de login...');
  console.log('📧 Email:', testEmail);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  try {
    // 1. Verificar estado inicial
    console.log('1️⃣ Verificando estado inicial...');
    const { data: initialSession } = await supabase.auth.getSession();
    console.log('  - Sessão inicial:', initialSession.session ? '✅ Ativa' : '❌ Nenhuma');
    
    if (initialSession.session) {
      console.log('  - User ID:', initialSession.session.user.id);
      console.log('  - Email:', initialSession.session.user.email);
      console.log('  - Expira em:', new Date(initialSession.session.expires_at! * 1000).toLocaleString());
    }

    // 2. Fazer logout se já estiver logado
    if (initialSession.session) {
      console.log('');
      console.log('🚪 Fazendo logout da sessão existente...');
      await supabase.auth.signOut();
      console.log('  - Logout realizado');
    }

    // 3. Tentar fazer login
    console.log('');
    console.log('2️⃣ Tentando fazer login...');
    
    const startTime = Date.now();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    const endTime = Date.now();
    
    console.log(`  - Tempo de resposta: ${endTime - startTime}ms`);

    if (authError) {
      console.log('❌ Erro no login:', authError.message);
      console.log('  - Código:', authError.status);
      console.log('  - Detalhes:', authError);
      return;
    }

    console.log('✅ Login bem-sucedido!');
    console.log('  - User ID:', authData.user?.id);
    console.log('  - Email:', authData.user?.email);
    console.log('  - Email confirmado:', authData.user?.email_confirmed_at ? '✅ Sim' : '❌ Não');
    console.log('  - Sessão válida:', !!authData.session);
    
    if (authData.session) {
      console.log('  - Access token (primeiros 20 chars):', authData.session.access_token.substring(0, 20) + '...');
      console.log('  - Refresh token (primeiros 20 chars):', authData.session.refresh_token.substring(0, 20) + '...');
      console.log('  - Expira em:', new Date(authData.session.expires_at! * 1000).toLocaleString());
    }

    // 4. Verificar metadados do usuário
    console.log('');
    console.log('3️⃣ Verificando metadados do usuário...');
    console.log('  - User metadata:', JSON.stringify(authData.user?.user_metadata, null, 2));
    console.log('  - App metadata:', JSON.stringify(authData.user?.app_metadata, null, 2));

    // 5. Testar refresh da sessão
    console.log('');
    console.log('4️⃣ Testando refresh da sessão...');
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.log('❌ Erro no refresh:', refreshError.message);
    } else {
      console.log('✅ Refresh bem-sucedido!');
      console.log('  - Nova sessão válida:', !!refreshData.session);
    }

    // 6. Verificar se consegue acessar dados protegidos
    console.log('');
    console.log('5️⃣ Testando acesso a dados protegidos...');
    
    // Tentar acessar uma tabela que requer autenticação
    const { data: protectedData, error: protectedError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (protectedError) {
      console.log('⚠️  Erro ao acessar dados protegidos:', protectedError.message);
      console.log('  - Isso pode ser normal se a tabela não existir ou não tiver RLS configurado');
    } else {
      console.log('✅ Acesso a dados protegidos funcionando');
      console.log('  - Dados retornados:', protectedData?.length || 0, 'registros');
    }

    // 7. Simular o fluxo do frontend
    console.log('');
    console.log('6️⃣ Simulando fluxo do frontend...');
    
    // Verificar se o estado persiste após recriar o cliente
    const newSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    const { data: persistedSession } = await newSupabase.auth.getSession();
    
    if (persistedSession.session) {
      console.log('✅ Sessão persistiu após recriar cliente');
      console.log('  - User ID:', persistedSession.session.user.id);
    } else {
      console.log('❌ Sessão não persistiu - possível problema de localStorage');
    }

    // 8. Fazer logout final
    console.log('');
    console.log('🚪 Fazendo logout final...');
    await supabase.auth.signOut();
    console.log('  - Logout realizado');

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

// Executar debug
debugLogin().then(() => {
  console.log('');
  console.log('✨ Debug concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
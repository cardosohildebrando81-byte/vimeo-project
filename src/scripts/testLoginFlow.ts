import { createClient } from '@supabase/supabase-js';

// Usando as mesmas configurações do frontend
const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzUyOTEsImV4cCI6MjA3NTc1MTI5MX0.h_1BqXgl5tCBguK_1UNmGJVb9vXDu8tct2z5cYuW1Jc';

const testEmail = 'hildebrando.cardoso@tvdoutor.com.br';
const testPassword = 'Suporte@2025!#@';

async function testLoginFlow() {
  console.log('🧪 Testando fluxo de login do frontend...');
  console.log('📧 Email:', testEmail);
  console.log('');

  // Simular exatamente como o frontend cria o cliente
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  try {
    // 1. Verificar estado inicial (como o useAuth faz)
    console.log('1️⃣ Verificando estado inicial da sessão...');
    const { data: initialSession, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro ao obter sessão inicial:', sessionError.message);
      return;
    }

    console.log('  - Sessão inicial:', initialSession.session ? '✅ Ativa' : '❌ Nenhuma');
    
    if (initialSession.session) {
      console.log('  - Fazendo logout da sessão existente...');
      await supabase.auth.signOut();
    }

    // 2. Simular o processo de login (como no Login.tsx)
    console.log('');
    console.log('2️⃣ Simulando processo de login...');
    
    const startTime = Date.now();
    
    // Exatamente como no handleSubmit do Login.tsx
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    const endTime = Date.now();
    console.log(`  - Tempo de resposta: ${endTime - startTime}ms`);

    if (authError) {
      console.log('❌ Erro no login:', authError.message);
      console.log('  - Código de erro:', authError.status);
      console.log('  - Detalhes completos:', JSON.stringify(authError, null, 2));
      return;
    }

    console.log('✅ Login realizado com sucesso!');
    console.log('  - User ID:', authData.user?.id);
    console.log('  - Email:', authData.user?.email);
    console.log('  - Sessão criada:', !!authData.session);

    // 3. Verificar se o estado persiste (como o useAuth monitora)
    console.log('');
    console.log('3️⃣ Verificando persistência da sessão...');
    
    // Aguardar um pouco para simular o comportamento real
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: persistedSession } = await supabase.auth.getSession();
    
    if (persistedSession.session) {
      console.log('✅ Sessão persistiu corretamente');
      console.log('  - User ID:', persistedSession.session.user.id);
      console.log('  - Email:', persistedSession.session.user.email);
      console.log('  - Expira em:', new Date(persistedSession.session.expires_at! * 1000).toLocaleString());
    } else {
      console.log('❌ Sessão não persistiu - problema detectado!');
    }

    // 4. Testar listener de mudanças de auth (como o useAuth usa)
    console.log('');
    console.log('4️⃣ Testando listener de mudanças de autenticação...');
    
    let authChangeDetected = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`  - Evento detectado: ${event}`);
      if (session) {
        console.log(`  - Sessão ativa: ${session.user.email}`);
        authChangeDetected = true;
      } else {
        console.log('  - Nenhuma sessão ativa');
      }
    });

    // Aguardar um pouco para ver se o listener é acionado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (authChangeDetected) {
      console.log('✅ Listener de auth funcionando');
    } else {
      console.log('⚠️  Listener de auth não foi acionado');
    }

    // Limpar subscription
    subscription.unsubscribe();

    // 5. Testar refresh de token
    console.log('');
    console.log('5️⃣ Testando refresh de token...');
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.log('❌ Erro no refresh:', refreshError.message);
    } else {
      console.log('✅ Refresh de token funcionando');
      console.log('  - Nova sessão válida:', !!refreshData.session);
    }

    // 6. Verificar metadados do usuário (importante para roles)
    console.log('');
    console.log('6️⃣ Verificando metadados do usuário...');
    
    const currentUser = authData.user;
    if (currentUser) {
      console.log('  - User metadata:', JSON.stringify(currentUser.user_metadata, null, 2));
      console.log('  - App metadata:', JSON.stringify(currentUser.app_metadata, null, 2));
      
      // Verificar role específica
      const role = currentUser.user_metadata?.role || 
                   currentUser.user_metadata?.user_role || 
                   currentUser.user_metadata?.profile_role;
      
      console.log('  - Role detectada:', role || 'Nenhuma');
      
      if (role === 'admin') {
        console.log('✅ Usuário tem permissões de admin');
      } else {
        console.log('ℹ️  Usuário não tem permissões de admin');
      }
    }

    // 7. Fazer logout final
    console.log('');
    console.log('🚪 Fazendo logout final...');
    
    const { error: logoutError } = await supabase.auth.signOut();
    
    if (logoutError) {
      console.log('❌ Erro no logout:', logoutError.message);
    } else {
      console.log('✅ Logout realizado com sucesso');
    }

    // Verificar se o logout funcionou
    const { data: finalSession } = await supabase.auth.getSession();
    
    if (finalSession.session) {
      console.log('⚠️  Sessão ainda ativa após logout - possível problema');
    } else {
      console.log('✅ Logout confirmado - nenhuma sessão ativa');
    }

  } catch (error) {
    console.error('💥 Erro inesperado no teste:', error);
  }
}

// Executar teste
testLoginFlow().then(() => {
  console.log('');
  console.log('✨ Teste de fluxo de login concluído!');
  console.log('');
  console.log('📋 Resumo:');
  console.log('- Se todos os testes passaram, o login deve funcionar no frontend');
  console.log('- Se algum teste falhou, há um problema específico a ser corrigido');
  console.log('- Verifique os logs acima para identificar problemas');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal no teste:', error);
  process.exit(1);
});
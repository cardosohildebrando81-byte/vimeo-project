import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pugosmzjnzibqbyetbvu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z29zbXpqbnppYnFieWV0YnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3NTI5MSwiZXhwIjoyMDc1NzUxMjkxfQ.fyaxJO15UPERi9lMnmFdl6l3n9eLrnqkT8kLsgOfc04'

const userEmail = process.env.EMAIL || 'suporte@tvdoutor.com.br'
const orgId = process.env.ORG_ID
const role = (process.env.ROLE || 'MANAGER').toUpperCase()

if (!orgId) {
  console.error('❌ Parâmetro obrigatório ausente: ORG_ID. Exemplo: EMAIL=suporte@tvdoutor.com.br ORG_ID=<uuid> ROLE=MANAGER node src/scripts/backfillUser.mjs')
  process.exit(1)
}

if (!['CLIENT', 'MANAGER'].includes(role)) {
  console.error('❌ ROLE inválido. Use CLIENT ou MANAGER.')
  process.exit(1)
}

async function backfillUser() {
  try {
    console.log('🔄 Iniciando backfill de usuário em public.User...')
    console.log(`📧 Email: ${userEmail}`)
    console.log(`🏢 OrganizationId: ${orgId}`)
    console.log(`👤 Role: ${role}`)

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('🔍 Buscando usuário no Supabase Auth (admin)...')
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) throw listErr

    const targetUser = list?.users?.find((u) => u.email === userEmail)
    if (!targetUser) {
      console.error('❌ Usuário não encontrado no Supabase Auth com este email')
      process.exit(1)
    }

    const authProviderId = targetUser.id
    const displayName = targetUser.user_metadata?.full_name || (userEmail?.split('@')[0] || 'Usuário')

    console.log(`✅ Usuário Auth encontrado: ${authProviderId}`)

    console.log('🔎 Verificando existência em public.User...')
    const { data: existing, error: existingErr } = await supabase
      .from('User')
      .select('id, email, authProviderId')
      .eq('authProviderId', authProviderId)
      .limit(1)

    if (existingErr) throw existingErr

    if (existing && existing.length > 0) {
      console.log('ℹ️ Registro já existe em public.User, atualizando os campos principais...')
    } else {
      console.log('➕ Inserindo novo registro em public.User...')
    }

    const now = new Date().toISOString()
    const payload = {
      organizationId: orgId,
      authProvider: 'SUPABASE',
      authProviderId,
      email: userEmail,
      displayName,
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from('User')
      .upsert(payload, { onConflict: 'authProviderId' })
      .select('*')

    if (upsertErr) throw upsertErr

    console.log('✅ Backfill concluído com sucesso!')
    console.log('📋 Registro:')
    console.log(JSON.stringify(upserted, null, 2))
  } catch (error) {
    console.error('❌ Erro durante backfill:', error?.message || error)
    process.exit(1)
  }
}

backfillUser()
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Carrega variáveis do .env
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente ausentes. Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Uso: ts-node src/scripts/applySqlViaRpc.ts <caminho-do-arquivo-sql>')
    process.exit(1)
  }

  const sqlPath = path.resolve(fileArg)
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Arquivo SQL não encontrado: ${sqlPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8')
  console.log(`📄 Aplicando SQL via RPC (exec): ${sqlPath}`)

  try {
    const { error } = await supabase.rpc('exec', { sql })
    if (error) {
      console.error('❌ Erro ao executar RPC exec:', error.message)
      process.exit(1)
    }
    console.log('✅ SQL aplicado com sucesso!')
  } catch (e: any) {
    console.error('💥 Erro inesperado ao executar SQL via RPC:', e?.message || e)
    process.exit(1)
  }
}

main()
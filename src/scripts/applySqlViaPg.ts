import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()
// Desabilitar verificação de certificado para conexões SSL (apenas para uso controlado)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function buildPoolerConnectionString(): string | null {
  // Priorizar variável dedicada se existir
  const poolerEnv = process.env.DATABASE_POOLER_URL
  if (poolerEnv) return poolerEnv

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const dbUrl = process.env.DATABASE_URL
  if (!supabaseUrl || !dbUrl) return null

  // Extrair project-ref do SUPABASE_URL
  try {
    const host = new URL(supabaseUrl).host // e.g. pugosmzjnzibqbyetbvu.supabase.co
    const projectRef = host.split('.')[0]

    // Extrair senha do DATABASE_URL (postgresql://postgres:ENCODED@db.<ref>.supabase.co:6543/postgres?...)
    const match = dbUrl.match(/postgresql:\/\/postgres:([^@]+)@/)
    if (!match) return null
    const encodedPass = match[1]
    const password = decodeURIComponent(encodedPass)

    // Assumir região SA East 1 (ajuste se necessário)
    const regionHost = 'aws-1-sa-east-1.pooler.supabase.com'
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${regionHost}:6543/postgres?sslmode=require`
  } catch {
    return null
  }
}

const directConnectionString = process.env.DATABASE_URL
const poolerConnectionString = buildPoolerConnectionString()
const connectionString = poolerConnectionString || directConnectionString

if (!connectionString) {
  console.error('❌ Não foi possível determinar a string de conexão. Defina SUPABASE_URL e DATABASE_URL no .env (ou DATABASE_POOLER_URL).')
  process.exit(1)
}

function splitStatements(sql: string): string[] {
  // Remove comentários e divide por ponto e vírgula, preservando os $$ de funções
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\r/g, '')

  const statements: string[] = []
  let buffer = ''
  let inDollarFunction = false

  const lines = cleaned.split('\n')
  for (const line of lines) {
    const dollarCount = (line.match(/\$\$/g) || []).length
    if (dollarCount % 2 === 1) inDollarFunction = !inDollarFunction

    buffer += line + '\n'
    if (!inDollarFunction && line.trim().endsWith(';')) {
      const stmt = buffer.trim()
      if (stmt) statements.push(stmt)
      buffer = ''
    }
  }
  const tail = buffer.trim()
  if (tail) statements.push(tail)
  return statements.filter(s => s.length > 0)
}

async function applySql(filePath: string) {
  const sqlPath = path.resolve(filePath)
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Arquivo SQL não encontrado: ${sqlPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const statements = splitStatements(sql)
  console.log(`📄 Executando ${statements.length} statements de: ${sqlPath}`)
  console.log(`🔌 Conectando via: ${connectionString.includes('pooler') ? 'Pooler' : 'Direct'}`)

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    for (const [i, stmt] of statements.entries()) {
      console.log(`➡️  [${i + 1}/${statements.length}] ${stmt.substring(0, 80).replace(/\s+/g, ' ')}...`)
      await client.query(stmt)
    }
    console.log('✅ SQL aplicado com sucesso!')
  } catch (e: any) {
    console.error('❌ Falha ao aplicar SQL:', e?.message || e)
    process.exit(1)
  } finally {
    await client.end()
  }
}

const fileArg = process.argv[2]
if (!fileArg) {
  console.error('Uso: ts-node src/scripts/applySqlViaPg.ts <caminho-do-arquivo-sql>')
  process.exit(1)
}

applySql(fileArg)
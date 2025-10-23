-- Script para corrigir permissões da tabela User
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. REMOVER POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Enable all operations" ON public."User";
DROP POLICY IF EXISTS "Users can view all users" ON public."User";
DROP POLICY IF EXISTS "Users can insert users" ON public."User";
DROP POLICY IF EXISTS "Users can update users" ON public."User";
DROP POLICY IF EXISTS "Users can delete users" ON public."User";

-- 2. CRIAR POLÍTICAS MAIS ESPECÍFICAS

-- Política para SELECT (leitura)
CREATE POLICY "Users can view all users" ON public."User"
    FOR SELECT USING (true);

-- Política para INSERT (criação)
CREATE POLICY "Users can insert users" ON public."User"
    FOR INSERT WITH CHECK (true);

-- Política para UPDATE (atualização)
CREATE POLICY "Users can update users" ON public."User"
    FOR UPDATE USING (true) WITH CHECK (true);

-- Política para DELETE (exclusão)
CREATE POLICY "Users can delete users" ON public."User"
    FOR DELETE USING (true);

-- 3. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 4. CONCEDER PERMISSÕES EXPLÍCITAS PARA O ROLE AUTHENTICATED
GRANT ALL ON public."User" TO authenticated;
GRANT ALL ON public."User" TO anon;

-- 5. CONCEDER PERMISSÕES PARA A SEQUENCE (se existir)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 6. VERIFICAR SE A TABELA EXISTE E TEM DADOS
SELECT 'Tabela User existe e tem ' || COUNT(*) || ' registros' as status
FROM public."User";

-- 7. TESTAR PERMISSÕES
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'User' AND schemaname = 'public';
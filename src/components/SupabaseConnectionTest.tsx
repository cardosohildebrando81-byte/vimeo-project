import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { useSupabase } from '../lib/supabase'
import { useAuth, useUser } from '../hooks/useAuth'
import { CheckCircle, XCircle, Loader2, Database, User, LogIn, LogOut, UserPlus } from 'lucide-react'

export const SupabaseConnectionTest: React.FC = () => {
  const { testConnection } = useSupabase()
  const { signIn, signUp, signOut, loading: authLoading } = useAuth()
  const { user, isAuthenticated, isLoading } = useUser()
  
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean
    message: string
    user?: any
  } | null>(null)
  const [testing, setTesting] = useState(false)
  
  // Estados para formulários de teste
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', fullName: '' })
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const result = await testConnection()
      setConnectionResult(result)
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })
    } finally {
      setTesting(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn(loginForm.email, loginForm.password)
    
    if (result.success) {
      setShowLoginForm(false)
      setLoginForm({ email: '', password: '' })
      // Atualizar resultado da conexão
      handleTestConnection()
    } else {
      setConnectionResult({
        success: false,
        message: result.error || 'Erro no login'
      })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signUp(registerForm.email, registerForm.password, {
      full_name: registerForm.fullName
    })
    
    if (result.success) {
      setShowRegisterForm(false)
      setRegisterForm({ email: '', password: '', fullName: '' })
      setConnectionResult({
        success: true,
        message: 'Conta criada com sucesso! Verifique seu email para confirmar.'
      })
    } else {
      setConnectionResult({
        success: false,
        message: result.error || 'Erro no registro'
      })
    }
  }

  const handleLogout = async () => {
    const result = await signOut()
    
    if (result.success) {
      setConnectionResult({
        success: true,
        message: 'Logout realizado com sucesso!'
      })
    } else {
      setConnectionResult({
        success: false,
        message: result.error || 'Erro no logout'
      })
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Teste de Conexão com Supabase
          </CardTitle>
          <CardDescription>
            Teste a conectividade e funcionalidades básicas do Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status da Conexão */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isAuthenticated ? "default" : "secondary"}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Carregando...
                  </>
                ) : isAuthenticated ? (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Autenticado
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Não autenticado
                  </>
                )}
              </Badge>
              {user && (
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleTestConnection} 
              disabled={testing}
              variant="outline"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>
          </div>

          {/* Resultado do Teste */}
          {connectionResult && (
            <Alert className={connectionResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start gap-2">
                {connectionResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className={connectionResult.success ? "text-green-800" : "text-red-800"}>
                    {connectionResult.message}
                  </AlertDescription>
                  {connectionResult.user && (
                    <div className="mt-2 text-sm">
                      <strong>Usuário:</strong> {connectionResult.user.email}
                      <br />
                      <strong>ID:</strong> {connectionResult.user.id}
                      {connectionResult.user.user_metadata?.full_name && (
                        <>
                          <br />
                          <strong>Nome:</strong> {connectionResult.user.user_metadata.full_name}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Ações de Autenticação */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Teste de Autenticação</h3>
            
            {!isAuthenticated ? (
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={() => setShowLoginForm(!showLoginForm)}
                  variant="default"
                  disabled={authLoading}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Fazer Login
                </Button>
                <Button 
                  onClick={() => setShowRegisterForm(!showRegisterForm)}
                  variant="outline"
                  disabled={authLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Conta
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleLogout}
                variant="destructive"
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Fazer Logout
              </Button>
            )}
          </div>

          {/* Formulário de Login */}
          {showLoginForm && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Login de Teste</CardTitle>
                <CardDescription>
                  Use credenciais existentes para testar o login
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Senha</label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={authLoading}>
                      {authLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <LogIn className="h-4 w-4 mr-2" />
                      )}
                      Entrar
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowLoginForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Registro */}
          {showRegisterForm && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-lg">Criar Conta de Teste</CardTitle>
                <CardDescription>
                  Crie uma nova conta para testar o registro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Seu Nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Senha</label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={authLoading}>
                      {authLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Criar Conta
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowRegisterForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Como usar:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Testar Conexão:</strong> Verifica se o Supabase está configurado corretamente</li>
              <li>• <strong>Criar Conta:</strong> Testa o registro de novos usuários</li>
              <li>• <strong>Fazer Login:</strong> Testa a autenticação com credenciais existentes</li>
              <li>• <strong>Logout:</strong> Testa o encerramento da sessão</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
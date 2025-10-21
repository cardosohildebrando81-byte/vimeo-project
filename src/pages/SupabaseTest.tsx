import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SupabaseConnectionTest } from '../components/SupabaseConnectionTest'

const SupabaseTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Teste de Integração Supabase
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Teste a conectividade e funcionalidades do Supabase, incluindo autenticação, 
            banco de dados e gerenciamento de sessões.
          </p>
        </div>

        <div className="flex justify-center">
          <SupabaseConnectionTest />
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Sobre a Integração Supabase
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                🔐 Autenticação
              </h3>
              <p className="text-gray-600 mb-4">
                Sistema completo de autenticação com registro, login, logout e 
                gerenciamento de sessões. Suporte a diferentes provedores e 
                autenticação por email.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                🗄️ Banco de Dados
              </h3>
              <p className="text-gray-600 mb-4">
                PostgreSQL totalmente gerenciado com APIs REST automáticas, 
                subscriptions em tempo real e políticas de segurança RLS 
                (Row Level Security).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ⚡ Tempo Real
              </h3>
              <p className="text-gray-600 mb-4">
                Atualizações em tempo real usando WebSockets. Perfeito para 
                aplicações colaborativas, chats e dashboards que precisam 
                de dados sempre atualizados.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                📁 Storage
              </h3>
              <p className="text-gray-600 mb-4">
                Armazenamento de arquivos com CDN global, redimensionamento 
                automático de imagens e políticas de acesso granulares.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              🚀 Configuração Atual
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>URL do Projeto:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Não configurado'}</li>
              <li>• <strong>Autenticação:</strong> Habilitada com persistência de sessão</li>
              <li>• <strong>Hooks Personalizados:</strong> useAuth, useUser, useRequireAuth</li>
              <li>• <strong>TypeScript:</strong> Tipagem completa para todas as operações</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default SupabaseTest
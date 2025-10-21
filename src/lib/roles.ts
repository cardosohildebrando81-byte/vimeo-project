import { supabase } from './supabase';
import { Role, User } from '@/types/database';

/**
 * Busca o role de um usuário pelo ID do auth.users
 * @param authUserId - ID do usuário no auth.users
 * @returns Role do usuário ou null se não encontrado
 */
export async function getUserRole(authUserId: string): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('role')
      .eq('authProviderId', authUserId)
      .single();

    if (error) {
      console.error('Erro ao buscar role do usuário:', error);
      return null;
    }

    return data?.role || null;
  } catch (error) {
    console.error('Erro inesperado ao buscar role:', error);
    return null;
  }
}

/**
 * Verifica se um usuário tem um role específico
 * @param authUserId - ID do usuário no auth.users
 * @param role - Role para verificar
 * @returns true se o usuário tem o role especificado
 */
export async function hasRole(authUserId: string, role: Role): Promise<boolean> {
  const userRole = await getUserRole(authUserId);
  return userRole === role;
}

/**
 * Verifica se um usuário é admin
 * @param authUserId - ID do usuário no auth.users
 * @returns true se o usuário é admin
 */
export async function isAdmin(authUserId: string): Promise<boolean> {
  return hasRole(authUserId, 'ADMIN');
}

/**
 * Verifica se um usuário é manager ou admin
 * @param authUserId - ID do usuário no auth.users
 * @returns true se o usuário é manager ou admin
 */
export async function isManagerOrAdmin(authUserId: string): Promise<boolean> {
  const userRole = await getUserRole(authUserId);
  return userRole === 'MANAGER' || userRole === 'ADMIN';
}

/**
 * Busca o usuário completo pelo ID do auth.users
 * @param authUserId - ID do usuário no auth.users
 * @returns Dados do usuário ou null
 */
export async function getUserByAuthId(authUserId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('authProviderId', authUserId)
      .single();

    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao buscar usuário:', error);
    return null;
  }
}

/**
 * Busca a organização do usuário
 * @param authUserId - ID do usuário no auth.users
 * @returns ID da organização ou null
 */
export async function getUserOrganization(authUserId: string): Promise<string | null> {
  const user = await getUserByAuthId(authUserId);
  return user?.organizationId || null;
}

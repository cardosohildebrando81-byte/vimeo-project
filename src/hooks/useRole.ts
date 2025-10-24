import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserRole } from '@/lib/roles'
import type { Role } from '@/types/database'

function readRoleFromMetadata(user: any): Role | null {
  const appMd: any = user?.app_metadata ?? {}

  // 1) App metadata: role explícito
  const appRoleRaw = appMd?.role
  if (typeof appRoleRaw === 'string') {
    const r = appRoleRaw.toUpperCase()
    if (r === 'ADMIN' || r === 'MANAGER' || r === 'CLIENT') return r as Role
  }
  // 1b) App metadata: flags booleanas
  const appFlags = [appMd?.is_admin, appMd?.admin, appMd?.isAdmin]
  if (appFlags.some((v) => v === true)) return 'ADMIN'

  // 2) User metadata: role/aliases
  const md: any = user?.user_metadata ?? {}
  const raw = (md?.role || md?.user_role || md?.profile_role || '').toString().toUpperCase()
  if (raw === 'ADMIN' || raw === 'MANAGER' || raw === 'CLIENT') return raw as Role

  // 2b) User metadata: flags booleanas
  const flags = [md?.is_admin, md?.admin, md?.isAdmin]
  if (flags.some((v) => v === true)) return 'ADMIN'

  return null
}

export function useRole() {
  const { user, initialized, loading } = useAuth()
  const [dbRole, setDbRole] = useState<Role | null>(null)
  const [fetching, setFetching] = useState(false)
  const fetchedUserIdRef = useRef<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoiza o role dos metadados para evitar recálculos desnecessários
  const metaRole = useMemo<Role | null>(() => {
    if (!user) return null
    return readRoleFromMetadata(user)
  }, [user?.id, user?.app_metadata, user?.user_metadata])

  // Função debounced para buscar role do DB
  const fetchRoleDebounced = useCallback(async (userId: string) => {
    // Cancela timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Se já buscamos para este usuário, não busca novamente
    if (fetchedUserIdRef.current === userId) {
      return
    }

    timeoutRef.current = setTimeout(async () => {
      let cancelled = false
      
      setFetching(true)
      try {
        const r = await getUserRole(userId)
        if (!cancelled) {
          setDbRole(r)
          fetchedUserIdRef.current = userId
        }
      } catch (err) {
        console.warn('Falha ao buscar role do DB:', err)
        if (!cancelled) setDbRole(null)
      } finally {
        if (!cancelled) setFetching(false)
      }
    }, 100) // Debounce de 100ms
  }, [])

  useEffect(() => {
    // Reset quando não há usuário
    if (!user?.id) {
      setDbRole(null)
      fetchedUserIdRef.current = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // Só busca se auth estiver inicializado e não estiver carregando
    if (initialized && !loading && user.id) {
      // Se já temos role dos metadados, não precisa buscar do DB
      if (metaRole) {
        setDbRole(null)
        fetchedUserIdRef.current = user.id
        return
      }
      
      // Busca do DB apenas se necessário
      fetchRoleDebounced(user.id)
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [user?.id, initialized, loading, metaRole, fetchRoleDebounced])

  // Memoiza valores de retorno para evitar re-renders
  const effectiveRole: Role | null = useMemo(() => metaRole ?? dbRole, [metaRole, dbRole])
  const isAdmin = useMemo(() => effectiveRole === 'ADMIN', [effectiveRole])
  const isLoading = useMemo(() => loading || !initialized || fetching, [loading, initialized, fetching])

  return {
    role: effectiveRole,
    isAdmin,
    loading: isLoading,
    initialized
  }
}

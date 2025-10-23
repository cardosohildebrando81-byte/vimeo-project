import { useEffect, useMemo, useState } from 'react'
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

  const metaRole = useMemo<Role | null>(() => readRoleFromMetadata(user), [user])

  useEffect(() => {
    let cancelled = false
    async function fetchRole() {
      if (!user?.id) {
        setDbRole(null)
        return
      }
      setFetching(true)
      try {
        const r = await getUserRole(user.id)
        if (!cancelled) setDbRole(r)
      } catch (err) {
        console.warn('Falha ao buscar role do DB:', err)
        if (!cancelled) setDbRole(null)
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    if (initialized && !loading && user?.id) {
      fetchRole()
    } else {
      setDbRole(null)
    }
    return () => { cancelled = true }
  }, [user?.id, initialized, loading])

  const effectiveRole: Role | null = metaRole ?? dbRole
  const isAdmin = effectiveRole === 'ADMIN'

  return {
    role: effectiveRole,
    isAdmin,
    loading: loading || !initialized || fetching,
    initialized
  }
}

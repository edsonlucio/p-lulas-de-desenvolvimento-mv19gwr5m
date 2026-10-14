import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { RecordAuthResponse } from 'pocketbase'

import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/lib/types'

interface RegisterInput {
  name: string
  email: string
  password: string
  passwordConfirm: string
}

interface AuthContextValue {
  user: UserRecord | null
  loading: boolean
  login: (email: string, password: string) => Promise<RecordAuthResponse<UserRecord>>
  register: (input: RegisterInput) => Promise<UserRecord>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(
    () => (pb.authStore.record as UserRecord | null) ?? null,
  )
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      setUser(null)
      return
    }
    try {
      await pb.collection<UserRecord>('users').authRefresh()
      setUser(pb.authStore.record as UserRecord)
    } catch {
      pb.authStore.clear()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false))
    const unsubscribe = pb.authStore.onChange((_token, record) =>
      setUser(record as UserRecord | null),
    )
    return unsubscribe
  }, [refreshUser])

  useEffect(() => {
    if (!user?.id) return
    let unsubscribe: (() => Promise<void>) | undefined
    pb.collection<UserRecord>('users')
      .subscribe(user.id, ({ record }) => setUser(record))
      .then((fn) => {
        unsubscribe = fn
      })
      .catch(() => {})
    return () => {
      void unsubscribe?.()
    }
  }, [user?.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const result = await pb.collection<UserRecord>('users').authWithPassword(email, password)
        setUser(result.record)
        return result
      },
      register: async (input) => {
        const record = await pb.collection<UserRecord>('users').create({
          ...input,
          role: 'student',
          points: 0,
        })
        try {
          await pb.collection('users').requestVerification(input.email)
        } catch {
          /* A conta continua utilizável enquanto o e-mail é confirmado. */
        }
        const auth = await pb
          .collection<UserRecord>('users')
          .authWithPassword(input.email, input.password)
        setUser(auth.record)
        return record
      },
      logout: () => {
        pb.authStore.clear()
        setUser(null)
      },
      refreshUser,
    }),
    [loading, refreshUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}

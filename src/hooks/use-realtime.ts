import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 *
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    const subscribeWithRetry = async () => {
      try {
        const fn = await pb.collection<TRecord>(collectionName).subscribe('*', (e) => {
          callbackRef.current(e)
        })
        if (cancelled) {
          void fn().catch(() => {})
        } else {
          unsubscribeFn = fn
        }
      } catch (err) {
        const isAuthMismatch =
          err instanceof Error &&
          (err.message.includes("authorization don't match") ||
            (err as { status?: number }).status === 403)

        if (isAuthMismatch) {
          try {
            await pb.realtime.unsubscribe()
            if (!cancelled) {
              const retryFn = await pb.collection<TRecord>(collectionName).subscribe('*', (e) => {
                callbackRef.current(e)
              })
              if (cancelled) {
                void retryFn().catch(() => {})
              } else {
                unsubscribeFn = retryFn
              }
            }
          } catch (retryErr) {
            console.warn(
              `[Realtime] Failed to subscribe to "${collectionName}" after reset:`,
              retryErr,
            )
          }
        } else {
          console.warn(`[Realtime] Error subscribing to "${collectionName}":`, err)
        }
      }
    }

    void subscribeWithRetry()

    return () => {
      cancelled = true
      if (unsubscribeFn) {
        void unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime

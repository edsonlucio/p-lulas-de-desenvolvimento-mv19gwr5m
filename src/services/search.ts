import pb from '@/lib/pocketbase/client'
import type { SearchResult } from '@/lib/types'

export async function searchLessons(query: string) {
  return pb.send<{ query: string; results: SearchResult[] }>(
    `/backend/v1/buscar-aulas?q=${encodeURIComponent(query)}`,
    { method: 'GET' },
  )
}

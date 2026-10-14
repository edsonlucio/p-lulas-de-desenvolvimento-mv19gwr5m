import pb from '@/lib/pocketbase/client'
import type { SearchCitation, SearchResult } from '@/lib/types'

export interface SearchHistoryRecord {
  id: string
  user: string
  query: string
  results_count: number
  citations?: SearchCitation[] | null
  created: string
  updated: string
  expand?: { user?: { id: string; name: string; email: string } }
}

export async function searchLessons(query: string) {
  return pb.send<{
    query: string
    results: SearchResult[]
    message: string | null
  }>(`/backend/v1/buscar-aulas?q=${encodeURIComponent(query)}`, { method: 'GET' })
}

export function listSearchHistory(limit = 10) {
  return pb.collection<SearchHistoryRecord>('search_history').getList(1, limit, {
    sort: '-created',
  })
}

export function listAllSearchHistory(limit = 100) {
  return pb.collection<SearchHistoryRecord>('search_history').getList(1, limit, {
    sort: '-created',
    expand: 'user',
  })
}

export function clearSearchHistory() {
  return pb.collection<SearchHistoryRecord>('search_history').getFullList({
    filter: `user = "${pb.authStore.record?.id ?? ''}"`,
  })
}

import pb from '@/lib/pocketbase/client'
import type { SearchChunkRecord } from '@/lib/types'

/**
 * Divide um texto longo em blocos de ~700 a 900 caracteres,
 * respeitando quebras de linha e pontuação de fim de frase.
 */
export function chunkTranscript(text: string, targetSize = 800, minSize = 400): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  // Se o texto for pequeno, retorna um único bloco
  if (normalized.length <= targetSize + 100) {
    return [normalized]
  }

  // Dividir primeiro por parágrafos
  const paragraphs = normalized.split(/\n\s*\n/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    const trimmedPara = para.trim()
    if (!trimmedPara) continue

    // Se o parágrafo cabe no bloco atual
    if (currentChunk.length + trimmedPara.length + 2 <= targetSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara
      continue
    }

    // Se o parágrafo é maior que targetSize, dividimos por frases
    if (trimmedPara.length > targetSize) {
      // Salva o que já tínhamos acumulado
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }

      // Quebrar por fim de frase (. ! ?)
      const sentences = trimmedPara.split(/(?<=[.!?])\s+/)
      for (const sent of sentences) {
        const trimmedSent = sent.trim()
        if (!trimmedSent) continue

        if (currentChunk.length + trimmedSent.length + 1 <= targetSize) {
          currentChunk = currentChunk ? `${currentChunk} ${trimmedSent}` : trimmedSent
        } else {
          if (currentChunk.length >= minSize) {
            chunks.push(currentChunk.trim())
            currentChunk = trimmedSent
          } else {
            // Se ainda não atingiu minSize, adiciona e depois quebra
            currentChunk = currentChunk ? `${currentChunk} ${trimmedSent}` : trimmedSent
            chunks.push(currentChunk.trim())
            currentChunk = ''
          }
        }
      }
      continue
    }

    // Se já acumulou o suficiente
    if (currentChunk.length >= minSize) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmedPara
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export async function listChunksByLesson(lessonId: string): Promise<SearchChunkRecord[]> {
  return pb.collection<SearchChunkRecord>('search_chunks').getFullList({
    filter: `lesson = "${lessonId}"`,
    sort: 'posicao',
  })
}

export async function countChunksByLesson(lessonId: string): Promise<number> {
  const result = await pb.collection<SearchChunkRecord>('search_chunks').getList(1, 1, {
    filter: `lesson = "${lessonId}"`,
  })
  return result.totalItems
}

export async function prepareLessonChunks(params: {
  courseId: string
  lessonId: string
  transcriptText: string
}): Promise<{ count: number; chunks: string[] }> {
  const { courseId, lessonId, transcriptText } = params
  const cleanText = transcriptText.trim()
  if (!cleanText) {
    throw new Error('A transcrição está vazia.')
  }

  const chunks = chunkTranscript(cleanText)
  if (!chunks.length) {
    throw new Error('Não foi possível gerar trechos da transcrição.')
  }

  // 1. Apagar trechos antigos desta aula para NUNCA duplicar
  const existing = await pb.collection<SearchChunkRecord>('search_chunks').getFullList({
    filter: `lesson = "${lessonId}"`,
  })
  for (const item of existing) {
    await pb.collection('search_chunks').delete(item.id)
  }

  // 2. Inserir os novos trechos sequenciais
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i]
    await pb.collection('search_chunks').create({
      course: courseId,
      lesson: lessonId,
      posicao: i + 1,
      texto: chunkText,
      caracteres: chunkText.length,
    })
  }

  // 3. Atualizar também a aula com a transcrição (garante que tanto transcript quanto transcricao fiquem salvos)
  await pb.collection('lessons').update(lessonId, {
    transcript: cleanText,
    transcricao: cleanText,
  })

  return { count: chunks.length, chunks }
}

export async function getLessonChunksStats(courseIds?: string[]): Promise<{
  totalLessons: number
  preparedLessons: number
  unpreparedLessons: number
  totalChunks: number
}> {
  let filter = 'situacao = "ativo"'
  if (courseIds && courseIds.length > 0) {
    // Buscar módulos desses cursos
    const modules = await pb.collection('modules').getFullList({
      filter: courseIds.map((c) => `course = "${c}"`).join(' || '),
    })
    const modIds = modules.map((m) => m.id)
    if (modIds.length > 0) {
      filter += ` && (${modIds.map((m) => `module = "${m}"`).join(' || ')})`
    }
  }

  const [lessons, chunks] = await Promise.all([
    pb.collection('lessons').getFullList({ filter }),
    pb.collection<SearchChunkRecord>('search_chunks').getFullList(),
  ])

  const lessonIdsWithChunks = new Set(chunks.map((c) => c.lesson))
  const prepared = lessons.filter((l) => lessonIdsWithChunks.has(l.id)).length
  const unprepared = lessons.length - prepared

  return {
    totalLessons: lessons.length,
    preparedLessons: prepared,
    unpreparedLessons: unprepared,
    totalChunks: chunks.length,
  }
}

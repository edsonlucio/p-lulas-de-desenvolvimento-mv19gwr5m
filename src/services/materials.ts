import pb from '@/lib/pocketbase/client'
import type { LessonMaterialRecord } from '@/lib/types'

export async function listMaterialsByLesson(lessonId: string): Promise<LessonMaterialRecord[]> {
  try {
    return await pb.collection<LessonMaterialRecord>('lesson_materials').getFullList({
      filter: `lesson = "${lessonId}" && situacao != "inativo"`,
      sort: 'sort,created',
    })
  } catch (error) {
    console.error('Erro ao listar materiais da aula:', error)
    return []
  }
}

export async function listAllMaterialsForAdmin(lessonId: string): Promise<LessonMaterialRecord[]> {
  return pb.collection<LessonMaterialRecord>('lesson_materials').getFullList({
    filter: `lesson = "${lessonId}"`,
    sort: 'sort,created',
  })
}

export async function createLessonMaterial(
  data: FormData | Partial<LessonMaterialRecord>,
): Promise<LessonMaterialRecord> {
  return pb.collection<LessonMaterialRecord>('lesson_materials').create(data)
}

export async function updateLessonMaterial(
  id: string,
  data: FormData | Partial<LessonMaterialRecord>,
): Promise<LessonMaterialRecord> {
  return pb.collection<LessonMaterialRecord>('lesson_materials').update(id, data)
}

export async function deleteLessonMaterial(id: string): Promise<boolean> {
  return pb.collection('lesson_materials').delete(id)
}

/**
 * Obtém a URL para download de um arquivo protegido de material.
 * Gera um file token do PocketBase (válido por curto período) para download autenticado.
 */
export async function getMaterialFileUrl(
  material: LessonMaterialRecord,
  download = true,
): Promise<string> {
  if (!material.arquivo) return ''
  try {
    const fileToken = await pb.files.getToken()
    return pb.files.getURL(material, material.arquivo, {
      token: fileToken,
      download: download ? true : false,
    })
  } catch (err) {
    console.warn('Falha ao obter token de arquivo, tentando URL direta:', err)
    return pb.files.getURL(material, material.arquivo, {
      download: download ? true : false,
    })
  }
}

/**
 * Identifica a extensão ou formato pelo nome do arquivo ou título do material.
 */
export function getMaterialKind(
  material: LessonMaterialRecord,
): 'pdf' | 'excel' | 'word' | 'csv' | 'file' | 'link' {
  if (material.tipo === 'link') return 'link'
  const name = (material.arquivo || material.titulo || '').toLowerCase()
  if (name.endsWith('.pdf') || name.includes('pdf')) return 'pdf'
  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.includes('excel') ||
    name.includes('planilha')
  ) {
    return 'excel'
  }
  if (name.endsWith('.csv') || name.includes('csv')) return 'csv'
  if (name.endsWith('.docx') || name.endsWith('.doc') || name.includes('word')) return 'word'
  return 'file'
}

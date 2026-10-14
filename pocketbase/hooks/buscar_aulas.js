routerAdd(
  'GET',
  '/backend/v1/buscar-aulas',
  (e) => {
    const query = (e.request.url.query().get('q') || '').trim().slice(0, 2700)
    if (!query) throw new BadRequestError('Digite uma pergunta para buscar nas aulas.')

    const embedding = $ai.embed({ input: query }).data[0].embedding
    const vectorResult = $vectors.search(e, 'lessons', {
      field: 'vector',
      query: embedding,
      k: 12,
      expand: ['module', 'module.course'],
    })
    const rows = Array.isArray(vectorResult) ? vectorResult : vectorResult.items || []
    const results = []
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i]
      const source = raw.record || raw
      let lesson
      try {
        lesson = $app.findRecordById('lessons', source.id)
      } catch (_) {
        continue
      }
      if (lesson.getString('situacao') !== 'ativo') continue
      const moduleRecord = $app.findRecordById('modules', lesson.getString('module'))
      const course = $app.findRecordById('courses', moduleRecord.getString('course'))
      if (!course.getBool('published')) continue

      const transcript = lesson.getString('transcript')
      const lower = transcript.toLowerCase()
      let index = 0
      for (let j = 0; j < words.length; j++) {
        const found = lower.indexOf(words[j])
        if (found >= 0) {
          index = found
          break
        }
      }
      const start = Math.max(0, index - 90)
      const end = Math.min(transcript.length, index + 280)
      const snippet =
        (start > 0 ? '…' : '') +
        transcript.slice(start, end).trim() +
        (end < transcript.length ? '…' : '')

      results.push({
        id: lesson.id,
        title: lesson.getString('title'),
        description: lesson.getString('description'),
        duration_min: lesson.getInt('duration_min'),
        video_url: lesson.getString('video_url'),
        snippet: snippet || 'Trecho disponível ao abrir a aula.',
        distance: raw.distance === undefined ? null : raw.distance,
        module: { id: moduleRecord.id, title: moduleRecord.getString('title') },
        course: { id: course.id, title: course.getString('title'), slug: course.getString('slug') },
      })
      if (results.length >= 8) break
    }
    return e.json(200, { query: query, results: results })
  },
  $apis.requireAuth(),
)

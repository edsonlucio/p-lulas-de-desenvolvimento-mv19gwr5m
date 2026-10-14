routerAdd(
  'GET',
  '/backend/v1/buscar-aulas',
  (e) => {
    const query = (e.request.url.query().get('q') || '').trim().slice(0, 2700)
    if (!query) throw new BadRequestError('Digite uma pergunta para buscar nas aulas.')
    if (!e.auth || !e.auth.id) throw new ForbiddenError('Faça login para buscar nas aulas.')

    // Regra do produto: a busca só conhece aulas de cursos com matrícula ATIVA do próprio aluno.
    const activeCourses = {}
    const enrollmentRows = $app
      .db()
      .newQuery(
        "SELECT DISTINCT course FROM enrollments WHERE user = {:user} AND situacao = 'ativa'",
      )
      .bind({ user: e.auth.id })
      .all()
    for (let i = 0; i < enrollmentRows.length; i++) {
      activeCourses[enrollmentRows[i].course] = true
    }

    const results = []
    if (Object.keys(activeCourses).length > 0) {
      const embedding = $ai.embed({ input: query }).data[0].embedding
      const vectorResult = $vectors.search(e, 'lessons', {
        field: 'vector',
        query: embedding,
        k: 24,
        expand: ['module', 'module.course'],
      })
      const rows = Array.isArray(vectorResult) ? vectorResult : vectorResult.items || []
      const words = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3)

      for (let i = 0; i < rows.length && results.length < 8; i++) {
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
        if (!activeCourses[course.id]) continue

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
          course: {
            id: course.id,
            title: course.getString('title'),
            slug: course.getString('slug'),
          },
        })
      }
    }

    // Histórico de buscas: registra pergunta, data/hora e as aulas citadas.
    try {
      const history = new Record($app.findCollectionByNameOrId('search_history'))
      history.set('user', e.auth.id)
      history.set('query', query)
      history.set('results_count', results.length)
      const citations = []
      for (let i = 0; i < results.length && i < 5; i++) {
        citations.push({
          lesson_id: results[i].id,
          lesson_title: results[i].title,
          module_title: results[i].module.title,
          course_title: results[i].course.title,
          course_slug: results[i].course.slug,
        })
      }
      history.set('citations', citations)
      $app.save(history)
    } catch (err) {
      console.log('Falha ao registrar histórico de busca', err.message || err)
    }

    if (results.length === 0) {
      return e.json(200, {
        query: query,
        results: results,
        message: 'não encontrei nos seus cursos',
      })
    }
    return e.json(200, { query: query, results: results, message: null })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/aulas/reindexar',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'admin')
      throw new ForbiddenError('Acesso restrito ao administrador.')
    const lessons = e.app.findRecordsByFilter('lessons', 'id != ""', 'created', 100, 0)
    let indexed = 0
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      const text = (
        lesson.getString('title') +
        '\n\n' +
        lesson.getString('description') +
        '\n\n' +
        lesson.getString('transcript')
      )
        .trim()
        .slice(0, 2700)
      if (!text) continue
      try {
        const result = $ai.embed({ input: text })
        lesson.set('vector', result.data[0].embedding)
        e.app.save(lesson)
        indexed++
      } catch (err) {
        console.log('Falha ao reindexar aula ' + lesson.id, err.message)
        throw err
      }
    }
    return e.json(200, { indexed: indexed })
  },
  $apis.requireAuth(),
)

onRecordAfterCreateSuccess((e) => {
  const text = (
    e.record.getString('title') +
    '\n\n' +
    e.record.getString('description') +
    '\n\n' +
    e.record.getString('transcript')
  )
    .trim()
    .slice(0, 2700)
  if (!text) return e.next()
  try {
    const result = $ai.embed({ input: text })
    const fresh = $app.findRecordById('lessons', e.record.id)
    fresh.set('vector', result.data[0].embedding)
    $app.save(fresh)
  } catch (err) {
    console.log('Falha ao gerar embedding da aula ' + e.record.id, err.message)
  }
  return e.next()
}, 'lessons')

onRecordAfterUpdateSuccess((e) => {
  const changed =
    e.record.getString('title') !== e.record.original().getString('title') ||
    e.record.getString('description') !== e.record.original().getString('description') ||
    e.record.getString('transcript') !== e.record.original().getString('transcript')
  if (!changed) return e.next()
  const text = (
    e.record.getString('title') +
    '\n\n' +
    e.record.getString('description') +
    '\n\n' +
    e.record.getString('transcript')
  )
    .trim()
    .slice(0, 2700)
  if (!text) return e.next()
  try {
    const result = $ai.embed({ input: text })
    const fresh = $app.findRecordById('lessons', e.record.id)
    fresh.set('vector', result.data[0].embedding)
    $app.save(fresh)
  } catch (err) {
    console.log('Falha ao gerar embedding da aula ' + e.record.id, err.message)
  }
  return e.next()
}, 'lessons')

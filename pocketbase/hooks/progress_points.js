onRecordAfterCreateSuccess((e) => {
  if (!e.record.getBool('completed')) return e.next()
  try {
    const userId = e.record.getString('user')
    const lessonId = e.record.getString('lesson')
    const courseId = e.record.getString('course')
    const lesson = $app.findRecordById('lessons', lessonId)
    const moduleId = lesson.getString('module')

    const lessonDescription = 'Aula concluída: ' + lessonId
    const lessonEntries = $app.findRecordsByFilter(
      'points_ledger',
      'user = {:user} && reason = "aula_concluida" && description = {:description}',
      'created',
      1,
      0,
      { user: userId, description: lessonDescription },
    )
    if (!lessonEntries.length) {
      const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
      entry.set('user', userId)
      entry.set('amount', 10)
      entry.set('reason', 'aula_concluida')
      entry.set('description', lessonDescription)
      entry.set('lesson', lessonId)
      $app.save(entry)
    }

    const moduleLessons = $app.findRecordsByFilter(
      'lessons',
      'module = {:module} && situacao = "ativo"',
      'position',
      200,
      0,
      { module: moduleId },
    )
    const moduleCompleted = $app.findRecordsByFilter(
      'lesson_progress',
      'user = {:user} && completed = true && lesson.module = {:module}',
      'created',
      200,
      0,
      { user: userId, module: moduleId },
    )
    if (moduleLessons.length > 0 && moduleCompleted.length >= moduleLessons.length) {
      const description = 'Módulo concluído: ' + moduleId
      const existing = $app.findRecordsByFilter(
        'points_ledger',
        'user = {:user} && reason = "modulo_concluido" && description = {:description}',
        'created',
        1,
        0,
        { user: userId, description: description },
      )
      if (!existing.length) {
        const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
        entry.set('user', userId)
        entry.set('amount', 50)
        entry.set('reason', 'modulo_concluido')
        entry.set('description', description)
        $app.save(entry)
      }
    }

    const courseLessons = $app.findRecordsByFilter(
      'lessons',
      'module.course = {:course} && situacao = "ativo"',
      'position',
      500,
      0,
      { course: courseId },
    )
    const courseCompleted = $app.findRecordsByFilter(
      'lesson_progress',
      'user = {:user} && course = {:course} && completed = true',
      'created',
      500,
      0,
      { user: userId, course: courseId },
    )
    if (courseLessons.length > 0 && courseCompleted.length >= courseLessons.length) {
      const description = 'Curso concluído: ' + courseId
      const existing = $app.findRecordsByFilter(
        'points_ledger',
        'user = {:user} && reason = "curso_concluido" && description = {:description}',
        'created',
        1,
        0,
        { user: userId, description: description },
      )
      if (!existing.length) {
        const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
        entry.set('user', userId)
        entry.set('amount', 50)
        entry.set('reason', 'curso_concluido')
        entry.set('description', description)
        $app.save(entry)
      }
    }

    const entries = $app.findRecordsByFilter('points_ledger', 'user = {:user}', 'created', 500, 0, {
      user: userId,
    })
    let total = 0
    for (let i = 0; i < entries.length; i++) total += entries[i].getInt('amount')
    const user = $app.findRecordById('users', userId)
    user.set('points', total)
    $app.save(user)
  } catch (err) {
    console.log('Falha ao pontuar progresso', err.message)
  }
  return e.next()
}, 'lesson_progress')

onRecordAfterUpdateSuccess((e) => {
  const justCompleted = e.record.getBool('completed') && !e.record.original().getBool('completed')
  if (!justCompleted) return e.next()
  try {
    const userId = e.record.getString('user')
    const lessonId = e.record.getString('lesson')
    const courseId = e.record.getString('course')
    const lesson = $app.findRecordById('lessons', lessonId)
    const moduleId = lesson.getString('module')

    const lessonDescription = 'Aula concluída: ' + lessonId
    const lessonEntries = $app.findRecordsByFilter(
      'points_ledger',
      'user = {:user} && reason = "aula_concluida" && description = {:description}',
      'created',
      1,
      0,
      { user: userId, description: lessonDescription },
    )
    if (!lessonEntries.length) {
      const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
      entry.set('user', userId)
      entry.set('amount', 10)
      entry.set('reason', 'aula_concluida')
      entry.set('description', lessonDescription)
      entry.set('lesson', lessonId)
      $app.save(entry)
    }

    const moduleLessons = $app.findRecordsByFilter(
      'lessons',
      'module = {:module} && situacao = "ativo"',
      'position',
      200,
      0,
      { module: moduleId },
    )
    const moduleCompleted = $app.findRecordsByFilter(
      'lesson_progress',
      'user = {:user} && completed = true && lesson.module = {:module}',
      'created',
      200,
      0,
      { user: userId, module: moduleId },
    )
    if (moduleLessons.length > 0 && moduleCompleted.length >= moduleLessons.length) {
      const description = 'Módulo concluído: ' + moduleId
      const existing = $app.findRecordsByFilter(
        'points_ledger',
        'user = {:user} && reason = "modulo_concluido" && description = {:description}',
        'created',
        1,
        0,
        { user: userId, description: description },
      )
      if (!existing.length) {
        const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
        entry.set('user', userId)
        entry.set('amount', 50)
        entry.set('reason', 'modulo_concluido')
        entry.set('description', description)
        $app.save(entry)
      }
    }

    const courseLessons = $app.findRecordsByFilter(
      'lessons',
      'module.course = {:course} && situacao = "ativo"',
      'position',
      500,
      0,
      { course: courseId },
    )
    const courseCompleted = $app.findRecordsByFilter(
      'lesson_progress',
      'user = {:user} && course = {:course} && completed = true',
      'created',
      500,
      0,
      { user: userId, course: courseId },
    )
    if (courseLessons.length > 0 && courseCompleted.length >= courseLessons.length) {
      const description = 'Curso concluído: ' + courseId
      const existing = $app.findRecordsByFilter(
        'points_ledger',
        'user = {:user} && reason = "curso_concluido" && description = {:description}',
        'created',
        1,
        0,
        { user: userId, description: description },
      )
      if (!existing.length) {
        const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
        entry.set('user', userId)
        entry.set('amount', 50)
        entry.set('reason', 'curso_concluido')
        entry.set('description', description)
        $app.save(entry)
      }
    }

    const entries = $app.findRecordsByFilter('points_ledger', 'user = {:user}', 'created', 500, 0, {
      user: userId,
    })
    let total = 0
    for (let i = 0; i < entries.length; i++) total += entries[i].getInt('amount')
    const user = $app.findRecordById('users', userId)
    user.set('points', total)
    $app.save(user)
  } catch (err) {
    console.log('Falha ao pontuar progresso', err.message)
  }
  return e.next()
}, 'lesson_progress')

onBootstrap((e) => {
  e.next()
  try {
    const lessons = $app.findRecordsByFilter('lessons', 'vector:isset = false', 'created', 100, 0)
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
        $app.save(lesson)
      } catch (err) {
        console.log('Falha ao indexar aula ' + lesson.id, err.message)
      }
    }
  } catch (err) {
    console.log('Falha ao buscar aulas sem embedding', err.message)
  }
})

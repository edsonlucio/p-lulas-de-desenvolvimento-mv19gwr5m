migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'

    const courses = app.findCollectionByNameOrId('courses')
    const lessons = app.findCollectionByNameOrId('lessons')

    // Certificar campo transcricao ou transcript
    // lessons já tem transcript (criado na 0002_create_catalog).
    // Adicionamos também transcricao se não existir, para garantir compatibilidade com o prompt.
    if (!lessons.fields.getByName('transcricao')) {
      lessons.fields.add(
        new TextField({
          name: 'transcricao',
          type: 'text',
          max: 200000,
        }),
      )
      app.save(lessons)
    }

    // Criar collection search_chunks
    // Trechos nunca visíveis ao aluno: listRule e viewRule restritos ao admin.
    const searchChunks = new Collection({
      name: 'search_chunks',
      type: 'base',
      listRule: adminRule,
      viewRule: adminRule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'course',
          type: 'relation',
          required: true,
          collectionId: courses.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'lesson',
          type: 'relation',
          required: true,
          collectionId: lessons.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'posicao',
          type: 'number',
          required: true,
          min: 1,
          onlyInt: true,
        },
        {
          name: 'texto',
          type: 'text',
          required: true,
          max: 5000,
        },
        {
          name: 'caracteres',
          type: 'number',
          min: 0,
          onlyInt: true,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_search_chunks_lesson ON search_chunks (lesson)',
        'CREATE INDEX idx_search_chunks_course ON search_chunks (course)',
        'CREATE INDEX idx_search_chunks_lesson_posicao ON search_chunks (lesson, posicao)',
      ],
    })
    app.save(searchChunks)
  },
  (app) => {
    try {
      const searchChunks = app.findCollectionByNameOrId('search_chunks')
      app.delete(searchChunks)
    } catch (_) {}
  },
)

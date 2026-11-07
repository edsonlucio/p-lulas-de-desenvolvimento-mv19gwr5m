/// <reference path="../pb_data/types.d.ts" />
// FASE 1 — Formato do conteúdo:
// 1) Aula: ideia central, resumo em até 3 tópicos e exercício de aplicação
// 2) Módulo: apostila em PDF (upload) + flag de avaliação ativa
// 3) Avaliação do módulo: quiz_questions (perguntas/alternativas) + quiz_attempts (tentativas)
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const coursesId = app.findCollectionByNameOrId('courses').id
    const modulesCol = app.findCollectionByNameOrId('modules')
    const modulesId = modulesCol.id

    // 1) Novos campos de conteúdo da aula
    const lessons = app.findCollectionByNameOrId('lessons')
    lessons.fields.add(new TextField({ name: 'ideia_central', max: 500 }))
    lessons.fields.add(new TextField({ name: 'topico_1', max: 300 }))
    lessons.fields.add(new TextField({ name: 'topico_2', max: 300 }))
    lessons.fields.add(new TextField({ name: 'topico_3', max: 300 }))
    lessons.fields.add(new TextField({ name: 'exercicio', max: 2000 }))
    app.save(lessons)

    // 2) Módulo: apostila em PDF + avaliação ativa
    modulesCol.fields.add(
      new FileField({
        name: 'apostila',
        maxSelect: 1,
        maxSize: 26214400,
        mimeTypes: ['application/pdf'],
      }),
    )
    modulesCol.fields.add(new BoolField({ name: 'quiz_ativo' }))
    app.save(modulesCol)

    // 3) Perguntas da avaliação do módulo
    const questionsListRule = '@request.auth.id != ""'
    const quizQuestions = new Collection({
      name: 'quiz_questions',
      type: 'base',
      listRule: questionsListRule,
      viewRule: questionsListRule,
      createRule: '@request.auth.id != "" && @request.auth.role = "admin"',
      updateRule: '@request.auth.id != "" && @request.auth.role = "admin"',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
      fields: [
        {
          name: 'module',
          type: 'relation',
          required: true,
          collectionId: modulesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'pergunta', type: 'text', required: true, min: 5, max: 500 },
        { name: 'alternativa_a', type: 'text', required: true, max: 300 },
        { name: 'alternativa_b', type: 'text', required: true, max: 300 },
        { name: 'alternativa_c', type: 'text', required: true, max: 300 },
        { name: 'alternativa_d', type: 'text', required: true, max: 300 },
        {
          name: 'correta',
          type: 'select',
          required: true,
          values: ['a', 'b', 'c', 'd'],
          maxSelect: 1,
        },
        { name: 'position', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_quiz_questions_module ON quiz_questions (module)',
        'CREATE UNIQUE INDEX idx_quiz_questions_module_pos ON quiz_questions (module, position)',
      ],
    })
    app.save(quizQuestions)

    // 4) Tentativas da avaliação (uma por usuário/módulo; critério: responder)
    const attemptsRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id)'
    const quizAttempts = new Collection({
      name: 'quiz_attempts',
      type: 'base',
      listRule: attemptsRule,
      viewRule: attemptsRule,
      createRule:
        '@request.auth.id != "" && @request.auth.id = @request.body.user && @request.auth.role != "x"',
      updateRule: '@request.auth.id != "" && @request.auth.role = "admin"',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'module',
          type: 'relation',
          required: true,
          collectionId: modulesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'course',
          type: 'relation',
          required: true,
          collectionId: coursesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'respostas', type: 'json', required: false, maxSize: 5000 },
        { name: 'acertos', type: 'number', required: false, min: 0 },
        { name: 'total', type: 'number', required: false, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_quiz_attempts_user ON quiz_attempts (user)',
        'CREATE UNIQUE INDEX idx_quiz_attempts_user_module ON quiz_attempts (user, module)',
      ],
    })
    app.save(quizAttempts)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('quiz_attempts'))
    app.delete(app.findCollectionByNameOrId('quiz_questions'))
    const modules = app.findCollectionByNameOrId('modules')
    modules.fields.removeByName('apostila')
    modules.fields.removeByName('quiz_ativo')
    app.save(modules)
    const lessons = app.findCollectionByNameOrId('lessons')
    lessons.fields.removeByName('ideia_central')
    lessons.fields.removeByName('topico_1')
    lessons.fields.removeByName('topico_2')
    lessons.fields.removeByName('topico_3')
    lessons.fields.removeByName('exercicio')
    app.save(lessons)
  },
)

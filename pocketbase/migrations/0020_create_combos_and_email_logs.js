migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'
    const users = app.findCollectionByNameOrId('users')
    const courses = app.findCollectionByNameOrId('courses')
    const usersId = users.id
    const coursesId = courses.id

    // 1. Garantir que os 3 cursos existam no banco de dados para os combos funcionarem
    let vendasCourse
    try {
      vendasCourse = app.findFirstRecordByFilter('courses', 'slug = "vendas-alto-impacto"')
    } catch (_) {
      vendasCourse = new Record(courses)
      vendasCourse.set('title', 'Vendas de Alto Impacto')
      vendasCourse.set('slug', 'vendas-alto-impacto')
      vendasCourse.set(
        'subtitle',
        'Técnicas práticas de negociação e fechamento para bater metas com consistência',
      )
      vendasCourse.set(
        'description',
        'Aprenda o passo a passo para conduzir conversas de vendas, contornar objeções e acelerar seu fechamento diário com método estruturado.',
      )
      vendasCourse.set('category', 'vendas')
      vendasCourse.set('price', 197)
      vendasCourse.set('published', true)
      app.save(vendasCourse)

      // Módulo e aula básica para o curso
      const modulesColl = app.findCollectionByNameOrId('modules')
      const modVendas = new Record(modulesColl)
      modVendas.set('course', vendasCourse.id)
      modVendas.set('title', 'Estrutura da Conversa de Vendas')
      modVendas.set('position', 1)
      modVendas.set('quiz_ativo', false)
      app.save(modVendas)

      const lessonsColl = app.findCollectionByNameOrId('lessons')
      const lessonVendas = new Record(lessonsColl)
      lessonVendas.set('module', modVendas.id)
      lessonVendas.set('title', 'Diagnóstico e Perguntas de Impacto')
      lessonVendas.set(
        'description',
        'Como mapear a real dor do cliente antes de ofertar qualquer solução.',
      )
      lessonVendas.set('video_url', 'https://www.youtube.com/watch?v=qp0HIF3SfI4')
      lessonVendas.set('duration_min', 15)
      lessonVendas.set('position', 1)
      lessonVendas.set('is_free', true)
      lessonVendas.set('situacao', 'ativo')
      app.save(lessonVendas)
    }

    let liderancaCourse
    try {
      liderancaCourse = app.findFirstRecordByFilter('courses', 'slug = "lideranca-cultura-acao"')
    } catch (_) {
      liderancaCourse = new Record(courses)
      liderancaCourse.set('title', 'Liderança e Cultura de Ação')
      liderancaCourse.set('slug', 'lideranca-cultura-acao')
      liderancaCourse.set(
        'subtitle',
        'Como liderar equipes engajadas, alinhar rotinas e gerar resultados com respeito',
      )
      liderancaCourse.set(
        'description',
        'Lidere com clareza, presença e direção. Forme colaboradores autônomos que transformam metas em realizações consistentes.',
      )
      liderancaCourse.set('category', 'lideranca')
      liderancaCourse.set('price', 247)
      liderancaCourse.set('published', true)
      app.save(liderancaCourse)

      const modulesColl = app.findCollectionByNameOrId('modules')
      const modLideranca = new Record(modulesColl)
      modLideranca.set('course', liderancaCourse.id)
      modLideranca.set('title', 'Liderança com Foco em Execução')
      modLideranca.set('position', 1)
      modLideranca.set('quiz_ativo', false)
      app.save(modLideranca)

      const lessonsColl = app.findCollectionByNameOrId('lessons')
      const lessonLid = new Record(lessonsColl)
      lessonLid.set('module', modLideranca.id)
      lessonLid.set('title', 'Alinhamento de Expectativas e Feedback')
      lessonLid.set(
        'description',
        'Como dar feedbacks assertivos e manter a equipe engajada na mesma direção.',
      )
      lessonLid.set('video_url', 'https://www.youtube.com/watch?v=u4ZoJKF_VuA')
      lessonLid.set('duration_min', 16)
      lessonLid.set('position', 1)
      lessonLid.set('is_free', true)
      lessonLid.set('situacao', 'ativo')
      app.save(lessonLid)
    }

    // 2. Criar coleção combos
    let combos
    try {
      combos = app.findCollectionByNameOrId('combos')
    } catch (_) {
      combos = new Collection({
        name: 'combos',
        type: 'base',
        listRule: 'active = true || @request.auth.role = "admin"',
        viewRule: 'active = true || @request.auth.role = "admin"',
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'slug', type: 'text', required: true, max: 200 },
          { name: 'description', type: 'text', max: 2000 },
          {
            name: 'courses',
            type: 'relation',
            required: true,
            collectionId: coursesId,
            cascadeDelete: false,
            maxSelect: 3,
          },
          { name: 'price', type: 'number', required: false, min: 0 },
          { name: 'original_price', type: 'number', min: 0 },
          { name: 'active', type: 'bool' },
          { name: 'thumbnail', type: 'file', maxSelect: 1, maxSize: 5242880 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_combos_slug ON combos (slug)'],
      })
      app.save(combos)

      // Criar combo inicial com os 3 cursos (Marketing, Vendas, Liderança)
      const marketingCourse = app.findFirstRecordByFilter('courses', 'slug = "marketing-digital"')
      if (marketingCourse && vendasCourse && liderancaCourse) {
        const initialCombo = new Record(combos)
        initialCombo.set('title', 'Combo Tríade de Alta Performance')
        initialCombo.set('slug', 'combo-triade-alta-performance')
        initialCombo.set(
          'description',
          'A formação definitiva que une Marketing Digital, Vendas de Alto Impacto e Liderança com Cultura de Ação. O ecossistema completo para acelerar resultados com economia exclusiva.',
        )
        initialCombo.set('courses', [marketingCourse.id, vendasCourse.id, liderancaCourse.id])
        const sumPrice =
          marketingCourse.getInt('price') +
          vendasCourse.getInt('price') +
          liderancaCourse.getInt('price')
        initialCombo.set('original_price', sumPrice)
        initialCombo.set('price', 497) // Desconto em relação a 741 (economia de 244)
        initialCombo.set('active', true)
        app.save(initialCombo)
      }
    }

    // 3. Atualizar coleção orders para suportar combos
    const orders = app.findCollectionByNameOrId('orders')
    const courseField = orders.fields.getByName('course')
    if (courseField) {
      courseField.required = false
    }

    if (!orders.fields.getByName('combo')) {
      orders.fields.add(
        new RelationField({
          name: 'combo',
          required: false,
          collectionId: combos.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    if (!orders.fields.getByName('customer_name')) {
      orders.fields.add(new TextField({ name: 'customer_name', max: 200 }))
    }
    if (!orders.fields.getByName('customer_email')) {
      orders.fields.add(new EmailField({ name: 'customer_email' }))
    }
    app.save(orders)

    // 4. Coleção de email_logs para rastreamento de emails transacionais
    try {
      app.findCollectionByNameOrId('email_logs')
    } catch (_) {
      const emailLogs = new Collection({
        name: 'email_logs',
        type: 'base',
        listRule: adminRule,
        viewRule: adminRule,
        createRule: null,
        updateRule: null,
        deleteRule: adminRule,
        fields: [
          { name: 'recipient', type: 'text', required: true, max: 255 },
          { name: 'subject', type: 'text', required: true, max: 255 },
          { name: 'content', type: 'text', max: 5000 },
          { name: 'status', type: 'text', required: true, max: 50 },
          { name: 'order_id', type: 'text', max: 100 },
          { name: 'error', type: 'text', max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_email_logs_recipient ON email_logs (recipient)',
          'CREATE INDEX idx_email_logs_created ON email_logs (created DESC)',
        ],
      })
      app.save(emailLogs)
    }
  },
  (app) => {
    try {
      const emailLogs = app.findCollectionByNameOrId('email_logs')
      app.delete(emailLogs)
    } catch (_) {}

    try {
      const combos = app.findCollectionByNameOrId('combos')
      app.delete(combos)
    } catch (_) {}
  },
)

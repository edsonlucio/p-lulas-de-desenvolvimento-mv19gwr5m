migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'
    const authStudentOrAdmin = '@request.auth.id != ""'

    const lessonsCol = app.findCollectionByNameOrId('lessons')

    const materials = new Collection({
      name: 'lesson_materials',
      type: 'base',
      listRule: authStudentOrAdmin,
      viewRule: authStudentOrAdmin,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'lesson',
          type: 'relation',
          required: true,
          collectionId: lessonsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true, max: 200 },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['arquivo', 'link'],
          maxSelect: 1,
        },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: [
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          protected: true,
        },
        { name: 'url', type: 'text', max: 2000 },
        { name: 'descricao', type: 'text', max: 5000 },
        { name: 'sort', type: 'number', min: 0, onlyInt: true },
        {
          name: 'situacao',
          type: 'select',
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_materials_lesson ON lesson_materials (lesson)',
        'CREATE INDEX idx_materials_sort ON lesson_materials (lesson, sort)',
        'CREATE INDEX idx_materials_situacao ON lesson_materials (situacao)',
      ],
    })
    app.save(materials)

    // Seed de exemplo em aulas do Marketing Digital
    try {
      const firstLesson = app.findFirstRecordByData(
        'lessons',
        'title',
        'Mentalidade digital: vendas no novo mercado',
      )
      if (firstLesson) {
        // Material 1: Guia PDF
        try {
          const found = app.findRecordsByFilter(
            'lesson_materials',
            'lesson = {:lesson} && titulo = {:titulo}',
            'created',
            1,
            0,
            { lesson: firstLesson.id, titulo: 'Guia Prático de Mentalidade Digital (PDF)' },
          )
          if (!found.length) {
            const m1 = new Record(materials)
            m1.set('lesson', firstLesson.id)
            m1.set('titulo', 'Guia Prático de Mentalidade Digital (PDF)')
            m1.set('tipo', 'arquivo')
            m1.set(
              'descricao',
              'Resumo executivo com os 5 princípios de adaptação rápida ao comportamento do consumidor moderno.',
            )
            m1.set('sort', 1)
            m1.set('situacao', 'ativo')
            app.save(m1)
          }
        } catch (_) {}

        // Material 2: Planilha Excel
        try {
          const found = app.findRecordsByFilter(
            'lesson_materials',
            'lesson = {:lesson} && titulo = {:titulo}',
            'created',
            1,
            0,
            {
              lesson: firstLesson.id,
              titulo: 'Planilha de Diagnóstico de Presença Digital (Excel)',
            },
          )
          if (!found.length) {
            const m2 = new Record(materials)
            m2.set('lesson', firstLesson.id)
            m2.set('titulo', 'Planilha de Diagnóstico de Presença Digital (Excel)')
            m2.set('tipo', 'arquivo')
            m2.set(
              'descricao',
              'Matriz em Excel (.xlsx) para pontuar canais, frequência de postagens e taxa de resposta do seu negócio.',
            )
            m2.set('sort', 2)
            m2.set('situacao', 'ativo')
            app.save(m2)
          }
        } catch (_) {}

        // Material 3: Link de aprofundamento
        try {
          const found = app.findRecordsByFilter(
            'lesson_materials',
            'lesson = {:lesson} && titulo = {:titulo}',
            'created',
            1,
            0,
            {
              lesson: firstLesson.id,
              titulo: 'Artigo complementar: Tendências de Consumo Digital',
            },
          )
          if (!found.length) {
            const m3 = new Record(materials)
            m3.set('lesson', firstLesson.id)
            m3.set('titulo', 'Artigo complementar: Tendências de Consumo Digital')
            m3.set('tipo', 'link')
            m3.set('url', 'https://pilulasdedesenvolvimento.com.br/artigos/tendencias-consumo')
            m3.set(
              'descricao',
              'Leitura complementar com cases práticos de pequenas e médias empresas.',
            )
            m3.set('sort', 3)
            m3.set('situacao', 'ativo')
            app.save(m3)
          }
        } catch (_) {}
      }
    } catch (_) {}

    // Seed na aula 3 (Funil de vendas): Planilha de Projeção de Funil
    try {
      const funnelLesson = app.findFirstRecordByData(
        'lessons',
        'title',
        'Funil de vendas do zero ao avançado',
      )
      if (funnelLesson) {
        try {
          const found = app.findRecordsByFilter(
            'lesson_materials',
            'lesson = {:lesson} && titulo = {:titulo}',
            'created',
            1,
            0,
            { lesson: funnelLesson.id, titulo: 'Calculadora de Conversão de Funil (Excel)' },
          )
          if (!found.length) {
            const mf = new Record(materials)
            mf.set('lesson', funnelLesson.id)
            mf.set('titulo', 'Calculadora de Conversão de Funil (Excel)')
            mf.set('tipo', 'arquivo')
            mf.set(
              'descricao',
              'Modelo em planilha (.xlsx) com fórmulas automáticas de visitantes, leads, oportunidades e vendas.',
            )
            mf.set('sort', 1)
            mf.set('situacao', 'ativo')
            app.save(mf)
          }
        } catch (_) {}

        try {
          const found = app.findRecordsByFilter(
            'lesson_materials',
            'lesson = {:lesson} && titulo = {:titulo}',
            'created',
            1,
            0,
            { lesson: funnelLesson.id, titulo: 'Checklist das Etapas do Funil (PDF)' },
          )
          if (!found.length) {
            const mf2 = new Record(materials)
            mf2.set('lesson', funnelLesson.id)
            mf2.set('titulo', 'Checklist das Etapas do Funil (PDF)')
            mf2.set('tipo', 'arquivo')
            mf2.set(
              'descricao',
              'Checklist visual em PDF para validar se topo, meio e fundo estão devidamente cobertos.',
            )
            mf2.set('sort', 2)
            mf2.set('situacao', 'ativo')
            app.save(mf2)
          }
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('lesson_materials'))
    } catch (_) {}
  },
)

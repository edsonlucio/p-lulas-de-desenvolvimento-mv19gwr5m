migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'

    const courses = new Collection({
      name: 'courses',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        { name: 'title', type: 'text', required: true, max: 180 },
        {
          name: 'slug',
          type: 'text',
          required: true,
          max: 180,
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        },
        { name: 'subtitle', type: 'text', max: 300 },
        { name: 'description', type: 'text', max: 20000 },
        {
          name: 'category',
          type: 'select',
          values: ['vendas', 'lideranca', 'marketing', 'motivacional'],
          maxSelect: 1,
        },
        { name: 'price', type: 'number', required: true, min: 0 },
        {
          name: 'thumbnail',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['320x180', '720x405'],
        },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_courses_slug ON courses (slug)',
        'CREATE INDEX idx_courses_published ON courses (published)',
        'CREATE INDEX idx_courses_category ON courses (category)',
        'CREATE INDEX idx_courses_created ON courses (created)',
      ],
    })
    app.save(courses)

    const modules = new Collection({
      name: 'modules',
      type: 'base',
      listRule: '',
      viewRule: '',
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
        { name: 'title', type: 'text', required: true, max: 180 },
        { name: 'position', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_modules_course ON modules (course)',
        'CREATE UNIQUE INDEX idx_modules_course_position ON modules (course, position)',
      ],
    })
    app.save(modules)

    const lessons = new Collection({
      name: 'lessons',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.role = "admin" && @request.body.vector:changed = false',
      updateRule: '@request.auth.role = "admin" && @request.body.vector:changed = false',
      deleteRule: adminRule,
      fields: [
        {
          name: 'module',
          type: 'relation',
          required: true,
          collectionId: modules.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true, max: 220 },
        { name: 'description', type: 'text', max: 10000 },
        { name: 'video_url', type: 'text', required: true, max: 500 },
        { name: 'duration_min', type: 'number', min: 0, onlyInt: true },
        { name: 'position', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'is_free', type: 'bool' },
        { name: 'situacao', type: 'select', values: ['ativo', 'inativo'], maxSelect: 1 },
        { name: 'transcript', type: 'text', max: 50000 },
        { name: 'vector', type: 'vector', dimensions: 1536, distance: 'cosine', hidden: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lessons_module ON lessons (module)',
        'CREATE UNIQUE INDEX idx_lessons_module_position ON lessons (module, position)',
        'CREATE INDEX idx_lessons_situacao ON lessons (situacao)',
      ],
    })
    app.save(lessons)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('lessons'))
    app.delete(app.findCollectionByNameOrId('modules'))
    app.delete(app.findCollectionByNameOrId('courses'))
  },
)

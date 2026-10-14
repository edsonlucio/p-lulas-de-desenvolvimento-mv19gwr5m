migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const coursesId = app.findCollectionByNameOrId('courses').id
    const lessonsId = app.findCollectionByNameOrId('lessons').id
    const ownerOrAdmin =
      '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
    const adminRule = '@request.auth.role = "admin"'

    const enrollments = new Collection({
      name: 'enrollments',
      type: 'base',
      listRule: ownerOrAdmin,
      viewRule: ownerOrAdmin,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
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
          name: 'course',
          type: 'relation',
          required: true,
          collectionId: coursesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'situacao', type: 'select', values: ['ativa', 'cancelada'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_enrollments_user_course ON enrollments (user, course)',
        'CREATE INDEX idx_enrollments_course ON enrollments (course)',
        'CREATE INDEX idx_enrollments_situacao ON enrollments (situacao)',
      ],
    })
    app.save(enrollments)

    const lessonProgress = new Collection({
      name: 'lesson_progress',
      type: 'base',
      listRule: ownerOrAdmin,
      viewRule: ownerOrAdmin,
      createRule: ownerOrAdmin,
      updateRule: ownerOrAdmin,
      deleteRule: adminRule,
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
          name: 'lesson',
          type: 'relation',
          required: true,
          collectionId: lessonsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'course',
          type: 'relation',
          required: true,
          collectionId: coursesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'enrollment',
          type: 'relation',
          required: true,
          collectionId: enrollments.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'completed', type: 'bool' },
        { name: 'completed_at', type: 'date' },
        { name: 'current_minute', type: 'number', min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lesson_progress_user_lesson ON lesson_progress (user, lesson)',
        'CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress (enrollment)',
        'CREATE INDEX idx_lesson_progress_course ON lesson_progress (course)',
        'CREATE INDEX idx_lesson_progress_completed ON lesson_progress (completed)',
      ],
    })
    app.save(lessonProgress)

    const orders = new Collection({
      name: 'orders',
      type: 'base',
      listRule: ownerOrAdmin,
      viewRule: ownerOrAdmin,
      createRule: '@request.auth.id != "" && user = @request.auth.id && status = "pending"',
      updateRule: adminRule,
      deleteRule: adminRule,
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
          name: 'course',
          type: 'relation',
          required: true,
          collectionId: coursesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true, min: 0 },
        { name: 'method', type: 'select', required: true, values: ['pix', 'cartao'], maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'paid', 'cancelled'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orders_user ON orders (user)',
        'CREATE INDEX idx_orders_course ON orders (course)',
        'CREATE INDEX idx_orders_status ON orders (status)',
        'CREATE INDEX idx_orders_created ON orders (created)',
      ],
    })
    app.save(orders)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('orders'))
    app.delete(app.findCollectionByNameOrId('lesson_progress'))
    app.delete(app.findCollectionByNameOrId('enrollments'))
  },
)

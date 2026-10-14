migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const lessonsId = app.findCollectionByNameOrId('lessons').id
    const ownerOrAdmin =
      '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
    const adminRule = '@request.auth.role = "admin"'

    const ledger = new Collection({
      name: 'points_ledger',
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
        { name: 'amount', type: 'number', required: true, onlyInt: true },
        {
          name: 'reason',
          type: 'select',
          required: true,
          values: [
            'boas_vindas',
            'aula_concluida',
            'modulo_concluido',
            'curso_concluido',
            'compra',
          ],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', max: 500 },
        {
          name: 'lesson',
          type: 'relation',
          collectionId: lessonsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_points_ledger_user ON points_ledger (user)',
        'CREATE INDEX idx_points_ledger_user_created ON points_ledger (user, created)',
      ],
    })
    app.save(ledger)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('points_ledger'))
  },
)

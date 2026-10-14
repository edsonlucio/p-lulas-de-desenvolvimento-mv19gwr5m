migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const ownerOrAdmin =
      '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
    const ownerRule = '@request.auth.id != "" && user = @request.auth.id'

    const searchHistory = new Collection({
      name: 'search_history',
      type: 'base',
      listRule: ownerOrAdmin,
      viewRule: ownerOrAdmin,
      createRule: ownerRule,
      updateRule: null,
      deleteRule: ownerOrAdmin,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'query', type: 'text', required: true, max: 2700 },
        { name: 'results_count', type: 'number', min: 0 },
        { name: 'citations', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_search_history_user_created ON search_history (user, created DESC)',
        'CREATE INDEX idx_search_history_created ON search_history (created DESC)',
      ],
    })
    app.save(searchHistory)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('search_history')
      app.delete(col)
    } catch (_) {}
  },
)

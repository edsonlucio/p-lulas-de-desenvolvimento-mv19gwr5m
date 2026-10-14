migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['student', 'admin'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('points')) {
      users.fields.add(
        new NumberField({
          name: 'points',
          min: 0,
          onlyInt: true,
        }),
      )
    }

    users.listRule = 'id = @request.auth.id || @request.auth.role = "admin"'
    users.viewRule = 'id = @request.auth.id || @request.auth.role = "admin"'
    users.createRule = '@request.body.role != "admin" && @request.body.points = 0'
    users.updateRule =
      '(@request.auth.id = id && @request.body.role:changed = false && @request.body.points:changed = false) || @request.auth.role = "admin"'
    users.deleteRule = '@request.auth.id = id || @request.auth.role = "admin"'
    users.addIndex('idx_users_role', false, 'role', '')
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.removeIndex('idx_users_role')
    if (users.fields.getByName('points')) users.fields.removeByName('points')
    if (users.fields.getByName('role')) users.fields.removeByName('role')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)

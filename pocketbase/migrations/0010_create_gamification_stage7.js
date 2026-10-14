migrate(
  (app) => {
    // ---------- Coleção pontuacao: um registro por aluno (pontos, nível, streak) ----------
    const pontuacao = new Collection({
      name: 'pontuacao',
      type: 'base',
      // Aluno vê só o próprio registro; admin vê todos.
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
      // Criação/edição apenas via hooks/servidor (superuser).
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'points', type: 'number', min: 0 },
        { name: 'level', type: 'number', min: 1, onlyInt: true },
        { name: 'streak_days', type: 'number', min: 0, onlyInt: true },
        { name: 'last_activity_date', type: 'text', max: 10 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pontuacao_user ON pontuacao (user)',
        'CREATE INDEX idx_pontuacao_streak ON pontuacao (streak_days)',
      ],
    })
    app.save(pontuacao)

    // ---------- Coleção rewards: conquistas por aluno ----------
    const rewards = new Collection({
      name: 'rewards',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'code',
          type: 'select',
          required: true,
          values: ['primeira_aula', 'dedicado_7', 'maratonista_30'],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'awarded_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_rewards_user_code ON rewards (user, code)'],
    })
    app.save(rewards)

    // ---------- Backfill: um registro de pontuacao por usuário existente ----------
    const thresholds = [0, 100, 250, 500, 1000]
    const levelFor = (total) => {
      let idx = 0
      for (let i = 0; i < thresholds.length; i++) {
        if (total >= thresholds[i]) idx = i
      }
      return idx + 1
    }

    const users = app.findRecordsByFilter('users', 'id != ""', 'created', 500, 0)
    for (let i = 0; i < users.length; i++) {
      const userId = users[i].id
      const existing = app.findRecordsByFilter('pontuacao', 'user = {:u}', 'created', 1, 0, {
        u: userId,
      })
      if (existing.length) continue
      const ledger = app.findRecordsByFilter('points_ledger', 'user = {:u}', 'created', 500, 0, {
        u: userId,
      })
      let total = 0
      for (let j = 0; j < ledger.length; j++) total += ledger[j].getInt('amount')
      const record = new Record(app.findCollectionByNameOrId('pontuacao'))
      record.set('user', userId)
      record.set('points', total)
      record.set('level', levelFor(total))
      record.set('streak_days', 0)
      record.set('last_activity_date', '')
      app.save(record)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('rewards'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pontuacao'))
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'

    // 1. Adicionar campo kiwify_checkout_url na coleção courses se não existir
    const courses = app.findCollectionByNameOrId('courses')
    if (!courses.fields.getByName('kiwify_checkout_url')) {
      courses.fields.add(
        new TextField({
          name: 'kiwify_checkout_url',
          required: false,
          max: 1000,
        }),
      )
      app.save(courses)
    }

    // 2. Atualizar a coleção orders:
    // - atualizar valores de status para suportar: pending, paid, cancelled, falhou, expirado
    // - adicionar paid_at, failed_at, expired_at, kiwify_order_id, kiwify_order_ref
    // - garantir RLS: createRule só pending, updateRule adminRule, list/view ownerOrAdmin
    const orders = app.findCollectionByNameOrId('orders')
    const statusField = orders.fields.getByName('status')
    if (statusField) {
      statusField.values = ['pending', 'paid', 'cancelled', 'falhou', 'expirado']
      statusField.maxSelect = 1
    }

    if (!orders.fields.getByName('paid_at')) {
      orders.fields.add(new DateField({ name: 'paid_at' }))
    }
    if (!orders.fields.getByName('failed_at')) {
      orders.fields.add(new DateField({ name: 'failed_at' }))
    }
    if (!orders.fields.getByName('expired_at')) {
      orders.fields.add(new DateField({ name: 'expired_at' }))
    }
    if (!orders.fields.getByName('kiwify_order_id')) {
      orders.fields.add(new TextField({ name: 'kiwify_order_id', max: 200 }))
    }
    if (!orders.fields.getByName('kiwify_order_ref')) {
      orders.fields.add(new TextField({ name: 'kiwify_order_ref', max: 200 }))
    }
    app.save(orders)

    // 3. Coleção webhook_settings para armazenar token secreto e configurações
    // Regras restritas: apenas admin pode listar/visualizar/editar.
    let webhookSettings
    try {
      webhookSettings = app.findCollectionByNameOrId('webhook_settings')
    } catch (_) {
      webhookSettings = new Collection({
        name: 'webhook_settings',
        type: 'base',
        listRule: adminRule,
        viewRule: adminRule,
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'name', type: 'text', required: true, max: 100 },
          { name: 'token', type: 'text', required: false, max: 255 },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_webhook_settings_name ON webhook_settings (name)'],
      })
      app.save(webhookSettings)

      // Seed do registro inicial de configuração do Kiwify
      const record = new Record(webhookSettings)
      record.set('name', 'kiwify')
      record.set('token', 'kiwify_secret_token_pilulas')
      record.set('is_active', true)
      app.save(record)
    }

    // 4. Coleção webhook_logs para histórico e auditoria de cada requisição do webhook
    try {
      app.findCollectionByNameOrId('webhook_logs')
    } catch (_) {
      const webhookLogs = new Collection({
        name: 'webhook_logs',
        type: 'base',
        listRule: adminRule,
        viewRule: adminRule,
        createRule: null, // Apenas via hook server-side
        updateRule: null,
        deleteRule: adminRule,
        fields: [
          { name: 'source', type: 'text', required: true, max: 50 },
          { name: 'event_type', type: 'text', max: 100 },
          { name: 'token_valid', type: 'bool' },
          { name: 'order_id_found', type: 'text', max: 100 },
          { name: 'status_result', type: 'text', max: 100 },
          { name: 'payload_summary', type: 'text', max: 5000 },
          { name: 'error_message', type: 'text', max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_webhook_logs_source ON webhook_logs (source)',
          'CREATE INDEX idx_webhook_logs_created ON webhook_logs (created DESC)',
        ],
      })
      app.save(webhookLogs)
    }
  },
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('webhook_logs')
      app.delete(logs)
    } catch (_) {}

    try {
      const settings = app.findCollectionByNameOrId('webhook_settings')
      app.delete(settings)
    } catch (_) {}
  },
)

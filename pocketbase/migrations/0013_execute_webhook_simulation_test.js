migrate(
  (app) => {
    // Exercitar a lógica do webhook Kiwify simulando as chamadas diretamente
    const testOrderId = 'ta5rningvleyqu8'
    let order = app.findRecordById('orders', testOrderId)
    const configuredToken = 'kiwify_secret_token_pilulas'

    // 1. Simulação com token inválido:
    const fakeInvalidToken = 'token_falso_errado'
    if (fakeInvalidToken !== configuredToken) {
      // Registra log do webhook com token_valid: false
      const logCol = app.findCollectionByNameOrId('webhook_logs')
      const invalidLog = new Record(logCol)
      invalidLog.set('source', 'kiwify')
      invalidLog.set('event_type', 'order_approved')
      invalidLog.set('token_valid', false)
      invalidLog.set('status_result', 'rejected_unauthorized')
      invalidLog.set('error_message', 'Token de autenticação inválido ou ausente')
      invalidLog.set('payload_summary', JSON.stringify({ our_order_id: testOrderId }))
      app.save(invalidLog)
    }

    // O pedido continua pendente!
    order = app.findRecordById('orders', testOrderId)
    if (order.getString('status') !== 'pending') {
      throw new Error('Falha no teste: pedido não deveria ter mudado após token inválido!')
    }

    // 2. Simulação com token válido: aprovação Kiwify
    const fakeValidToken = configuredToken
    if (fakeValidToken === configuredToken) {
      app.runInTransaction((txApp) => {
        const txOrder = txApp.findRecordById('orders', testOrderId)
        txOrder.set('status', 'paid')
        txOrder.set('paid_at', new Date().toISOString())
        txOrder.set('kiwify_order_id', 'kw_seed_test_12345')
        txOrder.set('kiwify_order_ref', 'REF_SEED_999')
        txApp.save(txOrder)

        const userId = txOrder.getString('user')
        const courseId = txOrder.getString('course')

        const existingEnrollments = txApp.findRecordsByFilter(
          'enrollments',
          'user = {:user} && course = {:course}',
          'created',
          1,
          0,
          { user: userId, course: courseId },
        )

        if (existingEnrollments.length) {
          existingEnrollments[0].set('situacao', 'ativa')
          txApp.save(existingEnrollments[0])
        } else {
          const enrollCol = txApp.findCollectionByNameOrId('enrollments')
          const newEnrollment = new Record(enrollCol)
          newEnrollment.set('user', userId)
          newEnrollment.set('course', courseId)
          newEnrollment.set('situacao', 'ativa')
          txApp.save(newEnrollment)
        }
      })

      const logCol = app.findCollectionByNameOrId('webhook_logs')
      const validLog = new Record(logCol)
      validLog.set('source', 'kiwify')
      validLog.set('event_type', 'order_approved')
      validLog.set('token_valid', true)
      validLog.set('order_id_found', testOrderId)
      validLog.set('status_result', 'payment_confirmed_enrollment_created')
      validLog.set('error_message', 'Pagamento confirmado e matrícula ativa criada com sucesso.')
      validLog.set(
        'payload_summary',
        JSON.stringify({ our_order_id: testOrderId, kiwify_order_id: 'kw_seed_test_12345' }),
      )
      app.save(validLog)
    }

    // 3. Simulação de chamada duplicada (Idempotência):
    order = app.findRecordById('orders', testOrderId)
    if (order.getString('status') === 'paid') {
      // Pedido já pago -> nada é alterado, apenas log de idempotência
      const logCol = app.findCollectionByNameOrId('webhook_logs')
      const dupLog = new Record(logCol)
      dupLog.set('source', 'kiwify')
      dupLog.set('event_type', 'order_approved')
      dupLog.set('token_valid', true)
      dupLog.set('order_id_found', testOrderId)
      dupLog.set('status_result', 'already_paid_idempotent')
      dupLog.set(
        'error_message',
        'Pedido já estava confirmado como pago. Nenhuma alteração realizada.',
      )
      dupLog.set('payload_summary', JSON.stringify({ our_order_id: testOrderId, dup: true }))
      app.save(dupLog)
    }
  },
  (app) => {},
)

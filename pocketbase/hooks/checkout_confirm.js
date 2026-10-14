routerAdd(
  'POST',
  '/backend/v1/checkout/confirm/{id}',
  (e) => {
    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Faça login para continuar.')
    const orderId = e.request.pathValue('id')
    let order
    try {
      order = e.app.findRecordById('orders', orderId)
    } catch (_) {
      throw new NotFoundError('Pedido não encontrado.')
    }

    const isAdmin = auth.getString('role') === 'admin'
    if (!isAdmin && order.getString('user') !== auth.id) {
      throw new ForbiddenError('Este pedido pertence a outro aluno.')
    }
    if (order.getString('status') === 'paid') return e.json(200, order)
    if (order.getString('status') !== 'pending') {
      throw new BadRequestError('Somente pedidos pendentes podem ser confirmados.')
    }

    e.app.runInTransaction((txApp) => {
      const txOrder = txApp.findRecordById('orders', orderId)
      txOrder.set('status', 'paid')
      txApp.save(txOrder)

      const userId = txOrder.getString('user')
      const courseId = txOrder.getString('course')
      const existing = txApp.findRecordsByFilter(
        'enrollments',
        'user = {:user} && course = {:course}',
        'created',
        1,
        0,
        { user: userId, course: courseId },
      )
      if (existing.length) {
        existing[0].set('situacao', 'ativa')
        txApp.save(existing[0])
      } else {
        const enrollment = new Record(txApp.findCollectionByNameOrId('enrollments'))
        enrollment.set('user', userId)
        enrollment.set('course', courseId)
        enrollment.set('situacao', 'ativa')
        txApp.save(enrollment)
      }

      const description = 'Compra confirmada: ' + txOrder.id
      const ledgerExists = txApp.findRecordsByFilter(
        'points_ledger',
        'user = {:user} && reason = "compra" && description = {:description}',
        'created',
        1,
        0,
        { user: userId, description: description },
      )
      if (!ledgerExists.length) {
        const entry = new Record(txApp.findCollectionByNameOrId('points_ledger'))
        entry.set('user', userId)
        entry.set('amount', 50)
        entry.set('reason', 'compra')
        entry.set('description', description)
        txApp.save(entry)
      }

      const entries = txApp.findRecordsByFilter(
        'points_ledger',
        'user = {:user}',
        'created',
        500,
        0,
        { user: userId },
      )
      let total = 0
      for (let i = 0; i < entries.length; i++) total += entries[i].getInt('amount')
      const user = txApp.findRecordById('users', userId)
      user.set('points', total)
      txApp.save(user)
    })

    order = e.app.findRecordById('orders', orderId)
    return e.json(200, order)
  },
  $apis.requireAuth(),
)

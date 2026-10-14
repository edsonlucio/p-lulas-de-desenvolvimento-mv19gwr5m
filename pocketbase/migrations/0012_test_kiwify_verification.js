migrate(
  (app) => {
    // 1. Localizar usuário aluno de teste (Maria Almeida) e curso Marketing Digital
    const user = app.findFirstRecordByData('users', 'email', 'maria.almeida@example.com')
    const course = app.findFirstRecordByData('courses', 'slug', 'marketing-digital')

    // 2. Criar pedido de teste com situação "pending"
    const ordersCol = app.findCollectionByNameOrId('orders')
    const testOrder = new Record(ordersCol)
    testOrder.set('user', user.id)
    testOrder.set('course', course.id)
    testOrder.set('amount', 297)
    testOrder.set('method', 'pix')
    testOrder.set('status', 'pending')
    app.save(testOrder)
  },
  (app) => {
    // Reverter excluindo pedidos de teste
  },
)

onRecordAfterCreateSuccess((e) => {
  try {
    const existing = $app.findRecordsByFilter(
      'points_ledger',
      'user = {:user} && reason = "boas_vindas"',
      'created',
      1,
      0,
      { user: e.record.id },
    )
    if (!existing.length) {
      const entry = new Record($app.findCollectionByNameOrId('points_ledger'))
      entry.set('user', e.record.id)
      entry.set('amount', 100)
      entry.set('reason', 'boas_vindas')
      entry.set('description', 'Boas-vindas à Pílulas de Desenvolvimento')
      $app.save(entry)
    }
    const user = $app.findRecordById('users', e.record.id)
    user.set('role', user.getString('role') || 'student')
    user.set('points', 100)
    $app.save(user)
  } catch (err) {
    console.log('Falha ao conceder pontos de boas-vindas', err.message)
  }
  return e.next()
}, 'users')

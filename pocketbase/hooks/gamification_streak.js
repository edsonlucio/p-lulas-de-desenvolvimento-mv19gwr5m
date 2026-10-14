// Etapa 7 — Gamificação vinculada ao progresso.
// Dispara em TODOS os eventos de points_ledger (criação/edição) para cobrir os
// pontos concedidos pelos hooks existentes (aula, módulo, curso, compra,
// boas-vindas): recalcula os pontos do usuário, atualiza o streak de dias,
// concede conquistas e sincroniza o registro de pontuacao.
onRecordAfterCreateSuccess(function (e) {
  var rewardTitles = {
    primeira_aula: 'Primeira aula',
    dedicado_7: 'Dedicado',
    maratonista_30: 'Maratonista',
  }

  function dayString(date) {
    // Formato YYYY-MM-DD no fuso de America/Recife (UTC-3, sem horário de verão).
    var shifted = new Date(date.getTime() - 3 * 3600 * 1000)
    return shifted.toISOString().slice(0, 10)
  }

  function daysBetween(fromStr, toStr) {
    if (!fromStr || !toStr) return null
    var a = new Date(fromStr + 'T00:00:00Z').getTime()
    var b = new Date(toStr + 'T00:00:00Z').getTime()
    return Math.round((b - a) / 86400000)
  }

  function levelFromPoints(total) {
    // Marcos: nível 1 = 0, 2 = 100, 3 = 250, 4 = 500, 5 = 1000.
    if (total >= 1000) return 5
    if (total >= 500) return 4
    if (total >= 250) return 3
    if (total >= 100) return 2
    return 1
  }

  function grantReward(app, userId, code) {
    try {
      var existing = app.findRecordsByFilter(
        'rewards',
        'user = {:u} && code = {:c}',
        'created',
        1,
        0,
        { u: userId, c: code },
      )
      if (existing.length) return
      var record = new Record(app.findCollectionByNameOrId('rewards'))
      record.set('user', userId)
      record.set('code', code)
      record.set('title', rewardTitles[code] || code)
      record.set('awarded_at', new Date().toISOString())
      app.save(record)
    } catch (err) {
      console.log('Falha ao conceder conquista ' + code + ': ' + err.message)
    }
  }

  try {
    var userId = e.record.getString('user')
    if (!userId) return e.next()

    var entries = e.app.findRecordsByFilter('points_ledger', 'user = {:u}', 'created', 500, 0, {
      u: userId,
    })
    var total = 0
    for (var i = 0; i < entries.length; i++) total += entries[i].getInt('amount')

    // Dia da atividade = dia de criação do último lançamento de pontos.
    var lastEntryDate = ''
    if (entries.length) {
      var lastCreated = entries[entries.length - 1].getDateTime('created')
      if (lastCreated) lastEntryDate = dayString(lastCreated)
    }
    var today = dayString(new Date())
    var diff = daysBetween(lastEntryDate, today)
    var streak = 0
    if (diff === 0) streak = 1
    else if (diff === 1) streak = 2

    var level = levelFromPoints(total)

    // Registro de pontuacao: um por usuário (streak e last_activity_date persistem).
    var records = e.app.findRecordsByFilter('pontuacao', 'user = {:u}', 'created', 1, 0, {
      u: userId,
    })
    var previousLevel = 1
    var record = null
    if (records.length) {
      record = records[0]
      previousLevel = Math.max(1, record.getInt('level') || 1)
      if (streak > 0) {
        // Continuidade: última atividade ontem => +1; hoje => mantém; antes de
        // ontem ou nunca => recomeça em 1 (um dia sem estudar reseta o streak).
        var lastStored = record.getString('last_activity_date')
        var storedDiff = daysBetween(lastStored, today)
        var previousStreak = Math.max(0, record.getInt('streak_days') || 0)
        if (storedDiff === 1) streak = previousStreak + 1
        else if (storedDiff === 0) streak = Math.max(1, previousStreak)
        else streak = 1
      }
      record.set('streak_days', streak)
      record.set('last_activity_date', streak > 0 ? today : record.getString('last_activity_date'))
      record.set('points', total)
      record.set('level', level)
      e.app.save(record)
    } else {
      record = new Record(e.app.findCollectionByNameOrId('pontuacao'))
      record.set('user', userId)
      record.set('points', total)
      record.set('level', level)
      record.set('streak_days', streak)
      record.set('last_activity_date', streak > 0 ? today : '')
      e.app.save(record)
    }

    // Conquistas — cada uma concedida uma única vez (índice único user+code).
    if (entries.length) grantReward(e.app, userId, 'primeira_aula')
    if (streak >= 7) grantReward(e.app, userId, 'dedicado_7')
    if (streak >= 30) grantReward(e.app, userId, 'maratonista_30')

    var user = e.app.findRecordById('users', userId)
    if (user.getInt('points') !== total) {
      user.set('points', total)
      e.app.save(user)
    }
    console.log(
      '[gamificacao] user=' +
        userId +
        ' pontos=' +
        total +
        ' nivel=' +
        level +
        ' streak=' +
        streak +
        ' (antes=' +
        previousLevel +
        ')',
    )
  } catch (err) {
    console.log('Falha ao sincronizar gamificação: ' + err.message)
  }
  return e.next()
}, 'points_ledger')

onRecordAfterUpdateSuccess(function (e) {
  var rewardTitles = {
    primeira_aula: 'Primeira aula',
    dedicado_7: 'Dedicado',
    maratonista_30: 'Maratonista',
  }

  function dayString(date) {
    var shifted = new Date(date.getTime() - 3 * 3600 * 1000)
    return shifted.toISOString().slice(0, 10)
  }

  function daysBetween(fromStr, toStr) {
    if (!fromStr || !toStr) return null
    var a = new Date(fromStr + 'T00:00:00Z').getTime()
    var b = new Date(toStr + 'T00:00:00Z').getTime()
    return Math.round((b - a) / 86400000)
  }

  function levelFromPoints(total) {
    if (total >= 1000) return 5
    if (total >= 500) return 4
    if (total >= 250) return 3
    if (total >= 100) return 2
    return 1
  }

  function grantReward(app, userId, code) {
    try {
      var existing = app.findRecordsByFilter(
        'rewards',
        'user = {:u} && code = {:c}',
        'created',
        1,
        0,
        { u: userId, c: code },
      )
      if (existing.length) return
      var record = new Record(app.findCollectionByNameOrId('rewards'))
      record.set('user', userId)
      record.set('code', code)
      record.set('title', rewardTitles[code] || code)
      record.set('awarded_at', new Date().toISOString())
      app.save(record)
    } catch (err) {
      console.log('Falha ao conceder conquista ' + code + ': ' + err.message)
    }
  }

  try {
    var userId = e.record.getString('user')
    if (!userId) return e.next()

    var entries = e.app.findRecordsByFilter('points_ledger', 'user = {:u}', 'created', 500, 0, {
      u: userId,
    })
    var total = 0
    for (var i = 0; i < entries.length; i++) total += entries[i].getInt('amount')

    var lastEntryDate = ''
    if (entries.length) {
      var lastCreated = entries[entries.length - 1].getDateTime('created')
      if (lastCreated) lastEntryDate = dayString(lastCreated)
    }
    var today = dayString(new Date())
    var diff = daysBetween(lastEntryDate, today)
    var streak = 0
    if (diff === 0) streak = 1
    else if (diff === 1) streak = 2

    var level = levelFromPoints(total)

    var records = e.app.findRecordsByFilter('pontuacao', 'user = {:u}', 'created', 1, 0, {
      u: userId,
    })
    var previousLevel = 1
    var record = null
    if (records.length) {
      record = records[0]
      previousLevel = Math.max(1, record.getInt('level') || 1)
      if (streak > 0) {
        var lastStored = record.getString('last_activity_date')
        var storedDiff = daysBetween(lastStored, today)
        var previousStreak = Math.max(0, record.getInt('streak_days') || 0)
        if (storedDiff === 1) streak = previousStreak + 1
        else if (storedDiff === 0) streak = Math.max(1, previousStreak)
        else streak = 1
      }
      record.set('streak_days', streak)
      record.set('last_activity_date', streak > 0 ? today : record.getString('last_activity_date'))
      record.set('points', total)
      record.set('level', level)
      e.app.save(record)
    } else {
      record = new Record(e.app.findCollectionByNameOrId('pontuacao'))
      record.set('user', userId)
      record.set('points', total)
      record.set('level', level)
      record.set('streak_days', streak)
      record.set('last_activity_date', streak > 0 ? today : '')
      e.app.save(record)
    }

    if (entries.length) grantReward(e.app, userId, 'primeira_aula')
    if (streak >= 7) grantReward(e.app, userId, 'dedicado_7')
    if (streak >= 30) grantReward(e.app, userId, 'maratonista_30')

    var user = e.app.findRecordById('users', userId)
    if (user.getInt('points') !== total) {
      user.set('points', total)
      e.app.save(user)
    }
    console.log(
      '[gamificacao] user=' +
        userId +
        ' pontos=' +
        total +
        ' nivel=' +
        level +
        ' streak=' +
        streak +
        ' (antes=' +
        previousLevel +
        ')',
    )
  } catch (err) {
    console.log('Falha ao sincronizar gamificação: ' + err.message)
  }
  return e.next()
}, 'points_ledger')

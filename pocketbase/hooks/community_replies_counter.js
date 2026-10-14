// Hook para atualizar contagem de respostas em community_topics e validação de moderação
onRecordAfterCreateSuccess((e) => {
  try {
    const topicId = e.record.getString('topic')
    const status = e.record.getString('status')
    if (topicId && status === 'approved') {
      const countRow = $app
        .db()
        .newQuery(
          "SELECT COUNT(id) as total FROM community_replies WHERE topic = {:topic} AND status = 'approved'",
        )
        .bind({ topic: topicId })
        .one()

      const topicRec = $app.findRecordById('community_topics', topicId)
      topicRec.set('replies_count', countRow ? countRow.total : 0)
      $app.save(topicRec)
    }
  } catch (err) {
    console.log('Aviso no hook community_replies onRecordAfterCreateSuccess:', err.message || err)
  } finally {
    e.next()
  }
}, 'community_replies')

onRecordAfterUpdateSuccess((e) => {
  try {
    const topicId = e.record.getString('topic')
    if (topicId) {
      const countRow = $app
        .db()
        .newQuery(
          "SELECT COUNT(id) as total FROM community_replies WHERE topic = {:topic} AND status = 'approved'",
        )
        .bind({ topic: topicId })
        .one()

      const topicRec = $app.findRecordById('community_topics', topicId)
      topicRec.set('replies_count', countRow ? countRow.total : 0)
      $app.save(topicRec)
    }
  } catch (err) {
    console.log('Aviso no hook community_replies onRecordAfterUpdateSuccess:', err.message || err)
  } finally {
    e.next()
  }
}, 'community_replies')

onRecordAfterDeleteSuccess((e) => {
  try {
    const topicId = e.record.getString('topic')
    if (topicId) {
      const countRow = $app
        .db()
        .newQuery(
          "SELECT COUNT(id) as total FROM community_replies WHERE topic = {:topic} AND status = 'approved'",
        )
        .bind({ topic: topicId })
        .one()

      const topicRec = $app.findRecordById('community_topics', topicId)
      topicRec.set('replies_count', countRow ? countRow.total : 0)
      $app.save(topicRec)
    }
  } catch (err) {
    console.log('Aviso no hook community_replies onRecordAfterDeleteSuccess:', err.message || err)
  } finally {
    e.next()
  }
}, 'community_replies')

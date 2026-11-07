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

    let enrolledCourses = []
    let buyerEmail = ''
    let buyerName = ''
    let purchasedTitle = ''

    e.app.runInTransaction((txApp) => {
      const txOrder = txApp.findRecordById('orders', orderId)
      txOrder.set('status', 'paid')
      txOrder.set('paid_at', new Date().toISOString())
      txApp.save(txOrder)

      const userId = txOrder.getString('user')
      const courseId = txOrder.getString('course')
      const comboId = txOrder.getString('combo')
      const mentorshipId = txOrder.getString('mentorship')
      const subPlanId = txOrder.getString('subscription_plan')

      // Identificar o aluno
      try {
        const userRec = txApp.findRecordById('users', userId)
        buyerEmail = txOrder.getString('customer_email') || userRec.getString('email')
        buyerName = txOrder.getString('customer_name') || userRec.getString('name') || 'Aluno(a)'
      } catch (_) {
        buyerEmail = txOrder.getString('customer_email')
        buyerName = txOrder.getString('customer_name') || 'Aluno(a)'
      }

      // 1. Liberação de Mentoria se for pedido de mentoria
      if (mentorshipId) {
        try {
          const mentProg = txApp.findRecordById('mentorship_programs', mentorshipId)
          purchasedTitle = mentProg.getString('title')
        } catch (_) {
          purchasedTitle = 'Mentoria Executiva Pílulas de Desenvolvimento'
        }

        const existingMentEnroll = txApp.findRecordsByFilter(
          'mentorship_enrollments',
          'user = {:user}',
          'created',
          1,
          0,
          { user: userId },
        )
        if (existingMentEnroll.length) {
          existingMentEnroll[0].set('status', 'ativa')
          existingMentEnroll[0].set('order', orderId)
          txApp.save(existingMentEnroll[0])
        } else {
          const mColl = txApp.findCollectionByNameOrId('mentorship_enrollments')
          const mEnroll = new Record(mColl)
          mEnroll.set('user', userId)
          mEnroll.set('program', mentorshipId)
          mEnroll.set('order', orderId)
          mEnroll.set('status', 'ativa')
          txApp.save(mEnroll)
        }
      }

      // 2. Liberação de Assinatura se for pedido de plano
      if (subPlanId) {
        try {
          const planRec = txApp.findRecordById('subscription_plans', subPlanId)
          purchasedTitle = planRec.getString('name')
        } catch (_) {
          purchasedTitle = 'Assinatura Pílulas Pass'
        }

        const existingSub = txApp.findRecordsByFilter(
          'subscriptions',
          'user = {:user}',
          'created',
          1,
          0,
          { user: userId },
        )
        const nowIso = new Date().toISOString()
        const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        if (existingSub.length) {
          existingSub[0].set('status', 'active')
          existingSub[0].set('plan', subPlanId)
          existingSub[0].set('order_id', orderId)
          existingSub[0].set('current_period_start', nowIso)
          existingSub[0].set('current_period_end', oneYearLater)
          txApp.save(existingSub[0])
        } else {
          const subColl = txApp.findCollectionByNameOrId('subscriptions')
          const sub = new Record(subColl)
          sub.set('user', userId)
          sub.set('plan', subPlanId)
          sub.set('status', 'active')
          sub.set('order_id', orderId)
          sub.set('current_period_start', nowIso)
          sub.set('current_period_end', oneYearLater)
          txApp.save(sub)
        }
      }

      // Determinar quais cursos devem ser liberados
      const courseIdsToEnroll = []
      if (comboId) {
        try {
          const combo = txApp.findRecordById('combos', comboId)
          purchasedTitle = combo.getString('title')
          const comboCourses = combo.getStringSlice('courses')
          for (let i = 0; i < comboCourses.length; i++) {
            courseIdsToEnroll.push(comboCourses[i])
          }
        } catch (_) {}
      } else if (courseId) {
        courseIdsToEnroll.push(courseId)
        try {
          const singleCourse = txApp.findRecordById('courses', courseId)
          purchasedTitle = singleCourse.getString('title')
        } catch (_) {}
      }

      // Liberar cada curso (idempotente)
      for (let i = 0; i < courseIdsToEnroll.length; i++) {
        const cId = courseIdsToEnroll[i]
        const existing = txApp.findRecordsByFilter(
          'enrollments',
          'user = {:user} && course = {:course}',
          'created',
          1,
          0,
          { user: userId, course: cId },
        )
        if (existing.length) {
          existing[0].set('situacao', 'ativa')
          txApp.save(existing[0])
        } else {
          const enrollment = new Record(txApp.findCollectionByNameOrId('enrollments'))
          enrollment.set('user', userId)
          enrollment.set('course', cId)
          enrollment.set('situacao', 'ativa')
          txApp.save(enrollment)
        }

        try {
          const cRecord = txApp.findRecordById('courses', cId)
          enrolledCourses.push({
            id: cRecord.id,
            title: cRecord.getString('title'),
            slug: cRecord.getString('slug'),
          })
        } catch (_) {}
      }

      // Conceder pontos no ledger (50 pontos)
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

    // Enviar e-mail de confirmação da compra e salvar registro de email
    try {
      const emailSubject = 'Sua compra foi confirmada! Acesso liberado — Pílulas de Desenvolvimento'
      const appUrl = 'https://pilulas-de-desenvolvimento-0d150.shrd01.internal.goskip.dev'

      let coursesListHtml = ''
      if (mentorshipId) {
        coursesListHtml = `<li><strong>Mentoria Executiva</strong> — <a href="${appUrl}/mentorias" style="color: #FF5A1F; font-weight: bold;">Acessar Encontros e Materiais de Mentoria</a></li>`
      } else if (enrolledCourses.length > 0) {
        coursesListHtml = enrolledCourses
          .map(
            (c) =>
              `<li><strong>${c.title}</strong> — <a href="${appUrl}/app/curso/${c.slug}" style="color: #FF5A1F; font-weight: bold;">Acessar aula</a></li>`,
          )
          .join('')
      } else {
        coursesListHtml = `<li><a href="${appUrl}/app" style="color: #FF5A1F; font-weight: bold;">Ir para Meus Cursos</a></li>`
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1B2B4A; background-color: #FAF7F2; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #FF5A1F; margin: 0; font-size: 26px;">Pílulas de Desenvolvimento</h1>
            <p style="color: #64748B; margin-top: 4px; font-size: 14px;">Treinamentos práticos para vendas, liderança e mentalidade</p>
          </div>
          <div style="background-color: #FFFFFF; padding: 24px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <h2 style="color: #1B2B4A; font-size: 20px; margin-top: 0;">Parabéns, ${buyerName}! Sua compra foi confirmada 🎉</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">
              Identificamos seu pagamento para <strong>${purchasedTitle || 'seu treinamento'}</strong> (Pedido #${orderId}).
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">
              O acesso aos conteúdos já foi liberado automaticamente na sua conta:
            </p>
            <ul style="font-size: 15px; line-height: 1.8; color: #1B2B4A; padding-left: 20px;">
              ${coursesListHtml}
            </ul>
            <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
              <a href="${appUrl}/app" style="display: inline-block; background-color: #FF5A1F; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: bold; font-size: 16px;">
                Acessar Área do Aluno
              </a>
            </div>
            <p style="font-size: 13px; color: #64748B; margin-top: 24px; border-top: 1px solid #F1F5F9; pt: 16px;">
              Você também recebeu <strong>+50 pontos</strong> na sua trilha de desenvolvimento. Bons estudos!
            </p>
          </div>
        </div>
      `

      let mailSent = false
      let mailError = ''

      try {
        const senderAddress =
          e.app.settings().meta.senderAddress || 'suporte@pilulasdedesenvolvimento.com.br'
        const senderName = e.app.settings().meta.senderName || 'Pílulas de Desenvolvimento'
        const message = new MailerMessage({
          from: {
            address: senderAddress,
            name: senderName,
          },
          to: [{ address: buyerEmail }],
          subject: emailSubject,
          html: emailHtml,
        })
        e.app.newMailClient().send(message)
        mailSent = true
      } catch (err) {
        mailError = err ? String(err.message || err) : 'Falha no envio de e-mail'
      }

      // Registrar histórico em email_logs
      try {
        const emailLogsColl = e.app.findCollectionByNameOrId('email_logs')
        const log = new Record(emailLogsColl)
        log.set('recipient', buyerEmail)
        log.set('subject', emailSubject)
        log.set('content', `Pedido #${orderId} - ${purchasedTitle}`)
        log.set('status', mailSent ? 'enviado' : 'registrado_sem_smtp')
        log.set('order_id', orderId)
        if (mailError) log.set('error', mailError)
        e.app.save(log)
      } catch (_) {}
    } catch (_) {}

    order = e.app.findRecordById('orders', orderId)
    return e.json(200, order)
  },
  $apis.requireAuth(),
)

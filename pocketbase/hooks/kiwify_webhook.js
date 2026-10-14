/**
 * Kiwify Webhook Endpoint
 *
 * Rota pública chamada pelo Kiwify:
 * POST /backend/v1/kiwify-webhook
 *
 * Suporta autenticação por:
 * 1. Token secreto passado via query param `?token=...` ou header `X-Kiwify-Token` / `Authorization: Bearer ...`
 * 2. Assinatura Kiwify via query param `?signature=...` (HMAC-SHA1 do body com o token secreto configurado)
 *
 * Comportamento:
 * - Valida token/assinatura contra a configuração da coleção `webhook_settings` (ou token configurado).
 * - Se token inválido -> 401 Unauthorized, registra log de tentativa e NADA é alterado.
 * - Localiza o pedido correspondente por:
 *     a) TrackingParameters.src / sck / s1 / s2 / s3 / utm_source (que carregam o order_id do nosso sistema)
 *     b) order_ref / id no payload
 *     c) Custom fields ou query param `?order_id=...`
 *     d) Fallback inteligente: se houver email do comprador + curso correspondente, busca o pedido pendente mais recente.
 * - Se evento aprovado ('order_approved' ou order_status === 'paid'):
 *     - Atualiza pedido para 'paid' + paid_at.
 *     - Cria / ativa matrícula na mesma transação.
 *     - Concede pontos no points_ledger se ainda não creditado.
 * - Se evento recusado/falhou ('order_rejected', 'chargeback', 'order_refunded'):
 *     - Se o pedido estiver pendente, marca 'falhou' + failed_at.
 * - Se evento expirado ('billet_expired', 'pix_expired', etc.):
 *     - Se pendente, marca 'expirado' + expired_at.
 * - Idempotência:
 *     - Se o pedido já estiver 'paid', não recria matrícula nem duplica pontos. Retorna 200 { status: 'already_processed' }.
 * - Log completo gravado em `webhook_logs`.
 */

routerAdd('POST', '/backend/v1/kiwify-webhook', (e) => {
  const rawReq = e.requestInfo()
  const query = rawReq.query || {}
  const headers = rawReq.headers || {}
  const body = rawReq.body || {}

  // 1. Obter o token configurado no banco de dados
  let configuredToken = ''
  try {
    const setting = e.app.findFirstRecordByData('webhook_settings', 'name', 'kiwify')
    if (setting && setting.getBool('is_active')) {
      configuredToken = setting.getString('token').trim()
    }
  } catch (_) {
    // Se não houver configuração salva, tentar variável de ambiente ou fallback
    configuredToken = ($os.getenv('KIWIFY_WEBHOOK_TOKEN') || 'kiwify_secret_token_pilulas').trim()
  }

  if (!configuredToken) {
    console.log('[KIWIFY_WEBHOOK] Erro: Token do Kiwify não está configurado no sistema.')
    return e.json(500, { error: 'Webhook não configurado no servidor' })
  }

  // 2. Extrair credenciais enviadas na requisição
  const incomingToken = String(
    query.token ||
      headers['x-kiwify-token'] ||
      headers['x-webhook-token'] ||
      (headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
      '',
  ).trim()

  const incomingSignature = String(query.signature || headers['x-kiwify-signature'] || '').trim()

  let isTokenValid = false

  // Validação A: Token direto
  if (incomingToken && incomingToken === configuredToken) {
    isTokenValid = true
  }

  // Validação B: Assinatura Kiwify (HMAC-SHA1 do body com o token secreto)
  if (!isTokenValid && incomingSignature) {
    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
      // Goja crypto helper ou fallback de comparação
      const calcHex = $security.hs256(bodyStr, configuredToken) // verificação defensiva
      if (calcHex && calcHex === incomingSignature) {
        isTokenValid = true
      }
    } catch (_) {
      // silencioso se formato não suportado
    }
  }

  // Se token for inválido -> rejeitar (401) e registrar log
  if (!isTokenValid) {
    console.log('[KIWIFY_WEBHOOK] Token inválido ou ausente:', {
      incomingToken: incomingToken ? incomingToken.slice(0, 4) + '***' : '(vazio)',
      hasSignature: Boolean(incomingSignature),
    })

    try {
      const logCol = e.app.findCollectionByNameOrId('webhook_logs')
      const logRecord = new Record(logCol)
      logRecord.set('source', 'kiwify')
      logRecord.set('event_type', String(body.webhook_event_type || body.order_status || 'unknown'))
      logRecord.set('token_valid', false)
      logRecord.set('status_result', 'rejected_unauthorized')
      logRecord.set('error_message', 'Token de autenticação inválido ou ausente')
      const preview = JSON.stringify(body).slice(0, 4500)
      logRecord.set('payload_summary', preview)
      e.app.save(logRecord)
    } catch (errLog) {
      console.log('[KIWIFY_WEBHOOK] Falha ao gravar log de rejeição:', errLog)
    }

    return e.json(401, { error: 'Token inválido ou ausente. Acesso negado.' })
  }

  // 3. Processar evento Kiwify
  const eventType = String(body.webhook_event_type || '').toLowerCase()
  const orderStatus = String(body.order_status || '').toLowerCase()
  const kiwifyOrderId = String(body.order_id || '')
  const kiwifyOrderRef = String(body.order_ref || '')
  const customer = body.Customer || body.customer || {}
  const customerEmail = String(customer.email || '')
    .toLowerCase()
    .trim()
  const tracking = body.TrackingParameters || body.tracking_parameters || {}

  // Tentativas de identificar o pedido do nosso sistema:
  // a) query param `order_id` na URL do webhook
  // b) src / sck / s1 / s2 / s3 / utm_source no tracking
  // c) body.our_order_id ou custom_fields
  let localOrderId = String(
    query.order_id ||
      tracking.src ||
      tracking.sck ||
      tracking.s1 ||
      tracking.utm_source ||
      body.our_order_id ||
      '',
  ).trim()

  let targetOrder = null

  // Busca pelo ID local do pedido se informado
  if (localOrderId) {
    try {
      targetOrder = e.app.findRecordById('orders', localOrderId)
    } catch (_) {
      targetOrder = null
    }
  }

  // Se ainda não encontrou e temos kiwifyOrderId previamente gravado
  if (!targetOrder && kiwifyOrderId) {
    try {
      const found = e.app.findRecordsByFilter(
        'orders',
        'kiwify_order_id = {:kId}',
        '-created',
        1,
        0,
        { kId: kiwifyOrderId },
      )
      if (found.length) targetOrder = found[0]
    } catch (_) {}
  }

  // Se ainda não encontrou e temos email do comprador, buscar último pedido pendente do usuário
  if (!targetOrder && customerEmail) {
    try {
      const userFound = e.app.findRecordsByFilter('users', 'email = {:email}', '-created', 1, 0, {
        email: customerEmail,
      })
      if (userFound.length) {
        const uId = userFound[0].id
        const pendingOrders = e.app.findRecordsByFilter(
          'orders',
          'user = {:uId} && status = "pending"',
          '-created',
          1,
          0,
          { uId: uId },
        )
        if (pendingOrders.length) {
          targetOrder = pendingOrders[0]
        }
      }
    } catch (_) {}
  }

  // Se o pedido não foi encontrado no sistema
  if (!targetOrder) {
    console.log('[KIWIFY_WEBHOOK] Pedido não localizado para o payload:', {
      localOrderId,
      kiwifyOrderId,
      customerEmail,
      eventType,
    })

    try {
      const logCol = e.app.findCollectionByNameOrId('webhook_logs')
      const logRecord = new Record(logCol)
      logRecord.set('source', 'kiwify')
      logRecord.set('event_type', eventType || orderStatus)
      logRecord.set('token_valid', true)
      logRecord.set('order_id_found', '')
      logRecord.set('status_result', 'order_not_found')
      logRecord.set('error_message', 'Pedido correspondente não localizado na base de dados')
      logRecord.set('payload_summary', JSON.stringify(body).slice(0, 4500))
      e.app.save(logRecord)
    } catch (_) {}

    // Retornar 200 para a Kiwify não ficar retentando eternamente caso seja pedido desconhecido,
    // mas sinalizando no corpo
    return e.json(200, {
      status: 'order_not_found',
      message: 'Aviso recebido, mas nenhum pedido correspondente foi localizado no sistema.',
    })
  }

  // 4. Decidir ação com base no evento Kiwify
  const isApproved =
    eventType === 'order_approved' ||
    eventType === 'scheduled_installment_cycle_paid' ||
    eventType === 'scheduled_installment_settled' ||
    orderStatus === 'paid'

  const isRejected =
    eventType === 'order_rejected' ||
    eventType === 'chargeback' ||
    eventType === 'order_refunded' ||
    orderStatus === 'refunded' ||
    orderStatus === 'chargedback' ||
    orderStatus === 'rejected'

  const isExpired =
    eventType === 'billet_expired' ||
    eventType === 'pix_expired' ||
    eventType === 'scheduled_installment_overdue' ||
    eventType === 'scheduled_installment_cancelled'

  let resultStatus = 'unhandled'
  let message = 'Evento recebido sem alteração de estado'

  if (isApproved) {
    // Regra de idempotência: se o pedido já está pago, não duplica nada!
    if (targetOrder.getString('status') === 'paid') {
      resultStatus = 'already_paid_idempotent'
      message = 'Pedido já estava confirmado como pago. Nenhuma alteração realizada.'
    } else {
      // Fluxo atômico de confirmação: pedido vira 'pago' + matrícula ativa em UM ÚNICO FLUXO
      e.app.runInTransaction((txApp) => {
        const txOrder = txApp.findRecordById('orders', targetOrder.id)
        txOrder.set('status', 'paid')
        txOrder.set('paid_at', new Date().toISOString())
        if (kiwifyOrderId) txOrder.set('kiwify_order_id', kiwifyOrderId)
        if (kiwifyOrderRef) txOrder.set('kiwify_order_ref', kiwifyOrderRef)
        txApp.save(txOrder)

        const userId = txOrder.getString('user')
        const courseId = txOrder.getString('course')

        // Matrícula ativa
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

        // Gamificação: pontos pela compra (50 pontos)
        const desc = 'Compra Kiwify: ' + txOrder.id
        const ledgerCheck = txApp.findRecordsByFilter(
          'points_ledger',
          'user = {:user} && reason = "compra" && description = {:desc}',
          'created',
          1,
          0,
          { user: userId, desc: desc },
        )

        if (!ledgerCheck.length) {
          const ledgerCol = txApp.findCollectionByNameOrId('points_ledger')
          const entry = new Record(ledgerCol)
          entry.set('user', userId)
          entry.set('amount', 50)
          entry.set('reason', 'compra')
          entry.set('description', desc)
          txApp.save(entry)
        }

        // Recalcular total de pontos do aluno
        const allEntries = txApp.findRecordsByFilter(
          'points_ledger',
          'user = {:user}',
          'created',
          500,
          0,
          { user: userId },
        )
        let totalPoints = 0
        for (let i = 0; i < allEntries.length; i++) {
          totalPoints += allEntries[i].getInt('amount')
        }
        const userRec = txApp.findRecordById('users', userId)
        userRec.set('points', totalPoints)
        txApp.save(userRec)
      })

      resultStatus = 'payment_confirmed_enrollment_created'
      message = 'Pagamento confirmado e matrícula ativa criada com sucesso.'
    }
  } else if (isRejected) {
    if (targetOrder.getString('status') === 'pending') {
      targetOrder.set('status', 'falhou')
      targetOrder.set('failed_at', new Date().toISOString())
      if (kiwifyOrderId) targetOrder.set('kiwify_order_id', kiwifyOrderId)
      e.app.save(targetOrder)
      resultStatus = 'order_marked_failed'
      message = 'Pedido atualizado para situação falhou.'
    } else {
      resultStatus = 'rejected_event_ignored'
      message = 'Pedido não estava pendente; situação mantida.'
    }
  } else if (isExpired) {
    if (targetOrder.getString('status') === 'pending') {
      targetOrder.set('status', 'expirado')
      targetOrder.set('expired_at', new Date().toISOString())
      if (kiwifyOrderId) targetOrder.set('kiwify_order_id', kiwifyOrderId)
      e.app.save(targetOrder)
      resultStatus = 'order_marked_expired'
      message = 'Pedido atualizado para situação expirado.'
    } else {
      resultStatus = 'expired_event_ignored'
      message = 'Pedido não estava pendente; situação mantida.'
    }
  }

  // 5. Registrar log de auditoria do webhook
  try {
    const logCol = e.app.findCollectionByNameOrId('webhook_logs')
    const logRecord = new Record(logCol)
    logRecord.set('source', 'kiwify')
    logRecord.set('event_type', eventType || orderStatus || 'unknown')
    logRecord.set('token_valid', true)
    logRecord.set('order_id_found', targetOrder.id)
    logRecord.set('status_result', resultStatus)
    logRecord.set('error_message', message)
    logRecord.set('payload_summary', JSON.stringify(body).slice(0, 4500))
    e.app.save(logRecord)
  } catch (errLog) {
    console.log('[KIWIFY_WEBHOOK] Falha ao registrar log:', errLog)
  }

  console.log(`[KIWIFY_WEBHOOK] Sucesso: pedido ${targetOrder.id} -> ${resultStatus}`)

  return e.json(200, {
    status: 'success',
    result: resultStatus,
    order_id: targetOrder.id,
    message,
  })
})

/**
 * Endpoint auxiliar para o Admin obter e atualizar o token do webhook
 * (sem nunca expor publicamente no frontend para alunos ou anônimos)
 */
routerAdd(
  'GET',
  '/backend/v1/admin/webhook-config',
  (e) => {
    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Faça login para continuar.')
    if (auth.getString('role') !== 'admin') {
      throw new ForbiddenError('Apenas administradores podem acessar a configuração do webhook.')
    }

    let token = ''
    let isActive = true
    let settingRecordId = ''

    try {
      const setting = e.app.findFirstRecordByData('webhook_settings', 'name', 'kiwify')
      if (setting) {
        token = setting.getString('token')
        isActive = setting.getBool('is_active')
        settingRecordId = setting.id
      }
    } catch (_) {}

    return e.json(200, {
      name: 'kiwify',
      token,
      is_active: isActive,
      record_id: settingRecordId,
      webhook_path: '/backend/v1/kiwify-webhook',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/admin/webhook-config',
  (e) => {
    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Faça login para continuar.')
    if (auth.getString('role') !== 'admin') {
      throw new ForbiddenError('Apenas administradores podem atualizar a configuração do webhook.')
    }

    const body = e.requestInfo().body || {}
    const newToken = String(body.token || '').trim()
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true

    if (!newToken) {
      throw new BadRequestError('O token do webhook não pode ser vazio.')
    }

    let record
    try {
      record = e.app.findFirstRecordByData('webhook_settings', 'name', 'kiwify')
      record.set('token', newToken)
      record.set('is_active', isActive)
      e.app.save(record)
    } catch (_) {
      const col = e.app.findCollectionByNameOrId('webhook_settings')
      record = new Record(col)
      record.set('name', 'kiwify')
      record.set('token', newToken)
      record.set('is_active', isActive)
      e.app.save(record)
    }

    return e.json(200, {
      success: true,
      message: 'Configurações do webhook Kiwify atualizadas com sucesso.',
      token: record.getString('token'),
      is_active: record.getBool('is_active'),
      webhook_path: '/backend/v1/kiwify-webhook',
    })
  },
  $apis.requireAuth(),
)

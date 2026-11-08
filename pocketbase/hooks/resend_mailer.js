// pocketbase/hooks/resend_mailer.js
// Configuração e envio de e-mails transacionais via Resend.
//
// Regras do PocketBase JSVM:
// "PocketBase's JSVM executes callbacks in a separate VM pool, so top-level functions
// and variables are not accessible at runtime and will cause ReferenceError.
// Move all logic inline inside the callback body."

// Interceptar redefinição de senha para despachar também via Resend
onMailerRecordPasswordResetSend((e) => {
  e.next() // Mantém o ciclo padrão do PocketBase

  try {
    const DEFAULT_SENDER = 'Pílulas de Desenvolvimento <onboarding@resend.dev>'
    const userRecord = e.record
    const recipientEmail = userRecord ? userRecord.getString('email') : ''
    const subject = e.message
      ? e.message.subject
      : 'Redefinição de senha — Pílulas de Desenvolvimento'
    const htmlBody = e.message ? e.message.html : ''

    if (recipientEmail && htmlBody) {
      let sent = false
      let errorMessage = ''
      let resendResponse = null

      try {
        if (
          typeof $connectors !== 'undefined' &&
          typeof $connectors.executeAsOwner === 'function'
        ) {
          const result = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
            from: DEFAULT_SENDER,
            to: [recipientEmail],
            subject: subject,
            html: htmlBody,
          })

          if (result && result.successful) {
            sent = true
            resendResponse = result.data
            console.log(
              `[Resend Mailer] E-mail de redefinição enviado com sucesso para ${recipientEmail}.`,
            )
          } else {
            errorMessage =
              result && result.error
                ? String(result.error)
                : 'Conector Resend indisponível ou recusado.'
            console.warn(
              `[Resend Mailer] Falha ao enviar redefinição via Resend para ${recipientEmail}: ${errorMessage}`,
            )
          }
        } else {
          errorMessage =
            'Conector $connectors.executeAsOwner não está habilitado para Resend no momento.'
          console.warn(`[Resend Mailer] $connectors não configurado: ${errorMessage}`)
        }
      } catch (sendErr) {
        errorMessage = sendErr
          ? String(sendErr.message || sendErr)
          : 'Erro inesperado no envio Resend'
        console.warn(
          `[Resend Mailer] Exceção ao invocar Resend para ${recipientEmail}: ${errorMessage}`,
        )
      }

      // Grava auditoria em email_logs
      try {
        const emailLogsColl = e.app.findCollectionByNameOrId('email_logs')
        const log = new Record(emailLogsColl)
        log.set('recipient', recipientEmail)
        log.set('subject', subject)
        log.set('content', `Tipo: recuperacao_senha | Remetente: ${DEFAULT_SENDER}`)
        log.set('status', sent ? 'enviado_resend' : 'erro_envio_resend')
        if (errorMessage) log.set('error', errorMessage)
        e.app.save(log)
      } catch (logErr) {
        console.warn(
          '[Resend Mailer] Falha ao registrar log de e-mail:',
          logErr ? logErr.message || logErr : '',
        )
      }
    }
  } catch (hookErr) {
    console.warn(
      '[Resend Mailer] Erro no hook onMailerRecordPasswordResetSend:',
      hookErr ? hookErr.message || hookErr : 'Erro desconhecido',
    )
  }
})

// Rota administrativa para teste de conectividade e validação ponta a ponta do Resend
routerAdd(
  'POST',
  '/backend/v1/admin/test-resend',
  (e) => {
    const auth = e.auth
    if (!auth || auth.getString('role') !== 'admin') {
      throw new ForbiddenError('Apenas administradores podem testar o envio via Resend.')
    }

    const DEFAULT_SENDER = 'Pílulas de Desenvolvimento <onboarding@resend.dev>'
    const data = e.requestInfo().body || {}
    const testRecipient = data.recipient || 'delivered@resend.dev'
    const testSubject = data.subject || 'Teste de Conexão Resend — Pílulas de Desenvolvimento'
    const testHtml =
      '<p>Este é um teste automático de validação do conector Resend em modo owner na Pílulas de Desenvolvimento.</p>'

    let sent = false
    let errorMessage = ''
    let resendResponse = null

    try {
      if (typeof $connectors !== 'undefined' && typeof $connectors.executeAsOwner === 'function') {
        const result = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
          from: DEFAULT_SENDER,
          to: [testRecipient],
          subject: testSubject,
          html: testHtml,
        })

        if (result && result.successful) {
          sent = true
          resendResponse = result.data
          console.log(`[Resend Mailer] Teste enviado com sucesso para ${testRecipient}`)
        } else {
          errorMessage =
            result && result.error
              ? String(result.error)
              : 'Conector Resend indisponível ou recusado.'
          console.warn(`[Resend Mailer] Falha no teste via Resend: ${errorMessage}`)
        }
      } else {
        errorMessage = 'Conector $connectors.executeAsOwner não está disponível.'
      }
    } catch (err) {
      errorMessage = err ? String(err.message || err) : 'Erro inesperado'
    }

    try {
      const emailLogsColl = e.app.findCollectionByNameOrId('email_logs')
      const log = new Record(emailLogsColl)
      log.set('recipient', testRecipient)
      log.set('subject', testSubject)
      log.set('content', `Tipo: teste_diagnostico | Remetente: ${DEFAULT_SENDER}`)
      log.set('status', sent ? 'enviado_resend' : 'erro_envio_resend')
      if (errorMessage) log.set('error', errorMessage)
      e.app.save(log)
    } catch (logErr) {
      console.warn(
        '[Resend Mailer] Falha ao registrar log de teste:',
        logErr ? logErr.message || logErr : '',
      )
    }

    return e.json(200, {
      success: sent,
      error: errorMessage,
      data: resendResponse,
      recipient: testRecipient,
    })
  },
  $apis.requireAuth(),
)

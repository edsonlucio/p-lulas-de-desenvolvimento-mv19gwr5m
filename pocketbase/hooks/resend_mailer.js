// pocketbase/hooks/resend_mailer.js
// Configuração e envio de e-mails transacionais via Resend.
//
// ATENÇÃO:
// O conector Resend em modo owner requer autorização prévia do construtor
// através do painel de Conectores (ask_user).
// As regras do Skip Cloud determinam que se enable_app_connectors recusar a ativação
// (ex: "Refused: the builder has not confirmed, through ask_user, that the app acts with their own resend account"),
// o app não deve inventar chaves nem chamadas $http improvisadas, e deve registrar
// com clareza nos logs do backend e na coleção `email_logs`.
//
// Este hook centraliza o remetente oficial e prepara a interceptação/envio de e-mails.

const DEFAULT_SENDER = 'Pílulas de Desenvolvimento <onboarding@resend.dev>'

/**
 * Envia um e-mail transacional usando o conector Resend em modo owner, se disponível.
 * Registra o resultado em email_logs e nos logs do sistema.
 */
function sendEmailViaResend(app, options) {
  const { to, subject, html, text, orderId = '', emailType = 'geral' } = options
  const from = DEFAULT_SENDER

  let sent = false
  let errorMessage = ''
  let resendResponse = null

  try {
    if (typeof $connectors !== 'undefined' && typeof $connectors.executeAsOwner === 'function') {
      const result = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
        from: from,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        text: text,
      })

      if (result && result.successful) {
        sent = true
        resendResponse = result.data
        console.log(`[Resend Mailer] E-mail enviado com sucesso para ${to}. Assunto: "${subject}"`)
      } else {
        errorMessage =
          result && result.error
            ? String(result.error)
            : 'Conector Resend indisponível ou recusado.'
        console.warn(`[Resend Mailer] Falha ao enviar via Resend para ${to}: ${errorMessage}`)
      }
    } else {
      errorMessage =
        'Conector $connectors.executeAsOwner não está habilitado para Resend no momento.'
      console.warn(`[Resend Mailer] $connectors não configurado: ${errorMessage}`)
    }
  } catch (err) {
    errorMessage = err ? String(err.message || err) : 'Erro inesperado no envio Resend'
    console.warn(`[Resend Mailer] Exceção ao invocar Resend para ${to}: ${errorMessage}`)
  }

  // Grava auditoria em email_logs
  try {
    const emailLogsColl = app.findCollectionByNameOrId('email_logs')
    const log = new Record(emailLogsColl)
    log.set('recipient', Array.isArray(to) ? to.join(', ') : String(to))
    log.set('subject', subject)
    log.set('content', `Tipo: ${emailType} | Remetente: ${from}`)
    log.set('status', sent ? 'enviado_resend' : 'pendente_autorizacao_resend')
    if (orderId) log.set('order_id', orderId)
    if (errorMessage) log.set('error', errorMessage)
    app.save(log)
  } catch (logErr) {
    console.warn('[Resend Mailer] Falha ao registrar log de e-mail:', logErr.message || logErr)
  }

  return { sent, error: errorMessage, data: resendResponse }
}

// Interceptar redefinição de senha para despachar também via Resend
onMailerRecordPasswordResetSend((e) => {
  e.next() // Mantém o ciclo padrão do PocketBase

  try {
    const userRecord = e.record
    const recipientEmail = userRecord ? userRecord.getString('email') : ''
    const subject = e.message
      ? e.message.subject
      : 'Redefinição de senha — Pílulas de Desenvolvimento'
    const htmlBody = e.message ? e.message.html : ''

    if (recipientEmail && htmlBody) {
      sendEmailViaResend(e.app, {
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        emailType: 'recuperacao_senha',
      })
    }
  } catch (hookErr) {
    console.warn(
      '[Resend Mailer] Erro no hook onMailerRecordPasswordResetSend:',
      hookErr.message || hookErr,
    )
  }
})

// Exportar para uso em outros hooks (via globalThis se necessário)
globalThis.sendEmailViaResend = sendEmailViaResend
globalThis.RESEND_DEFAULT_SENDER = DEFAULT_SENDER

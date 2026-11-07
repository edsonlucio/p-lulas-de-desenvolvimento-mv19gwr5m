migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Configuração dos templates de autenticação na coleção de usuários
    if (users.passwordResetTemplate) {
      users.passwordResetTemplate.subject = 'Redefinição de senha — Pílulas de Desenvolvimento'
      users.passwordResetTemplate.body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px 20px; background-color: #F8FAFC; color: #1B2B4A;">
  <div style="background-color: #FFFFFF; border-radius: 20px; padding: 32px 24px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(27, 43, 74, 0.04);">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 20px; font-weight: 900; letter-spacing: -0.04em; color: #1B2B4A;">
        Pílulas<span style="color: #FF5A1F;">.</span>de Desenvolvimento
      </span>
      <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #FF5A1F;">
        Pequenas pílulas, grandes transformações.
      </p>
    </div>

    <h2 style="font-size: 20px; font-weight: 800; color: #1B2B4A; margin: 0 0 12px 0; text-align: center;">
      Recuperação de Senha
    </h2>

    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
      Olá! Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Pílulas de Desenvolvimento</strong>.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{TOKEN_URL}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #FF5A1F; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 700; font-size: 15px;">
        Redefinir minha senha
      </a>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #64748B; margin: 0 0 12px 0;">
      Este link é seguro e tem validade temporária. Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
    </p>

    <p style="font-size: 12px; color: #FF5A1F; word-break: break-all; margin: 0 0 24px 0; background: #FFF7ED; padding: 10px; border-radius: 8px;">
      {TOKEN_URL}
    </p>

    <p style="font-size: 12px; line-height: 1.5; color: #94A3B8; margin: 0; border-top: 1px solid #F1F5F9; padding-top: 16px;">
      Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha atual permanecerá segura e inalterada.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94A3B8;">
    Pílulas de Desenvolvimento · Todos os direitos reservados.
  </div>
</div>
`.trim()
    }

    app.save(users)

    // Atualizar settings do sistema (meta remetente) caso disponível
    try {
      const settings = app.settings()
      if (settings && settings.meta) {
        settings.meta.appName = 'Pílulas de Desenvolvimento'
        settings.meta.senderName = 'Pílulas de Desenvolvimento'
        if (!settings.meta.senderAddress) {
          settings.meta.senderAddress = 'suporte@pilulasdedesenvolvimento.com.br'
        }
        app.save(settings)
      }
    } catch (_) {
      // Se settings não puder ser salvo via app.save, ignora com segurança
    }
  },
  (app) => {
    // Reversão
    try {
      const users = app.findCollectionByNameOrId('users')
      app.save(users)
    } catch (_) {}
  },
)

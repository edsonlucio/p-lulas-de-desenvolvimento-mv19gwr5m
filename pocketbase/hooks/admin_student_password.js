routerAdd(
  'POST',
  '/backend/v1/admin/alterar-senha-aluno',
  (e) => {
    // 1. Validar que o requisitante está autenticado e tem role admin
    if (!e.auth) {
      throw new UnauthorizedError('Autenticação necessária.')
    }
    const requesterRole = e.auth.getString('role')
    if (requesterRole !== 'admin') {
      throw new ForbiddenError('Apenas administradores podem alterar senhas de alunos.')
    }

    // 2. Ler e validar payload
    const body = e.requestInfo().body || {}
    const studentId = String(body.studentId || '').trim()
    const newPassword = String(body.newPassword || '').trim()

    if (!studentId) {
      throw new BadRequestError('ID do aluno não informado.')
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestError('A nova senha deve ter no mínimo 6 caracteres.')
    }

    // 3. Localizar o aluno
    let targetUser
    try {
      targetUser = $app.findRecordById('users', studentId)
    } catch (_) {
      throw new NotFoundError('Aluno não encontrado.')
    }

    // 4. Segurança estrita: não permitir alterar outro admin por esta rota
    const targetRole = targetUser.getString('role')
    if (targetRole === 'admin') {
      throw new ForbiddenError(
        'Não é permitido alterar a senha de outro administrador por esta rota.',
      )
    }

    // 5. Aplicar nova senha usando setPassword
    targetUser.setPassword(newPassword)
    $app.save(targetUser)

    console.log(
      `[ADMIN_AUDIT] Admin ${e.auth.getString('email')} (${e.auth.id}) alterou a senha do aluno ${targetUser.getString('email')} (${targetUser.id}) em ${new Date().toISOString()}`,
    )

    // 6. Resposta sem nunca expor senhas
    return e.json(200, {
      success: true,
      message: `Senha do aluno ${targetUser.getString('name')} atualizada com sucesso.`,
    })
  },
  $apis.requireAuth(),
)

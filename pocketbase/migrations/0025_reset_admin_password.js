migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'edsonlucio@gmail.com')
      user.setPassword('Pilulas@2026')
      app.save(user)
    } catch (_) {
      // no-op se o usuário não existir nesta cópia do banco
    }
  },
  (app) => {
    // Reverter não precisa forçar uma senha anterior desconhecida
  },
)

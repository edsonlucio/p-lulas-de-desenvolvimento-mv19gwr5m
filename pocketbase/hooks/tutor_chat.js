routerAdd('POST', '/backend/v1/tutor-chat', (e) => {
  try {
    const rawBody = e.requestInfo().body || {}
    const message = (rawBody.message || '').trim().slice(0, 3000)
    if (!message) {
      return e.badRequestError('Mensagem é obrigatória.')
    }

    const conversationId = rawBody.conversation_id || null
    const stream = rawBody.stream !== false // default true

    // Identificação de usuário:
    // Se logado: usa o ID real do usuário autenticado.
    // Se visitante/anônimo: usa o usuário de serviço visitante@pilulas.local.
    let userId = e.auth?.id
    let isStudent = false
    let userName = ''
    let userPoints = 0
    let userLevel = 1

    if (userId) {
      isStudent = true
      try {
        const userRec = $app.findRecordById('users', userId)
        userName = userRec.getString('name') || ''
        userPoints = userRec.getInt('points') || 0
      } catch (_) {}

      try {
        const scoreRec = $app.findFirstRecordByData('pontuacao', 'user', userId)
        userLevel = scoreRec.getInt('level') || 1
      } catch (_) {}
    } else {
      try {
        const visitor = $app.findAuthRecordByEmail('_pb_users_auth_', 'visitante@pilulas.local')
        userId = visitor.id
      } catch (visitorErr) {
        return e.json(500, { error: 'Serviço de visitante indisponível.' })
      }
    }

    // Regra crítica de restrição: obter lista de cursos com matrícula ativa do aluno.
    // Aluno SEM matrícula ativa não tem acesso a transcrições.
    // Visitante (não autenticado) não tem matrícula ativa nenhuma.
    let activeCourseIds = []
    let activeCourseTitles = []

    if (isStudent) {
      const enrollmentRows = $app
        .db()
        .newQuery(
          "SELECT DISTINCT course FROM enrollments WHERE user = {:user} AND situacao = 'ativa'",
        )
        .bind({ user: e.auth.id })
        .all()

      for (let i = 0; i < enrollmentRows.length; i++) {
        const cId = enrollmentRows[i].course
        activeCourseIds.push(cId)
        try {
          const cRec = $app.findRecordById('courses', cId)
          activeCourseTitles.push(cRec.getString('title'))
        } catch (_) {}
      }
    }

    // RAG / Contextualização estrita:
    // Se for aluno matriculado, buscar trechos relevantes em `search_chunks` EXCLUSIVAMENTE
    // dos cursos com matrícula ativa.
    let studentRagContext = ''
    if (isStudent && activeCourseIds.length > 0) {
      // Buscar chunks que contenham palavras-chave da dúvida
      const words = message
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 6)

      if (words.length > 0) {
        let sqlFilter = ''
        const params = {}
        for (let w = 0; w < words.length; w++) {
          params['w' + w] = '%' + words[w] + '%'
          if (w > 0) sqlFilter += ' OR '
          sqlFilter += 'LOWER(texto) LIKE {:w' + w + '}'
        }

        // Limitar apenas aos cursos ativos
        const coursePlaceholders = []
        for (let c = 0; c < activeCourseIds.length; c++) {
          params['c' + c] = activeCourseIds[c]
          coursePlaceholders.push('{:c' + c + '}')
        }

        const querySql =
          'SELECT id, course, lesson, texto, posicao FROM search_chunks WHERE course IN (' +
          coursePlaceholders.join(',') +
          ') AND (' +
          sqlFilter +
          ') LIMIT 6'

        try {
          const matchingChunks = $app.db().newQuery(querySql).bind(params).all()
          if (matchingChunks && matchingChunks.length > 0) {
            const contextLines = []
            for (let m = 0; m < matchingChunks.length; m++) {
              const chunk = matchingChunks[m]
              try {
                const lessonRec = $app.findRecordById('lessons', chunk.lesson)
                const moduleRec = $app.findRecordById('modules', lessonRec.getString('module'))
                const courseRec = $app.findRecordById('courses', chunk.course)
                contextLines.push(
                  '--- TRECHO DE AULA DO ALUNO ---\n' +
                    'Curso: ' +
                    courseRec.getString('title') +
                    ' (slug: ' +
                    courseRec.getString('slug') +
                    ')\n' +
                    'Módulo: ' +
                    moduleRec.getString('title') +
                    '\n' +
                    'Aula: ' +
                    lessonRec.getString('title') +
                    ' (ID: ' +
                    lessonRec.id +
                    ')\n' +
                    'Texto transcrito da aula: "' +
                    chunk.texto +
                    '"\n',
                )
              } catch (_) {}
            }
            if (contextLines.length > 0) {
              studentRagContext = contextLines.join('\n')
            }
          }
        } catch (dbErr) {
          console.log('Aviso ao consultar chunks para RAG:', dbErr.message || dbErr)
        }
      }
    }

    // Montar instrução de contexto do turno atual para o agente
    let contextHeader = ''
    if (isStudent) {
      contextHeader =
        '[CONTEXTO DO USUÁRIO LOGADO]\n' +
        'Papel: ALUNO MATRICULADO\n' +
        'Nome: ' +
        (userName || 'Aluno') +
        '\n' +
        'Pontos: ' +
        userPoints +
        ' | Nível: ' +
        userLevel +
        '\n' +
        'Cursos com matrícula ativa do aluno: ' +
        (activeCourseTitles.length > 0
          ? activeCourseTitles.join(', ')
          : 'NENHUMA matrícula ativa') +
        '\n'

      if (studentRagContext) {
        contextHeader +=
          '\n[TRECHOS DAS AULAS DOS CURSOS DO ALUNO (Use para citar aula/módulo/curso na resposta)]:\n' +
          studentRagContext +
          '\n'
      } else if (activeCourseIds.length === 0) {
        contextHeader +=
          '\nATENÇÃO: O aluno NÃO possui nenhuma matrícula ativa. Se ele fizer perguntas sobre conteúdo de aulas, informe educadamente que ele ainda não possui o curso e oriente-o a conhecer o catálogo (/cursos) para se matricular, sem revelar detalhes da aula.\n'
      }
    } else {
      contextHeader =
        '[CONTEXTO DO USUÁRIO ATUAL]\n' +
        'Papel: VISITANTE / PROSPECT (NÃO LOGADO)\n' +
        'Atenção: Apresente a plataforma, cursos, mentorias de Edson Lúcio e o Clube das Pílulas. Convide-o a se cadastrar (/cadastro). NUNCA revele conteúdo aprofundado ou transcrições de aulas para visitante.\n'
    }

    // Mensagem enriquecida com a verificação de segurança/permissão do backend
    const enrichedMessage = contextHeader + '\nPergunta do usuário: ' + message

    const agent = $ai.agent('tutor-pilulas')

    if (stream) {
      // Obter ou criar conversa para obter o id antes de iniciar o stream SSE
      const conv = agent.getOrCreateConversation({
        user_id: userId,
        id: conversationId,
        title: message.slice(0, 40),
      })

      const iter = agent.chat({
        user_id: userId,
        conversation_id: conv.id,
        message: enrichedMessage,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('Connection', 'keep-alive')
      e.response.header().set('X-Conversation-Id', conv.id)
      return $response.stream(e, iter)
    }

    // Modo síncrono (fallback)
    const result = agent.chat({
      user_id: userId,
      conversation_id: conversationId,
      message: enrichedMessage,
    })

    return e.json(200, {
      conversation_id: result.conversation_id,
      content: result.content,
      citations: result.citations,
      message_id: result.message_id,
      is_student: isStudent,
    })
  } catch (err) {
    console.log('Erro no endpoint tutor-chat:', err.message || err)
    if (err instanceof SkipAiConfigError) {
      return e.json(503, { error: 'Tutor Pílulas temporariamente indisponível.' })
    }
    if (err instanceof SkipAiAgentsError) {
      const status = err.status || 500
      return e.json(status, {
        error: status >= 500 ? 'Falha na requisição ao tutor.' : err.message,
      })
    }
    if (err instanceof SkipAiError) {
      const status = err.status || 502
      return e.json(status, {
        error: status >= 500 ? 'Tutor Pílulas temporariamente indisponível.' : err.message,
      })
    }
    return e.json(500, { error: err.message || 'Erro interno ao consultar o Tutor Pílulas.' })
  }
})

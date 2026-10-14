migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const coursesId = app.findCollectionByNameOrId('courses').id

    // 1. Coleção community_topics
    // Status: pending, approved, rejected
    // Escopo: course vazio/nulo => Comunidade Geral
    //         course preenchido => Tópico restrito ao curso
    // Regra de leitura (list/view):
    // Admin vê tudo; autor vê os próprios posts (qualquer status);
    // Demais usuários autenticados só veem status = "approved".
    const topicsListRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id || status = "approved")'
    const topicsCreateRule =
      '@request.auth.id != "" && @request.auth.id = @request.body.user && @request.body.status = "pending"'
    const topicsUpdateRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || (user = @request.auth.id && @request.body.status:changed = false))'
    const topicsDeleteRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id)'

    const communityTopics = new Collection({
      name: 'community_topics',
      type: 'base',
      listRule: topicsListRule,
      viewRule: topicsListRule,
      createRule: topicsCreateRule,
      updateRule: topicsUpdateRule,
      deleteRule: topicsDeleteRule,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'course',
          type: 'relation',
          required: false,
          collectionId: coursesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          min: 3,
          max: 200,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
          min: 5,
          max: 10000,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'approved', 'rejected'],
          maxSelect: 1,
        },
        {
          name: 'moderation_notes',
          type: 'text',
          required: false,
          max: 1000,
        },
        {
          name: 'moderated_at',
          type: 'date',
          required: false,
        },
        {
          name: 'pinned',
          type: 'bool',
          required: false,
        },
        {
          name: 'replies_count',
          type: 'number',
          required: false,
          min: 0,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_comm_topics_status ON community_topics (status)',
        'CREATE INDEX idx_comm_topics_course ON community_topics (course)',
        'CREATE INDEX idx_comm_topics_user ON community_topics (user)',
        'CREATE INDEX idx_comm_topics_created ON community_topics (created DESC)',
      ],
    })
    app.save(communityTopics)

    // 2. Coleção community_replies
    const repliesListRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id || status = "approved")'
    const repliesCreateRule =
      '@request.auth.id != "" && @request.auth.id = @request.body.user && @request.body.status = "pending"'
    const repliesUpdateRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || (user = @request.auth.id && @request.body.status:changed = false))'
    const repliesDeleteRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id)'

    const communityReplies = new Collection({
      name: 'community_replies',
      type: 'base',
      listRule: repliesListRule,
      viewRule: repliesListRule,
      createRule: repliesCreateRule,
      updateRule: repliesUpdateRule,
      deleteRule: repliesDeleteRule,
      fields: [
        {
          name: 'topic',
          type: 'relation',
          required: true,
          collectionId: communityTopics.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
          min: 2,
          max: 5000,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'approved', 'rejected'],
          maxSelect: 1,
        },
        {
          name: 'moderation_notes',
          type: 'text',
          required: false,
          max: 1000,
        },
        {
          name: 'moderated_at',
          type: 'date',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_comm_replies_topic ON community_replies (topic)',
        'CREATE INDEX idx_comm_replies_status ON community_replies (status)',
        'CREATE INDEX idx_comm_replies_user ON community_replies (user)',
        'CREATE INDEX idx_comm_replies_created ON community_replies (created ASC)',
      ],
    })
    app.save(communityReplies)

    // 3. Coleção tutor_queries
    // Armazena as perguntas feitas ao Tutor Pílulas para gerar os relatórios de temas mais frequentes
    const queriesAdminOrOwner =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id)'
    const tutorQueries = new Collection({
      name: 'tutor_queries',
      type: 'base',
      listRule: queriesAdminOrOwner,
      viewRule: queriesAdminOrOwner,
      createRule: null, // Criado exclusivamente via backend hook no endpoint tutor-chat
      updateRule: null,
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'query',
          type: 'text',
          required: true,
          max: 3000,
        },
        {
          name: 'category',
          type: 'text',
          required: false,
          max: 100,
        },
        {
          name: 'is_student',
          type: 'bool',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tutor_queries_created ON tutor_queries (created DESC)',
        'CREATE INDEX idx_tutor_queries_user ON tutor_queries (user)',
      ],
    })
    app.save(tutorQueries)

    // 4. Seed mínimo para a Comunidade Geral não nascer vazia
    try {
      let adminUser
      try {
        adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'edsonlucio@gmail.com')
      } catch (_) {
        const anyUser = app.findRecordsByFilter('users', 'id != ""', 'created', 1, 0)
        if (anyUser.length > 0) adminUser = anyUser[0]
      }

      if (adminUser) {
        // Tópico 1: Boas-vindas
        const topic1 = new Record(communityTopics)
        topic1.set('user', adminUser.id)
        topic1.set('title', 'Boas-vindas à Comunidade Pílulas de Desenvolvimento! 🚀')
        topic1.set(
          'content',
          'Olá, Pílulas! Este é o nosso espaço oficial de troca de experiências, aprendizados práticos e networking. Aqui você pode compartilhar seus insights das aulas, dúvidas de aplicação no dia a dia do seu negócio e celebrar cada pequena vitória. Pequenas pílulas, grandes transformações!',
        )
        topic1.set('status', 'approved')
        topic1.set('pinned', true)
        topic1.set('replies_count', 1)
        topic1.set('moderated_at', new Date().toISOString())
        app.save(topic1)

        // Resposta de exemplo no tópico 1
        const reply1 = new Record(communityReplies)
        reply1.set('topic', topic1.id)
        reply1.set('user', adminUser.id)
        reply1.set(
          'content',
          'Sinta-se em casa para criar tópicos sobre vendas, liderança e marketing. Todos os posts passam por uma rápida moderação para garantir a qualidade e o respeito no ambiente de estudos.',
        )
        reply1.set('status', 'approved')
        reply1.set('moderated_at', new Date().toISOString())
        app.save(reply1)

        // Tópico 2: Pergunta reflexiva
        const topic2 = new Record(communityTopics)
        topic2.set('user', adminUser.id)
        topic2.set('title', 'Qual hábito você começou a mudar após os primeiros aprendizados aqui?')
        topic2.set(
          'content',
          'Compartilhe com a turma: qual foi o conceito ou dica prática do professor Edson Lúcio que você já colocou em prática nesta semana no seu trabalho ou rotina?',
        )
        topic2.set('status', 'approved')
        topic2.set('pinned', false)
        topic2.set('replies_count', 0)
        topic2.set('moderated_at', new Date().toISOString())
        app.save(topic2)

        // Se houver algum curso de marketing digital cadastrado, criar um tópico de curso de exemplo
        const courses = app.findRecordsByFilter(
          'courses',
          'slug = "marketing-digital"',
          'created',
          1,
          0,
        )
        if (courses.length > 0) {
          const courseTopic = new Record(communityTopics)
          courseTopic.set('user', adminUser.id)
          courseTopic.set('course', courses[0].id)
          courseTopic.set(
            'title',
            'Espaço de dúvidas e cases de Marketing Digital e Funil de Vendas',
          )
          courseTopic.set(
            'content',
            'Espaço exclusivo para os alunos matriculados no curso de Marketing Digital. Deixe aqui suas perguntas sobre personas, tráfego pago, CAC/LTV e estratégias de conteúdo.',
          )
          courseTopic.set('status', 'approved')
          courseTopic.set('pinned', true)
          courseTopic.set('replies_count', 0)
          courseTopic.set('moderated_at', new Date().toISOString())
          app.save(courseTopic)
        }

        // Seed de dúvidas do tutor para o dashboard já exibir temas frequentes
        const initialQueries = [
          'Como definir minha persona no marketing digital?',
          'O que é o Clube das Pílulas e como participar?',
          'Como calcular o CAC e o LTV do meu negócio?',
          'Como funciona a esteira do funil de vendas?',
          'Qual a rotina do livro Metanoia no WhatsApp?',
          'Como estruturar meu posicionamento no Instagram?',
          'Como definir a persona para o meu público?',
          'O que faz o Clube das Pílulas?',
        ]
        for (let q = 0; q < initialQueries.length; q++) {
          const tq = new Record(tutorQueries)
          tq.set('user', adminUser.id)
          tq.set('query', initialQueries[q])
          tq.set('is_student', q % 2 === 0)
          app.save(tq)
        }
      }
    } catch (seedErr) {
      console.log('Aviso ao semear comunidade/tutor_queries:', seedErr.message || seedErr)
    }
  },
  (app) => {
    try {
      const replies = app.findCollectionByNameOrId('community_replies')
      app.delete(replies)
    } catch (_) {}
    try {
      const topics = app.findCollectionByNameOrId('community_topics')
      app.delete(topics)
    } catch (_) {}
    try {
      const queries = app.findCollectionByNameOrId('tutor_queries')
      app.delete(queries)
    } catch (_) {}
  },
)

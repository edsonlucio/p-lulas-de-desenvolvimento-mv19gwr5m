migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    function authUser(email, name, role, points) {
      try {
        const existing = app.findAuthRecordByEmail('users', email)
        existing.set('name', name)
        existing.set('role', role)
        existing.set('points', points)
        existing.setVerified(true)
        app.save(existing)
        return existing
      } catch (_) {
        const record = new Record(users)
        record.setEmail(email)
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', name)
        record.set('role', role)
        record.set('points', points)
        app.save(record)
        return record
      }
    }

    const admin = authUser('edsonlucio@gmail.com', 'Edson Lúcio', 'admin', 0)
    const maria = authUser('maria.almeida@example.com', 'Maria Almeida', 'student', 130)

    let course
    try {
      course = app.findFirstRecordByData('courses', 'slug', 'marketing-digital')
    } catch (_) {
      course = new Record(app.findCollectionByNameOrId('courses'))
      course.set('title', 'Marketing Digital')
      course.set('slug', 'marketing-digital')
      course.set(
        'subtitle',
        'Estratégias práticas para transformar presença digital em vendas reais',
      )
      course.set(
        'description',
        'Construa posicionamento, autoridade e um funil de vendas que trabalha todos os dias pelo seu negócio. Em sete pílulas práticas, você sai da intenção e parte para uma presença digital consistente, mensurável e conectada às pessoas certas.',
      )
      course.set('category', 'marketing')
      course.set('price', 297)
      course.set('published', true)
      app.save(course)
    }

    function moduleRecord(title, position) {
      const found = app.findRecordsByFilter(
        'modules',
        'course = {:course} && title = {:title}',
        'position',
        1,
        0,
        { course: course.id, title: title },
      )
      if (found.length) return found[0]
      const record = new Record(app.findCollectionByNameOrId('modules'))
      record.set('course', course.id)
      record.set('title', title)
      record.set('position', position)
      app.save(record)
      return record
    }

    const moduleOne = moduleRecord('Fundamentos do Marketing Digital', 1)
    const moduleTwo = moduleRecord('Tráfego Pago e Conversão', 2)

    const lessonData = [
      {
        module: moduleOne,
        position: 1,
        title: 'Mentalidade digital: vendas no novo mercado',
        duration: 12,
        free: true,
        video: 'https://www.youtube.com/watch?v=qp0HIF3SfI4',
        description:
          'Entenda por que o comportamento de compra mudou e como transformar essa mudança em oportunidade. Você vai desenvolver uma mentalidade de teste, escuta e evolução constante para vender com propósito no ambiente digital.',
        transcript:
          'O novo mercado não premia quem apenas aparece, mas quem entende pessoas e entrega valor com constância. Mentalidade digital é observar, testar, medir e melhorar sem medo de ajustar a rota. Cada conversa pode revelar uma necessidade e cada conteúdo pode ser uma pequena pílula que aproxima o cliente da transformação que você oferece. Comece simples, mas comece hoje.',
      },
      {
        module: moduleOne,
        position: 2,
        title: 'Posicionamento e persona: para quem você vende',
        duration: 15,
        free: false,
        video: 'https://www.youtube.com/watch?v=u4ZoJKF_VuA',
        description:
          'Defina uma persona útil, baseada em dores e decisões reais, e crie um posicionamento fácil de lembrar. A aula conecta clareza de público a uma comunicação mais humana e persuasiva.',
        transcript:
          'Quando você tenta falar com todo mundo, sua mensagem não encontra ninguém. Uma boa persona nasce de perguntas, conversas e padrões reais: o que essa pessoa deseja, o que a impede de avançar e quais palavras ela usa para explicar o problema. Posicionamento é a promessa clara que ocupa um lugar na mente do cliente. Clareza gera confiança, e confiança abre caminho para a venda.',
      },
      {
        module: moduleOne,
        position: 3,
        title: 'Funil de vendas do zero ao avançado',
        duration: 18,
        free: false,
        video: 'https://www.youtube.com/watch?v=arj7oStGLkU',
        description:
          'Monte um funil de vendas completo, da descoberta à decisão, sem complicar a jornada do cliente. Você aprenderá a associar conteúdo, oferta e chamada para ação a cada etapa.',
        transcript:
          'Um funil de vendas organiza a jornada em três movimentos: atrair a pessoa certa, nutrir confiança e facilitar uma decisão segura. No topo, responda dúvidas e desperte consciência; no meio, aprofunde o problema e mostre caminhos; no fundo, apresente prova, oferta e uma chamada para ação objetiva. O melhor funil não pressiona, ele conduz. Meça a passagem entre etapas e melhore o ponto em que as pessoas estão parando.',
      },
      {
        module: moduleOne,
        position: 4,
        title: 'Conteúdo que gera autoridade',
        duration: 14,
        free: false,
        video: 'https://www.youtube.com/watch?v=iCvmsMzlF7o',
        description:
          'Crie conteúdos que ensinam, conectam e demonstram experiência sem parecer uma propaganda repetitiva. A aula traz uma estrutura simples para planejar pautas e manter consistência.',
        transcript:
          'Autoridade não é falar difícil, é ajudar alguém a enxergar com mais clareza. Alterne conteúdos que educam, provam, inspiram e convidam para o próximo passo. Uma história real aproxima, um método simples orienta e um resultado concreto reduz insegurança. Consistência vence perfeição: publique uma pílula útil por vez e deixe que a confiança se acumule.',
      },
      {
        module: moduleTwo,
        position: 1,
        title: 'Instagram e YouTube a favor das vendas',
        duration: 16,
        free: false,
        video: 'https://www.youtube.com/watch?v=H14bBuluwB8',
        description:
          'Use Instagram e YouTube com papéis complementares na sua estratégia. Descubra formatos, frequência e chamadas para ação que levam audiência a conversas comerciais.',
        transcript:
          'Instagram acelera relacionamento e frequência; YouTube aprofunda temas e continua sendo encontrado por muito mais tempo. Escolha uma ideia central e adapte o formato para cada canal, sem apenas copiar e colar. Toda publicação precisa ter uma intenção: iniciar conversa, gerar cadastro, apresentar uma solução ou fortalecer confiança. Canal é ferramenta; estratégia é saber para onde você quer conduzir a pessoa.',
      },
      {
        module: moduleTwo,
        position: 2,
        title: 'Anúncios: primeiros passos no tráfego pago',
        duration: 20,
        free: false,
        video: 'https://www.youtube.com/watch?v=5MgBikgcWnY',
        description:
          'Dê os primeiros passos no tráfego pago com objetivo, público, criativo e orçamento sob controle. Aprenda a testar sem desperdiçar energia nem esperar milagres de uma única campanha.',
        transcript:
          'Tráfego pago amplifica uma mensagem; ele não corrige uma oferta confusa. Comece definindo um objetivo, uma audiência e uma ação mensurável. Teste variações de criativo com orçamento pequeno, mantenha uma variável por vez e registre o que aprendeu. O anúncio vencedor nasce de ciclos de melhoria, não de adivinhação. Invista com consciência e deixe os dados orientarem o próximo passo.',
      },
      {
        module: moduleTwo,
        position: 3,
        title: 'Métricas que importam: ROI, CAC e LTV',
        duration: 17,
        free: false,
        video: 'https://www.youtube.com/watch?v=Ks-_Mh1QhMc',
        description:
          'Leia ROI, CAC e LTV para tomar decisões que protegem caixa e aceleram crescimento. A aula traduz números em perguntas práticas para a rotina comercial.',
        transcript:
          'Métrica só tem valor quando muda uma decisão. O CAC mostra quanto custa conquistar um cliente, o LTV estima quanto valor ele gera ao longo do relacionamento e o ROI compara retorno e investimento. Analise os três em conjunto: crescer com CAC maior que o valor do cliente é acelerar na direção errada. Crie um painel simples, acompanhe tendências e celebre o progresso sem esconder os sinais que pedem ajuste.',
      },
    ]

    const lessonRecords = []
    for (let i = 0; i < lessonData.length; i++) {
      const item = lessonData[i]
      const found = app.findRecordsByFilter(
        'lessons',
        'module = {:module} && title = {:title}',
        'position',
        1,
        0,
        { module: item.module.id, title: item.title },
      )
      if (found.length) {
        lessonRecords.push(found[0])
        continue
      }
      const lesson = new Record(app.findCollectionByNameOrId('lessons'))
      lesson.set('module', item.module.id)
      lesson.set('title', item.title)
      lesson.set('description', item.description)
      lesson.set('video_url', item.video)
      lesson.set('duration_min', item.duration)
      lesson.set('position', item.position)
      lesson.set('is_free', item.free)
      lesson.set('situacao', 'ativo')
      lesson.set('transcript', item.transcript)
      app.save(lesson)
      lessonRecords.push(lesson)
    }

    let enrollment
    const existingEnrollments = app.findRecordsByFilter(
      'enrollments',
      'user = {:user} && course = {:course}',
      'created',
      1,
      0,
      { user: maria.id, course: course.id },
    )
    if (existingEnrollments.length) {
      enrollment = existingEnrollments[0]
    } else {
      enrollment = new Record(app.findCollectionByNameOrId('enrollments'))
      enrollment.set('user', maria.id)
      enrollment.set('course', course.id)
      enrollment.set('situacao', 'ativa')
      app.save(enrollment)
    }

    for (let i = 0; i < 4; i++) {
      const lesson = lessonRecords[i]
      const found = app.findRecordsByFilter(
        'lesson_progress',
        'user = {:user} && lesson = {:lesson}',
        'created',
        1,
        0,
        { user: maria.id, lesson: lesson.id },
      )
      if (found.length) continue
      const progress = new Record(app.findCollectionByNameOrId('lesson_progress'))
      progress.set('user', maria.id)
      progress.set('lesson', lesson.id)
      progress.set('course', course.id)
      progress.set('enrollment', enrollment.id)
      progress.set('completed', i < 3)
      progress.set('current_minute', i < 3 ? lesson.getInt('duration_min') : 7)
      if (i < 3) progress.set('completed_at', '2025-01-' + String(10 + i) + ' 10:00:00.000Z')
      app.save(progress)
    }

    const ledgerItems = [
      {
        amount: 100,
        reason: 'boas_vindas',
        description: 'Boas-vindas à Pílulas de Desenvolvimento',
        lesson: '',
      },
      {
        amount: 10,
        reason: 'aula_concluida',
        description: 'Aula concluída: Mentalidade digital',
        lesson: lessonRecords[0].id,
      },
      {
        amount: 10,
        reason: 'aula_concluida',
        description: 'Aula concluída: Posicionamento e persona',
        lesson: lessonRecords[1].id,
      },
      {
        amount: 10,
        reason: 'aula_concluida',
        description: 'Aula concluída: Funil de vendas',
        lesson: lessonRecords[2].id,
      },
    ]
    for (let i = 0; i < ledgerItems.length; i++) {
      const item = ledgerItems[i]
      const found = app.findRecordsByFilter(
        'points_ledger',
        'user = {:user} && reason = {:reason} && description = {:description}',
        'created',
        1,
        0,
        { user: maria.id, reason: item.reason, description: item.description },
      )
      if (found.length) continue
      const entry = new Record(app.findCollectionByNameOrId('points_ledger'))
      entry.set('user', maria.id)
      entry.set('amount', item.amount)
      entry.set('reason', item.reason)
      entry.set('description', item.description)
      if (item.lesson) entry.set('lesson', item.lesson)
      app.save(entry)
    }

    maria.set('points', 130)
    app.save(maria)
    admin.set('points', admin.getInt('points'))
    app.save(admin)
  },
  (app) => {
    try {
      app.delete(app.findAuthRecordByEmail('users', 'maria.almeida@example.com'))
    } catch (_) {}
    try {
      app.delete(app.findAuthRecordByEmail('users', 'edsonlucio@gmail.com'))
    } catch (_) {}
    try {
      app.delete(app.findFirstRecordByData('courses', 'slug', 'marketing-digital'))
    } catch (_) {}
  },
)

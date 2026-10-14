migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Coleção club_members
    // Apenas admin gerencia nesta etapa (list, view, create, update, delete)
    const clubMembers = new Collection({
      name: 'club_members',
      type: 'base',
      listRule: adminRule,
      viewRule: adminRule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'joined_at',
          type: 'date',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        {
          name: 'notes',
          type: 'text',
          max: 500,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_club_members_user ON club_members (user)',
        'CREATE INDEX idx_club_members_status ON club_members (status)',
        'CREATE INDEX idx_club_members_joined ON club_members (joined_at DESC)',
      ],
    })
    app.save(clubMembers)

    // 2. Coleção club_daily_cards
    // Rotina diária do WhatsApp: data, pergunta, resumo, provocação, páginas de-até, status
    const clubDailyCards = new Collection({
      name: 'club_daily_cards',
      type: 'base',
      listRule: adminRule,
      viewRule: adminRule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          max: 200,
        },
        {
          name: 'pages_from',
          type: 'number',
          min: 1,
          onlyInt: true,
        },
        {
          name: 'pages_to',
          type: 'number',
          min: 1,
          onlyInt: true,
        },
        {
          name: 'pergunta',
          type: 'text',
          required: true,
          max: 2000,
        },
        {
          name: 'resumo',
          type: 'text',
          required: true,
          max: 5000,
        },
        {
          name: 'provocacao',
          type: 'text',
          required: true,
          max: 2000,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'agendado', 'enviado'],
          maxSelect: 1,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_club_daily_cards_date ON club_daily_cards (date)',
        'CREATE INDEX idx_club_daily_cards_status ON club_daily_cards (status)',
      ],
    })
    app.save(clubDailyCards)

    // Seed de exemplo: rotina da leitura do livro Metanoia
    // Segunda 2026-10-05 até Sábado 2026-10-10 (passados = enviados)
    // Segunda 2026-10-12 a 2026-10-17 (enviados/agendados)
    // Sementes realistas da obra "Metanoia — a chave está na sua mente"
    const seedCards = [
      {
        date: '2026-10-05 09:00:00.000Z',
        title: 'Dia 1 · O poder do alinhamento interior',
        pages_from: 1,
        pages_to: 8,
        pergunta: 'Qual padrão de pensamento você herdou sem nunca questionar a origem?',
        resumo:
          'Apresentação do conceito de Metanoia: uma virada de chave mental antes de qualquer conquista externa. O autor introduz que as guerras mais duras são travadas no terreno da imaginação e das crenças estabelecidas.',
        provocacao:
          'Você não vive no nível do seu potencial, vive no nível das suas certezas inconscientes.',
        status: 'enviado',
      },
      {
        date: '2026-10-06 09:00:00.000Z',
        title: 'Dia 2 · Rompendo narrativas de escassez',
        pages_from: 9,
        pages_to: 16,
        pergunta:
          'Em quais conversas recentes você justificou limites em vez de desenhar soluções?',
        resumo:
          'Capítulo sobre a autoimagem e como ela dita o teto de crescimento. O autor mostra como memórias de fracasso criam prisões invisíveis se não forem ressignificadas com intencionalidade.',
        provocacao:
          'Seus argumentos para justificar por que algo não pode ser feito são a planta baixa da sua gaiola.',
        status: 'enviado',
      },
      {
        date: '2026-10-07 09:00:00.000Z',
        title: 'Dia 3 · A disciplina da imaginação',
        pages_from: 17,
        pages_to: 24,
        pergunta:
          'O que você tem alimentado primeiro pela manhã: notícias de crise ou visão de futuro?',
        resumo:
          'O foco da mente como lente de aumento. Aquilo que você contempla de maneira contínua se torna seu destino. Técnicas práticas de blindagem contra ruídos externos e desânimo coletivo.',
        provocacao:
          'Quem não governa a própria atenção será governado pela agenda e pelo pessimismo dos outros.',
        status: 'enviado',
      },
      {
        date: '2026-10-08 09:00:00.000Z',
        title: 'Dia 4 · Linguagem e autoridade interior',
        pages_from: 25,
        pages_to: 32,
        pergunta: 'Quais palavras frequentes no seu vocabulário estão sabotando a sua liderança?',
        resumo:
          'A força profética do discurso diário. O livro aprofunda a correspondência neurobiológica e espiritual entre o que confessamos e o estado emocional em que operamos.',
        provocacao:
          'Palavras não são apenas sons no ar; elas são os tijolos com que você constrói a sua realidade diária.',
        status: 'enviado',
      },
      {
        date: '2026-10-09 09:00:00.000Z',
        title: 'Dia 5 · Cortando laços com a procrastinação',
        pages_from: 33,
        pages_to: 40,
        pergunta:
          'Qual decisão incômoda você está adiando sob o pretexto de esperar o momento perfeito?',
        resumo:
          'A armadilha do perfeccionismo que mascara medo da exposição e da crítica. O autor destaca a importância do micro-compromisso executado com coragem.',
        provocacao:
          'O perfeito que nunca começa é infinitamente inferior ao simples feito com excelência hoje.',
        status: 'enviado',
      },
      {
        date: '2026-10-10 09:00:00.000Z',
        title: 'Dia 6 · Consolidação semanal: a coragem de ser quem você nasceu para ser',
        pages_from: 41,
        pages_to: 48,
        pergunta:
          'De 0 a 10, quanto da sua energia da semana foi gasta sendo autêntico vs. tentando agradar?',
        resumo:
          'Fechamento do primeiro grande bloco temático. O resgate da vocação pessoal e o impacto de dizer "não" para o que é bom a fim de abraçar o que é excelente.',
        provocacao:
          'O preço da aprovação geral é a mediocridade garantida. Escolha seu público com sabedoria.',
        status: 'enviado',
      },
      // Domingo 11/10 é descanso (não tem card diário)
      {
        date: '2026-10-12 09:00:00.000Z',
        title: 'Dia 7 · Liderança começa no espelho',
        pages_from: 49,
        pages_to: 56,
        pergunta: 'Quem você seria profissionalmente se o medo da rejeição deixasse de existir?',
        resumo:
          'Início da segunda semana de leitura. O foco passa para a liderança de outras pessoas a partir da maestria sobre si mesmo. Ninguém lidera uma equipe se não governa o próprio estresse.',
        provocacao:
          'O maior projeto da sua vida nunca será a sua empresa ou o seu cargo — será sempre você mesmo.',
        status: 'enviado',
      },
      {
        date: '2026-10-13 09:00:00.000Z',
        title: 'Dia 8 · Descontruindo crenças limitantes sobre prosperidade',
        pages_from: 57,
        pages_to: 64,
        pergunta: 'Qual foi a primeira mensagem sobre dinheiro que você ouviu na infância?',
        resumo:
          'Abordagem equilibrada sobre valor, serviço e riqueza como consequência natural de resolver problemas reais de pessoas reais em escala.',
        provocacao:
          'Prosperidade não é acúmulo egoísta, é liberdade para servir com generosidade e impacto.',
        status: 'enviado',
      },
      {
        date: '2026-10-14 09:00:00.000Z',
        title: 'Dia 9 · O filtro dos relacionamentos estratégicos',
        pages_from: 65,
        pages_to: 72,
        pergunta:
          'As cinco pessoas mais próximas de você desafiam seu crescimento ou acomodam seu ego?',
        resumo:
          'Associações moldam destinos. O autor discute como construir uma mesa de conselheiros, mentores e parceiros que nos empurram para frente.',
        provocacao:
          'Não gaste energia tentando convencer quem decidiu ser cínico. Caminhe com quem busca voar.',
        status: 'enviado',
      },
      {
        date: '2026-10-15 09:00:00.000Z',
        title: 'Dia 10 · Foco afiado em tempos de distração',
        pages_from: 73,
        pages_to: 80,
        pergunta: 'Qual aplicativo ou hábito tem roubado sua melhor hora do dia?',
        resumo:
          'Capítulo sobre a hiperestimulação moderna e o resgate da profundidade de raciocínio. Práticas para restaurar clareza mental e concentração duradoura.',
        provocacao:
          'A superficialidade é a doença do século; a profundidade é a maior vantagem competitiva da sua carreira.',
        status: 'agendado',
      },
      {
        date: '2026-10-16 09:00:00.000Z',
        title: 'Dia 11 · Criatividade sob pressão',
        pages_from: 81,
        pages_to: 88,
        pergunta:
          'Qual problema recorrente na sua rotina precisa de uma resposta completamente nova?',
        resumo:
          'Como o autor aborda a resolução de crises transformando obstáculos em trampolins de aprendizado e inovação prática.',
        provocacao:
          'A crise não cria líderes; ela simplesmente revela quem já vinha se preparando no silêncio.',
        status: 'agendado',
      },
      {
        date: '2026-10-17 09:00:00.000Z',
        title: 'Dia 12 · O descanso como estratégia de poder',
        pages_from: 89,
        pages_to: 96,
        pergunta: 'Você sabe parar antes do corpo pedir socorro através do esgotamento?',
        resumo:
          'O valor do descanso ativo e do sabático semanal. O autor explica por que o descanso não é perda de tempo, mas recarga necessária de sabedoria e visão.',
        provocacao:
          'Descanso não é recompensa por ter trabalhado; é pré-requisito biológico para continuar gerando valor.',
        status: 'agendado',
      },
    ]

    for (let i = 0; i < seedCards.length; i++) {
      const item = seedCards[i]
      try {
        app.findFirstRecordByData('club_daily_cards', 'date', item.date)
      } catch (_) {
        const cardRecord = new Record(clubDailyCards)
        cardRecord.set('date', item.date)
        cardRecord.set('title', item.title)
        cardRecord.set('pages_from', item.pages_from)
        cardRecord.set('pages_to', item.pages_to)
        cardRecord.set('pergunta', item.pergunta)
        cardRecord.set('resumo', item.resumo)
        cardRecord.set('provocacao', item.provocacao)
        cardRecord.set('status', item.status)
        app.save(cardRecord)
      }
    }

    // Seed de um membro inicial exemplar (Maria Almeida, se existir)
    try {
      const maria = app.findAuthRecordByEmail('users', 'maria.almeida@example.com')
      try {
        app.findFirstRecordByData('club_members', 'user', maria.id)
      } catch (_) {
        const member = new Record(clubMembers)
        member.set('user', maria.id)
        member.set('joined_at', '2026-10-05 10:00:00.000Z')
        member.set('status', 'ativo')
        member.set('notes', 'Membro fundador do Clube das Pílulas')
        app.save(member)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const members = app.findCollectionByNameOrId('club_members')
      app.delete(members)
    } catch (_) {}
    try {
      const cards = app.findCollectionByNameOrId('club_daily_cards')
      app.delete(cards)
    } catch (_) {}
  },
)

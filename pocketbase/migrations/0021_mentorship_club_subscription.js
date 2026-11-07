migrate(
  (app) => {
    const adminRule = '@request.auth.role = "admin"'
    const users = app.findCollectionByNameOrId('users')
    const usersId = users.id

    // 1. Adicionar campo whatsapp em users se ainda não existir
    if (!users.fields.getByName('whatsapp')) {
      users.fields.add(new TextField({ name: 'whatsapp', max: 50 }))
      app.save(users)
    }

    // 2. Atualizar regras de club_members para permitir que visitante/aluno logado crie seu registro
    // e veja seu próprio registro no clube
    const clubMembers = app.findCollectionByNameOrId('club_members')
    clubMembers.listRule =
      '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
    clubMembers.viewRule =
      '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
    clubMembers.createRule = '@request.auth.id != "" && user = @request.auth.id'
    // Adicionar campos extras úteis em club_members
    if (!clubMembers.fields.getByName('whatsapp')) {
      clubMembers.fields.add(new TextField({ name: 'whatsapp', max: 50 }))
    }
    if (!clubMembers.fields.getByName('name')) {
      clubMembers.fields.add(new TextField({ name: 'name', max: 200 }))
    }
    if (!clubMembers.fields.getByName('email')) {
      clubMembers.fields.add(new EmailField({ name: 'email' }))
    }
    app.save(clubMembers)

    // 3. Atualizar regras de club_daily_cards para leitura pública (conteúdo aberto aos membros do clube)
    const clubDailyCards = app.findCollectionByNameOrId('club_daily_cards')
    clubDailyCards.listRule = '' // leitura pública de cards enviados/agendados
    clubDailyCards.viewRule = ''
    app.save(clubDailyCards)

    // 4. Coleção de Produtos/Configuração de Mentoria: mentorship_programs
    let mentorshipPrograms
    try {
      mentorshipPrograms = app.findCollectionByNameOrId('mentorship_programs')
    } catch (_) {
      mentorshipPrograms = new Collection({
        name: 'mentorship_programs',
        type: 'base',
        listRule: 'active = true || @request.auth.role = "admin"',
        viewRule: 'active = true || @request.auth.role = "admin"',
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'slug', type: 'text', required: true, max: 200 },
          { name: 'subtitle', type: 'text', max: 300 },
          { name: 'description', type: 'text', max: 3000 },
          { name: 'price', type: 'number', required: false, min: 0 },
          { name: 'original_price', type: 'number', min: 0 },
          { name: 'meeting_cadence', type: 'text', max: 100 }, // ex: "Uma turma por semana"
          { name: 'meeting_schedule', type: 'text', max: 200 }, // ex: "Toda terça-feira às 20h"
          { name: 'active', type: 'bool' },
          { name: 'contact_whatsapp', type: 'text', max: 100 },
          { name: 'features_list', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_mentorship_slug ON mentorship_programs (slug)'],
      })
      app.save(mentorshipPrograms)

      // Seed do programa oficial de mentoria
      const p = new Record(mentorshipPrograms)
      p.set('title', 'Mentoria Executiva Pílulas de Desenvolvimento')
      p.set('slug', 'mentoria-executiva')
      p.set(
        'subtitle',
        'Acompanhamento semanal com Edson Lúcio: estratégia, liderança e escala de vendas',
      )
      p.set(
        'description',
        'Imersão contínua com uma turma por semana ao vivo via videoconferência. Discussão de casos práticos reais, gravação integral dos encontros e cadernos de aplicação imediata para sua equipe.',
      )
      p.set('price', 997)
      p.set('original_price', 1497)
      p.set('meeting_cadence', 'Uma turma por semana')
      p.set('meeting_schedule', 'Toda terça-feira às 20h00 (horário de Brasília)')
      p.set('active', true)
      p.set('contact_whatsapp', 'https://chat.whatsapp.com/GDwgDsxlgc56o0qOBM6r7o')
      p.set('features_list', [
        'Encontros ao vivo semanais com Edson Lúcio',
        'Gravação integral de todos os encontros anteriores',
        'Cadernos de aplicação prática e ferramentas em PDF',
        'Grupo fechado de networking com empresários e líderes',
        'Hot-seats quinzenais para análise do seu negócio',
      ])
      app.save(p)
    }

    // 5. Coleção de Encontros de Mentoria: mentorship_meetings
    let mentorshipMeetings
    try {
      mentorshipMeetings = app.findCollectionByNameOrId('mentorship_meetings')
    } catch (_) {
      mentorshipMeetings = new Collection({
        name: 'mentorship_meetings',
        type: 'base',
        // Visível para todos para exibir lista pública com destaques/anteriores,
        // mas links de gravação e material são protegidos na tela para quem tem acesso
        listRule: '',
        viewRule: '',
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'title', type: 'text', required: true, max: 250 },
          { name: 'date', type: 'date', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['proximo', 'realizado', 'cancelado'],
          },
          { name: 'summary', type: 'text', max: 2000 },
          { name: 'video_url', type: 'text', max: 500 },
          { name: 'live_meeting_url', type: 'text', max: 500 },
          { name: 'material_title', type: 'text', max: 200 },
          { name: 'material_url', type: 'text', max: 500 },
          { name: 'material_file', type: 'file', maxSelect: 1, maxSize: 20971520 }, // 20MB
          { name: 'cohort_name', type: 'text', max: 100 }, // ex: "Turma Semanal Alpha"
          { name: 'position', type: 'number', min: 0 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mentorship_meetings_date ON mentorship_meetings (date DESC)',
          'CREATE INDEX idx_mentorship_meetings_status ON mentorship_meetings (status)',
        ],
      })
      app.save(mentorshipMeetings)

      // Seeds realistas de encontros semanais
      // 1) Próximo encontro semanal em destaque (próxima terça-feira)
      const nextMeeting = new Record(mentorshipMeetings)
      nextMeeting.set('title', 'Alinhamento Estratégico & Gestão de Rotina de Alta Performance')
      nextMeeting.set('date', '2026-11-17 20:00:00.000Z')
      nextMeeting.set('status', 'proximo')
      nextMeeting.set(
        'summary',
        'Como estruturar o funil de prioridades semanais da liderança, blindar o foco do time contra ruídos externos e monitorar KPIs sem microgerenciamento.',
      )
      nextMeeting.set('live_meeting_url', 'https://meet.google.com/pilulas-mentoria-semanal')
      nextMeeting.set('material_title', 'Caderno Prático de Alinhamento Semanal (PDF)')
      nextMeeting.set(
        'material_url',
        'https://drive.google.com/file/d/pilulas-caderno-alinhamento/view',
      )
      nextMeeting.set('cohort_name', 'Turma Semanal · Encontro #14')
      nextMeeting.set('position', 1)
      app.save(nextMeeting)

      // 2) Encontro anterior 1 com gravação e material
      const pastMeeting1 = new Record(mentorshipMeetings)
      pastMeeting1.set('title', 'Engenharia de Metas e Negociação Assertiva')
      pastMeeting1.set('date', '2026-11-10 20:00:00.000Z')
      pastMeeting1.set('status', 'realizado')
      pastMeeting1.set(
        'summary',
        'Neste encontro anterior analisamos 4 casos práticos de membros sobre objeções complexas em vendas B2B e o redesenho de metas desafiadoras.',
      )
      pastMeeting1.set('video_url', 'https://www.youtube.com/watch?v=qp0HIF3SfI4')
      pastMeeting1.set('material_title', 'Matriz de Contorno de Objeções B2B')
      pastMeeting1.set(
        'material_url',
        'https://drive.google.com/file/d/pilulas-matriz-objecoes/view',
      )
      pastMeeting1.set('cohort_name', 'Turma Semanal · Encontro #13')
      pastMeeting1.set('position', 2)
      app.save(pastMeeting1)

      // 3) Encontro anterior 2 com gravação e material
      const pastMeeting2 = new Record(mentorshipMeetings)
      pastMeeting2.set('title', 'Cultura de Ação e Feedback Sem Ruído')
      pastMeeting2.set('date', '2026-11-03 20:00:00.000Z')
      pastMeeting2.set('status', 'realizado')
      pastMeeting2.set(
        'summary',
        'Técnicas diretas para dar feedbacks corretivos que preservam o relacionamento e geram comprometimento imediato.',
      )
      pastMeeting2.set('video_url', 'https://www.youtube.com/watch?v=u4ZoJKF_VuA')
      pastMeeting2.set('material_title', 'Guia Prático de Feedback 1:1')
      pastMeeting2.set('material_url', 'https://drive.google.com/file/d/pilulas-guia-feedback/view')
      pastMeeting2.set('cohort_name', 'Turma Semanal · Encontro #12')
      pastMeeting2.set('position', 3)
      app.save(pastMeeting2)
    }

    // 6. Coleção de Matrículas/Acessos em Mentoria: mentorship_enrollments
    let mentorshipEnrollments
    try {
      mentorshipEnrollments = app.findCollectionByNameOrId('mentorship_enrollments')
    } catch (_) {
      mentorshipEnrollments = new Collection({
        name: 'mentorship_enrollments',
        type: 'base',
        listRule:
          '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")',
        viewRule:
          '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")',
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'program',
            type: 'relation',
            required: false,
            collectionId: mentorshipPrograms.id,
            maxSelect: 1,
          },
          { name: 'order', type: 'text', max: 50 },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ativa', 'expirada', 'cancelada'],
          },
          { name: 'expires_at', type: 'date' },
          { name: 'notes', type: 'text', max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mentorship_enroll_user ON mentorship_enrollments (user)',
          'CREATE INDEX idx_mentorship_enroll_status ON mentorship_enrollments (status)',
        ],
      })
      app.save(mentorshipEnrollments)
    }

    // 7. Coleção Lista de Espera de Cursos Pagos (alimentada pelo Clube das Pílulas): course_waitlist
    let courseWaitlist
    try {
      courseWaitlist = app.findCollectionByNameOrId('course_waitlist')
    } catch (_) {
      const courses = app.findCollectionByNameOrId('courses')
      courseWaitlist = new Collection({
        name: 'course_waitlist',
        type: 'base',
        // Qualquer pessoa ou visitante logado pode demonstrar interesse
        listRule: adminRule,
        viewRule: adminRule,
        createRule: '', // público / sem auth ou com auth
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'name', type: 'text', required: true, max: 200 },
          { name: 'email', type: 'email', required: true },
          { name: 'whatsapp', type: 'text', required: true, max: 50 },
          {
            name: 'course',
            type: 'relation',
            required: true,
            collectionId: courses.id,
            maxSelect: 1,
          },
          { name: 'user', type: 'relation', required: false, collectionId: usersId, maxSelect: 1 },
          { name: 'source', type: 'text', max: 100 }, // ex: "clube_das_pilulas"
          { name: 'notes', type: 'text', max: 500 },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pendente', 'contatado', 'convertido'],
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_waitlist_course ON course_waitlist (course)',
          'CREATE INDEX idx_waitlist_email ON course_waitlist (email)',
          'CREATE INDEX idx_waitlist_created ON course_waitlist (created DESC)',
        ],
      })
      app.save(courseWaitlist)
    }

    // 8. Coleções de Assinatura (preparadas e OCULTAS da área pública): subscription_plans e subscriptions
    let subscriptionPlans
    try {
      subscriptionPlans = app.findCollectionByNameOrId('subscription_plans')
    } catch (_) {
      subscriptionPlans = new Collection({
        name: 'subscription_plans',
        type: 'base',
        // Acesso restrito a admin para não ser exposto na página pública
        listRule: adminRule,
        viewRule: adminRule,
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'name', type: 'text', required: true, max: 150 },
          { name: 'slug', type: 'text', required: true, max: 100 },
          { name: 'interval', type: 'select', required: true, values: ['monthly', 'yearly'] },
          { name: 'price', type: 'number', required: false, min: 0 },
          { name: 'original_price', type: 'number', min: 0 },
          { name: 'discount_percentage', type: 'number', min: 0, max: 100 },
          { name: 'description', type: 'text', max: 1000 },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_sub_plan_slug ON subscription_plans (slug)'],
      })
      app.save(subscriptionPlans)

      // Seeds dos planos: Mensal e Anual com desconto
      const monthlyPlan = new Record(subscriptionPlans)
      monthlyPlan.set('name', 'Pílulas Pass — Assinatura Mensal')
      monthlyPlan.set('slug', 'pilulas-pass-mensal')
      monthlyPlan.set('interval', 'monthly')
      monthlyPlan.set('price', 67)
      monthlyPlan.set('original_price', 97)
      monthlyPlan.set('discount_percentage', 0)
      monthlyPlan.set(
        'description',
        'Acesso irrestrito a todos os cursos atuais e futuros da plataforma Pílulas de Desenvolvimento com renovação mensal.',
      )
      monthlyPlan.set('active', true)
      app.save(monthlyPlan)

      const yearlyPlan = new Record(subscriptionPlans)
      yearlyPlan.set('name', 'Pílulas Pass — Assinatura Anual')
      yearlyPlan.set('slug', 'pilulas-pass-anual')
      yearlyPlan.set('interval', 'yearly')
      yearlyPlan.set('price', 597) // Equivale a ~49/mês (economia de ~25% em relação ao mensal de 67*12 = 804)
      yearlyPlan.set('original_price', 804)
      yearlyPlan.set('discount_percentage', 25)
      yearlyPlan.set(
        'description',
        'Plano anual com 25% de desconto no catálogo completo de cursos, atualizações contínuas e comunidade exclusiva.',
      )
      yearlyPlan.set('active', true)
      app.save(yearlyPlan)
    }

    let subscriptions
    try {
      subscriptions = app.findCollectionByNameOrId('subscriptions')
    } catch (_) {
      subscriptions = new Collection({
        name: 'subscriptions',
        type: 'base',
        listRule:
          '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")',
        viewRule:
          '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")',
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'plan',
            type: 'relation',
            required: true,
            collectionId: subscriptionPlans.id,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['active', 'past_due', 'canceled', 'paused'],
          },
          { name: 'current_period_start', type: 'date' },
          { name: 'current_period_end', type: 'date' },
          { name: 'cancel_at_period_end', type: 'bool' },
          { name: 'order_id', type: 'text', max: 50 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sub_user ON subscriptions (user)',
          'CREATE INDEX idx_sub_status ON subscriptions (status)',
        ],
      })
      app.save(subscriptions)
    }

    // 9. Atualizar orders para suportar mentoria e plano de assinatura
    const orders = app.findCollectionByNameOrId('orders')
    if (!orders.fields.getByName('mentorship')) {
      orders.fields.add(
        new RelationField({
          name: 'mentorship',
          required: false,
          collectionId: mentorshipPrograms.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!orders.fields.getByName('subscription_plan')) {
      orders.fields.add(
        new RelationField({
          name: 'subscription_plan',
          required: false,
          collectionId: subscriptionPlans.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!orders.fields.getByName('customer_whatsapp')) {
      orders.fields.add(new TextField({ name: 'customer_whatsapp', max: 50 }))
    }
    app.save(orders)
  },
  (app) => {
    try {
      const subscriptions = app.findCollectionByNameOrId('subscriptions')
      app.delete(subscriptions)
    } catch (_) {}
    try {
      const subscriptionPlans = app.findCollectionByNameOrId('subscription_plans')
      app.delete(subscriptionPlans)
    } catch (_) {}
    try {
      const courseWaitlist = app.findCollectionByNameOrId('course_waitlist')
      app.delete(courseWaitlist)
    } catch (_) {}
    try {
      const mentorshipEnrollments = app.findCollectionByNameOrId('mentorship_enrollments')
      app.delete(mentorshipEnrollments)
    } catch (_) {}
    try {
      const mentorshipMeetings = app.findCollectionByNameOrId('mentorship_meetings')
      app.delete(mentorshipMeetings)
    } catch (_) {}
    try {
      const mentorshipPrograms = app.findCollectionByNameOrId('mentorship_programs')
      app.delete(mentorshipPrograms)
    } catch (_) {}
  },
)

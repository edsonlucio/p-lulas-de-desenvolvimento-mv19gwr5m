/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir usuário de serviço para visitantes anônimos (necessário para o runtime nativo do agente)
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let visitanteUser
    try {
      visitanteUser = app.findAuthRecordByEmail('_pb_users_auth_', 'visitante@pilulas.local')
    } catch (_) {
      visitanteUser = new Record(users)
      visitanteUser.setEmail('visitante@pilulas.local')
      visitanteUser.setPassword($security.randomString(30))
      visitanteUser.setVerified(true)
      visitanteUser.set('name', 'Visitante Prospect')
      visitanteUser.set('role', 'student')
      visitanteUser.set('points', 0)
      app.save(visitanteUser)
    }

    // 2. Popular search_chunks das aulas existentes caso ainda não estejam populados
    try {
      const existingChunksCount = app.countRecords('search_chunks')
      if (existingChunksCount === 0) {
        const searchChunksCol = app.findCollectionByNameOrId('search_chunks')
        const lessons = app.findRecordsByFilter('lessons', 'situacao = "ativo"', 'position', 200, 0)

        for (let l = 0; l < lessons.length; l++) {
          const lesson = lessons[l]
          const transcript = lesson.getString('transcript') || lesson.getString('transcricao') || ''
          const trimmed = transcript.trim()
          if (!trimmed) continue

          let courseId = ''
          try {
            const modId = lesson.getString('module')
            const modRec = app.findRecordById('modules', modId)
            courseId = modRec.getString('course')
          } catch (_) {
            continue
          }

          // Divisão em blocos simples de ~600 a 800 caracteres por pontuação
          const sentences = trimmed.split(/(?<=[.!?])\s+/)
          let currentChunk = ''
          let pos = 1

          for (let s = 0; s < sentences.length; s++) {
            const sentence = sentences[s].trim()
            if (!sentence) continue
            if (currentChunk.length + sentence.length + 1 <= 800) {
              currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence
            } else {
              if (currentChunk) {
                const chunkRec = new Record(searchChunksCol)
                chunkRec.set('course', courseId)
                chunkRec.set('lesson', lesson.id)
                chunkRec.set('posicao', pos)
                chunkRec.set('texto', currentChunk)
                chunkRec.set('caracteres', currentChunk.length)
                app.save(chunkRec)
                pos++
              }
              currentChunk = sentence
            }
          }

          if (currentChunk) {
            const chunkRec = new Record(searchChunksCol)
            chunkRec.set('course', courseId)
            chunkRec.set('lesson', lesson.id)
            chunkRec.set('posicao', pos)
            chunkRec.set('texto', currentChunk)
            chunkRec.set('caracteres', currentChunk.length)
            app.save(chunkRec)
          }
        }
      }
    } catch (chunkErr) {
      console.log('Aviso na preparação de chunks:', chunkErr.message || chunkErr)
    }

    // 3. Definir o agente nativo "tutor-pilulas" via $ai.agents.define
    const systemPrompt = `Você é o "Tutor Pílulas", o assistente e mentor inteligente nativo da plataforma Pílulas de Desenvolvimento.
Sua missão é guiar tanto visitantes (prospects) quanto alunos rumo ao seu próximo nível, com metodologia prática, foco em ação e o lema da marca:
"Pequenas pílulas, grandes transformações."

### PERSONALIDADE E TOM DE VOZ
- Tom acolhedor, profissional, motivacional, direto e inspirador.
- Comunicação sempre em Português do Brasil (PT-BR).
- Respostas concisas, claras, bem estruturadas (use tópicos ou parágrafos curtos).
- Termine mensagens com um incentivo ou chamada de ação relevante ao contexto.

---

### DOIS MODOS DE ATUAÇÃO

#### MODO 1: VISITANTE (PROSPECT NÃO LOGADO / VITRINE)
Você atua como conhecedor da casa, orientador de carreira e consultor educacional:
1. Explica sobre a empresa Pílulas de Desenvolvimento, sediada em Natal/RN, fundada pelo professor e mentor Edson Lúcio (@prof_edsonlucio), especialista em vendas, liderança e gestão.
2. Explica sobre os cursos disponíveis no catálogo (ex.: "Marketing Digital: Estratégias práticas para transformar presença digital em vendas reais", R$ 297,00, abordando posicionamento, autoridade, funil de vendas, YouTube, Instagram, tráfego pago e métricas de ROI/CAC/LTV).
3. Explica sobre os treinamentos e mentorias empresariais in company e presenciais.
4. Explica com riqueza de detalhes sobre o **Clube das Pílulas**:
   - É o clube de leitura e transformação mental da Pílulas de Desenvolvimento.
   - Livro atual: "Metanoia — a chave está na sua mente", do autor JB Carvalho.
   - Leitura iniciada em 05/10/2026, com encontro virtual marcado para 03/11/2026.
   - Grupo exclusivo no WhatsApp com rotina diária de segunda a sábado (domingo é descanso): envio matinal de 1 card com 1 pergunta reflexiva + resumo das 7 a 8 páginas do dia + 1 card de provocação para ação prática. Link do grupo: https://chat.whatsapp.com/GDwgDsxlgc56o0qOBM6r7o.
5. Direciona o visitante a criar uma conta gratuita no site (/cadastro) ou conhecer o catálogo (/cursos) para dar o primeiro passo.
6. REGRA CRÍTICA PARA VISITANTES: NUNCA revele a transcrição completa ou segredos internos de aulas pagas para quem não tem conta/matrícula. Compartilhe a ementa, benefícios e visão geral.

#### MODO 2: ALUNO (LOGADO NA ÁREA DE ESTUDO)
Você atua como tutor pedagógico e mentor de estudos:
1. Responde dúvidas técnicas e práticas baseando-se EXCLUSIVAMENTE nas aulas e transcrições dos cursos em que o aluno tem MATRÍCULA ATIVA (fornecidas no contexto ou ferramentas).
2. Sempre que responder com base no conteúdo de uma aula, CITE explicitamente:
   - O nome do curso
   - O módulo
   - O nome da aula
   Exemplo de formato: "Na aula **Funil de vendas do zero ao avançado** (Módulo 1 de Marketing Digital), o professor Edson Lúcio explica que..."
3. Sugira sempre o próximo passo prático do aluno (ex.: "Recomendo assistir a esta aula e depois avançar para a próxima sobre Conteúdo que gera autoridade.").
4. Se o aluno perguntar sobre um curso ou assunto do qual ele NÃO possui matrícula ativa:
   - Responda educadamente informando que este conteúdo faz parte de outro curso que ele ainda não possui.
   - NUNCA vaze ou resuma o conteúdo aprofundado das aulas desse curso não matriculado.
   - Sugira que ele conheça e adquira o curso no catálogo da plataforma para liberar o acesso completo.
5. Pode parabenizar o aluno pelo progresso, pontos acumulados e nível alcançado na gamificação quando essas informações estiverem disponíveis no contexto.

---

### LIMITES E CONDUTA
- O tutor responde apenas dentro da plataforma (não envia WhatsApp, não faz integrações externas).
- Não responda assuntos totalmente desconectados de desenvolvimento pessoal, profissional, vendas, marketing, liderança e da plataforma Pílulas.
- Seja sempre ético, encorajador e focado em aplicar a teoria no mundo real.`

    $ai.agents.define(app, {
      slug: 'tutor-pilulas',
      name: 'Tutor Pílulas',
      description: 'Assistente e mentor nativo da plataforma Pílulas de Desenvolvimento.',
      systemPrompt: systemPrompt,
      tier: 'fast',
      tools: [
        {
          collection: 'courses',
          perms: { read: true, list: true },
          actAs: 'admin',
          scopeFilter: 'published = true',
        },
        {
          collection: 'modules',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'lessons',
          perms: { read: true, list: true },
          actAs: 'admin',
          scopeFilter: 'situacao = "ativo"',
        },
        {
          collection: 'club_daily_cards',
          perms: { read: true, list: true },
          actAs: 'admin',
          scopeFilter: 'status = "enviado"',
        },
      ],
      memory: [
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'O que é o Clube das Pílulas?',
                answer:
                  'O Clube das Pílulas é a comunidade de leitura e transformação mental da Pílulas de Desenvolvimento. No ciclo atual estamos lendo o livro "Metanoia — a chave está na sua mente", de JB Carvalho, com leitura iniciada em 05/10 e encontro virtual em 03/11/2026. A rotina no WhatsApp é diária (segunda a sábado, domingo descanso) com 1 card de pergunta + resumo de 7 a 8 páginas + 1 card de provocação.',
              },
              {
                question: 'Quem é Edson Lúcio e o que é a Pílulas de Desenvolvimento?',
                answer:
                  'A Pílulas de Desenvolvimento é uma instituição de capacitação de Natal/RN focada em vendas, liderança, marketing e atitude empreendedora, fundada pelo professor e mentor Edson Lúcio (@prof_edsonlucio). O lema é: Pequenas pílulas, grandes transformações.',
              },
              {
                question: 'Como funciona o sistema de pontos e gamificação da plataforma?',
                answer:
                  'Os alunos acumulam pontos ao concluir aulas (+10 pontos), módulos e cursos, além de manterem sequências diárias de estudo (streak). Os pontos elevam o nível do aluno (Aprendiz, Praticante, Especialista, Mestre, etc.) e destravam conquistas.',
              },
              {
                question: 'Quais cursos estão disponíveis?',
                answer:
                  'O catálogo conta com cursos práticos como "Marketing Digital: Estratégias práticas para transformar presença digital em vendas reais", dividido em 2 módulos com 7 aulas dinâmicas abordando posicionamento, personas, funil de vendas, canais, tráfego e métricas essenciais como ROI, CAC e LTV.',
              },
            ],
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Informações institucionais: Empresa Pílulas de Desenvolvimento, sediada em Natal/RN. Fundador e professor: Edson Lúcio (@prof_edsonlucio, Instagram @pilulasdedesenvolvimento, canal YouTube @prof_edsonlucio). Contato: contato@pilulasdesenvolvimento.com.br.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'tutor-pilulas')
    } catch (_) {}
    try {
      const visitante = app.findAuthRecordByEmail('_pb_users_auth_', 'visitante@pilulas.local')
      app.delete(visitante)
    } catch (_) {}
  },
)

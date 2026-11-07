/// <reference path="../pb_data/types.d.ts" />
// PARTE 5 — Avaliação do módulo e Certificado
// 1) Campo 'feedback' em quiz_questions (explicação exibida na correção da resposta)
// 2) Ajuste de rules em quiz_attempts para permitir que o aluno atualize sua tentativa mantendo a melhor nota
// 3) Ativar quiz_ativo nos módulos existentes e popular 5 perguntas por módulo com feedback detalhado
migrate(
  (app) => {
    // 1) Campo feedback na coleção quiz_questions
    const quizQuestions = app.findCollectionByNameOrId('quiz_questions')
    if (!quizQuestions.fields.getByName('feedback')) {
      quizQuestions.fields.add(
        new TextField({
          name: 'feedback',
          max: 1000,
        }),
      )
      app.save(quizQuestions)
    }

    // 2) Ajustar updateRule de quiz_attempts para permitir que o aluno atualize sua tentativa
    const quizAttempts = app.findCollectionByNameOrId('quiz_attempts')
    quizAttempts.updateRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || user = @request.auth.id)'
    app.save(quizAttempts)

    // 3) Ativar quiz_ativo e seed de 5 perguntas por módulo para o curso de Marketing Digital
    const modules = app.findRecordsByFilter('modules', '', 'position', 10, 0)
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i]
      mod.set('quiz_ativo', true)
      app.save(mod)

      const moduleId = mod.id
      const existingQuestions = app.findRecordsByFilter(
        'quiz_questions',
        'module = {:mod}',
        'position',
        10,
        0,
        { mod: moduleId },
      )
      if (existingQuestions.length === 0) {
        // Perguntas para Módulo 1 (Fundamentos do Marketing Digital) ou Módulo 2 (Tráfego Pago e Conversão)
        const isMod1 = mod.getString('title').toLowerCase().indexOf('fundamentos') >= 0 || i === 0

        const qData = isMod1
          ? [
              {
                pergunta:
                  'Segundo a mentalidade digital abordada no curso, qual é o principal diferencial do novo consumidor?',
                a: 'Ele compra por impulso sem pesquisar avaliações na internet',
                b: 'Ele pesquisa, compara opções e busca construir confiança antes de decidir',
                c: 'Ele prefere receber ligações de telemarketing a conteúdos educativos',
                d: 'Ele sempre escolhe o menor preço independente da qualidade da solução',
                correta: 'b',
                feedback:
                  'O comportamento de compra moderno mudou profundamente: o cliente pesquisa antes de confiar, buscando referências e consistência.',
              },
              {
                pergunta: 'Como uma persona deve ser construída na prática para guiar as vendas?',
                a: 'Baseada em dados genéricos de faixa etária e suposições da equipe',
                b: 'Copiando exatamente a persona de concorrentes diretos de outros estados',
                c: 'Através de conversas reais, identificando as dores, medos e critérios de decisão do cliente',
                d: 'Criando um personagem fictício com hobbies sem relação com o seu produto',
                correta: 'c',
                feedback:
                  'Uma boa persona nasce de conversas e padrões reais: o que a pessoa deseja, o que trava sua decisão e quais palavras ela usa.',
              },
              {
                pergunta:
                  'No funil de vendas simples e prático, qual é a função essencial do conteúdo de topo de funil?',
                a: 'Pedir fechamento imediato com desconto por escassez',
                b: 'Despertar consciência, responder dúvidas reais e atrair a pessoa certa',
                c: 'Apresentar termos contratuais e formas de pagamento parcelado',
                d: 'Criticar concorrentes diretos para forçar a compra',
                correta: 'b',
                feedback:
                  'No topo do funil, o foco é educar, responder dúvidas do dia a dia e despertar consciência para o problema.',
              },
              {
                pergunta: 'Qual é o papel do meio de funil na jornada de compra do cliente?',
                a: 'Cobrar boletos vencidos de leads antigos',
                b: 'Apenas coletar e-mails para envio em massa sem segmentação',
                c: 'Aprofundar a solução do problema e demonstrar autoridade com método claro',
                d: 'Oferecer degustações gratuitas indefinidamente',
                correta: 'c',
                feedback:
                  'No meio de funil o cliente já reconhece a dor: é onde demonstramos autoridade, método e geramos conexão e confiança.',
              },
              {
                pergunta: 'O que sustenta a construção de autoridade contínua no ambiente digital?',
                a: 'Falar de forma rebuscada e complexa para parecer inalcançável',
                b: 'Postar apenas promoções diárias com chamadas para comprar agora',
                c: 'Consistência em ajudar pessoas a enxergar soluções com clareza e método',
                d: 'Contratar milhares de seguidores fakes para impressionar novos visitantes',
                correta: 'c',
                feedback:
                  'Autoridade não é falar difícil: é simplificar o caminho e ajudar o cliente a enxergar as soluções com clareza e segurança.',
              },
            ]
          : [
              {
                pergunta:
                  'Qual o papel complementar do Instagram e do YouTube na estratégia de vendas digitais?',
                a: 'Ambos devem receber exatamente os mesmos vídeos nos mesmos horários',
                b: 'Instagram acelera relacionamento e frequência; YouTube aprofunda temas e é encontrado no longo prazo',
                c: 'O YouTube substitui o site institucional e o Instagram serve só para avisos',
                d: 'O Instagram atrai apenas jovens e o YouTube deve ser usado apenas para lazer',
                correta: 'b',
                feedback:
                  'Cada canal tem seu papel estratégico: o Instagram mantém presença e frequência, enquanto o YouTube constrói ativo perpétuo de busca.',
              },
              {
                pergunta:
                  'Qual é a regra de ouro ao iniciar campanhas de tráfego pago com anúncios?',
                a: 'Investir o maior orçamento disponível logo no primeiro dia sem testes',
                b: 'O tráfego pago amplifica uma mensagem; ele não corrige uma oferta confusa ou não validada',
                c: 'Nunca segmentar público para atingir o maior número possível de pessoas',
                d: 'Deixar anúncios rodando sem acompanhar métricas por pelo menos seis meses',
                correta: 'b',
                feedback:
                  'Tráfego pago funciona como um megafone: amplifica o que já funciona no orgânico, mas não conserta uma oferta fraca.',
              },
              {
                pergunta: 'O que representa a métrica CAC (Custo de Aquisição de Clientes)?',
                a: 'Quanto a empresa lucra por produto vendido no ponto de venda',
                b: 'O tempo médio que um cliente permanece ativo na base',
                c: 'O valor total investido em marketing e vendas dividido pelo número de clientes conquistados',
                d: 'O custo total do servidor e da infraestrutura da plataforma digital',
                correta: 'c',
                feedback:
                  'CAC mede quanto sua operação investe em média para conquistar cada novo cliente, integrando custos de mídia e vendas.',
              },
              {
                pergunta:
                  'Por que o LTV (Lifetime Value) deve ser analisado em conjunto com o CAC?',
                a: 'Para garantir que o valor gerado pelo cliente ao longo da vida compense o custo de adquiri-lo',
                b: 'Porque os dois indicadores obrigatoriamente devem ter o mesmo valor numérico',
                c: 'Apenas para fins contábeis e fiscais perante órgãos reguladores',
                d: 'Porque quanto maior o CAC em relação ao LTV, mais saudável é o negócio',
                correta: 'a',
                feedback:
                  'Um negócio saudável busca um LTV significativamente superior ao CAC (geralmente 3x ou mais), garantindo margem de crescimento sustentável.',
              },
              {
                pergunta:
                  'Ao realizar testes com anúncios patrocinados, qual é a conduta mais recomendada?',
                a: 'Mudar criativo, público e texto todos juntos a cada hora',
                b: 'Testar variações controladas com orçamento pequeno e tomar decisões com base nos dados',
                c: 'Desativar anúncios que não venderam na primeira hora de veiculação',
                d: 'Manter criativos com custo por lead muito alto apenas por preferência estética',
                correta: 'b',
                feedback:
                  'Testes de anúncios exigem método: variações isoladas de criativo/público com pequenos orçamentos até encontrar o campeão de conversão.',
              },
            ]

        for (let q = 0; q < qData.length; q++) {
          const item = qData[q]
          const qRecord = new Record(quizQuestions)
          qRecord.set('module', moduleId)
          qRecord.set('pergunta', item.pergunta)
          qRecord.set('alternativa_a', item.a)
          qRecord.set('alternativa_b', item.b)
          qRecord.set('alternativa_c', item.c)
          qRecord.set('alternativa_d', item.d)
          qRecord.set('correta', item.correta)
          qRecord.set('feedback', item.feedback)
          qRecord.set('position', q + 1)
          app.save(qRecord)
        }
      }
    }
  },
  (app) => {
    const quizQuestions = app.findCollectionByNameOrId('quiz_questions')
    if (quizQuestions.fields.getByName('feedback')) {
      quizQuestions.fields.removeByName('feedback')
      app.save(quizQuestions)
    }
  },
)

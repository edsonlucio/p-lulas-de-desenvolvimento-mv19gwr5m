/// <reference path="../pb_data/types.d.ts" />
// FASE 1 — Dados de exemplo para o curso seed "Marketing Digital":
// 1) Preenche ideia central, 3 tópicos e exercício das aulas existentes
// 2) Ativa a avaliação dos módulos seed
// 3) Cria 5 perguntas de exemplo por módulo (quiz_questions)
// Idempotente: só preenche campos vazios e só cria perguntas se o módulo não tiver nenhuma.
migrate(
  (app) => {
    const course = app.findRecordsByFilter('courses', 'slug = "marketing-digital"', '', 1)[0]
    if (!course) return

    const modules = app.findRecordsByFilter('modules', `course = "${course.id}"`, 'position', -1, 0)
    const moduleByTitle = {}
    for (const mod of modules) moduleByTitle[mod.getString('title')] = mod

    // --- 1) Conteúdo de exemplo por aula (busca por título dentro do curso) ---
    const exemplos = {
      'Mentalidade digital: vendas no novo mercado': {
        ideia_central:
          'O novo mercado recompensa quem observa, testa e melhora com constância — não quem apenas aparece.',
        topico_1: 'O comportamento de compra mudou: o cliente pesquisa antes de confiar.',
        topico_2: 'Mentalidade digital é um ciclo: observar, testar, medir e ajustar.',
        topico_3: 'Consistência vale mais que perfeição: presença regular constrói confiança.',
        exercicio:
          'Escreva em uma frase o que o seu cliente ideal realmente compra de você (o resultado, não o produto). Depois, liste 1 ação sua desta semana que provou esse valor.',
      },
      'Posicionamento e persona: para quem você vende': {
        ideia_central:
          'Quando você tenta falar com todo mundo, sua mensagem não encontra ninguém: persona clara é o que dá direção à venda.',
        topico_1: 'Persona nasce de perguntas e conversas reais, não de suposições.',
        topico_2: 'Dores e desejos específicos geram comunicação específica.',
        topico_3: 'Posicionamento é a frase que faz o cliente certo se reconhecer.',
        exercicio:
          'Entreviste (ou escreva como se fosse) 1 cliente real: o que ele queria, o que travava a decisão e o que fez escolher você. Resuma em 3 linhas.',
      },
      'Funil de vendas do zero ao avançado': {
        ideia_central:
          'Um funil organiza a jornada em três movimentos: atrair a pessoa certa, nutrir confiança e facilitar a decisão.',
        topico_1: 'Topo: conteúdo que responde dúvidas e desperta consciência.',
        topico_2: 'Meio: aprofundar o problema e mostrar caminhos (autoridade).',
        topico_3: 'Fundo: oferta clara com chamada para ação direta.',
        exercicio:
          'Desenhe seu funil em 3 colunas (atrair, nutrir, converter) e escreva 1 conteúdo e 1 chamada para ação para cada etapa.',
      },
      'Conteúdo que gera autoridade': {
        ideia_central:
          'Autoridade não é falar difícil: é ajudar alguém a enxergar com mais clareza.',
        topico_1: 'Alterne 4 tipos de conteúdo: educar, provar, inspirar e convidar.',
        topico_2: 'História real aproxima; método simplificado engaja.',
        topico_3: 'Planejamento simples (pautas) sustenta a consistência.',
        exercicio:
          'Crie uma pauta com 4 posts: 1 ensinando, 1 mostrando resultado, 1 com uma história sua e 1 convidando para o próximo passo.',
      },
      'Instagram e YouTube a favor das vendas': {
        ideia_central:
          'Instagram acelera relacionamento; YouTube aprofunda e continua sendo encontrado por muito mais tempo.',
        topico_1: 'Cada canal tem um papel: frequência e descoberta vs. profundidade.',
        topico_2: 'Adapte o formato para cada canal em vez de copiar o mesmo vídeo.',
        topico_3: 'Toda peça de conteúdo termina em uma chamada para a conversa comercial.',
        exercicio:
          'Escolha 1 tema e planeje 3 formatos: um Reels curto, um vídeo longo de YouTube e um carrossel — cada um com sua chamada para ação.',
      },
      'Anúncios: primeiros passos no tráfego pago': {
        ideia_central: 'Tráfego pago amplifica uma mensagem; ele não corrige uma oferta confusa.',
        topico_1: 'Comece com 3 definições: objetivo, audiência e ação mensurável.',
        topico_2: 'Teste criativos com orçamento pequeno e pare quando o dado falar.',
        topico_3: 'Campanha boa nasce de oferta validada no orgânico.',
        exercicio:
          'Escreva a promessa do seu anúncio em 1 frase e liste 2 variações de criativo (imagem e texto) para testar com o menor orçamento possível.',
      },
      'Métricas que importam: ROI, CAC e LTV': {
        ideia_central:
          'Métrica só tem valor quando muda uma decisão: CAC, LTV e ROI são perguntas, não enfeites.',
        topico_1: 'CAC: quanto custa conquistar 1 cliente.',
        topico_2: 'LTV: quanto valor 1 cliente gera ao longo do relacionamento.',
        topico_3: 'ROI: comparar retorno e investimento antes de escalar.',
        exercicio:
          'Levante 3 números da sua operação: quanto investiu no último mês, quantos clientes entraram e quanto cada cliente gasta. Calcule seu CAC e seu LTV.',
      },
    }

    const mod1 = moduleByTitle['Fundamentos do Marketing Digital']
    const mod2 = moduleByTitle['Tráfego Pago e Conversão']

    for (const mod of modules) {
      const lessons = app.findRecordsByFilter('lessons', `module = "${mod.id}"`, 'position', -1, 0)
      for (const lesson of lessons) {
        const exemplo = exemplos[lesson.getString('title')]
        if (!exemplo) continue
        const changed =
          !lesson.getString('ideia_central') ||
          !lesson.getString('topico_1') ||
          !lesson.getString('topico_2') ||
          !lesson.getString('topico_3') ||
          !lesson.getString('exercicio')
        if (!changed) continue
        lesson.set('ideia_central', lesson.getString('ideia_central') || exemplo.ideia_central)
        lesson.set('topico_1', lesson.getString('topico_1') || exemplo.topico_1)
        lesson.set('topico_2', lesson.getString('topico_2') || exemplo.topico_2)
        lesson.set('topico_3', lesson.getString('topico_3') || exemplo.topico_3)
        lesson.set('exercicio', lesson.getString('exercicio') || exemplo.exercicio)
        app.save(lesson)
      }
    }

    // --- 2) Avaliação ativa nos módulos seed ---
    if (mod1 && !mod1.getBool('quiz_ativo')) {
      mod1.set('quiz_ativo', true)
      app.save(mod1)
    }
    if (mod2 && !mod2.getBool('quiz_ativo')) {
      mod2.set('quiz_ativo', true)
      app.save(mod2)
    }

    // --- 3) Perguntas de exemplo (5 por módulo) ---
    const perguntasMod1 = [
      {
        pergunta: 'O que caracteriza a mentalidade digital descrita na aula?',
        alternativa_a: 'Postar todos os dias sem avaliar resultado',
        alternativa_b: 'Observar, testar, medir e ajustar com constância',
        alternativa_c: 'Só investir em anúncios pagos',
        alternativa_d: 'Copiar o que a concorrência faz',
        correta: 'b',
      },
      {
        pergunta: 'Por que falar com "todo mundo" não funciona?',
        alternativa_a: 'Porque custa mais caro anunciar',
        alternativa_b: 'Porque o Instagram limita o alcance',
        alternativa_c: 'Porque mensagem genérica não faz o cliente certo se reconhecer',
        alternativa_d: 'Porque persona só serve para grandes empresas',
        correta: 'c',
      },
      {
        pergunta: 'Qual é a ordem correta das etapas de um funil de vendas?',
        alternativa_a: 'Converter, atrair e nutrir',
        alternativa_b: 'Atrair, nutrir e converter',
        alternativa_c: 'Nutrir, converter e atrair',
        alternativa_d: 'Atrair, converter e anunciar',
        correta: 'b',
      },
      {
        pergunta: 'No funil, o que faz o conteúdo do topo?',
        alternativa_a: 'Fecha a venda com desconto',
        alternativa_b: 'Cobra o cartão do cliente',
        alternativa_c: 'Responde dúvidas e desperta consciência do problema',
        alternativa_d: 'Substitui o time comercial',
        correta: 'c',
      },
      {
        pergunta: 'O que gera autoridade em conteúdo, segundo a aula?',
        alternativa_a: 'Usar palavras difíceis e jargão',
        alternativa_b: 'Postar só propaganda do produto',
        alternativa_c: 'Ajudar a pessoa a enxergar com mais clareza',
        alternativa_d: 'Ter muitos seguidores',
        correta: 'c',
      },
    ]

    const perguntasMod2 = [
      {
        pergunta: 'Qual é o papel do Instagram na estratégia?',
        alternativa_a: 'Acelerar relacionamento com frequência de contato',
        alternativa_b: 'Substituir o site da empresa',
        alternativa_c: 'Aprofundar temas longos',
        alternativa_d: 'Apenas publicar fotos de produto',
        correta: 'a',
      },
      {
        pergunta: 'Por que o YouTube continua trazendo audiência por mais tempo?',
        alternativa_a: 'Porque os posts ficam fixos no feed',
        alternativa_b: 'Porque o conteúdo é encontrado por busca ao longo do tempo',
        alternativa_c: 'Porque os anúncios são mais baratos lá',
        alternativa_d: 'Porque não precisa de chamada para ação',
        correta: 'b',
      },
      {
        pergunta: 'O que o tráfego pago faz com uma mensagem?',
        alternativa_a: 'Corrige uma oferta confusa',
        alternativa_b: 'Cria a oferta por você',
        alternativa_c: 'Amplifica o que já está funcionando',
        alternativa_d: 'Garante vendas imediatas',
        correta: 'c',
      },
      {
        pergunta: 'Como começar no tráfego pago sem desperdiçar dinheiro?',
        alternativa_a: 'Com o maior orçamento possível em um único criativo',
        alternativa_b: 'Definindo objetivo, audiência e ação mensurável, testando barato',
        alternativa_c: 'Impulsionando todos os posts',
        alternativa_d: 'Esperando o orgânico morrer para começar',
        correta: 'b',
      },
      {
        pergunta: 'O que o LTV mede?',
        alternativa_a: 'Quanto custa conquistar 1 cliente',
        alternativa_b: 'Quantas pessoas viram o anúncio',
        alternativa_c: 'O lucro de uma campanha específica',
        alternativa_d: 'Quanto valor 1 cliente gera ao longo do relacionamento',
        correta: 'd',
      },
    ]

    function criarPerguntas(mod, lista) {
      if (!mod) return
      const existentes = app.countRecordsByFilter('quiz_questions', `module = "${mod.id}"`)
      if (existentes > 0) return
      const questionsCol = app.findCollectionByNameOrId('quiz_questions')
      lista.forEach((item, idx) => {
        const record = new Record(questionsCol)
        record.set('module', mod.id)
        record.set('pergunta', item.pergunta)
        record.set('alternativa_a', item.alternativa_a)
        record.set('alternativa_b', item.alternativa_b)
        record.set('alternativa_c', item.alternativa_c)
        record.set('alternativa_d', item.alternativa_d)
        record.set('correta', item.correta)
        record.set('position', idx + 1)
        app.save(record)
      })
    }

    criarPerguntas(mod1, perguntasMod1)
    criarPerguntas(mod2, perguntasMod2)
  },
  (app) => {
    // Reversão simples: remove as perguntas criadas para o curso seed e desativa o quiz.
    // Campos de aula preenchidos permanecem (são conteúdo, não estrutura).
    const course = app.findRecordsByFilter('courses', 'slug = "marketing-digital"', '', 1)[0]
    if (!course) return
    const modules = app.findRecordsByFilter('modules', `course = "${course.id}"`, 'position', -1, 0)
    for (const mod of modules) {
      const questions = app.findRecordsByFilter('quiz_questions', `module = "${mod.id}"`, '', -1, 0)
      for (const question of questions) app.delete(question)
      mod.set('quiz_ativo', false)
      app.save(mod)
    }
  },
)

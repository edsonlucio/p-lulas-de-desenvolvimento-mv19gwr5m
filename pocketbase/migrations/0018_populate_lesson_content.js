/// <reference path="../pb_data/types.d.ts" />
// Popula os campos da metodologia Pílulas (ideia_central, topico_1, topico_2, topico_3, exercicio)
// nas aulas do curso Marketing Digital caso estejam vazios.
migrate(
  (app) => {
    let course
    try {
      course = app.findFirstRecordByFilter('courses', 'slug = "marketing-digital"')
    } catch (_) {
      return
    }

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

    const modules = app.findRecordsByFilter('modules', `course = "${course.id}"`, 'position', 50, 0)
    for (const mod of modules) {
      const lessons = app.findRecordsByFilter('lessons', `module = "${mod.id}"`, 'position', 50, 0)
      for (const lesson of lessons) {
        const title = lesson.getString('title')
        const data = exemplos[title]
        if (!data) continue

        let needsSave = false
        if (!lesson.getString('ideia_central')) {
          lesson.set('ideia_central', data.ideia_central)
          needsSave = true
        }
        if (!lesson.getString('topico_1')) {
          lesson.set('topico_1', data.topico_1)
          needsSave = true
        }
        if (!lesson.getString('topico_2')) {
          lesson.set('topico_2', data.topico_2)
          needsSave = true
        }
        if (!lesson.getString('topico_3')) {
          lesson.set('topico_3', data.topico_3)
          needsSave = true
        }
        if (!lesson.getString('exercicio')) {
          lesson.set('exercicio', data.exercicio)
          needsSave = true
        }

        if (needsSave) {
          app.save(lesson)
        }
      }
    }
  },
  () => {},
)

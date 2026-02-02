/**
 * FAQ - Decora Esquadrias
 * Base de conhecimento oficial para o agente de IA
 * 75+ perguntas e respostas
 */

export interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
}

export const FAQ: FAQItem[] = [
  // =====================================================
  // QUALIDADE E DURABILIDADE
  // =====================================================
  {
    id: 'q1',
    category: 'qualidade',
    question: 'O alumínio enferruja ou desgasta com o tempo?',
    answer: 'Não. O alumínio linha 25 é mais espesso e resistente, e a pintura eletrostática em pó não descasca, não desbota e não sofre corrosão. Durabilidade garantida por muitos anos.',
    keywords: ['enferruja', 'desgasta', 'alumínio', 'durabilidade']
  },
  {
    id: 'q2',
    category: 'qualidade',
    question: 'A pintura branca ou preta desbota com o sol?',
    answer: 'Não desbota. A pintura eletrostática é altamente resistente aos raios UV, calor e chuva. Pode usar em ambientes internos ou externos sem preocupação.',
    keywords: ['pintura', 'desbota', 'sol', 'cor']
  },
  {
    id: 'q3',
    category: 'qualidade',
    question: 'Qual a diferença entre essa janela e as mais baratas da internet?',
    answer: 'As janelas baratas são linha 15-17 (finas, frágeis, empenam). A Decora usa linha 25 com alumínio espesso, vidro 4mm, roldanas de qualidade, borrachas premium, trilhos profundos e fecho antifurto. Diferença brutal na qualidade.',
    keywords: ['diferença', 'barata', 'qualidade', 'comparação']
  },
  {
    id: 'q4',
    category: 'qualidade',
    question: 'A janela vem firme ou fica bamba com o tempo?',
    answer: 'Vem totalmente regulada da fábrica. Quando instalada corretamente, não treme, não vibra e não desalinha. Se ficar torta, é problema de instalação.',
    keywords: ['firme', 'bamba', 'regulada']
  },
  {
    id: 'q5',
    category: 'qualidade',
    question: 'A janela desliza bem ou fica enroscando?',
    answer: 'Desliza de forma leve, silenciosa e sem tranco. Se enroscar, geralmente é sujeira no trilho ou instalação fora do esquadro - fácil de resolver.',
    keywords: ['desliza', 'enrosca', 'pesada']
  },
  {
    id: 'q6',
    category: 'qualidade',
    question: 'O fecho é seguro? Alguém consegue abrir por fora?',
    answer: 'Não. O fecho é antifurto - trava internamente e só abre por dentro apertando o botão. Segurança superior.',
    keywords: ['fecho', 'seguro', 'antifurto', 'abre']
  },
  {
    id: 'q7',
    category: 'qualidade',
    question: 'A janela veda bem contra chuva?',
    answer: 'Sim! Vedação excelente com borrachas de pressão, escovas nos pontos de contato e trilhos profundos. Se comporta muito bem em chuva forte. Só o Capelinha pode respingar em chuva MUITO intensa.',
    keywords: ['veda', 'chuva', 'água', 'vedação']
  },
  {
    id: 'q8',
    category: 'qualidade',
    question: 'A janela ajuda a reduzir barulho?',
    answer: 'Não é termoacústica, mas o alumínio linha 25, vidro 4mm e borrachas de vedação reduzem uma boa parte do som externo. Mais silenciosa que modelos inferiores.',
    keywords: ['barulho', 'som', 'acústica', 'ruído']
  },
  {
    id: 'q9',
    category: 'qualidade',
    question: 'As borrachas ressecam com o tempo?',
    answer: 'São borrachas premium feitas para durar anos. A única manutenção é manter a janela limpa.',
    keywords: ['borracha', 'resseca', 'vedação']
  },
  {
    id: 'q10',
    category: 'qualidade',
    question: 'O acabamento é realmente superior?',
    answer: 'Sim! Pintura homogênea, encaixes precisos, vidros bem colocados, nada empenado ou torto. Já sai pronta para instalação.',
    keywords: ['acabamento', 'qualidade', 'superior']
  },

  // =====================================================
  // MEDIDAS
  // =====================================================
  {
    id: 'q11',
    category: 'medidas',
    question: 'Não sei qual medida escolher. Vocês ajudam?',
    answer: 'Sim! Me diz o tamanho do vão, o ambiente (cozinha, banheiro...) e o objetivo (ventilação, privacidade) que te recomendo o modelo e medida ideal.',
    keywords: ['medida', 'escolher', 'ajuda', 'tamanho']
  },
  {
    id: 'q12',
    category: 'medidas',
    question: 'Uma janela estreita ilumina bem?',
    answer: 'Depende do contexto. Em cozinha entre armários fica excelente. 30cm de altura não é recomendado para cozinha - muito estreita.',
    keywords: ['estreita', 'ilumina', 'luz']
  },
  {
    id: 'q13',
    category: 'medidas',
    question: 'Qual tamanho fica proporcional para banheiro?',
    answer: 'Os mais usados são: 40x80, 50x80, 40x100, 50x100. Para vãos pequenos, 30x80.',
    keywords: ['banheiro', 'tamanho', 'proporcional']
  },
  {
    id: 'q14',
    category: 'medidas',
    question: 'Para cozinha, qual medida é ideal?',
    answer: 'Entre armários: 40x120, 40x150, 40x180. Para ventilação grande: 60x150, 60x180. Não recomendado: 30x30, 30x40 (muito estreita).',
    keywords: ['cozinha', 'medida', 'ideal']
  },
  {
    id: 'q15',
    category: 'medidas',
    question: 'Meu vão é 37,6 cm. Qual medida compro?',
    answer: 'Trabalhamos com múltiplos de 0,5cm. Sua medida fica 37,5cm, que funciona perfeitamente com a folga de instalação (5mm lateral, 3mm altura).',
    keywords: ['vão', 'medida quebrada', 'arredondamento']
  },
  {
    id: 'q16',
    category: 'medidas',
    question: 'Preciso deixar folga ou compro exato?',
    answer: 'Precisa de folga: 5mm nas laterais e 3mm na altura. Não pode encaixar "travado" sem espaço.',
    keywords: ['folga', 'exato', 'instalação']
  },
  {
    id: 'q17',
    category: 'medidas',
    question: 'Vocês fazem sob encomenda?',
    answer: 'Sim! Até 2 metros para Grande SP. Para fora de SP, o limite é 1,80m (transporte).',
    keywords: ['sob encomenda', 'personalizada', 'medida especial']
  },
  {
    id: 'q18',
    category: 'medidas',
    question: 'Qual é o limite para transportar?',
    answer: 'Fora de SP: até 1,80m de largura. Grande SP: até 2,00m. Acima disso precisa avaliação especial.',
    keywords: ['limite', 'transporte', 'máximo']
  },

  // =====================================================
  // MODELOS
  // =====================================================
  {
    id: 'q21',
    category: 'modelos',
    question: 'Qual a diferença entre janela de duas e três folhas?',
    answer: '2 folhas: mais compacta, abertura menor, custo menor. 3 folhas: maior ventilação (abre 2/3 do vão), ideal para janelas largas.',
    keywords: ['duas folhas', 'três folhas', 'diferença']
  },
  {
    id: 'q22',
    category: 'modelos',
    question: 'A de três folhas ventila mais mesmo?',
    answer: 'Sim! É a que dá maior abertura possível - abre 2/3 do vão.',
    keywords: ['três folhas', 'ventila', 'ventilação']
  },
  {
    id: 'q23',
    category: 'modelos',
    question: 'Quando faz sentido colocar tela?',
    answer: 'Quando há muitos insetos na região, ambiente fica aberto à noite, tem crianças, ou é cozinha/lavanderia.',
    keywords: ['tela', 'mosquiteira', 'insetos']
  },
  {
    id: 'q24',
    category: 'modelos',
    question: 'Moro em lugar com muito inseto. Qual modelo?',
    answer: 'Janela com tela embutida é ideal. Qualquer modelo funciona, mas a tela integrada é mais prática.',
    keywords: ['inseto', 'mosquito', 'tela']
  },
  {
    id: 'q25',
    category: 'modelos',
    question: 'A janela com grade é feia?',
    answer: 'Não! As grades são discretas, alinhadas ao design e não parecem "grade de cadeia". Pensadas para serem elegantes.',
    keywords: ['grade', 'feia', 'estética']
  },
  {
    id: 'q26',
    category: 'modelos',
    question: 'A grade atrapalha a janela correr?',
    answer: 'Não. A grade é montada por fora do trilho, sem interferir no deslizamento.',
    keywords: ['grade', 'correr', 'atrapalha']
  },
  {
    id: 'q27',
    category: 'modelos',
    question: 'O Capelinha vaza quando chove forte?',
    answer: 'Normalmente não vaza, mas em chuva MUITO forte com vento lateral pode respingar um pouco. Para regiões muito chuvosas, recomendo janela de correr.',
    keywords: ['capelinha', 'vaza', 'chuva', 'pivotante']
  },
  {
    id: 'q28',
    category: 'modelos',
    question: 'A pivotante abre para qual lado? Posso escolher?',
    answer: 'Sim! Você escolhe: abertura lateral ou superior (em casos especiais).',
    keywords: ['pivotante', 'lado', 'abertura']
  },
  {
    id: 'q29',
    category: 'modelos',
    question: 'Capelinha é bom para banheiro?',
    answer: 'Sim, muito comum! Mas use vidro mini boreal para privacidade.',
    keywords: ['capelinha', 'banheiro']
  },
  {
    id: 'q30',
    category: 'modelos',
    question: 'Qual modelo é melhor para lavanderia?',
    answer: 'Até 1,20m: 2 folhas. Acima de 1,20m: 3 folhas. Para máxima ventilação: 3 folhas.',
    keywords: ['lavanderia', 'modelo']
  },
  {
    id: 'q31',
    category: 'modelos',
    question: 'Quero a maior ventilação possível. Qual modelo?',
    answer: 'Janela de 3 folhas! Ou Capelinha se o espaço permitir.',
    keywords: ['ventilação', 'máxima', 'modelo']
  },

  // =====================================================
  // VIDROS
  // =====================================================
  {
    id: 'q33',
    category: 'vidros',
    question: 'Qual vidro deixa mais luz entrar?',
    answer: 'Incolor - máxima iluminação.',
    keywords: ['vidro', 'luz', 'iluminação']
  },
  {
    id: 'q34',
    category: 'vidros',
    question: 'Qual vidro dá mais privacidade?',
    answer: 'Mini Boreal - máxima privacidade, ideal para banheiro.',
    keywords: ['vidro', 'privacidade', 'boreal']
  },
  {
    id: 'q35',
    category: 'vidros',
    question: 'O vidro fumê escurece muito?',
    answer: 'Escurece um pouco mas mantém boa iluminação. Muito usado em fachadas e cozinhas modernas.',
    keywords: ['fumê', 'escurece', 'vidro']
  },
  {
    id: 'q36',
    category: 'vidros',
    question: 'Vidro de 4mm é seguro?',
    answer: 'Sim, é o padrão para janelas. Pode quebrar com impacto forte, mas não estilhaça em farpas grandes.',
    keywords: ['vidro', '4mm', 'seguro']
  },
  {
    id: 'q37',
    category: 'vidros',
    question: 'Se o vidro quebrar no transporte?',
    answer: 'Envie fotos e vídeos imediatamente. Avaliamos a gravidade e oferecemos soluções: novo vidro, vidraceiro local ou troca da janela.',
    keywords: ['vidro', 'quebrar', 'transporte']
  },

  // =====================================================
  // INSTALAÇÃO
  // =====================================================
  {
    id: 'q39',
    category: 'instalação',
    question: 'A janela já vem pronta?',
    answer: 'Sim! Chega montada, regulada, travada com cintas, com proteção de chapatex. Pronta para colocar no vão e chumbar.',
    keywords: ['pronta', 'montada', 'instalação']
  },
  {
    id: 'q40',
    category: 'instalação',
    question: 'Pode instalar em drywall?',
    answer: 'Sim, usando buchas específicas para drywall. Mas verifique a profundidade: mínimo 7cm para 2 folhas, 10,5cm para 3 folhas.',
    keywords: ['drywall', 'instalar', 'gesso']
  },
  {
    id: 'q41',
    category: 'instalação',
    question: 'Pode instalar em container?',
    answer: 'Sim, desde que o vão tenha medidas compatíveis e permita fixação adequada.',
    keywords: ['container', 'instalar']
  },
  {
    id: 'q42',
    category: 'instalação',
    question: 'Por que não recomendam espuma expansiva?',
    answer: 'Porque mancha e danifica permanentemente a pintura, pode entortar a janela ao expandir e não sai sem arranhar. Use massa ou parafusos.',
    keywords: ['espuma', 'expansiva', 'proibido']
  },
  {
    id: 'q43',
    category: 'instalação',
    question: 'Precisa nivelar a parede?',
    answer: 'Sim! Se o esquadro estiver torto, a janela fica torta. A janela é enviada 100% no esquadro - o instalador ajusta a parede.',
    keywords: ['nivelar', 'parede', 'esquadro']
  },
  {
    id: 'q44',
    category: 'instalação',
    question: 'Se a janela ficar torta, é defeito?',
    answer: 'Não. É problema de instalação. A janela é enviada 100% no esquadro e regulada.',
    keywords: ['torta', 'defeito', 'instalação']
  },
  {
    id: 'q45',
    category: 'instalação',
    question: 'Quanto tempo leva para instalar?',
    answer: 'Entre 30 minutos e 1 hora, dependendo do modelo e experiência do instalador.',
    keywords: ['tempo', 'instalar', 'duração']
  },
  {
    id: 'q46',
    category: 'instalação',
    question: 'É fácil instalar sozinho?',
    answer: 'Sim, é possível. Mas recomendamos ter um profissional para garantir o esquadro perfeito.',
    keywords: ['sozinho', 'instalar', 'fácil']
  },
  {
    id: 'q48',
    category: 'instalação',
    question: 'Não consigo alcançar a janela. Tem solução?',
    answer: 'Sim! O fecho-avião (R$50) permite abrir e fechar sem alcançar a folha. Somente para Capelinha horizontal.',
    keywords: ['alcançar', 'alto', 'fecho-avião']
  },

  // =====================================================
  // USO DIÁRIO
  // =====================================================
  {
    id: 'q49',
    category: 'uso',
    question: 'A janela faz barulho ao correr?',
    answer: 'Não. Desliza macio e silenciosa graças às roldanas de rolamento.',
    keywords: ['barulho', 'correr', 'ruído']
  },
  {
    id: 'q50',
    category: 'uso',
    question: 'Precisa lubrificar?',
    answer: 'Não. As roldanas são de rolamento e não precisam de lubrificação. Apenas manter limpa.',
    keywords: ['lubrificar', 'óleo', 'manutenção']
  },
  {
    id: 'q51',
    category: 'uso',
    question: 'Como limpar sem estragar a pintura?',
    answer: 'Pano macio + sabão neutro. Nunca use lado verde da bucha ou produtos abrasivos.',
    keywords: ['limpar', 'pintura', 'manutenção']
  },
  {
    id: 'q52',
    category: 'uso',
    question: 'Como limpar a tela?',
    answer: 'Pano úmido, secador no ar frio ou aspirador de pó (suavemente).',
    keywords: ['limpar', 'tela', 'mosquiteira']
  },
  {
    id: 'q53',
    category: 'uso',
    question: 'A janela pode travar com o tempo?',
    answer: 'Se acumular sujeira no trilho, pode ficar pesada. Limpeza resolve!',
    keywords: ['travar', 'pesada', 'sujeira']
  },
  {
    id: 'q54',
    category: 'uso',
    question: 'O trilho enrosca se tiver poeira?',
    answer: 'A poeira atrapalha um pouco, mas nada grave. Limpeza mensal resolve.',
    keywords: ['trilho', 'poeira', 'enrosca']
  },
  {
    id: 'q55',
    category: 'uso',
    question: 'A folha ficou pesada. Tem como ajustar?',
    answer: 'Sim! Ajuste a regulagem das roldanas ou nivele novamente.',
    keywords: ['pesada', 'ajustar', 'roldana']
  },

  // =====================================================
  // FRETE E PRAZOS
  // =====================================================
  {
    id: 'q56',
    category: 'frete',
    question: 'É seguro enviar vidro?',
    answer: 'Sim! As janelas vão embaladas com chapatex, plástico bolha em excesso e proteção de madeira nas extremidades.',
    keywords: ['seguro', 'enviar', 'vidro', 'embalagem']
  },
  {
    id: 'q57',
    category: 'frete',
    question: 'Como são embaladas?',
    answer: 'Proteção rígida, plástico bolha, cinta e chapatex cobrindo a pintura. Cantos reforçados com madeira.',
    keywords: ['embalagem', 'proteção', 'envio']
  },
  {
    id: 'q58',
    category: 'frete',
    question: 'Quanto tempo leva para chegar?',
    answer: 'Grande SP: até 5 dias úteis. Interior SP: até 8 dias. RJ/MG: até 10 dias. Sul: 8-12 dias. Nordeste: até 15 dias.',
    keywords: ['tempo', 'prazo', 'entrega', 'chegar']
  },
  {
    id: 'q59',
    category: 'frete',
    question: 'Vocês mesmos entregam na Grande SP?',
    answer: 'Sim! Entregas próprias sempre às quintas-feiras.',
    keywords: ['entrega', 'SP', 'quinta']
  },
  {
    id: 'q60',
    category: 'frete',
    question: 'Qual transportadora entrega fora de SP?',
    answer: 'JadLog.',
    keywords: ['transportadora', 'fora', 'SP']
  },
  {
    id: 'q61',
    category: 'frete',
    question: 'Como funciona a entrega de quinta-feira?',
    answer: 'Pedidos feitos até segunda à noite são entregues na quinta. De terça em diante, entrega na quinta seguinte.',
    keywords: ['quinta', 'entrega', 'SP']
  },
  {
    id: 'q62',
    category: 'frete',
    question: 'Vocês enviam rastreio?',
    answer: 'Sim! Enviamos no dia do envio.',
    keywords: ['rastreio', 'código', 'acompanhar']
  },
  {
    id: 'q65',
    category: 'frete',
    question: 'Posso pedir urgência?',
    answer: 'Sim! Em alguns casos é possível produzir em até 3 dias úteis (apenas para fora de SP).',
    keywords: ['urgência', 'rápido', 'prazo']
  },

  // =====================================================
  // GARANTIA E TROCAS
  // =====================================================
  {
    id: 'q66',
    category: 'garantia',
    question: 'Qual a garantia?',
    answer: '7 dias para devolução por lei, e suporte total se houver problema de funcionalidade.',
    keywords: ['garantia', 'prazo', 'devolução']
  },
  {
    id: 'q67',
    category: 'garantia',
    question: 'Posso devolver se não gostar?',
    answer: 'Sim, dentro de 7 dias corridos do recebimento.',
    keywords: ['devolver', 'não gostar', 'arrependimento']
  },
  {
    id: 'q68',
    category: 'garantia',
    question: 'Passou dos 7 dias. Posso devolver?',
    answer: 'Apenas se houver defeito funcional.',
    keywords: ['7 dias', 'devolver', 'prazo']
  },
  {
    id: 'q69',
    category: 'garantia',
    question: 'Instalei e não gostei. Posso devolver?',
    answer: 'Não, porque a instalação altera a estrutura e impossibilita revenda.',
    keywords: ['instalou', 'devolver', 'arrependimento']
  },
  {
    id: 'q70',
    category: 'garantia',
    question: 'O que não é coberto pela garantia?',
    answer: 'Mau uso, instalação errada, danos por abrasão, janela torta por esquadro torto.',
    keywords: ['garantia', 'não cobre', 'exclusões']
  },
  {
    id: 'q71',
    category: 'garantia',
    question: 'Chegou riscado ou torto. O que faço?',
    answer: 'Envie fotos e vídeos imediatamente. Avaliamos e resolvemos com total suporte.',
    keywords: ['riscado', 'torto', 'defeito', 'chegou']
  },
  {
    id: 'q72',
    category: 'garantia',
    question: 'Vocês trocam só o vidro ou a janela toda?',
    answer: 'Depende da situação. Em muitos casos, basta trocar o vidro localmente.',
    keywords: ['trocar', 'vidro', 'janela']
  },
  {
    id: 'q73',
    category: 'garantia',
    question: 'Como faço para devolver?',
    answer: 'Embale novamente (pode usar embalagem original ou similar), proteja bem e aguarde a coleta.',
    keywords: ['devolver', 'como', 'processo']
  },
  {
    id: 'q74',
    category: 'garantia',
    question: 'Preciso da embalagem original?',
    answer: 'Se não tiver, embale de forma semelhante para proteção adequada.',
    keywords: ['embalagem', 'original', 'devolução']
  },
  {
    id: 'q75',
    category: 'garantia',
    question: 'Quando recebo o reembolso?',
    answer: 'Após a janela chegar e ser avaliada.',
    keywords: ['reembolso', 'quando', 'devolução']
  }
]

// =====================================================
// FUNÇÕES DE BUSCA
// =====================================================

/**
 * Busca FAQ por palavras-chave
 */
export function searchFAQ(query: string, limit: number = 5): FAQItem[] {
  const queryLower = query.toLowerCase()
  const words = queryLower.split(/\s+/)
  
  const scored = FAQ.map(item => {
    let score = 0
    
    // Match em keywords
    for (const keyword of item.keywords) {
      if (words.some(w => keyword.includes(w) || w.includes(keyword))) {
        score += 3
      }
    }
    
    // Match na pergunta
    if (item.question.toLowerCase().includes(queryLower)) {
      score += 5
    }
    for (const word of words) {
      if (item.question.toLowerCase().includes(word)) {
        score += 1
      }
    }
    
    return { item, score }
  })
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item)
}

/**
 * Busca FAQ por categoria
 */
export function getFAQByCategory(category: string): FAQItem[] {
  return FAQ.filter(item => item.category === category)
}

/**
 * Retorna todas as categorias disponíveis
 */
export function getFAQCategories(): string[] {
  return [...new Set(FAQ.map(item => item.category))]
}

/**
 * Retorna uma resposta formatada para o agente
 */
export function getQuickAnswer(query: string): string | null {
  const results = searchFAQ(query, 1)
  if (results.length > 0) {
    return results[0].answer
  }
  return null
}

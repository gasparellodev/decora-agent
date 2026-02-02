/**
 * Guia de Instalação - Decora Esquadrias
 * Base de conhecimento oficial para o agente de IA
 */

// =====================================================
// CONDIÇÃO DE ENVIO
// =====================================================

export const SHIPPING_CONDITION = {
  description: 'A janela é enviada 100% pronta para instalar',
  items: [
    'Totalmente no esquadro',
    'Travada com cintas laterais e superiores',
    'Protegida com chapatex na frente e atrás',
    'Etiqueta indicando lado interno e externo',
    'Seta indicando orientação correta (lado para cima)',
    'Roldanas reguladas',
    'Fecho antifurto regulado',
    'Borrachas de vedação instaladas',
    'Drenos (furos d\'água) na parte inferior',
    'Folha deslizando perfeitamente'
  ],
  warning: 'NÃO remover cintas ou chapatex até o momento da instalação. Eles mantêm o esquadro perfeito.'
}

// =====================================================
// MÉTODOS DE INSTALAÇÃO
// =====================================================

export const INSTALLATION_METHODS = {
  recommended: {
    name: 'Chumbar com Massa (RECOMENDADO)',
    description: 'Método ideal, mais seguro e mais utilizado',
    steps: [
      'Colocar a janela no vão, respeitando 5mm de folga na largura e 3mm na altura',
      'Conferir o esquadro (janela sempre correta, parede pode estar torta)',
      'Apoiar a base da janela diretamente no vão',
      'Chumbar com massa as laterais e a parte superior',
      'Aguardar secagem',
      'Remover cintas, chapatex e plásticos de proteção'
    ],
    result: 'Janela perfeitamente alinhada e vedada'
  },
  
  optional: {
    name: 'Instalação com Parafuso',
    description: 'Instalação mais rápida quando a parede permite',
    steps: [
      'Posicionar a janela no vão',
      'Marcar os pontos onde os parafusos irão',
      'Usar broca 5mm para furar janela + parede ao mesmo tempo',
      'Retirar a janela',
      'Colocar buchas (drywall ou alvenaria, conforme parede)',
      'Posicionar a janela novamente',
      'Instalar parafusos (1 a cada 50cm aproximadamente)'
    ],
    warning: 'Furar apenas nas áreas indicadas (quadro externo)'
  },
  
  prohibited: {
    name: 'Espuma Expansiva (PROIBIDO)',
    description: 'Método que NUNCA deve ser usado',
    problems: [
      'Mancha e derrete a pintura permanentemente',
      'Não é possível remover sem arranhar',
      'Empurra o quadro e pode entortar',
      'Prejudica a vedação',
      'Danifica a pintura eletrostática'
    ],
    alternative: 'Sempre usar massa de alvenaria ou fixação com parafusos'
  }
}

// =====================================================
// TIPOS DE PAREDE
// =====================================================

export const WALL_TYPES = {
  alvenaria: {
    name: 'Alvenaria',
    description: 'Paredes de tijolo comum',
    method: 'Chumbar com massa ou parafusar com bucha de alvenaria',
    notes: 'Método mais comum e recomendado'
  },
  
  drywall: {
    name: 'Drywall',
    description: 'Paredes de gesso acartonado',
    requirements: {
      '2f': { minDepth: 7, unit: 'cm' },
      '3f': { minDepth: 10.5, unit: 'cm' },
      'grade': { minDepth: 10.5, unit: 'cm' },
      'tela': { minDepth: 10.5, unit: 'cm' }
    },
    method: 'Parafusar com buchas específicas para drywall',
    notes: 'Verificar profundidade antes. Se parede for muito estreita, não comporta o modelo.'
  },
  
  container: {
    name: 'Container',
    description: 'Estrutura metálica de container',
    method: 'Mesmo processo da alvenaria',
    requirements: [
      'Profundidade do vão adequada',
      'Possibilidade de parafusar ou chumbar',
      'Estrutura que permita nivelamento'
    ]
  }
}

// =====================================================
// ARREMATES
// =====================================================

export const TRIM_INSTALLATION = {
  janelaCorrer: {
    name: 'Arremate para Janelas de Correr (2F/3F)',
    description: 'Arremates encaixados em presilhas',
    process: [
      'Cada janela acompanha presilhas cortadas na medida certa',
      'Presilhas são encaixadas nas extremidades do quadro',
      'Após instalação e acabamento do vão, o arremate é encaixado com pressão',
      'O arremate fecha o acabamento e deixa visual premium'
    ],
    notes: 'Arremate adiciona +5cm para janelas de correr. Mesma pintura da janela.'
  },
  
  capelinha: {
    name: 'Arremate para Capelinha (Pivotante)',
    description: 'Instalação diferenciada',
    process: [
      'O quadro possui batentes inteiros nas laterais longas',
      'O eixo do pivô fica nas laterais menores',
      'Instalador deve deixar o quadro faceado para dentro',
      'Acabamento da parede deve ser feito ANTES do arremate',
      'Presilhas vão direto na parede (não na janela)',
      'Após fixar presilhas na alvenaria, o arremate encaixa sobre elas'
    ],
    result: 'Vedação, acabamento limpo e abertura suave do pivô'
  }
}

// =====================================================
// REGULAGENS
// =====================================================

export const ADJUSTMENTS = {
  whatCanAdjust: [
    {
      name: 'Roldanas',
      function: 'Ajustam altura da folha',
      howTo: 'Girar parafuso de regulagem na parte inferior da folha'
    },
    {
      name: 'Deslizantes internos',
      function: 'Evitam que a folha fique bamba',
      howTo: 'Ajustar parafusos laterais'
    },
    {
      name: 'Fecho antifurto',
      function: 'Ajuste de 1-2mm para travar mais "justo"',
      howTo: 'Girar levemente o parafuso do fecho'
    }
  ],
  
  whatNotToAdjust: [
    'Borrachas de vedação',
    'Estrutura do quadro',
    'Trilhos'
  ],
  
  note: 'Tudo já vai regulado da fábrica. Ajustes são apenas para casos específicos.'
}

// =====================================================
// PROBLEMAS COMUNS E SOLUÇÕES
// =====================================================

export const COMMON_ISSUES = {
  janelaTorta: {
    problem: 'Janela ficou torta após instalação',
    cause: 'Instalação incorreta - vão ou parede fora do esquadro',
    solution: 'A janela é enviada 100% no esquadro. Se ficou torta, o instalador deve nivelar a parede ou ajustar o vão.',
    isDefect: false
  },
  
  janelaPesada: {
    problem: 'Folha pesada ou enroscando',
    causes: [
      'Instalação fora do esquadro',
      'Sujeira no trilho',
      'Folha desalinhada após manuseio brusco'
    ],
    solution: 'Limpar trilho e ajustar regulagem das roldanas',
    isDefect: false
  },
  
  naoFecha: {
    problem: 'Janela não fecha direito',
    causes: [
      'Fixação insuficiente',
      'Falta de folga na instalação',
      'Vão desalinhado'
    ],
    solution: 'Verificar instalação e ajustar regulagem do fecho',
    isDefect: false
  },
  
  vazamento: {
    problem: 'Entra água quando chove',
    causes: [
      'Furos de drenagem obstruídos',
      'Instalação incorreta',
      'Borrachas mal posicionadas'
    ],
    solution: 'Limpar furos de drenagem e verificar posição das borrachas',
    isDefect: false,
    exception: 'Capelinha pode respingar em chuva muito forte com vento - isso é normal'
  }
}

// =====================================================
// ERROS A EVITAR
// =====================================================

export const COMMON_MISTAKES = [
  'Instalar sem folgas (5mm lateral, 3mm topo)',
  'Usar espuma expansiva',
  'Parafusar no ponto errado',
  'Remover chapatex antes da instalação',
  'Instalar em drywall mais fino que o permitido',
  'Instalar em vão torto sem corrigir',
  'Instalar em medidas maiores que o suportado',
  'Instalar pivotante como se fosse janela comum'
]

// =====================================================
// MANUTENÇÃO
// =====================================================

export const MAINTENANCE = {
  cleaning: {
    window: {
      do: [
        'Usar pano macio úmido',
        'Sabão neutro',
        'Água limpa para enxaguar'
      ],
      dontDo: [
        'Produtos abrasivos',
        'Lado verde da esponja',
        'Solventes ou produtos químicos fortes'
      ]
    },
    screen: {
      methods: [
        'Pano úmido',
        'Secador no ar frio',
        'Aspirador de pó (suavemente)'
      ]
    },
    track: {
      importance: 'Manter trilho sempre limpo para funcionamento perfeito',
      frequency: 'Limpar mensalmente ou quando acumular sujeira'
    }
  },
  
  lubrication: {
    required: false,
    reason: 'Roldanas são de rolamento e não precisam de lubrificação'
  },
  
  generalTips: [
    'Manter trilho sempre limpo',
    'Não bater folhas com força',
    'Não apoiar peso nas folhas',
    'Não forçar a abertura do fecho'
  ]
}

// =====================================================
// TEMPO DE INSTALAÇÃO
// =====================================================

export const INSTALLATION_TIME = {
  average: '30 minutos a 1 hora',
  factors: [
    'Tipo de parede',
    'Modelo da janela',
    'Experiência do instalador',
    'Condições do vão'
  ],
  recommendation: 'Recomendável ter um profissional, mas é possível instalar sozinho seguindo as instruções'
}

// =====================================================
// PROTEÇÕES CONTRA CHUVA
// =====================================================

export const RAIN_PROTECTION = {
  bestModels: ['2f', '3f'],
  features: [
    'Trilhos mais altos',
    'Escovas de vedação',
    'Roldanas niveladas',
    'Fechos antifurto ajustados',
    'Borrachas internas'
  ],
  capelihaWarning: 'Capelinha: excelente ventilação, mas em chuva muito forte com vento lateral pode entrar um pouco de água. Para regiões muito chuvosas, recomendar janela de correr.'
}

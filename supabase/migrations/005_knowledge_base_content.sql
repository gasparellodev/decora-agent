-- Popular base de conhecimento com conteúdo técnico dos manuais
-- Decora Esquadrias - Knowledge Base

-- Limpar artigos existentes (opcional - remover se quiser manter)
-- DELETE FROM dc_knowledge_base;

-- =====================================================
-- CATEGORIA: MEDIDAS
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Medidas Padrão de Janelas',
  'ALTURAS DISPONÍVEIS: 30, 40, 50, 60 cm
LARGURAS DISPONÍVEIS: 80, 100, 120, 150, 180 cm

Estas são as medidas ideais para compra direta no site. Para medidas personalizadas, consulte as regras de arredondamento.',
  ARRAY['medidas', 'padrão', 'tamanhos'],
  'published'
),
(
  'Como Medir o Vão da Janela',
  'O cliente deve medir a ABERTURA INTERNA do vão, sempre ALTURA x LARGURA.

CONFIRME SEMPRE: "Você está me passando ALTURA primeiro, certo?"

FOLGAS OBRIGATÓRIAS PARA INSTALAÇÃO:
- 5mm totais na largura (divididos entre esquerdo e direito)
- 3mm no topo da janela

Essas folgas permitem instalação perfeita mesmo em vãos levemente irregulares.',
  ARRAY['medidas', 'medir', 'vão', 'folga'],
  'published'
),
(
  'Medidas Personalizadas - Regra de Arredondamento',
  'A Decora aceita qualquer medida, mas normaliza para múltiplos de 0,5cm.

REGRA: Sempre arredondar para BAIXO.

EXEMPLOS:
- 37,6cm → 37,5cm
- 104,3cm → 104cm
- 41,7cm → 41,5cm

EXPLICAR AO CLIENTE: "Trabalhamos com medidas precisas em múltiplos de 0,5cm. Sua medida será ajustada automaticamente, e isso fica dentro da folga ideal de instalação."',
  ARRAY['medidas', 'personalizada', 'arredondamento'],
  'published'
),
(
  'Limites de Medidas para Transporte',
  'MEDIDAS MÍNIMAS: 30x60cm (menor tamanho fabricado)

FORA DE SÃO PAULO:
- Largura máxima: 180cm
- Altura máxima: 60cm
(Limitação de transporte)

GRANDE SÃO PAULO:
- Largura máxima: até 200cm (apenas quando solicitado)

NEGAR VENDA QUANDO:
- Medida menor que 30x60cm
- Medida maior que 180cm para fora de SP',
  ARRAY['medidas', 'limites', 'transporte', 'máximo'],
  'published'
),
(
  'Profundidade para Drywall',
  'Para instalação em drywall, verificar profundidade mínima:

- 2 Folhas: mínimo 7cm
- 3 Folhas / Grade / Tela: mínimo 10,5cm

SE A PAREDE FOR MAIS FINA: "Essa parede não comporta o modelo desejado. Para drywall, a profundidade mínima é de X cm."',
  ARRAY['medidas', 'drywall', 'profundidade', 'instalação'],
  'published'
);

-- =====================================================
-- CATEGORIA: MODELOS
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Janela de 2 Folhas',
  'CARACTERÍSTICAS:
- Duas folhas móveis
- Trilho duplo
- Modelo mais compacto e clean
- Excelente vedação
- Abertura média

IDEAL PARA: cozinhas, banheiros, lavanderias

VANTAGENS: Custo menor, estética clean, boa vedação.',
  ARRAY['modelos', '2f', 'duas folhas', 'correr'],
  'published'
),
(
  'Janela de 3 Folhas',
  'CARACTERÍSTICAS:
- Três folhas móveis
- Três trilhos independentes
- Abertura muito maior (abre 2/3 do vão)
- Estrutura mais robusta
- Melhor ventilação

IDEAL PARA: janelas largas (120cm+), salas, quartos

VANTAGENS: Máxima ventilação entre as de correr, sensação de amplitude.',
  ARRAY['modelos', '3f', 'três folhas', 'correr', 'ventilação'],
  'published'
),
(
  'Janela com Tela Mosquiteira',
  'CARACTERÍSTICAS:
- Estrutura idêntica à 3 Folhas
- Tela fica SEMPRE no lado interno esquerdo
- Proteção total contra insetos

CONFIGURAÇÃO DAS FOLHAS:
- Tela interna esquerda
- Vidro central direita
- Vidro externo esquerda

IDEAL PARA: regiões com insetos, cozinhas, quartos

OBSERVAÇÃO: A tela reduz levemente a ventilação mas mantém proteção total.',
  ARRAY['modelos', 'tela', 'mosquiteira', 'insetos'],
  'published'
),
(
  'Janela com Grade de Proteção',
  'CARACTERÍSTICAS:
- Grade de alumínio embutida na peça
- Mesma pintura da janela (preta ou branca)
- Fixada diretamente no quadro
- Design elegante e discreto
- NÃO parece "grade de cadeia"

PROFUNDIDADE: Adiciona +1,5cm na janela

IMPORTANTE: A grade NÃO atrapalha o deslizamento - é montada por fora do trilho.

IDEAL PARA: térreo, área de risco, quarto de criança',
  ARRAY['modelos', 'grade', 'segurança', 'proteção'],
  'published'
),
(
  'Vitro Pivotante (Capelinha)',
  'CARACTERÍSTICAS:
- Abre 90º no próprio eixo
- MAIOR VENTILAÇÃO de todos os modelos
- Pode ser instalado vertical ou horizontal
- Medidas invertidas conforme orientação

IDEAL PARA: banheiros, lavanderias, fachadas altas

⚠️ ALERTA IMPORTANTE:
Em chuva MUITO forte com vento lateral, pode entrar um pouco de água.
Para regiões muito chuvosas, RECOMENDAR janela de correr.

ACESSÓRIO: Fecho-avião (R$50) permite abrir/fechar sem alcançar a folha (só para capelinha horizontal).',
  ARRAY['modelos', 'capelinha', 'pivotante', 'ventilação'],
  'published'
),
(
  'Comparação de Ventilação por Modelo',
  'ORDEM DA MAIOR PARA MENOR VENTILAÇÃO:

1. PIVOTANTE (Capelinha) - Máxima ventilação
2. 3 FOLHAS - Abre 2/3 do vão
3. 2 FOLHAS - Abertura média
4. COM TELA - Leve redução pela tela

RECOMENDAÇÃO POR NECESSIDADE:
- Máxima ventilação: Capelinha ou 3 Folhas
- Com proteção contra insetos: Com Tela
- Mais econômico: 2 Folhas',
  ARRAY['modelos', 'comparação', 'ventilação'],
  'published'
);

-- =====================================================
-- CATEGORIA: VIDROS
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Tipos de Vidro Disponíveis',
  'Todos os vidros são de 4mm e extremamente resistentes.

INCOLOR:
- Máxima iluminação
- Transparente
- Ideal para cozinhas e lavanderias

MINI BOREAL:
- Máxima PRIVACIDADE
- Deixa entrar bastante luz
- Ideal para BANHEIROS

FUMÊ:
- Reduz intensidade da luz
- Estética moderna
- Não é muito escuro
- Ideal para fachadas

CANELADO:
- Textura decorativa
- Privacidade moderada
- Ideal para áreas de serviço

TEMPERADO:
- Mais resistente a impactos
- Não estilhaça em farpas grandes
- Ideal para áreas de risco',
  ARRAY['vidros', 'tipos', 'incolor', 'boreal', 'fumê'],
  'published'
),
(
  'Recomendação de Vidro por Ambiente',
  'BANHEIRO: Mini Boreal (máxima privacidade)
COZINHA: Incolor (máxima luz)
LAVANDERIA: Incolor ou Canelado
QUARTO: Mini Boreal ou Incolor
SALA: Incolor
FACHADA: Fumê (estética moderna)',
  ARRAY['vidros', 'recomendação', 'ambiente'],
  'published'
);

-- =====================================================
-- CATEGORIA: QUALIDADE
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Linha 25 (Suprema) - Qualidade Premium',
  'A Decora usa LINHA 25, superior às linhas 15/16/17 de home centers.

DIFERENCIAIS:
- Alumínio mais espesso e resistente
- Não empena com o tempo
- Vida útil muito maior
- Estrutura rígida e bonita

COMPARAÇÃO COM HOME CENTERS:
Linhas 15-17 são finas, fracas, empenam, fecham mal, pintura frágil.
Linha 25 é premium, resistente, vedação excelente, acabamento superior.',
  ARRAY['qualidade', 'linha25', 'suprema', 'alumínio'],
  'published'
),
(
  'Pintura Eletrostática',
  'A pintura eletrostática em pó é um processo que fixa a tinta no metal a altas temperaturas.

BENEFÍCIOS:
- NÃO descasca
- NÃO desbota
- Resistente a UV, calor e chuva
- Não sofre corrosão
- Mesma tecnologia de indústrias premium

O cliente pode usar em ambientes internos ou externos sem preocupação com perda de cor.',
  ARRAY['qualidade', 'pintura', 'eletrostática', 'durabilidade'],
  'published'
),
(
  'Roldanas e Fecho',
  'ROLDANAS COM ROLAMENTO:
- Deslizamento perfeito e silencioso
- NÃO precisa lubrificar
- Vida útil prolongada

FECHO ANTIFURTO:
- Trava internamente
- NÃO permite abertura externa
- Só abre por dentro apertando o botão
- Segurança superior',
  ARRAY['qualidade', 'roldana', 'fecho', 'antifurto'],
  'published'
);

-- =====================================================
-- CATEGORIA: INSTALAÇÃO
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Condição de Envio da Janela',
  'A janela é enviada 100% PRONTA para instalar:

✅ Totalmente no esquadro
✅ Travada com cintas laterais e superiores
✅ Protegida com chapatex (frente e trás)
✅ Etiqueta indicando lado interno/externo
✅ Seta indicando orientação correta
✅ Roldanas reguladas
✅ Fecho antifurto regulado
✅ Borrachas de vedação instaladas
✅ Drenos (furos d''água) preparados
✅ Folha deslizando perfeitamente

⚠️ NÃO remover cintas ou chapatex até o momento da instalação!',
  ARRAY['instalação', 'envio', 'condição', 'embalagem'],
  'published'
),
(
  'Método de Instalação Recomendado',
  'CHUMBAR COM MASSA (RECOMENDADO):

1. Colocar a janela no vão (5mm folga lateral, 3mm altura)
2. Conferir o esquadro
3. Apoiar a base da janela no vão
4. Chumbar com massa as laterais e parte superior
5. Aguardar secagem
6. Remover cintas, chapatex e proteções

MÉTODO OPCIONAL: Parafusar com buchas
- Usar broca 5mm
- 1 parafuso a cada 50cm

❌ PROIBIDO: Espuma expansiva (danifica pintura permanentemente!)',
  ARRAY['instalação', 'método', 'massa', 'parafuso'],
  'published'
),
(
  'Espuma Expansiva - Por que é Proibida',
  '❌ NUNCA usar espuma expansiva!

PROBLEMAS:
- Mancha e derrete a pintura permanentemente
- Não é possível remover sem arranhar
- Empurra o quadro e pode entortar
- Prejudica a vedação
- Danifica a pintura eletrostática

ALTERNATIVAS CORRETAS:
- Massa de alvenaria (recomendado)
- Parafusos com buchas',
  ARRAY['instalação', 'espuma', 'proibido', 'cuidado'],
  'published'
),
(
  'Janela Ficou Torta - Não é Defeito',
  'Se a janela ficar torta após instalação, é PROBLEMA DE INSTALAÇÃO, não defeito.

A janela é enviada 100% no esquadro e regulada.

CAUSA: Vão ou parede fora do esquadro

SOLUÇÃO: O instalador deve nivelar a parede ou ajustar o vão ANTES de fixar a janela.

Resposta ao cliente: "A janela vai sempre 100% no esquadro. Se ficou torta, o instalador precisa nivelar o vão."',
  ARRAY['instalação', 'torta', 'esquadro', 'problema'],
  'published'
),
(
  'Arremates - Janelas de Correr vs Capelinha',
  'JANELAS DE CORRER (2F/3F):
- Arremates encaixados em presilhas
- Presilhas já vêm cortadas na medida
- Encaixar com pressão após acabamento do vão
- Adiciona +5cm

CAPELINHA (PIVOTANTE):
- Quadro com batentes nas laterais longas
- Deixar quadro faceado para dentro
- Acabamento da parede ANTES do arremate
- Presilhas vão na PAREDE (não na janela)
- Arremate encaixa sobre as presilhas',
  ARRAY['instalação', 'arremate', 'presilha', 'acabamento'],
  'published'
);

-- =====================================================
-- CATEGORIA: MANUTENÇÃO
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Limpeza e Manutenção da Janela',
  'LIMPEZA DA JANELA:
✅ Pano macio úmido
✅ Sabão neutro
✅ Água limpa para enxaguar

❌ NÃO USAR:
- Produtos abrasivos
- Lado verde da esponja
- Solventes ou produtos químicos fortes

LIMPEZA DA TELA:
- Pano úmido
- Secador no ar frio
- Aspirador de pó (suavemente)

LIMPEZA DO TRILHO:
- Manter sempre limpo
- Limpar mensalmente
- Usar pano úmido

LUBRIFICAÇÃO:
NÃO é necessária! Roldanas são de rolamento.',
  ARRAY['manutenção', 'limpeza', 'cuidados'],
  'published'
),
(
  'Problemas Comuns e Soluções',
  'JANELA DURA / NÃO DESLIZA:
→ Limpar trilho com pano úmido (pode ser pó de obra)
→ Ajustar regulagem das roldanas se necessário

BORRACHA SOLTA:
→ Normal do transporte
→ Encaixar com o dedo, sem força

ENTRA ÁGUA QUANDO CHOVE:
→ Verificar furos de drenagem (parte inferior)
→ Limpar se obstruídos

FECHO NÃO TRAVA BEM:
→ Ajustar parafuso do fecho (1-2mm)

⚠️ Se não resolver com essas dicas, acionar suporte.',
  ARRAY['manutenção', 'problemas', 'soluções', 'ajuste'],
  'published'
);

-- =====================================================
-- CATEGORIA: FRETE E PRAZOS
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Prazos de Entrega por Região',
  'PRAZOS DE ENTREGA:

GRANDE SÃO PAULO: até 5 dias úteis
- Entrega própria da Decora
- Sempre às QUINTAS-FEIRAS
- Comprou até segunda → entrega quinta da mesma semana
- Comprou de terça em diante → entrega próxima quinta

INTERIOR SP: até 8 dias úteis
RJ / MG: até 10 dias úteis
SUL: 8-12 dias úteis
NORDESTE: até 15 dias úteis

TRANSPORTADORA: JadLog (fora de SP)',
  ARRAY['frete', 'prazo', 'entrega', 'região'],
  'published'
),
(
  'Embalagem e Segurança no Transporte',
  'AS JANELAS VÃO EMBALADAS COM:
- Chapatex frente e verso
- Plástico bolha em grande quantidade
- Cantos reforçados com madeira
- Cintas de travamento

A janela chega protegida e pronta para instalação.

SE CHEGAR QUEBRADO:
1. Enviar fotos e vídeos imediatamente
2. Não instalar
3. Aguardar avaliação
4. Soluções: novo vidro, vidraceiro local, ou troca',
  ARRAY['frete', 'embalagem', 'transporte', 'proteção'],
  'published'
),
(
  'Urgência - Regras e Disponibilidade',
  'URGÊNCIA DISPONÍVEL APENAS PARA FORA DE SP

PRAZO COM URGÊNCIA: até 3 dias úteis para ENVIO

REGRAS:
- Máximo 5 urgências simultâneas
- Verificar disponibilidade antes de confirmar
- NÃO disponível para CEPs de SP

PARA SÃO PAULO:
Entregas seguem calendário fixo de quintas-feiras.
Não é possível antecipar.',
  ARRAY['frete', 'urgência', 'prazo', 'rápido'],
  'published'
);

-- =====================================================
-- CATEGORIA: GARANTIA
-- =====================================================

INSERT INTO dc_knowledge_base (title, content, tags, status) VALUES
(
  'Garantia e Devolução',
  'PRAZO DE DEVOLUÇÃO: 7 dias corridos (por lei)

CASOS ACEITOS:
✅ Produtos com defeito
✅ Vidro quebrado no transporte
✅ Problemas de montagem ou regulagem
✅ Itens NÃO instalados

NÃO COBERTO:
❌ Mau uso
❌ Instalação incorreta
❌ Danos por abrasivos
❌ Espuma expansiva
❌ Ajustes feitos incorretamente por terceiros
❌ Janela torta por vão torto

PROCESSO DE DEVOLUÇÃO:
1. Embalar novamente (original ou similar)
2. Proteger bem
3. Aguardar coleta
4. Reembolso após janela chegar e ser avaliada',
  ARRAY['garantia', 'devolução', 'prazo', 'troca'],
  'published'
);

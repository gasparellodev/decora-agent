-- =====================================================
-- MIGRATION: Remover vidro Canelado da knowledge base
-- O vidro canelado não é oferecido pela empresa
-- =====================================================

-- Atualizar artigo "Tipos de Vidro Disponíveis"
UPDATE dc_knowledge_base 
SET content = 'VIDROS DISPONÍVEIS (4mm de espessura):

INCOLOR:
- Visibilidade total
- Máxima entrada de luz
- Ideal para cozinhas e salas

MINI BOREAL:
- Máxima PRIVACIDADE
- Deixa entrar bastante luz
- Ideal para BANHEIROS

FUMÊ:
- Reduz intensidade da luz
- Estética moderna
- Não é muito escuro
- Ideal para fachadas

TEMPERADO:
- Mais resistente a impactos
- Não estilhaça em farpas grandes
- Ideal para áreas de risco'
WHERE title = 'Tipos de Vidro Disponíveis';

-- Atualizar artigo "Recomendação de Vidro por Ambiente"
UPDATE dc_knowledge_base 
SET content = 'BANHEIRO: Mini Boreal (máxima privacidade)
COZINHA: Incolor (máxima luz)
LAVANDERIA: Incolor
QUARTO: Mini Boreal ou Incolor
SALA: Incolor
FACHADA: Fumê (estética moderna)'
WHERE title = 'Recomendação de Vidro por Ambiente';

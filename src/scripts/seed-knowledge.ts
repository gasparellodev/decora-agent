/**
 * Script para migrar conhecimento estático existente para a tabela de embeddings (RAG).
 * Executar: npx tsx --env-file=.env.local src/scripts/seed-knowledge.ts
 */

async function main() {
  // Dynamic imports para garantir que env vars já estejam carregadas
  const { bulkGenerateEmbeddings } = await import('../lib/services/embedding.service')
  const { FAQ } = await import('../lib/ai/knowledge/faq')
  const { MODELS, GLASSES, COLORS, QUALITY_INFO, ACCESSORIES } = await import('../lib/ai/knowledge/products')
  const { INSTALLATION_METHODS, WALL_TYPES, COMMON_ISSUES, COMMON_MISTAKES, MAINTENANCE } = await import('../lib/ai/knowledge/installation')
  const {
    STANDARD_HEIGHTS, STANDARD_WIDTHS, LIMITS, DRYWALL_DEPTH,
    INSTALLATION_CLEARANCE, RECOMMENDED_SIZES, MEASUREMENT_ALERTS
  } = await import('../lib/ai/knowledge/measurements')

  type KnowledgeSource = 'faq' | 'product' | 'installation' | 'measurement' | 'conversation_insight' | 'feedback_correction' | 'manual'
  console.log('Starting knowledge base seed...\n')

  const items: Array<{
    source: KnowledgeSource
    sourceId?: string
    title: string
    content: string
    metadata?: Record<string, unknown>
  }> = []

  // 1. FAQ
  console.log(`Processing ${FAQ.length} FAQ items...`)
  for (const faq of FAQ) {
    items.push({
      source: 'faq',
      sourceId: faq.id,
      title: faq.question,
      content: `Pergunta: ${faq.question}\nResposta: ${faq.answer}`,
      metadata: { category: faq.category, keywords: faq.keywords }
    })
  }

  // 2. Produtos (modelos)
  console.log(`Processing ${Object.keys(MODELS).length} product models...`)
  for (const [id, model] of Object.entries(MODELS)) {
    items.push({
      source: 'product',
      sourceId: id,
      title: `Modelo: ${model.name}`,
      content: `${model.name} (${model.shortName}): ${model.description}. Ideal para: ${model.idealFor.join(', ')}. Características: ${model.features.join(', ')}. Ventilação: ${model.ventilation}/5.${model.notes ? ` Obs: ${model.notes}` : ''}`,
      metadata: { productType: 'model', modelId: id }
    })
  }

  // 3. Vidros
  console.log(`Processing ${Object.keys(GLASSES).length} glass types...`)
  for (const [id, glass] of Object.entries(GLASSES)) {
    items.push({
      source: 'product',
      sourceId: `glass_${id}`,
      title: `Vidro: ${glass.name}`,
      content: `${glass.name}: ${glass.description}. Espessura: ${glass.thickness}mm. Ideal para: ${glass.idealFor.join(', ')}. ${glass.privacy ? 'Oferece privacidade.' : 'Transparente.'}`,
      metadata: { productType: 'glass', glassId: id }
    })
  }

  // 4. Cores
  if (COLORS) {
    for (const [id, color] of Object.entries(COLORS)) {
      items.push({
        source: 'product',
        sourceId: `color_${id}`,
        title: `Cor: ${(color as { name: string }).name}`,
        content: `Cor ${(color as { name: string }).name}: ${(color as { description?: string }).description || ''}`,
        metadata: { productType: 'color', colorId: id }
      })
    }
  }

  // 5. Qualidade
  if (QUALITY_INFO) {
    items.push({
      source: 'product',
      sourceId: 'quality_info',
      title: 'Qualidade Linha 25 - Decora Esquadrias',
      content: typeof QUALITY_INFO === 'string' ? QUALITY_INFO : JSON.stringify(QUALITY_INFO),
      metadata: { productType: 'quality' }
    })
  }

  // 6. Acessórios
  if (ACCESSORIES) {
    for (const [id, acc] of Object.entries(ACCESSORIES)) {
      items.push({
        source: 'product',
        sourceId: `acc_${id}`,
        title: `Acessório: ${(acc as { name: string }).name}`,
        content: `${(acc as { name: string }).name}: ${(acc as { description?: string }).description || ''}`,
        metadata: { productType: 'accessory', accessoryId: id }
      })
    }
  }

  // 7. Instalação
  console.log('Processing installation knowledge...')
  if (INSTALLATION_METHODS) {
    for (const [id, method] of Object.entries(INSTALLATION_METHODS)) {
      items.push({
        source: 'installation',
        sourceId: `install_${id}`,
        title: `Método de instalação: ${(method as { name: string }).name}`,
        content: typeof method === 'string' ? method : `${(method as { name: string }).name}: ${(method as { description?: string }).description || JSON.stringify(method)}`,
        metadata: { installationType: 'method' }
      })
    }
  }

  if (WALL_TYPES) {
    for (const [id, wall] of Object.entries(WALL_TYPES)) {
      items.push({
        source: 'installation',
        sourceId: `wall_${id}`,
        title: `Tipo de parede: ${(wall as { name: string }).name}`,
        content: typeof wall === 'string' ? wall : `${(wall as { name: string }).name}: ${(wall as { description?: string }).description || JSON.stringify(wall)}`,
        metadata: { installationType: 'wall' }
      })
    }
  }

  if (COMMON_ISSUES) {
    for (const [id, issue] of Object.entries(COMMON_ISSUES)) {
      items.push({
        source: 'installation',
        sourceId: `issue_${id}`,
        title: `Problema comum: ${(issue as { name?: string; problem?: string }).name || (issue as { problem?: string }).problem || id}`,
        content: typeof issue === 'string' ? issue : JSON.stringify(issue),
        metadata: { installationType: 'issue' }
      })
    }
  }

  if (COMMON_MISTAKES) {
    for (const [id, mistake] of Object.entries(COMMON_MISTAKES)) {
      items.push({
        source: 'installation',
        sourceId: `mistake_${id}`,
        title: `Erro comum: ${typeof mistake === 'string' ? mistake.substring(0, 50) : id}`,
        content: typeof mistake === 'string' ? mistake : JSON.stringify(mistake),
        metadata: { installationType: 'mistake' }
      })
    }
  }

  if (MAINTENANCE) {
    items.push({
      source: 'installation',
      sourceId: 'maintenance',
      title: 'Manutenção e cuidados com janelas',
      content: typeof MAINTENANCE === 'string' ? MAINTENANCE : JSON.stringify(MAINTENANCE),
      metadata: { installationType: 'maintenance' }
    })
  }

  // 8. Medidas
  console.log('Processing measurement knowledge...')
  items.push({
    source: 'measurement',
    sourceId: 'standard_sizes',
    title: 'Medidas padrão disponíveis',
    content: `Alturas padrão: ${STANDARD_HEIGHTS.join(', ')}cm. Larguras padrão: ${STANDARD_WIDTHS.join(', ')}cm. Mínimo: ${LIMITS.min.width}x${LIMITS.min.height}cm. Máximo fora de SP: ${LIMITS.maxOutsideSP.width}cm largura.`,
    metadata: { measurementType: 'standard' }
  })

  items.push({
    source: 'measurement',
    sourceId: 'installation_clearance',
    title: 'Folgas de instalação obrigatórias',
    content: `Folga lateral: ${INSTALLATION_CLEARANCE.lateral}mm total (${INSTALLATION_CLEARANCE.lateral / 2}mm cada lado). Folga superior (topo): ${INSTALLATION_CLEARANCE.topo}mm.`,
    metadata: { measurementType: 'clearance' }
  })

  if (DRYWALL_DEPTH) {
    items.push({
      source: 'measurement',
      sourceId: 'drywall_depth',
      title: 'Profundidade mínima para drywall',
      content: typeof DRYWALL_DEPTH === 'string' ? DRYWALL_DEPTH : JSON.stringify(DRYWALL_DEPTH),
      metadata: { measurementType: 'drywall' }
    })
  }

  if (RECOMMENDED_SIZES) {
    for (const [env, sizes] of Object.entries(RECOMMENDED_SIZES)) {
      const sizeList = (sizes as Array<{ width: number; height: number }>)
        .map(s => `${s.width}x${s.height}cm`)
        .join(', ')
      items.push({
        source: 'measurement',
        sourceId: `rec_${env}`,
        title: `Medidas recomendadas para ${env}`,
        content: `Para ${env}, as medidas recomendadas são: ${sizeList}.`,
        metadata: { measurementType: 'recommended', environment: env }
      })
    }
  }

  if (MEASUREMENT_ALERTS) {
    items.push({
      source: 'measurement',
      sourceId: 'alerts',
      title: 'Alertas e regras de medidas',
      content: typeof MEASUREMENT_ALERTS === 'string' ? MEASUREMENT_ALERTS : JSON.stringify(MEASUREMENT_ALERTS),
      metadata: { measurementType: 'alerts' }
    })
  }

  // Executar bulk insert
  console.log(`\nTotal items to seed: ${items.length}`)
  console.log('Starting embedding generation and insertion...\n')

  const result = await bulkGenerateEmbeddings(items)

  console.log(`\nSeed complete!`)
  console.log(`Success: ${result.success}`)
  console.log(`Failed: ${result.failed}`)
}

main().catch(console.error)

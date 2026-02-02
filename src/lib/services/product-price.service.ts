/**
 * Serviço de Preços de Produtos - Decora Esquadrias
 * 
 * Responsável por:
 * - Buscar preços reais do catálogo Shopify
 * - Calcular descontos por quantidade e Pix
 * - Validar disponibilidade por canal
 * - Verificar dimensões válidas
 */

import {
  ProductType,
  ProductColor,
  ProductOrientation,
  GlassType,
  PriceVariant,
  getPrice,
  findPriceTable,
  findClosestVariant,
  getValidDimensions,
  formatProductName,
  detectOrientation,
  requiresOrientation,
  KIT_ARREMATE
} from '@/lib/data/shopify-prices';

// ========================================
// TIPOS
// ========================================

export type PaymentMethod = 'cartao' | 'boleto' | 'pix';
export type SalesChannel = 'whatsapp' | 'mercadolivre' | 'shopify';

export interface ProductQuery {
  tipo: ProductType;
  cor: ProductColor;
  altura: number;
  largura: number;
  vidro?: GlassType;
  orientacao?: ProductOrientation;
  quantidade?: number;
  canal?: SalesChannel;
  pagamento?: PaymentMethod;
}

export interface DiscountBreakdown {
  percentualQuantidade: number;
  percentualPix: number;
  valorQuantidade: number;
  valorPix: number;
  valorTotal: number;
}

export interface ProductPriceResult {
  found: boolean;
  preco?: number;
  precoTotal?: number;
  precoComDesconto?: number;
  desconto?: DiscountBreakdown;
  produto?: string;
  handle?: string;
  link?: string; // Link direto para Shopify com variante pré-selecionada
  varianteExata: boolean;
  varianteProxima?: PriceVariant;
  dimensoesValidas?: { alturas: number[]; larguras: number[] };
  orientacaoDetectada?: ProductOrientation;
  erro?: string;
  avisos?: string[];
}

// ========================================
// GERAÇÃO DE LINKS SHOPIFY
// ========================================

/**
 * Mapeia o tipo de vidro interno para o nome na Shopify
 */
function mapGlassToShopify(vidro?: GlassType): string {
  const mapping: Record<GlassType, string> = {
    'incolor': 'Incolor',
    'mini_boreal': 'Mini boreal',
    'fume': 'Fumê'
  };
  return vidro ? mapping[vidro] || 'Incolor' : 'Incolor';
}

/**
 * Gera link direto para o produto na Shopify com variante pré-selecionada
 * 
 * Formato: https://www.decoraesquadrias.com.br/products/{handle}?Altura={h}&Largura={w}&Tipo+de+vidro={vidro}
 */
export function generateShopifyLink(
  handle: string,
  altura: number,
  largura: number,
  vidro?: GlassType
): string {
  const baseUrl = process.env.SHOPIFY_STORE_URL || 'https://www.decoraesquadrias.com.br';
  const vidroNome = mapGlassToShopify(vidro);
  
  // Construir query params no formato da Shopify
  const params = new URLSearchParams({
    'Altura': altura.toString(),
    'Largura': largura.toString(),
    'Tipo de vidro': vidroNome
  });
  
  return `${baseUrl}/products/${handle}?${params.toString()}`;
}

/**
 * Gera link para Kit Arremate
 */
export function generateArremateLink(cor: ProductColor): string {
  const baseUrl = process.env.SHOPIFY_STORE_URL || 'https://www.decoraesquadrias.com.br';
  const handle = KIT_ARREMATE.handles[cor];
  return `${baseUrl}/products/${handle}`;
}

// ========================================
// RESTRIÇÕES DE CANAL
// ========================================

const CHANNEL_RESTRICTIONS: Record<ProductType, SalesChannel[]> = {
  'capelinha': ['whatsapp', 'mercadolivre', 'shopify'],
  'capelinha_3v': ['whatsapp', 'mercadolivre', 'shopify'],
  '2f': ['whatsapp', 'mercadolivre', 'shopify'],
  '2f_grade': ['whatsapp', 'mercadolivre', 'shopify'],
  '3f': ['whatsapp', 'mercadolivre', 'shopify'],
  '3f_grade': ['whatsapp', 'mercadolivre', 'shopify'],
  '3f_tela': ['whatsapp', 'mercadolivre', 'shopify'],
  '3f_tela_grade': ['whatsapp', 'mercadolivre', 'shopify'],
  'arremate': ['whatsapp', 'shopify'], // NÃO vende no ML!
};

/**
 * Verifica se um produto pode ser vendido em um canal específico
 */
export function canSellOnChannel(tipo: ProductType, canal: SalesChannel): boolean {
  return CHANNEL_RESTRICTIONS[tipo]?.includes(canal) ?? false;
}

/**
 * Verifica se é Kit Arremate
 */
export function isKitArremate(tipo: ProductType): boolean {
  return tipo === 'arremate';
}

// ========================================
// CÁLCULO DE DESCONTOS
// ========================================

/**
 * Calcula o percentual de desconto por quantidade
 * Aplica em: Shopify e WhatsApp (Yampi)
 * NÃO aplica em: Mercado Livre
 */
export function calcularDescontoQuantidade(quantidade: number, canal: SalesChannel): number {
  // Descontos NÃO aplicam no Mercado Livre
  if (canal === 'mercadolivre') return 0;
  
  if (quantidade >= 3) return 0.10; // 10%
  if (quantidade >= 2) return 0.05; // 5%
  return 0;
}

/**
 * Calcula o percentual de desconto do Pix
 * Aplica em: Shopify e WhatsApp (Yampi)
 * NÃO aplica em: Mercado Livre
 */
export function calcularDescontoPix(pagamento: PaymentMethod | undefined, canal: SalesChannel): number {
  // Descontos NÃO aplicam no Mercado Livre
  if (canal === 'mercadolivre') return 0;
  
  if (pagamento === 'pix') return 0.05; // +5%
  return 0;
}

/**
 * Aplica todos os descontos ao valor total
 */
export function aplicarDescontos(
  precoTotal: number,
  quantidade: number,
  canal: SalesChannel,
  pagamento?: PaymentMethod
): DiscountBreakdown {
  const percQuantidade = calcularDescontoQuantidade(quantidade, canal);
  const percPix = calcularDescontoPix(pagamento, canal);
  
  const valorQuantidade = precoTotal * percQuantidade;
  const valorPix = precoTotal * percPix;
  const valorTotal = valorQuantidade + valorPix;
  
  return {
    percentualQuantidade: percQuantidade,
    percentualPix: percPix,
    valorQuantidade,
    valorPix,
    valorTotal
  };
}

// ========================================
// BUSCA DE PREÇOS
// ========================================

/**
 * Busca o preço de um produto com todas as regras de negócio
 */
export function getProductPrice(query: ProductQuery): ProductPriceResult {
  const { 
    tipo, 
    cor, 
    altura, 
    largura, 
    quantidade = 1, 
    canal = 'whatsapp', 
    pagamento 
  } = query;
  
  const avisos: string[] = [];
  
  // ========================================
  // Verificar se pode vender no canal
  // ========================================
  if (!canSellOnChannel(tipo, canal)) {
    if (isKitArremate(tipo)) {
      return {
        found: false,
        varianteExata: false,
        erro: 'O Kit Arremate não está disponível no Mercado Livre. É vendido apenas pelo WhatsApp e Shopify.'
      };
    }
    return {
      found: false,
      varianteExata: false,
      erro: `Este produto não está disponível no canal ${canal}.`
    };
  }
  
  // ========================================
  // Kit Arremate - preço order bump
  // ========================================
  if (isKitArremate(tipo)) {
    const preco = KIT_ARREMATE.precoOrderBump; // R$117
    const precoNormal = KIT_ARREMATE.precoNormal; // R$180
    
    // Kit Arremate só tem link para WhatsApp/Shopify, não para ML
    const link = canal !== 'mercadolivre' ? generateArremateLink(cor) : undefined;
    
    return {
      found: true,
      preco,
      precoTotal: preco, // Sempre 1 por pedido
      precoComDesconto: preco,
      produto: `Kit Arremate ${cor === 'preto' ? 'Preto' : 'Branco'} 45º`,
      handle: KIT_ARREMATE.handles[cor],
      link,
      varianteExata: true,
      avisos: [
        `Preço especial R$${preco} (normal R$${precoNormal})`,
        'Um kit por pedido, independente da quantidade de janelas.'
      ]
    };
  }
  
  // ========================================
  // Determinar orientação para capelinha
  // ========================================
  let orientacao = query.orientacao;
  let orientacaoDetectada: ProductOrientation | undefined;
  
  if (requiresOrientation(tipo) && !orientacao) {
    orientacao = detectOrientation(altura, largura);
    orientacaoDetectada = orientacao;
    avisos.push(`Orientação detectada: ${orientacao}`);
  }
  
  // ========================================
  // Buscar preço exato
  // ========================================
  const preco = getPrice(tipo, cor, altura, largura, orientacao);
  const table = findPriceTable(tipo, cor, orientacao);
  
  if (preco !== undefined && table) {
    const precoTotal = preco * quantidade;
    const desconto = aplicarDescontos(precoTotal, quantidade, canal, pagamento);
    const precoComDesconto = precoTotal - desconto.valorTotal;
    
    // Gerar link da Shopify (apenas para canais que não são ML)
    const link = canal !== 'mercadolivre' 
      ? generateShopifyLink(table.handle, altura, largura, query.vidro)
      : undefined;
    
    // Montar avisos de desconto
    if (quantidade > 1) {
      avisos.push(`${quantidade}x R$ ${preco.toFixed(2).replace('.', ',')} = R$ ${precoTotal.toFixed(2).replace('.', ',')}`);
    }
    
    if (desconto.valorQuantidade > 0) {
      const percLabel = quantidade >= 3 ? '10%' : '5%';
      avisos.push(`Desconto ${percLabel} (${quantidade} janelas): -R$ ${desconto.valorQuantidade.toFixed(2).replace('.', ',')}`);
    }
    
    if (desconto.valorPix > 0) {
      avisos.push(`Desconto Pix (+5%): -R$ ${desconto.valorPix.toFixed(2).replace('.', ',')}`);
    }
    
    if (desconto.valorTotal > 0) {
      avisos.push(`Total com desconto: R$ ${precoComDesconto.toFixed(2).replace('.', ',')}`);
    }
    
    return {
      found: true,
      preco,
      precoTotal,
      precoComDesconto,
      desconto,
      produto: formatProductName(tipo, cor, orientacao),
      handle: table.handle,
      link,
      varianteExata: true,
      orientacaoDetectada,
      avisos: avisos.length > 0 ? avisos : undefined
    };
  }
  
  // ========================================
  // Buscar variante mais próxima
  // ========================================
  // Reusar table se já foi buscado, ou buscar agora
  const tableForError = table || findPriceTable(tipo, cor, orientacao);
  if (!tableForError) {
    return {
      found: false,
      varianteExata: false,
      erro: `Produto não encontrado: ${formatProductName(tipo, cor, orientacao)}`
    };
  }
  
  // Dimensões válidas
  const dimensoesValidas = getValidDimensions(tipo, cor, orientacao);
  
  // Variante mais próxima
  const varianteProxima = findClosestVariant(tableForError.variantes, altura, largura);
  
  // Montar mensagem de erro
  let erro = `Medida ${altura}x${largura}cm não disponível para ${formatProductName(tipo, cor, orientacao)}.`;
  
  if (dimensoesValidas) {
    erro += ` Alturas: [${dimensoesValidas.alturas.join(', ')}]cm. Larguras: [${dimensoesValidas.larguras.join(', ')}]cm.`;
  }
  
  erro += ` Medida mais próxima: ${varianteProxima.altura}x${varianteProxima.largura}cm por R$ ${varianteProxima.preco.toFixed(2).replace('.', ',')}.`;
  
  return {
    found: false,
    varianteExata: false,
    varianteProxima,
    dimensoesValidas,
    orientacaoDetectada,
    erro
  };
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Formata o preço em BRL
 */
export function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Verifica se as dimensões são válidas para um tipo de produto
 */
export function validateDimensions(
  tipo: ProductType,
  cor: ProductColor,
  altura: number,
  largura: number,
  orientacao?: ProductOrientation
): { isValid: boolean; error?: string; suggestion?: string } {
  // Auto-detectar orientação para capelinha
  if (requiresOrientation(tipo) && !orientacao) {
    orientacao = detectOrientation(altura, largura);
  }
  
  const dims = getValidDimensions(tipo, cor, orientacao);
  if (!dims) {
    return { isValid: false, error: `Produto não encontrado: ${tipo} ${cor}` };
  }
  
  const alturaValida = dims.alturas.includes(altura);
  const larguraValida = dims.larguras.includes(largura);
  
  if (!alturaValida && !larguraValida) {
    return {
      isValid: false,
      error: `Medida ${altura}x${largura}cm não disponível.`,
      suggestion: `Alturas: [${dims.alturas.join(', ')}], Larguras: [${dims.larguras.join(', ')}]`
    };
  }
  
  if (!alturaValida) {
    const closest = dims.alturas.reduce((prev, curr) => 
      Math.abs(curr - altura) < Math.abs(prev - altura) ? curr : prev
    );
    return {
      isValid: false,
      error: `Altura ${altura}cm não disponível.`,
      suggestion: `Alturas disponíveis: [${dims.alturas.join(', ')}]. Mais próxima: ${closest}cm`
    };
  }
  
  if (!larguraValida) {
    const closest = dims.larguras.reduce((prev, curr) => 
      Math.abs(curr - largura) < Math.abs(prev - largura) ? curr : prev
    );
    return {
      isValid: false,
      error: `Largura ${largura}cm não disponível.`,
      suggestion: `Larguras disponíveis: [${dims.larguras.join(', ')}]. Mais próxima: ${closest}cm`
    };
  }
  
  return { isValid: true };
}

/**
 * Retorna informações completas sobre descontos disponíveis
 */
export function getDiscountInfo(canal: SalesChannel): {
  temDescontoQuantidade: boolean;
  temDescontoPix: boolean;
  descricao: string;
} {
  if (canal === 'mercadolivre') {
    return {
      temDescontoQuantidade: false,
      temDescontoPix: false,
      descricao: 'Descontos não disponíveis no Mercado Livre.'
    };
  }
  
  return {
    temDescontoQuantidade: true,
    temDescontoPix: true,
    descricao: '2 janelas: 5% | 3+ janelas: 10% | Pix: +5% adicional'
  };
}

// Tipos re-exportados para conveniência
// NOTA: Se precisar dos tipos, importe diretamente de '@/lib/data/shopify-prices'
export type { ProductType, ProductColor, ProductOrientation, GlassType, PriceVariant } from '@/lib/data/shopify-prices';
export { formatProductName, requiresOrientation, detectOrientation, KIT_ARREMATE } from '@/lib/data/shopify-prices';

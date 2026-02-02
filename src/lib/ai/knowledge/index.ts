/**
 * Base de Conhecimento - Decora Esquadrias
 * Exportações centralizadas
 */

// Produtos
export {
  MODELS,
  GLASSES,
  COLORS,
  QUALITY_INFO,
  COMPARISON,
  ACCESSORIES,
  VENTILATION_ORDER,
  getModelById,
  getGlassById,
  getRecommendedGlassForEnvironment,
  getRecommendedModelForEnvironment,
  type ModelSpec,
  type GlassSpec,
  type ColorSpec
} from './products'

// Medidas
export {
  STANDARD_HEIGHTS,
  STANDARD_WIDTHS,
  STANDARD_SIZES,
  LIMITS,
  INSTALLATION_CLEARANCE,
  DRYWALL_DEPTH,
  RECOMMENDED_SIZES,
  MEASUREMENT_ALERTS,
  normalizeToHalfCm,
  normalizeToTenCm,
  findNearestStandardSize,
  validateMeasurement,
  validateDrywallDepth,
  type MeasurementValidation,
  type RecommendedSize
} from './measurements'

// Instalação
export {
  SHIPPING_CONDITION,
  INSTALLATION_METHODS,
  WALL_TYPES,
  TRIM_INSTALLATION,
  ADJUSTMENTS,
  COMMON_ISSUES,
  COMMON_MISTAKES,
  MAINTENANCE,
  INSTALLATION_TIME,
  RAIN_PROTECTION
} from './installation'

// FAQ
export {
  FAQ,
  searchFAQ,
  getFAQByCategory,
  getFAQCategories,
  getQuickAnswer,
  type FAQItem
} from './faq'

/**
 * Tabelas de Precos Shopify - Decora Esquadrias
 * Gerado a partir do catalogo oficial com 22 produtos e 1107 variantes
 * 
 * IMPORTANTE: O tipo de vidro (Incolor, Mini Boreal, Fume) NAO afeta o preco
 */

// ========================================
// TIPOS
// ========================================

export type ProductColor = 'branco' | 'preto';
export type ProductOrientation = 'horizontal' | 'vertical';
export type GlassType = 'incolor' | 'mini_boreal' | 'fume';

export type ProductType = 
  | 'capelinha' 
  | 'capelinha_3v' 
  | '2f' 
  | '2f_grade' 
  | '3f' 
  | '3f_grade' 
  | '3f_tela' 
  | '3f_tela_grade'
  | 'arremate';

export interface PriceVariant {
  altura: number;
  largura: number;
  preco: number;
}

export interface ProductPriceTable {
  tipo: ProductType;
  cor: ProductColor;
  orientacao?: ProductOrientation;
  handle: string;
  linha: 'linha25' | 'suprema';
  variantes: PriceVariant[];
}

// ========================================
// CAPELINHA (1 VIDRO) - LINHA 25 - PRETO
// ========================================

export const CAPELINHA_PRETO_HORIZONTAL: ProductPriceTable = {
  tipo: 'capelinha',
  cor: 'preto',
  orientacao: 'horizontal',
  handle: 'vitro-capelinha-pivotante-preto-horizontal',
  linha: 'linha25',
  variantes: [
    { altura: 30, largura: 80, preco: 365 },
    { altura: 30, largura: 100, preco: 420 },
    { altura: 30, largura: 120, preco: 480 },
    { altura: 30, largura: 150, preco: 565 },
    { altura: 30, largura: 180, preco: 690 },
    { altura: 40, largura: 80, preco: 385 },
    { altura: 40, largura: 100, preco: 447 },
    { altura: 40, largura: 120, preco: 497 },
    { altura: 40, largura: 150, preco: 580 },
    { altura: 40, largura: 180, preco: 715 },
    { altura: 50, largura: 80, preco: 417 },
    { altura: 50, largura: 100, preco: 460 },
    { altura: 50, largura: 120, preco: 520 },
    { altura: 50, largura: 150, preco: 597 },
    { altura: 50, largura: 180, preco: 737 },
    { altura: 60, largura: 80, preco: 430 },
    { altura: 60, largura: 100, preco: 485 },
    { altura: 60, largura: 120, preco: 550 },
    { altura: 60, largura: 150, preco: 625 },
    { altura: 60, largura: 180, preco: 790 },
  ]
};

export const CAPELINHA_PRETO_VERTICAL: ProductPriceTable = {
  tipo: 'capelinha',
  cor: 'preto',
  orientacao: 'vertical',
  handle: 'vitro-capelinha-pivotante-preto-vertical',
  linha: 'linha25',
  variantes: [
    { altura: 80, largura: 30, preco: 347 },
    { altura: 80, largura: 40, preco: 385 },
    { altura: 80, largura: 50, preco: 417 },
    { altura: 80, largura: 60, preco: 430 },
    { altura: 100, largura: 30, preco: 420 },
    { altura: 100, largura: 40, preco: 447 },
    { altura: 100, largura: 50, preco: 460 },
    { altura: 100, largura: 60, preco: 485 },
    { altura: 120, largura: 30, preco: 480 },
    { altura: 120, largura: 40, preco: 497 },
    { altura: 120, largura: 50, preco: 520 },
    { altura: 120, largura: 60, preco: 550 },
    { altura: 150, largura: 30, preco: 565 },
    { altura: 150, largura: 40, preco: 580 },
    { altura: 150, largura: 50, preco: 597 },
    { altura: 150, largura: 60, preco: 625 },
    { altura: 180, largura: 30, preco: 690 },
    { altura: 180, largura: 40, preco: 715 },
    { altura: 180, largura: 50, preco: 737 },
    { altura: 180, largura: 60, preco: 790 },
  ]
};

// ========================================
// CAPELINHA (1 VIDRO) - LINHA 25 - BRANCO
// ========================================

export const CAPELINHA_BRANCO_HORIZONTAL: ProductPriceTable = {
  tipo: 'capelinha',
  cor: 'branco',
  orientacao: 'horizontal',
  handle: 'vitro-capelinha-pivotante-branco-horizontal',
  linha: 'linha25',
  variantes: [
    { altura: 30, largura: 80, preco: 347 },
    { altura: 30, largura: 100, preco: 415 },
    { altura: 30, largura: 120, preco: 465 },
    { altura: 30, largura: 150, preco: 540 },
    { altura: 30, largura: 180, preco: 670 },
    { altura: 40, largura: 80, preco: 375 },
    { altura: 40, largura: 100, preco: 430 },
    { altura: 40, largura: 120, preco: 480 },
    { altura: 40, largura: 150, preco: 565 },
    { altura: 40, largura: 180, preco: 698 },
    { altura: 50, largura: 80, preco: 397 },
    { altura: 50, largura: 100, preco: 455 },
    { altura: 50, largura: 120, preco: 507 },
    { altura: 50, largura: 150, preco: 588 },
    { altura: 50, largura: 180, preco: 725 },
    { altura: 60, largura: 80, preco: 420 },
    { altura: 60, largura: 100, preco: 470 },
    { altura: 60, largura: 120, preco: 530 },
    { altura: 60, largura: 150, preco: 620 },
    { altura: 60, largura: 180, preco: 767 },
  ]
};

export const CAPELINHA_BRANCO_VERTICAL: ProductPriceTable = {
  tipo: 'capelinha',
  cor: 'branco',
  orientacao: 'vertical',
  handle: 'vitro-capelinha-pivotante-branco-vertical',
  linha: 'linha25',
  variantes: [
    { altura: 80, largura: 30, preco: 347 },
    { altura: 80, largura: 40, preco: 375 },
    { altura: 80, largura: 50, preco: 397 },
    { altura: 80, largura: 60, preco: 420 },
    { altura: 100, largura: 30, preco: 415 },
    { altura: 100, largura: 40, preco: 430 },
    { altura: 100, largura: 50, preco: 455 },
    { altura: 100, largura: 60, preco: 470 },
    { altura: 120, largura: 30, preco: 465 },
    { altura: 120, largura: 40, preco: 480 },
    { altura: 120, largura: 50, preco: 507 },
    { altura: 120, largura: 60, preco: 530 },
    { altura: 150, largura: 30, preco: 540 },
    { altura: 150, largura: 40, preco: 565 },
    { altura: 150, largura: 50, preco: 588 },
    { altura: 150, largura: 60, preco: 620 },
    { altura: 180, largura: 30, preco: 670 },
    { altura: 180, largura: 40, preco: 698 },
    { altura: 180, largura: 50, preco: 725 },
    { altura: 180, largura: 60, preco: 767 },
  ]
};

// ========================================
// CAPELINHA 3 VIDROS - LINHA 25 - PRETO
// ========================================

export const CAPELINHA_3V_PRETO_HORIZONTAL: ProductPriceTable = {
  tipo: 'capelinha_3v',
  cor: 'preto',
  orientacao: 'horizontal',
  handle: 'vitro-pivotante-preto-horizontal-linha-25-copia-1',
  linha: 'linha25',
  variantes: [
    { altura: 30, largura: 80, preco: 420 },
    { altura: 30, largura: 100, preco: 483 },
    { altura: 30, largura: 120, preco: 552 },
    { altura: 30, largura: 150, preco: 650 },
    { altura: 30, largura: 180, preco: 794 },
    { altura: 40, largura: 80, preco: 443 },
    { altura: 40, largura: 100, preco: 514 },
    { altura: 40, largura: 120, preco: 572 },
    { altura: 40, largura: 150, preco: 667 },
    { altura: 40, largura: 180, preco: 822 },
    { altura: 50, largura: 80, preco: 480 },
    { altura: 50, largura: 100, preco: 529 },
    { altura: 50, largura: 120, preco: 598 },
    { altura: 50, largura: 150, preco: 687 },
    { altura: 50, largura: 180, preco: 848 },
    { altura: 60, largura: 80, preco: 495 },
    { altura: 60, largura: 100, preco: 558 },
    { altura: 60, largura: 120, preco: 633 },
    { altura: 60, largura: 150, preco: 719 },
    { altura: 60, largura: 180, preco: 909 },
  ]
};

export const CAPELINHA_3V_PRETO_VERTICAL: ProductPriceTable = {
  tipo: 'capelinha_3v',
  cor: 'preto',
  orientacao: 'vertical',
  handle: 'vitro-pivotante-tres-vidros-preto-verticall-linha-25',
  linha: 'linha25',
  variantes: [
    { altura: 80, largura: 30, preco: 420 },
    { altura: 80, largura: 40, preco: 443 },
    { altura: 80, largura: 50, preco: 480 },
    { altura: 80, largura: 60, preco: 495 },
    { altura: 100, largura: 30, preco: 483 },
    { altura: 100, largura: 40, preco: 514 },
    { altura: 100, largura: 50, preco: 529 },
    { altura: 100, largura: 60, preco: 558 },
    { altura: 120, largura: 30, preco: 552 },
    { altura: 120, largura: 40, preco: 572 },
    { altura: 120, largura: 50, preco: 598 },
    { altura: 120, largura: 60, preco: 633 },
    { altura: 150, largura: 30, preco: 650 },
    { altura: 150, largura: 40, preco: 667 },
    { altura: 150, largura: 50, preco: 687 },
    { altura: 150, largura: 60, preco: 719 },
    { altura: 180, largura: 30, preco: 794 },
    { altura: 180, largura: 40, preco: 822 },
    { altura: 180, largura: 50, preco: 848 },
    { altura: 180, largura: 60, preco: 909 },
  ]
};

// ========================================
// CAPELINHA 3 VIDROS - LINHA 25 - BRANCO
// ========================================

export const CAPELINHA_3V_BRANCO_HORIZONTAL: ProductPriceTable = {
  tipo: 'capelinha_3v',
  cor: 'branco',
  orientacao: 'horizontal',
  handle: 'vitro-pivotante-tres-vidros-branco-horizontal-linha-25',
  linha: 'linha25',
  variantes: [
    { altura: 30, largura: 80, preco: 399 },
    { altura: 30, largura: 100, preco: 477 },
    { altura: 30, largura: 120, preco: 535 },
    { altura: 30, largura: 150, preco: 621 },
    { altura: 30, largura: 180, preco: 771 },
    { altura: 40, largura: 80, preco: 431 },
    { altura: 40, largura: 100, preco: 495 },
    { altura: 40, largura: 120, preco: 552 },
    { altura: 40, largura: 150, preco: 650 },
    { altura: 40, largura: 180, preco: 803 },
    { altura: 50, largura: 80, preco: 457 },
    { altura: 50, largura: 100, preco: 523 },
    { altura: 50, largura: 120, preco: 583 },
    { altura: 50, largura: 150, preco: 676 },
    { altura: 50, largura: 180, preco: 834 },
    { altura: 60, largura: 80, preco: 483 },
    { altura: 60, largura: 100, preco: 541 },
    { altura: 60, largura: 120, preco: 610 },
    { altura: 60, largura: 150, preco: 713 },
    { altura: 60, largura: 180, preco: 882 },
  ]
};

export const CAPELINHA_3V_BRANCO_VERTICAL: ProductPriceTable = {
  tipo: 'capelinha_3v',
  cor: 'branco',
  orientacao: 'vertical',
  handle: 'vitro-pivotante-tres-vidros-branco-horizontal-linha-25-copia',
  linha: 'linha25',
  variantes: [
    { altura: 80, largura: 30, preco: 399 },
    { altura: 80, largura: 40, preco: 431 },
    { altura: 80, largura: 50, preco: 457 },
    { altura: 80, largura: 60, preco: 483 },
    { altura: 100, largura: 30, preco: 477 },
    { altura: 100, largura: 40, preco: 495 },
    { altura: 100, largura: 50, preco: 523 },
    { altura: 100, largura: 60, preco: 541 },
    { altura: 120, largura: 30, preco: 535 },
    { altura: 120, largura: 40, preco: 552 },
    { altura: 120, largura: 50, preco: 583 },
    { altura: 120, largura: 60, preco: 610 },
    { altura: 150, largura: 30, preco: 621 },
    { altura: 150, largura: 40, preco: 650 },
    { altura: 150, largura: 50, preco: 676 },
    { altura: 150, largura: 60, preco: 713 },
    { altura: 180, largura: 30, preco: 771 },
    { altura: 180, largura: 40, preco: 803 },
    { altura: 180, largura: 50, preco: 834 },
    { altura: 180, largura: 60, preco: 882 },
  ]
};

// ========================================
// JANELA 2 FOLHAS - LINHA SUPREMA - BRANCO
// ========================================

export const JANELA_2F_BRANCO: ProductPriceTable = {
  tipo: '2f',
  cor: 'branco',
  handle: 'janela-de-correr-duas-folhas-moveis-branco',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 371 },
    { altura: 30, largura: 100, preco: 428 },
    { altura: 30, largura: 120, preco: 483 },
    { altura: 30, largura: 150, preco: 569 },
    { altura: 30, largura: 180, preco: 650 },
    { altura: 40, largura: 80, preco: 420 },
    { altura: 40, largura: 100, preco: 483 },
    { altura: 40, largura: 120, preco: 545 },
    { altura: 40, largura: 150, preco: 638 },
    { altura: 40, largura: 180, preco: 780 },
    { altura: 50, largura: 80, preco: 469 },
    { altura: 50, largura: 100, preco: 537 },
    { altura: 50, largura: 120, preco: 606 },
    { altura: 50, largura: 150, preco: 708 },
    { altura: 50, largura: 180, preco: 844 },
    { altura: 60, largura: 80, preco: 518 },
    { altura: 60, largura: 100, preco: 593 },
    { altura: 60, largura: 120, preco: 667 },
    { altura: 60, largura: 150, preco: 779 },
    { altura: 60, largura: 180, preco: 913 },
  ]
};

// ========================================
// JANELA 2 FOLHAS - LINHA SUPREMA - PRETO
// ========================================

export const JANELA_2F_PRETO: ProductPriceTable = {
  tipo: '2f',
  cor: 'preto',
  handle: 'janela-de-correr-duas-folhas-moveis-preto',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 377 },
    { altura: 30, largura: 100, preco: 434 },
    { altura: 30, largura: 120, preco: 492 },
    { altura: 30, largura: 150, preco: 577 },
    { altura: 30, largura: 180, preco: 663 },
    { altura: 40, largura: 80, preco: 427 },
    { altura: 40, largura: 100, preco: 490 },
    { altura: 40, largura: 120, preco: 553 },
    { altura: 40, largura: 150, preco: 648 },
    { altura: 40, largura: 180, preco: 801 },
    { altura: 50, largura: 80, preco: 476 },
    { altura: 50, largura: 100, preco: 546 },
    { altura: 50, largura: 120, preco: 615 },
    { altura: 50, largura: 150, preco: 719 },
    { altura: 50, largura: 180, preco: 824 },
    { altura: 60, largura: 80, preco: 526 },
    { altura: 60, largura: 100, preco: 602 },
    { altura: 60, largura: 120, preco: 677 },
    { altura: 60, largura: 150, preco: 790 },
    { altura: 60, largura: 180, preco: 904 },
  ]
};

// ========================================
// JANELA 2 FOLHAS COM GRADE - LINHA SUPREMA - BRANCO
// ========================================

export const JANELA_2F_GRADE_BRANCO: ProductPriceTable = {
  tipo: '2f_grade',
  cor: 'branco',
  handle: 'janela-de-correr-duas-folhas-branco-com-grade-embutida',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 455 },
    { altura: 30, largura: 100, preco: 532 },
    { altura: 30, largura: 120, preco: 608 },
    { altura: 30, largura: 150, preco: 724 },
    { altura: 30, largura: 180, preco: 837 },
    { altura: 40, largura: 80, preco: 531 },
    { altura: 40, largura: 100, preco: 621 },
    { altura: 40, largura: 120, preco: 711 },
    { altura: 40, largura: 150, preco: 845 },
    { altura: 40, largura: 180, preco: 980 },
    { altura: 50, largura: 80, preco: 608 },
    { altura: 50, largura: 100, preco: 710 },
    { altura: 50, largura: 120, preco: 814 },
    { altura: 50, largura: 150, preco: 967 },
    { altura: 50, largura: 180, preco: 1121 },
    { altura: 60, largura: 80, preco: 683 },
    { altura: 60, largura: 100, preco: 801 },
    { altura: 60, largura: 120, preco: 916 },
    { altura: 60, largura: 150, preco: 1089 },
    { altura: 60, largura: 180, preco: 1263 },
  ]
};

// ========================================
// JANELA 2 FOLHAS COM GRADE - LINHA SUPREMA - PRETO
// ========================================

export const JANELA_2F_GRADE_PRETO: ProductPriceTable = {
  tipo: '2f_grade',
  cor: 'preto',
  handle: 'janela-de-correr-duas-folhas-preto-com-grade-embutida',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 457 },
    { altura: 30, largura: 100, preco: 538 },
    { altura: 30, largura: 120, preco: 616 },
    { altura: 30, largura: 150, preco: 724 },
    { altura: 30, largura: 180, preco: 849 },
    { altura: 40, largura: 80, preco: 537 },
    { altura: 40, largura: 100, preco: 628 },
    { altura: 40, largura: 120, preco: 719 },
    { altura: 40, largura: 150, preco: 855 },
    { altura: 40, largura: 180, preco: 992 },
    { altura: 50, largura: 80, preco: 549 },
    { altura: 50, largura: 100, preco: 718 },
    { altura: 50, largura: 120, preco: 822 },
    { altura: 50, largura: 150, preco: 978 },
    { altura: 50, largura: 180, preco: 1134 },
    { altura: 60, largura: 80, preco: 692 },
    { altura: 60, largura: 100, preco: 809 },
    { altura: 60, largura: 120, preco: 926 },
    { altura: 60, largura: 150, preco: 1101 },
    { altura: 60, largura: 180, preco: 1276 },
  ]
};

// ========================================
// JANELA 3 FOLHAS - LINHA SUPREMA - BRANCO
// ========================================

export const JANELA_3F_BRANCO: ProductPriceTable = {
  tipo: '3f',
  cor: 'branco',
  handle: 'janela-de-correr-tres-folhas-branco',
  linha: 'suprema',
  variantes: [
    // Nota: 3F básica SÓ tem larguras 120, 150, 180
    { altura: 30, largura: 120, preco: 569 },
    { altura: 30, largura: 150, preco: 670 },
    { altura: 30, largura: 180, preco: 767 },
    { altura: 40, largura: 120, preco: 643 },
    { altura: 40, largura: 150, preco: 752 },
    { altura: 40, largura: 180, preco: 863 },
    { altura: 50, largura: 120, preco: 715 },
    { altura: 50, largura: 150, preco: 836 },
    { altura: 50, largura: 180, preco: 956 },
    { altura: 60, largura: 120, preco: 788 },
    { altura: 60, largura: 150, preco: 918 },
    { altura: 60, largura: 180, preco: 1051 },
  ]
};

// ========================================
// JANELA 3 FOLHAS - LINHA SUPREMA - PRETO
// ========================================

export const JANELA_3F_PRETO: ProductPriceTable = {
  tipo: '3f',
  cor: 'preto',
  handle: 'janela-de-correr-tres-folhas-preta',
  linha: 'suprema',
  variantes: [
    // Nota: 3F básica SÓ tem larguras 120, 150, 180
    { altura: 30, largura: 120, preco: 608 },
    { altura: 30, largura: 150, preco: 716 },
    { altura: 30, largura: 180, preco: 819 },
    { altura: 40, largura: 120, preco: 687 },
    { altura: 40, largura: 150, preco: 804 },
    { altura: 40, largura: 180, preco: 921 },
    { altura: 50, largura: 120, preco: 765 },
    { altura: 50, largura: 150, preco: 892 },
    { altura: 50, largura: 180, preco: 1021 },
    { altura: 60, largura: 120, preco: 842 },
    { altura: 60, largura: 150, preco: 981 },
    { altura: 60, largura: 180, preco: 1122 },
  ]
};

// ========================================
// JANELA 3 FOLHAS COM GRADE - LINHA SUPREMA - BRANCO
// ========================================

export const JANELA_3F_GRADE_BRANCO: ProductPriceTable = {
  tipo: '3f_grade',
  cor: 'branco',
  handle: 'janela-tres-folhas-branco-com-grade-embutida',
  linha: 'suprema',
  variantes: [
    // Nota: 3F grade SÓ tem larguras 120, 150, 180
    { altura: 30, largura: 120, preco: 693 },
    { altura: 30, largura: 150, preco: 826 },
    { altura: 30, largura: 180, preco: 953 },
    { altura: 40, largura: 120, preco: 808 },
    { altura: 40, largura: 150, preco: 959 },
    { altura: 40, largura: 180, preco: 1111 },
    { altura: 50, largura: 120, preco: 922 },
    { altura: 50, largura: 150, preco: 1095 },
    { altura: 50, largura: 180, preco: 1266 },
    { altura: 60, largura: 120, preco: 1036 },
    { altura: 60, largura: 150, preco: 1228 },
    { altura: 60, largura: 180, preco: 1424 },
  ]
};

// ========================================
// JANELA 3 FOLHAS COM GRADE - LINHA SUPREMA - PRETO
// ========================================

export const JANELA_3F_GRADE_PRETO: ProductPriceTable = {
  tipo: '3f_grade',
  cor: 'preto',
  handle: 'janela-3-folhas-40x120-preto-com-grade-embutida',
  linha: 'suprema',
  variantes: [
    // Nota: 3F grade SÓ tem larguras 120, 150, 180
    { altura: 30, largura: 120, preco: 733 },
    { altura: 30, largura: 150, preco: 872 },
    { altura: 30, largura: 180, preco: 1007 },
    { altura: 40, largura: 120, preco: 852 },
    { altura: 40, largura: 150, preco: 1013 },
    { altura: 40, largura: 180, preco: 1173 },
    { altura: 50, largura: 120, preco: 971 },
    { altura: 50, largura: 150, preco: 1147 },
    { altura: 50, largura: 180, preco: 1332 },
    { altura: 60, largura: 120, preco: 1088 },
    { altura: 60, largura: 150, preco: 1289 },
    { altura: 60, largura: 180, preco: 1492 },
  ]
};

// ========================================
// JANELA 3 FOLHAS COM TELA - LINHA SUPREMA - BRANCO
// ========================================

export const JANELA_3F_TELA_BRANCO: ProductPriceTable = {
  tipo: '3f_tela',
  cor: 'branco',
  handle: 'janela-tres-folhas-branca-com-folha-tela-mosqueteira',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 532 },
    { altura: 30, largura: 100, preco: 575 },
    { altura: 30, largura: 120, preco: 625 },
    { altura: 30, largura: 150, preco: 773 },
    { altura: 30, largura: 180, preco: 1020 },
    { altura: 40, largura: 80, preco: 600 },
    { altura: 40, largura: 100, preco: 649 },
    { altura: 40, largura: 120, preco: 706 },
    { altura: 40, largura: 150, preco: 867 },
    { altura: 40, largura: 180, preco: 1136 },
    { altura: 50, largura: 80, preco: 667 },
    { altura: 50, largura: 100, preco: 722 },
    { altura: 50, largura: 120, preco: 785 },
    { altura: 50, largura: 150, preco: 963 },
    { altura: 50, largura: 180, preco: 1240 },
    { altura: 60, largura: 80, preco: 735 },
    { altura: 60, largura: 100, preco: 795 },
    { altura: 60, largura: 120, preco: 864 },
    { altura: 60, largura: 150, preco: 1058 },
    { altura: 60, largura: 180, preco: 1360 },
  ]
};

// ========================================
// JANELA 3 FOLHAS COM TELA - LINHA SUPREMA - PRETO
// ========================================

export const JANELA_3F_TELA_PRETO: ProductPriceTable = {
  tipo: '3f_tela',
  cor: 'preto',
  handle: 'janela-de-correr-tres-folhas-preta-com-tela-mosqueteira',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 560 },
    { altura: 30, largura: 100, preco: 621 },
    { altura: 30, largura: 120, preco: 687 },
    { altura: 30, largura: 150, preco: 773 },
    { altura: 30, largura: 180, preco: 1020 },
    { altura: 40, largura: 80, preco: 613 },
    { altura: 40, largura: 100, preco: 654 },
    { altura: 40, largura: 120, preco: 706 },
    { altura: 40, largura: 150, preco: 867 },
    { altura: 40, largura: 180, preco: 1136 },
    { altura: 50, largura: 80, preco: 667 },
    { altura: 50, largura: 100, preco: 722 },
    { altura: 50, largura: 120, preco: 785 },
    { altura: 50, largura: 150, preco: 963 },
    { altura: 50, largura: 180, preco: 1240 },
    { altura: 60, largura: 80, preco: 735 },
    { altura: 60, largura: 100, preco: 795 },
    { altura: 60, largura: 120, preco: 864 },
    { altura: 60, largura: 150, preco: 1058 },
    { altura: 60, largura: 180, preco: 1360 },
  ]
};

// ========================================
// JANELA 3 FOLHAS COM TELA E GRADE - LINHA SUPREMA - BRANCO
// ========================================

export const JANELA_3F_TELA_GRADE_BRANCO: ProductPriceTable = {
  tipo: '3f_tela_grade',
  cor: 'branco',
  handle: 'janela-de-correr-tres-folhas-branca-com-tela-mosqueteira-e-grade-embutida',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 606 },
    { altura: 30, largura: 100, preco: 687 },
    { altura: 30, largura: 120, preco: 742 },
    { altura: 30, largura: 150, preco: 857 },
    { altura: 30, largura: 180, preco: 1121 },
    { altura: 40, largura: 80, preco: 676 },
    { altura: 40, largura: 100, preco: 758 },
    { altura: 40, largura: 120, preco: 840 },
    { altura: 40, largura: 150, preco: 951 },
    { altura: 40, largura: 180, preco: 1240 },
    { altura: 50, largura: 80, preco: 734 },
    { altura: 50, largura: 100, preco: 802 },
    { altura: 50, largura: 120, preco: 872 },
    { altura: 50, largura: 150, preco: 1087 },
    { altura: 50, largura: 180, preco: 1355 },
    { altura: 60, largura: 80, preco: 803 },
    { altura: 60, largura: 100, preco: 895 },
    { altura: 60, largura: 120, preco: 965 },
    { altura: 60, largura: 150, preco: 1091 },
    { altura: 60, largura: 180, preco: 1447 },
  ]
};

// ========================================
// JANELA 3 FOLHAS COM TELA E GRADE - LINHA SUPREMA - PRETO
// ========================================

export const JANELA_3F_TELA_GRADE_PRETO: ProductPriceTable = {
  tipo: '3f_tela_grade',
  cor: 'preto',
  handle: 'janela-de-correr-tres-folhas-preta-com-tela-mosqueteira-grade-embutida',
  linha: 'suprema',
  variantes: [
    { altura: 30, largura: 80, preco: 618 },
    { altura: 30, largura: 100, preco: 687 },
    { altura: 30, largura: 120, preco: 742 },
    { altura: 30, largura: 150, preco: 857 },
    { altura: 30, largura: 180, preco: 1121 },
    { altura: 40, largura: 80, preco: 676 },
    { altura: 40, largura: 100, preco: 758 },
    { altura: 40, largura: 120, preco: 840 },
    { altura: 40, largura: 150, preco: 951 },
    { altura: 40, largura: 180, preco: 1240 },
    { altura: 50, largura: 80, preco: 734 },
    { altura: 50, largura: 100, preco: 802 },
    { altura: 50, largura: 120, preco: 872 },
    { altura: 50, largura: 150, preco: 1087 },
    { altura: 50, largura: 180, preco: 1355 },
    { altura: 60, largura: 80, preco: 803 },
    { altura: 60, largura: 100, preco: 895 },
    { altura: 60, largura: 120, preco: 965 },
    { altura: 60, largura: 150, preco: 1091 },
    { altura: 60, largura: 180, preco: 1447 },
  ]
};

// ========================================
// KIT ARREMATE
// ========================================

export const KIT_ARREMATE = {
  tipo: 'arremate' as ProductType,
  cores: ['branco', 'preto'] as ProductColor[],
  handles: {
    branco: 'kit-arremate-branco-completo-45º',
    preto: 'vitro-pivotante-preto-horizontal-linha-25-copia'
  },
  precoNormal: 180,
  precoOrderBump: 117, // Preço promocional quando oferecido
  canais: ['whatsapp', 'shopify'], // NÃO vende no ML
  regra: 'Um kit por pedido completo, independente da quantidade de janelas'
};

// ========================================
// ÍNDICE DE TODAS AS TABELAS
// ========================================

export const ALL_PRICE_TABLES: ProductPriceTable[] = [
  // Capelinha (1 vidro)
  CAPELINHA_PRETO_HORIZONTAL,
  CAPELINHA_PRETO_VERTICAL,
  CAPELINHA_BRANCO_HORIZONTAL,
  CAPELINHA_BRANCO_VERTICAL,
  // Capelinha (3 vidros)
  CAPELINHA_3V_PRETO_HORIZONTAL,
  CAPELINHA_3V_PRETO_VERTICAL,
  CAPELINHA_3V_BRANCO_HORIZONTAL,
  CAPELINHA_3V_BRANCO_VERTICAL,
  // Janela 2 Folhas
  JANELA_2F_BRANCO,
  JANELA_2F_PRETO,
  // Janela 2 Folhas com Grade
  JANELA_2F_GRADE_BRANCO,
  JANELA_2F_GRADE_PRETO,
  // Janela 3 Folhas
  JANELA_3F_BRANCO,
  JANELA_3F_PRETO,
  // Janela 3 Folhas com Grade
  JANELA_3F_GRADE_BRANCO,
  JANELA_3F_GRADE_PRETO,
  // Janela 3 Folhas com Tela
  JANELA_3F_TELA_BRANCO,
  JANELA_3F_TELA_PRETO,
  // Janela 3 Folhas com Tela e Grade
  JANELA_3F_TELA_GRADE_BRANCO,
  JANELA_3F_TELA_GRADE_PRETO,
];

// ========================================
// FUNÇÕES DE BUSCA
// ========================================

/**
 * Encontra a tabela de preços para um tipo, cor e orientação específicos
 */
export function findPriceTable(
  tipo: ProductType,
  cor: ProductColor,
  orientacao?: ProductOrientation
): ProductPriceTable | undefined {
  return ALL_PRICE_TABLES.find(t => {
    const tipoMatch = t.tipo === tipo;
    const corMatch = t.cor === cor;
    const orientMatch = orientacao ? t.orientacao === orientacao : true;
    return tipoMatch && corMatch && orientMatch;
  });
}

/**
 * Busca o preço exato para uma variante
 */
export function getPrice(
  tipo: ProductType,
  cor: ProductColor,
  altura: number,
  largura: number,
  orientacao?: ProductOrientation
): number | undefined {
  const table = findPriceTable(tipo, cor, orientacao);
  if (!table) return undefined;
  
  const variante = table.variantes.find(v => 
    v.altura === altura && v.largura === largura
  );
  
  return variante?.preco;
}

/**
 * Encontra a variante mais próxima da medida solicitada
 */
export function findClosestVariant(
  variantes: PriceVariant[],
  altura: number,
  largura: number
): PriceVariant {
  let closest = variantes[0];
  let minDistance = Infinity;
  
  for (const v of variantes) {
    const distance = Math.abs(v.altura - altura) + Math.abs(v.largura - largura);
    if (distance < minDistance) {
      minDistance = distance;
      closest = v;
    }
  }
  
  return closest;
}

/**
 * Retorna as dimensões válidas para um tipo de produto
 */
export function getValidDimensions(
  tipo: ProductType,
  cor: ProductColor,
  orientacao?: ProductOrientation
): { alturas: number[]; larguras: number[] } | undefined {
  const table = findPriceTable(tipo, cor, orientacao);
  if (!table) return undefined;
  
  const alturas = [...new Set(table.variantes.map(v => v.altura))].sort((a, b) => a - b);
  const larguras = [...new Set(table.variantes.map(v => v.largura))].sort((a, b) => a - b);
  
  return { alturas, larguras };
}

/**
 * Verifica se um tipo de produto requer orientação
 */
export function requiresOrientation(tipo: ProductType): boolean {
  return tipo === 'capelinha' || tipo === 'capelinha_3v';
}

/**
 * Auto-detecta a orientação baseado nas dimensões
 */
export function detectOrientation(altura: number, largura: number): ProductOrientation {
  return altura > largura ? 'vertical' : 'horizontal';
}

/**
 * Retorna informações do produto formatadas
 */
export function formatProductName(
  tipo: ProductType,
  cor: ProductColor,
  orientacao?: ProductOrientation
): string {
  const names: Record<ProductType, string> = {
    'capelinha': 'Vitrô Pivotante',
    'capelinha_3v': 'Vitrô Pivotante 3 Vidros',
    '2f': 'Janela 2 Folhas',
    '2f_grade': 'Janela 2 Folhas c/ Grade',
    '3f': 'Janela 3 Folhas',
    '3f_grade': 'Janela 3 Folhas c/ Grade',
    '3f_tela': 'Janela 3 Folhas c/ Tela',
    '3f_tela_grade': 'Janela 3 Folhas c/ Tela e Grade',
    'arremate': 'Kit Arremate'
  };
  
  const corName = cor === 'preto' ? 'Preto' : 'Branco';
  const orientName = orientacao 
    ? ` ${orientacao === 'horizontal' ? 'Horizontal' : 'Vertical'}` 
    : '';
  
  return `${names[tipo]} ${corName}${orientName}`;
}

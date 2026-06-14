export interface DimensaoPneu {
  largura: number;
  serie: number; // 0 representing inches/off-road
  aro: number;
  indiceCarga: number;
  indicePerf: string;
}

export const LARGURAS_METRICAS = [
  115, 125, 135, 145, 155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315, 325, 335, 345, 355, 365, 375, 385, 395
];

export const LARGURAS_POLEGADAS = [
  27, 30, 31, 32, 33, 35, 37
];

export const ALL_LARGURAS = [...LARGURAS_METRICAS, ...LARGURAS_POLEGADAS].sort((a, b) => a - b);

export const SERIES_DISPONIVEIS = [
  8.5, 9.5, 10.5, 11.5, 12.5,
  25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85
].sort((a, b) => a - b);

export const AROS_DISPONIVEIS = [
  12, 13, 14, 15, 16, 16.5, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28
].sort((a, b) => a - b);

export const TABELA_PERFORMANCE: { [key: string]: number } = {
  'J': 1,
  'K': 2,
  'L': 3,
  'M': 4,
  'N': 5,
  'P': 6,
  'Q': 7,
  'R': 8,
  'S': 9,
  'T': 10,
  'H': 11,
  'V': 12,
  'W': 13,
  'Y': 14,
  'VR': 15,
  'ZR': 16,
};

export const INDICES_PERFORMANCE_ORDENADOS = Object.keys(TABELA_PERFORMANCE).sort(
  (a, b) => TABELA_PERFORMANCE[a] - TABELA_PERFORMANCE[b]
);

export function getValorPerformance(codigo: string): number {
  return TABELA_PERFORMANCE[codigo.toUpperCase()] || 0;
}

/**
 * Calculates External Diameter of a tire in mm.
 */
export function calcularDiametro(largura: number, serie: number, aro: number): number {
  if (!serie || serie === 0) {
    // Inches format: diameter = width * 25.4
    return largura * 25.4;
  }
  // Metric format: diameter = (width * series% * 2) + (aro * 25.4)
  return (largura * (serie / 100) * 2) + (aro * 25.4);
}

/**
 * Calculates difference between original and substitute diameter.
 */
export function calcularDiferenca(diametroOriginal: number, diametroSubstituto: number) {
  const diferencaMm = diametroSubstituto - diametroOriginal;
  const diferencaPercent = (diferencaMm / diametroOriginal) * 100;
  return { diferencaMm, diferencaPercent };
}

/**
 * Parses tire dimensions from string description.
 */
export function parsearDimensao(descricao: string): DimensaoPneu | null {
  const normalized = descricao.toUpperCase();
  
  // 1. Metric: e.g., "225/50 R16 92H" or "LT265/75 R16"
  const metrico = normalized.match(/(\d{3})\/(\d{2,3}(?:\.5)?)\s?[Rr]\s?(\d{2})/);
  if (metrico) {
    const largura = parseInt(metrico[1], 10);
    const serie = parseFloat(metrico[2]);
    const aro = parseInt(metrico[3], 10);
    
    let indiceCarga = 90; // Default standard value
    let indicePerf = 'H';  // Default standard value
    
    const afterDimension = normalized.substring(metrico.index! + metrico[0].length);
    const loadSpeedMatch = afterDimension.match(/\b(\d{2,3})([A-Z])\b/);
    if (loadSpeedMatch) {
      indiceCarga = parseInt(loadSpeedMatch[1], 10);
      indicePerf = loadSpeedMatch[2];
    } else {
      const loadSpeedMatchLoose = afterDimension.match(/(\d{2,3})([A-Z])/);
      if (loadSpeedMatchLoose) {
        indiceCarga = parseInt(loadSpeedMatchLoose[1], 10);
        indicePerf = loadSpeedMatchLoose[2];
      }
    }
    
    return { largura, serie, aro, indiceCarga, indicePerf };
  }
  
  // 2. Inches: e.g., "32X10.00 R15" or "28X10.00 R14"
  const polegadas = normalized.match(/(\d{2})[Xx][\d.]+\s?[Rr]\s?(\d{2})/);
  if (polegadas) {
    const largura = parseInt(polegadas[1], 10);
    const serie = 0;
    const aro = parseInt(polegadas[2], 10);
    
    let indiceCarga = 100; // Standard fallback
    let indicePerf = 'N';  // Standard fallback
    
    const afterDimension = normalized.substring(polegadas.index! + polegadas[0].length);
    const loadSpeedMatch = afterDimension.match(/\b(\d{2,3})([A-Z])\b/);
    if (loadSpeedMatch) {
      indiceCarga = parseInt(loadSpeedMatch[1], 10);
      indicePerf = loadSpeedMatch[2];
    }
    
    return { largura, serie, aro, indiceCarga, indicePerf };
  }
  
  return null;
}

/**
 * Validates equivalence of original to substitute tire.
 */
export function validarEquivalencia(original: DimensaoPneu, substituto: DimensaoPneu) {
  const diaOrig = calcularDiametro(original.largura, original.serie, original.aro);
  const diaSub  = calcularDiametro(substituto.largura, substituto.serie, substituto.aro);

  const { diferencaMm, diferencaPercent } = calcularDiferenca(diaOrig, diaSub);

  const toleranciaOk   = diferencaPercent >= -3 && diferencaPercent <= 3;
  const cargaOk        = substituto.indiceCarga >= original.indiceCarga;
  const performanceOk  = getValorPerformance(substituto.indicePerf) >= getValorPerformance(original.indicePerf);

  const possivel = toleranciaOk && cargaOk && performanceOk;

  return {
    possivel,                        // true = SIM, false = NÃO
    diametroOriginal: diaOrig,
    diametroSubstituto: diaSub,
    diferencaMm,
    diferencaPercent,
    toleranciaOk,
    cargaOk,
    performanceOk
  };
}

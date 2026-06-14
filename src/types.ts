export interface Produto {
  cai: string;
  descricao: string;
  segmento: string;
  marca: 'MIC' | 'BFG' | string;
  escultura: string;
  aro: string | number;
  precoPisCofins: number;
  precoTabelaOracle: number;
  descontoCanal: number;
  descontoQualidade: number;
  descontoAgilis: number;
  descontoDesconcentracao: number;
  precoSellIn: number;
  precoSellOut: number;
  
  // Custom optional fields for Importados sheet mapping
  id_cai?: string;
  medida?: string;
  indice_carga?: number | string;
  indice_velocidade?: string;
  modelo?: string;
  canal?: string;
  categoria?: string;
  precosImportados?: {
    avista: number;
    parc_2x?: number;
    parc_3x?: number;
    parc_4x?: number;
    parc_5x?: number;
    parc_ate_6x?: number;
    parc_ate_10x?: number;
    sellout: number;
  };
  origem?: string;
  data_importacao?: string;
  status?: string;
}

export interface DescontosGlobais {
  canal: number;
  qualidade: number;
  agilis: number;
  qualidadeLevorin: number;
  desconcentracao: number;
}

export interface TaxasCartao {
  debito: number;
  "1x": number;
  "2x": number;
  "3x": number;
  "4x": number;
  "5x": number;
  "6x": number;
  "7x": number;
  "8x": number;
  "9x": number;
  "10x": number;
  "11x": number;
  "12x": number;
}

export interface PerfilMaquininha {
  id: string;
  nome: string;
  isAtivo: boolean;
  isAtivoPromocional?: boolean;
  taxas: TaxasCartao;
}

export interface ItemPromocional {
  cai: string;
  descontoPromocional: number;
}

export interface AppConfig {
  descontosGlobais: DescontosGlobais;
  perfisMaquininha: PerfilMaquininha[];
  ultimaImportacao: string | null;
}

import { Produto, DescontosGlobais, PerfilMaquininha } from './types';

export const DEFAULT_DESCONTOS: DescontosGlobais = {
  canal: 0.04,
  qualidade: 0.00,
  agilis: 0.06,
  qualidadeLevorin: 0.00,
  desconcentracao: 0.00,
};

export const DEFAULT_PERFIS: PerfilMaquininha[] = [
  {
    id: 'rede-padrao',
    nome: 'Rede Michelin (Padrão)',
    isAtivo: true,
    isAtivoPromocional: true,
    taxas: {
      debito: 0.0098,
      "1x": 0.0316,
      "2x": 0.0444,
      "3x": 0.0524,
      "4x": 0.0605,
      "5x": 0.0685,
      "6x": 0.0765,
      "7x": 0.0861,
      "8x": 0.0941,
      "9x": 0.1021,
      "10x": 0.1101,
      "11x": 0.1262,
      "12x": 0.1342,
    }
  },
  {
    id: 'stone-pneulink',
    nome: 'Stone PneuLink',
    isAtivo: false,
    taxas: {
      debito: 0.0085,
      "1x": 0.0298,
      "2x": 0.0399,
      "3x": 0.0485,
      "4x": 0.0550,
      "5x": 0.0620,
      "6x": 0.0690,
      "7x": 0.0780,
      "8x": 0.0850,
      "9x": 0.0920,
      "10x": 0.0990,
      "11x": 0.1150,
      "12x": 0.1220,
    }
  },
  {
    id: 'cielo-especial',
    nome: 'Cielo Especial ES',
    isAtivo: false,
    taxas: {
      debito: 0.0110,
      "1x": 0.0320,
      "2x": 0.0450,
      "3x": 0.0530,
      "4x": 0.0610,
      "5x": 0.0690,
      "6x": 0.0770,
      "7x": 0.0870,
      "8x": 0.0950,
      "9x": 0.1030,
      "10x": 0.1110,
      "11x": 0.1270,
      "12x": 0.1350,
    }
  }
];

export const MOCK_PRODUTOS: Produto[] = [
  {
    cai: "785762",
    descricao: "28X10.00 R14 NHS TL MUD TERRAIN KM3 GO",
    segmento: "REC",
    marca: "BFG",
    escultura: "MUD-TERRAIN T/A KM3 AGILIS FLT",
    aro: 14,
    precoPisCofins: 1194.81,
    precoTabelaOracle: 1284.74,
    descontoCanal: 0.04,
    descontoQualidade: 0.00,
    descontoAgilis: 0.06,
    descontoDesconcentracao: 0.00,
    precoSellIn: 1620.43,
    precoSellOut: 2106.90
  },
  {
    cai: "123456",
    descricao: "205/55 R16 91V PRIMACY 4 MI",
    segmento: "TC",
    marca: "MIC",
    escultura: "PRIMACY 4",
    aro: 16,
    precoPisCofins: 450.20,
    precoTabelaOracle: 512.40,
    descontoCanal: 0.04,
    descontoQualidade: 0.00,
    descontoAgilis: 0.00,
    descontoDesconcentracao: 0.00,
    precoSellIn: 540.30,
    precoSellOut: 699.00
  },
  {
    cai: "654321",
    descricao: "225/45 R17 94W PILOT SPORT 5 MI",
    segmento: "TC",
    marca: "MIC",
    escultura: "PILOT SPORT 5",
    aro: 17,
    precoPisCofins: 680.50,
    precoTabelaOracle: 755.90,
    descontoCanal: 0.04,
    descontoQualidade: 0.00,
    descontoAgilis: 0.00,
    descontoDesconcentracao: 0.00,
    precoSellIn: 810.00,
    precoSellOut: 1100.00
  },
  {
    cai: "112233",
    descricao: "175/70 R14 88T LTX FORCE MI",
    segmento: "TC",
    marca: "MIC",
    escultura: "LTX FORCE",
    aro: 14,
    precoPisCofins: 380.00,
    precoTabelaOracle: 440.00,
    descontoCanal: 0.04,
    descontoQualidade: 0.00,
    descontoAgilis: 0.00,
    descontoDesconcentracao: 0.00,
    precoSellIn: 410.00,
    precoSellOut: 530.00
  },
  {
    cai: "445566",
    descricao: "LT265/75 R16 123R ALL TERRAIN KO2 LRD GO",
    segmento: "REC",
    marca: "BFG",
    escultura: "ALL-TERRAIN T/A KO2 AGILIS",
    aro: 16,
    precoPisCofins: 950.00,
    precoTabelaOracle: 1050.00,
    descontoCanal: 0.04,
    descontoQualidade: 0.02,
    descontoAgilis: 0.06,
    descontoDesconcentracao: 0.00,
    precoSellIn: 1180.00,
    precoSellOut: 1540.00
  }
];

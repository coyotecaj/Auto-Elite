import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, X, Percent, Check, HelpCircle } from 'lucide-react';
import { Produto, DescontosGlobais, PerfilMaquininha, ItemPromocional } from '../types';

interface PriceCalculatorProps {
  produto?: Produto | null;       // If passed, operates as a single product modal/focus calculator
  onClose?: () => void;           // Optional close handler (if rendered as a modal)
  produtos: Produto[];            // To support search & auto-populate in avulso/sandbox mode
  descontos: DescontosGlobais;
  perfisMaquininha: PerfilMaquininha[];
  itensPromocionais?: ItemPromocional[];
}

export default function PriceCalculator({
  produto = null,
  onClose,
  produtos,
  descontos,
  perfisMaquininha,
  itensPromocionais = [],
}: PriceCalculatorProps) {
  // Available card maquininha profiles
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    perfisMaquininha.find((p) => p.isAtivo)?.id || perfisMaquininha[0]?.id || ''
  );
  const activeProfile = useMemo(() => {
    return perfisMaquininha.find((p) => p.id === selectedProfileId) || perfisMaquininha[0];
  }, [perfisMaquininha, selectedProfileId]);

  // Core Simulation Parameters
  const [selectedTire, setSelectedTire] = useState<Produto | null>(produto);
  const [manualSellIn, setManualSellIn] = useState<string>('1200,00');
  const [manualDescricao, setManualDescricao] = useState('Pneu Simulação Manual');
  const [manualMarca, setManualMarca] = useState<'MIC' | 'BFG'>('MIC');
  const [manualEscultura, setManualEscultura] = useState('PRIMACY');
  
  const [margemDesejada, setMargemDesejada] = useState<number>(15);
  const [formaPagamento, setFormaPagamento] = useState<keyof PerfilMaquininha['taxas']>('1x');
  
  const [aplicarCanal, setAplicarCanal] = useState(true);
  const [aplicarAgilis, setAplicarAgilis] = useState(true);
  const [aplicarDesconcentracao, setAplicarDesconcentracao] = useState(false);

  // Auto-update chosen tire state if prop changes (for modal usage)
  useEffect(() => {
    if (produto) {
      setSelectedTire(produto);
    }
  }, [produto]);

  // Sync margin when selected tire or discounts change, so that the default suggested price matches the product's official suggested price!
  useEffect(() => {
    if (selectedTire) {
      const sellInBase = selectedTire.precoSellIn;
      
      const descCanalRatio = aplicarCanal ? descontos.canal : 0;
      const isBfg = selectedTire.marca.toUpperCase() === 'BFG';
      const hasAgilis = String(selectedTire.escultura).toUpperCase().includes('AGILIS') ||
                        String(selectedTire.descricao).toUpperCase().includes('AGILIS');
      const descAgilisRatio = (isBfg && hasAgilis && aplicarAgilis) ? descontos.agilis : 0;
      const descDesconcRatio = aplicarDesconcentracao ? descontos.desconcentracao : 0;
      
      const precoComDescontos = sellInBase * (1 - descCanalRatio) * (1 - descAgilisRatio) * (1 - descDesconcRatio);
      
      if (precoComDescontos > 0) {
        const impliedMargin = ((selectedTire.precoSellOut / precoComDescontos) - 1) * 100;
        // Float to 2 decimals for display
        setMargemDesejada(Math.round(impliedMargin * 100) / 100);
      }
    }
  }, [selectedTire, aplicarCanal, aplicarAgilis, aplicarDesconcentracao, descontos]);

  // Handle auto-populated selection in avulso mode
  const handleProductSelect = (cai: string) => {
    if (cai === 'MANUAL') {
      setSelectedTire(null);
    } else {
      const found = produtos.find(p => p.cai === cai);
      if (found) {
        setSelectedTire(found);
      }
    }
  };

  const currentTireInfo = useMemo(() => {
    if (selectedTire) {
      return {
        descricao: selectedTire.descricao,
        marca: selectedTire.marca,
        escultura: selectedTire.escultura,
        precoSellIn: selectedTire.precoSellIn,
        precoSellOut: selectedTire.precoSellOut,
        isBfg: selectedTire.marca.toUpperCase() === 'BFG',
        hasAgilis: String(selectedTire.escultura).toUpperCase().includes('AGILIS') ||
                   String(selectedTire.descricao).toUpperCase().includes('AGILIS'),
      };
    } else {
      // Manual values parsing
      const parsedSellIn = parseFloat(manualSellIn.replace(',', '.')) || 0;
      return {
        descricao: manualDescricao || 'Produto Simulado',
        marca: manualMarca,
        escultura: manualEscultura,
        precoSellIn: parsedSellIn,
        precoSellOut: 0,
        isBfg: manualMarca === 'BFG',
        hasAgilis: manualEscultura.toUpperCase().includes('AGILIS'),
      };
    }
  }, [selectedTire, manualSellIn, manualDescricao, manualMarca, manualEscultura]);

  // Perform Calculations
  const calculations = useMemo(() => {
    const sellInBase = currentTireInfo.precoSellIn;
    
    // Determine active discount ratios
    const descCanalRatio = aplicarCanal ? descontos.canal : 0;
    
    // Agilis only applies to BFGoodrich tires with "AGILIS" in sculpture, as stated in Rules
    const isAgilisEligible = currentTireInfo.isBfg && currentTireInfo.hasAgilis;
    const descAgilisRatio = (isAgilisEligible && aplicarAgilis) ? descontos.agilis : 0;
    
    const descDesconcRatio = aplicarDesconcentracao ? descontos.desconcentracao : 0;

    // Formulas:
    // precoComDescontos = precoSellIn * (1 - descontoCanal) * (1 - descontoAgilis) * (1 - descontoDesconcentracao)
    const precoComDescontos = sellInBase * (1 - descCanalRatio) * (1 - descAgilisRatio) * (1 - descDesconcRatio);
    const totalDescontoAbsoluto = sellInBase - precoComDescontos;
    const percentualDescontoComposto = sellInBase > 0 ? (totalDescontoAbsoluto / sellInBase) * 100 : 0;

    // precoComMargem = precoComDescontos * (1 + margemDesejada / 100)
    const precoComMargem = precoComDescontos * (1 + (margemDesejada / 100));
    const margemAdicionadaAbsoluta = precoComMargem - precoComDescontos;

    // precoFinal = precoComMargem * (1 + taxaCobranca)
    const taxaCobranca = activeProfile.taxas[formaPagamento] || 0;
    const precoFinal = precoComMargem * (1 + taxaCobranca);
    const taxaCartaoAbsoluta = precoFinal - precoComMargem;

    return {
      sellInBase,
      isAgilisEligible,
      descCanalRatio,
      descAgilisRatio,
      descDesconcRatio,
      precoComDescontos,
      totalDescontoAbsoluto,
      percentualDescontoComposto,
      precoComMargem,
      margemAdicionadaAbsoluta,
      taxaCobranca,
      precoFinal,
      taxaCartaoAbsoluta,
    };
  }, [currentTireInfo, activeProfile, formaPagamento, margemDesejada, aplicarCanal, aplicarAgilis, aplicarDesconcentracao, descontos]);

  const promoInfo = useMemo(() => {
    if (!selectedTire) return null;
    return (itensPromocionais || []).find(item => item.cai === selectedTire.cai) || null;
  }, [selectedTire, itensPromocionais]);

  const promoCalculation = useMemo(() => {
    if (!promoInfo) return null;
    const descontoRatio = promoInfo.descontoPromocional / 100;
    
    // Original values inside current margins/tax
    const originalPrecoComMargem = calculations.precoComMargem;
    const originalPrecoFinal = calculations.precoFinal;
    
    // Promo values inside current margins/tax
    const promoPrecoComMargem = originalPrecoComMargem * (1 - descontoRatio);
    const promoPrecoFinal = promoPrecoComMargem * (1 + calculations.taxaCobranca);
    const promoTaxaCartaoAbsoluta = promoPrecoFinal - promoPrecoComMargem;
    const totalMacroEconomia = originalPrecoFinal - promoPrecoFinal;
    
    return {
      descontoPromocional: promoInfo.descontoPromocional,
      promoPrecoComMargem,
      promoPrecoFinal,
      promoTaxaCartaoAbsoluta,
      totalMacroEconomia
    };
  }, [promoInfo, calculations]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getPercentLabel = (val: number) => {
    return `${(val * 100).toFixed(2)}%`;
  };

  return (
    <div className={`space-y-6 ${onClose ? 'bg-transparent' : 'animate-fade-in'}`}>
      
      {/* HEADER ROW FOR STANDALONE USAGE */}
      {!onClose && (
        <div className="border-b border-neutral-800 pb-5">
          <h1 className="text-2xl font-bold uppercase text-foreground font-sans">Simulador de Vendas</h1>
          <p className="text-neutral-500 text-xs mt-1 uppercase tracking-wider font-mono">
            Escolha um pneu cadastrado ou digite preços customizados para simular o custo final ao cliente.
          </p>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${onClose ? 'text-neutral-300' : ''}`}>
        
        {/* INPUT PANEL - 5 COLS */}
        <div className="lg:col-span-5 space-y-5 bg-neutral-950 border border-neutral-800 rounded-none p-5 shadow-md relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FFCC00]"></div>
          
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Calculator className="text-[#FFCC00]" size={14} />
              Parâmetros de Cotação
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-neutral-900 rounded-none text-neutral-400 hover:text-foreground border border-transparent hover:border-neutral-800 transition-all font-mono"
                title="Fechar Cotação"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* TIRE SELECTOR (ONLY SHOWN IF IN STANDALONE/SANDBOX TAB OR IF USER PREFERS SELECTING) */}
          {!onClose && (
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1.5 font-mono">
                Pneu Associado para Cotação
              </label>
              <select
                value={selectedTire?.cai || 'MANUAL'}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-none py-2 px-3 text-foreground focus:outline-none focus:border-[#FFCC00] font-mono font-medium"
              >
                <option value="MANUAL">✎ Entrada Manual de Preço</option>
                {produtos.map((p, index) => (
                  <option key={`${p.cai}-${index}`} value={p.cai}>
                    [{p.marca}] {p.cai} - {p.descricao.substring(0, 36)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* MANUAL MODE INPUTS */}
          {!selectedTire && (
            <div className="p-4 bg-neutral-900/40 rounded-none space-y-4 border border-neutral-800 animate-fade-in font-mono">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#FFCC00] block">✎ Detalhes do Pneu Manual</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1 uppercase">Preço Sell In Base</label>
                  <input
                    type="text"
                    value={manualSellIn}
                    onChange={(e) => setManualSellIn(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-foreground text-xs font-mono font-bold rounded-none py-1.5 px-2.5 focus:outline-none focus:border-[#FFCC00]"
                    placeholder="Ex: 1200,00"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1 uppercase">Marca</label>
                  <select
                    value={manualMarca}
                    onChange={(e) => setManualMarca(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-foreground text-xs rounded-none py-1.5 px-2 focus:outline-none focus:border-[#FFCC00]"
                  >
                    <option value="MIC">Michelin</option>
                    <option value="BFG">BFGoodrich</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 block mb-1 uppercase font-sans">Descrição Comercial</label>
                <input
                  type="text"
                  value={manualDescricao}
                  onChange={(e) => setManualDescricao(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-foreground text-xs rounded-none py-1.5 px-2.5 focus:outline-none focus:border-[#FFCC00] font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 block mb-1 uppercase">Modelo / Desenho de Banda (Escultura)</label>
                <input
                  type="text"
                  value={manualEscultura}
                  onChange={(e) => setManualEscultura(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-foreground text-xs rounded-none py-1.5 px-2.5 focus:outline-none focus:border-[#FFCC00]"
                  placeholder="Incluir AGILIS para acionar descontos específicos"
                />
              </div>
            </div>
          )}

          {/* CHOSEN COMPONENT/TIRE CARD */}
          {selectedTire && (
            <div className="space-y-3">
              <div className="p-4 bg-neutral-900/60 rounded-none border border-neutral-800 flex flex-col justify-between selection:bg-[#FFCC00]/20 select-none">
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-sm leading-none ${
                    selectedTire.marca.toUpperCase() === 'MIC' 
                      ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/5' 
                      : 'border-[#E2001A] text-[#E2001A] bg-[#E2001A]/5'
                  }`}>
                    {selectedTire.marca.toUpperCase() === 'MIC' ? 'MIC' : 'BFG'}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">CAI {selectedTire.cai}</span>
                </div>
                <h4 className="text-xs font-bold text-neutral-200 leading-relaxed font-sans">{selectedTire.descricao}</h4>
                <div className="mt-3 pt-2.5 border-t border-neutral-800 grid grid-cols-2 text-[10px] uppercase font-mono text-neutral-500">
                  <span>Segmento: <b className="text-neutral-300">{selectedTire.segmento}</b></span>
                  <span>Aro: <b className="text-neutral-300">{selectedTire.aro}</b></span>
                </div>
              </div>

              {promoCalculation && (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex flex-col gap-1 rounded-none animate-in fade-in duration-300">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1">
                    🏷️ PNEU EM PROMOÇÃO ATIVA
                  </span>
                  <p className="text-neutral-300 text-[11px] leading-snug">
                    Este item está ativo na Tabela Promocional com desconto extra de <b className="text-emerald-400">{promoCalculation.descontoPromocional}%</b> sobre o Preço Sugerido!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SIMULATION CONTROLS */}
          <div className="space-y-4">
            {/* Margem de lucro desired */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1.5 font-mono">
                Margem de Lucro Desejada
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={margemDesejada}
                  onChange={(e) => setMargemDesejada(Math.max(0, Math.min(99, parseFloat(e.target.value) || 0)))}
                  className="w-full bg-neutral-900 border border-neutral-800 text-foreground text-xs font-mono font-bold rounded-none py-2 px-3 focus:outline-none focus:border-[#FFCC00]"
                />
                <span className="absolute right-3 top-2 text-neutral-500 text-xs font-mono font-bold">%</span>
              </div>
            </div>

            {/* Choose Card Reader Profile */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1.5 font-mono">
                Administradora do Repasse
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-none py-2 px-3 text-neutral-300 focus:outline-none focus:border-[#FFCC00] font-mono font-medium"
              >
                {perfisMaquininha.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.isAtivo ? ' (Padrão Ativo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Installments form payment */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1.5 font-mono">
                Condições de Faturamento no Terminal
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-none py-2 px-3 text-neutral-300 focus:outline-none focus:border-[#FFCC00] font-mono font-bold"
              >
                <option value="debito">Cartão Débito ({getPercentLabel(activeProfile.taxas.debito)})</option>
                {Array.from({ length: 12 }).map((_, i) => {
                  const label = `${i + 1}x` as keyof typeof activeProfile.taxas;
                  return (
                    <option key={label} value={label}>
                      Cartão de Crédito {label} ({getPercentLabel(activeProfile.taxas[label] || 0)})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SWITCHES FOR DISCOUNTS */}
            <div className="space-y-2 pt-3 border-t border-neutral-800 font-mono">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block pb-1">Descontos Reconciliáveis</span>
              
              {/* Checkbox Canal */}
              <div className="flex items-center space-x-2.5 bg-neutral-900/10 p-2 rounded-none border border-neutral-900">
                <input
                  type="checkbox"
                  id="calc-opt-canal"
                  checked={aplicarCanal}
                  onChange={(e) => setAplicarCanal(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
                />
                <label htmlFor="calc-opt-canal" className="cursor-pointer text-[10px] uppercase font-bold text-neutral-300">
                  Canal (-{getPercentLabel(descontos.canal)})
                </label>
              </div>

              {/* Checkbox Agilis */}
              <div className={`flex items-center space-x-2.5 bg-neutral-900/10 p-2 rounded-none border border-neutral-900 relative overflow-hidden ${
                calculations.isAgilisEligible ? '' : 'opacity-40'
              }`}>
                <input
                  type="checkbox"
                  id="calc-opt-agilis"
                  checked={aplicarAgilis}
                  disabled={!calculations.isAgilisEligible}
                  onChange={(e) => setAplicarAgilis(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
                />
                <label htmlFor="calc-opt-agilis" className="cursor-pointer text-[10px] uppercase font-bold text-neutral-300 flex-1 flex justify-between items-center">
                  <span>Agilis (-{getPercentLabel(descontos.agilis)})</span>
                  {calculations.isAgilisEligible ? (
                    <span className="text-[8px] text-emerald-400 border border-emerald-900/50 bg-emerald-950/20 px-1 py-0.2 rounded-sm font-bold">ELEGÍVEL</span>
                  ) : (
                    <span className="text-[8px] text-neutral-600 font-bold">Apenas BF Agilis</span>
                  )}
                </label>
              </div>

              {/* Checkbox Desconcentração */}
              <div className="flex items-center space-x-2.5 bg-neutral-900/10 p-2 rounded-none border border-neutral-900">
                <input
                  type="checkbox"
                  id="calc-opt-desconc"
                  checked={aplicarDesconcentracao}
                  onChange={(e) => setAplicarDesconcentracao(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
                />
                <label htmlFor="calc-opt-desconc" className="cursor-pointer text-[10px] uppercase font-bold text-neutral-300">
                  Desconcentração (-{getPercentLabel(descontos.desconcentracao)})
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* OUTPUT breakdowns slip - 7 COLS */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* VISUAL RECEIPT CARD */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-none shadow-md overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-0.5 bg-[#FFCC00]"></div>
            
            <div className="p-6 space-y-6">
              
              {/* Receipt Header details */}
              <div className="text-center pb-5 border-b border-dashed border-neutral-800">
                <span className="text-[10px] font-bold tracking-widest text-[#FFCC00] uppercase block font-mono">PAUTA DE COMERCIALIZAÇÃO OFICIAL</span>
                <h4 className="text-sm font-bold text-neutral-200 mt-1 uppercase truncate max-w-sm mx-auto font-sans">{currentTireInfo.descricao}</h4>
                <p className="text-[11px] font-mono text-neutral-300 mt-1 uppercase font-bold">Simulado no perfil: {activeProfile.nome}</p>
              </div>

              {/* Receipt Line Items */}
              <div className="space-y-3.5 text-xs font-mono">
                {/* PRECO SELL IN BASE */}
                <div className="flex justify-between items-center text-neutral-200">
                  <span className="uppercase text-[11px] font-bold text-neutral-300">Preço Sell In (base):</span>
                  <span className="font-bold text-sm text-neutral-200">{formatBRL(calculations.sellInBase)}</span>
                </div>

                {/* DESCONTOS APLICADOS */}
                <div className="flex justify-between items-start text-emerald-400">
                  <div className="flex flex-col">
                    <span className="uppercase text-[11px] font-bold text-red-400">(-) Descontos aplicados:</span>
                    {/* Compound list detail */}
                    <span className="text-[10px] text-neutral-300 font-sans mt-0.5 max-w-xs leading-normal uppercase font-semibold">
                      Composição: {aplicarCanal ? `Canal (${getPercentLabel(descontos.canal)}) ` : ''} 
                      {calculations.isAgilisEligible && aplicarAgilis ? `+ Agilis (${getPercentLabel(descontos.agilis)}) ` : ''}
                      {aplicarDesconcentracao ? `+ Desconc (${getPercentLabel(descontos.desconcentracao)})` : ''}
                      {(!aplicarCanal && !aplicarAgilis && !aplicarDesconcentracao) ? 'sem descontos ativos.' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">-{formatBRL(calculations.totalDescontoAbsoluto)}</span>
                    <span className="text-[10px] block text-neutral-300 font-mono font-bold">({calculations.percentualDescontoComposto.toFixed(2)}%)</span>
                  </div>
                </div>

                {/* PRECO COM DESCONTOS */}
                <div className="flex justify-between items-center text-neutral-100 border-t border-neutral-800 pt-2.5">
                  <span className="uppercase text-[11px] font-bold text-neutral-300">(=) Preço líquido faturado:</span>
                  <span className="font-bold text-sm text-foreground">{formatBRL(calculations.precoComDescontos)}</span>
                </div>

                {/* MARGEM DE LUCRO DESEJADA */}
                <div className="flex justify-between items-start text-sky-400">
                  <div className="flex flex-col">
                    <span className="uppercase text-[11px] font-bold text-sky-300">(+) Margem de lucro:</span>
                    <span className="text-[10px] text-neutral-300 font-sans mt-0.5 uppercase font-semibold">Acréscimo de {margemDesejada}% sobre custo</span>
                  </div>
                  <div className="text-right font-bold text-sky-400">
                    <span>+{formatBRL(calculations.margemAdicionadaAbsoluta)}</span>
                    <span className="text-[10px] block font-mono text-neutral-300 mt-0.5 uppercase font-bold">Rentabilidade</span>
                  </div>
                </div>

                {/* PRECO SUGERIDO BASE */}
                <div className="flex justify-between items-center text-neutral-100 border-t border-neutral-800 pt-2.5">
                  <span className="uppercase text-[11px] font-bold text-[#FFCC00]">
                    {promoCalculation ? '(=) Preço Sugerido (Original):' : '(=) Preço Sugerido (Base):'}
                  </span>
                  <span className={`font-bold ${promoCalculation ? 'text-xs text-neutral-400 line-through font-medium leading-none decoration-red-500' : 'text-sm text-[#FFCC00]'}`}>
                    {formatBRL(calculations.precoComMargem)}
                  </span>
                </div>

                {promoCalculation && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="uppercase text-[11px] font-bold text-emerald-300">
                      (=) Preço Sugerido Promo (-{promoCalculation.descontoPromocional}%):
                    </span>
                    <span className="font-bold text-sm text-emerald-400">
                      {formatBRL(promoCalculation.promoPrecoComMargem)}
                    </span>
                  </div>
                )}

                {/* TAXA DE CARTÃO */}
                <div className="flex justify-between items-start text-[#FFCC00] border-t border-neutral-800/40 pt-2">
                  <div className="flex flex-col">
                    <span className="uppercase text-[11px] font-bold text-amber-500">
                      (+) Taxa faturamento ({formaPagamento.toUpperCase()}):
                    </span>
                    <span className="text-[10px] text-neutral-300 font-sans mt-0.5 uppercase font-semibold">Acréscimo de {getPercentLabel(calculations.taxaCobranca)} {promoCalculation ? 'sobre o valor promo' : ''}</span>
                  </div>
                  <div className="text-right font-bold text-amber-500">
                    {promoCalculation ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-neutral-400 line-through leading-none decoration-red-500/50">
                          +{formatBRL(calculations.taxaCartaoAbsoluta)}
                        </span>
                        <span className="text-xs text-amber-400 mt-0.5">
                          +{formatBRL(promoCalculation.promoTaxaCartaoAbsoluta)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span>+{formatBRL(calculations.taxaCartaoAbsoluta)}</span>
                        <span className="text-[10px] block font-mono text-neutral-300 mt-0.5 uppercase font-bold">Repasse Financeiro</span>
                      </>
                    )}
                  </div>
                </div>

                {/* FINAL PRECO AO CONSUMIDOR CLIENTE */}
                <div className={`p-4 border rounded-none flex flex-col gap-4 text-left mt-6 transition-all ${
                  promoCalculation 
                    ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                    : 'bg-neutral-900 border-neutral-800'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className={`text-xs md:text-sm font-black uppercase tracking-wider block font-mono ${
                        promoCalculation ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {promoCalculation ? '(=) PREÇO ESTIMADO DE VENDA PROMO' : '(=) PREÇO ESTIMADO DE VENDA'}
                      </span>
                      <span className="text-[11px] text-neutral-300 font-sans uppercase font-bold tracking-wide">
                        {promoCalculation ? 'Sugerido com desconto da Pauta Promocional' : 'Sugerido para fechamento em ES'}
                      </span>
                    </div>
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                      {promoCalculation ? (
                        <>
                          <span className="text-xs text-neutral-400 line-through leading-none font-medium mb-1">
                            {formatBRL(calculations.precoFinal)}
                          </span>
                          <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400 flex items-center gap-1 animate-pulse">
                            🏷️ {formatBRL(promoCalculation.promoPrecoFinal)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold font-mono tracking-tight text-[#FFCC00]">
                          {formatBRL(calculations.precoFinal)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ECONOMIA STRIP */}
                  {promoCalculation && (
                    <div className="border-t border-emerald-500/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-500/5 -mx-4 -mb-4 p-3.5">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-mono text-[10px] uppercase font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                        Oportunidade Comercial Excelente
                      </div>
                      <div className="text-xs font-mono font-bold text-white uppercase bg-emerald-600 px-2.5 py-1 flex items-center gap-1 rounded-sm shadow-md">
                        💰 Economia de {formatBRL(promoCalculation.totalMacroEconomia)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Visual bottom strip spacer */}
            <div className="h-0.5 bg-neutral-900 w-full"></div>
          </div>

          {/* Quick instructions slip */}
          <div className="bg-neutral-950/40 border border-neutral-800 rounded-none p-5 text-xs text-neutral-400 space-y-3 font-mono">
            <span className="font-bold text-neutral-300 block uppercase text-[10px] tracking-wider text-[#FFCC00]">Fórmula Comercial Oficial Michelin:</span>
            <div className="text-[11px] leading-relaxed">
              1. <b className="text-neutral-300">Preço com Desconto</b> é composto em cascata de acordo com as regras:
              <code className="text-[10px] font-mono text-neutral-300 block bg-neutral-950 border border-neutral-800 p-2 rounded-none mt-1.5 overflow-x-auto whitespace-pre-wrap break-all sm:break-normal">
                precoComDescontos = precoSellIn * (1 - Canal) * (1 - Agilis) * (1 - Desconcentracao)
              </code>
            </div>
            <div className="text-[11px] leading-relaxed">
              2. <b className="text-neutral-300">Preço com Margem</b> (Markup Comercial): Aplicado como acréscimo direto sobre o valor líquido com desconto:
              <code className="text-[10px] font-mono text-neutral-300 block bg-neutral-950 border border-neutral-800 p-2 rounded-none mt-1.5 overflow-x-auto whitespace-pre-wrap break-all sm:break-normal">
                precoComMargem = precoComDescontos * (1 + margem/100)
              </code>
            </div>
            <div className="text-[11px] leading-relaxed">
              3. <b className="text-neutral-300">Taxas do Terminal</b>: Acréscimo percentual correspondente ao parcelamento sobre o preço sugerido:
              <code className="text-[10px] font-mono text-neutral-300 block bg-neutral-950 border border-neutral-800 p-2 rounded-none mt-1.5 overflow-x-auto whitespace-pre-wrap break-all sm:break-normal">
                precoFinal = precoComMargem * (1 + taxaCartao)
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

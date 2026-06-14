import React, { useState, useMemo } from 'react';
import { Search, Percent, Eye, Fuel, ArrowUpDown, RefreshCw, Calculator, Tags, Activity, X } from 'lucide-react';
import { Produto, DescontosGlobais, PerfilMaquininha, ItemPromocional } from '../types';

interface ProductTableProps {
  produtos: Produto[];
  descontos: DescontosGlobais;
  perfilMaquininhaAtivo: PerfilMaquininha;
  itensPromocionais?: ItemPromocional[];
  onOpenCalculator: (produto: Produto) => void;
  onCheckEquivalence: (produto: Produto) => void;
}

export default function ProductTable({
  produtos,
  descontos,
  perfilMaquininhaAtivo,
  itensPromocionais = [],
  onOpenCalculator,
  onCheckEquivalence,
}: ProductTableProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarca, setSelectedMarca] = useState<'ALL' | 'MIC' | 'BFG'>('ALL');
  const [selectedAro, setSelectedAro] = useState<string>('ALL');
  const [selectedSegmento, setSelectedSegmento] = useState<string>('ALL');
  
  // Custom states for WhatsApp Details popup
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Produto | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState<string[]>([
    'debito', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x'
  ]);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(4);
  const [showCustomQty, setShowCustomQty] = useState<boolean>(false);
  const [customQtyValue, setCustomQtyValue] = useState<string>('4');

  const handleOpenDetailProduct = (produto: Produto) => {
    setSelectedDetailProduct(produto);
    setSelectedInstallments(['debito', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x']);
    setSelectedQuantity(4);
    setShowCustomQty(false);
    setCustomQtyValue('4');
    setCopied(false);
  };

  const generateWhatsAppText = (produto: Produto, pricing: any) => {
    const isPromo = pricing.isPromo;
    const brandName = produto.marca.toUpperCase() === 'MIC' ? 'MICHELIN' : 'BFGOODRICH';
    const qty = selectedQuantity;
    
    const baseSugeridoSingle = produto.precoSellOut;
    const pricingBaseSingle = isPromo ? baseSugeridoSingle * (1 - (pricing.descontoPromo / 100)) : baseSugeridoSingle;
    
    const baseSugeridoTotal = baseSugeridoSingle * qty;
    const pricingBaseTotal = pricingBaseSingle * qty;
    
    let promoText = '';
    if (isPromo) {
      promoText = `🚨 *PROMOÇÃO DESTE MÊS!*\nDe ~${formatBRL(pricing.originalFinal * qty)}~ por apenas *${formatBRL(pricing.precoFinal * qty)}* (Preço p/ ${qty} ${qty > 1 ? 'pneus' : 'pneu'} no plano ${simuladorPagamento.toUpperCase()})!\n\n`;
    }

    // Generate parcelas text
    let parcelasText = '';

    // Debit option
    const taxaDebito = perfilMaquininhaAtivo.taxas.debito || 0;
    const totalDebito = pricingBaseTotal * (1 + taxaDebito);
    if (selectedInstallments.includes('debito')) {
      parcelasText += `💵 *Débito / À Vista:* ${formatBRL(totalDebito)}\n`;
    }

    // Installments 1x to 12x
    for (let i = 1; i <= 12; i++) {
      if (selectedInstallments.includes(`${i}x`)) {
        const key = `${i}x` as keyof typeof perfilMaquininhaAtivo.taxas;
        const taxa = perfilMaquininhaAtivo.taxas[key] || 0;
        const totalParc = pricingBaseTotal * (1 + taxa);
        const valorParcela = totalParc / i;
        parcelasText += `💳 *${i}x:* de ${formatBRL(valorParcela)} (Total: ${formatBRL(totalParc)})\n`;
      }
    }

    if (!parcelasText) {
      parcelasText = `⚠️ Nenhuma opção selecionada.\n`;
    }

    const qtyLabel = qty > 1 
      ? `*Quantidade:* ${qty} pneus\n*Preço Unitário Estimado:* ${formatBRL(pricing.precoFinal)}\n` 
      : `*Quantidade:* 1 pneu\n`;

    return `*AUTO ELITE — CENTRO AUTOMOTIVO* 🚗✨

Olá! Seguem os detalhes e opções de faturamento para o pneu solicitado:

*Pneu:* ${produto.descricao}
*Código CAI:* ${produto.cai}
*Marca:* ${brandName}
*Aro:* ${produto.aro}
${qtyLabel}
${promoText}*Opções de Faturamento Escolhidas (Total p/ ${qty} ${qty > 1 ? 'pneus' : 'pneu'}):*
${parcelasText}
Ficamos inteiramente à disposição para fechar seu pedido! 🤝`;
  };

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback if writing fails
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Erro ao copiar", e);
      }
      document.body.removeChild(textArea);
    }
  };
  
  // Bulk Quick Simulation parameters
  const [simuladorMargem, setSimuladorMargem] = useState<number>(15);
  const [simuladorPagamento, setSimuladorPagamento] = useState<keyof PerfilMaquininha['taxas']>('1x');
  const [aplicarDescontoCanal, setAplicarDescontoCanal] = useState(true);
  const [aplicarDescontoAgilis, setAplicarDescontoAgilis] = useState(true);
  const [aplicarDescontoDesconcentracao, setAplicarDescontoDesconcentracao] = useState(false);
  const [aplicarDescontoQualidade, setAplicarDescontoQualidade] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<keyof Produto | 'precoFinal'>('cai');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Aros and Segmentos available for selection (from currently loaded products)
  const availableAros = useMemo(() => {
    const list = Array.from(new Set(produtos.map(p => String(p.aro))))
      .filter(Boolean)
      .sort((a, b) => parseFloat(a) - parseFloat(b));
    return list;
  }, [produtos]);

  const availableSegmentos = useMemo(() => {
    return Array.from(new Set(produtos.map(p => String(p.segmento))))
      .filter(Boolean)
      .sort();
  }, [produtos]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSort = (field: keyof Produto | 'precoFinal') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get active promo pricing if matching
  const getProductPricing = (produto: Produto) => {
    const isPromo = (itensPromocionais || []).find(item => item.cai === produto.cai);
    const baseSugerido = produto.precoSellOut;
    const taxa = perfilMaquininhaAtivo.taxas[simuladorPagamento] || 0;
    
    if (isPromo) {
      const precoBasePromo = baseSugerido * (1 - (isPromo.descontoPromocional / 100));
      const precoFinalPromo = precoBasePromo * (1 + taxa);
      return {
        isPromo: true,
        descontoPromo: isPromo.descontoPromocional,
        precoBase: precoBasePromo,
        precoFinal: precoFinalPromo,
        originalBase: baseSugerido,
        originalFinal: baseSugerido * (1 + taxa)
      };
    }
    
    return {
      isPromo: false,
      descontoPromo: 0,
      precoBase: baseSugerido,
      precoFinal: baseSugerido * (1 + taxa),
      originalBase: baseSugerido,
      originalFinal: baseSugerido * (1 + taxa)
    };
  };

  // Preço Final Calculation Helper for Bulk rendering
  const calculateFinalPrice = (produto: Produto) => {
    return getProductPricing(produto).precoFinal;
  };

  // Filter and Sort implementation
  const processedProducts = useMemo(() => {
    let filtered = productsToFilter(produtos, searchTerm, selectedMarca, selectedAro, selectedSegmento);
    
    // Sort
    filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'precoFinal') {
        valA = calculateFinalPrice(a);
        valB = calculateFinalPrice(b);
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }

      // Handle string comparisons
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      // Numeric comparisons
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return filtered;
  }, [produtos, searchTerm, selectedMarca, selectedAro, selectedSegmento, sortBy, sortOrder, simuladorMargem, simuladorPagamento, aplicarDescontoCanal, aplicarDescontoAgilis, aplicarDescontoDesconcentracao, aplicarDescontoQualidade, descontos, perfilMaquininhaAtivo, itensPromocionais]);

  const promocoesNoFiltro = useMemo(() => {
    return processedProducts.filter(p => 
      (itensPromocionais || []).some(promo => promo.cai === p.cai)
    );
  }, [processedProducts, itensPromocionais]);

  // Helper filter logic separated for readability
  function productsToFilter(list: Produto[], search: string, marca: string, aro: string, segmento: string) {
    return list.filter(p => {
      // Search term
      const query = search.toLowerCase();
      const matchSearch = 
        (p.cai || '').toLowerCase().includes(query) ||
        (p.descricao || '').toLowerCase().includes(query) ||
        (p.escultura || '').toLowerCase().includes(query) ||
        (p.modelo || '').toLowerCase().includes(query);

      // Marca
      const matchMarca = marca === 'ALL' || p.marca.toUpperCase() === marca.toUpperCase();

      // Aro
      const matchAro = aro === 'ALL' || String(p.aro) === aro;

      // Segmento
      const matchSegmento = segmento === 'ALL' || p.segmento === segmento;

      return matchSearch && matchMarca && matchAro && matchSegmento;
    });
  }

  // Paginated chunk
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return processedProducts.slice(startIndex, endIndex);
  }, [processedProducts, currentPage]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getPercentString = (fraction: number) => {
    return `${(fraction * 100).toFixed(2)}%`;
  };

  if (produtos.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in pt-4">
        <div className="bg-neutral-950 border border-neutral-800 p-8 text-center rounded-sm max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 bg-neutral-900 border border-neutral-800 rounded-sm flex items-center justify-center mx-auto text-amber-500">
            <Activity size={24} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
              BANCO DE DADOS VAZIO
            </h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Não há nenhum pneu cadastrado no simulador de preços no momento. Você limpou o banco de dados do sistema para carregar suas próprias pautas comerciais.
            </p>
          </div>
          <p className="text-xs text-[#FFCC00] font-mono font-bold uppercase bg-[#FFCC00]/5 border border-[#FFCC00]/20 py-2 px-3 rounded-none inline-block">
            👉 Acesse o Painel Geral para importar suas planilhas de pneus Michelin ou de importados!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pt-2">
      {/* QUICK BULK PRECIFICATOR CONFIG PANEL */}
      <div className="bg-neutral-950 border border-neutral-800 p-5 shadow-sm relative overflow-hidden rounded-sm">
        {/* Dynamic header badge indicating active machine profile */}
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-[#FFCC00]"></div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Activity className="text-[#FFCC00]" size={14} />
              Simulador Rápido em Massa
            </h2>
            <div className="text-[10px] uppercase font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <span>Maquininha selecionada:</span>
              <span className="font-bold text-white bg-[#1E3A5F] border border-[#1E3A5F] px-2.5 py-1 rounded-sm shadow-sm uppercase tracking-wider">
                {perfilMaquininhaAtivo.nome}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Forma Pagamento Target */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono mb-1.5">
                Recebimento
              </label>
              <select
                value={simuladorPagamento}
                onChange={(e) => setSimuladorPagamento(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-800 text-foreground text-xs rounded-none py-1.5 px-2.5 focus:outline-none focus:border-[#FFCC00] font-mono font-bold"
              >
                <option value="debito">Débito ({getPercentString(perfilMaquininhaAtivo.taxas.debito)})</option>
                {Array.from({ length: 12 }).map((_, i) => {
                  const label = `${i + 1}x` as keyof typeof perfilMaquininhaAtivo.taxas;
                  return (
                    <option key={label} value={label}>
                      Cartão {label} ({getPercentString(perfilMaquininhaAtivo.taxas[label] || 0)})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Checkbox: Desconto Canal */}
            <div className="flex items-center space-x-3 bg-neutral-900/30 p-2.5 border border-neutral-800 md:col-span-1 rounded-sm">
              <input
                type="checkbox"
                id="bulk-desc-canal"
                checked={aplicarDescontoCanal}
                onChange={(e) => setAplicarDescontoCanal(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
              />
              <label htmlFor="bulk-desc-canal" className="cursor-pointer select-none">
                <span className="text-[11px] font-bold text-neutral-300 block font-sans uppercase">Desconto Canal</span>
                <span className="text-[10px] text-neutral-500 font-mono">-{getPercentString(descontos.canal)}</span>
              </label>
            </div>

            {/* Checkbox: Desconto Agilis BFG */}
            <div className="flex items-center space-x-3 bg-neutral-900/30 p-2.5 border border-neutral-800 md:col-span-1 rounded-sm">
              <input
                type="checkbox"
                id="bulk-desc-agilis"
                checked={aplicarDescontoAgilis}
                onChange={(e) => setAplicarDescontoAgilis(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
              />
              <label htmlFor="bulk-desc-agilis" className="cursor-pointer select-none">
                <span className="text-[11px] font-bold text-neutral-300 block font-sans uppercase">Desc. Agilis (BFG)</span>
                <span className="text-[10px] text-neutral-500 font-mono">-{getPercentString(descontos.agilis)}</span>
              </label>
            </div>

            {/* Checkbox: Desconto Desconcentração */}
            <div className="flex items-center space-x-3 bg-neutral-900/30 p-2.5 border border-neutral-800 md:col-span-1 rounded-sm">
              <input
                type="checkbox"
                id="bulk-desc-desconc"
                checked={aplicarDescontoDesconcentracao}
                onChange={(e) => setAplicarDescontoDesconcentracao(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
              />
              <label htmlFor="bulk-desc-desconc" className="cursor-pointer select-none">
                <span className="text-[11px] font-bold text-neutral-300 block font-sans uppercase">Desconcentração</span>
                <span className="text-[10px] text-neutral-500 font-mono">-{getPercentString(descontos.desconcentracao)}</span>
              </label>
            </div>

            {/* Checkbox: Desconto Qualidade */}
            <div className="flex items-center space-x-3 bg-neutral-900/30 p-2.5 border border-neutral-800 md:col-span-1 rounded-sm">
              <input
                type="checkbox"
                id="bulk-desc-qualidade"
                checked={aplicarDescontoQualidade}
                onChange={(e) => setAplicarDescontoQualidade(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#FFCC00] bg-neutral-950 border-neutral-800 rounded-sm cursor-pointer"
              />
              <label htmlFor="bulk-desc-qualidade" className="cursor-pointer select-none">
                <span className="text-[11px] font-bold text-neutral-300 block font-sans uppercase">Desc. Qualidade</span>
                <span className="text-[10px] text-neutral-500 font-mono">-{getPercentString(descontos.qualidade)}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS & FILTERS GROUP */}
      <div className="bg-neutral-900 border border-neutral-800 p-4 shadow-sm space-y-4 rounded-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Quick Search field */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Filtro CAI, modelo ou escultura..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-none pl-9 pr-4 py-2 text-xs text-foreground placeholder-neutral-500 focus:outline-none focus:border-[#FFCC00] font-mono font-medium"
            />
          </div>

          {/* Filter: Marca */}
          <div>
            <select
              value={selectedMarca}
              onChange={(e) => {
                setSelectedMarca(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-none px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-[#FFCC00] font-mono font-medium"
            >
              <option value="ALL">Todas as Marcas ({produtos.length})</option>
              <option value="MIC">MICHELIN</option>
              <option value="BFG">BFGOODRICH</option>
            </select>
          </div>

          {/* Filter: Aro */}
          <div>
            <select
              value={selectedAro}
              onChange={(e) => {
                setSelectedAro(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-none px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-[#FFCC00] font-mono font-medium"
            >
              <option value="ALL">Todos os Aros ({availableAros.length})</option>
              {availableAros.map(aro => (
                <option key={aro} value={aro}>Aro {aro}</option>
              ))}
            </select>
          </div>

          {/* Filter: Segmento */}
          <div>
            <select
              value={selectedSegmento}
              onChange={(e) => {
                setSelectedSegmento(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-none px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-[#FFCC00] font-mono font-medium"
            >
              <option value="ALL">Todos os Segmentos ({availableSegmentos.length})</option>
              {availableSegmentos.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected counters */}
        <div className="flex items-center justify-between text-[11px] font-mono uppercase text-neutral-500 border-t border-neutral-800 pt-3">
          <div>
            Filtrados: <span className="text-[#FFCC00] font-bold">{processedProducts.length}</span> / <span className="font-bold">{produtos.length}</span> ativos
          </div>
          {(searchTerm || selectedMarca !== 'ALL' || selectedAro !== 'ALL' || selectedSegmento !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMarca('ALL');
                setSelectedAro('ALL');
                setSelectedSegmento('ALL');
                setCurrentPage(1);
              }}
              className="text-[#FFCC00] hover:underline flex items-center gap-1 font-bold uppercase"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC PROMOTIONAL DETECT BANNER */}
      {searchTerm && promocoesNoFiltro.length > 0 && (
        <div className="bg-emerald-950/45 border border-emerald-500/70 p-4 font-sans text-emerald-400 rounded-none animate-in fade-in duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl mb-2">
          <div className="flex items-start gap-4">
            <span className="p-2 bg-emerald-500/10 rounded-full text-emerald-400 mt-0.5 md:mt-0 shrink-0">
              <Tags size={16} className="text-emerald-400 animate-pulse" />
            </span>
            <div className="space-y-1">
              <h4 className="font-mono text-xs font-bold tracking-widest text-emerald-300 uppercase">
                PNEU EM PROMOÇÃO DETECTADO!
              </h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                {promocoesNoFiltro.length === 1 
                  ? 'O pneu correspondente à sua busca está ativo na Tabela Promocional!' 
                  : `Identificamos ${promocoesNoFiltro.length} pneus deste filtro com ofertas ativas na Tabela Promocional!`
                } Verifique os preços com a etiqueta <span className="text-emerald-400 font-bold">🏷️ PROMO</span> e os valores já atualizados.
              </p>
            </div>
          </div>
          <div className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-bold whitespace-nowrap self-stretch md:self-auto flex items-center justify-center">
            🏷️ Oferta Ativa
          </div>
        </div>
      )}

       {/* CORE PRODUCT TABLE AND RENDERER */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-800 selection:bg-brand-highlight/20 select-none font-mono">
                <th onClick={() => handleSort('cai')} className="px-5 py-4 cursor-pointer hover:text-foreground transition-colors">
                  <div className="flex items-center gap-1">CAI <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('descricao')} className="px-5 py-4 cursor-pointer hover:text-foreground transition-colors">
                  <div className="flex items-center gap-1">Descrição <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('marca')} className="px-4 py-4 cursor-pointer hover:text-foreground transition-colors">
                  <div className="flex items-center gap-1">Marca <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('escultura')} className="px-4 py-4 cursor-pointer hover:text-foreground transition-colors">
                  <div className="flex items-center gap-1">Escultura <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('aro')} className="px-3 py-4 cursor-pointer hover:text-foreground transition-colors text-center">
                  <div className="flex items-center justify-center gap-1">Aro <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('precoSellIn')} className="px-4 py-4 cursor-pointer hover:text-foreground transition-colors text-right">
                  <div className="flex items-center justify-end gap-1">Sell In <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('precoSellOut')} className="px-4 py-4 cursor-pointer hover:text-foreground transition-colors text-right">
                  <div className="flex items-center justify-end gap-1">Sugerido <ArrowUpDown size={11} /></div>
                </th>
                <th onClick={() => handleSort('precoFinal')} className="px-5 py-4 cursor-pointer text-[#FFCC00] hover:text-foreground transition-colors text-right bg-neutral-900/55">
                  <div className="flex items-center justify-end gap-1">CLIENTE FINAL <ArrowUpDown size={11} /></div>
                </th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p, index) => {
                  const pricing = getProductPricing(p);
                  
                  return (
                    <tr
                      key={`${p.cai}-${index}`}
                      className={`border-b border-neutral-800 text-neutral-300 hover:text-foreground text-xs transition-colors group cursor-default ${
                        pricing.isPromo 
                          ? 'bg-emerald-950/5 hover:bg-emerald-950/10' 
                          : 'hover:bg-neutral-900/35'
                      }`}
                    >
                      {/* CAI */}
                      <td className="px-5 py-3.5 font-mono font-bold text-neutral-500 group-hover:text-[#A88A20]">
                        {p.cai}
                      </td>
                      
                      {/* Descricao */}
                      <td 
                        className="px-5 py-3.5 text-neutral-200 max-w-xs cursor-pointer hover:text-[#A88A20] transition-colors group/desc" 
                        title="Ver resumo de parcelas e copiar para WhatsApp"
                        onClick={() => handleOpenDetailProduct(p)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span className="font-bold truncate max-w-[200px] sm:max-w-none flex items-center gap-1.5">
                            <Eye size={12} className="text-neutral-500 group-hover/desc:text-[#A88A20] shrink-0" />
                            {p.descricao}
                          </span>
                          {pricing.isPromo && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase rounded-sm whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Promo -{pricing.descontoPromo}%
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Marca */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-sm leading-none ${
                          p.marca.toUpperCase() === 'MIC' 
                            ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/5' 
                            : 'border-[#E2001A] text-[#E2001A] bg-[#E2001A]/5'
                        }`}>
                          {p.marca.toUpperCase() === 'MIC' ? 'MIC' : 'BFG'}
                        </span>
                      </td>
                      
                      {/* Escultura */}
                      <td className="px-4 py-3.5 text-neutral-400 font-mono text-[11px] truncate max-w-[120px]" title={p.escultura}>
                        {p.escultura || <span className="italic text-neutral-700">NA</span>}
                      </td>
                      
                      {/* Aro */}
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-neutral-300">
                        {p.aro}
                      </td>
                      
                      {/* Sell In pricing */}
                      <td className="px-4 py-3.5 text-right font-mono text-neutral-300">
                        {formatBRL(p.precoSellIn)}
                      </td>
                      
                      {/* Sell out Suggested */}
                      <td className="px-4 py-3.5 text-right font-mono text-neutral-500">
                        {pricing.isPromo ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] text-neutral-300 line-through decoration-red-500 font-medium leading-none">
                              {formatBRL(pricing.originalBase)}
                            </span>
                            <span className="text-emerald-400 font-bold text-xs leading-tight mt-0.5 whitespace-nowrap">
                              {formatBRL(pricing.precoBase)}
                            </span>
                          </div>
                        ) : (
                          formatBRL(pricing.precoBase)
                        )}
                      </td>

                      {/* CLIENTE FINAL ESTIMADO */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold bg-neutral-900/10 group-hover:bg-neutral-900/20 transition-colors">
                        {pricing.isPromo ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] text-neutral-300 line-through decoration-red-500 font-medium leading-none">
                              {formatBRL(pricing.originalFinal)}
                            </span>
                            <span className="text-emerald-400 font-bold text-xs sm:text-sm leading-tight mt-0.5 flex items-center gap-0.5 whitespace-nowrap">
                              🏷️ {formatBRL(pricing.precoFinal)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#FFCC00]">
                            {formatBRL(pricing.precoFinal)}
                          </span>
                        )}
                      </td>

                      {/* Action trigger button */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenCalculator(p)}
                            className="px-2 py-1 bg-neutral-900 hover:bg-[#FFCC00] text-neutral-400 hover:text-black hover:border-[#FFCC00] rounded-sm border border-neutral-800 text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Calculator size={11} />
                            Simular
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-neutral-600 font-mono text-xs uppercase">
                    Nenhum pneu encontrado com as restrições selecionadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION ROW SYSTEM */}
        {totalPages > 1 && (
          <div className="bg-neutral-950 border-t border-neutral-800 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
            <span className="text-[11px] text-neutral-500 font-mono uppercase">
              Págs: <span className="text-neutral-300 font-bold">{currentPage}</span> de <span className="text-neutral-300 font-bold">{totalPages}</span> — REGISTROS <span className="text-foreground font-bold">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, processedProducts.length)}</span> DE {processedProducts.length}
            </span>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                1ª
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Ant.
              </button>
              
              {/* Short responsive page list */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = idx + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + idx;
                else pageNum = currentPage - 2 + idx;
                
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-6 w-6 rounded-sm text-[10px] px-1 font-mono font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#FFCC00] text-black border border-[#FFCC00]'
                        : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 hover:text-foreground'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Próx.
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Fim
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY DETAILS POPUP / MODAL */}
      {selectedDetailProduct && (() => {
        const p = selectedDetailProduct;
        const pricing = getProductPricing(p);
        const isPromo = pricing.isPromo;
        const brandName = p.marca.toUpperCase() === 'MIC' ? 'MICHELIN' : 'BFGOODRICH';
        
        // Generate formatting and calculations
        const baseSugerido = p.precoSellOut;
        const pricingBaseSingle = isPromo ? baseSugerido * (1 - (pricing.descontoPromo / 100)) : baseSugerido;
        const pricingBase = pricingBaseSingle * selectedQuantity;
        const totalDebito = pricingBase * (1 + (perfilMaquininhaAtivo.taxas.debito || 0));

        // Generate full WhatsApp compiled text
        const waText = generateWhatsAppText(p, pricing);

        return (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[2000]">
            <div className="bg-neutral-900 border border-neutral-800 rounded-sm w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              {/* Highlight Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFCC00]"></div>

              {/* Modal Header */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Eye className="text-[#FFCC00]" size={14} />
                  Resumo de Detalhes do Item
                </span>
                <button
                  onClick={() => {
                    setSelectedDetailProduct(null);
                    setCopied(false);
                  }}
                  className="p-1 text-neutral-400 hover:text-foreground hover:bg-neutral-800/10 rounded-sm transition-all font-mono"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 space-y-4 overflow-y-auto font-sans flex-1">
                {/* Product Title and Brand badges */}
                <div className="flex justify-between items-start border-b border-neutral-800 pb-3 gap-3">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-foreground uppercase">{p.descricao}</h3>
                    <div className="font-mono text-[10px] text-neutral-400 mt-1 flex items-center gap-3">
                      <span>CAI: <b className="text-foreground">{p.cai}</b></span>
                      <span>Aro: <b className="text-foreground">{p.aro}</b></span>
                      <span>Segmento: <b className="text-foreground">{p.segmento}</b></span>
                    </div>
                  </div>
                  <span className={`inline-flex px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-sm leading-none shrink-0 ${
                    p.marca.toUpperCase() === 'MIC' 
                      ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/5' 
                      : 'border-[#E2001A] text-[#E2001A] bg-[#E2001A]/5'
                  }`}>
                    {p.marca.toUpperCase() === 'MIC' ? 'MIC' : 'BFG'}
                  </span>
                </div>

                {/* QUANTITY SELECTOR */}
                <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider">
                      Selecione a Quantidade de Pneus:
                    </span>
                    <span className="text-xs font-mono font-bold text-[#FFCC00]">
                      {selectedQuantity} {selectedQuantity > 1 ? 'Pneus' : 'Pneu'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 2, 4].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          setSelectedQuantity(qty);
                          setShowCustomQty(false);
                          setCustomQtyValue(String(qty));
                        }}
                        className={`px-3 py-1.5 rounded-sm font-mono text-xs font-bold transition-all cursor-pointer border ${
                          selectedQuantity === qty && !showCustomQty
                            ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-[0_2px_8px_rgba(255,204,0,0.2)]'
                            : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-foreground hover:border-neutral-700'
                        }`}
                      >
                        {qty} {qty > 1 ? 'Pneus' : 'Pneu'}
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomQty(true);
                        const num = parseInt(customQtyValue) || 1;
                        setSelectedQuantity(num);
                      }}
                      className={`px-3 py-1.5 rounded-sm font-mono text-xs font-bold transition-all cursor-pointer border ${
                        showCustomQty
                          ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-[0_2px_8px_rgba(255,204,0,0.2)]'
                          : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-foreground hover:border-neutral-700'
                      }`}
                    >
                      Mais...
                    </button>

                    {showCustomQty && (
                      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        <input
                          type="number"
                          min="1"
                          max="105"
                          value={customQtyValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomQtyValue(val);
                            const num = parseInt(val) || 0;
                            if (num > 0) {
                              setSelectedQuantity(num);
                            }
                          }}
                          className="w-16 bg-neutral-900 border border-neutral-800 rounded-sm px-2 py-1 text-xs text-foreground text-center font-mono focus:outline-none focus:border-[#FFCC00]"
                        />
                        <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase select-none">unid.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Promotional banner or Standard pricing info */}
                {isPromo ? (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/50 text-emerald-400 text-xs rounded-sm space-y-1">
                    <div className="flex items-center gap-1 font-mono font-bold uppercase text-emerald-300">
                      <span>🏷️ PROMOÇÃO DESTE MÊS</span>
                    </div>
                    <p className="text-neutral-300 leading-normal">
                      Este pneu está em promoção especial com desconto de <b>{pricing.descontoPromo}%</b>! Preços abaixo calculados para {selectedQuantity} {selectedQuantity > 1 ? 'pneus' : 'pneu'}.
                    </p>
                    <p className="text-emerald-400 font-bold font-mono">
                      De <span className="line-through text-neutral-400 font-medium">{formatBRL(pricing.originalFinal * selectedQuantity)}</span> por{' '}
                      <span className="text-emerald-300 font-extrabold text-sm">{formatBRL(pricing.precoFinal * selectedQuantity)}</span>{' '}
                      <span className="text-neutral-300 text-[10px] font-normal font-sans">({simuladorPagamento.toUpperCase()})</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-950 border border-neutral-800 text-xs rounded-sm flex items-center justify-between">
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] uppercase block">Preço de Tabela Estimado ({simuladorPagamento.toUpperCase()}):</span>
                      <span className="text-[10px] text-neutral-500 font-mono">Total para {selectedQuantity} {selectedQuantity > 1 ? 'pneus' : 'pneu'} ({formatBRL(pricing.precoFinal)} {selectedQuantity > 1 ? 'cada' : ''})</span>
                    </div>
                    <span className="text-lg font-bold text-[#FFCC00] font-mono">{formatBRL(pricing.precoFinal * selectedQuantity)}</span>
                  </div>
                )}

                {/* Installments Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider block">
                      Selecione as parcelas para incluir na proposta:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedInstallments(['debito', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x'])}
                        className="text-[9px] font-mono font-bold uppercase text-[#FFCC00] hover:underline cursor-pointer"
                      >
                        Marcar Tudo
                      </button>
                      <span className="text-neutral-700 text-[9px] select-none">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedInstallments([])}
                        className="text-[9px] font-mono font-bold uppercase text-neutral-500 hover:underline hover:text-neutral-300 cursor-pointer"
                      >
                        Limpar Tudo
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border border-neutral-800/60 p-2.5 bg-neutral-950/50 rounded-sm">
                    {/* Debit Option */}
                    <label className={`flex items-center justify-between p-2 rounded-sm border transition-all cursor-pointer select-none text-xs font-mono group/chk ${
                      selectedInstallments.includes('debito')
                        ? 'border-[#FFCC00]/50 bg-[#FFCC00]/5 text-[#FFCC00]'
                        : 'border-neutral-800/40 bg-neutral-900/40 text-neutral-500 hover:border-neutral-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedInstallments.includes('debito')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!selectedInstallments.includes('debito')) {
                                setSelectedInstallments([...selectedInstallments, 'debito']);
                              }
                            } else {
                              setSelectedInstallments(selectedInstallments.filter(item => item !== 'debito'));
                            }
                          }}
                          className="rounded-sm border-neutral-700 text-[#FFCC00] focus:ring-0 cursor-pointer bg-neutral-950 h-3.5 w-3.5 accent-[#FFCC00]"
                        />
                        <span className="font-bold">À Vista/Débito</span>
                      </div>
                      <span className={`font-bold ${selectedInstallments.includes('debito') ? 'text-foreground' : 'text-neutral-500'}`}>{formatBRL(totalDebito)}</span>
                    </label>

                    {/* Credit Installments 1x to 12x */}
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const parcs = idx + 1;
                      const key = `${parcs}x`;
                      const isSelected = selectedInstallments.includes(key);
                      
                      const keyTaxa = `${parcs}x` as keyof typeof perfilMaquininhaAtivo.taxas;
                      const taxa = perfilMaquininhaAtivo.taxas[keyTaxa] || 0;
                      const totalOption = pricingBase * (1 + taxa);
                      const valorParcela = totalOption / parcs;

                      return (
                        <label 
                          key={key} 
                          className={`flex items-center justify-between p-2 rounded-sm border transition-all cursor-pointer select-none text-xs font-mono group/chk ${
                            isSelected
                              ? 'border-[#FFCC00]/25 bg-neutral-900 text-neutral-200'
                              : 'border-neutral-800/40 bg-neutral-900/10 text-neutral-500 hover:border-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (!selectedInstallments.includes(key)) {
                                    setSelectedInstallments([...selectedInstallments, key]);
                                  }
                                } else {
                                  setSelectedInstallments(selectedInstallments.filter(item => item !== key));
                                }
                              }}
                              className="rounded-sm border-neutral-700 text-[#FFCC00] focus:ring-0 cursor-pointer bg-neutral-950 h-3.5 w-3.5 accent-[#FFCC00]"
                            />
                            <span>{parcs}x</span>
                          </div>
                          <span className={`font-bold ${isSelected ? 'text-foreground' : 'text-neutral-500'}`}>
                            {formatBRL(valorParcela)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer with Copy Button */}
              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-2">
                <button
                  onClick={() => handleCopy(waText)}
                  className={`w-full py-2.5 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    copied 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-[#FFCC00] text-black hover:bg-yellow-400'
                  }`}
                >
                  {copied ? (
                    '✓ COPIADO COM SUCESSO!'
                  ) : (
                    <>
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.864.001-2.641-1.025-5.125-2.89-6.991C16.58 1.884 14.102.859 11.465.859c-5.441 0-9.87 4.414-9.874 9.865-.001 1.745.462 3.447 1.341 4.957l-.98 3.57 3.666-.961zm11.517-5.592c-.3-.149-1.777-.878-2.05-.978-.272-.1-.471-.149-.669.149-.198.299-.767.978-.94 1.178-.173.199-.347.224-.648.075-.3-.149-1.268-.467-2.415-1.493-.892-.797-1.494-1.783-1.668-2.08-.173-.299-.018-.46.131-.609.135-.134.3-.349.449-.523.15-.174.198-.298.298-.497.1-.201.049-.373-.025-.523-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118s1.777-.728 2.025-1.43c.248-.702.248-1.304.173-1.43-.075-.125-.272-.199-.57-.349z"/>
                      </svg>
                      Copiar Dados para o WhatsApp
                    </>
                  )}
                </button>
                <div className="text-center font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                  Pronto para enviar por mensagem no seu chat
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

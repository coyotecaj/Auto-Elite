import React, { useState, useMemo } from 'react';
import { Produto, PerfilMaquininha, ItemPromocional } from '../types';
import { Search, Plus, Trash2, Tag, Percent, CreditCard } from 'lucide-react';

const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

interface PromoPanelProps {
  produtos: Produto[];
  itensPromocionais: ItemPromocional[];
  setItensPromocionais: React.Dispatch<React.SetStateAction<ItemPromocional[]>>;
  perfilMaquininhaAtivo: PerfilMaquininha;
}

export default function PromoPanel({
  produtos,
  itensPromocionais,
  setItensPromocionais,
  perfilMaquininhaAtivo
}: PromoPanelProps) {
  const [searchPromocional, setSearchPromocional] = useState('');
  const [promoPagamento, setPromoPagamento] = useState<keyof PerfilMaquininha['taxas']>('1x');

  const getPercentString = (fraction: number) => {
    return `${(fraction * 100).toFixed(2)}%`;
  };

  const availableProducts = useMemo(() => {
    if (searchPromocional.length < 2) return [];
    const query = searchPromocional.toLowerCase();
    return produtos.filter(p => 
      !itensPromocionais.some(item => item.cai === p.cai) &&
      (p.cai.toLowerCase().includes(query) || p.descricao.toLowerCase().includes(query))
    ).slice(0, 10);
  }, [produtos, searchPromocional, itensPromocionais]);

  const handleAddItem = (cai: string) => {
    setItensPromocionais(prev => [...prev, { cai, descontoPromocional: 15 }]);
    setSearchPromocional('');
  };

  const handleRemoveItem = (cai: string) => {
    setItensPromocionais(prev => prev.filter(item => item.cai !== cai));
  };

  const handleUpdateDesconto = (cai: string, value: number) => {
    setItensPromocionais(prev => prev.map(item => 
      item.cai === cai ? { ...item, descontoPromocional: value } : item
    ));
  };

  const calculatePromocionalPrice = (produto: Produto, descontoPromocional: number) => {
    const baseSugerido = produto.precoSellOut;
    return baseSugerido * (1 - (descontoPromocional / 100));
  };

  const calculateFinalPriceWithCard = (basePromoPrice: number) => {
    const taxa = perfilMaquininhaAtivo.taxas[promoPagamento] || 0;
    return basePromoPrice * (1 + taxa);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-sm p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-amber-700 dark:text-[#FFCC00] uppercase tracking-widest font-mono flex items-center gap-2">
              <Tag size={18} />
              Catálogo Promocional
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
              Selecione itens da lista de produtos e defina um desconto exclusivo que será aplicado sobre o preço sugerido do produto.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 font-mono shrink-0">
            <span className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500 font-bold">Terminal Promocional Vinculado:</span>
            <span className="text-xs font-bold text-white bg-[#1E3A5F] border border-[#1E3A5F] px-3.5 py-1.5 rounded-sm flex items-center gap-1.5 shadow-md uppercase tracking-wider">
              <CreditCard size={12} className="text-white" />
              {perfilMaquininhaAtivo.nome}
            </span>
          </div>
        </div>

        {/* Top filter and simulation parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-800/80">
          {/* Busca e Adição */}
          <div className="relative">
            <label className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold font-mono mb-1.5 block">
              Adicionar Produto à Promoção
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={14} />
              <input
                type="text"
                placeholder="Buscar por CAI ou Descrição..."
                value={searchPromocional}
                onChange={(e) => setSearchPromocional(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-sm focus:outline-none focus:border-[#FFCC00] font-mono placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors"
              />
            </div>

            {availableProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-sm max-h-64 overflow-y-auto">
                {availableProducts.map(p => (
                  <div 
                    key={p.cai} 
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 group"
                    onClick={() => handleAddItem(p.cai)}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-amber-700 dark:text-[#FFCC00]">{p.cai}</span>
                      <span className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-1">{p.descricao}</span>
                    </div>
                    <button className="flex items-center gap-1 text-[10px] uppercase font-mono bg-white dark:bg-neutral-950 px-2 py-1 border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-foreground group-hover:border-neutral-600 dark:group-hover:border-foreground transition-all rounded-sm">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment breakdown option for Promocional List */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold font-mono mb-1.5 block">
              Simular Recebimento na Promoção
            </label>
            <select
              value={promoPagamento}
              onChange={(e) => setPromoPagamento(e.target.value as any)}
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-2 px-3 focus:outline-none focus:border-[#FFCC00] font-mono font-bold"
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
        </div>

        {/* Table of Promocional Items */}
        {itensPromocionais.length === 0 ? (
          <div className="text-center py-16 bg-neutral-50 dark:bg-neutral-950/50 rounded-sm border border-dashed border-neutral-200 dark:border-neutral-800">
            <Tag className="mx-auto text-neutral-400 dark:text-neutral-700 mb-3" size={24} />
            <p className="text-neutral-600 dark:text-neutral-400 text-xs font-mono">Nenhum produto em promoção especial.</p>
            <p className="text-neutral-400 dark:text-neutral-600 text-[10px] mt-1">Busque e adicione produtos acima para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-250 dark:border-neutral-800 rounded-sm">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-250 dark:border-neutral-800">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono">CAI</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono">Descrição</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono text-center">Desconto Promo</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono text-right font-mono">Tabela Sug.</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold font-mono text-right font-mono">Preço Base Promo</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-amber-700 dark:text-[#FFCC00] font-bold font-mono text-right font-mono bg-amber-500/5 dark:bg-[#FFCC00]/5">Preço Cliente {promoPagamento.toUpperCase()}</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                {itensPromocionais.map((item) => {
                  const p = produtos.find(prod => prod.cai === item.cai);
                  if (!p) return null;

                  const promoPrice = calculatePromocionalPrice(p, item.descontoPromocional);
                  const promoPriceWithCard = calculateFinalPriceWithCard(promoPrice);

                  return (
                    <tr key={item.cai} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-neutral-600 dark:text-neutral-300 text-xs">
                        {p.cai}
                      </td>
                      <td className="px-4 py-3 font-bold text-neutral-700 dark:text-neutral-200 text-xs truncate max-w-[200px]" title={p.descricao}>
                        {p.descricao}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center relative">
                          <input
                            type="number"
                            min="0"
                            max="99"
                            step="0.5"
                            value={item.descontoPromocional}
                            onChange={(e) => handleUpdateDesconto(item.cai, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-foreground text-xs rounded-sm py-1 px-2 pr-5 focus:outline-none focus:border-[#FFCC00] font-mono font-bold text-right"
                          />
                          <span className="absolute right-2 text-xs text-neutral-400 dark:text-neutral-500 font-mono">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-400 dark:text-neutral-350 text-xs line-through decoration-red-500 font-medium">
                        {formatBRL(p.precoSellOut)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatBRL(promoPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 dark:text-[#FFCC00] text-sm bg-amber-500/5 dark:bg-[#FFCC00]/5">
                        {formatBRL(promoPriceWithCard)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.cai)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-sm transition-colors cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

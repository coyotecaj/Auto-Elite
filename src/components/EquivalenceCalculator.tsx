import React, { useState, useEffect } from 'react';
import { 
  DimensaoPneu, 
  ALL_LARGURAS, 
  SERIES_DISPONIVEIS, 
  AROS_DISPONIVEIS, 
  INDICES_PERFORMANCE_ORDENADOS, 
  calcularDiametro, 
  validarEquivalencia, 
  parsearDimensao,
  getValorPerformance
} from '../utils/equivalence';
import { Info, HelpCircle, AlertTriangle, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { Produto } from '../types';

interface EquivalenceCalculatorProps {
  produtos: Produto[];
  prefilledOriginal?: DimensaoPneu | null;
  onClearedPrefilled?: () => void;
}

const DEFAULT_ORIGINAL: DimensaoPneu = {
  largura: 225,
  serie: 50,
  aro: 16,
  indiceCarga: 92,
  indicePerf: 'H'
};

const DEFAULT_SUBSTITUTO: DimensaoPneu = {
  largura: 215,
  serie: 55,
  aro: 16,
  indiceCarga: 93,
  indicePerf: 'V'
};

export default function EquivalenceCalculator({ 
  produtos, 
  prefilledOriginal,
  onClearedPrefilled 
}: EquivalenceCalculatorProps) {
  
  // State for Original Tire
  const [original, setOriginal] = useState<DimensaoPneu>(DEFAULT_ORIGINAL);
  
  // State for Substitute Tire
  const [substituto, setSubstituto] = useState<DimensaoPneu>(DEFAULT_SUBSTITUTO);

  // Whether the technical calculation has been generated/triggered by the user
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);

  // Sync state if a prefilled tire is passed from product catalog
  useEffect(() => {
    if (prefilledOriginal) {
      setOriginal(prefilledOriginal);
      // Give the substitute some default values starting near the original to make it easy to use
      setSubstituto({
        ...prefilledOriginal,
        indiceCarga: prefilledOriginal.indiceCarga,
        indicePerf: prefilledOriginal.indicePerf
      });
      setHasCalculated(true);
    }
  }, [prefilledOriginal]);

  // Handle value changes helper
  const updateOriginal = (field: keyof DimensaoPneu, value: any) => {
    setOriginal(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-sanitize inches: if series is 0, make sure it is treated as inches format
      return updated;
    });
    setHasCalculated(false);
    // Trigger callback to clean prefilled if user starts editing original
    if (onClearedPrefilled) {
      onClearedPrefilled();
    }
  };

  const updateSubstituto = (field: keyof DimensaoPneu, value: any) => {
    setSubstituto(prev => ({ ...prev, [field]: value }));
    setHasCalculated(false);
  };

  // Perform calculations in real time
  const results = validarEquivalencia(original, substituto);
  const diaOrig = results.diametroOriginal;
  const diaSub = results.diametroSubstituto;
  
  const diffPercentSign = results.diferencaPercent >= 0 ? `+${results.diferencaPercent.toFixed(2)}%` : `${results.diferencaPercent.toFixed(2)}%`;
  const diffMmSign = results.diferencaMm >= 0 ? `+${results.diferencaMm.toFixed(1)} mm` : `${results.diferencaMm.toFixed(1)} mm`;

  // Search corresponding products state to let user easily select an original pneu from our loaded database
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const filteredProducts = produtos.filter(p => 
    p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cai.includes(searchTerm)
  ).slice(0, 10);

  const handleSelectProduct = (p: Produto) => {
    const parsed = parsearDimensao(p.descricao);
    if (parsed) {
      setOriginal(parsed);
      setSubstituto({
        ...parsed,
        indiceCarga: parsed.indiceCarga,
        indicePerf: parsed.indicePerf
      });
      setSearchTerm(`${p.cai} - ${p.descricao.substring(0, 30)}...`);
      setHasCalculated(true);
    } else {
      alert("Não foi possível extrair as dimensões deste pneu automaticamente. Por favor, ajuste os campos manualmente.");
    }
    setShowProductDropdown(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto selection:bg-[#FFCC00]/25">
      
      {/* HEADER SECTION METADATA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800 pb-5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2 uppercase tracking-wide">
            <RefreshCw className="text-[#FFCC00]" size={20} />
            Equivalência de Dimensões
          </h2>
          <p className="text-xs text-neutral-500 font-mono tracking-wider mt-1 uppercase">
            Verificação rápida seguindo normas do CONTRAN / DENATRAN
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 self-start text-[10px] text-neutral-400 font-mono uppercase tracking-wide">
          Tolerância Máxima: <span className="text-[#FFCC00] font-bold">±3.00%</span>
        </div>
      </div>

      {/* QUICK PRE-SELECTION SELECTOR FROM THE PRODUCT DIRECTORY */}
      <div className="bg-neutral-950 border border-neutral-900 p-4 relative animate-fade-in-down">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-[10px] uppercase tracking-widest text-[#FFCC00] font-mono font-bold">
            ⚡ Selecionar Pneu do Catálogo (Opcional)
          </label>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setOriginal(DEFAULT_ORIGINAL);
                setSubstituto(DEFAULT_SUBSTITUTO);
                setHasCalculated(false);
                if (onClearedPrefilled) onClearedPrefilled();
              }}
              className="text-[9px] text-neutral-500 hover:text-[#FFCC00] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Limpar seleção e busca"
            >
              <RefreshCw size={10} className="shrink-0" />
              Limpar Busca
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#FFCC00] text-xs font-mono text-foreground px-3 py-2 outline-none"
            placeholder="Digite o código CAI ou nome do pneu para preencher automaticamente..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowProductDropdown(true);
            }}
            onFocus={() => setShowProductDropdown(true)}
          />
          {showProductDropdown && searchTerm && (
            <div className="absolute top-full left-0 right-0 max-h-60 overflow-y-auto bg-neutral-950 border border-neutral-800 z-50 divide-y divide-neutral-800 shadow-2xl">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => (
                  <button
                    key={p.cai}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-900 text-neutral-300 hover:text-foreground transition-colors flex justify-between items-center"
                    onClick={() => handleSelectProduct(p)}
                  >
                    <span>[{p.marca}] <b className="text-foreground font-semibold font-mono">{p.cai}</b> - {p.descricao}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{p.segmento}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2.5 text-xs text-neutral-600 font-mono bg-neutral-950">
                  Nenhum produto correspondente encontrado no catálogo.
                </div>
              )}
            </div>
          )}
        </div>
        {prefilledOriginal && (
          <div className="mt-2.5 flex items-center justify-between bg-[#FFCC00]/10 border border-[#FFCC00]/20 px-3 py-1.5 text-xs text-neutral-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] animate-pulse"></span>
              Modo comparativo ativo: Preenchido automaticamente com dados do catálogo.
            </span>
            <button 
              onClick={() => {
                if (onClearedPrefilled) onClearedPrefilled();
                setOriginal(DEFAULT_ORIGINAL);
                setSearchTerm('');
              }}
              className="hover:underline text-[10px] uppercase font-bold text-[#FFCC00]"
            >
              [ Limpar Seleção ]
            </button>
          </div>
        )}
      </div>

      {/* SPREADSHEET-LIKE COMPARISON AND RESULTS PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: USER ENTRYS (SPAN 5) */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 p-6 space-y-5 rounded-none relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          
          <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFCC00] font-mono">
              [1] Dados de Entrada do Usuário
            </span>
            <span className="text-[9px] text-neutral-500 font-mono tracking-wide uppercase">Preencha apenas estes</span>
          </div>

          <p className="text-[10px] text-neutral-400 font-mono leading-relaxed bg-neutral-900 border border-neutral-800 p-2.5">
            Ajuste os valores amarelos abaixo para ver o resultado do cálculo de equivalência instantaneamente.
          </p>

          {/* SEÇÃO ORIGINAL */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="block text-[10px] uppercase font-bold text-neutral-400 font-mono tracking-widest">[A] Pneu Original</span>
              <button 
                type="button"
                onClick={() => {
                  setOriginal({ ...DEFAULT_ORIGINAL });
                  setSearchTerm('');
                  setHasCalculated(false);
                  if (onClearedPrefilled) onClearedPrefilled();
                }}
                className="text-[9px] text-neutral-500 hover:text-[#FFCC00] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Resetar entrada de pneu original para valores padrão"
              >
                <RefreshCw size={10} className="shrink-0 text-neutral-500 hover:text-[#FFCC00]" />
                Resetar pneu original
              </button>
            </div>
            
            {/* Linha Original: Largura / Série R Aro */}
            <div className="flex border border-neutral-800 rounded-none overflow-hidden h-10 select-none">
              <div 
                className="font-mono font-bold text-[10px] uppercase tracking-wider px-3 flex items-center shrink-0 w-32 border-r border-neutral-800"
                style={{ backgroundColor: '#0B1F3A', color: '#FFFFFF' }}
              >
                Original :
              </div>
              <div className="flex-grow flex items-center bg-[#FFCC00] text-black px-2 gap-1.5 font-bold font-mono text-xs">
                <select
                  value={original.largura}
                  onChange={(e) => updateOriginal('largura', parseInt(e.target.value, 10))}
                  className="flex-grow text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  {ALL_LARGURAS.map(val => (
                    <option key={val} value={val} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{val}</option>
                  ))}
                </select>
                <span className="text-black font-extrabold text-sm">/</span>
                <select
                  value={original.serie}
                  onChange={(e) => updateOriginal('serie', parseFloat(e.target.value))}
                  className="flex-grow text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  <option value={0} className="bg-neutral-900 text-neutral-300 font-mono text-xs">0 (Pol)</option>
                  {SERIES_DISPONIVEIS.map(val => (
                    <option key={val} value={val} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{val}</option>
                  ))}
                </select>
                <span className="text-black font-bold">R</span>
                <select
                  value={original.aro}
                  onChange={(e) => updateOriginal('aro', parseFloat(e.target.value))}
                  className="flex-grow text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  {AROS_DISPONIVEIS.map(val => (
                    <option key={val} value={val} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{val}"</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha Original: Índices */}
            <div className="flex border border-neutral-800 rounded-none overflow-hidden h-10 select-none">
              <div 
                className="font-mono font-bold text-[9px] uppercase tracking-wider px-3 flex items-center shrink-0 w-32 border-r border-neutral-800"
                style={{ backgroundColor: '#0B1F3A', color: '#FFFFFF' }}
              >
                Índ. Carga/Perf:
              </div>
              <div className="flex-grow flex items-center bg-[#FFCC00] text-black px-2 gap-1.5 font-bold font-mono text-xs">
                <input
                  type="number"
                  min={62}
                  max={117}
                  value={original.indiceCarga}
                  onChange={(e) => updateOriginal('indiceCarga', parseInt(e.target.value, 10) || 62)}
                  className="w-1/2 text-center bg-transparent border-none focus:bg-black/5 focus:outline-none py-1 font-mono text-xs font-bold"
                  title="Índice de Carga (62 a 117)"
                />
                <span className="text-black/50 font-bold">|</span>
                <select
                  value={original.indicePerf}
                  onChange={(e) => updateOriginal('indicePerf', e.target.value)}
                  className="w-1/2 text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  {INDICES_PERFORMANCE_ORDENADOS.map(rating => (
                    <option key={rating} value={rating} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{rating}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800/60 my-2"></div>

          {/* SEÇÃO SUBSTITUTO */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="block text-[10px] uppercase font-bold text-[#FFCC00] font-mono tracking-widest">[B] Pneu Substituto</span>
              <button 
                type="button"
                onClick={() => {
                  setSubstituto({ ...DEFAULT_SUBSTITUTO });
                  setHasCalculated(false);
                }}
                className="text-[9px] text-neutral-500 hover:text-[#FFCC00] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Resetar entrada de pneu substituto para valores padrão"
              >
                <RefreshCw size={10} className="shrink-0 text-neutral-500 hover:text-[#FFCC00]" />
                Resetar substituto
              </button>
            </div>
            
            {/* Linha Substituto: Largura / Série R Aro */}
            <div className="flex border border-neutral-800 rounded-none overflow-hidden h-10 select-none">
              <div 
                className="font-mono font-bold text-[10px] uppercase tracking-wider px-3 flex items-center shrink-0 w-32 border-r border-neutral-800"
                style={{ backgroundColor: '#1E3A5F', color: '#FFFFFF' }}
              >
                Substituição :
              </div>
              <div className="flex-grow flex items-center bg-[#FFCC00] text-black px-2 gap-1.5 font-bold font-mono text-xs">
                <select
                  value={substituto.largura}
                  onChange={(e) => updateSubstituto('largura', parseInt(e.target.value, 10))}
                  className="flex-grow text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  {ALL_LARGURAS.map(val => (
                    <option key={val} value={val} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{val}</option>
                  ))}
                </select>
                <span className="text-black font-extrabold text-sm">/</span>
                <select
                  value={substituto.serie}
                  onChange={(e) => updateSubstituto('serie', parseFloat(e.target.value))}
                  className="flex-grow text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  <option value={0} className="bg-neutral-900 text-neutral-300 font-mono text-xs">0 (Pol)</option>
                  {SERIES_DISPONIVEIS.map(val => (
                    <option key={val} value={val} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{val}</option>
                  ))}
                </select>
                <span className="text-black font-bold">R</span>
                <select
                  value={substituto.aro}
                  onChange={(e) => updateSubstituto('aro', parseFloat(e.target.value))}
                  className="flex-grow text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  {AROS_DISPONIVEIS.map(val => (
                    <option key={val} value={val} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{val}"</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha Substituto: Índices */}
            <div className="flex border border-neutral-800 rounded-none overflow-hidden h-10 select-none">
              <div 
                className="font-mono font-bold text-[9px] uppercase tracking-wider px-3 flex items-center shrink-0 w-32 border-r border-neutral-800"
                style={{ backgroundColor: '#1E3A5F', color: '#FFFFFF' }}
              >
                Índ. Carga/Perf:
              </div>
              <div className="flex-grow flex items-center bg-[#FFCC00] text-black px-2 gap-1.5 font-bold font-mono text-xs">
                <input
                  type="number"
                  min={62}
                  max={117}
                  value={substituto.indiceCarga}
                  onChange={(e) => updateSubstituto('indiceCarga', parseInt(e.target.value, 10) || 62)}
                  className="w-1/2 text-center bg-transparent border-none focus:bg-black/5 focus:outline-none py-1 font-mono text-xs font-bold"
                  title="Índice de Carga (62 a 117)"
                />
                <span className="text-black/50 font-bold">|</span>
                <select
                  value={substituto.indicePerf}
                  onChange={(e) => updateSubstituto('indicePerf', e.target.value)}
                  className="w-1/2 text-center bg-transparent border-none text-xs font-bold text-black focus:outline-none appearance-none cursor-pointer py-1 font-mono hover:bg-black/5"
                >
                  {INDICES_PERFORMANCE_ORDENADOS.map(rating => (
                    <option key={rating} value={rating} className="bg-neutral-900 text-neutral-300 font-mono text-xs">{rating}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setHasCalculated(true)}
              className="w-full bg-[#FFCC00] hover:bg-[#FFD700] text-black font-bold font-mono text-[10px] uppercase py-2.5 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:shadow-[0_0_12px_rgba(255,204,0,0.35)] rounded-sm"
              title="Cria o cálculo e a avaliação técnica de equivalência"
            >
              <Activity size={13} className="shrink-0" />
              Gerar Resultado
            </button>
            <button
              type="button"
              onClick={() => {
                setOriginal({ ...DEFAULT_ORIGINAL });
                setSubstituto({ ...DEFAULT_SUBSTITUTO });
                setHasCalculated(false);
                setSearchTerm('');
                if (onClearedPrefilled) onClearedPrefilled();
              }}
              className="w-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-[#FFCC00] font-bold font-mono text-[10px] uppercase py-2.5 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-all rounded-sm"
              title="Reseta as dimensões para o padrão inicial"
            >
              <RefreshCw size={13} className="shrink-0" />
              Resetar
            </button>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/80 p-3 text-center mt-3 rounded-sm">
            <span className="text-[9px] text-neutral-500 font-mono uppercase block">Instruções de Uso</span>
            <span className="text-[10px] text-neutral-400 mt-1 block leading-relaxed font-sans">
              Insira os pneus correspondentes acima e clique em <b className="text-[#FFCC00] font-mono text-[11px]">GERAR RESULTADO</b> para visualizar sua compatibilidade legal técnica.
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: CALCULATED OUTCOMES AND EQUIVALENCES (SPAN 7) */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 p-6 rounded-none relative min-h-[400px] flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFCC00]"></div>
          
          {hasCalculated ? (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  [2] Resultados Apresentados de Forma Automática
                </span>
                <span className="text-[9px] text-[#FFCC00] font-mono font-bold tracking-wider">CÁLCULO ATUALIZADO</span>
              </div>

              {/* TWO SIDE-BY-SIDE DIAMETER DISPLAY METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Original Outward Diameter Result */}
                <div className="bg-neutral-900 border border-neutral-800 p-3.5 text-center relative">
                  <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                    Ø Diâmetro Externo (Original)
                  </span>
                  <span className="block text-2xl font-bold font-mono text-foreground mt-1.5">
                    {diaOrig.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm
                  </span>
                  <span className="text-[9px] text-neutral-500 font-mono block mt-1 uppercase">
                    {original.serie === 0 ? 'Fórmula Polegadas (Off-Road)' : 'Fórmula Métrica Convencional'}
                  </span>
                </div>

                {/* Substituto Outward Diameter Result */}
                <div className="bg-neutral-900 border border-neutral-800 p-3.5 text-center relative">
                  <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                    Ø Diâmetro Externo (Substituto)
                  </span>
                  <span className={`block text-2xl font-bold font-mono mt-1.5 ${results.toleranciaOk ? 'text-[#FFCC00]' : 'text-red-500'}`}>
                    {diaSub.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono block mt-1 font-semibold">
                    Diferença: <span className={results.toleranciaOk ? 'text-emerald-400' : 'text-red-400'}>{diffMmSign} ({diffPercentSign})</span>
                  </span>
                </div>

              </div>

              {/* CRITERIAS CHECK SHEET */}
              <div className="space-y-3.5">
                <span className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">
                  Status de Requisitos Legais (DENATRAN / CONTRAN)
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  
                  {/* Check 1: Tolerância de Diâmetro */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono px-4 gap-2">
                    <div className="flex items-center gap-2.5 text-foreground">
                      <span className={`text-base font-bold ${results.toleranciaOk ? 'text-emerald-500' : 'text-red-500'}`}>
                        {results.toleranciaOk ? '✓' : '✗'}
                      </span>
                      <span className="font-bold">1. Tolerância de Diâmetro Externo (± 3.00%):</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-bold">{diffPercentSign}</span>
                      <span className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm tracking-wide text-white shadow-sm ${
                        results.toleranciaOk 
                          ? 'bg-emerald-600 border border-emerald-500' 
                          : 'bg-red-600 border border-red-500'
                      }`}>
                        {results.toleranciaOk ? 'Dentro do Limite' : 'Fora do Limite'}
                      </span>
                    </div>
                  </div>

                  {/* Check 2: Índice de Carga */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono px-4 gap-2">
                    <div className="flex items-center gap-2.5 text-foreground">
                      <span className={`text-base font-bold ${results.cargaOk ? 'text-emerald-500' : 'text-red-500'}`}>
                        {results.cargaOk ? '✓' : '✗'}
                      </span>
                      <span className="font-bold">2. Índice de Carga Mínimo Requerido (Subst ≥ Orig):</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-bold">{substituto.indiceCarga} vs {original.indiceCarga}</span>
                      <span className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm tracking-wide text-white shadow-sm ${
                        results.cargaOk 
                          ? 'bg-emerald-600 border border-emerald-500' 
                          : 'bg-red-600 border border-red-500'
                      }`}>
                        {results.cargaOk ? 'Compatível' : 'Incompatível'}
                      </span>
                    </div>
                  </div>

                  {/* Check 3: Índice de Velocidade (Performance) */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono px-4 gap-2">
                    <div className="flex items-center gap-2.5 text-foreground">
                      <span className={`text-base font-bold ${results.performanceOk ? 'text-emerald-500' : 'text-red-500'}`}>
                        {results.performanceOk ? '✓' : '✗'}
                      </span>
                      <span className="font-bold">3. Índice de Desempenho / Velocidade (Subst ≥ Orig):</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-bold">{substituto.indicePerf} vs {original.indicePerf}</span>
                      <span className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm tracking-wide text-white shadow-sm ${
                        results.performanceOk 
                          ? 'bg-emerald-600 border border-emerald-500' 
                          : 'bg-red-600 border border-red-500'
                      }`}>
                        {results.performanceOk ? 'Compatível' : 'Incompatível'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* FINAL HUGE RESULT DECISION BOX */}
              <div className={`p-5 border text-center relative ${
                results.possivel 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <span className="block text-[10px] tracking-widest font-mono uppercase text-neutral-400 font-bold">
                  Resultado Final da Avaliação Técnica
                </span>
                <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <span className="text-xs uppercase font-semibold text-foreground">CONVERSÃO ADMITIDA:</span>
                  <span className={`px-6 py-2.5 text-lg font-bold tracking-widest font-mono rounded-none uppercase border shadow-sm ${
                    results.possivel 
                      ? 'bg-emerald-600 border border-emerald-500 text-white' 
                      : 'bg-red-600 border border-red-500 text-white'
                  }`}>
                    {results.possivel ? '✅ SIM (PNEUS EQUIVALENTES)' : '❌ NÃO (NÃO ADMITIDO)'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-4 font-sans leading-relaxed">
                  De acordo com a resolução do CONTRAN, a variação admissível do diâmetro externo é de <b className="text-[#FFCC00] font-bold">+3% a -3%</b>. Os índices de carga e de performance (velocidade) também não podem ser inferiores ao especificado pelo original.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow py-24 text-center px-4 self-center space-y-5 select-none w-full max-w-md animate-fade-in">
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-500">
                <HelpCircle size={32} className="text-[#FFCC00]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#FFCC00] font-mono uppercase tracking-widest">
                  Aguardando Geração de Resultado
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Para analisar a equivalência legal e técnica das dimensões ajustadas, clique no botão <b className="text-[#FFCC00]">"GERAR RESULTADO"</b> localizado abaixo das configurações de entrada na Coluna [1].
                </p>
              </div>
              <div className="text-[10px] uppercase font-mono text-neutral-500 bg-neutral-900 border border-neutral-850 px-3 py-1.5 rounded-sm">
                Aguardando execução do cálculo
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

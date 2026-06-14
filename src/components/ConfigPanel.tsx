import React, { useState } from 'react';
import { Save, Plus, Trash2, Check, Percent, Settings2, HelpCircle, Edit2, Copy, ShieldAlert } from 'lucide-react';
import { DescontosGlobais, PerfilMaquininha, TaxasCartao } from '../types';
import ConfirmModal from './ConfirmModal';

interface ConfigPanelProps {
  descontos: DescontosGlobais;
  onUpdateDescontos: (descontos: DescontosGlobais) => void;
  perfisMaquininha: PerfilMaquininha[];
  onUpdatePerfis: (perfis: PerfilMaquininha[]) => void;
}

export default function ConfigPanel({
  descontos,
  onUpdateDescontos,
  perfisMaquininha,
  onUpdatePerfis,
}: ConfigPanelProps) {
  // Temporary editing state for global discounts, as fractions of 1 (e.g. 0.04)
  const [editDescontos, setEditDescontos] = useState<DescontosGlobais>({ ...descontos });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile management states
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    perfisMaquininha.find((p) => p.isAtivo)?.id || perfisMaquininha[0]?.id || ''
  );
  
  // New profile form state
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // States for custom modals to avoid iframe-blocked confirm/alerts
  const [profileIdToDelete, setProfileIdToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // Active editing profile state
  const activeProfile = perfisMaquininha.find((p) => p.id === selectedProfileId);

  const displayPercent = (val: number) => {
    return (val * 100).toFixed(2);
  };

  const handleDiscountChange = (field: keyof DescontosGlobais, valueStr: string) => {
    const numeric = parseFloat(valueStr.replace(',', '.'));
    if (!isNaN(numeric)) {
      setEditDescontos((prev) => ({
        ...prev,
        [field]: numeric / 100, // store as decimal fraction
      }));
    } else if (valueStr === '') {
      setEditDescontos((prev) => ({
        ...prev,
        [field]: 0,
      }));
    }
  };

  const saveDiscounts = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDescontos(editDescontos);
    showToast('Descontos globais atualizados e persistidos!');
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Tax rate change handler inside selected profile
  const handleRateChange = (rateKey: keyof TaxasCartao, valueStr: string) => {
    if (!activeProfile) return;
    
    // Convert string comma decimal to floating point
    const numericVal = parseFloat(valueStr.replace(',', '.'));
    const decimalFraction = !isNaN(numericVal) ? numericVal / 100 : 0;

    const updatedPerfis = perfisMaquininha.map((profile) => {
      if (profile.id === selectedProfileId) {
        return {
          ...profile,
          taxas: {
            ...profile.taxas,
            [rateKey]: decimalFraction,
          },
        };
      }
      return profile;
    });

    onUpdatePerfis(updatedPerfis);
  };

  // Toggle standard activation for a profile
  const handleActivateProfile = (id: string) => {
    const isCurrentlyActive = perfisMaquininha.find(p => p.id === id)?.isAtivo;
    const updated = perfisMaquininha.map((p) => ({
      ...p,
      isAtivo: p.id === id ? !isCurrentlyActive : false,
    }));
    onUpdatePerfis(updated);
    setSelectedProfileId(id);
    if (!isCurrentlyActive) {
      showToast(`O perfil de taxas "${perfisMaquininha.find(x => x.id === id)?.nome}" foi ativado como Tabela Padrão!`);
    } else {
      showToast(`O perfil de taxas "${perfisMaquininha.find(x => x.id === id)?.nome}" foi desativado como Tabela Padrão!`);
    }
  };

  // Toggle promotional activation for a profile
  const handleActivateProfilePromocional = (id: string) => {
    const isCurrentlyActive = perfisMaquininha.find(p => p.id === id)?.isAtivoPromocional;
    const updated = perfisMaquininha.map((p) => ({
      ...p,
      isAtivoPromocional: p.id === id ? !isCurrentlyActive : false,
    }));
    onUpdatePerfis(updated);
    setSelectedProfileId(id);
    if (!isCurrentlyActive) {
      showToast(`O perfil de taxas "${perfisMaquininha.find(x => x.id === id)?.nome}" foi vinculado à Tabela Promocional!`);
    } else {
      showToast(`O perfil de taxas "${perfisMaquininha.find(x => x.id === id)?.nome}" foi desvinculado da Tabela Promocional!`);
    }
  };

  // Duplicate current rates into a new profile
  const handleAddNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    // Use current active profile or standard default as baseline rates
    const templateRates = activeProfile?.taxas || {
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
    };

    const newProfile: PerfilMaquininha = {
      id: `custom-${IntegerRandom()}`,
      nome: newProfileName,
      isAtivo: perfisMaquininha.length === 0,
      taxas: { ...templateRates },
    };

    const updated = [...perfisMaquininha, newProfile];
    onUpdatePerfis(updated);
    setSelectedProfileId(newProfile.id);
    setNewProfileName('');
    setShowAddProfileModal(false);
    showToast(`Perfil "${newProfile.nome}" criado com sucesso!`);
  };

  function IntegerRandom() {
    return Math.floor(Math.random() * 1000000);
  }

  // Delete profile trigger
  const handleDeleteProfile = (id: string) => {
    if (perfisMaquininha.length <= 1) {
      setAlertMessage("É necessário manter pelo menos 1 perfil de taxas no sistema.");
      return;
    }
    setProfileIdToDelete(id);
  };

  const executeDeleteProfile = () => {
    if (!profileIdToDelete) return;
    const itemToDelete = perfisMaquininha.find((p) => p.id === profileIdToDelete);
    if (!itemToDelete) return;

    const remaining = perfisMaquininha.filter((p) => p.id !== profileIdToDelete);
    
    // If deleted profile was active, set the first remaining profile as active
    if (itemToDelete.isAtivo) {
      remaining[0].isAtivo = true;
    }
    
    onUpdatePerfis(remaining);
    setSelectedProfileId(remaining[0].id);
    showToast(`Perfil "${itemToDelete.nome}" removido do sistema.`);
    setProfileIdToDelete(null);
  };

  const handleRenameProfile = (newName: string) => {
    if (!newName.trim() || !activeProfile) return;
    
    const updated = perfisMaquininha.map((p) => {
      if (p.id === selectedProfileId) {
        return { ...p, nome: newName };
      }
      return p;
    });
    onUpdatePerfis(updated);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold uppercase text-foreground font-sans">Taxas & Descontos</h1>
          <p className="text-neutral-500 text-xs mt-1 uppercase tracking-wider font-mono">
            Gerenciamento de tabelas de repasse, condições de terminais POS e abatimentos de pauta Michelin.
          </p>
        </div>
        
        {/* Save confirmation toast */}
        {successMsg && (
          <div className="p-3 px-4 bg-emerald-600 border border-emerald-500 text-white font-bold text-[10px] uppercase font-mono rounded-none flex items-center gap-2 shadow-md">
            <Check size={14} className="text-white" />
            {successMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1: GLOBAL DISCOUNT EDITOR */}
        <div className="lg:col-span-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-none p-5 shadow-sm relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FFCC00]"></div>
          
          <h2 className="text-xs font-bold text-neutral-900 dark:text-foreground mb-2 flex items-center gap-2 uppercase font-mono">
            <Percent className="text-amber-700 dark:text-[#FFCC00]" size={14} />
            Descontos de Pauta
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-6 uppercase font-mono leading-relaxed">
            Parâmetros de deságio cadastrados. São reconciliados com a planilha Michelin e persistidos localmente.
          </p>

          <form onSubmit={saveDiscounts} className="space-y-4">
            
            {/* Desconto Canal */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-mono">
                <label className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Desconto Canal
                </label>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#3A3A3A] dark:text-[#3A3A3A]">
                  VAR: CANAL
                </span>
              </div>
              <div className="relative font-mono">
                <input
                  type="text"
                  value={displayPercent(editDescontos.canal)}
                  onChange={(e) => handleDiscountChange('canal', e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-2 px-3 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-bold"
                />
                <span className="absolute right-3 top-2 text-neutral-500 dark:text-neutral-400 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Desconto Qualidade */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-mono">
                <label className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Desconto Qualidade
                </label>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#3A3A3A] dark:text-[#3A3A3A]">
                  VAR: QUALIDADE
                </span>
              </div>
              <div className="relative font-mono">
                <input
                  type="text"
                  value={displayPercent(editDescontos.qualidade)}
                  onChange={(e) => handleDiscountChange('qualidade', e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-2 px-3 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-bold"
                />
                <span className="absolute right-3 top-2 text-neutral-500 dark:text-neutral-400 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Desconto Canal Agilis */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-mono">
                <label className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Desconto Canal Agilis
                </label>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#3A3A3A] dark:text-[#3A3A3A]">
                  VAR: AGILIS
                </span>
              </div>
              <div className="relative font-mono">
                <input
                  type="text"
                  value={displayPercent(editDescontos.agilis)}
                  onChange={(e) => handleDiscountChange('agilis', e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-2 px-3 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-bold"
                />
                <span className="absolute right-3 top-2 text-neutral-500 dark:text-neutral-400 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Desconto Qualidade Levorin */}
            <div className="opacity-90">
              <div className="flex justify-between items-center mb-1.5 font-mono">
                <label className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Desconto Qualidade Levorin
                </label>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#3A3A3A] dark:text-[#3A3A3A]">
                  VAR: LEVORIN
                </span>
              </div>
              <div className="relative font-mono">
                <input
                  type="text"
                  value={displayPercent(editDescontos.qualidadeLevorin)}
                  onChange={(e) => handleDiscountChange('qualidadeLevorin', e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-2 px-3 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-bold"
                />
                <span className="absolute right-3 top-2 text-neutral-500 dark:text-neutral-400 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Desconto Desconcentração */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-mono">
                <label className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Desconto Desconcentração
                </label>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#3A3A3A] dark:text-[#3A3A3A]">
                  VAR: DESCONC
                </span>
              </div>
              <div className="relative font-mono">
                <input
                  type="text"
                  value={displayPercent(editDescontos.desconcentracao)}
                  onChange={(e) => handleDiscountChange('desconcentracao', e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-2 px-3 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-bold"
                />
                <span className="absolute right-3 top-2 text-neutral-500 dark:text-neutral-400 text-xs font-bold">%</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1E3A5F] hover:bg-neutral-850 border border-[#1E3A5F] text-white hover:text-white py-2.5 px-4 rounded-none font-extrabold text-[10px] uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-md"
            >
              <Save size={14} />
              Gravar Descontos Globais
            </button>
          </form>
        </div>


        {/* COLUMN 2 & 3: PROFILE MANAGER & INSTALLMENT EDIT */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-none p-5 shadow-sm space-y-6 relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#E2001A]"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-4">
            <h2 className="text-xs font-bold text-neutral-900 dark:text-foreground flex items-center gap-2 uppercase font-mono">
              <Settings2 className="text-[#E2001A]" size={14} />
              Administração de Terminais POS
            </h2>
            
            {/* Choose or Create Profiles */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-350 dark:border-neutral-800 text-neutral-800 dark:text-neutral-300 text-xs rounded-none py-1.5 px-3 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-mono font-bold"
              >
                {perfisMaquininha.map((p) => {
                  const statusLabel: string[] = [];
                  if (p.isAtivo) statusLabel.push('PADRÃO');
                  if (p.isAtivoPromocional) statusLabel.push('PROMO');
                  const statusSuffix = statusLabel.length > 0 ? ` [${statusLabel.join(' + ')}]` : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nome}{statusSuffix}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={() => setShowAddProfileModal(true)}
                className="p-2 bg-neutral-50 dark:bg-neutral-900 hover:bg-[#1E3A5F] hover:text-white dark:hover:bg-[#FFCC00] dark:hover:text-black border border-neutral-300 dark:border-neutral-800 rounded-none text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
                title="Cadastrar Nova Maquininha"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {activeProfile && (
            <div className="space-y-6 animate-fade-in font-mono">
              {/* Profile details & Actions */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-none border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 w-full sm:max-w-md">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400 block">NOME IDENTIFICADOR COMERCIAL</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={activeProfile.nome}
                      onChange={(e) => handleRenameProfile(e.target.value)}
                      className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] text-neutral-900 dark:text-foreground text-xs font-bold rounded-none px-2.5 py-1.5 w-full uppercase focus:outline-none"
                      placeholder="Nome da Maquininha"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Tabela Padrão (Standard/Domestic) */}
                  {!activeProfile.isAtivo ? (
                    <button
                      onClick={() => handleActivateProfile(activeProfile.id)}
                      className="px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-[#1E3A5F] text-neutral-700 dark:text-neutral-400 hover:text-white dark:hover:text-black hover:bg-[#1E3A5F] dark:hover:bg-[#FFCC00] rounded-none text-[10px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer font-mono"
                    >
                      Usar Padrão
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivateProfile(activeProfile.id)}
                      className="px-3 py-2 border border-[#1E3A5F] bg-[#1E3A5F] text-white rounded-none text-[9px] uppercase tracking-widest font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all font-mono shadow-md"
                      title="Clique para desativar Padrão"
                    >
                      <Check size={11} className="stroke-[3]" /> Padrão Ativo
                    </button>
                  )}

                  {/* Tabela Promocional (Promo Table) */}
                  {!activeProfile.isAtivoPromocional ? (
                    <button
                      onClick={() => handleActivateProfilePromocional(activeProfile.id)}
                      className="px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-emerald-500 text-neutral-700 dark:text-neutral-400 hover:text-white hover:bg-emerald-500 rounded-none text-[10px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer font-mono"
                    >
                      Usar Promo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivateProfilePromocional(activeProfile.id)}
                      className="px-3 py-2 border border-emerald-500 bg-emerald-600 text-white rounded-none text-[9px] uppercase tracking-widest font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all font-mono shadow-md"
                      title="Clique para desativar Promo"
                    >
                      <Check size={11} className="stroke-[3]" /> Promo Ativo
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteProfile(activeProfile.id)}
                    className="p-2 border border-neutral-300 dark:border-neutral-800 hover:border-[#E2001A] rounded-none text-neutral-400 hover:bg-[#E2001A]/5 hover:text-[#E2001A] transition-all cursor-pointer"
                    title="Excluir Maquininha"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Installments rate list */}
              <div>
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-4">Taxas Detalhadas por Parcela</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Débito */}
                  <div className="flex flex-col bg-neutral-50 dark:bg-neutral-950 p-3 rounded-none border border-neutral-200 dark:border-neutral-900 shadow-sm">
                    <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-1">DEB. CARTÃO</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={displayPercent(activeProfile.taxas.debito)}
                        onChange={(e) => handleRateChange('debito', e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-350 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-1.5 px-2 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-mono font-bold"
                      />
                      <span className="absolute right-2 top-1.5 text-neutral-500 dark:text-neutral-400 font-bold text-[9px]">%</span>
                    </div>
                  </div>

                  {/* Parcels 1x through 12x */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const label = `${i + 1}x` as keyof TaxasCartao;
                    return (
                      <div key={label} className="flex flex-col bg-neutral-50 dark:bg-neutral-950 p-3 rounded-none border border-neutral-200 dark:border-neutral-900 shadow-sm">
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-1">PARC. {label}</span>
                        <div className="relative">
                          <input
                            type="text"
                            value={displayPercent(activeProfile.taxas[label] || 0)}
                            onChange={(e) => handleRateChange(label, e.target.value)}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-350 dark:border-neutral-800 text-neutral-900 dark:text-foreground text-xs rounded-none py-1.5 px-2 focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-mono font-bold"
                          />
                          <span className="absolute right-2 top-1.5 text-neutral-500 dark:text-neutral-400 font-bold text-[9px]">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explaining formula details */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/10 border border-neutral-200 dark:border-neutral-800 rounded-none flex items-start gap-3">
                <ShieldAlert className="text-neutral-600 dark:text-neutral-400 shrink-0 mt-0.5" size={14} />
                <div className="text-[10px] text-neutral-600 dark:text-neutral-400 space-y-1.5 uppercase font-mono leading-relaxed">
                  <span className="font-bold text-neutral-800 dark:text-neutral-300 block">Aplicação de Taxas Financeiras (Repasse Direto):</span>
                  <p>
                    A taxa do terminal de pagamento é tratada como repasse direto de acréscimo de custo: <span className="text-[#A88A20] font-bold bg-[#A88A20]/5 px-1 py-0.5 border border-[#A88A20]/15 rounded-sm">Preço_Consumidor = Preço_Líquido * (1 + Taxa_POS)</span>.
                  </p>
                  <p>
                    Isso resguarda o faturamento operacional aplicando as taxas das adquirentes no Espírito Santo sobre o preço sugerido do produto.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD NEW PROFILE */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-none p-6 w-full max-w-sm shadow-2xl relative font-mono">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-foreground uppercase tracking-wider mb-2">Cadastrar Novo Terminal</h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase leading-relaxed mb-6">
              O novo terminal POS importará as taxas atuais do terminal ativo como base de calibração.
            </p>

            <form onSubmit={handleAddNewProfile} className="space-y-4">
              <div>
                <label className="text-[9px] uppercase font-bold tracking-wider text-neutral-600 dark:text-neutral-300 block mb-1.5">
                  Identificador / Nome POS
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SAFRAPAY REDUZIDO, CIELO OFICIAL..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none py-2 px-3 text-xs text-neutral-900 dark:text-foreground focus:outline-none focus:border-[#1E3A5F] dark:focus:border-[#FFCC00] font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-205 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setNewProfileName('');
                    setShowAddProfileModal(false);
                  }}
                  className="px-3 py-1.5 border border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-foreground text-[10px] font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#1E3A5F] hover:bg-neutral-850 text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE DELEÇÃO DE PERFIL */}
      <ConfirmModal
        isOpen={profileIdToDelete !== null}
        onClose={() => setProfileIdToDelete(null)}
        onConfirm={executeDeleteProfile}
        title="Excluir Perfil de Taxas"
        message={`Deseja mesmo excluir o perfil de taxas "${perfisMaquininha.find(p => p.id === profileIdToDelete)?.nome}"? Todos os repasses e cobranças vinculados serão removidos do simulador e isso não pode ser desfeito.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* ALERT MODAL */}
      <ConfirmModal
        isOpen={alertMessage !== null}
        onClose={() => setAlertMessage(null)}
        onConfirm={() => setAlertMessage(null)}
        title="Operação não permitida"
        message={alertMessage || ''}
        confirmText="OK"
        cancelText=""
        variant="warning"
      />
    </div>
  );
}

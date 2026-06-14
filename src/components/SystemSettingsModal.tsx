import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, RefreshCcw, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logoDark: string | null;
  logoLight: string | null;
  onSaveLogoDark: (logo: string | null) => void;
  onSaveLogoLight: (logo: string | null) => void;
  onResetSystem: () => void;
  theme: 'dark' | 'light';
}

export default function SystemSettingsModal({
  isOpen,
  onClose,
  logoDark,
  logoLight,
  onSaveLogoDark,
  onSaveLogoLight,
  onResetSystem,
  theme
}: SystemSettingsModalProps) {
  const [isDragOverDark, setIsDragOverDark] = useState(false);
  const [isDragOverLight, setIsDragOverLight] = useState(false);
  const [errorDark, setErrorDark] = useState<string | null>(null);
  const [errorLight, setErrorLight] = useState<string | null>(null);

  const fileInputDarkRef = useRef<HTMLInputElement>(null);
  const fileInputLightRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File, isDark: boolean) => {
    const setError = isDark ? setErrorDark : setErrorLight;
    const saveLogo = isDark ? onSaveLogoDark : onSaveLogoLight;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('O arquivo deve ser uma imagem válida (PNG, JPG, SVG, WEBP).');
      return;
    }

    // Validate size (limit to 1.5MB for localStorage storage safety)
    if (file.size > 1.5 * 1024 * 1024) {
      setError('A imagem é muito pesada (máximo 1.5MB para melhor desempenho).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        saveLogo(base64);
      } else {
        setError('Erro ao converter imagem.');
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo.');
    };
    reader.readAsDataURL(file);
  };

  // Dark Logo events
  const handleDragOverDark = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDark(true);
  };

  const handleDragLeaveDark = () => {
    setIsDragOverDark(false);
  };

  const handleDropDark = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDark(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file, true);
    }
  };

  const handleFileChangeDark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file, true);
    }
  };

  // Light Logo events
  const handleDragOverLight = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLight(true);
  };

  const handleDragLeaveLight = () => {
    setIsDragOverLight(false);
  };

  const handleDropLight = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLight(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file, false);
    }
  };

  const handleFileChangeLight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file, false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto animate-fade-in flex items-center justify-center p-4">
      <div 
        className="bg-background border border-border rounded-lg max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        id="system-settings-modal"
      >
        {/* Header bar colored border */}
        <div className="h-1 bg-primary w-full"></div>

        {/* Modal Title and close button */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-primary/10 text-primary rounded-sm">
              <ImageIcon size={18} />
            </span>
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider font-sans">
                Configurações da Logomarca & Sistema
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                Gerencie a identidade visual e o banco de dados local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-card border border-border p-1.5 cursor-pointer rounded-sm transition-all"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Container Content */}
        <div className="p-6 space-y-8 overflow-y-auto flex-grow select-none">
          
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                🎨 Logomarca da Empresa
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Customize a marca exibida no cabeçalho. Para que sua identidade apareça com o contraste perfeito em todos os momentos, você deve carregar duas imagens separadas:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* DARK MODE LOGO */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  1. Logo para Versão Dark (Fundo Escuro)
                </span>
                
                {logoDark ? (
                  <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-sm flex flex-col items-center justify-center relative group min-h-[140px]">
                    <div className="p-2 border border-neutral-800 bg-neutral-900 rounded flex items-center justify-center max-w-[180px] h-[50px] overflow-hidden">
                      <img src={logoDark} alt="Logo Dark" className="max-h-10 object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSaveLogoDark(null)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive hover:text-white font-mono font-bold uppercase rounded-sm cursor-pointer transition-all duration-150"
                        title="Remover logotipo escuro"
                      >
                        <Trash2 size={11} />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOverDark}
                    onDragLeave={handleDragLeaveDark}
                    onDrop={handleDropDark}
                    onClick={() => fileInputDarkRef.current?.click()}
                    className={`border-2 border-dashed rounded-sm p-4 min-h-[140px] flex flex-col items-center justify-center cursor-pointer transition-all text-center ${
                      isDragOverDark 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-neutral-800 bg-neutral-950/40 text-muted-foreground hover:border-neutral-700 hover:text-foreground'
                    }`}
                  >
                    <Upload size={20} className="mb-2 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider block">
                      Arraste ou clique
                    </span>
                    <span className="text-[9px] text-muted-foreground block mt-1">
                      PNG, JPG ou SVG (Máx 1.5MB)
                    </span>
                    <input
                      ref={fileInputDarkRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChangeDark}
                      className="hidden"
                    />
                  </div>
                )}
                {errorDark && (
                  <div className="flex items-center gap-1.5 text-destructive text-[10px] font-mono leading-tight mt-1 bg-destructive/5 border border-destructive/20 p-2">
                    <AlertCircle size={11} className="shrink-0" />
                    <span>{errorDark}</span>
                  </div>
                )}
              </div>

              {/* LIGHT MODE LOGO */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">
                  2. Logo para Versão Light (Fundo Claro)
                </span>

                {logoLight ? (
                  <div className="border border-neutral-200 bg-white p-4 rounded-sm flex flex-col items-center justify-center relative group min-h-[140px]">
                    <div className="p-2 border border-neutral-200 bg-neutral-50 rounded flex items-center justify-center max-w-[180px] h-[50px] overflow-hidden">
                      <img src={logoLight} alt="Logo Light" className="max-h-10 object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSaveLogoLight(null)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive hover:text-white font-mono font-bold uppercase rounded-sm cursor-pointer transition-all duration-150"
                        title="Remover logotipo claro"
                      >
                        <Trash2 size={11} />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOverLight}
                    onDragLeave={handleDragLeaveLight}
                    onDrop={handleDropLight}
                    onClick={() => fileInputLightRef.current?.click()}
                    className={`border-2 border-dashed rounded-sm p-4 min-h-[140px] flex flex-col items-center justify-center cursor-pointer transition-all text-center ${
                      isDragOverLight 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-neutral-200 bg-neutral-100/40 text-muted-foreground hover:border-neutral-300 hover:text-foreground'
                    }`}
                  >
                    <Upload size={20} className="mb-2 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider block">
                      Arraste ou clique
                    </span>
                    <span className="text-[9px] text-muted-foreground block mt-1">
                      PNG, JPG ou SVG (Máx 1.5MB)
                    </span>
                    <input
                      ref={fileInputLightRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChangeLight}
                      className="hidden"
                    />
                  </div>
                )}
                {errorLight && (
                  <div className="flex items-center gap-1.5 text-destructive text-[10px] font-mono leading-tight mt-1 bg-destructive/5 border border-destructive/20 p-2">
                    <AlertCircle size={11} className="shrink-0" />
                    <span>{errorLight}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Preview indicators */}
            <div className="border border-border p-3 bg-card/40 rounded-sm">
              <span className="block text-[9px] uppercase font-bold text-muted-foreground font-mono tracking-widest mb-1.5">
                ⚡ Status da Identidade Visual Ativa:
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>Modo Escuro:</span>
                  {logoDark ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                      <Check size={12} /> Logotipo Ativo
                    </span>
                  ) : (
                    <span className="text-neutral-500 font-mono text-[10px]">Texto Fallback ("AUTOELITE")</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>Modo Claro:</span>
                  {logoLight ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                      <Check size={12} /> Logotipo Ativo
                    </span>
                  ) : (
                    <span className="text-neutral-500 font-mono text-[10px]">Texto Fallback ("AUTOELITE")</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Core system data wipe panel */}
          <div className="space-y-3 bg-destructive/5 border border-destructive/15 p-4 rounded-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
              ⚠️ Zona Crítica: Restaurar Banco de Dados
            </h4>
            <p className="text-xs text-muted-foreground">
              Limpa completamente os dados registrados localmente no sistema, incluindo pneus, histórico de importação, descontos modificados, perfis de maquinhas e pautas. Utilize esta opção se desejar carregar planilhas totalmente novas e limpas.
            </p>
            <button
              onClick={() => {
                onClose();
                onResetSystem();
              }}
              className="mt-2 block w-full sm:w-auto text-center px-4 py-2 bg-destructive hover:bg-destructive-hover text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm transition-colors duration-150 cursor-pointer shadow-sm"
            >
              Zerar Dados do Sistema
            </button>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border bg-card/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-border text-foreground hover:bg-card text-xs uppercase font-mono font-bold tracking-wider rounded-sm cursor-pointer transition-colors"
          >
            Fechar Ajustes
          </button>
        </div>
      </div>
    </div>
  );
}

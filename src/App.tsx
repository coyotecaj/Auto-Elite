import React, { useState, useEffect, useRef } from 'react';
import { MOCK_PRODUTOS, DEFAULT_DESCONTOS, DEFAULT_PERFIS } from './initialData';
import { Produto, DescontosGlobais, PerfilMaquininha } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductTable from './components/ProductTable';
import ConfigPanel from './components/ConfigPanel';
import PriceCalculator from './components/PriceCalculator';
import EquivalenceCalculator from './components/EquivalenceCalculator';
import PromoPanel from './components/PromoPanel';
import ConfirmModal from './components/ConfirmModal';
import SystemSettingsModal from './components/SystemSettingsModal';
import { DimensaoPneu, parsearDimensao } from './utils/equivalence';
import { ParseResult } from './utils/parser';
import { X, Calendar, AlertCircle, Cloud, ArrowUpRight, ShieldCheck, RefreshCw } from 'lucide-react';

// Firebase & Cloud Sync Orchestration
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import {
  syncProdutosToCloud,
  syncConfiguracoesToCloud,
  syncPerfisMaquininhaToCloud,
  syncItensPromocionaisToCloud,
  startLiveCloudSync,
  uploadLocalToCloud
} from './firebaseSync';


export default function App() {
  // Navigation active tab: dashboard, produtos, configuracoes, calculadora, equivalencia
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Theme settings (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('michelin_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('michelin_theme', theme);
  }, [theme]);

  // Nuvem e Sincronização States
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncOffer, setShowSyncOffer] = useState<boolean>(false);
  const syncUnsubsRef = useRef<(() => void)[]>([]);

  // Core global state variables (Initializing with fallback localStorage or safe defaults)
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    try {
      const stored = localStorage.getItem('michelin_produtos');
      return stored ? JSON.parse(stored) : MOCK_PRODUTOS;
    } catch {
      return MOCK_PRODUTOS;
    }
  });

  const [descontosGlobais, setDescontosGlobais] = useState<DescontosGlobais>(() => {
    try {
      const stored = localStorage.getItem('michelin_descontos_globais');
      return stored ? JSON.parse(stored) : DEFAULT_DESCONTOS;
    } catch {
      return DEFAULT_DESCONTOS;
    }
  });

  const [perfisMaquininha, setPerfisMaquininha] = useState<PerfilMaquininha[]>(() => {
    try {
      const stored = localStorage.getItem('michelin_perfis_maquininha');
      return stored ? JSON.parse(stored) : DEFAULT_PERFIS;
    } catch {
      return DEFAULT_PERFIS;
    }
  });

  const [ultimaImportacao, setUltimaImportacao] = useState<string | null>(() => {
    try {
      return localStorage.getItem('michelin_last_sync') || null;
    } catch {
      return null;
    }
  });

  // Modal active tire simulator trigger
  const [activeModalTire, setActiveModalTire] = useState<Produto | null>(null);

  // States for Equivalência dimensions prefilling
  const [prefilledOriginal, setPrefilledOriginal] = useState<DimensaoPneu | null>(null);

  // States for Reset confirmation modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Logo branding states & Settings Modal visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logoDark, setLogoDark] = useState<string | null>(() => {
    try {
      return localStorage.getItem('michelin_logo_dark') || null;
    } catch {
      return null;
    }
  });
  const [logoLight, setLogoLight] = useState<string | null>(() => {
    try {
      return localStorage.getItem('michelin_logo_light') || null;
    } catch {
      return null;
    }
  });

  const handleSaveLogoDark = (logo: string | null) => {
    setLogoDark(logo);
    if (logo) {
      localStorage.setItem('michelin_logo_dark', logo);
    } else {
      localStorage.removeItem('michelin_logo_dark');
    }
  };

  const handleSaveLogoLight = (logo: string | null) => {
    setLogoLight(logo);
    if (logo) {
      localStorage.setItem('michelin_logo_light', logo);
    } else {
      localStorage.removeItem('michelin_logo_light');
    }
  };

  // Promotional items state
  const [itensPromocionais, setItensPromocionais] = useState<{ cai: string; descontoPromocional: number }[]>(() => {
    try {
      const saved = localStorage.getItem('michelin_promo_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Observador de Autenticação Firebase & Inicializador da Sincronia Remota em Tempo Real
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setIsSyncing(true);
        // Exclui inscrições anteriores para evitar fugas de memória
        syncUnsubsRef.current.forEach(u => u());
        syncUnsubsRef.current = [];

        try {
          // Escuta coleções remotas do Firestore e reflete na interface em tempo real
          const unsubs = startLiveCloudSync(
            (remotProd) => {
              setProdutos(remotProd);
              localStorage.setItem('michelin_produtos', JSON.stringify(remotProd));
            },
            (remotDesc, removSync) => {
              setDescontosGlobais(remotDesc);
              setUltimaImportacao(removSync);
              localStorage.setItem('michelin_descontos_globais', JSON.stringify(remotDesc));
              if (removSync) localStorage.setItem('michelin_last_sync', removSync);
            },
            (remotPerf) => {
              setPerfisMaquininha(remotPerf);
              localStorage.setItem('michelin_perfis_maquininha', JSON.stringify(remotPerf));
            },
            (remotProm) => {
              setItensPromocionais(remotProm);
              localStorage.setItem('michelin_promo_items', JSON.stringify(remotProm));
            }
          );
          syncUnsubsRef.current = unsubs;

          // Se a nuvem estiver vazia e tivermos pneus locais cadastrados, oferecemos enviar backup na primeira sessão
          const snapshot = await getDocs(collection(db, 'produtos'));
          if (snapshot.empty) {
            const stored = localStorage.getItem('michelin_produtos');
            const localList = stored ? JSON.parse(stored) : [];
            if (localList && localList.length > 5) {
              setShowSyncOffer(true);
            }
          }
        } catch (err) {
          console.error("Erro sincronizando base na nuvem:", err);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Encerra listeners remotos se deslogar
        syncUnsubsRef.current.forEach(u => u());
        syncUnsubsRef.current = [];

        // Carrega do LocalStorage persistido locally como Sandbox fallback
        try {
          const storedP = localStorage.getItem('michelin_produtos');
          const storedD = localStorage.getItem('michelin_descontos_globais');
          const storedM = localStorage.getItem('michelin_perfis_maquininha');
          const storedS = localStorage.getItem('michelin_last_sync');
          const storedPr = localStorage.getItem('michelin_promo_items');

          if (storedP) setProdutos(JSON.parse(storedP));
          if (storedD) setDescontosGlobais(JSON.parse(storedD));
          if (storedM) setPerfisMaquininha(JSON.parse(storedM));
          if (storedS) setUltimaImportacao(storedS);
          if (storedPr) setItensPromocionais(JSON.parse(storedPr));
        } catch (e) {
          console.warn("Navegador sem suporte do LocalStorage, rodando mock temporário.");
        }
      }
    });

    return () => {
      unsubAuth();
      syncUnsubsRef.current.forEach(u => u());
    };
  }, []);

  // STATE VALUE PERSIST FUNCTIONS (MUTATES FIRESTORE IN THE CLOUD AND COMMITS TO LOCAL STORAGE)
  const handleUpdateProdutos = async (newProdutos: Produto[]) => {
    setProdutos(newProdutos);
    localStorage.setItem('michelin_produtos', JSON.stringify(newProdutos));
    if (auth.currentUser) {
      setIsSyncing(true);
      try {
        await syncProdutosToCloud(newProdutos);
      } catch (err) {
        console.error("Erro ao salvar pneus no Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleUpdateDescontos = async (newDescontos: DescontosGlobais) => {
    setDescontosGlobais(newDescontos);
    localStorage.setItem('michelin_descontos_globais', JSON.stringify(newDescontos));
    if (auth.currentUser) {
      setIsSyncing(true);
      try {
        await syncConfiguracoesToCloud(newDescontos, ultimaImportacao);
      } catch (err) {
        console.error("Erro ao salvar descontos no Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleUpdatePerfis = async (newPerfis: PerfilMaquininha[]) => {
    setPerfisMaquininha(newPerfis);
    localStorage.setItem('michelin_perfis_maquininha', JSON.stringify(newPerfis));
    if (auth.currentUser) {
      setIsSyncing(true);
      try {
        await syncPerfisMaquininhaToCloud(newPerfis);
      } catch (err) {
        console.error("Erro ao salvar taxas de cartao no Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleUpdateItensPromocionais = async (newPromos: { cai: string; descontoPromocional: number }[]) => {
    setItensPromocionais(newPromos);
    localStorage.setItem('michelin_promo_items', JSON.stringify(newPromos));
    if (auth.currentUser) {
      setIsSyncing(true);
      try {
        await syncItensPromocionaisToCloud(newPromos);
      } catch (err) {
        console.error("Erro ao salvar ofertas promocionais no Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // ENVIAR DADOS LOCAIS PARA NUVEM (PRIMEIRA SINCRONIZAÇÃO)
  const handleExecuteUploadLocalData = async () => {
    if (!auth.currentUser) return;
    setIsSyncing(true);
    setShowSyncOffer(false);
    try {
      await uploadLocalToCloud(
        produtos,
        descontosGlobais,
        perfisMaquininha,
        itensPromocionais,
        ultimaImportacao
      );
    } catch (err) {
      console.error("Erro no upload da base local:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // RECONCILIATION AND DIFF PARSE CALLBACK
  const handleImportComplete = async (importedProducts: Produto[], parserResult: ParseResult) => {
    handleUpdateProdutos(importedProducts);
    
    // Automatically update global discounts if extracted from spreadsheet header
    if (parserResult.descontosGlobais) {
      handleUpdateDescontos(parserResult.descontosGlobais);
    }

    const nowISO = new Date().toISOString();
    setUltimaImportacao(nowISO);
    localStorage.setItem('michelin_last_sync', nowISO);
    
    if (auth.currentUser) {
      setIsSyncing(true);
      try {
        await syncConfiguracoesToCloud(
          parserResult.descontosGlobais || descontosGlobais,
          nowISO
        );
      } catch (err) {
        console.error("Erro atualizando data e descontos de importacao:", err);
      } finally {
        setIsSyncing(false);
      }
    }
    
    // Route user directly to review tires in the database table
    setActiveTab('produtos');
  };

  // RESTORE DEMO DATA RESET FOR EVALUATION (CLEARS LOCAL STORAGE + FIRESTORE CLOUD DATASETS)
  const executeResetToMock = async () => {
    setProdutos([]);
    localStorage.setItem('michelin_produtos', JSON.stringify([]));
    
    setItensPromocionais([]);
    localStorage.setItem('michelin_promo_items', JSON.stringify([]));
    
    setDescontosGlobais(DEFAULT_DESCONTOS);
    localStorage.setItem('michelin_descontos_globais', JSON.stringify(DEFAULT_DESCONTOS));
    
    setPerfisMaquininha(DEFAULT_PERFIS);
    localStorage.setItem('michelin_perfis_maquininha', JSON.stringify(DEFAULT_PERFIS));
    
    setUltimaImportacao(null);
    localStorage.removeItem('michelin_last_sync');
    
    setPrefilledOriginal(null);

    if (auth.currentUser) {
      setIsSyncing(true);
      try {
        await syncProdutosToCloud([]);
        await syncConfiguracoesToCloud(DEFAULT_DESCONTOS, null);
        await syncPerfisMaquininhaToCloud(DEFAULT_PERFIS);
        await syncItensPromocionaisToCloud([]);
      } catch (err) {
        console.error("Erro limpando base cloud:", err);
      } finally {
        setIsSyncing(false);
      }
    }
    
    setActiveTab('dashboard');
  };

  const handleResetToMock = () => {
    setIsResetModalOpen(true);
  };


  // Active card machine profile helper
  const activeProfile = perfisMaquininha.find(p => p.isAtivo) || perfisMaquininha[0] || DEFAULT_PERFIS[0];

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground font-sans selection:bg-primary/20 antialiased overflow-x-hidden pb-10 transition-colors duration-300">
      
      {/* HEADER SECTION WITH NAVIGATION & TIME TRACKER */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lastImport={ultimaImportacao}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        logoDark={logoDark}
        logoLight={logoLight}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onLogin={async () => {
          setIsSyncing(true);
          try {
            await signInWithPopup(auth, googleProvider);
          } catch (e) {
            console.error("Erro no login:", e);
          } finally {
            setIsSyncing(false);
          }
        }}
        onLogout={async () => {
          setIsSyncing(true);
          try {
            await signOut(auth);
          } catch (e) {
            console.error("Erro no logout:", e);
          } finally {
            setIsSyncing(false);
          }
        }}
        isSyncing={isSyncing}
      />

      {/* CORE VIEWPORT CAROUSEL */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-[140px] md:mt-24">
        
        {/* BANNER DE MIGRAÇÃO / SINCRONIZAÇÃO INICIAL DE BANCO DE DADOS */}
        {showSyncOffer && user && (
          <div className="mb-6 bg-neutral-950/80 border border-primary/20 p-4 sm:p-5 rounded-sm alert-custom relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-primary/20 bg-primary/10 text-primary mt-0.5 rounded-sm">
                  <Cloud size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono tracking-widest uppercase text-primary">
                    Banco de Dados Cloud Sincronizado
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                    Identificamos que você possui pneus e configurações locais em seu navegador, mas seu novo banco de dados na nuvem está limpo. Deseja enviar estes dados para a Nuvem de forma que fiquem acessíveis em múltiplos dispositivos e celulares da sua equipe?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center font-mono">
                <button
                  onClick={handleExecuteUploadLocalData}
                  className="px-3.5 py-1.5 border border-primary bg-primary text-black hover:bg-primary-foreground font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 rounded-sm"
                >
                  <span>Enviar para Nuvem</span>
                  <ArrowUpRight size={12} />
                </button>
                <button
                  onClick={() => setShowSyncOffer(false)}
                  className="px-3 py-1.5 border border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-sm"
                >
                  Agora Não
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            produtos={produtos}
            ultimaImportacao={ultimaImportacao}
            onImportComplete={handleImportComplete}
            resetToMock={handleResetToMock}
          />
        )}

        {activeTab === 'produtos' && (
          <ProductTable
            produtos={produtos}
            descontos={descontosGlobais}
            perfilMaquininhaAtivo={activeProfile}
            itensPromocionais={itensPromocionais}
            onOpenCalculator={(p) => setActiveModalTire(p)}
            onCheckEquivalence={(p) => {
              const parsed = parsearDimensao(p.descricao);
              if (parsed) {
                setPrefilledOriginal(parsed);
              } else {
                setPrefilledOriginal(null);
              }
              setActiveTab('equivalencia');
            }}
          />
        )}

        {activeTab === 'equivalencia' && (
          <EquivalenceCalculator
            produtos={produtos}
            prefilledOriginal={prefilledOriginal}
            onClearedPrefilled={() => setPrefilledOriginal(null)}
          />
        )}

        {activeTab === 'configuracoes' && (
          <ConfigPanel
            descontos={descontosGlobais}
            onUpdateDescontos={handleUpdateDescontos}
            perfisMaquininha={perfisMaquininha}
            onUpdatePerfis={handleUpdatePerfis}
          />
        )}

        {activeTab === 'promocoes' && (
          <PromoPanel
            produtos={produtos}
            itensPromocionais={itensPromocionais}
            setItensPromocionais={handleUpdateItensPromocionais}
            perfilMaquininhaAtivo={perfisMaquininha.find(p => p.isAtivoPromocional) || perfisMaquininha.find(p => p.isAtivo) || perfisMaquininha[0]}
          />
        )}

        {activeTab === 'calculadora' && (
          <PriceCalculator
            produtos={produtos}
            descontos={descontosGlobais}
            perfisMaquininha={perfisMaquininha}
            itensPromocionais={itensPromocionais}
          />
        )}
      </main>

      {/* FOOTER STRIP */}
      <footer className="mt-20 border-t border-neutral-900 py-6 text-[10px] text-neutral-500 font-mono tracking-wider">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-[#FFCC00]"></span>
            <span className="uppercase">Espírito Santo Tire Pricing Engine • v1.10</span>
          </div>
          <div className="flex gap-4">
            <span className="uppercase text-neutral-600">Michelin Specialist ES Revendedora</span>
          </div>
        </div>
      </footer>

      {/* DETAILED SIMULATION OVERLAY MODAL PANEL */}
      {activeModalTire && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 overflow-y-auto animate-fade-in select-none">
          <div className="min-h-screen w-full flex items-start justify-center p-2 sm:p-4 md:p-6">
            <div className="bg-neutral-950 border border-neutral-800 rounded-none max-w-5xl w-full my-auto shadow-2xl relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FFCC00]"></div>
              {/* Top Close button */}
              <button
                onClick={() => setActiveModalTire(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-[#FFCC00] hover:bg-[#FFCC00] hover:text-black p-1.5 rounded-none transition-all z-50 cursor-pointer shadow-md"
                title="Fechar Simulador"
              >
                <X size={16} />
              </button>
              <div className="p-4 sm:p-6 md:p-8">
                <PriceCalculator
                  produto={activeModalTire}
                  produtos={produtos}
                  descontos={descontosGlobais}
                  perfisMaquininha={perfisMaquininha}
                  itensPromocionais={itensPromocionais}
                  onClose={() => setActiveModalTire(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG DE MEMÓRIA DE DEMONSTRAÇÃO */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={executeResetToMock}
        title="Zerar Dados do Sistema"
        message="Deseja realmente limpar todo o banco de dados? Todos os pneus cadastrados, pautas e itens promocionais serão completamente apagados para que você possa importar e configurar suas próprias informações do zero."
        confirmText="Sim, zerar tudo"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* PAINEL DE CONFIGURAÇÃO DE LOGOMARCA E ZONA CRÍTICA */}
      <SystemSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        logoDark={logoDark}
        logoLight={logoLight}
        onSaveLogoDark={handleSaveLogoDark}
        onSaveLogoLight={handleSaveLogoLight}
        onResetSystem={handleResetToMock}
        theme={theme}
      />
    </div>
  );
}

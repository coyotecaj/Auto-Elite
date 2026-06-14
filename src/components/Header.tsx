import React from 'react';
import { Sun, Moon, Settings, Cloud, CloudOff, RefreshCw, LogIn, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lastImport: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  logoDark?: string | null;
  logoLight?: string | null;
  onOpenSettings?: () => void;
  user: any | null;
  onLogin: () => void;
  onLogout: () => void;
  isSyncing: boolean;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme,
  logoDark,
  logoLight,
  onOpenSettings,
  user,
  onLogin,
  onLogout,
  isSyncing
}: HeaderProps) {
  const navItems = [
    { id: 'dashboard', label: 'Painel Geral' },
    { id: 'produtos', label: 'Lista de Pneus' },
    { id: 'equivalencia', label: 'Equivalência' },
    { id: 'configuracoes', label: 'Taxas & Descontos' },
    { id: 'promocoes', label: 'Tabela Promocional' },
    { id: 'calculadora', label: 'Simulador Avulso' },
  ];

  return (
    <header className="fixed w-full bg-background/95 backdrop-blur-md border-b border-border top-0 z-40 transition-all duration-300 animate-fade-in-down">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4 ml-0">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              {theme === 'dark' && logoDark ? (
                <div 
                  onClick={() => setActiveTab('dashboard')} 
                  className="flex items-center cursor-pointer max-h-14 h-14 overflow-hidden py-1"
                  title="Painel Geral"
                >
                  <img src={logoDark} alt="Brand Logo" className="max-h-12 object-contain" referrerPolicy="no-referrer" />
                </div>
              ) : theme === 'light' && logoLight ? (
                <div 
                  onClick={() => setActiveTab('dashboard')} 
                  className="flex items-center cursor-pointer max-h-14 h-14 overflow-hidden py-1"
                  title="Painel Geral"
                >
                  <img src={logoLight} alt="Brand Logo" className="max-h-12 object-contain" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div onClick={() => setActiveTab('dashboard')} className="flex flex-col cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-foreground font-sans flex items-center">
                      AUTO<span className="text-primary font-normal ml-1">ELITE</span>
                    </h1>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono leading-none mt-1">
                    Centro Automotivo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1" id="desktop-nav">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-all duration-200 rounded-none border-b-2 ${
                    isActive
                       ? 'text-primary border-primary bg-primary/10'
                       : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Cloud Sync Status & Sign-In Controls */}
          <div className="flex items-center gap-2 sm:gap-3 select-none">
            
            {/* Status de Sincronização */}
            <div className="hidden sm:flex items-center gap-2 border border-border bg-card/60 px-3 py-1.5 rounded-sm">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 text-xs text-yellow-500 font-mono">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Sincronizando...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-1.5 text-xs text-green-500 font-mono">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider">Multi-Dispositivo</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <CloudOff size={12} />
                  <span className="text-[10px] uppercase tracking-wider">Local Sandbox</span>
                </div>
              )}
            </div>

            {/* Login / Perfil do Usuário */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-border pr-1">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="w-6 h-6 rounded-full border border-primary/50 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary text-black font-semibold text-xs flex items-center justify-center uppercase">
                    {(user.displayName || user.email || 'U').charAt(0)}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-foreground max-w-[100px] truncate leading-tight">
                    {user.displayName || 'Operador'}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate leading-none">
                    Multi-Acesso
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 border border-border bg-destructive/10 hover:bg-destructive hover:text-white text-destructive transition-all duration-200 cursor-pointer rounded-sm"
                  title="Sair do Banco de Dados Nuvem"
                >
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-primary/50 bg-primary/10 hover:bg-primary hover:text-black text-primary font-bold text-[10px] tracking-wider uppercase transition-all duration-200 cursor-pointer rounded-sm"
                title="Fazer Login Google para Sincronizar"
              >
                <LogIn size={11} />
                <span>Nuvem</span>
              </button>
            )}

            {/* Settings Icon Button */}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 border border-border bg-card/50 hover:bg-card text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer flex items-center justify-center rounded-sm"
                title="Configurações de Identidade & Sistema"
                id="header-settings-btn"
              >
                <Settings size={14} />
              </button>
            )}

            {/* Theme Toggle Icon Button */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-border bg-card/50 hover:bg-card text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer flex items-center justify-center rounded-sm"
              title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun size={14} className="animate-spin-slow" /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation tab bar */}
      <div className="md:hidden border-t border-border bg-background overflow-x-auto">
        <div className="flex text-center min-w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-3 px-4 flex-1 flex flex-col items-center justify-center text-[9px] font-semibold tracking-widest uppercase transition-colors duration-200 rounded-none border-t-2 ${
                  isActive ? 'text-primary border-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                <span className="truncate max-w-[80px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

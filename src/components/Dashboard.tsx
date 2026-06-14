import React, { useState, useRef } from 'react';
import { Upload, FileDown, CheckCircle, AlertTriangle, HelpCircle, RefreshCcw, Info, ArrowUpRight, TrendingUp } from 'lucide-react';
import { parseXlsbFile, parseImportadosFile, ParseResult } from '../utils/parser';
import { Produto } from '../types';

interface DashboardProps {
  produtos: Produto[];
  ultimaImportacao: string | null;
  onImportComplete: (novosProdutos: Produto[], res: any) => void;
  resetToMock: () => void;
}

export default function Dashboard({ produtos, ultimaImportacao, onImportComplete, resetToMock }: DashboardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'michelin' | 'importados'>('michelin');
  const [importadosAlertas, setImportadosAlertas] = useState<string[]>([]);
  
  const [importSummary, setImportSummary] = useState<{
    adicionados: number;
    atualizados: number;
    removidos: number;
    total: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const countBrand = (brand: string) => {
    return produtos.filter(p => p.marca.toUpperCase() === brand.toUpperCase()).length;
  };

  const michelinCount = countBrand('MIC');
  const bfgCount = countBrand('BFG');

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Nunca importado';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setImportSummary(null);
    setImportadosAlertas([]);

    if (importMode === 'michelin') {
      if (!file.name.endsWith('.xlsb')) {
        setErrorMessage('Formato inválido. Por favor, envie uma planilha no formato binário oficial do Excel (.xlsb).');
        setIsLoading(false);
        return;
      }

      try {
        const result = await parseXlsbFile(file);
        if (result.success && result.produtos.length > 0) {
          const existingCais = new Set(produtos.map(p => p.cai));
          const importedCais = new Set(result.produtos.map(p => p.cai));

          let adicionados = 0;
          let atualizados = 0;
          let removidos = 0;

          result.produtos.forEach(imp => {
            if (existingCais.has(imp.cai)) {
              atualizados++;
            } else {
              adicionados++;
            }
          });

          produtos.forEach(p => {
            if (!importedCais.has(p.cai)) {
              removidos++;
            }
          });

          setImportSummary({
            adicionados,
            atualizados,
            removidos,
            total: result.produtos.length
          });

          onImportComplete(result.produtos, result);
        } else {
          setErrorMessage('Nenhum pneu válido pôde ser extraído da planilha. Verifique se o cabeçalho está na linha 16 e o conteúdo na linha 17.');
        }
      } catch (err: any) {
        console.error("Erro na importação:", err);
        setErrorMessage(err?.message || String(err));
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      // Importados mode
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xlsb') && !file.name.endsWith('.xls')) {
        setErrorMessage('Formato inválido para pneu importado. Por favor, envie uma planilha Excel no formato .xlsx ou .xlsb.');
        setIsLoading(false);
        return;
      }

      try {
        const result = await parseImportadosFile(file);
        if (result.success && result.produtos.length > 0) {
          const existingCais = new Set(produtos.map(p => p.cai));
          let adicionados = 0;
          let atualizados = 0;

          // Merge (Update or Insert) Logic for Importados
          const updatedList = [...produtos];
          result.produtos.forEach(imp => {
            const existingIdx = updatedList.findIndex(p => p.cai === imp.cai);
            if (existingIdx !== -1) {
              updatedList[existingIdx] = {
                ...updatedList[existingIdx],
                ...imp
              };
              atualizados++;
            } else {
              updatedList.push(imp);
              adicionados++;
            }
          });

          setImportSummary({
            adicionados,
            atualizados,
            removidos: 0,
            total: result.totalImportado
          });

          setImportadosAlertas(result.alertas || []);

          onImportComplete(updatedList, {
            produtos: updatedList,
            success: true,
            totalLinhasLidas: updatedList.length
          });
        } else {
          setErrorMessage('Nenhum pneu válido pôde ser extraído da planilha de importados. Verifique se a aba se chama "IMPORTADOS" e o cabeçalho está na linha 7.');
        }
      } catch (err: any) {
        console.error("Erro na importação de importados:", err);
        setErrorMessage(err?.message || String(err));
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Safe division to prevent NaNs
  const averagePrice = produtos.length > 0
    ? (produtos.reduce((acc, current) => acc + current.precoSellIn, 0) / produtos.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-sans">Painel Geral</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-1">Visão geral do estoque, auditoria comercial e sincronização de pauta.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetToMock}
            className="group flex items-center gap-1.5 px-3 py-2 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 hover:border-destructive text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm transition-all duration-150 cursor-pointer"
            title="Apaga todo o banco de dados e limpa o sistema para que você insira seus próprios arquivos."
          >
            <RefreshCcw size={13} className="text-destructive group-hover:text-white transition-colors duration-150" />
            Zerar Dados do Sistema
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800 p-5 relative overflow-hidden group hover:border-[#FFCC00]/40 transition-all duration-300 rounded-sm">
          <div className="absolute right-3 top-3 p-1.5 text-[#FFCC00]">
            <ArrowUpRight size={16} />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-2">Total de Cadastros</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-foreground font-mono">{produtos.length}</span>
            <span className="text-[10px] text-[#FFCC00] font-bold font-mono">PNEUS</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-[10px] text-neutral-500 font-mono uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            <span>Pronto para Cotação</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 p-5 relative overflow-hidden group hover:border-[#FFCC00]/40 transition-all duration-300 rounded-sm">
          <div className="absolute right-3 top-3 p-1.5 text-[#FFCC00]">
            <ArrowUpRight size={16} />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-2">Pneus MICHELIN</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#FFCC00] font-mono">{michelinCount}</span>
            <span className="text-xs text-neutral-500 font-bold font-mono">{produtos.length > 0 ? Math.round((michelinCount / produtos.length) * 100) : 0}%</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-[10px] text-neutral-500 font-mono uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
            <span>Canal Principal</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 p-5 relative overflow-hidden group hover:border-[#E2001A]/40 transition-all duration-300 rounded-sm">
          <div className="absolute right-3 top-3 p-1.5 text-[#E2001A]">
            <ArrowUpRight size={16} />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-2">Pneus BFGOODRICH</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#E2001A] font-mono">{bfgCount}</span>
            <span className="text-xs text-neutral-500 font-bold font-mono">{produtos.length > 0 ? Math.round((bfgCount / produtos.length) * 100) : 0}%</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-[10px] text-neutral-500 font-mono uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
            <span>Gama Mud & Offroad</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 p-5 relative overflow-hidden group hover:border-[#FFCC00]/40 transition-all duration-300 rounded-sm">
          <div className="absolute right-3 top-3 p-1.5 text-neutral-500">
            <TrendingUp size={16} />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-2">Preço Médio Sell-In</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-foreground font-mono truncate max-w-full">{averagePrice}</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-[10px] text-neutral-500 font-mono uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
            <span>Média Pauta Ativa</span>
          </div>
        </div>
      </div>

      {/* Main Core Area: Import & File Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Upload File Drag Drop Box */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm">
            {/* Import Mode Tabs */}
            <div className="flex border-b border-neutral-800 mb-6 gap-2">
              <button
                onClick={() => {
                  setImportMode('michelin');
                  setErrorMessage(null);
                  setImportSummary(null);
                  setImportadosAlertas([]);
                }}
                className={`pb-3 px-4 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  importMode === 'michelin'
                    ? 'border-[#FFCC00] text-[#FFCC00]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Planilha Michelin (.xlsb)
              </button>
              <button
                onClick={() => {
                  setImportMode('importados');
                  setErrorMessage(null);
                  setImportSummary(null);
                  setImportadosAlertas([]);
                }}
                className={`pb-3 px-4 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  importMode === 'importados'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Pneus Importados (.xlsx, .xlsb)
              </button>
            </div>

            <h3 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
              <Upload className={importMode === 'michelin' ? "text-[#FFCC00]" : "text-emerald-400"} size={16} />
              {importMode === 'michelin' ? 'Sincronizar Planilha Michelin (.xlsb)' : 'Sincronizar Pneus Importados (.xlsx / .xlsb)'}
            </h3>
            <p className="text-xs text-neutral-400 font-mono mb-6 uppercase">
              {importMode === 'michelin'
                ? 'RECONCILIAÇÃO DIRETA DE TABELA COMERCIAL - CANAL ESPÍRITO SANTO'
                : 'MÓDULO DE HIGIENIZAÇÃO E CARGA DE PNEUS IMPORTADOS'}
            </p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 rounded-sm ${
                isDragging
                  ? importMode === 'michelin'
                    ? 'border-[#FFCC00] bg-neutral-900/60 scale-[1.005]'
                    : 'border-emerald-500 bg-neutral-900/60 scale-[1.005]'
                  : 'border-neutral-800 bg-neutral-900/20 hover:border-neutral-700 hover:bg-neutral-900/40'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={importMode === 'michelin' ? '.xlsb' : '.xlsx,.xlsb,.xls'}
                className="hidden"
              />
              
              <div className={`p-3 bg-neutral-900 border border-neutral-800 rounded-sm mb-4 shadow-sm ${
                importMode === 'michelin' ? 'text-[#FFCC00]' : 'text-emerald-400'
              }`}>
                {isLoading ? (
                  <RefreshCcw className={`animate-spin ${importMode === 'michelin' ? 'text-[#FFCC00]' : 'text-emerald-400'}`} size={28} />
                ) : (
                  <FileDown className={importMode === 'michelin' ? 'text-[#FFCC00]' : 'text-emerald-400'} size={28} />
                )}
              </div>

              {isLoading ? (
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                    {importMode === 'michelin' ? 'Processando Arquivo Binário...' : 'Mapeando Pauta de Importados...'}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-2 max-w-sm mx-auto font-mono uppercase">
                    {importMode === 'michelin'
                      ? 'Mapeando fórmulas Oracle, faturamento de custo Sell In/Out e pauta de escala regional.'
                      : 'Executando higienização de CAI, partição de atributos de descrição, e salvaguarda das taxas do distribuidor.'}
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono">
                    Arraste a planilha <span className={importMode === 'michelin' ? 'text-[#FFCC00]' : 'text-emerald-400'}>
                      {importMode === 'michelin' ? '.xlsb' : '.xlsx / .xlsb'}
                    </span> ou clique para navegar
                  </h4>
                  <p className="text-[10px] text-neutral-500 mt-2 max-w-xs mx-auto font-mono uppercase leading-relaxed">
                    {importMode === 'michelin'
                      ? 'Aba: "TABELA2 (2)" • Cabeçalho na Linha 16 • Formato Binário Comercial Oficial (.XLSB)'
                      : 'Aba: "IMPORTADOS" • Cabeçalho na Linha 7 • Formato Excel Padrão (.XLSX / .XLSB)'}
                  </p>
                </div>
              )}
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mt-4 p-5 border border-red-900/55 bg-neutral-950 rounded-sm flex items-start gap-3">
                <AlertTriangle className="text-[#E2001A] shrink-0 mt-1" size={16} />
                <div className="text-xs font-mono text-red-400 w-full space-y-3">
                  <div>
                    <span className="font-bold text-[#E2001A] block text-[11px] uppercase mb-1">MÓDULO RECONCILIAÇÃO ERROR:</span>
                    <span className="text-neutral-200 block border-b border-red-950 pb-2.5 uppercase leading-relaxed text-[11px]">
                      {errorMessage}
                    </span>
                  </div>
                  
                  {/* Actionable Self-Help / Diagnostics Info panel */}
                  <div className="pt-2 normal-case font-sans text-neutral-400 space-y-2">
                    <span className="font-bold text-neutral-300 block uppercase font-mono text-[9px] tracking-wider text-[#FFCC00]">
                      DIAGNÓSTICO E SOLUÇÕES RECOMENDADAS:
                    </span>
                    {importMode === 'michelin' ? (
                      <ul className="list-disc pl-4 space-y-1.5 mt-1.5 text-[11px] text-neutral-400">
                        <li>
                          <b>Formato Correto:</b> Certifique-se de que salvou seu arquivo no formato <b>Binário do Excel (.xlsb)</b>. Para converter de XLSX para XLSB: no Excel, clique em "Salvar como" e altere o tipo de arquivo correspondente.
                        </li>
                        <li>
                          <b>Senha Comercial:</b> Algumas planilhas corporativas possuem proteção de senha para abertura. Remova a criptografia de senha de abertura no Excel antes de sincronizar.
                        </li>
                        <li>
                          <b>Disposição de Colunas:</b> A planilha deve conter as colunas de pauta em suas posições oficiais: CAI na coluna B (Col 1), Descrição na D (Col 3), Preço Tabela na T (Col 19), e custos de Sell-In faturado na AV (Col 47).
                        </li>
                      </ul>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1.5 mt-1.5 text-[11px] text-neutral-400">
                        <li>
                          <b>Aba Correta:</b> Certifique-se de que a planilha possui a aba nomeada exatamente como <b>IMPORTADOS</b>.
                        </li>
                        <li>
                          <b>Disposição de Linhas:</b> O cabeçalho contendo os nomes das colunas correspondentes (CAI, DESCRIÇÃO, ARO, etc.) deve estar localizado exatamente na <b>Linha 7</b> da aba (índice 6 base-zero).
                        </li>
                        <li>
                          <b>Ignorando Taxas do Distribuidor:</b> Lembre-se que as colunas 12 e 13 contendo as taxas do distribuidor (Unnamed: 12 e Unnamed: 13) são descartadas automaticamente para proteger e consolidar as taxas de faturamento reais de cartão previamente cadastradas por você.
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sync Summary Alert */}
            {importSummary && (
              <div className={`mt-4 p-5 border rounded-sm flex items-start gap-4 ${
                importMode === 'michelin' ? 'border-emerald-900 bg-emerald-950/10' : 'border-emerald-500/30 bg-emerald-950/20'
              }`}>
                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1 w-full">
                  <span className={`font-bold text-xs font-mono uppercase block ${importMode === 'michelin' ? 'text-emerald-300' : 'text-emerald-400'}`}>
                    {importMode === 'michelin' ? 'RECONCILIAÇÃO EFETUADA COM SUCESSO' : 'IMPORTAÇÃO DE IMPORTADOS CONCLUÍDA COM SUCESSO'}
                  </span>
                  <p className="text-xs text-neutral-400 font-mono uppercase">
                    {importMode === 'michelin'
                      ? 'A faturamento Michelin foi agregada e os metadados sincronizados.'
                      : 'O catálogo de pneus importados foi incorporado ao sistema sob o canal IMPORTADOS.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[10px] font-mono font-bold bg-neutral-900 px-3 py-2 border border-neutral-800 text-neutral-300 rounded-sm">
                    <span className="text-green-400">
                      +{importSummary.adicionados} ADICIONADOS / INSERIDOS
                    </span>
                    <span className="text-[#FFCC00] border-l border-neutral-800 pl-3">
                      *{importSummary.atualizados} ATUALIZADOS / MODIFICADOS
                    </span>
                    {importMode === 'michelin' && (
                      <span className="text-[#E2001A] border-l border-neutral-800 pl-3">
                        -{importSummary.removidos} REMOVIDOS
                      </span>
                    )}
                    <span className="text-neutral-500 border-l border-neutral-800 pl-3">
                      Total: {importSummary.total} CAI Processados
                    </span>
                  </div>

                  {/* Importados Warning & Validation Logs list */}
                  {importMode === 'importados' && importadosAlertas.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-800">
                      <span className="font-bold text-amber-500 text-[10px] font-mono block uppercase mb-1.5 flex items-center gap-1">
                        ⚠️ Alertas e Log de Validação ({importadosAlertas.length}):
                      </span>
                      <div className="max-h-28 overflow-y-auto bg-neutral-900 border border-neutral-800 p-2 space-y-1 font-mono text-[9px] text-neutral-400 rounded-sm">
                        {importadosAlertas.map((alerta, i) => (
                          <div key={i} className="flex gap-1 items-start text-amber-200/80 uppercase">
                            <span className="text-amber-500">•</span>
                            <span>{alerta}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Details of Active Planilha Specification */}
        <div className="space-y-6">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#FFCC00] mb-4 flex items-center gap-1.5">
              <span>●</span> Status Sincronização
            </h3>
            
            <div className="space-y-3 font-mono">
              <div className="bg-neutral-900/50 p-3.5 border border-neutral-800/60 rounded-sm">
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider block">Última Importação</span>
                <span className="text-xs text-foreground font-bold mt-1 block uppercase">
                  {formatDateTime(ultimaImportacao)}
                </span>
              </div>

              <div className="bg-neutral-900/50 p-3.5 border border-neutral-800/60 rounded-sm">
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider block">Total Produtos em Cache</span>
                <span className="text-2xl font-bold text-foreground mt-0.5 block">
                  {produtos.length}
                </span>
                <span className="text-[10px] text-[#FFCC00] font-bold uppercase mt-1 block">PNEUS CARREGADOS</span>
              </div>
            </div>
            
            <div className="mt-6 pt-5 border-t border-neutral-800 text-[10px] text-neutral-400 space-y-2 font-mono uppercase leading-relaxed">
              <p className="font-bold text-neutral-300 flex items-center gap-1.5 mb-2">
                <HelpCircle size={12} className="text-[#FFCC00]" />
                Auditoria de Pauta:
              </p>
              {importMode === 'michelin' ? (
                <p>
                  O processador extrai os descontos de canal de distribuição válidos para o Espírito Santo na cabeceira da planilha.
                </p>
              ) : (
                <p>
                  Os pneus importados do distribuidor são carregados sob o canal "IMPORTADOS". As taxas de cartão configuradas permanecem vigentes e não são sobrescritas.
                </p>
              )}
              <p className="text-[#FFCC00] font-bold">
                Chave única de cruzamento de dados: CAI.
              </p>
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm">
            <h3 className="text-xs font-mono font-bold text-neutral-300 mb-3 uppercase tracking-wider">
              {importMode === 'michelin' ? 'Mapeamento XLSB Comercial' : 'Mapeamento de Importados'}
            </h3>
            {importMode === 'michelin' ? (
              <ul className="text-[11px] space-y-2 text-neutral-500 font-mono uppercase">
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>B (Col 1)</span> <span className="text-foreground font-bold">Código CAI</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>D (Col 3)</span> <span className="text-foreground font-bold">Descrição</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>H (Col 7)</span> <span className="text-foreground font-bold">Marca (MIC/BFG)</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>J (Col 9)</span> <span className="text-foreground font-bold">Aro</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>T (Col 19)</span> <span className="text-foreground font-bold">Preço de Tabela</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>AV (Col 47)</span> <span className="text-foreground font-bold">Custo Sell In Real</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span>AX (Col 49)</span> <span className="text-foreground font-bold">Sugerido Sell Out</span>
                </li>
              </ul>
            ) : (
              <ul className="text-[11px] space-y-2 text-neutral-500 font-mono uppercase">
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>A (Col 0)</span> <span className="text-foreground font-bold">CAI</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>B (Col 1)</span> <span className="text-foreground font-bold">DESCRIÇÃO</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>C (Col 2)</span> <span className="text-foreground font-bold">ARO</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>D (Col 3)</span> <span className="text-foreground font-bold">À VISTA (Custo)</span>
                </li>
                <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span>E-J (Col 4-9)</span> <span className="text-foreground font-bold">Portas Parcelado</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span>K (Col 10)</span> <span className="text-foreground font-bold">SELLOUT (Sugerido)</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

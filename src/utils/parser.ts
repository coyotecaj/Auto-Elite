import * as XLSX from 'xlsx';
import { Produto, DescontosGlobais } from '../types';
import { DEFAULT_DESCONTOS } from '../initialData';

export function parseNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    // Limit to 2 decimal places to keep data pristine
    return Math.round(val * 100) / 100;
  }
  
  let str = String(val).trim().replace(/\s/g, '');
  if (!str) return 0;
  
  const isPercent = str.includes('%');
  if (isPercent) {
    str = str.replace('%', '');
  }
  
  // Format for Brazilian currency or numbers
  if (str.includes(',') && str.includes('.')) {
    // e.g., 1.250,55 or similar -> remove dot, swap comma to dot
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // e.g., 1250,55 -> swap comma to dot
    str = str.replace(',', '.');
  }
  
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  
  if (isPercent) {
    num = num / 100;
  }
  
  return Math.round(num * 100) / 100;
}

export function parsePercent(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    // If workbook represents 4% as 0.04 (standard Excel behavior), keep it.
    // If it is 4, we divide by 100. Let's figure out based on context, but usually:
    if (val > 1) return val / 100;
    return val;
  }
  
  let str = String(val).trim().replace(/\s/g, '');
  if (!str) return 0;
  
  const isPercent = str.includes('%');
  str = str.replace('%', '');
  
  if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  
  // If it had a percent sign or is greater than 1, treat as percentage scale
  if (isPercent || num > 1) {
    return num / 100;
  }
  
  return num;
}

export interface ParseResult {
  produtos: Produto[];
  descontosGlobais: DescontosGlobais;
  success: boolean;
  totalLinhasLidas: number;
}

export async function parseXlsbFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Erro ao carregar o conteúdo do arquivo.");
        }
        
        const arrayBuffer = data as ArrayBuffer;
        
        let workbook;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        try {
          // Suppress SheetJS warnings and non-fatal errors regarding defined names
          console.error = function(...args: any[]) {
            const msg = args[0] ? String(args[0]) : "";
            if (msg.includes("Could not parse defined name") || msg.includes("Unsupported PtgList")) {
              return;
            }
            originalConsoleError.apply(console, args);
          };
          
          console.warn = function(...args: any[]) {
            const msg = args[0] ? String(args[0]) : "";
            if (msg.includes("Could not parse defined name") || msg.includes("Unsupported PtgList")) {
              return;
            }
            originalConsoleWarn.apply(console, args);
          };

          workbook = XLSX.read(new Uint8Array(arrayBuffer), {
            type: 'array',
            cellFormula: false,
            cellHTML: false,
            cellText: false,
            cellDates: false
          });
        } catch (readErr: any) {
          originalConsoleError("Erro crítico XLSX.read:", readErr);
          throw new Error(`Falha crítica de decodificação binária: ${readErr?.message || String(readErr)}. Certifique-se de que o arquivo .xlsb não está corrompido e não possui senha de proteção ativa.`);
        } finally {
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;
        }
        
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("Este arquivo não contém nenhuma aba legível (SheetNames está vazia).");
        }
        
        // Intelligent Sheet Matching algorithm
        let sheetName = "";
        
        // 1. Prioritize a sheet containing "TABELA2"
        const sheetTabela2 = workbook.SheetNames.find(
          name => name.toUpperCase().includes("TABELA2")
        );
        
        // 2. Try sheet containing "TABELA"
        const sheetTabela = workbook.SheetNames.find(
          name => name.toUpperCase().includes("TABELA")
        );
        
        if (sheetTabela2) {
          sheetName = sheetTabela2;
        } else if (sheetTabela) {
          sheetName = sheetTabela;
        } else {
          // 3. Smart scan: pick the first sheet that has enough rows (>= 17 rows)
          for (const sName of workbook.SheetNames) {
            const tempSheet = workbook.Sheets[sName];
            if (tempSheet) {
              const ref = tempSheet['!ref'];
              if (ref) {
                try {
                  const range = XLSX.utils.decode_range(ref);
                  if (range.e.r >= 16) { // Has at least 17 rows (index 0 to 16)
                    sheetName = sName;
                    break;
                  }
                } catch (rErr) {
                  // ignore range decode error and continue
                }
              }
            }
          }
          
          // 4. Absolute fallback
          if (!sheetName) {
            sheetName = workbook.SheetNames[0];
          }
        }
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error(`A aba '${sheetName}' selecionada para importação não pôde ser lida.`);
        }
        
        // Convert to 2D array coordinates for direct indices
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: null
        });
        
        if (rows.length < 16) {
          throw new Error(`Formatagem incompatível: A aba '${sheetName}' possui apenas ${rows.length} linhas de dados, mas a tabela oficial de pauta Michelin exige faturamento com cabeçalho na linha 16 (pelo menos 17 linhas). Abas encontradas no arquivo: [${workbook.SheetNames.join(', ')}].`);
        }
        
        // Custom dynamic parsing of global discounts from lines 6 to 11 (indices 5 to 10)
        const descontosGlobais: DescontosGlobais = { ...DEFAULT_DESCONTOS };
        
        // Let's iterate index 5 through 12 to find global discount rows
        for (let r = 3; r <= 13; r++) {
          const row = rows[r];
          if (!row) continue;
          
          for (let c = 0; c < row.length - 1; c++) {
            const cellVal = row[c];
            if (cellVal && typeof cellVal === 'string') {
              const text = cellVal.toLowerCase();
              
              // Find the value in the next cell or further on
              const getVal = (): number | null => {
                for (let nextC = c + 1; nextC < Math.min(row.length, c + 4); nextC++) {
                  const val = row[nextC];
                  if (val !== null && val !== undefined && val !== '') {
                    return parsePercent(val);
                  }
                }
                return null;
              };
              
              if (text.includes('canal') && !text.includes('agilis')) {
                const val = getVal();
                if (val !== null) descontosGlobais.canal = val;
              } else if (text.includes('qualidade') && !text.includes('levorin')) {
                const val = getVal();
                if (val !== null) descontosGlobais.qualidade = val;
              } else if (text.includes('agilis')) {
                const val = getVal();
                if (val !== null) descontosGlobais.agilis = val;
              } else if (text.includes('levorin')) {
                const val = getVal();
                if (val !== null) descontosGlobais.qualidadeLevorin = val;
              } else if (text.includes('desconcentra') || text.includes('desconcentração')) {
                const val = getVal();
                if (val !== null) descontosGlobais.desconcentracao = val;
              }
            }
          }
        }
        
        // Now parse tires (Products start on Row 17 base-1 which is Row index 16 base-0)
        const produtos: Produto[] = [];
        
        for (let idx = 16; idx < rows.length; idx++) {
          const row = rows[idx];
          if (!row) continue;
          
          // Column 1 is CAI. If CAI is empty, this could be the end of the sheet representation
          const caiRaw = row[1];
          if (caiRaw === null || caiRaw === undefined || String(caiRaw).trim() === "") {
            continue;
          }
          
          const cai = String(caiRaw).trim();
          
          // Column indices (base-0 coordinates)
          // 3: DESCRIÇÃO
          // 6: SEGMENTO
          // 7: MARCA (MIC, BFG, etc.)
          // 8: ESCULTURA
          // 9: ARO
          // 16: PREÇO COM PIS E COFINS
          // 19: PREÇO TABELA ORACLE
          // 22: DESCONTO CANAL
          // 23: DESCONTO QUALIDADE
          // 24: DESCONTO CANAL AGILIS
          // 26: DESCONTO DESCONCENTRAÇÃO
          // 47: PREÇO SELL IN
          // 49: PREÇO SELL OUT SUGERIDO
          
          const descricao = row[3] ? String(row[3]).trim() : "Pneu sem descrição";
          const segmento = row[6] ? String(row[6]).trim() : "OUTROS";
          
          let marcaInput = row[7] ? String(row[7]).trim().toUpperCase() : "MIC";
          let marca = "MIC";
          if (marcaInput.includes("BF") || marcaInput.includes("BFG") || marcaInput.includes("GOODRICH")) {
            marca = "BFG";
          } else {
            marca = "MIC";
          }
          
          const escultura = row[8] ? String(row[8]).trim() : "";
          
          // Aro (can be styled as text or number, parse out numbers)
          let aroRaw = row[9];
          let aro = 0;
          if (aroRaw !== null && aroRaw !== undefined) {
            if (typeof aroRaw === 'number') {
              aro = aroRaw;
            } else {
              const matched = String(aroRaw).match(/\d+/);
              aro = matched ? parseInt(matched[0], 10) : 0;
            }
          }
          
          const precoPisCofins = parseNumber(row[16]);
          const precoTabelaOracle = parseNumber(row[19]);
          const descontoCanal = parsePercent(row[22]);
          const descontoQualidade = parsePercent(row[23]);
          const descontoAgilis = parsePercent(row[24]);
          const descontoDesconcentracao = parsePercent(row[26]);
          const precoSellIn = parseNumber(row[47]);
          const precoSellOut = parseNumber(row[49]);
          
          produtos.push({
            cai,
            descricao,
            segmento,
            marca,
            escultura,
            aro,
            precoPisCofins,
            precoTabelaOracle,
            descontoCanal,
            descontoQualidade,
            descontoAgilis,
            descontoDesconcentracao,
            precoSellIn: precoSellIn > 0 ? precoSellIn : precoPisCofins, // Fallback if SellIn is empty
            precoSellOut: precoSellOut > 0 ? precoSellOut : precoTabelaOracle, // Fallback if SellOut is empty
          });
        }
        
        resolve({
          produtos,
          descontosGlobais,
          success: true,
          totalLinhasLidas: produtos.length
        });
        
      } catch (err: any) {
        reject(err);
      }
    };
    
    reader.onerror = (e) => {
      reject(new Error("Erro de leitura do arquivo. O arquivo pode estar corrompido."));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export async function parseImportadosFile(file: File): Promise<{
  produtos: Produto[];
  success: boolean;
  totalImportado: number;
  alertas: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Erro ao carregar o conteúdo do arquivo.");
        }
        
        const arrayBuffer = data as ArrayBuffer;
        let workbook;
        
        try {
          workbook = XLSX.read(new Uint8Array(arrayBuffer), {
            type: 'array',
            cellFormula: false,
            cellHTML: false,
            cellText: false,
            cellDates: false
          });
        } catch (readErr: any) {
          throw new Error(`Falha de decodificação: ${readErr?.message || String(readErr)}`);
        }
        
        // Find the IMPORTADOS sheet
        const sheetName = workbook.SheetNames.find(
          name => name.toUpperCase().trim() === "IMPORTADOS"
        );
        
        if (!sheetName) {
          throw new Error("Aba 'IMPORTADOS' não encontrada na planilha. Certifique-se de que a planilha possui uma aba chamada especificamente 'IMPORTADOS'.");
        }
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error(`A aba '${sheetName}' não pôde ser lida.`);
        }
        
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: null
        });
        
        // Header is expected at row 7 (index 6 base-zero)
        if (rows.length < 7) {
          throw new Error("A tabela de importados deve conter dados a partir do cabeçalho na linha 7.");
        }
        
        const rawHeader = rows[6] || [];
        // Map column offsets by searching key headers
        let colCai = -1;
        let colDesc = -1;
        let colAro = -1;
        let colAvista = -1;
        let col2x = -1;
        let col3x = -1;
        let col4x = -1;
        let col5x = -1;
        let col6x = -1;
        let col10x = -1;
        let colSellout = -1;
        
        for (let c = 0; c < rawHeader.length; c++) {
          const h = (String(rawHeader[c]) || '').toUpperCase().trim();
          if (h === 'CAI') colCai = c;
          else if (h === 'DESCRIÇÃO' || h === 'DESCRICAO') colDesc = c;
          else if (h === 'ARO') colAro = c;
          else if (h === 'À VISTA' || h === 'A VISTA') colAvista = c;
          else if (h === '2X') col2x = c;
          else if (h === '3X') col3x = c;
          else if (h === '4X') col4x = c;
          else if (h === '5X') col5x = c;
          else if (h === 'PARC. ATÉ 6X' || h === 'PARCELADO ATÉ 6X' || h === 'PARC. ATE 6X' || h.includes('6X')) {
            if (col6x === -1) col6x = c;
          }
          else if (h === 'PARCEL. ATÉ 10X' || h === 'PARCELADO ATÉ 10X' || h === 'PARC. ATE 10X' || h.includes('10X')) {
            if (col10x === -1) col10x = c;
          }
          else if (h === 'SELLOUT' || h === 'SELL OUT' || h === 'PREÇO SUGERIDO DE REVENDA') colSellout = c;
        }
        
        // Fallback to absolute column indices if headers aren't explicitly matched
        if (colCai === -1) colCai = 0;
        if (colDesc === -1) colDesc = 1;
        if (colAro === -1) colAro = 2;
        if (colAvista === -1) colAvista = 3;
        if (col2x === -1) col2x = 4;
        if (col3x === -1) col3x = 5;
        if (col4x === -1) col4x = 6;
        if (col5x === -1) col5x = 7;
        if (col6x === -1) col6x = 8;
        if (col10x === -1) col10x = 9;
        if (colSellout === -1) colSellout = 10;
        
        const produtos: Produto[] = [];
        const alertas: string[] = [];
        const caisProcessados = new Set<string>();
        
        // Process records from row index 7 (row 8 base-1)
        for (let idx = 7; idx < rows.length; idx++) {
          const row = rows[idx];
          if (!row) continue;
          
          const caiRaw = row[colCai];
          if (caiRaw === null || caiRaw === undefined || String(caiRaw).trim() === "") {
            continue;
          }
          
          const cai = String(caiRaw).trim();
          
          if (caisProcessados.has(cai)) {
            alertas.push(`CAI duplicado na planilha: ${cai}. Usando a última ocorrência.`);
            const oldIdx = produtos.findIndex(p => p.cai === cai);
            if (oldIdx !== -1) produtos.splice(oldIdx, 1);
          }
          caisProcessados.add(cai);
          
          const descricaoRaw = row[colDesc] ? String(row[colDesc]).trim() : "";
          const desc = descricaoRaw || `Pneu Importado ${cai}`;
          
          // Aro conversion
          const aroRaw = row[colAro];
          let aro = 0;
          if (aroRaw !== null && aroRaw !== undefined) {
            if (typeof aroRaw === 'number') {
              aro = aroRaw;
            } else {
              const match = String(aroRaw).match(/\d+/);
              aro = match ? parseInt(match[0], 10) : 0;
            }
          }
          
          // Prices conversion
          const avista = parseNumber(row[colAvista]);
          const parc_2x = parseNumber(row[col2x]);
          const parc_3x = parseNumber(row[col3x]);
          const parc_4x = parseNumber(row[col4x]);
          const parc_5x = parseNumber(row[col5x]);
          const parc_ate_6x = parseNumber(row[col6x]);
          const parc_ate_10x = parseNumber(row[col10x]);
          const sellout = parseNumber(row[colSellout]);
          
          // Validations
          let statusResult = "ativo";
          if (avista === 0) {
            statusResult = "sem_cotacao";
            alertas.push(`Preço À VISTA nulo ou inválido para o CAI ${cai}. Pneu importado marcado como sem_cotacao.`);
          }
          
          // Parse Description Attributes
          const measureRegex = /(\d{3}\/\d{2}\s*R\s*\d{2})/i;
          const measureMatch = desc.match(measureRegex);
          const medida = measureMatch ? measureMatch[1].trim() : "";
          
          const specsRegex = /(\d{2,3}(?:\/\d{2,3})?)\s*([A-Za-z])(?=\s|$)/i;
          const specsMatch = desc.match(specsRegex);
          const indice_carga = specsMatch ? specsMatch[1] : null;
          const indice_velocidade = specsMatch ? specsMatch[2].toUpperCase() : undefined;
          
          // Extract Brand
          const knownBrandsDesc = [
            "DUNLOP", "KUMHO", "NEXEN TIRE", "NEXEN", "MICHELIN", "BFGOODRICH", 
            "TIGAR", "FATE", "ONYX", "SUMITOMO", "XBRI", "DOUBLESTAR", "DYNAMO", 
            "TRAZANO", "BRAVURIS", "CONTINENTAL", "PIRELLI", "GOODYEAR", "BRIDGESTONE", 
            "YOKOHAMA", "HANKOOK", "TOYO"
          ];
          
          let marca: string | null = null;
          for (const b of knownBrandsDesc) {
            if (new RegExp("\\b" + b + "\\b", "i").test(desc)) {
              marca = b;
              break;
            }
          }
          if (!marca) {
            for (const b of knownBrandsDesc) {
              if (desc.toUpperCase().includes(b)) {
                marca = b;
                break;
              }
            }
          }
          
          if (!marca) {
            alertas.push(`Descrição do CAI ${cai} sem marca reconhecida. Importado com marca: null.`);
          }
          
          // Extract Model
          let modelo = desc;
          if (medida) modelo = modelo.replace(measureRegex, "");
          if (specsMatch) modelo = modelo.replace(specsRegex, "");
          if (marca) {
            modelo = modelo.replace(new RegExp(marca, "i"), "");
          }
          modelo = modelo.replace(/\s+/g, " ").trim();
          
          const canal = "IMPORTADOS";
          
          // Categoria default
          let categoria = "PASSEIO";
          const loadInt = indice_carga ? parseInt(indice_carga.split('/')[0], 10) : 0;
          
          const uppercaseDesc = desc.toUpperCase();
          if (
            uppercaseDesc.includes("SUV") || 
            uppercaseDesc.includes("LT") || 
            uppercaseDesc.includes("M/S") || 
            (uppercaseDesc.includes("C") && loadInt > 100) || 
            loadInt > 100
          ) {
            categoria = "SUV/OFFROAD";
          }
          
          if (
            uppercaseDesc.includes("CV5000") || 
            (indice_carga && indice_carga.includes("/")) ||
            /(\d{3}\/\d{2}\s*R\s*\d{2}\s+L?T?C\b)/i.test(desc) || 
            /\d{2,3}\/\d{2,3}[A-Z]/i.test(desc)
          ) {
            categoria = "LCV";
          }
          
          produtos.push({
            cai,
            descricao: desc,
            segmento: categoria,
            marca: marca || "IMPORTADO",
            escultura: modelo || "IMPORT",
            aro,
            precoPisCofins: avista,
            precoTabelaOracle: avista,
            descontoCanal: 0,
            descontoQualidade: 0,
            descontoAgilis: 0,
            descontoDesconcentracao: 0,
            precoSellIn: avista,
            precoSellOut: sellout > 0 ? sellout : avista * 1.3,
            
            id_cai: cai,
            medida,
            indice_carga: indice_carga || "",
            indice_velocidade,
            modelo,
            canal,
            categoria,
            precosImportados: {
              avista,
              parc_2x,
              parc_3x,
              parc_4x,
              parc_5x,
              parc_ate_6x,
              parc_ate_10x,
              sellout
            },
            status: statusResult,
            origem: "IMPORTADOS",
            data_importacao: new Date().toISOString()
          });
        }
        
        resolve({
          produtos,
          success: true,
          totalImportado: produtos.length,
          alertas
        });
        
      } catch (err: any) {
        reject(err);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Erro de leitura do arquivo. O arquivo pode estar corrompido."));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

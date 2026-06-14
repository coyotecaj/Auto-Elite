import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Produto, DescontosGlobais, PerfilMaquininha } from './types';

/**
 * Converte um lote de produtos e envia em batches de 400 itens para o Firestore.
 * Também remove do banco qualquer produto que não faça parte do novo lote importado.
 */
export async function syncProdutosToCloud(novosProdutos: Produto[]): Promise<void> {
  const path = 'produtos';
  try {
    // 1. Obter todos os IDs de produtos cadastrados atualmente na nuvem
    const snapshot = await getDocs(collection(db, path)).catch(e => {
      handleFirestoreError(e, OperationType.LIST, path);
      throw e;
    });
    const idsNaNuvem = snapshot.docs.map(d => d.id);

    // 2. Determinar quais IDs devem ser excluídos (estavam na nuvem mas não estão no lote importado)
    const novosIds = new Set(novosProdutos.map(p => p.cai));
    const idsExcluir = idsNaNuvem.filter(id => !novosIds.has(id));

    // 3. Executar o salvamento em batches de no máximo 450 operações por vez (limite seguro do Firestore é 500)
    const chunkSize = 400;
    
    // Batch de Deletados
    for (let i = 0; i < idsExcluir.length; i += chunkSize) {
      const chunk = idsExcluir.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, path, id));
      }
      await batch.commit().catch(e => {
        handleFirestoreError(e, OperationType.WRITE, path + ' (delete chunk)');
        throw e;
      });
    }

    // Batch de Novos e Atualizados
    for (let i = 0; i < novosProdutos.length; i += chunkSize) {
      const chunk = novosProdutos.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const p of chunk) {
        // Garantias de segurança e validação do payload
        const cleanedProduct = {
          cai: String(p.cai || '').trim(),
          descricao: String(p.descricao || '').trim(),
          segmento: String(p.segmento || '').trim(),
          marca: String(p.marca || '').trim(),
          escultura: String(p.escultura || '').trim(),
          aro: String(p.aro || '').trim(),
          precoPisCofins: Number(p.precoPisCofins || 0),
          precoTabelaOracle: Number(p.precoTabelaOracle || 0),
          descontoCanal: Number(p.descontoCanal || 0),
          descontoQualidade: Number(p.descontoQualidade || 0),
          descontoAgilis: Number(p.descontoAgilis || 0),
          descontoDesconcentracao: Number(p.descontoDesconcentracao || 0),
          precoSellIn: Number(p.precoSellIn || 0),
          precoSellOut: Number(p.precoSellOut || 0)
        } as any;

        if (p.medida) cleanedProduct.medida = String(p.medida);
        if (p.indice_carga) cleanedProduct.indice_carga = String(p.indice_carga);
        if (p.indice_velocidade) cleanedProduct.indice_velocidade = String(p.indice_velocidade);
        if (p.modelo) cleanedProduct.modelo = String(p.modelo);
        if (p.canal) cleanedProduct.canal = String(p.canal);
        if (p.categoria) cleanedProduct.categoria = String(p.categoria);
        if (p.origem) cleanedProduct.origem = String(p.origem);
        if (p.data_importacao) cleanedProduct.data_importacao = String(p.data_importacao);
        if (p.status) cleanedProduct.status = String(p.status);

        if (p.precosImportados) {
          cleanedProduct.precosImportados = {
            avista: Number(p.precosImportados.avista || 0),
            sellout: Number(p.precosImportados.sellout || 0)
          } as any;
          if (p.precosImportados.parc_2x !== undefined) cleanedProduct.precosImportados.parc_2x = Number(p.precosImportados.parc_2x);
          if (p.precosImportados.parc_3x !== undefined) cleanedProduct.precosImportados.parc_3x = Number(p.precosImportados.parc_3x);
          if (p.precosImportados.parc_4x !== undefined) cleanedProduct.precosImportados.parc_4x = Number(p.precosImportados.parc_4x);
          if (p.precosImportados.parc_5x !== undefined) cleanedProduct.precosImportados.parc_5x = Number(p.precosImportados.parc_5x);
          if (p.precosImportados.parc_ate_6x !== undefined) cleanedProduct.precosImportados.parc_ate_6x = Number(p.precosImportados.parc_ate_6x);
          if (p.precosImportados.parc_ate_10x !== undefined) cleanedProduct.precosImportados.parc_ate_10x = Number(p.precosImportados.parc_ate_10x);
        }

        const productRef = doc(db, path, cleanedProduct.cai);
        batch.set(productRef, cleanedProduct);
      }
      await batch.commit().catch(e => {
        handleFirestoreError(e, OperationType.WRITE, path + ' (set chunk)');
        throw e;
      });
    }
  } catch (error) {
    console.error("Erro ao sincronizar produtos com a nuvem:", error);
    throw error;
  }
}

/**
 * Salva as taxas e descontos gerais no documento 'configuracoes/geral'
 */
export async function syncConfiguracoesToCloud(
  descontosGlobais: DescontosGlobais,
  ultimaImportacao: string | null
): Promise<void> {
  const path = 'configuracoes';
  try {
    await setDoc(doc(db, path, 'geral'), {
      descontosGlobais,
      ultimaImportacao: ultimaImportacao || null
    }).catch(e => {
      handleFirestoreError(e, OperationType.WRITE, `${path}/geral`);
      throw e;
    });
  } catch (error) {
    console.error("Erro ao salvar descontos e última importação para nuvem:", error);
    throw error;
  }
}

/**
 * Salva em batches os perfis de maquininha de cartão na coleção 'perfisMaquininha'
 */
export async function syncPerfisMaquininhaToCloud(perfis: PerfilMaquininha[]): Promise<void> {
  const path = 'perfisMaquininha';
  try {
    const batch = writeBatch(db);
    for (const p of perfis) {
      const ref = doc(db, path, p.id);
      batch.set(ref, p);
    }
    await batch.commit().catch(e => {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    });
  } catch (error) {
    console.error("Erro ao sincronizar perfis de maquininha:", error);
    throw error;
  }
}

/**
 * Salve ou remova item promocional na coleção 'itensPromocionais'
 */
export async function syncItensPromocionaisToCloud(promos: { cai: string; descontoPromocional: number }[]): Promise<void> {
  const path = 'itensPromocionais';
  try {
    // 1. Apagar todos atuais
    const snapshot = await getDocs(collection(db, path)).catch(e => {
      handleFirestoreError(e, OperationType.LIST, path);
      throw e;
    });
    
    const deleteBatch = writeBatch(db);
    snapshot.docs.forEach(d => {
      deleteBatch.delete(d.ref);
    });
    await deleteBatch.commit().catch(e => {
      handleFirestoreError(e, OperationType.WRITE, `${path} (clear)`);
      throw e;
    });

    // 2. Inserir novos
    if (promos.length > 0) {
      const insertBatch = writeBatch(db);
      for (const item of promos) {
        if (!item.cai) continue;
        const ref = doc(db, path, item.cai);
        insertBatch.set(ref, item);
      }
      await insertBatch.commit().catch(e => {
        handleFirestoreError(e, OperationType.WRITE, `${path} (insert)`);
        throw e;
      });
    }
  } catch (error) {
    console.error("Erro ao sincronizar itens promocionais:", error);
    throw error;
  }
}

/**
 * Inscreve os listeners para manter o aplicativo atualizado em tempo real com o banco remoto
 */
export function startLiveCloudSync(
  onProductsLoaded: (p: Produto[]) => void,
  onConfigLoaded: (descontos: DescontosGlobais, lastImport: string | null) => void,
  onPerfisLoaded: (perfis: PerfilMaquininha[]) => void,
  onPromosLoaded: (promos: { cai: string; descontoPromocional: number }[]) => void
): Unsubscribe[] {
  const unsubscribers: Unsubscribe[] = [];

  // 1. Escutar produtos
  const unsubProducts = onSnapshot(collection(db, 'produtos'), (snapshot) => {
    const list: Produto[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Produto);
    });
    if (list.length > 0) {
      onProductsLoaded(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'produtos');
  });
  unsubscribers.push(unsubProducts);

  // 2. Escutar configurações gerais (descontos globais)
  const unsubConfig = onSnapshot(doc(db, 'configuracoes', 'geral'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.descontosGlobais) {
        onConfigLoaded(data.descontosGlobais as DescontosGlobais, data.ultimaImportacao || null);
      }
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'configuracoes/geral');
  });
  unsubscribers.push(unsubConfig);

  // 3. Escutar perfis de maquininhas de cartão
  const unsubPerfis = onSnapshot(collection(db, 'perfisMaquininha'), (snapshot) => {
    const list: PerfilMaquininha[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as PerfilMaquininha);
    });
    if (list.length > 0) {
      onPerfisLoaded(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'perfisMaquininha');
  });
  unsubscribers.push(unsubPerfis);

  // 4. Escutar itens promocionais
  const unsubPromos = onSnapshot(collection(db, 'itensPromocionais'), (snapshot) => {
    const list: { cai: string; descontoPromocional: number }[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as { cai: string; descontoPromocional: number });
    });
    onPromosLoaded(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'itensPromocionais');
  });
  unsubscribers.push(unsubPromos);

  return unsubscribers;
}

/**
 * Função para enviar todos os dados locais iniciais de localStorage para a nuvem
 * Executado quando o usuário loga pela primeira vez e sincroniza com a nuvem vazia
 */
export async function uploadLocalToCloud(
  produtosLocais: Produto[],
  descontosLocais: DescontosGlobais,
  perfisLocais: PerfilMaquininha[],
  promosLocais: { cai: string; descontoPromocional: number }[],
  ultimaImportacaoLocal: string | null
): Promise<void> {
  console.log("Subindo base local de demonstração para o banco Cloud...");
  await syncConfiguracoesToCloud(descontosLocais, ultimaImportacaoLocal);
  await syncPerfisMaquininhaToCloud(perfisLocais);
  await syncItensPromocionaisToCloud(promosLocais);
  if (produtosLocais && produtosLocais.length > 0) {
    await syncProdutosToCloud(produtosLocais);
  }
}

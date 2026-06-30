import { getDb } from '../db';
import { cargas } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Cria uma nova carga com cálculos automáticos de custo total e lucro
 */
export async function criarCarga(data: {
  pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';
  data: string; // YYYY-MM-DD
  tipo?: 'SAO_LEO' | 'ESTEIO';
  rota?: string;
  motorista?: string;
  valorCombustivel: number;
  litrosCombustivel: number;
  chapa1?: string;
  chapa2?: string;
  manutencao: number;
  custoOutros: number;
  valorFrete: number;
  pedagio?: number;
  numeroProtocolo?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // Calcular valores de retenção e frete líquido
  const valorRetido = data.valorFrete * 0.1; // 10% de retenção
  const valorLiquidoFrete = data.valorFrete - valorRetido;

  // Calcular custo total e lucro
  // Custos fixos: motorista R$ 220 (fixo) + chapa1 R$ 150 (se selecionada) + chapa2 R$ 150 (se selecionada)
  const custoMotorista = 220; // Sempre R$ 220
  const custoChapa1 = data.chapa1 && data.chapa1.trim() !== '' ? 150 : 0; // R$ 150 se selecionada
  const custoChapa2 = data.chapa2 && data.chapa2.trim() !== '' ? 150 : 0; // R$ 150 se selecionada
  const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
  const custoTotal = data.valorCombustivel + data.manutencao + data.custoOutros + custoFixo;
  const lucro = valorLiquidoFrete - custoTotal;

  const result = await db.insert(cargas).values({
    pasta: data.pasta,
    tipo: (data.tipo || 'SAO_LEO') as any,
    data: data.data as any,
    rota: data.rota || null,
    motorista: data.motorista || null,
    valorCombustivel: data.valorCombustivel.toString() as any,
    litrosCombustivel: data.litrosCombustivel.toString() as any,
    chapa1: data.chapa1 || null,
    chapa2: data.chapa2 || null,
    manutencao: data.manutencao.toString() as any,
    custoOutros: data.custoOutros.toString() as any,
    valorFrete: data.valorFrete.toString() as any,
    pedagio: (data.pedagio || 0).toString() as any,
    valorRetido: valorRetido.toString() as any,
    valorLiquidoFrete: valorLiquidoFrete.toString() as any,
    numeroProtocolo: data.numeroProtocolo || null,
    custoTotal: custoTotal.toString() as any,
    lucro: lucro.toString() as any,
  });

  return result;
}

/**
 * Atualiza uma carga existente com recálculo de custos
 */
export async function atualizarCarga(
  id: number,
  data: {
    tipo?: 'SAO_LEO' | 'ESTEIO';
    rota?: string;
    motorista?: string;
    valorCombustivel?: number;
    litrosCombustivel?: number;
    chapa1?: string;
    chapa2?: string;
    manutencao?: number;
    custoOutros?: number;
    valorFrete?: number;
    pedagio?: number;
    numeroProtocolo?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // Buscar carga atual para calcular valores
  const cargaAtual = await db
    .select()
    .from(cargas)
    .where(eq(cargas.id, id))
    .limit(1);

  if (!cargaAtual || cargaAtual.length === 0) {
    throw new Error('Carga não encontrada');
  }

  const c = cargaAtual[0];

  // Usar valores fornecidos ou manter os atuais
  const valorCombustivel = data.valorCombustivel ?? Number(c.valorCombustivel);
  const manutencao = data.manutencao ?? Number(c.manutencao);
  const custoOutros = data.custoOutros ?? Number(c.custoOutros);
  const valorFrete = data.valorFrete ?? Number(c.valorFrete);
  const chapa1 = data.chapa1 !== undefined ? data.chapa1 : c.chapa1;
  const chapa2 = data.chapa2 !== undefined ? data.chapa2 : c.chapa2;

  // Recalcular valores de retenção e frete líquido
  const valorRetido = valorFrete * 0.1; // 10% de retenção
  const valorLiquidoFrete = valorFrete - valorRetido;

  // Recalcular custos
  // Custos fixos: motorista R$ 220 (fixo) + chapa1 R$ 150 (se selecionada) + chapa2 R$ 150 (se selecionada)
  const custoMotorista = 220; // Sempre R$ 220
  const custoChapa1 = chapa1 && chapa1.trim() !== '' ? 150 : 0; // R$ 150 se selecionada
  const custoChapa2 = chapa2 && chapa2.trim() !== '' ? 150 : 0; // R$ 150 se selecionada
  const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
  const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
  const lucro = valorLiquidoFrete - custoTotal;

  const updateData: any = {
    valorRetido: valorRetido.toString(),
    valorLiquidoFrete: valorLiquidoFrete.toString(),
    custoTotal: custoTotal.toString(),
    lucro: lucro.toString(),
  };

  // Adicionar campos opcionais se fornecidos
  if (data.tipo !== undefined) updateData.tipo = data.tipo;
  if (data.rota !== undefined) updateData.rota = data.rota || null;
  if (data.motorista !== undefined) updateData.motorista = data.motorista || null;
  if (data.valorCombustivel !== undefined)
    updateData.valorCombustivel = data.valorCombustivel.toString();
  if (data.litrosCombustivel !== undefined)
    updateData.litrosCombustivel = data.litrosCombustivel.toString();
  if (data.chapa1 !== undefined) updateData.chapa1 = data.chapa1 || null;
  if (data.chapa2 !== undefined) updateData.chapa2 = data.chapa2 || null;
  if (data.manutencao !== undefined) updateData.manutencao = data.manutencao.toString();
  if (data.custoOutros !== undefined) updateData.custoOutros = data.custoOutros.toString();
  if (data.valorFrete !== undefined) updateData.valorFrete = data.valorFrete.toString();
  if (data.pedagio !== undefined) updateData.pedagio = data.pedagio.toString();
  if (data.numeroProtocolo !== undefined)
    updateData.numeroProtocolo = data.numeroProtocolo || null;

  return db.update(cargas).set(updateData).where(eq(cargas.id, id));
}

/**
 * Lista todas as cargas de uma pasta
 */
export async function listarCargasPorPasta(pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU') {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .select()
    .from(cargas)
    .where(eq(cargas.pasta, pasta))
    .orderBy(cargas.data);
}

/**
 * Busca uma carga por ID
 */
export async function buscarCargaPorId(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .select()
    .from(cargas)
    .where(eq(cargas.id, id))
    .limit(1);
}

/**
 * Deleta uma carga
 */
export async function deletarCarga(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db.delete(cargas).where(eq(cargas.id, id));
}

/**
 * Calcula resumo de cargas por pasta (total frete, custo total, lucro)
 */
export async function resumoCargasPorPasta(pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU') {
  const todasAsCargas = await listarCargasPorPasta(pasta);

  const totalFrete = todasAsCargas.reduce((sum: number, c: any) => sum + Number(c.valorFrete), 0);
  const totalCusto = todasAsCargas.reduce((sum: number, c: any) => sum + Number(c.custoTotal), 0);
  const totalLucro = todasAsCargas.reduce((sum: number, c: any) => sum + Number(c.lucro), 0);
  const quantidade = todasAsCargas.length;

  return {
    pasta,
    quantidade,
    totalFrete,
    totalCusto,
    totalLucro,
    margemMedia: quantidade > 0 ? ((totalLucro / totalFrete) * 100).toFixed(2) : '0',
  };
}

/**
 * Lista todas as cargas de todas as pastas
 */
export async function listarTodasCargas() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .select()
    .from(cargas)
    .orderBy(cargas.data);
}

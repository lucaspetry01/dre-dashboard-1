import { getDb } from '../db';
import { cargas } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Cria uma nova carga com cálculos automáticos de custo total e lucro
 */
export async function criarCarga(data: {
  pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';
  data: string; // YYYY-MM-DD
  rota?: string;
  motorista?: string;
  valorCombustivel: number;
  litrosCombustivel: number;
  chapa1?: string;
  chapa2?: string;
  manutencao: number;
  custoOutros: number;
  valorFrete: number;
  numeroProtocolo?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // Calcular custo total e lucro
  // Custos fixos: chapa1 R$ 150 + chapa2 R$ 150 + motorista R$ 220 = R$ 520
  const custoFixo = 150 + 150 + 220; // chapa1 + chapa2 + motorista
  const custoTotal = data.valorCombustivel + data.manutencao + data.custoOutros + custoFixo;
  const lucro = data.valorFrete - custoTotal;

  const result = await db.insert(cargas).values({
    pasta: data.pasta,
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
    rota?: string;
    motorista?: string;
    valorCombustivel?: number;
    litrosCombustivel?: number;
    chapa1?: string;
    chapa2?: string;
    manutencao?: number;
    custoOutros?: number;
    valorFrete?: number;
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

  // Recalcular
  // Custos fixos: chapa1 R$ 150 + chapa2 R$ 150 + motorista R$ 220 = R$ 520
  const custoFixo = 150 + 150 + 220; // chapa1 + chapa2 + motorista
  const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
  const lucro = valorFrete - custoTotal;

  const updateData: any = {
    custoTotal: custoTotal.toString(),
    lucro: lucro.toString(),
  };

  // Adicionar campos opcionais se fornecidos
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

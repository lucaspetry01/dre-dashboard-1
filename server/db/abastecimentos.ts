import { getDb } from '../db';
import { abastecimentos } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export async function createAbastecimento(data: {
  pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';
  data: string; // YYYY-MM-DD
  placa: string;
  rota?: string;
  motorista?: string;
  protocolo?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  const result = await db.insert(abastecimentos).values({
    pasta: data.pasta,
    data: data.data as any,
    placa: data.placa,
    rota: data.rota,
    motorista: data.motorista,
    protocolo: data.protocolo,
  });
  return result;
}

export async function getAbastecimentosByPasta(pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU') {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .select()
    .from(abastecimentos)
    .where(eq(abastecimentos.pasta, pasta))
    .orderBy(abastecimentos.data);
}

export async function getAllAbastecimentos() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .select()
    .from(abastecimentos)
    .orderBy(abastecimentos.data);
}

export async function getAbastecimentoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .select()
    .from(abastecimentos)
    .where(eq(abastecimentos.id, id))
    .limit(1);
}

export async function updateAbastecimento(
  id: number,
  data: Partial<{
    pasta: 'IES' | 'IJD' | 'DAJ' | 'MFF' | 'IGU';
    data: string;
    placa: string;
    rota: string;
    motorista: string;
    protocolo: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .update(abastecimentos)
    .set(data as any)
    .where(eq(abastecimentos.id, id));
}

export async function deleteAbastecimento(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return await db
    .delete(abastecimentos)
    .where(eq(abastecimentos.id, id));
}

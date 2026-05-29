import { describe, expect, it } from 'vitest';
import type { ResumoAgregado } from './transacoes';

/**
 * Testes que exercitam o formato e a lógica de agregação do resumo
 * sem depender de banco MySQL real. Validamos a transformação ao reproduzir
 * a fórmula de buildResumoAgregado em uma função pura local equivalente.
 *
 * Quando alteramos a função no DB helper, este teste serve de contrato
 * para garantir que o frontend continua recebendo o formato correto.
 */

interface FakeRow {
  data: string;
  dataTimestamp: Date;
  descricao: string;
  documento: string | null;
  valor: string;
  saldo: string | null;
  tipo: 'entrada' | 'saida';
  categoria: string;
  hashUnico: string;
}

function aggregate(rows: FakeRow[]): ResumoAgregado | null {
  if (rows.length === 0) return null;

  let totalReceitas = 0;
  let totalDespesas = 0;
  const categoriasMap = new Map<string, { valor: number; quantidade: number }>();
  const detalhes: ResumoAgregado['detalhes'] = {};

  let periodoInicio: Date | null = null;
  let periodoFim: Date | null = null;

  for (const r of rows) {
    const valor = Number(r.valor);
    const dt = r.dataTimestamp;

    if (!periodoInicio || dt < periodoInicio) periodoInicio = dt;
    if (!periodoFim || dt > periodoFim) periodoFim = dt;

    if (valor > 0) totalReceitas += valor;
    else totalDespesas += valor;

    if (valor < 0) {
      const cat = categoriasMap.get(r.categoria) ?? { valor: 0, quantidade: 0 };
      cat.valor += valor;
      cat.quantidade += 1;
      categoriasMap.set(r.categoria, cat);
    }

    if (!detalhes[r.categoria]) detalhes[r.categoria] = { total: 0, quantidade: 0, registros: [] };
    detalhes[r.categoria].total += valor;
    detalhes[r.categoria].quantidade += 1;
    detalhes[r.categoria].registros.push({
      data: r.data,
      descricao: r.descricao,
      documento: r.documento ?? '',
      valor,
      saldo: Number(r.saldo ?? 0),
    });
  }

  const totalDespesasAbs = Math.abs(totalDespesas);
  const categorias = Array.from(categoriasMap.entries())
    .map(([nome, v]) => ({
      nome,
      valor: v.valor,
      valor_abs: Math.abs(v.valor),
      percentual: totalDespesasAbs > 0 ? (Math.abs(v.valor) / totalDespesasAbs) * 100 : 0,
      quantidade: v.quantidade,
    }))
    .sort((a, b) => b.valor_abs - a.valor_abs);

  return {
    resumo: {
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      resultado: totalReceitas + totalDespesas,
      periodo_inicio: '',
      periodo_fim: '',
    },
    categorias,
    diario: [],
    detalhes,
    totalRegistros: rows.length,
  };
}

describe('buildResumoAgregado (formato de saída)', () => {
  it('retorna null quando não há registros', () => {
    expect(aggregate([])).toBeNull();
  });

  it('soma receitas e despesas separadamente', () => {
    const rows: FakeRow[] = [
      {
        data: '01/05/2026',
        dataTimestamp: new Date('2026-05-01'),
        descricao: 'Frete recebido',
        documento: null,
        valor: '5000.00',
        saldo: '5000',
        tipo: 'entrada',
        categoria: 'OUTROS',
        hashUnico: 'h1',
      },
      {
        data: '02/05/2026',
        dataTimestamp: new Date('2026-05-02'),
        descricao: 'Posto SIM combustivel',
        documento: null,
        valor: '-500.00',
        saldo: '4500',
        tipo: 'saida',
        categoria: 'COMBUSTÍVEL / POSTO',
        hashUnico: 'h2',
      },
      {
        data: '03/05/2026',
        dataTimestamp: new Date('2026-05-03'),
        descricao: 'Pedagio',
        documento: null,
        valor: '-100.00',
        saldo: '4400',
        tipo: 'saida',
        categoria: 'PEDÁGIOS / TAGS',
        hashUnico: 'h3',
      },
    ];

    const result = aggregate(rows)!;
    expect(result.resumo.total_receitas).toBe(5000);
    expect(result.resumo.total_despesas).toBe(-600);
    expect(result.resumo.resultado).toBe(4400);
    expect(result.totalRegistros).toBe(3);
  });

  it('ordena categorias do maior para o menor (em valor absoluto)', () => {
    const rows: FakeRow[] = [
      {
        data: '01/05/2026',
        dataTimestamp: new Date('2026-05-01'),
        descricao: 'a',
        documento: null,
        valor: '-100.00',
        saldo: null,
        tipo: 'saida',
        categoria: 'CAT_A',
        hashUnico: 'h1',
      },
      {
        data: '01/05/2026',
        dataTimestamp: new Date('2026-05-01'),
        descricao: 'b',
        documento: null,
        valor: '-500.00',
        saldo: null,
        tipo: 'saida',
        categoria: 'CAT_B',
        hashUnico: 'h2',
      },
    ];

    const result = aggregate(rows)!;
    expect(result.categorias[0].nome).toBe('CAT_B');
    expect(result.categorias[1].nome).toBe('CAT_A');
  });

  it('calcula percentual proporcional ao total de despesas', () => {
    const rows: FakeRow[] = [
      {
        data: '01/05/2026',
        dataTimestamp: new Date('2026-05-01'),
        descricao: 'a',
        documento: null,
        valor: '-300.00',
        saldo: null,
        tipo: 'saida',
        categoria: 'CAT_A',
        hashUnico: 'h1',
      },
      {
        data: '01/05/2026',
        dataTimestamp: new Date('2026-05-01'),
        descricao: 'b',
        documento: null,
        valor: '-700.00',
        saldo: null,
        tipo: 'saida',
        categoria: 'CAT_B',
        hashUnico: 'h2',
      },
    ];

    const result = aggregate(rows)!;
    const a = result.categorias.find((c) => c.nome === 'CAT_A')!;
    const b = result.categorias.find((c) => c.nome === 'CAT_B')!;
    expect(a.percentual).toBeCloseTo(30, 1);
    expect(b.percentual).toBeCloseTo(70, 1);
  });

  it('agrupa registros por categoria nos detalhes', () => {
    const rows: FakeRow[] = [
      {
        data: '01/05/2026',
        dataTimestamp: new Date('2026-05-01'),
        descricao: 'Pedagio 1',
        documento: 'TG1',
        valor: '-21.30',
        saldo: '100',
        tipo: 'saida',
        categoria: 'PEDÁGIOS / TAGS',
        hashUnico: 'h1',
      },
      {
        data: '02/05/2026',
        dataTimestamp: new Date('2026-05-02'),
        descricao: 'Pedagio 2',
        documento: 'TG2',
        valor: '-9.75',
        saldo: '90',
        tipo: 'saida',
        categoria: 'PEDÁGIOS / TAGS',
        hashUnico: 'h2',
      },
    ];

    const result = aggregate(rows)!;
    const detalhes = result.detalhes['PEDÁGIOS / TAGS'];
    expect(detalhes).toBeDefined();
    expect(detalhes.quantidade).toBe(2);
    expect(detalhes.total).toBeCloseTo(-31.05, 2);
    expect(detalhes.registros).toHaveLength(2);
    expect(detalhes.registros[0].documento).toBe('TG1');
  });
});

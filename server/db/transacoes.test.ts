import { describe, expect, it } from 'vitest';
import { aggregateRows, type AggregateRow } from './transacoes';

/**
 * Testes que exercitam diretamente a função pura `aggregateRows`
 * (a mesma usada por buildResumoAgregado quando lê do banco).
 */

function row(partial: Partial<AggregateRow>): AggregateRow {
  return {
    data: '01/05/2026',
    dataTimestamp: new Date('2026-05-01'),
    descricao: 'transação',
    documento: null,
    valor: '0',
    saldo: null,
    categoria: 'OUTROS',
    ...partial,
  };
}

describe('aggregateRows (helper de produção)', () => {
  it('retorna null quando não há registros', () => {
    expect(aggregateRows([])).toBeNull();
  });

  it('soma receitas e despesas separadamente', () => {
    const rows: AggregateRow[] = [
      row({ valor: '5000.00', categoria: 'RECEITAS' }),
      row({ valor: '-500.00', dataTimestamp: new Date('2026-05-02'), categoria: 'COMBUSTÍVEL / POSTO' }),
      row({ valor: '-100.00', dataTimestamp: new Date('2026-05-03'), categoria: 'PEDÁGIOS / TAGS' }),
    ];

    const result = aggregateRows(rows)!;
    expect(result.resumo.total_receitas).toBe(5000);
    expect(result.resumo.total_despesas).toBe(-600);
    expect(result.resumo.resultado).toBe(4400);
    expect(result.totalRegistros).toBe(3);
  });

  it('ordena categorias do maior para o menor (em valor absoluto)', () => {
    const rows: AggregateRow[] = [
      row({ valor: '-100.00', categoria: 'CAT_A' }),
      row({ valor: '-500.00', categoria: 'CAT_B' }),
    ];

    const result = aggregateRows(rows)!;
    expect(result.categorias[0].nome).toBe('CAT_B');
    expect(result.categorias[1].nome).toBe('CAT_A');
  });

  it('calcula percentual proporcional ao total de despesas', () => {
    const rows: AggregateRow[] = [
      row({ valor: '-300.00', categoria: 'CAT_A' }),
      row({ valor: '-700.00', categoria: 'CAT_B' }),
    ];

    const result = aggregateRows(rows)!;
    const a = result.categorias.find((c) => c.nome === 'CAT_A')!;
    const b = result.categorias.find((c) => c.nome === 'CAT_B')!;
    expect(a.percentual).toBeCloseTo(30, 1);
    expect(b.percentual).toBeCloseTo(70, 1);
  });

  it('agrupa registros por categoria nos detalhes', () => {
    const rows: AggregateRow[] = [
      row({
        valor: '-21.30',
        documento: 'TG1',
        descricao: 'Pedagio 1',
        categoria: 'PEDÁGIOS / TAGS',
        saldo: '100',
      }),
      row({
        valor: '-9.75',
        documento: 'TG2',
        descricao: 'Pedagio 2',
        dataTimestamp: new Date('2026-05-02'),
        categoria: 'PEDÁGIOS / TAGS',
        saldo: '90',
      }),
    ];

    const result = aggregateRows(rows)!;
    const detalhes = result.detalhes['PEDÁGIOS / TAGS'];
    expect(detalhes).toBeDefined();
    expect(detalhes.quantidade).toBe(2);
    expect(detalhes.total).toBeCloseTo(-31.05, 2);
    expect(detalhes.registros).toHaveLength(2);
    expect(detalhes.registros[0].documento).toBe('TG1');
  });

  it('produz formato compatível com dashboard.json (resumo + categorias + diario + detalhes)', () => {
    const rows: AggregateRow[] = [
      row({
        valor: '5000.00',
        dataTimestamp: new Date('2026-04-27'),
        categoria: 'RECEITAS',
        descricao: 'Frete',
      }),
      row({
        valor: '-500.00',
        dataTimestamp: new Date('2026-05-15'),
        categoria: 'COMBUSTÍVEL / POSTO',
        descricao: 'Posto SIM',
      }),
    ];

    const result = aggregateRows(rows)!;
    // resumo
    expect(result.resumo.periodo_inicio).toBe('27/04/2026');
    expect(result.resumo.periodo_fim).toBe('15/05/2026');
    // diario tem 2 dias e está ordenado
    expect(result.diario).toHaveLength(2);
    expect(result.diario[0].data_full).toBe('2026-04-27');
    expect(result.diario[1].data_full).toBe('2026-05-15');
    // detalhes inclui ambas as categorias
    expect(result.detalhes['RECEITAS']).toBeDefined();
    expect(result.detalhes['COMBUSTÍVEL / POSTO']).toBeDefined();
  });

  it('preserva ordem cronológica do diário mesmo com linhas fora de ordem', () => {
    const rows: AggregateRow[] = [
      row({ dataTimestamp: new Date('2026-05-15'), valor: '-100' }),
      row({ dataTimestamp: new Date('2026-04-01'), valor: '-200' }),
      row({ dataTimestamp: new Date('2026-05-01'), valor: '-300' }),
    ];

    const result = aggregateRows(rows)!;
    const dates = result.diario.map((d) => d.data_full);
    expect(dates).toEqual(['2026-04-01', '2026-05-01', '2026-05-15']);
  });

  it('aceita valores como string ou number indiferentemente', () => {
    const rows: AggregateRow[] = [
      row({ valor: 5000, categoria: 'RECEITAS' }),
      row({ valor: '-500.50', categoria: 'OUTROS' }),
    ];
    const result = aggregateRows(rows)!;
    expect(result.resumo.total_receitas).toBe(5000);
    expect(result.resumo.total_despesas).toBe(-500.5);
  });
});

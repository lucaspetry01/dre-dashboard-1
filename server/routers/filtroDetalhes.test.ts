import { describe, expect, it } from 'vitest';

// Replica funções do Dashboard para teste isolado
function parseDataBr(dataStr: string): Date | null {
  if (!dataStr) return null;
  const parts = dataStr.split('/');
  if (parts.length !== 3) return null;
  const [dia, mes, ano] = parts;
  return new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T00:00:00`);
}

function filtrarDetalhes(
  detalhes: Record<string, any>,
  startDate: string,
  endDate: string
): Record<string, any> {
  if (!startDate && !endDate) return detalhes;

  const start = startDate ? new Date(startDate + 'T00:00:00') : new Date('1900-01-01');
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-12-31');

  const filtered: Record<string, any> = {};
  Object.keys(detalhes).forEach(catName => {
    const cat = detalhes[catName];
    const registrosFiltrados = (cat?.registros || []).filter((r: any) => {
      const dataObj = parseDataBr(r.data);
      if (!dataObj) return false;
      return dataObj >= start && dataObj <= end;
    });

    if (registrosFiltrados.length > 0) {
      const total = registrosFiltrados.reduce((sum: number, r: any) => sum + (r.valor || 0), 0);
      filtered[catName] = {
        total,
        quantidade: registrosFiltrados.length,
        registros: registrosFiltrados,
      };
    }
  });
  return filtered;
}

const detalhesMock = {
  'COMBUSTÍVEL': {
    total: -1500,
    quantidade: 3,
    registros: [
      { data: '01/05/2026', descricao: 'Posto SIM', valor: -500, saldo: 1000 },
      { data: '15/05/2026', descricao: 'Posto Nobre', valor: -500, saldo: 500 },
      { data: '31/05/2026', descricao: 'Posto BR', valor: -500, saldo: 0 },
    ],
  },
  'PEDÁGIO': {
    total: -100,
    quantidade: 2,
    registros: [
      { data: '15/04/2026', descricao: 'Pedágio ERS-115', valor: -50, saldo: 1500 },
      { data: '20/05/2026', descricao: 'Pedágio ERS-115', valor: -50, saldo: 950 },
    ],
  },
};

describe('Filtro de Detalhes por Data', () => {
  it('parseDataBr converte DD/MM/YYYY para Date', () => {
    const d = parseDataBr('15/05/2026');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4); // maio é índice 4
    expect(d?.getDate()).toBe(15);
  });

  it('retorna todos os detalhes quando sem filtro', () => {
    const result = filtrarDetalhes(detalhesMock, '', '');
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('filtra apenas registros de maio/2026 (01/05 a 31/05)', () => {
    const result = filtrarDetalhes(detalhesMock, '2026-05-01', '2026-05-31');
    expect(result['COMBUSTÍVEL']).toBeDefined();
    expect(result['COMBUSTÍVEL'].quantidade).toBe(3);
    expect(result['COMBUSTÍVEL'].total).toBe(-1500);

    expect(result['PEDÁGIO']).toBeDefined();
    expect(result['PEDÁGIO'].quantidade).toBe(1); // só o de 20/05
    expect(result['PEDÁGIO'].total).toBe(-50);
  });

  it('omite categorias sem registros no período', () => {
    const result = filtrarDetalhes(detalhesMock, '2026-06-01', '2026-06-30');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('filtra apenas o primeiro registro do mês', () => {
    const result = filtrarDetalhes(detalhesMock, '2026-05-01', '2026-05-10');
    expect(result['COMBUSTÍVEL'].quantidade).toBe(1);
    expect(result['COMBUSTÍVEL'].registros[0].data).toBe('01/05/2026');
    expect(result['PEDÁGIO']).toBeUndefined();
  });

  it('recalcula total corretamente após filtro', () => {
    const result = filtrarDetalhes(detalhesMock, '2026-05-15', '2026-05-31');
    expect(result['COMBUSTÍVEL'].total).toBe(-1000); // 15/05 e 31/05
    expect(result['COMBUSTÍVEL'].quantidade).toBe(2);
  });
});

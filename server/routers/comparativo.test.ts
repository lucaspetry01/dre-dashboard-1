import { describe, expect, it } from 'vitest';

/**
 * Função pura que replica a lógica de cálculo de variação percentual
 * usada no Dashboard.tsx para comparativo entre períodos.
 */
function calcularVariacao(atual: number, anterior: number): { valor: number; positivo: boolean } | null {
  if (anterior === 0) return null;
  const variacao = ((atual - anterior) / Math.abs(anterior)) * 100;
  return { valor: Math.abs(variacao), positivo: variacao >= 0 };
}

/**
 * Função que calcula o período anterior baseado em datas
 */
function calcularPeriodoAnterior(startDate: string, endDate: string): { prevStart: Date; prevEnd: Date } {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  const diffMs = end.getTime() - start.getTime();
  
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  
  return { prevStart, prevEnd };
}

describe('Comparativo Percentual', () => {
  it('calcula variação positiva corretamente', () => {
    const result = calcularVariacao(150, 100);
    expect(result).not.toBeNull();
    expect(result?.valor).toBe(50);
    expect(result?.positivo).toBe(true);
  });

  it('calcula variação negativa corretamente', () => {
    const result = calcularVariacao(80, 100);
    expect(result).not.toBeNull();
    expect(result?.valor).toBe(20);
    expect(result?.positivo).toBe(false);
  });

  it('retorna null quando o anterior é zero (evita divisão por zero)', () => {
    const result = calcularVariacao(100, 0);
    expect(result).toBeNull();
  });

  it('lida com valores negativos (despesas)', () => {
    // Despesa aumentou de -1000 para -1500 (50% mais despesa)
    const result = calcularVariacao(-1500, -1000);
    expect(result).not.toBeNull();
    expect(result?.valor).toBe(50);
    expect(result?.positivo).toBe(false); // -1500 é menor que -1000
  });

  it('calcula período anterior com mesmo intervalo de dias', () => {
    const { prevStart, prevEnd } = calcularPeriodoAnterior('2026-05-21', '2026-05-27');
    
    // Período de 7 dias: anterior deve ser 14/05 a 20/05
    expect(prevEnd.toISOString().split('T')[0]).toBe('2026-05-20');
    expect(prevStart.toISOString().split('T')[0]).toBe('2026-05-14');
  });

  it('calcula período anterior para "Último Mês" (30 dias)', () => {
    const { prevStart, prevEnd } = calcularPeriodoAnterior('2026-04-28', '2026-05-27');
    
    // Período anterior: 30 dias antes
    expect(prevEnd.toISOString().split('T')[0]).toBe('2026-04-27');
    expect(prevStart.toISOString().split('T')[0]).toBe('2026-03-29');
  });
});

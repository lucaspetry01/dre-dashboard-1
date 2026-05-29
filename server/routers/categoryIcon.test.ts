import { describe, expect, it } from 'vitest';

/**
 * Replica a lógica de mapeamento de categorias para teste isolado.
 * Espelha o comportamento de getCategoryIconConfig em client/src/components/CategoryIcon.tsx
 */
function getCategoryKey(categoryName: string): string {
  const name = categoryName.toUpperCase();

  // IMPOSTO antes de POSTO (pois 'IMPOSTOS' contém 'POSTO')
  if (name.includes('IMPOSTO') || name.includes('TRIBUTO') || name.includes('OUTROS')) return 'tax';
  if (name.includes('COMBUST') || name.includes('POSTO')) return 'fuel';
  if (name.includes('CONTA') || name.includes('BOLETO') || name.includes('SAQUE')) return 'bill';
  if (name.includes('CHAPA') || name.includes('OPERACIONAL PF')) return 'people';
  if (name.includes('PAGAMENTO')) return 'payment';
  if (name.includes('PRÓ-LABORE') || name.includes('PRO-LABORE') || name.includes('SOCIET')) return 'business';
  if (name.includes('MECÂNICA') || name.includes('MECANICA') || name.includes('MANUTEN')) return 'wrench';
  if (name.includes('PEDÁGIO') || name.includes('PEDAGIO') || name.includes('TAGS')) return 'pin';
  if (name.includes('CUSTO') || name.includes('ESPECÍFICO') || name.includes('ESPECIFICO')) return 'package';

  return 'default';
}

describe('CategoryIcon mapping', () => {
  it('mapeia COMBUSTÍVEL / POSTO para ícone fuel', () => {
    expect(getCategoryKey('COMBUSTÍVEL / POSTO')).toBe('fuel');
  });

  it('mapeia CONTA / BOLETO para ícone bill', () => {
    expect(getCategoryKey('CONTA / BOLETO')).toBe('bill');
  });

  it('mapeia CHAPA / OPERACIONAL PF para ícone people', () => {
    expect(getCategoryKey('CHAPA / OPERACIONAL PF')).toBe('people');
  });

  it('mapeia PAGAMENTOS para ícone payment', () => {
    expect(getCategoryKey('PAGAMENTOS')).toBe('payment');
  });

  it('mapeia PRÓ-LABORE / SOCIETÁRIO para ícone business', () => {
    expect(getCategoryKey('PRÓ-LABORE / SOCIETÁRIO')).toBe('business');
  });

  it('mapeia MECÂNICA / MANUTENÇÃO para ícone wrench', () => {
    expect(getCategoryKey('MECÂNICA / MANUTENÇÃO')).toBe('wrench');
  });

  it('mapeia IMPOSTOS / TRIBUTOS / OUTROS para ícone tax', () => {
    expect(getCategoryKey('IMPOSTOS / TRIBUTOS / OUTROS')).toBe('tax');
  });

  it('mapeia PEDÁGIOS / TAGS para ícone pin', () => {
    expect(getCategoryKey('PEDÁGIOS / TAGS')).toBe('pin');
  });

  it('mapeia CUSTO OPERACIONAL ESPECÍFICO para ícone package', () => {
    expect(getCategoryKey('CUSTO OPERACIONAL ESPECÍFICO')).toBe('package');
  });

  it('retorna ícone default para categoria desconhecida', () => {
    expect(getCategoryKey('CATEGORIA INEXISTENTE XYZ')).toBe('default');
  });

  it('é case-insensitive', () => {
    expect(getCategoryKey('combustível')).toBe('fuel');
    expect(getCategoryKey('Conta')).toBe('bill');
  });
});

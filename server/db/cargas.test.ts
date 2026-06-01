import { describe, it, expect } from 'vitest';

/**
 * Testes para validar o cálculo dinâmico de custos fixos e retenção
 * Motorista: R$ 220 (fixo)
 * Chapa 1: R$ 150 (se selecionada, senão R$ 0)
 * Chapa 2: R$ 150 (se selecionada, senão R$ 0)
 * Valor Retido: 10% do Valor Frete
 * Valor Líquido Frete: Valor Frete - Valor Retido
 * Lucro: Valor Líquido Frete - Custo Total
 */

describe('Cálculo de Custos Fixos Dinâmicos', () => {
  it('deve calcular custoFixo = 220 quando nenhuma chapa é selecionada', () => {
    // Motorista: 220, Chapa1: 0, Chapa2: 0 = 220
    const valorCombustivel = 100;
    const manutencao = 50;
    const custoOutros = 25;
    const valorFrete = 500;

    const custoMotorista = 220;
    const custoChapa1 = 0; // nenhuma
    const custoChapa2 = 0; // nenhuma
    const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
    const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
    
    // Cálculo de retenção e frete líquido
    const valorRetido = valorFrete * 0.1; // 10% de retenção
    const valorLiquidoFrete = valorFrete - valorRetido;
    const lucro = valorLiquidoFrete - custoTotal;

    expect(custoFixo).toBe(220);
    expect(custoTotal).toBe(395); // 100 + 50 + 25 + 220
    expect(valorRetido).toBe(50); // 10% de 500
    expect(valorLiquidoFrete).toBe(450); // 500 - 50
    expect(lucro).toBe(55); // 450 - 395
  });

  it('deve calcular custoFixo = 370 quando uma chapa é selecionada', () => {
    // Motorista: 220, Chapa1: 150, Chapa2: 0 = 370
    const valorCombustivel = 100;
    const manutencao = 50;
    const custoOutros = 25;
    const valorFrete = 500;

    const custoMotorista = 220;
    const custoChapa1 = 150; // selecionada
    const custoChapa2 = 0; // nenhuma
    const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
    const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
    
    // Cálculo de retenção e frete líquido
    const valorRetido = valorFrete * 0.1; // 10% de retenção
    const valorLiquidoFrete = valorFrete - valorRetido;
    const lucro = valorLiquidoFrete - custoTotal;

    expect(custoFixo).toBe(370);
    expect(custoTotal).toBe(545); // 100 + 50 + 25 + 370
    expect(valorRetido).toBe(50); // 10% de 500
    expect(valorLiquidoFrete).toBe(450); // 500 - 50
    expect(lucro).toBe(-95); // 450 - 545
  });

  it('deve calcular custoFixo = 520 quando ambas as chapas são selecionadas', () => {
    // Motorista: 220, Chapa1: 150, Chapa2: 150 = 520
    const valorCombustivel = 100;
    const manutencao = 50;
    const custoOutros = 25;
    const valorFrete = 500;

    const custoMotorista = 220;
    const custoChapa1 = 150; // selecionada
    const custoChapa2 = 150; // selecionada
    const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
    const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
    
    // Cálculo de retenção e frete líquido
    const valorRetido = valorFrete * 0.1; // 10% de retenção
    const valorLiquidoFrete = valorFrete - valorRetido;
    const lucro = valorLiquidoFrete - custoTotal;

    expect(custoFixo).toBe(520);
    expect(custoTotal).toBe(695); // 100 + 50 + 25 + 520
    expect(valorRetido).toBe(50); // 10% de 500
    expect(valorLiquidoFrete).toBe(450); // 500 - 50
    expect(lucro).toBe(-245); // 450 - 695
  });

  it('deve calcular custoFixo = 370 quando apenas chapa2 é selecionada', () => {
    // Motorista: 220, Chapa1: 0, Chapa2: 150 = 370
    const valorCombustivel = 100;
    const manutencao = 50;
    const custoOutros = 25;
    const valorFrete = 500;

    const custoMotorista = 220;
    const custoChapa1 = 0; // nenhuma
    const custoChapa2 = 150; // selecionada
    const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
    const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
    
    // Cálculo de retenção e frete líquido
    const valorRetido = valorFrete * 0.1; // 10% de retenção
    const valorLiquidoFrete = valorFrete - valorRetido;
    const lucro = valorLiquidoFrete - custoTotal;

    expect(custoFixo).toBe(370);
    expect(custoTotal).toBe(545); // 100 + 50 + 25 + 370
    expect(valorRetido).toBe(50); // 10% de 500
    expect(valorLiquidoFrete).toBe(450); // 500 - 50
    expect(lucro).toBe(-95); // 450 - 545
  });

  it('deve detectar string vazia como "nenhuma chapa"', () => {
    const chapa1 = '';
    const chapa2 = 'DOUGLAS';

    const custoChapa1 = chapa1 && chapa1.trim() !== '' ? 150 : 0;
    const custoChapa2 = chapa2 && chapa2.trim() !== '' ? 150 : 0;

    expect(custoChapa1).toBe(0);
    expect(custoChapa2).toBe(150);
  });

  it('deve detectar string com espaços como "nenhuma chapa"', () => {
    const chapa1 = '   ';
    const chapa2 = 'DJOE';

    const custoChapa1 = chapa1 && chapa1.trim() !== '' ? 150 : 0;
    const custoChapa2 = chapa2 && chapa2.trim() !== '' ? 150 : 0;

    expect(custoChapa1).toBe(0);
    expect(custoChapa2).toBe(150);
  });

  it('deve validar lucro positivo quando frete líquido > custoTotal', () => {
    const valorCombustivel = 50;
    const manutencao = 20;
    const custoOutros = 10;
    const valorFrete = 1000;

    const custoMotorista = 220;
    const custoChapa1 = 150;
    const custoChapa2 = 0;
    const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
    const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
    
    // Cálculo de retenção e frete líquido
    const valorRetido = valorFrete * 0.1; // 10% de retenção
    const valorLiquidoFrete = valorFrete - valorRetido;
    const lucro = valorLiquidoFrete - custoTotal;

    expect(custoTotal).toBe(450); // 50 + 20 + 10 + 370
    expect(valorRetido).toBe(100); // 10% de 1000
    expect(valorLiquidoFrete).toBe(900); // 1000 - 100
    expect(lucro).toBe(450); // 900 - 450
    expect(lucro).toBeGreaterThan(0);
  });
});

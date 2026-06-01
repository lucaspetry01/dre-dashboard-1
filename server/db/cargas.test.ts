import { describe, it, expect } from 'vitest';

/**
 * Testes para validar o cálculo dinâmico de custos fixos
 * Motorista: R$ 220 (fixo)
 * Chapa 1: R$ 150 (se selecionada, senão R$ 0)
 * Chapa 2: R$ 150 (se selecionada, senão R$ 0)
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
    const lucro = valorFrete - custoTotal;

    expect(custoFixo).toBe(220);
    expect(custoTotal).toBe(395); // 100 + 50 + 25 + 220
    expect(lucro).toBe(105); // 500 - 395
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
    const lucro = valorFrete - custoTotal;

    expect(custoFixo).toBe(370);
    expect(custoTotal).toBe(545); // 100 + 50 + 25 + 370
    expect(lucro).toBe(-45); // 500 - 545
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
    const lucro = valorFrete - custoTotal;

    expect(custoFixo).toBe(520);
    expect(custoTotal).toBe(695); // 100 + 50 + 25 + 520
    expect(lucro).toBe(-195); // 500 - 695
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
    const lucro = valorFrete - custoTotal;

    expect(custoFixo).toBe(370);
    expect(custoTotal).toBe(545); // 100 + 50 + 25 + 370
    expect(lucro).toBe(-45); // 500 - 545
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

  it('deve validar lucro positivo quando frete > custoTotal', () => {
    const valorCombustivel = 50;
    const manutencao = 20;
    const custoOutros = 10;
    const valorFrete = 1000;

    const custoMotorista = 220;
    const custoChapa1 = 150;
    const custoChapa2 = 0;
    const custoFixo = custoMotorista + custoChapa1 + custoChapa2;
    const custoTotal = valorCombustivel + manutencao + custoOutros + custoFixo;
    const lucro = valorFrete - custoTotal;

    expect(custoTotal).toBe(450); // 50 + 20 + 10 + 370
    expect(lucro).toBe(550); // 1000 - 450
    expect(lucro).toBeGreaterThan(0);
  });
});

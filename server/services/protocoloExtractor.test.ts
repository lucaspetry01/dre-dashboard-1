import { describe, it, expect } from 'vitest';
import { extrairDadosProtocolo, validarDadosProtocolo } from './protocoloExtractor.js';

describe('protocoloExtractor', () => {
  const pdfTextSample = `
    Administração de Vendas
    Protocolo de Entregas
    Protocolo: 112193
    
    Valor Total Frete: 586,84
    Peso Bruto Total: 2.600,00
    Peso Líquido Total: 2.600,00
    
    COMPANHIA CLARA LTDA
    MADERO QUARESME LTDA
    
    SAO LEOPOLDO, 26 de julho de 2026
    
    Transportador: TRANSPORTES MORAIS & PETRY LTDA ME
  `;

  it('deve extrair número do protocolo corretamente', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(dados.numeroProtocolo).toBe('112193');
  });

  it('deve extrair valor do frete corretamente', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(dados.valorFrete).toBe(586.84);
  });

  it('deve extrair peso total corretamente', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(dados.pesoTotal).toBe(2600);
  });

  it('deve extrair data corretamente', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(dados.data).toBe('2026-07-26');
  });

  it('deve extrair clientes corretamente', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(dados.clientes.length).toBeGreaterThan(0);
  });

  it('deve extrair transportadora corretamente', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(dados.transportadora).toContain('TRANSPORTES');
  });

  it('deve validar dados válidos como corretos', () => {
    const dados = extrairDadosProtocolo(pdfTextSample);
    expect(validarDadosProtocolo(dados)).toBe(true);
  });

  it('deve validar dados inválidos como incorretos', () => {
    const dadosInvalidos = {
      numeroProtocolo: '',
      data: '',
      valorFrete: 0,
      pesoTotal: 0,
      clientes: []
    };
    expect(validarDadosProtocolo(dadosInvalidos)).toBe(false);
  });

  it('deve lidar com formato de data DD/MM/YYYY', () => {
    const pdfText = `
      Protocolo: 112193
      Data: 26/07/2026
      Valor Total Frete: 586,84
      Peso Bruto Total: 2.600,00
    `;
    const dados = extrairDadosProtocolo(pdfText);
    expect(dados.data).toBe('2026-07-26');
  });

  it('deve lidar com valores sem formatação', () => {
    const pdfText = `
      Protocolo: 112193
      Valor Total Frete: 586.84
      Peso Bruto Total: 2600.00
      Data: 26 de julho de 2026
    `;
    const dados = extrairDadosProtocolo(pdfText);
    expect(dados.valorFrete).toBeGreaterThan(0);
    expect(dados.pesoTotal).toBeGreaterThan(0);
  });
});

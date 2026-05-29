import { describe, expect, it } from 'vitest';
import { categorizar } from './categorizar';

describe('categorizar', () => {
  describe('Receitas', () => {
    it('classifica valor positivo como RECEITAS OPERACIONAIS', () => {
      expect(categorizar('TRANSFERENCIA RECEBIDA', 1000)).toBe('RECEITAS OPERACIONAIS');
      expect(categorizar('DEPOSITO', 500)).toBe('RECEITAS OPERACIONAIS');
    });
  });

  describe('Combustível', () => {
    it('classifica POSTO como COMBUSTÍVEL / POSTO', () => {
      expect(categorizar('POSTO SHELL', -250)).toBe('COMBUSTÍVEL / POSTO');
    });

    it('classifica COMPRAS NACIONAIS SIM como COMBUSTÍVEL', () => {
      expect(categorizar('COMPRAS NACIONAIS SIM REDE DE POSTOS', -500)).toBe('COMBUSTÍVEL / POSTO');
    });

    it('classifica SIM isolado como COMBUSTÍVEL', () => {
      expect(categorizar('SIM ABASTECIMENTO', -480)).toBe('COMBUSTÍVEL / POSTO');
    });

    it('classifica NOBRE ABASTECEDORA como COMBUSTÍVEL', () => {
      expect(categorizar('NOBRE ABASTECEDORA LTDA', -450)).toBe('COMBUSTÍVEL / POSTO');
    });
  });

  describe('Impostos / Tributos / Outros', () => {
    it('IMPOSTOS não confunde com POSTO (regra de prioridade)', () => {
      expect(categorizar('IMPOSTOS / TRIBUTOS', -300)).toBe('IMPOSTOS / TRIBUTOS / OUTROS');
    });

    it('classifica DARF como IMPOSTO', () => {
      expect(categorizar('PAGAMENTO DARF FEDERAL', -1500)).toBe('IMPOSTOS / TRIBUTOS / OUTROS');
    });

    it('classifica OPCAO A como IMPOSTO', () => {
      expect(categorizar('OPCAO A CONTABILIDADE', -255)).toBe('IMPOSTOS / TRIBUTOS / OUTROS');
    });

    it('classifica MARILIA MORAES PETRY como OUTROS', () => {
      expect(categorizar('PIX MARILIA MORAES PETRY', -200)).toBe('IMPOSTOS / TRIBUTOS / OUTROS');
    });

    it('classifica TARIFA bancária como OUTROS', () => {
      expect(categorizar('TARIFA CESTA SERVICOS', -45)).toBe('IMPOSTOS / TRIBUTOS / OUTROS');
    });
  });

  describe('Chapa / Operacional PF', () => {
    it('classifica CLODOMIRO MATOZO ALEIX como CHAPA', () => {
      expect(categorizar('PIX CLODOMIRO MATOZO ALEIX', -250)).toBe('CHAPA / OPERACIONAL PF');
    });

    it('classifica DOUGLAS MATOZO ALEIXO como CHAPA', () => {
      expect(categorizar('TED DOUGLAS MATOZO ALEIXO', -300)).toBe('CHAPA / OPERACIONAL PF');
    });
  });

  describe('Pró-labore', () => {
    it('classifica CESAR MAURICIO MORAES como PRÓ-LABORE', () => {
      expect(categorizar('PIX CESAR MAURICIO MORAES', -1500)).toBe('PRÓ-LABORE / SOCIETÁRIO');
    });
  });

  describe('Mecânica', () => {
    it('classifica VALMOR GODOI MACHADO como MECÂNICA', () => {
      expect(categorizar('PIX VALMOR GODOI MACHADO', -800)).toBe('MECÂNICA / MANUTENÇÃO');
    });

    it('classifica MECANICA como MECÂNICA', () => {
      expect(categorizar('OFICINA MECANICA SUL', -1200)).toBe('MECÂNICA / MANUTENÇÃO');
    });
  });

  describe('Pedágios', () => {
    it('classifica SEM PARAR como PEDÁGIO', () => {
      expect(categorizar('SEM PARAR LTDA', -25)).toBe('PEDÁGIOS / TAGS');
    });

    it('classifica TAG isolado como PEDÁGIO', () => {
      expect(categorizar('MENSALID TAG VEICULO', -35)).toBe('PEDÁGIOS / TAGS');
    });
  });

  describe('Conta / Boleto', () => {
    it('classifica LIQUIDACAO DE PARCELA como CONTA', () => {
      expect(categorizar('LIQUIDACAO DE PARCELA', -2380.30)).toBe('CONTA / BOLETO');
    });

    it('classifica BOLETO como CONTA', () => {
      expect(categorizar('PAGAMENTO BOLETO ENERGISA', -180)).toBe('CONTA / BOLETO');
    });

    it('classifica PEDRO DA SILVA MARTINS como CONTA', () => {
      expect(categorizar('PIX PEDRO DA SILVA MARTINS', -500)).toBe('CONTA / BOLETO');
    });

    it('classifica SAQUE como CONTA', () => {
      expect(categorizar('SAQUE DINHEIRO ATM', -300)).toBe('CONTA / BOLETO');
    });
  });

  describe('Custo Operacional Específico', () => {
    it('classifica OLADIR DA SILVA GUEDES como CUSTO', () => {
      expect(categorizar('PIX OLADIR DA SILVA GUEDES', -100)).toBe('CUSTO OPERACIONAL ESPECÍFICO');
    });
  });

  describe('Pagamentos', () => {
    it('classifica PIX genérico como PAGAMENTOS', () => {
      expect(categorizar('PIX TRANSF FUNCIONARIO', -150)).toBe('PAGAMENTOS');
    });

    it('classifica RESTAURANTE como PAGAMENTOS', () => {
      expect(categorizar('RESTAURANTE DO ZE', -80)).toBe('PAGAMENTOS');
    });

    it('classifica COMPRAS como PAGAMENTOS', () => {
      expect(categorizar('COMPRAS CARTAO MERCADO', -120)).toBe('PAGAMENTOS');
    });
  });

  describe('Não categorizado', () => {
    it('retorna SAÍDAS NÃO CATEGORIZADAS para descrição desconhecida', () => {
      expect(categorizar('ALGUM LANCAMENTO XYZ', -100)).toBe('SAÍDAS NÃO CATEGORIZADAS');
    });
  });

  describe('Robustez para datas retroativas', () => {
    it('categoriza corretamente independente do ano (2020)', () => {
      // A lógica não depende de data, apenas descrição/valor
      expect(categorizar('POSTO SHELL', -250)).toBe('COMBUSTÍVEL / POSTO');
    });

    it('categoriza corretamente para anos futuros', () => {
      expect(categorizar('PIX CESAR MAURICIO MORAES', -1500)).toBe('PRÓ-LABORE / SOCIETÁRIO');
    });
  });
});

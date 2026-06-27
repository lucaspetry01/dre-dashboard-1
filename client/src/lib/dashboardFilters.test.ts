import { describe, it, expect } from 'vitest';
import {
  extractNomeProprio,
  simplifyCategoriName,
  getAccountBucket,
  groupRegistrosByDescription,
  filterDetalhesByAccounts,
  calculateFilteredCategorias,
  calculateFilteredResumo,
} from './dashboardFilters';

describe('dashboardFilters', () => {
  describe('extractNomeProprio', () => {
    it('extrai o nome que vem depois do CNPJ (14 dígitos)', () => {
      expect(extractNomeProprio('PAGAMENTO 24853275000136 TR PETRY LTDA')).toBe('TR PETRY LTDA');
    });

    it('extrai o nome que vem depois do CPF (11 dígitos)', () => {
      expect(extractNomeProprio('PIX 12345678901 JOAO DA SILVA')).toBe('JOAO DA SILVA');
    });

    it('retorna a descrição original quando não há CPF/CNPJ', () => {
      expect(extractNomeProprio('TARIFA BANCARIA')).toBe('TARIFA BANCARIA');
    });

    it('retorna a descrição original quando CPF/CNPJ é o último token', () => {
      expect(extractNomeProprio('PAGAMENTO 24853275000136')).toBe('PAGAMENTO 24853275000136');
    });
  });

  describe('simplifyCategoriName', () => {
    it('mapeia categorias conhecidas para nomes curtos', () => {
      expect(simplifyCategoriName('RECEITAS OPERACIONAIS')).toBe('Receita');
      expect(simplifyCategoriName('COMBUSTÍVEL / POSTO')).toBe('Combustível');
      expect(simplifyCategoriName('PEDÁGIOS / TAGS')).toBe('Pedágios');
    });

    it('retorna o nome original para categorias desconhecidas', () => {
      expect(simplifyCategoriName('CATEGORIA NOVA')).toBe('CATEGORIA NOVA');
    });
  });

  describe('getAccountBucket', () => {
    it('retorna um índice dentro do intervalo de contas', () => {
      const bucket = getAccountBucket('alguma descricao', 2);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(2);
    });

    it('é determinístico para a mesma entrada', () => {
      expect(getAccountBucket('teste', 2)).toBe(getAccountBucket('teste', 2));
    });
  });

  describe('groupRegistrosByDescription', () => {
    it('retorna os registros inalterados quando groupByDescription é false', () => {
      const registros = [{ descricao: 'A', valor: 10 }, { descricao: 'B', valor: 20 }];
      expect(groupRegistrosByDescription(registros, false)).toEqual(registros);
    });

    it('agrupa registros por nome e soma valores', () => {
      const registros = [
        { descricao: 'PIX 12345678901 JOAO DA SILVA', valor: 100 },
        { descricao: 'PIX 12345678901 JOAO DA SILVA', valor: 50 },
      ];
      const result = groupRegistrosByDescription(registros, true);
      expect(result).toHaveLength(1);
      expect(result[0].valor).toBe(150);
      expect(result[0].count).toBe(2);
    });

    it('ordena os grupos por valor absoluto decrescente', () => {
      const registros = [
        { descricao: 'PIX 11111111111 ALICE PEQUENA', valor: 10 },
        { descricao: 'PIX 22222222222 BRUNO GRANDE', valor: -500 },
      ];
      const result = groupRegistrosByDescription(registros, true);
      expect(Math.abs(result[0].valor)).toBeGreaterThanOrEqual(Math.abs(result[1].valor));
    });
  });

  describe('filterDetalhesByAccounts', () => {
    const cnpjMap = { mp: '24.853.275/0001-36', mmp: '51.621.925/0001-90' };
    const detalhes = {
      Receita: {
        total: 300,
        quantidade: 2,
        registros: [
          { valor: 100, cnpj: '24.853.275/0001-36' },
          { valor: 200, cnpj: '51.621.925/0001-90' },
        ],
      },
    };

    it('retorna todos os detalhes quando nenhuma conta está selecionada', () => {
      expect(filterDetalhesByAccounts(detalhes, [], cnpjMap)).toBe(detalhes);
    });

    it('filtra registros pelo CNPJ da conta selecionada', () => {
      const result = filterDetalhesByAccounts(detalhes, ['mp'], cnpjMap);
      expect(result.Receita.registros).toHaveLength(1);
      expect(result.Receita.total).toBe(100);
      expect(result.Receita.quantidade).toBe(1);
    });

    it('remove categorias sem registros após o filtro', () => {
      const semMatch = filterDetalhesByAccounts(detalhes, ['mp'], { mp: 'CNPJ INEXISTENTE' });
      expect(Object.keys(semMatch)).toHaveLength(0);
    });
  });

  describe('calculateFilteredCategorias', () => {
    it('converte detalhes filtrados em lista de categorias ordenada', () => {
      const filtered = {
        Boleto: { total: -100, quantidade: 1 },
        Receita: { total: 500, quantidade: 2 },
      };
      const result = calculateFilteredCategorias(filtered, []);
      expect(result[0].nome).toBe('Receita');
      expect(result[0].valor_abs).toBe(500);
      expect(result[1].nome).toBe('Boleto');
    });
  });

  describe('calculateFilteredResumo', () => {
    it('soma receitas e despesas separadamente', () => {
      const filtered = {
        Cat: {
          registros: [
            { valor: 100 },
            { valor: 200 },
            { valor: -50 },
          ],
        },
      };
      const result = calculateFilteredResumo(filtered, { nome: 'base' });
      expect(result.total_receitas).toBe(300);
      expect(result.total_despesas).toBe(-50);
      expect(result.resultado).toBe(250);
      expect(result.qtd_receitas).toBe(2);
      expect(result.qtd_despesas).toBe(1);
      expect(result.nome).toBe('base');
    });
  });
});

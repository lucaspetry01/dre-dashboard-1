import { describe, it, expect, vi } from 'vitest';
import {
  verificarDuplicata,
  buscarProtocolosDoGmail,
  processarPdfProtocolo,
  sincronizarTodosProtocolos,
  obterProtocolosSincronizados,
} from './gmailProtocoloIntegration.js';

describe('Gmail Protocolo Integration', () => {
  describe('buscarProtocolosDoGmail', () => {
    it('deve retornar array vazio por enquanto (placeholder)', async () => {
      const resultado = await buscarProtocolosDoGmail(30);
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });

    it('deve aceitar diasAtras customizado', async () => {
      const resultado = await buscarProtocolosDoGmail(60);
      expect(Array.isArray(resultado)).toBe(true);
    });
  });

  describe('verificarDuplicata', () => {
    it('deve retornar false para protocolo inexistente', async () => {
      const resultado = await verificarDuplicata('PROTOCOLO_INEXISTENTE_12345');
      expect(resultado).toBe(false);
    });
  });

  describe('processarPdfProtocolo', () => {
    it('deve retornar null para PDF vazio', async () => {
      const pdfBuffer = Buffer.from('');
      const resultado = await processarPdfProtocolo(pdfBuffer, 'msg123');
      expect(resultado).toBeNull();
    });

    it('deve aceitar pdfUrl opcional', async () => {
      const pdfBuffer = Buffer.from('');
      const resultado = await processarPdfProtocolo(
        pdfBuffer,
        'msg123',
        'https://example.com/protocolo.pdf'
      );
      expect(resultado).toBeNull();
    });
  });

  describe('sincronizarTodosProtocolos', () => {
    it('deve retornar estrutura correta de resultado', async () => {
      const resultado = await sincronizarTodosProtocolos(30);
      
      expect(resultado).toHaveProperty('sucesso');
      expect(resultado).toHaveProperty('protocolos');
      expect(resultado).toHaveProperty('erros');
      expect(resultado).toHaveProperty('total');
      expect(resultado).toHaveProperty('processados');
      
      expect(Array.isArray(resultado.protocolos)).toBe(true);
      expect(Array.isArray(resultado.erros)).toBe(true);
      expect(typeof resultado.total).toBe('number');
      expect(typeof resultado.processados).toBe('number');
    });

    it('deve ter sucesso=true quando nao ha emails', async () => {
      const resultado = await sincronizarTodosProtocolos(30);
      expect(resultado.sucesso).toBe(true);
      expect(resultado.total).toBe(0);
      expect(resultado.processados).toBe(0);
    });

    it('deve aceitar diasAtras customizado', async () => {
      const resultado = await sincronizarTodosProtocolos(60);
      expect(resultado).toHaveProperty('sucesso');
    });
  });

  describe('obterProtocolosSincronizados', () => {
    it('deve retornar array', async () => {
      const resultado = await obterProtocolosSincronizados();
      expect(Array.isArray(resultado)).toBe(true);
    });

    it('deve aceitar filtros de data', async () => {
      const resultado = await obterProtocolosSincronizados(
        '2026-01-01',
        '2026-12-31'
      );
      expect(Array.isArray(resultado)).toBe(true);
    });

    it('deve retornar array vazio se nao houver dados', async () => {
      const resultado = await obterProtocolosSincronizados(
        '2020-01-01',
        '2020-12-31'
      );
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });
});

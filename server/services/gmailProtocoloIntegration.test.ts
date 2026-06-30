import { describe, it, expect } from 'vitest';
import {
  verificarDuplicata,
  buscarProtocolosDoGmail,
  sincronizarProtocolosDoGmail,
} from './gmailProtocoloIntegration.js';

describe('Gmail Protocolo Integration', () => {
  describe('buscarProtocolosDoGmail', () => {
    it('deve retornar array', async () => {
      const resultado = await buscarProtocolosDoGmail(30);
      expect(Array.isArray(resultado)).toBe(true);
    });

    it('deve aceitar diasAtras customizado', async () => {
      const resultado = await buscarProtocolosDoGmail(60);
      expect(Array.isArray(resultado)).toBe(true);
    });

    it('deve retornar GmailSearchResult com estrutura correta', async () => {
      const resultado = await buscarProtocolosDoGmail(30);
      if (resultado.length > 0) {
        const item = resultado[0];
        expect(item).toHaveProperty('messageId');
        expect(item).toHaveProperty('from');
        expect(item).toHaveProperty('subject');
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('attachments');
        expect(Array.isArray(item.attachments)).toBe(true);
      }
    });
  });

  describe('verificarDuplicata', () => {
    it('deve retornar boolean', async () => {
      const resultado = await verificarDuplicata('PROTOCOLO_TESTE_12345');
      expect(typeof resultado).toBe('boolean');
    });

    it('deve retornar false para protocolo inexistente', async () => {
      const resultado = await verificarDuplicata('PROTOCOLO_INEXISTENTE_99999');
      expect(resultado).toBe(false);
    });
  });

  describe('sincronizarProtocolosDoGmail', () => {
    it('deve retornar estrutura correta de resultado', async () => {
      const resultado = await sincronizarProtocolosDoGmail(30);
      
      expect(resultado).toHaveProperty('sucesso');
      expect(resultado).toHaveProperty('processados');
      expect(resultado).toHaveProperty('protocolos');
      expect(resultado).toHaveProperty('erros');
      
      expect(typeof resultado.sucesso).toBe('boolean');
      expect(typeof resultado.processados).toBe('number');
      expect(Array.isArray(resultado.protocolos)).toBe(true);
      expect(Array.isArray(resultado.erros)).toBe(true);
    });

    it('deve ter sucesso=true mesmo sem emails', async () => {
      const resultado = await sincronizarProtocolosDoGmail(30);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve aceitar diasAtras customizado', async () => {
      const resultado = await sincronizarProtocolosDoGmail(60);
      expect(resultado).toHaveProperty('sucesso');
    });

    it('deve retornar processados >= 0', async () => {
      const resultado = await sincronizarProtocolosDoGmail(30);
      expect(resultado.processados).toBeGreaterThanOrEqual(0);
    });
  });
});

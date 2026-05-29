import { describe, expect, it } from 'vitest';
import { parseOfx } from './parseOfx';

const SAMPLE_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>20260527120000</DTSERVER>
<LANGUAGE>POR</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1</TRNUID>
<STMTRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM>
<BANKID>748</BANKID>
<ACCTID>12345-6</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260501000000[-3:BRT]</DTSTART>
<DTEND>20260527235959[-3:BRT]</DTEND>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20260508120000[-3:BRT]</DTPOSTED>
<TRNAMT>-2380.30</TRNAMT>
<FITID>SICREDI-001</FITID>
<MEMO>LIQUIDACAO DE PARCELA</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20260515090000[-3:BRT]</DTPOSTED>
<TRNAMT>5577.98</TRNAMT>
<FITID>SICREDI-002</FITID>
<MEMO>TRANSFERENCIA RECEBIDA</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20260520150000[-3:BRT]</DTPOSTED>
<TRNAMT>-450.00</TRNAMT>
<FITID>SICREDI-003</FITID>
<MEMO>POSTO SHELL ABASTECIMENTO</MEMO>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const SGML_OFX = `OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>748
<ACCTID>9876
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260501
<DTEND>20260527
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260510
<TRNAMT>-100.00
<FITID>SGML-001
<MEMO>SGML FORMAT TEST
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

describe('parseOfx', () => {
  describe('formato XML completo', () => {
    const result = parseOfx(SAMPLE_OFX);

    it('extrai informações do banco', () => {
      expect(result.bankId).toBe('748');
      expect(result.accountId).toBe('12345-6');
    });

    it('extrai período do extrato', () => {
      expect(result.periodoInicio).toBe('01/05/2026');
      expect(result.periodoFim).toBe('27/05/2026');
    });

    it('extrai 3 transações', () => {
      expect(result.transactions).toHaveLength(3);
    });

    it('parse correto de saída (valor negativo)', () => {
      const t = result.transactions[0];
      expect(t.fitId).toBe('SICREDI-001');
      expect(t.data).toBe('08/05/2026');
      expect(t.descricao).toBe('LIQUIDACAO DE PARCELA');
      expect(t.valor).toBe(-2380.30);
      expect(t.tipo).toBe('saida');
    });

    it('parse correto de entrada (valor positivo)', () => {
      const t = result.transactions[1];
      expect(t.fitId).toBe('SICREDI-002');
      expect(t.data).toBe('15/05/2026');
      expect(t.descricao).toBe('TRANSFERENCIA RECEBIDA');
      expect(t.valor).toBe(5577.98);
      expect(t.tipo).toBe('entrada');
    });

    it('parse correto de combustível', () => {
      const t = result.transactions[2];
      expect(t.fitId).toBe('SICREDI-003');
      expect(t.descricao).toBe('POSTO SHELL ABASTECIMENTO');
      expect(t.valor).toBe(-450.00);
    });

    it('dataTimestamp é objeto Date válido', () => {
      const t = result.transactions[0];
      expect(t.dataTimestamp).toBeInstanceOf(Date);
      expect(t.dataTimestamp.getFullYear()).toBe(2026);
      expect(t.dataTimestamp.getMonth()).toBe(4); // Maio (0-indexed)
      expect(t.dataTimestamp.getDate()).toBe(8);
    });
  });

  describe('formato SGML legado', () => {
    const result = parseOfx(SGML_OFX);

    it('extrai transação do formato SGML', () => {
      expect(result.transactions).toHaveLength(1);
      const t = result.transactions[0];
      expect(t.fitId).toBe('SGML-001');
      expect(t.data).toBe('10/05/2026');
      expect(t.valor).toBe(-100);
      expect(t.descricao).toBe('SGML FORMAT TEST');
    });
  });

  describe('robustez', () => {
    it('retorna lista vazia para OFX sem transações', () => {
      const empty = parseOfx('<OFX></OFX>');
      expect(empty.transactions).toHaveLength(0);
    });

    it('ignora transações sem FITID', () => {
      const broken = `<OFX><STMTTRN><DTPOSTED>20260101</DTPOSTED><TRNAMT>-10</TRNAMT></STMTTRN></OFX>`;
      const result = parseOfx(broken);
      expect(result.transactions).toHaveLength(0);
    });

    it('ignora valores não numéricos', () => {
      const bad = `<OFX><STMTTRN><FITID>X</FITID><DTPOSTED>20260101</DTPOSTED><TRNAMT>ABC</TRNAMT></STMTTRN></OFX>`;
      const result = parseOfx(bad);
      expect(result.transactions).toHaveLength(0);
    });
  });

  describe('Sicredi: anos retroativos', () => {
    it('parseia transações de 2023 corretamente', () => {
      const ofx2023 = `<OFX><STMTTRN><FITID>OLD-001</FITID><DTPOSTED>20230315120000</DTPOSTED><TRNAMT>-500</TRNAMT><MEMO>POSTO ANTIGO</MEMO></STMTTRN></OFX>`;
      const result = parseOfx(ofx2023);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].data).toBe('15/03/2023');
      expect(result.transactions[0].dataTimestamp.getFullYear()).toBe(2023);
    });

    it('parseia transações futuras (2027)', () => {
      const ofx2027 = `<OFX><STMTTRN><FITID>NEW-001</FITID><DTPOSTED>20270101120000</DTPOSTED><TRNAMT>1000</TRNAMT><MEMO>FUTURO</MEMO></STMTTRN></OFX>`;
      const result = parseOfx(ofx2027);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].data).toBe('01/01/2027');
    });
  });
});

/**
 * Mapeamento centralizado de contas/agências para CNPJs.
 * Usado em múltiplos lugares (parseOfx, fillCnpjByAccount, etc.)
 */

export const ACCOUNT_TO_CNPJ_MAP: Record<string, string> = {
  '30085-5': '51.621.925/0001-90',      // MMP - Itaú (conta 30085-5)
  '88828-6': '24.853.275/0001-36',      // M&P - Itaú (conta 88828-6)
  '0101300855': '51.621.925/0001-90',   // MMP - Sicredi
  '300855': '51.621.925/0001-90',       // MMP - Itaú (sem formatação)
};

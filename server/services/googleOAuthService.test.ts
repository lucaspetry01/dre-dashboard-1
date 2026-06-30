import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Teste para validar as credenciais do Google OAuth
 * Este teste verifica se GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET estão configurados corretamente
 */

describe('Google OAuth Service', () => {
  let originalClientId: string | undefined;
  let originalClientSecret: string | undefined;

  beforeAll(() => {
    originalClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    originalClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  afterAll(() => {
    // Restaura as variáveis de ambiente originais
    if (originalClientId) {
      process.env.GOOGLE_OAUTH_CLIENT_ID = originalClientId;
    }
    if (originalClientSecret) {
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = originalClientSecret;
    }
  });

  it('should have Google OAuth credentials configured', async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    expect(clientId).toBeDefined();
    expect(clientSecret).toBeDefined();
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(clientSecret?.length).toBeGreaterThan(0);
  });

  it('should validate Google OAuth credentials successfully', async () => {
    const { validateGoogleCredentials } = await import('./googleOAuthService.js');
    const isValid = await validateGoogleCredentials();

    expect(isValid).toBe(true);
  });

  it('should return false when credentials are missing', async () => {
    // Remove as credenciais temporariamente
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    // Reimporta o módulo para pegar as novas variáveis de ambiente
    const { validateGoogleCredentials } = await import('./googleOAuthService.js');
    const isValid = await validateGoogleCredentials();

    expect(isValid).toBe(false);
  });
});

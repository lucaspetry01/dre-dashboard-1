import type { Express, Request, Response } from 'express';
import { validateGoogleCredentials, getAuthorizationUrl, exchangeCodeForToken } from '../services/googleOAuthService.js';

/**
 * Registra as rotas de autenticação com Google OAuth
 */
export function registerGoogleOAuthRoutes(app: Express) {
  /**
   * Rota para iniciar o fluxo de autenticação com Google
   * Redireciona o usuário para o Google para autorizar o acesso ao Gmail
   */
  app.get('/api/oauth/google/authorize', (req: Request, res: Response) => {
    try {
      const authUrl = getAuthorizationUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('[Google OAuth] Authorize failed:', error);
      res.status(500).json({ error: 'Failed to initiate Google OAuth' });
    }
  });

  /**
   * Callback do Google OAuth
   * O Google redireciona o usuário aqui após autorizar
   */
  app.get('/api/oauth/google/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    try {
      const accessToken = await exchangeCodeForToken(code);

      // Armazena o token na sessão ou cookie
      // Por enquanto, vamos apenas redirecionar com sucesso
      res.cookie('google_access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 3600 * 1000, // 1 hora
      });

      // Redireciona de volta para a página de Cargas
      res.redirect('/cargas?gmail_connected=true');
    } catch (error) {
      console.error('[Google OAuth] Callback failed:', error);
      res.status(500).json({ error: 'Google OAuth callback failed' });
    }
  });

  /**
   * Rota para validar se as credenciais do Google estão configuradas
   * Usada pelo teste de validação de secrets
   */
  app.get('/api/health/google-oauth', async (req: Request, res: Response) => {
    try {
      const isValid = await validateGoogleCredentials();

      if (isValid) {
        res.json({ status: 'ok', message: 'Google OAuth credentials are valid' });
      } else {
        res.status(400).json({ status: 'error', message: 'Google OAuth credentials are invalid' });
      }
    } catch (error) {
      console.error('[Google OAuth] Health check failed:', error);
      res.status(500).json({ status: 'error', message: String(error) });
    }
  });
}

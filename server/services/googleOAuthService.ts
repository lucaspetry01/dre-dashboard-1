import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Serviço para gerenciar autenticação com Google OAuth
 * Permite que o app acesse a conta do Gmail do usuário para sincronizar protocolos
 */

let oauth2Client: OAuth2Client | null = null;

/**
 * Inicializa o cliente OAuth2 do Google
 */
function initializeOAuth2Client(): OAuth2Client {
  if (oauth2Client) {
    return oauth2Client;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUrl = process.env.GOOGLE_OAUTH_REDIRECT_URL || 'http://localhost:3000/api/oauth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET são obrigatórios');
  }

  oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
  return oauth2Client;
}

/**
 * Gera a URL de autorização do Google
 * O usuário será redirecionado para esta URL para autorizar o acesso ao Gmail
 */
export function getAuthorizationUrl(): string {
  const client = initializeOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ];

  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return url;
}

/**
 * Troca o código de autorização por um token de acesso
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const client = initializeOAuth2Client();

  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Falha ao obter token de acesso do Google');
  }

  return tokens.access_token;
}

/**
 * Obtém um cliente Gmail autenticado com o token fornecido
 */
export function getGmailClient(accessToken: string) {
  const client = initializeOAuth2Client();
  client.setCredentials({ access_token: accessToken });

  return google.gmail({ version: 'v1', auth: client });
}

/**
 * Valida se as credenciais do Google estão configuradas corretamente
 */
export async function validateGoogleCredentials(): Promise<boolean> {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Credenciais do Google não configuradas');
      return false;
    }

    // Tenta criar um cliente OAuth2 para validar as credenciais
    const _client = new OAuth2Client(clientId, clientSecret);
    
    // Se conseguiu criar o cliente sem erros, as credenciais são válidas
    return true;
  } catch (error) {
    console.error('Erro ao validar credenciais do Google:', error);
    return false;
  }
}

import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Componente para autenticação com Google
 * Redireciona o usuário para autorizar o acesso ao Gmail
 */
export function GoogleAuthButton({ onSuccess, onError }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Verifica se o usuário já está conectado ao Google
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/oauth/google/token');
        const data = await response.json();
        if (data.token) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Erro ao verificar conexão com Google:', error);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true') {
      setIsConnected(true);
      onSuccess?.();
      // Remove o parâmetro da URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('gmail_error') === 'true') {
      onError?.('Erro ao conectar com Google');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      checkConnection();
    }
  }, [onSuccess, onError]);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      // Redireciona para a rota de autorização do Google
      window.location.href = '/api/oauth/google/authorize';
    } catch (error) {
      console.error('Erro ao iniciar autenticação com Google:', error);
      onError?.(String(error));
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        disabled
        title="Gmail conectado com sucesso"
      >
        <Mail className="w-4 h-4 mr-2" />
        Gmail Conectado ✓
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
      onClick={handleClick}
      disabled={isLoading}
      title="Conectar com Google para sincronizar protocolos"
    >
      <Mail className="w-4 h-4 mr-2" />
      {isLoading ? 'Conectando...' : 'Conectar Gmail'}
    </Button>
  );
}

import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar filtros de conta (M&P, MMP).
 * Encapsula lógica de seleção/deselação de contas.
 */
export function useAccountFilter() {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const toggleAccount = useCallback((accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  }, []);

  const clearAccounts = useCallback(() => {
    setSelectedAccounts([]);
  }, []);

  const selectAllAccounts = useCallback((accountIds: string[]) => {
    setSelectedAccounts(accountIds);
  }, []);

  return {
    selectedAccounts,
    setSelectedAccounts,
    toggleAccount,
    clearAccounts,
    selectAllAccounts,
  };
}

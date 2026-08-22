import { useState, useCallback } from 'react';

interface CreateAccountInput {
  name: string;
  slug: string;
  timezone?: string;
}

interface CreateAccountResult {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseCreateAccountReturn {
  createAccount: (input: CreateAccountInput) => Promise<CreateAccountResult | null>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useCreateAccount(): UseCreateAccountReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  const createAccount = useCallback(async (
    input: CreateAccountInput
  ): Promise<CreateAccountResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          slug: input.slug,
          timezone: input.timezone || 'UTC',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error ||
          Object.values(data.error?.fieldErrors || {}).flat()[0] ||
          `Failed to create account (${response.status})`
        );
      }

      const account: CreateAccountResult = await response.json();
      return account;
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createAccount,
    loading,
    error,
    reset,
  };
}

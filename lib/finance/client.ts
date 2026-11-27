export const TRANSACTIONS_KEY = '/api/transactions';

export type TransactionChange = {
  action: 'created' | 'updated' | 'deleted';
  id: string;
  at: string;
};

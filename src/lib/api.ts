import type { Transaction, TransactionId, AccountEntity, Category, DashboardData, AccountLedgerResponse } from '@finance-platform/shared-types';

// Resolve API base URL dynamically from environment variables in production, or fallback to local proxy /api
const viteApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = viteApiUrl
  ? `${viteApiUrl.replace(/\/$/, '')}${viteApiUrl.endsWith('/api') || viteApiUrl.endsWith('/api/') ? '' : '/api'}`
  : '/api';


function parseAmount(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function fetchTransactions(): Promise<{ transactions: Transaction[]; sha256: string }> {
  const res = await fetch(`${API_BASE}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();
  const parsedTransactions = (data.transactions || []).map((tx: any) => ({
    ...tx,
    amount: parseAmount(tx.amount),
    postings: (tx.postings || []).map((p: any) => ({
      ...p,
      amount: parseAmount(p.amount),
    })),
  }));
  return { transactions: parsedTransactions, sha256: data.sha256 };
}

export async function fetchTransaction(id: TransactionId): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/transactions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch transaction');
  const tx = await res.json();
  return {
    ...tx,
    amount: parseAmount(tx.amount),
    postings: (tx.postings || []).map((p: any) => ({
      ...p,
      amount: parseAmount(p.amount),
    })),
  };
}

export async function createTransaction(tx: any, sha256: string): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...tx, sha256 }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create transaction');
  }
  const newTx = await res.json();
  return {
    ...newTx,
    amount: parseAmount(newTx.amount),
    postings: (newTx.postings || []).map((p: any) => ({
      ...p,
      amount: parseAmount(p.amount),
    })),
  };
}

export async function updateTransaction(id: TransactionId, tx: any, sha256: string): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...tx, sha256 }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update transaction');
  }
  const updatedTx = await res.json();
  return {
    ...updatedTx,
    amount: parseAmount(updatedTx.amount),
    postings: (updatedTx.postings || []).map((p: any) => ({
      ...p,
      amount: parseAmount(p.amount),
    })),
  };
}

export async function deleteTransaction(id: TransactionId, sha256: string): Promise<void> {
  const res = await fetch(`${API_BASE}/transactions/${id}?sha256=${encodeURIComponent(sha256)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete transaction');
  }
}

export async function addAccount(acc: any): Promise<any> {
  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(acc),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create account');
  }
  return res.json();
}

export async function updateAccount(id: string, updates: any): Promise<any> {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update account');
  }
  return res.json();
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete account');
  }
}

export async function addCategory(cat: any): Promise<any> {
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create category');
  }
  return res.json();
}

export async function updateCategory(id: string, updates: any): Promise<any> {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update category');
  }
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete category');
  }
}

export async function fetchAccounts(): Promise<AccountEntity[]> {
  const res = await fetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error('Failed to fetch accounts');
  const list: AccountEntity[] = await res.json();
  return list.map(acc => {
    const parts = acc.name.split(':');
    return { ...acc, displayName: parts[parts.length - 1] };
  });
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  const list: Category[] = await res.json();
  return list.map(cat => {
    const parts = cat.name.split(':');
    return { ...cat, displayName: parts[parts.length - 1] };
  });
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/reports/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
}

export async function fetchInboxCandidates(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/inbox`);
  if (!res.ok) throw new Error('Failed to fetch inbox candidates');
  return res.json();
}

export async function fetchAccount(id: string): Promise<AccountEntity> {
  const res = await fetch(`${API_BASE}/accounts/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch account');
  return res.json();
}

export async function fetchAccountLedger(
  accountId: string,
  startDate?: string,
  endDate?: string
): Promise<AccountLedgerResponse> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const queryStr = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}/ledger${queryStr}`);
  if (!res.ok) throw new Error('Failed to fetch account ledger');
  const ledger = await res.json();
  return {
    ...ledger,
    beginningBalance: parseAmount(ledger.beginningBalance),
    rows: (ledger.rows || []).map((row: any) => ({
      ...row,
      amount: parseAmount(row.amount),
      runningBalance: parseAmount(row.runningBalance),
    })),
  };
}

export const queryKeys = {
  transactions: ['transactions'] as const,
  transaction: (id: TransactionId) => ['transactions', id] as const,
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  ledger: (id: string, start?: string, end?: string) => ['accounts', id, 'ledger', { start, end }] as const,
  categories: ['categories'] as const,
  dashboard: ['dashboard'] as const,
  inbox: ['inbox'] as const,
};

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchAccounts, queryKeys } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import type { Transaction, AccountEntity } from '@finance-platform/shared-types';
import { MONTHS, EMPTY_TRANSACTIONS, EMPTY_ACCOUNTS } from './constants';

interface MonthlyFlowCategoryViewProps {
  categoryName: string;
  month: string;
}

const parseDateParts = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, monthIdx, day);
    const dayStr = String(day).padStart(2, '0');
    const monthStr = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
    return { day: dayStr, month: monthStr };
  }
  return { day: '--', month: '---' };
};

const getCategoryDisplayName = (categoryId: string): string => {
  return categoryId.split(':').pop() || categoryId;
};

interface CategoryPostingRow {
  transactionId: string;
  date: string;
  description: string;
  account: string;
  amount: number;
  isIncome: boolean;
}

export default function MonthlyFlowCategoryView({ categoryName, month }: MonthlyFlowCategoryViewProps) {
  const [, navigate] = useLocation();

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: queryKeys.transactions,
    queryFn: fetchTransactions,
  });
  const transactions = txData?.transactions || EMPTY_TRANSACTIONS;

  const { data: accounts = EMPTY_ACCOUNTS, isLoading: accLoading } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: fetchAccounts,
  });

  const getAccountName = useCallback((id: string) => accounts.find(a => a.id === id)?.displayName || id, [accounts]);

  const postings = useMemo(() => {
    const result: CategoryPostingRow[] = [];
    const parts = month.split(' ');
    if (parts.length !== 2) return [];
    const monthIdx = MONTHS.indexOf(parts[0]);
    if (monthIdx === -1) return [];
    const year = parts[1];
    const monthPrefix = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

    const getCounterAccount = (tx: Transaction, targetPostId: string) => {
      const others = tx.postings.filter(p => p.id !== targetPostId);
      const accounts = others.filter(p => {
        const lower = p.account.toLowerCase();
        return lower.startsWith('assets:') || lower.startsWith('liabilities:') || lower.startsWith('equity:');
      });
      if (accounts.length === 1) {
        return getAccountName(accounts[0].account);
      } else if (accounts.length > 1) {
        return accounts.map(a => getAccountName(a.account)).join(', ');
      }
      if (others.length > 0) {
        return getAccountName(others[0].account);
      }
      return 'Unknown';
    };

    for (const tx of transactions) {
      if (!tx.date.startsWith(monthPrefix)) continue;
      if (tx.type === 'Transfer') continue;

      for (const post of tx.postings) {
        const cleanName = getCategoryDisplayName(post.account);
        if (cleanName.toLowerCase() === categoryName.toLowerCase()) {
          const isInc = post.account.toLowerCase().startsWith('income:');
          const amount = isInc ? -post.amount : post.amount;
          
          result.push({
            transactionId: tx.id,
            date: tx.date,
            description: post.notes || tx.notes || tx.type,
            account: getCounterAccount(tx, post.id),
            amount,
            isIncome: isInc,
          });
        }
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, categoryName, month, getAccountName]);

  const totalAmount = useMemo(() => {
    return postings.reduce((sum, p) => sum + p.amount, 0);
  }, [postings]);

  const isLoading = txLoading || accLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-5 pb-24 animate-pulse">
        <div className="h-10 bg-neutral-900 rounded-2xl w-full" />
        <div className="h-14 bg-neutral-900 rounded-3xl" />
        <div className="h-20 bg-neutral-900 rounded-2xl" />
        <div className="h-20 bg-neutral-900 rounded-2xl" />
      </div>
    );
  }

  const isIncomeCategory = postings.length > 0 ? postings[0].isIncome : categoryName.toLowerCase().startsWith('income') || !categoryName.toLowerCase().startsWith('expenses');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col min-h-full pb-24"
    >
      {/* Total Card */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800/60 rounded-3xl p-6 flex flex-col gap-2 shadow-xl">
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold font-sans">Total for {month}</span>
          <h2 className={cn("text-3xl font-bold tracking-tight", isIncomeCategory ? "text-emerald-400" : "text-foreground")}>
            {isIncomeCategory ? '+' : ''}{formatCurrency(totalAmount)}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Category: <span className="font-semibold text-foreground">{categoryName}</span>
          </p>
        </div>
      </div>

      {/* Postings list */}
      <div className="flex flex-col divide-y divide-border/40 px-4 mt-4">
        {postings.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
            No transactions found for this category in {month}.
          </div>
        ) : (
          postings.map((row, idx) => {
            const { day, month: mName } = parseDateParts(row.date);
            return (
              <div
                key={idx}
                onClick={() => navigate(`/transactions/edit/${row.transactionId}`)}
                className="flex items-center justify-between py-3.5 px-1 hover:bg-neutral-900/35 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800/80 flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{mName}</span>
                    <span className="text-xs font-bold text-foreground -mt-0.5">{day}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-1">
                      {row.description}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      {row.isIncome ? 'To' : 'From'}: {getAccountName(row.account)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 shrink-0 pl-2">
                  <span className={cn("text-sm font-semibold tracking-tight", row.isIncome ? "text-emerald-400" : "text-foreground")}>
                    {row.isIncome ? '+' : ''}{formatCurrency(row.amount)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

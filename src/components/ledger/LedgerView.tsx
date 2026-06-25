import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchAccountLedger, queryKeys } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

interface LedgerViewProps {
  accountId: string;
}

const getLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

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

export default function LedgerView({ accountId }: LedgerViewProps) {
  const [, navigate] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter mode: 'last-30-days' | 'this-month' | 'custom'
  const [filterMode, setFilterMode] = useState<'last-30-days' | 'this-month' | 'custom'>('last-30-days');

  // Custom date selection
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => getLocalDateString(new Date()));

  // Compute startDate & endDate strings based on active filter mode
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (filterMode === 'last-30-days') {
    const d = new Date();
    endDate = getLocalDateString(d);
    d.setDate(d.getDate() - 30);
    startDate = getLocalDateString(d);
  } else if (filterMode === 'this-month') {
    const today = new Date();
    startDate = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
    endDate = getLocalDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  } else {
    startDate = customStart;
    endDate = customEnd;
  }

  // Fetch register postings & beginning balance
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ledger(accountId, startDate, endDate),
    queryFn: () => fetchAccountLedger(accountId, startDate, endDate),
    enabled: !!accountId,
  });

  // Auto-scroll to bottom of transaction list on data load
  useEffect(() => {
    if (data && !isLoading) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, isLoading, filterMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-5 pb-24 animate-pulse">
        <div className="h-10 bg-neutral-900 rounded-2xl w-full" />
        <div className="h-14 bg-neutral-900 rounded-3xl" />
        <div className="h-20 bg-neutral-900 rounded-2xl" />
        <div className="h-20 bg-neutral-900 rounded-2xl" />
        <div className="h-20 bg-neutral-900 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center flex flex-col items-center gap-4 justify-center h-[50vh]">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          !
        </div>
        <h3 className="font-semibold text-foreground">Failed to load register</h3>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          {error instanceof Error ? error.message : 'An unexpected error occurred while querying Hledger.'}
        </p>
      </div>
    );
  }

  const beginningBalance = data.beginningBalance;
  const rows = data.rows;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col min-h-full pb-24"
    >
      {/* Sticky Filter Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 border-b border-border/80 px-4 py-3 flex flex-col gap-3">
        {/* Pills row */}
        <div className="flex gap-2 bg-muted/30 p-1 rounded-2xl border border-border/30">
          <button
            onClick={() => setFilterMode('last-30-days')}
            className={cn(
              'flex-1 text-[11px] font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer text-center',
              filterMode === 'last-30-days'
                ? 'bg-neutral-900 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            30 Days
          </button>
          <button
            onClick={() => setFilterMode('this-month')}
            className={cn(
              'flex-1 text-[11px] font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer text-center',
              filterMode === 'this-month'
                ? 'bg-neutral-900 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            This Month
          </button>
          <button
            onClick={() => setFilterMode('custom')}
            className={cn(
              'flex-1 text-[11px] font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer text-center',
              filterMode === 'custom'
                ? 'bg-neutral-900 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Custom
          </button>
        </div>

        {/* Custom date range picker (expanded when Custom is selected) */}
        {filterMode === 'custom' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 overflow-hidden px-1 pb-1"
          >
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-0.5">From</span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs bg-neutral-900/60 border border-neutral-900/80 rounded-xl px-3 py-2 text-foreground font-medium focus:outline-none focus:border-border"
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-0.5">To</span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs bg-neutral-900/60 border border-neutral-900/80 rounded-xl px-3 py-2 text-foreground font-medium focus:outline-none focus:border-border"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Register List */}
      <div className="flex flex-col divide-y divide-border/40 px-4">
        
        {/* Virtual Row: Opening Balance */}
        {filterMode !== 'custom' || startDate ? (
          <div className="flex items-center justify-between py-4 px-1 bg-neutral-955/20 border-b border-dashed border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-muted-foreground shrink-0">
                <Calendar className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wide uppercase">
                  {startDate ? `As of ${startDate}` : 'Starting Balance'}
                </span>
                <span className="text-xs font-semibold italic text-muted-foreground">Opening Balance</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</span>
              <span className="text-xs font-semibold italic text-muted-foreground">{formatCurrency(beginningBalance)}</span>
            </div>
          </div>
        ) : null}

        {/* Dynamic transaction postings list */}
        {rows.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
            No transactions found in this period.
          </div>
        ) : (
          rows.map((row, idx) => {
            const isFavorable = row.amount >= 0;
            const { day, month } = parseDateParts(row.date);
            return (
              <div
                key={idx}
                onClick={() => {
                  if (row.id) {
                    navigate(`/transactions/edit/${row.id}`);
                  }
                }}
                className={cn(
                  'flex items-center justify-between py-3.5 px-1 hover:bg-neutral-900/35 transition-colors cursor-pointer group'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800/80 flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{month}</span>
                    <span className="text-xs font-bold text-foreground -mt-0.5">{day}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-1">
                      {row.description}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-0.5 shrink-0 pl-2">
                  <span
                    className={cn(
                      'text-sm font-semibold tracking-tight',
                      row.type === 'Income' ? 'text-emerald-400' :
                      row.type === 'Expense' ? 'text-rose-400' : 'text-foreground'
                    )}
                  >
                    {formatCurrency(Math.abs(row.amount))}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground tracking-wide">
                    {formatCurrency(row.runningBalance)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Scroll anchor target */}
        <div ref={bottomRef} className="h-1 w-full" />
      </div>
    </motion.div>
  );
}

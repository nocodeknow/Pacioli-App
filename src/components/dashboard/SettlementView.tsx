import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDot, ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn, formatCurrency } from '@/lib/utils';
import type { DashboardData } from '@finance-platform/shared-types';

interface SettlementViewProps {
  data: DashboardData;
}

export default function SettlementView({ data }: SettlementViewProps) {
  const [, navigate] = useLocation();
  const [showSettled, setShowSettled] = useState(false);

  const netSettlement = data.settlements.receivablesTotal - data.settlements.payablesTotal;

  // Split into Active (> 10 INR) and Settled (≤ 10 INR)
  const activeSettlements = data.settlements.items.filter((item) => Math.abs(item.amount) > 10);
  const settledSettlements = data.settlements.items.filter((item) => Math.abs(item.amount) <= 10);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-6 p-5 pb-24"
    >
      {/* Detail Header Summary */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800/60 rounded-3xl p-6 flex flex-col gap-2 shadow-xl">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold font-sans">Net Settlement Position</span>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {netSettlement >= 0 ? 'Receivable ' : 'Payable '}
          {formatCurrency(Math.abs(netSettlement))}
        </h2>
        <p className="text-xs text-muted-foreground mt-2">
          Net balance with people &amp; groups. Positive balances mean they owe you; negative balances mean you owe them.
        </p>
      </div>

      {/* Active Settlements List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase px-1 font-sans">
          Active Settlements
        </h3>
        <div className="flex flex-col gap-2">
          {activeSettlements.map((person, idx) => {
            const isReceivable = person.amount >= 0;
            return (
              <div
                key={idx}
                onClick={() => navigate(`/dashboard/ledger/${encodeURIComponent(person.id)}`)}
                className="flex items-center justify-between p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-900/50 hover:border-neutral-800 rounded-2xl transition-all duration-250 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-200',
                      isReceivable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    )}
                  >
                    <CircleDot className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{person.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isReceivable ? 'Receivable Ledger' : 'Payable Ledger'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={cn('text-sm font-semibold', isReceivable ? 'text-emerald-400' : 'text-rose-400')}>
                    {isReceivable ? '+' : ''}{formatCurrency(person.amount)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isReceivable ? 'Owes you' : 'You owe'}
                  </span>
                </div>
              </div>
            );
          })}
          {activeSettlements.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 bg-neutral-900/40 border border-neutral-900/60 rounded-2xl">
              No active pending settlements.
            </p>
          )}
        </div>
      </div>

      {/* Settled Accounts Collapsible Section */}
      {settledSettlements.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() => setShowSettled(!showSettled)}
            className="flex items-center justify-between px-1 text-sm font-semibold tracking-wider text-muted-foreground hover:text-foreground uppercase w-full text-left transition-colors cursor-pointer group/header font-sans"
          >
            <span>Settled Accounts (≤ 10)</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-sans font-medium bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800/40 hover:border-neutral-700/60 transition-colors">
              {settledSettlements.length}
              <ChevronDown className={cn("size-3.5 transition-transform duration-250", showSettled ? "rotate-180" : "rotate-0")} />
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showSettled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="flex flex-col gap-2 overflow-hidden"
              >
                {settledSettlements.map((person, idx) => {
                  const isReceivable = person.amount >= 0;
                  return (
                    <div
                      key={idx}
                      onClick={() => navigate(`/dashboard/ledger/${encodeURIComponent(person.id)}`)}
                      className="flex items-center justify-between p-3 bg-neutral-900/30 hover:bg-neutral-900/60 border border-neutral-900/30 hover:border-neutral-800/60 rounded-2xl transition-all duration-250 cursor-pointer group opacity-60 hover:opacity-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-200 bg-neutral-900 text-muted-foreground'
                          )}
                        >
                          <CircleDot className="size-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{person.name}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {isReceivable ? 'Receivable Ledger' : 'Payable Ledger'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                          {isReceivable ? '+' : ''}{formatCurrency(person.amount)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">Settled</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

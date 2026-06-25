import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, ChevronDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { DashboardData } from '@finance-platform/shared-types';
import { useLocation } from 'wouter';

interface NetWorthViewProps {
  data: DashboardData;
}

export default function NetWorthView({ data }: NetWorthViewProps) {
  const [, navigate] = useLocation();
  const netWorth = data.assets.total - data.liabilities.total;

  // Collect all subgroup keys to manage expand/collapse all
  const allGroupKeys = [
    ...data.assets.subgroups.map((g) => `asset-${g.name}`),
    ...data.liabilities.subgroups.map((g) => `liability-${g.name}`),
  ];

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allGroupKeys.forEach((key) => {
      initial[key] = true;
    });
    return initial;
  });

  const anyCollapsed = allGroupKeys.some((key) => collapsedGroups[key]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleToggleAll = () => {
    if (anyCollapsed) {
      // Expand all
      setCollapsedGroups({});
    } else {
      // Collapse all
      const newCollapsed: Record<string, boolean> = {};
      allGroupKeys.forEach((key) => {
        newCollapsed[key] = true;
      });
      setCollapsedGroups(newCollapsed);
    }
  };

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
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Total Net Worth</span>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(netWorth)}</h2>
        <p className="text-xs text-muted-foreground mt-2">
          Derived from Hledger journal. Formula: Assets ({formatCurrency(data.assets.total)}) − Liabilities ({formatCurrency(data.liabilities.total)}).
        </p>
      </div>

      {/* Controls row */}
      <div className="flex justify-end px-1 -mb-2">
        <button
          onClick={handleToggleAll}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-900/50 px-3 py-1.5 rounded-full"
        >
          {anyCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
      </div>

      {/* Assets Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase px-1">
          Assets ({formatCurrency(data.assets.total)})
        </h3>
        <div className="flex flex-col gap-5">
          {data.assets.subgroups.map((subgroup, sIdx) => {
            const groupKey = `asset-${subgroup.name}`;
            const isCollapsed = collapsedGroups[groupKey];
            return (
              <div key={sIdx} className="flex flex-col gap-2.5">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider w-full text-left transition-colors cursor-pointer group/header"
                >
                  <span className="capitalize flex items-center gap-1.5">
                    {subgroup.name}
                    <ChevronDown
                      className={cn(
                        'size-3.5 text-muted-foreground/60 group-hover/header:text-foreground transition-transform duration-200',
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      )}
                    />
                  </span>
                  <span>{formatCurrency(subgroup.total)}</span>
                </button>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden flex flex-col gap-2"
                    >
                      {subgroup.accounts.map((acc, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (acc.id) {
                              navigate(`/dashboard/ledger/${encodeURIComponent(acc.id)}`);
                            }
                          }}
                          className="flex items-center justify-between p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-900/50 rounded-2xl transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <ArrowUpRight className="size-4" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{acc.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(acc.balance)}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liabilities Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase px-1">
          Liabilities ({formatCurrency(data.liabilities.total)})
        </h3>
        <div className="flex flex-col gap-5">
          {data.liabilities.subgroups.map((subgroup, sIdx) => {
            const groupKey = `liability-${subgroup.name}`;
            const isCollapsed = collapsedGroups[groupKey];
            return (
              <div key={sIdx} className="flex flex-col gap-2.5">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider w-full text-left transition-colors cursor-pointer group/header"
                >
                  <span className="capitalize flex items-center gap-1.5">
                    {subgroup.name}
                    <ChevronDown
                      className={cn(
                        'size-3.5 text-muted-foreground/60 group-hover/header:text-foreground transition-transform duration-200',
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      )}
                    />
                  </span>
                  <span>{formatCurrency(subgroup.total)}</span>
                </button>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden flex flex-col gap-2"
                    >
                      {subgroup.accounts.map((acc, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (acc.id) {
                              navigate(`/dashboard/ledger/${encodeURIComponent(acc.id)}`);
                            }
                          }}
                          className="flex items-center justify-between p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-900/50 rounded-2xl transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                              <ArrowDownLeft className="size-4" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{acc.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(acc.balance)}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

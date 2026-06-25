import { motion } from 'framer-motion';
import { Wallet, Scale, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData, queryKeys } from '@/lib/api';
import NetWorthView from '@/components/dashboard/NetWorthView';
import MonthlyFlowView from '@/components/dashboard/MonthlyFlowView';
import MonthlyFlowCategoryView from '@/components/dashboard/MonthlyFlowCategoryView';
import SettlementView from '@/components/dashboard/SettlementView';
import LedgerView from '@/components/ledger/LedgerView';

export default function DashboardView() {
  const [location, navigate] = useLocation();
  const pathParts = location.split('/').filter(Boolean);
  const activeDetail = pathParts.length > 1 ? pathParts[1] : null;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardData,
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5 p-5 pb-24 animate-pulse">
        <div className="h-8 bg-neutral-900 rounded-lg w-1/3 mb-2" />
        <div className="h-32 bg-neutral-900 rounded-3xl" />
        <div className="h-32 bg-neutral-900 rounded-3xl" />
        <div className="h-32 bg-neutral-900 rounded-3xl" />
      </div>
    );
  }

  // Delegate to detail sub-views
  if (activeDetail === 'net-worth') return <NetWorthView data={data} />;
  if (activeDetail === 'monthly-flow') {
    if (pathParts[2] === 'category') {
      const categoryName = pathParts[3] ? decodeURIComponent(pathParts[3]) : '';
      const month = pathParts[4] ? decodeURIComponent(pathParts[4]) : '';
      return <MonthlyFlowCategoryView categoryName={categoryName} month={month} />;
    }
    return <MonthlyFlowView data={data} />;
  }
  if (activeDetail === 'settlement') return <SettlementView data={data} />;
  if (activeDetail === 'ledger') {
    const accountId = pathParts[2] ? decodeURIComponent(pathParts[2]) : '';
    return <LedgerView accountId={accountId} />;
  }

  // Derived summary values for the 3 dashboard cards
  const months = Object.keys(data.monthlyFlow);
  const netWorth = data.assets.total - data.liabilities.total;
  const latestMonth = months[0] || '';
  const latestMonthFlow = latestMonth
    ? data.monthlyFlow[latestMonth]
    : { income: 0, expense: 0, incomeCategories: [], expenseCategories: [] };
  const netFlow = latestMonthFlow.income - latestMonthFlow.expense;
  const netSettlement = data.settlements.receivablesTotal - data.settlements.payablesTotal;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5 p-5 pb-24"
    >
      {/* Greeting Banner */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Hi, Rahul</h2>
      </motion.div>

      {/* Card 1: Net Worth */}
      <motion.button
        variants={itemVariants}
        onClick={() => navigate('/dashboard/net-worth')}
        className="w-full text-left bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-3xl p-6 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] relative group cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
            <Wallet className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Net Worth</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(netWorth)}</span>
          <span className="text-[11px] text-muted-foreground">Assets minus Liabilities</span>
        </div>
      </motion.button>

      {/* Card 2: Monthly Flow */}
      <motion.button
        variants={itemVariants}
        onClick={() => navigate('/dashboard/monthly-flow')}
        className="w-full text-left bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-3xl p-6 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] relative group cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
            <ArrowRightLeft className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Monthly Flow</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                netFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {netFlow >= 0 ? 'Net Surplus' : 'Net Deficit'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Income: {formatCurrency(latestMonthFlow.income)} · Expense: {formatCurrency(latestMonthFlow.expense)}
          </span>
        </div>
      </motion.button>

      {/* Card 3: Settlement Position */}
      <motion.button
        variants={itemVariants}
        onClick={() => navigate('/dashboard/settlement')}
        className="w-full text-left bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-3xl p-6 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] relative group cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
            <Scale className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Settlement Position</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(Math.abs(netSettlement))}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                netSettlement >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {netSettlement >= 0 ? 'Net Receivable' : 'Net Payable'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Net position with people &amp; groups</span>
        </div>
      </motion.button>
    </motion.div>
  );
}

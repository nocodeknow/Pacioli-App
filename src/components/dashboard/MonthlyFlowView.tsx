import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatCurrency } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/select';
import type { DashboardData } from '@finance-platform/shared-types';
import { MONTHS } from './constants';

interface MonthlyFlowViewProps {
  data: DashboardData;
}

export default function MonthlyFlowView({ data }: MonthlyFlowViewProps) {
  const [, navigate] = useLocation();

  const today = new Date();
  const currentMonthLabel = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  const dataMonths = Object.keys(data.monthlyFlow);
  const months = dataMonths.includes(currentMonthLabel)
    ? dataMonths
    : [currentMonthLabel, ...dataMonths];

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthLabel);
  const activeMonth = selectedMonth || currentMonthLabel;

  const selectedMonthFlow = (activeMonth && data.monthlyFlow[activeMonth]) || {
    income: 0,
    expense: 0,
    incomeCategories: [],
    expenseCategories: [],
  };

  const totalMonthFlow = selectedMonthFlow.income + selectedMonthFlow.expense;
  const incomePercentage = totalMonthFlow > 0 ? Math.round((selectedMonthFlow.income / totalMonthFlow) * 100) : 0;
  const expensePercentage = totalMonthFlow > 0 ? Math.round((selectedMonthFlow.expense / totalMonthFlow) * 100) : 0;
  const netMonthFlow = selectedMonthFlow.income - selectedMonthFlow.expense;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Month Selector Dropdown */}
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-sans">Select Month:</span>
        <CustomSelect
          value={activeMonth}
          onChange={(val) => setSelectedMonth(val)}
          options={months.map(m => ({ value: m, label: m }))}
          size="sm"
          className="w-40"
        />
      </div>

      {/* Detail Header Summary */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold font-sans">Net Surplus / Deficit</span>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {netMonthFlow >= 0 ? '+' : ''}{formatCurrency(netMonthFlow)}
        </h2>

        {/* Simple distribution bar */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${incomePercentage}%` }} />
            <div className="h-full bg-rose-500" style={{ width: `${expensePercentage}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Income: {formatCurrency(selectedMonthFlow.income)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              Expense: {formatCurrency(selectedMonthFlow.expense)}
            </span>
          </div>
        </div>
      </div>

      {/* Income Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase px-1 font-sans">
          Income Breakdown
        </h3>
        <div className="flex flex-col gap-1.5">
          {selectedMonthFlow.incomeCategories.map((item) => (
            <div
              key={item.category}
              onClick={() => navigate(`/dashboard/monthly-flow/category/${encodeURIComponent(item.category)}/${encodeURIComponent(activeMonth)}`)}
              className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl cursor-pointer hover:bg-neutral-900/35 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="size-4" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.category}</span>
              </div>
              <span className="text-sm font-semibold text-emerald-400">+{formatCurrency(item.amount)}</span>
            </div>
          ))}
          {selectedMonthFlow.incomeCategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No income recorded for this month.</p>
          )}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase px-1 font-sans">
          Expense Breakdown
        </h3>
        <div className="flex flex-col gap-1.5">
          {selectedMonthFlow.expenseCategories.map((item) => {
            const percentage =
              selectedMonthFlow.expense > 0 ? Math.round((item.amount / selectedMonthFlow.expense) * 100) : 0;
            return (
              <div
                key={item.category}
                onClick={() => navigate(`/dashboard/monthly-flow/category/${encodeURIComponent(item.category)}/${encodeURIComponent(activeMonth)}`)}
                className="flex flex-col gap-2 p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl cursor-pointer hover:bg-neutral-900/35 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-rose-400">
                      <TrendingDown className="size-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground bg-neutral-800 px-2 py-0.5 rounded-full">{percentage}%</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
                {/* Progress Bar inside row */}
                <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-700 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
          {selectedMonthFlow.expenseCategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No expenses recorded for this month.</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { 
  Check, 
  X, 
  Plus, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createTransaction, updateTransaction, deleteTransaction, fetchAccounts, fetchCategories, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Transaction, TransactionId, AccountEntity, Category } from '@finance-platform/shared-types';
import { CustomSelect } from '@/components/ui/select';

interface TransactionFormViewProps {
  mode: 'add' | 'edit';
  id?: string;
}

export default function TransactionFormView({ mode, id }: TransactionFormViewProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] as AccountEntity[] } = useQuery({ queryKey: queryKeys.accounts, queryFn: fetchAccounts });
  const { data: categories = [] as Category[] } = useQuery({ queryKey: queryKeys.categories, queryFn: fetchCategories });
  
  const cachedTx = queryClient.getQueryData<{transactions: Transaction[], sha256: string}>(queryKeys.transactions);
  const originalTx = id && cachedTx ? cachedTx.transactions.find((t: Transaction) => t.id === id) : null;
  const sha256 = cachedTx?.sha256 || '';
  const [isSaving, setIsSaving] = useState(false);

  // 1. Transaction Type selection
  const [txType, setTxType] = useState<Transaction['type']>(
    originalTx?.type || 'Income'
  );

  // 2. Core Fields
  const [date, setDate] = useState(
    originalTx?.date || new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<number>(() => {
    if (originalTx) {
      return originalTx.amount;
    }
    return 0;
  });
  const [sourceAccount, setSourceAccount] = useState<string>(() => {
    if (originalTx) {
      if (originalTx.type === 'Expense' || originalTx.type === 'Transfer') {
        const sourcePost = originalTx.postings.find(p => p.amount < 0);
        return sourcePost ? sourcePost.account : '';
      } else if (originalTx.type === 'Income') {
        const sourcePost = originalTx.postings.find(p => p.amount > 0);
        return sourcePost ? sourcePost.account : '';
      }
    }
    return '';
  });
  const [notes, setNotes] = useState(
    originalTx?.notes || ''
  );

  // 3. Conditional state based on Type
  // Income / Expense Category
  const [category, setCategory] = useState<string>(() => {
    if (originalTx) {
      if (originalTx.type === 'Expense') {
        const catPost = originalTx.postings.find(p => p.amount > 0);
        return catPost ? catPost.account : '';
      } else if (originalTx.type === 'Income') {
        const catPost = originalTx.postings.find(p => p.amount < 0);
        return catPost ? catPost.account : '';
      }
    }
    return '';
  });

  // Transfer Destination
  const [destAccount, setDestAccount] = useState<string>(() => {
    if (originalTx && originalTx.type === 'Transfer') {
      const destPost = originalTx.postings.find(p => p.amount > 0);
      return destPost ? destPost.account : '';
    }
    return '';
  });

  // Split lines
  const [outflows, setOutflows] = useState<{ id: string; account: string; amount: number; notes: string | null }[]>(() => {
    if (originalTx && originalTx.type === 'Split') {
      return originalTx.postings.filter(p => p.amount < 0).map(p => ({
        id: p.id,
        account: p.account,
        amount: Math.abs(p.amount),
        notes: p.notes,
      }));
    }
    return [{ id: 'out-1', account: '', amount: 0, notes: null }];
  });

  const [inflows, setInflows] = useState<{ id: string; account: string; amount: number; notes: string | null }[]>(() => {
    if (originalTx && originalTx.type === 'Split') {
      return originalTx.postings.filter(p => p.amount > 0).map(p => ({
        id: p.id,
        account: p.account,
        amount: p.amount,
        notes: p.notes,
      }));
    }
    return [{ id: 'in-1', account: '', amount: 0, notes: null }];
  });

  // Automatically update splits on type changes to Split or when amount changes
  const handleTypeChange = (newType: Transaction['type']) => {
    setTxType(newType);
    if (newType === 'Split' && outflows.length === 1 && outflows[0].amount === 0 && inflows.length === 1 && inflows[0].amount === 0) {
      setOutflows([
        { id: 'out-1', account: sourceAccount || accounts[0]?.id || '', amount: amount, notes: null }
      ]);
      setInflows([
        { id: 'in-1', account: category || categories[0]?.id || '', amount: amount, notes: null }
      ]);
    }
  };

  const handleAddOutflow = () => {
    setOutflows([
      ...outflows,
      { id: Math.random().toString(), account: '', amount: 0, notes: null }
    ]);
  };

  const handleRemoveOutflow = (lineId: string) => {
    if (outflows.length <= 1) return;
    setOutflows(outflows.filter(o => o.id !== lineId));
  };

  const handleUpdateOutflow = (lineId: string, updates: Partial<(typeof outflows)[number]>) => {
    setOutflows(outflows.map(line => line.id === lineId ? { ...line, ...updates } : line));
  };

  const handleAddInflow = () => {
    setInflows([
      ...inflows,
      { id: Math.random().toString(), account: '', amount: 0, notes: null }
    ]);
  };

  const handleRemoveInflow = (lineId: string) => {
    if (inflows.length <= 1) return;
    setInflows(inflows.filter(i => i.id !== lineId));
  };

  const handleUpdateInflow = (lineId: string, updates: Partial<(typeof inflows)[number]>) => {
    setInflows(inflows.map(line => line.id === lineId ? { ...line, ...updates } : line));
  };

  const totalOutflows = outflows.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const totalInflows = inflows.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const difference = Number((totalOutflows - totalInflows).toFixed(2));
  const isSplitBalanced = difference === 0 && totalOutflows > 0;

  const sourceAccountOptions = useMemo(() => {
    return accounts
      .filter(acc => !acc.isGroup)
      .map(acc => ({ value: acc.name, label: acc.displayName }));
  }, [accounts]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter(cat => cat.type === txType && !cat.isGroup)
      .map(cat => ({ value: cat.name, label: cat.displayName }));
  }, [categories, txType]);

  const transferDestAccountOptions = useMemo(() => {
    return accounts
      .filter(acc => acc.name !== sourceAccount && !acc.isGroup)
      .map(acc => ({ value: acc.name, label: acc.displayName }));
  }, [accounts, sourceAccount]);

  const splitInflowOptions = useMemo(() => {
    return [
      {
        label: 'Categories',
        options: categories
          .filter(cat => !cat.isGroup)
          .map(cat => ({ value: cat.name, label: cat.displayName })),
      },
      {
        label: 'Accounts',
        options: accounts
          .filter(acc => !acc.isGroup)
          .map(acc => ({ value: acc.name, label: acc.displayName })),
      },
    ];
  }, [categories, accounts]);

  // Form submission / Validation
  const canSave = useMemo(() => {
    if (!date) return false;

    if (txType === 'Split') {
      if (!isSplitBalanced) return false;
      const allOutflowsValid = outflows.every(o => o.account && o.amount > 0);
      const allInflowsValid = inflows.every(i => i.account && i.amount > 0);
      return allOutflowsValid && allInflowsValid;
    } else {
      if (amount <= 0 || isNaN(amount)) return false;
      if (!sourceAccount) return false;

      if (txType === 'Transfer') {
        if (!destAccount || destAccount === sourceAccount) return false;
      } else {
        if (!category) return false;
      }
      return true;
    }
  }, [date, amount, sourceAccount, txType, destAccount, category, isSplitBalanced, outflows, inflows]);

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);

    let finalPostings: Omit<Transaction['postings'][number], 'id'>[] = [];

    if (txType === 'Expense') {
      finalPostings = [
        {
          account: sourceAccount,
          amount: -amount,
          notes: null,
        },
        {
          account: category,
          amount: amount,
          notes: null,
        },
      ];
    } else if (txType === 'Income') {
      finalPostings = [
        {
          account: sourceAccount,
          amount: amount,
          notes: null,
        },
        {
          account: category,
          amount: -amount,
          notes: null,
        },
      ];
    } else if (txType === 'Transfer') {
      finalPostings = [
        {
          account: sourceAccount,
          amount: -amount,
          notes: null,
        },
        {
          account: destAccount,
          amount: amount,
          notes: null,
        },
      ];
    } else if (txType === 'Split') {
      finalPostings = [
        ...outflows.map(o => ({
          account: o.account,
          amount: -Number(o.amount),
          notes: o.notes ? o.notes.trim() : null,
        })),
        ...inflows.map(i => ({
          account: i.account,
          amount: Number(i.amount),
          notes: i.notes ? i.notes.trim() : null,
        })),
      ];
    }

    const payload = {
      date,
      type: txType,
      amount: txType === 'Split' ? totalInflows : Number(amount),
      notes: notes.trim() || null,
      postings: finalPostings
    };

    try {
      if (mode === 'add') {
        await createTransaction(payload, sha256);
      } else if (id) {
        await updateTransaction(id as TransactionId, payload, sha256);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      window.history.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save transaction');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isSaving) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this transaction?');
    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      await deleteTransaction(id as TransactionId, sha256);
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      window.history.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transaction');
      setIsSaving(false);
    }
  };

  const inputClass = "bg-neutral-900 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-full";

  return (
    <div className="flex flex-col gap-5 p-5 pb-24 text-foreground bg-background overflow-y-auto h-full">
      
      {/* Segmented Type Picker */}
      <div className="bg-neutral-900/60 p-1 rounded-xl border border-neutral-800 flex w-full select-none">
        {(['Income', 'Expense', 'Transfer', 'Split'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => handleTypeChange(type)}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer text-center",
              txType === type 
                ? "bg-neutral-800 text-foreground shadow-md font-bold" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-4">
        
        {/* Date Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {/* Amount Field */}
        {txType !== 'Split' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Amount (INR)</label>
            <div className="relative flex items-center">
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0.00"
                required
                className={cn(inputClass, "pr-12")}
              />
              <span className="absolute right-3.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">INR</span>
            </div>
          </div>
        )}

        {/* Source / Main Account */}
        {txType !== 'Split' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {txType === 'Income' ? 'Destination Account (Asset)' : 'Source Account (Asset/Liability)'}
            </label>
            <CustomSelect
              value={sourceAccount}
              onChange={val => setSourceAccount(val)}
              options={sourceAccountOptions}
              placeholder="Select account..."
            />
          </div>
        )}

        {/* Conditional Field: Expense / Income Category */}
        {(txType === 'Expense' || txType === 'Income') && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
            <CustomSelect
              value={category}
              onChange={val => setCategory(val)}
              options={categoryOptions}
              placeholder="Select category..."
            />
          </div>
        )}

        {/* Conditional Field: Transfer Destination Account */}
        {txType === 'Transfer' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Destination Account (Asset/Liability)</label>
            <CustomSelect
              value={destAccount}
              onChange={val => setDestAccount(val)}
              options={transferDestAccountOptions}
              placeholder="Select destination account..."
            />
            {destAccount === sourceAccount && (
              <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="size-3" />
                Source and Destination accounts must be different.
              </p>
            )}
          </div>
        )}

        {/* Conditional Field: Split Outflows & Inflows Sections */}
        {txType === 'Split' && (
          <div className="flex flex-col gap-5 border border-neutral-800 bg-neutral-950/40 p-4 rounded-2xl mt-1">
            
            {/* Outflows (From) Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">From (Outflows)</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {outflows.map((out) => (
                  <div key={out.id} className="flex gap-2 items-center">
                    <CustomSelect
                      value={out.account}
                      onChange={val => handleUpdateOutflow(out.id, { account: val })}
                      options={sourceAccountOptions}
                      size="sm"
                      className="flex-1 min-w-0"
                      placeholder="Select asset/liability..."
                    />
                    
                    <div className="relative flex items-center w-24 shrink-0">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="0"
                        value={out.amount || ''}
                        onChange={e => handleUpdateOutflow(out.id, { amount: Number(e.target.value) })}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 pl-2 pr-9 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full text-right font-medium"
                      />
                      <span className="absolute right-2.5 text-muted-foreground text-[9px] font-bold">INR</span>
                    </div>

                    {outflows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOutflow(out.id)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-muted-foreground hover:text-rose-450 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOutflow}
                  className="text-[11px] font-bold text-primary hover:text-primary/90 flex items-center gap-1 cursor-pointer py-1.5 self-start mt-1 ml-1"
                >
                  <Plus className="size-3.5" /> Add Account
                </button>
              </div>
            </div>

            <hr className="border-neutral-850" />

            {/* Inflows (To) Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">To (Inflows)</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {inflows.map((inf) => (
                  <div key={inf.id} className="flex gap-2 items-center">
                    <CustomSelect
                      value={inf.account}
                      onChange={val => handleUpdateInflow(inf.id, { account: val })}
                      options={splitInflowOptions}
                      size="sm"
                      className="flex-1 min-w-0"
                      placeholder="Select category/account..."
                    />
                    
                    <div className="relative flex items-center w-24 shrink-0">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="0"
                        value={inf.amount || ''}
                        onChange={e => handleUpdateInflow(inf.id, { amount: Number(e.target.value) })}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 pl-2 pr-9 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full text-right font-medium"
                      />
                      <span className="absolute right-2.5 text-muted-foreground text-[9px] font-bold">INR</span>
                    </div>

                    {inflows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInflow(inf.id)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-muted-foreground hover:text-rose-450 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddInflow}
                  className="text-[11px] font-bold text-primary hover:text-primary/90 flex items-center gap-1 cursor-pointer py-1.5 self-start mt-1 ml-1"
                >
                  <Plus className="size-3.5" /> Add Item
                </button>
              </div>
            </div>

            {/* Split Math Progress bar */}
            <div className="flex flex-col gap-1.5 mt-2 border-t border-neutral-850 pt-3.5">
              <div className="flex justify-between items-center text-[10px] font-medium">
                <span className="text-muted-foreground">Outflow: {formatCurrency(totalOutflows)} | Inflow: {formatCurrency(totalInflows)}</span>
                <span className={cn(
                  "font-bold",
                  isSplitBalanced ? "text-emerald-450" : "text-rose-450"
                )}>
                  {isSplitBalanced ? (
                    <span className="flex items-center gap-0.5"><Check className="size-3" /> Balanced</span>
                  ) : (
                    <span>Difference: {formatCurrency(Math.abs(difference))} {difference > 0 ? '(More Outflow)' : '(More Inflow)'}</span>
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-850">
                <div 
                  className={cn(
                    "h-full transition-all duration-300",
                    isSplitBalanced ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(100, totalOutflows > 0 ? (totalInflows / totalOutflows) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Optional Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add transactions memo/notes..."
            rows={3}
            className={cn(inputClass, "resize-none h-20")}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        {mode === 'edit' && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving}
            className="w-14 h-12 bg-neutral-900 border border-neutral-800 hover:bg-rose-950/20 hover:text-rose-400 text-muted-foreground rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Delete transaction"
          >
            <Trash2 className="size-5" />
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-neutral-800 disabled:text-muted-foreground disabled:cursor-not-allowed font-semibold h-12 rounded-xl cursor-pointer"
        >
          {isSaving ? 'Saving...' : (mode === 'add' ? 'Save Transaction' : 'Update Transaction')}
        </Button>
      </div>
    </div>
  );
}

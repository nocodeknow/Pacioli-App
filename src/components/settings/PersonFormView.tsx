import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAccounts, addAccount, updateAccount, deleteAccount, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AccountId } from '@finance-platform/shared-types';

export default function PersonFormView({ mode, id }: { mode: 'add' | 'edit'; id?: AccountId }) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: fetchAccounts });
  const personAccount = id ? accounts.find(a => a.id === id) : null;

  // Extract display name
  const initialDisplayName = useMemo(() => {
    if (!personAccount) return '';
    return personAccount.displayName;
  }, [personAccount]);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [openingBalance, setOpeningBalance] = useState<string | number>(
    personAccount?.openingBalance !== undefined && personAccount?.openingBalance !== null
      ? personAccount.openingBalance
      : ''
  );
  const [openingDate, setOpeningDate] = useState(personAccount?.openingDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(personAccount?.notes || '');


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/:/g, '');
    setDisplayName(val);
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;
    
    // We construct the underlying hledger account name
    // Assuming "person" implies an asset or liability based on how the backend handles it.
    // For simplicity, we just pass the required fields for addAccount / updateAccount.
    // Wait, the original `addPersonOrGroup` did this implicitly.
    // Actually, `addPersonOrGroup` was defined in settings-store! Let's just use `addAccount` and `updateAccount` directly.
    const numericBalance = openingBalance ? Number(openingBalance) : 0;
    const isLiability = numericBalance < 0;
    const type = isLiability ? 'Liability' : 'Asset';
    const pathPrefix = isLiability ? 'liabilities:people' : 'assets:people';

    const payload = {
      name: `${pathPrefix}:${displayName.trim().replace(/\s+/g, '-')}`,
      displayName: displayName.trim(),
      openingBalance: numericBalance,
      openingDate,
      notes: notes.trim() || null,
    };
    
    try {
      if (mode === 'add') {
        await addAccount({ ...payload, type });
      } else if (id) {
        // Maintain the original type on edit
        const originalType = personAccount?.type || 'Asset';
        await updateAccount(id, { 
          displayName: displayName.trim(), 
          openingBalance: numericBalance,
          openingDate,
          notes: notes.trim() || null,
          type: originalType
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      window.history.back();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete "${displayName}"?`);
    if (!confirmDelete) return;

    try {
      await deleteAccount(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      window.history.back();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete person');
    }
  };

  const inputClass = "bg-neutral-900 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-full font-medium disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 text-foreground">
      <div className="flex flex-col gap-4">
        
        {/* Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Person Name</label>
          <input
            type="text"
            value={displayName}
            onChange={handleNameChange}
            placeholder="e.g. John Doe"
            className={inputClass}
            required
          />
        </div>


        {/* Opening Balance and Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Opening Balance</label>
            <input
              type="number"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Opening Date</label>
            <input
              type="date"
              value={openingDate}
              onChange={e => setOpeningDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>



        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add optional notes about this person"
            rows={2}
            className={cn(inputClass, "resize-none")}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!displayName.trim()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 h-12 rounded-xl cursor-pointer disabled:opacity-50"
          >
            Save
          </Button>
          <Button
            onClick={() => window.history.back()}
            className="flex-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-foreground font-semibold flex items-center justify-center h-12 rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
        </div>

        {mode === 'edit' && id && (
          <Button
            onClick={handleDelete}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-2 h-12 rounded-xl cursor-pointer border border-rose-500/20"
          >
            Delete Person
          </Button>
        )}
      </div>
    </div>
  );
}

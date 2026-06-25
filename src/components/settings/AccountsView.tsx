import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAccounts, addAccount, updateAccount, deleteAccount, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AccountType, AccountId } from '@finance-platform/shared-types';
import { generateHledgerPath, AccountEntitySchema } from '@finance-platform/shared-types';
import { ZodError } from 'zod';
import { CustomSelect } from '@/components/ui/select';

import PersonFormView from './PersonFormView';

export default function AccountsView() {
  const [location] = useLocation();
  const pathParts = location.split('?')[0].split('/').filter(Boolean);
  const action = pathParts[2];
  const editingId = pathParts[3] as AccountId | undefined;

  if (action === 'add') {
    return <AccountFormView mode="add" />;
  }

  if (action === 'edit' && editingId) {
    return <AccountFormView mode="edit" id={editingId} />;
  }

  if (action === 'add-person') {
    return <PersonFormView mode="add" />;
  }

  if (action === 'edit-person' && editingId) {
    return <PersonFormView mode="edit" id={editingId} />;
  }

  return <AccountsListView />;
}

// ---------------- LIST VIEW ----------------
function AccountsListView() {
  const [, navigate] = useLocation();
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: fetchAccounts });
  const [activeSection, setActiveSection] = useState<'Asset' | 'Liability' | 'People'>('Asset');

  const groupedAccounts = useMemo(() => {
    // Filter by active section type (Asset or Liability) and handle People tab
    // Exclude root system accounts (Assets, Liabilities, etc. which have no parent)
    const filtered = accounts.filter((acc: any) => {
      if (acc.parentId === null || acc.parentId === undefined) {
        return false;
      }
      const isPeople = acc.name.toLowerCase().startsWith('assets:people:') ||
                       acc.name.toLowerCase().startsWith('liabilities:people:');
      if (activeSection === 'People') {
        return isPeople;
      }
      return acc.type === activeSection && !isPeople;
    });
    
    // Group by path segment (fallback to 'none' if empty/null)
    const groups: Record<string, any[]> = {};
    filtered.forEach(acc => {
      const parts = acc.name.split(':');
      const groupKey = activeSection === 'People' ? 'People' : (parts.length > 2 ? parts[1] : 'none');
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(acc);
    });
    
    return groups;
  }, [accounts, activeSection]);

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 relative min-h-full">
      {/* Segmented control for Asset / Liability / People selection */}
      <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-850 select-none">
        <button
          type="button"
          onClick={() => setActiveSection('Asset')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSection === 'Asset'
              ? "bg-neutral-900 text-foreground border border-neutral-850 shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Assets
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('Liability')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSection === 'Liability'
              ? "bg-neutral-900 text-foreground border border-neutral-850 shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Liabilities
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('People')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSection === 'People'
              ? "bg-neutral-900 text-foreground border border-neutral-850 shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          People
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {Object.entries(groupedAccounts).map(([groupName, list]) => {
          if (list.length === 0) return null;
          return (
            <div key={groupName} className="flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                {groupName === 'none' ? 'General / Other' : groupName}
              </h4>
              <div className="bg-neutral-900/60 border border-neutral-850 rounded-2xl overflow-hidden divide-y divide-neutral-850">
                {list.map(acc => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      const isPeople = acc.name.toLowerCase().startsWith('assets:people:') ||
                                       acc.name.toLowerCase().startsWith('liabilities:people:');
                      if (isPeople) {
                        navigate(`/settings/accounts/edit-person/${acc.id}`);
                      } else {
                        navigate(`/settings/accounts/edit/${acc.id}`);
                      }
                    }}
                    className={cn(
                      "p-4 hover:bg-neutral-900/80 transition-colors cursor-pointer select-none flex items-center justify-between",
                      acc.archived && "opacity-60"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{acc.displayName}</span>
                    {acc.archived && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-850 text-neutral-500 text-[8px] font-bold uppercase tracking-wider border border-neutral-800">
                        Archived
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {Object.keys(groupedAccounts).length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-4 border border-dashed border-neutral-850 rounded-2xl">
            <span className="text-sm font-medium text-muted-foreground">
              {activeSection === 'People' ? 'No people configured yet.' : 'No accounts configured yet.'}
            </span>
            <span className="text-xs text-muted-foreground/80 max-w-[200px]">
              {activeSection === 'People' ? 'Click the "+" button below to add your first contact.' : 'Click the "+" button below to add your first account.'}
            </span>
          </div>
        )}
      </div>

      {/* Floating Action Button to Add Account / Person */}
      <div className="absolute right-4 bottom-4 z-10">
        <button
          onClick={() => navigate(activeSection === 'People' ? '/settings/accounts/add-person' : '/settings/accounts/add')}
          className="size-12 rounded-2xl shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          aria-label={activeSection === 'People' ? 'Add Person' : 'Add Account'}
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

// ---------------- FORM VIEW (ADD / EDIT) ----------------
function AccountFormView({ mode, id }: { mode: 'add' | 'edit'; id?: AccountId }) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: fetchAccounts });
  const account = id ? accounts.find(a => a.id === id) : null;

  const [displayName, setDisplayName] = useState(account?.displayName || '');
  const [type, setType] = useState<AccountType>(account?.type || 'Asset');
  const [openingBalance, setOpeningBalance] = useState<string | number>(
    account?.openingBalance !== undefined && account?.openingBalance !== null
      ? account.openingBalance
      : ''
  );
  const [openingDate, setOpeningDate] = useState(account?.openingDate || new Date().toISOString().split('T')[0]);
  
  // Group management logic
  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    accounts.forEach(a => {
      if (a.type === type) {
        const parts = a.name.split(':');
        if (parts.length > 2) {
          groups.add(parts[1]);
        }
      }
    });
    return Array.from(groups);
  }, [accounts, type]);

  const [groupOption, setGroupOption] = useState(() => {
    if (!account) return '';
    const parts = account.name.split(':');
    if (parts.length > 2) {
      return parts[1];
    }
    return '';
  });
  const [customGroupText, setCustomGroupText] = useState('');

  const typeOptions = useMemo(() => [
    { value: 'Asset', label: 'Asset' },
    { value: 'Liability', label: 'Liability' },
    { value: 'Equity', label: 'Equity' },
    { value: 'Income', label: 'Income' },
    { value: 'Expense', label: 'Expense' }
  ], []);

  const groupOptions = useMemo(() => {
    const opts = [{ value: '', label: 'No Group' }];
    existingGroups.forEach(g => {
      opts.push({ value: g, label: g });
    });
    opts.push({ value: '__custom__', label: '+ Custom Group...' });
    return opts;
  }, [existingGroups]);

  const [notes, setNotes] = useState(account?.notes || '');

  // Deriving Hledger Path
  const effectiveParentGroup = groupOption === '__custom__' ? customGroupText : groupOption;

  const generatedPathName = generateHledgerPath(type, displayName, effectiveParentGroup || null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/:/g, '');
    setDisplayName(val);
  };

  const handleCustomGroupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/:/g, '');
    setCustomGroupText(val);
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;

    const fullAccountName = generatedPathName;

    try {
      const payloadSchema = AccountEntitySchema.omit({
        id: true,
        lastReconciledDate: true,
      });

      const validatedPayload = payloadSchema.parse({
        name: fullAccountName,
        displayName: displayName.trim(),
        type,
        openingBalance: Number(openingBalance) || 0,
        openingDate,
        archived: false,
        notes: notes.trim() || null,
        parentId: null,
      });

      if (mode === 'add') {
        await addAccount({
          ...validatedPayload,
          lastReconciledDate: null,
        });
      } else if (mode === 'edit' && id) {
        await updateAccount(id, {
          ...validatedPayload,
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      window.history.back();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        toast.error(firstIssue.message || 'Validation failed');
      } else if (err instanceof Error) {
        toast.error(err.message || 'Failed to save');
      } else {
        toast.error('Failed to save');
      }
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete "${displayName}"? This will also delete its opening balance transaction.`);
    if (!confirmDelete) return;

    try {
      await deleteAccount(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      window.history.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      toast.error(message);
    }
  };

  const inputClass = "bg-neutral-900 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-full font-medium disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 text-foreground">
      <div className="flex flex-col gap-4">
        
        {/* Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Name</label>
          <input
            type="text"
            value={displayName}
            onChange={handleNameChange}
            placeholder="e.g. HDFC Bank Savings"
            className={inputClass}
            required
          />
        </div>


        {/* Type Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Type</label>
          <CustomSelect
            value={type}
            onChange={val => setType(val as AccountType)}
            options={typeOptions}
          />
        </div>

        {/* Parent Group Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Group</label>
          <CustomSelect
            value={groupOption}
            onChange={val => {
              setGroupOption(val);
              if (val !== '__custom__') {
                setCustomGroupText('');
              }
            }}
            options={groupOptions}
          />
        </div>

        {/* Custom Group Text Input */}
        {groupOption === '__custom__' && (
          <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custom Group Name</label>
            <input
              type="text"
              value={customGroupText}
              onChange={handleCustomGroupChange}
              placeholder="e.g. wallets, investments"
              className={inputClass}
              required
            />
          </div>
        )}

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
            placeholder="Add optional notes about this account"
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
            <Check className="size-4" /> {mode === 'add' ? 'Create Account' : 'Save Changes'}
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
            Delete Account
          </Button>
        )}
      </div>
    </div>
  );
}

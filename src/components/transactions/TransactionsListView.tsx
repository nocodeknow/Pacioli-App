import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Scale, 
  DollarSign, 
  X, 
  ChevronRight, 
  HelpCircle 
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchAccounts, fetchCategories, queryKeys } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Transaction, AccountEntity, Category } from '@finance-platform/shared-types';
import { CustomSelect } from '@/components/ui/select';

export default function TransactionsListView() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.transactions,
    queryFn: fetchTransactions,
  });
  const transactions = data?.transactions || [];
  const { data: accounts = [] as AccountEntity[] } = useQuery({ queryKey: queryKeys.accounts, queryFn: fetchAccounts });
  const { data: categories = [] as Category[] } = useQuery({ queryKey: queryKeys.categories, queryFn: fetchCategories });

  const getAccountName = (idOrPath: string) => 
    accounts.find(a => a.id === idOrPath || a.name.toLowerCase() === idOrPath.toLowerCase())?.displayName || idOrPath.split(':').pop() || idOrPath;
  const getCategoryName = (idOrPath: string) => 
    categories.find(c => c.id === idOrPath || c.name.toLowerCase() === idOrPath.toLowerCase())?.displayName || idOrPath.split(':').pop() || idOrPath;
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [limit, setLimit] = useState(100);

  // Reset pagination limit when search filters change
  useEffect(() => {
    setLimit(100);
  }, [search, selectedType, selectedAccount]);

  const accountFilterOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Accounts' }];
    const forbidden = ['assets', 'liabilities', 'equity', 'income', 'expenses', 'expense'];
    accounts
      .filter(acc => {
        if (acc.isGroup) return false;
        if (acc.parentId === null || acc.parentId === undefined) return false;
        const nameLower = acc.name.toLowerCase();
        const displayLower = acc.displayName.toLowerCase();
        if (forbidden.includes(nameLower) || forbidden.includes(displayLower)) {
          return false;
        }
        return true;
      })
      .forEach(acc => {
        opts.push({ value: acc.name, label: acc.displayName });
      });
    return opts;
  }, [accounts]);

  // Search logic is notes-only as required
  const filteredTransactions = useMemo(() => {
    const forbidden = ['assets', 'liabilities', 'equity', 'income', 'expenses', 'expense'];
    return transactions.filter(t => {
      // Unconditionally hide transactions that use root or group accounts/categories
      const hasRootOrGroupPosting = t.postings.some(p => {
        const lower = p.account.toLowerCase();
        if (forbidden.includes(lower)) return true;
        
        const matchedAcc = accounts.find(a => a.name.toLowerCase() === lower);
        if (matchedAcc && matchedAcc.isGroup) return true;

        const matchedCat = categories.find(c => c.name.toLowerCase() === lower);
        if (matchedCat && matchedCat.isGroup) return true;

        return false;
      });
      if (hasRootOrGroupPosting) {
        return false;
      }

      // 1. Search (notes-only)
      if (search.trim() !== '') {
        const notesStr = t.notes || '';
        if (!notesStr.toLowerCase().includes(search.toLowerCase().trim())) {
          return false;
        }
      }

      // 2. Type Filter
      if (selectedType !== 'all' && t.type !== selectedType) {
        return false;
      }

      // 3. Account Filter
      if (selectedAccount !== 'all') {
        const matchesAccount = t.postings.some(p => p.account === selectedAccount);
        if (!matchesAccount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, accounts, categories, search, selectedType, selectedAccount]);



  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const slicedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, limit);
  }, [filteredTransactions, limit]);

  const groupedTransactions = useMemo(() => {
    const groups: { dateStr: string; label: string; transactions: Transaction[] }[] = [];
    
    slicedTransactions.forEach(tx => {
      const label = formatGroupDate(tx.date);
      let group = groups.find(g => g.dateStr === tx.date);
      if (!group) {
        group = { dateStr: tx.date, label, transactions: [] };
        groups.push(group);
      }
      group.transactions.push(tx);
    });
    
    return groups;
  }, [slicedTransactions]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Income':
        return <ArrowDownLeft className="size-4" />;
      case 'Expense':
        return <ArrowUpRight className="size-4" />;
      case 'Transfer':
        return <ArrowRightLeft className="size-4" />;
      case 'Split':
        return <Scale className="size-4" />;
      default:
        return <DollarSign className="size-4" />;
    }
  };

  const getTypeIconStyles = (type: string) => {
    switch (type) {
      case 'Income':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Expense':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Transfer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Split':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedAccount('all');
    setLimit(100);
  };

  return (
    <div className="flex flex-col bg-background text-foreground select-none">
      {/* Search and Filters Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-border bg-background">
        {/* Search Input (Notes only) */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes only..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          {['all', 'Income', 'Expense', 'Transfer', 'Split'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer whitespace-nowrap",
                selectedType === type
                  ? "bg-primary border-primary text-primary-foreground font-bold"
                  : "bg-neutral-900 border-neutral-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {type === 'all' 
                ? 'All Types' 
                : type === 'Income' 
                ? 'Inflow' 
                : type === 'Expense' 
                ? 'Outflow' 
                : type}
            </button>
          ))}
        </div>

        {/* Account Filter Select */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Filter Account:</span>
          <CustomSelect
            value={selectedAccount}
            onChange={(val) => setSelectedAccount(val)}
            options={accountFilterOptions}
            size="xs"
            className="flex-1"
          />
          {(selectedType !== 'all' || selectedAccount !== 'all' || search) && (
            <button 
              onClick={clearFilters}
              className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4 py-3">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading transactions...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">Failed to load transactions.</div>
          ) : groupedTransactions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-muted-foreground">
                <HelpCircle className="size-5 text-neutral-400" />
              </div>
              <h3 className="text-sm font-semibold">No Transactions Found</h3>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                Try adjusting your search criteria or filters to locate transactions.
              </p>
              {(selectedType !== 'all' || selectedAccount !== 'all' || search) && (
                <Button onClick={clearFilters} size="sm" className="mt-1 bg-neutral-900 hover:bg-neutral-850 text-foreground border border-neutral-800">
                  Clear Filters
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5 pb-32"
            >
              {groupedTransactions.map((group) => (
                <div key={group.dateStr} className="flex flex-col gap-2.5">
                  <h4 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground ml-1 mb-1 py-1">
                    {group.label}
                  </h4>
                  {group.transactions.map((tx) => {
                    const displayNotes = tx.notes || '';
                    const hasNotes = displayNotes.trim().length > 0;
                    
                    const getPrimaryAccount = (t: Transaction) => {
                      const accPostings = t.postings.filter(p => {
                        const lower = p.account.toLowerCase();
                        return lower.startsWith('assets:') || lower.startsWith('liabilities:') || lower.startsWith('equity:');
                      });
                      if (accPostings.length === 1) {
                        return getAccountName(accPostings[0].account);
                      } else if (accPostings.length > 1) {
                        const neg = accPostings.find(p => p.amount < 0);
                        if (neg) return getAccountName(neg.account);
                        return getAccountName(accPostings[0].account);
                      }
                      if (t.postings.length > 0) {
                        return getAccountName(t.postings[0].account);
                      }
                      return 'Unknown';
                    };

                    let fallbackDesc: string = tx.type;
                    if (tx.type === 'Expense') {
                      const expPost = tx.postings.find(p => p.amount > 0);
                      fallbackDesc = expPost ? getCategoryName(expPost.account) : tx.type;
                    } else if (tx.type === 'Income') {
                      const incPost = tx.postings.find(p => p.account.toLowerCase().startsWith('income:'));
                      fallbackDesc = incPost ? getCategoryName(incPost.account) : tx.type;
                    } else if (tx.type === 'Transfer') {
                      const toPost = tx.postings.find(p => p.amount > 0);
                      fallbackDesc = toPost ? `To: ${getAccountName(toPost.account)}` : tx.type;
                    } else if (tx.type === 'Split') {
                      fallbackDesc = `Split (${tx.postings.length} postings)`;
                    }

                    return (
                      <div
                        key={tx.id}
                        onClick={() => navigate(`/transactions/edit/${tx.id}`)}
                        className="flex items-center justify-between p-3.5 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-900/50 rounded-2xl cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                          {/* Icon */}
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                            getTypeIconStyles(tx.type)
                          )}>
                            {getTypeIcon(tx.type)}
                          </div>
                          
                          {/* Info */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-semibold tracking-tight truncate text-foreground">
                              {fallbackDesc}
                            </span>
                            
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
                              <span className="shrink-0">{getPrimaryAccount(tx)}</span>
                              {hasNotes && (
                                <>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate italic">{displayNotes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "text-xs font-bold tracking-tight",
                            tx.type === 'Income' ? 'text-emerald-400' :
                            tx.type === 'Expense' ? 'text-rose-400' : 'text-foreground'
                          )}>
                            {formatCurrency(Math.abs(tx.amount))}
                          </span>
                          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {filteredTransactions.length > limit && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => setLimit(prev => prev + 100)}
                    className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-foreground text-xs font-semibold px-6 py-2 rounded-xl cursor-pointer w-full sm:w-auto"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Inbox, History, Settings, Plus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import DashboardView from './components/DashboardView';
import InboxView from './components/inbox/InboxView';
import TransactionsView from './components/transactions/TransactionsView';
import SettingsView from './components/settings/SettingsView';
import { Router, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { fetchAccount, queryKeys } from '@/lib/api';

/** Maps (tab, detail) → page title string shown in the top app bar. */
function getPageTitle(tab: string, detail: string | null): string {
  const detailTitles: Record<string, string> = {
    'net-worth': 'Net Worth',
    'monthly-flow': 'Monthly Flow',
    'settlement': 'Settlement',
    'candidate-review': 'Review Candidate',
    'transaction-add': 'Add Transaction',
    'transaction-edit': 'Edit Transaction',
    'settings-preferences': 'UI Preference',
    'settings-accounts': 'Accounts',
    'settings-account-add': 'Add Account',
    'settings-account-edit': 'Edit Account',
    'settings-categories': 'Categories',
    'settings-category-add': 'Add Category',
    'settings-category-edit': 'Edit Category',
    'settings-connectors': 'Connectors',
    'settings-connector-edit': 'Edit Connector',
    'settings-person-add': 'Add Person',
    'settings-person-edit': 'Edit Person',
  };

  if (detail && detail in detailTitles) {
    return detailTitles[detail]!;
  }

  const tabTitles: Record<string, string> = {
    dashboard: 'Pacioli',
    inbox: 'Inbox',
    transactions: 'Transactions',
    settings: 'Settings',
  };

  return tabTitles[tab] ?? tab;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppContent />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

function AppContent() {
  const [location, navigate] = useLocation();
  const pathParts = location.split('/').filter(Boolean);
  const activeTab = pathParts[0] || 'dashboard';
  let activeDetail: string | null = null;
  if (pathParts.length > 1) {
    if (activeTab === 'inbox' && pathParts[1] === 'review') activeDetail = 'candidate-review';
    else if (activeTab === 'settings' && pathParts.length >= 3) {
      if (pathParts[2] === 'add') activeDetail = `settings-${pathParts[1]}-add`;
      else if (pathParts[2] === 'edit') activeDetail = `settings-${pathParts[1]}-edit`;
      else if (pathParts[1] === 'accounts' && pathParts[2] === 'add-person') activeDetail = 'settings-person-add';
      else if (pathParts[1] === 'accounts' && pathParts[2] === 'edit-person') activeDetail = 'settings-person-edit';
    }
    else activeDetail = `${activeTab}-${pathParts[1]}`;
  }
  if (activeTab === 'settings' && pathParts.length === 2 && pathParts[1] !== 'preferences') activeDetail = `settings-${pathParts[1]}`;

  const isLedger = activeTab === 'dashboard' && pathParts[1] === 'ledger';
  const ledgerAccountId = isLedger && pathParts[2] ? decodeURIComponent(pathParts[2]) : null;

  const { data: ledgerAccount } = useQuery({
    queryKey: queryKeys.account(ledgerAccountId!),
    queryFn: () => fetchAccount(ledgerAccountId!),
    enabled: !!ledgerAccountId,
  });
  if (activeTab === 'settings' && pathParts.length === 2 && pathParts[1] === 'preferences') activeDetail = 'settings-preferences';
  
  const navigationItems: { id: 'dashboard'|'inbox'|'transactions'|'settings'; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background sm:bg-neutral-950 flex flex-col items-center sm:justify-center font-sans antialiased text-foreground">
      {/* Phone Container: Standard Android viewport frame on desktop, full-screen on mobile */}
      <div className="w-full max-w-md h-[100dvh] sm:h-[800px] bg-background sm:border sm:border-neutral-800/80 sm:rounded-[36px] sm:shadow-2xl overflow-hidden flex flex-col relative sm:my-6">
        
        {/* Top App Bar */}
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 sticky top-0 z-10 select-none">
          <div className="flex items-center gap-3">
            {activeDetail !== null ? (
              <button
                onClick={() => {
                  if (activeTab === 'inbox') navigate('/inbox');
                  else if (activeTab === 'transactions') navigate('/transactions');
                  else if (activeTab === 'settings') {
                    if (activeDetail === 'settings-account-add' || activeDetail === 'settings-account-edit' || activeDetail === 'settings-person-add' || activeDetail === 'settings-person-edit') {
                      navigate('/settings/accounts');
                    } else if (activeDetail === 'settings-category-add' || activeDetail === 'settings-category-edit') {
                      navigate('/settings/categories');
                    } else if (activeDetail === 'settings-connector-edit') {
                      navigate('/settings/connectors');
                    } else {
                      navigate('/settings');
                    }
                  } else if (activeTab === 'dashboard') {
                    if (activeDetail === 'dashboard-ledger') {
                      const isPeopleAcc = ledgerAccountId?.toLowerCase().startsWith('assets:people:') || 
                                          ledgerAccountId?.toLowerCase().startsWith('liabilities:people:');
                      if (isPeopleAcc) {
                        navigate('/dashboard/settlement');
                      } else {
                        navigate('/dashboard/net-worth');
                      }
                    } else if (activeDetail === 'dashboard-monthly-flow' && pathParts[2] === 'category') {
                      navigate('/dashboard/monthly-flow');
                    } else {
                      navigate('/dashboard');
                    }
                  } else navigate('/dashboard');
                }}
                className="p-1 -ml-1 rounded-full hover:bg-neutral-900 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="size-5" />
              </button>
            ) : null}
            {activeDetail === 'dashboard-ledger' ? (
              <div className="flex flex-col leading-none">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  {ledgerAccount?.displayName || 'Loading...'}
                </span>
              </div>
            ) : activeTab === 'dashboard' && activeDetail === 'dashboard-monthly-flow' && pathParts[2] === 'category' ? (
              <div className="flex flex-col leading-none">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  {pathParts[3] ? decodeURIComponent(pathParts[3]) : 'Category'}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate max-w-[200px] mt-0.5">
                  {pathParts[4] ? decodeURIComponent(pathParts[4]) : ''}
                </span>
              </div>
            ) : (
              <h1 className="text-xl font-semibold tracking-tight capitalize">
                {getPageTitle(activeTab, activeDetail)}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              U
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <DashboardView key="dashboard" />
            ) : activeTab === 'inbox' ? (
              <InboxView key="inbox" />
            ) : activeTab === 'transactions' ? (
              <TransactionsView key="transactions" />
            ) : activeTab === 'settings' ? (
              <SettingsView key="settings" />
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="h-full flex flex-col items-center justify-center text-center gap-2 p-6 px-4 py-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  {(() => {
                    const ActiveIcon = navigationItems.find(t => t.id === activeTab)?.icon || LayoutDashboard;
                    return <ActiveIcon className="size-8" />;
                  })()}
                </div>
                <h2 className="text-lg font-medium capitalize">{activeTab}</h2>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  This is a placeholder for the {activeTab} view. The screen will be implemented in a future milestone.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Action Button (FAB) Placeholder */}
        {activeDetail === null && (
          <div className="absolute right-4 bottom-20 z-10">
            <Button
              size="icon"
              onClick={() => navigate('/transactions/add')}
              className="size-14 rounded-2xl shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Add Transaction"
            >
              <Plus className="size-6" />
            </Button>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="h-16 bg-background border-t border-border flex items-center justify-around pb-safe sticky bottom-0 z-10 select-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(`/${item.id}`);
                }}
                className="flex-1 h-full flex flex-col items-center justify-center gap-1 relative text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
              >
                {/* Active Indicator Background pill (Material You style) */}
                <div
                  className={cn(
                    'w-14 h-8 rounded-full flex items-center justify-center relative transition-all duration-200',
                    isActive ? 'bg-primary/15 text-primary' : 'group-hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Icon className="size-5" />
                  {item.badge && (
                    <span className="absolute top-1 right-1.5 min-w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center px-1 border border-background">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium tracking-wide transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}


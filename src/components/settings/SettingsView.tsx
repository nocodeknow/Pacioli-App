import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchCategories, queryKeys } from '@/lib/api';
import { 
  Sliders, 
  Landmark, 
  Tag, 
  Database, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import PreferencesView from './PreferencesView';
import AccountsView from './AccountsView';
import CategoriesView from './CategoriesView';
import ConnectorsView from './ConnectorsView';

export default function SettingsView() {
  const [location] = useLocation();
  const pathParts = location.split('/').filter(Boolean);
  const activeDetail = pathParts.length > 1 ? pathParts[1] : null;

  // Animation variants
  const slideVariants = {
    initial: { opacity: 0, x: 15 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.15, ease: 'easeOut' } },
    exit: { opacity: 0, x: -15, transition: { duration: 0.12, ease: 'easeIn' } }
  };

  return (
    <div className="h-full bg-background relative flex flex-col">
      <AnimatePresence mode="wait">
        {activeDetail === 'preferences' ? (
          <motion.div key="preferences" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="h-full">
            <PreferencesView />
          </motion.div>
        ) : activeDetail?.startsWith('account') || activeDetail?.startsWith('person') ? (
          <motion.div key="accounts" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="h-full">
            <AccountsView />
          </motion.div>
        ) : activeDetail?.startsWith('categor') ? (
          <motion.div key="categories" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="h-full">
            <CategoriesView />
          </motion.div>
        ) : activeDetail?.startsWith('connector') ? (
          <motion.div key="connectors" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="h-full">
            <ConnectorsView />
          </motion.div>
        ) : (
          <motion.div 
            key="main"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slideVariants}
            className="flex-1 overflow-y-auto w-full absolute inset-0"
          >
            <div className="flex flex-col gap-6 p-5 pb-24">
              <SettingsMainList />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsMainList() {
  const [, navigate] = useLocation();
  const { data: categories = [] } = useQuery({ queryKey: queryKeys.categories, queryFn: fetchCategories });

  const activeCategoriesCount = categories.filter(c => !c.archived).length;

  const menuItems = [
    {
      id: 'preferences',
      label: 'UI Preference',
      desc: 'App light and dark mode theme',
      icon: Sliders,
      path: '/settings/preferences',
    },
    {
      id: 'accounts',
      label: 'Accounts',
      desc: 'Manage accounts and groupings',
      icon: Landmark,
      path: '/settings/accounts',
    },
    {
      id: 'categories',
      label: 'Categories',
      desc: `${activeCategoriesCount} classification codes`,
      icon: Tag,
      path: '/settings/categories',
    },
    {
      id: 'connectors',
      label: 'Connectors',
      desc: 'Google Sheets credentials (Temporarily Disabled)',
      icon: Database,
      path: '/settings/connectors',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Settings Menu Options */}
      <div className="flex flex-col gap-2.5">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex items-center justify-between p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-850 rounded-2xl transition-colors cursor-pointer select-none group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-neutral-850">
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          );
        })}

        {/* Future Options Card (Disabled) */}
        <div className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-850/50 rounded-2xl opacity-50 cursor-not-allowed select-none">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-900/50 flex items-center justify-center text-muted-foreground border border-neutral-850/40">
              <Sparkles className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">Advanced Analytics</span>
              <span className="text-xs text-muted-foreground">Coming in V2 (Post-Hledger Release)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

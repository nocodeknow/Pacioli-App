import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, addCategory, updateCategory, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CategoryType, CategoryId } from '@finance-platform/shared-types';
import { CustomSelect } from '@/components/ui/select';

export default function CategoriesView() {
  const [location] = useLocation();
  const pathParts = location.split('?')[0].split('/').filter(Boolean);
  const action = pathParts[2];
  const editingId = pathParts[3] as CategoryId | undefined;

  if (action === 'add') {
    return <CategoryFormView mode="add" />;
  }

  if (action === 'edit' && editingId) {
    return <CategoryFormView mode="edit" id={editingId} />;
  }

  return <CategoriesListView />;
}

// ---------------- LIST VIEW ----------------
function CategoriesListView() {
  const [, navigate] = useLocation();
  const { data: categories = [] } = useQuery({ queryKey: queryKeys.categories, queryFn: fetchCategories });
  const [activeSection, setActiveSection] = useState<CategoryType>('Expense');

  const groupedCategories = useMemo(() => {
    // Filter by active section type (Expense or Income)
    const filtered = categories.filter(cat => cat.type === activeSection);
    
    // Group by parentCategory display name (fallback to 'none' if empty/null)
    const groups: Record<string, typeof categories> = {};
    filtered.forEach(cat => {
      let groupKey = 'none';
      if (cat.parentCategory) {
        const parent = categories.find(c => c.id === cat.parentCategory);
        if (parent) {
          groupKey = parent.displayName;
        }
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(cat);
    });
    
    return groups;
  }, [categories, activeSection]);

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 relative min-h-full">
      {/* Segmented control for Expense / Income selection */}
      <div className="grid grid-cols-2 gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-850 select-none">
        <button
          type="button"
          onClick={() => setActiveSection('Expense')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSection === 'Expense'
              ? "bg-neutral-900 text-foreground border border-neutral-850 shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('Income')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSection === 'Income'
              ? "bg-neutral-900 text-foreground border border-neutral-850 shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Income
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {Object.entries(groupedCategories).map(([groupName, list]) => {
          if (list.length === 0) return null;
          return (
            <div key={groupName} className="flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                {groupName === 'none' ? 'General / Top-level' : groupName}
              </h4>
              <div className="bg-neutral-900/60 border border-neutral-850 rounded-2xl overflow-hidden divide-y divide-neutral-850">
                {list.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => navigate(`/settings/categories/edit/${cat.id}`)}
                    className={cn(
                      "p-4 hover:bg-neutral-900/80 transition-colors cursor-pointer select-none flex items-center justify-between",
                      cat.archived && "opacity-60"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{cat.displayName}</span>
                    {cat.archived && (
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

        {Object.keys(groupedCategories).length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-4 border border-dashed border-neutral-850 rounded-2xl">
            <span className="text-sm font-medium text-muted-foreground">No categories configured yet.</span>
            <span className="text-xs text-muted-foreground/80 max-w-[200px]">Click the "+" button below to add your first category.</span>
          </div>
        )}
      </div>

      {/* Floating Action Button to Add Category */}
      <div className="absolute right-4 bottom-4 z-10">
        <button
          onClick={() => navigate('/settings/categories/add')}
          className="size-12 rounded-2xl shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          aria-label="Add Category"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

// ---------------- FORM VIEW (ADD / EDIT) ----------------
function CategoryFormView({ mode, id }: { mode: 'add' | 'edit'; id?: CategoryId }) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: queryKeys.categories, queryFn: fetchCategories });
  const category = id ? categories.find(c => c.id === id) : null;

  const [displayName, setDisplayName] = useState(category?.displayName || '');
  const [type, setType] = useState<CategoryType>(category?.type || 'Expense');
  const [parentCategory, setParentCategory] = useState<string>(category?.parentCategory || '');
  const [archived, setArchived] = useState(category?.archived || false);
  const [notes, setNotes] = useState(category?.notes || '');

  const typeOptions = useMemo(() => [
    { value: 'Expense', label: 'Expense' },
    { value: 'Income', label: 'Income' }
  ], []);

  const parentOptions = useMemo(() => {
    const opts = [{ value: '', label: 'No Parent Category' }];
    categories
      .filter(c => c.id !== id && c.type === type)
      .forEach(c => {
        opts.push({ value: c.id, label: c.displayName });
      });
    return opts;
  }, [categories, id, type]);

  // Deriving Hledger Path
  const typePrefix = type === 'Income' ? 'Income' : 'Expenses';
  const cleanNameSegment = displayName.replace(/:/g, '').trim().replace(/[^a-zA-Z0-9\-_]/g, '').replace(/[\s]+/g, '-');
  
  let fullCategoryName = `${typePrefix}:${cleanNameSegment}`;
  if (parentCategory) {
    const parent = categories.find(c => c.id === parentCategory);
    if (parent) {
      fullCategoryName = `${parent.name}:${cleanNameSegment}`;
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/:/g, '');
    setDisplayName(val);
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;

    try {
      if (mode === 'add') {
        await addCategory({
          name: fullCategoryName,
          displayName: displayName.trim(),
          type,
          parentCategory: (parentCategory as CategoryId) || null,
          archived: false,
          notes: notes.trim() || null,
        });
      } else if (mode === 'edit' && id) {
        await updateCategory(id, {
          name: fullCategoryName,
          displayName: displayName.trim(),
          type,
          parentCategory: (parentCategory as CategoryId) || null,
          archived,
          notes: notes.trim() || null,
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      window.history.back();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const inputClass = "bg-neutral-900 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-full font-medium disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 text-foreground">
      <div className="flex flex-col gap-4">
        
        {/* Category Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category Name</label>
          <input
            type="text"
            value={displayName}
            onChange={handleNameChange}
            placeholder="e.g. Dining Out"
            className={inputClass}
            required
          />
        </div>


        {/* Type Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category Type</label>
          <CustomSelect
            value={type}
            onChange={val => {
              setType(val as CategoryType);
              setParentCategory(''); // Reset parent if type changes to prevent cross-type nesting
            }}
            options={typeOptions}
          />
        </div>

        {/* Parent Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Parent Category</label>
          <CustomSelect
            value={parentCategory}
            onChange={val => setParentCategory(val)}
            options={parentOptions}
          />
        </div>

        {/* Archived switch (only on edit) */}
        {mode === 'edit' && (
          <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-850 rounded-2xl mt-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Archive Category</span>
              <span className="text-[10px] text-muted-foreground">Hides category from transaction selection menus.</span>
            </div>
            <input
              type="checkbox"
              checked={archived}
              onChange={e => setArchived(e.target.checked)}
              className="size-5 rounded border-neutral-800 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add optional notes about this category"
            rows={2}
            className={cn(inputClass, "resize-none")}
          />
        </div>
      </div>

      {/* Action Save Button */}
      <div className="flex gap-3 mt-4">
        <Button
          onClick={handleSave}
          disabled={!displayName.trim()}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 h-12 rounded-xl cursor-pointer disabled:opacity-50"
        >
          <Check className="size-4" /> {mode === 'add' ? 'Create Category' : 'Save Changes'}
        </Button>
        <Button
          onClick={() => window.history.back()}
          className="flex-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-foreground font-semibold flex items-center justify-center h-12 rounded-xl cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

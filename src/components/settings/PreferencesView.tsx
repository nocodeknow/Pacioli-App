import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function PreferencesView() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const handleSave = () => {
    localStorage.setItem('theme', theme);
    // Ideally we would apply the theme class here as well, e.g. document.documentElement.classList.add(theme)
    window.history.back();
  };

  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      <div className="flex flex-col gap-4">
        {/* Theme Settings */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">App Theme</label>
          <div className="grid grid-cols-2 gap-3 bg-neutral-950 p-1 rounded-xl border border-neutral-850">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${theme === 'dark' ? 'bg-neutral-900 text-foreground border border-neutral-800' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Dark Mode (Default)
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${theme === 'light' ? 'bg-neutral-900 text-foreground border border-neutral-800' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Light Mode
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 h-12 rounded-xl cursor-pointer select-none">
          <Check className="size-4" /> Save UI Preference
        </Button>
      </div>
    </div>
  );
}


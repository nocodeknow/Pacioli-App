import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date();
};

const formatLocalDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }
  return dateStr;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Current view month & year state (initialized to selected date)
  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const [viewDate, setViewDate] = useState(() => parseLocalDate(value));

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewMonth, viewYear]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewMonth, viewYear]);

  const prevMonthDays = useMemo(() => {
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    return new Date(prevYear, prevMonth + 1, 0).getDate();
  }, [viewMonth, viewYear]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (day: number, isCurrentMonth = true) => {
    let targetDate: Date;
    if (isCurrentMonth) {
      targetDate = new Date(viewYear, viewMonth, day);
    } else if (day > 20) {
      // Clicked day from prev month
      targetDate = new Date(viewYear, viewMonth - 1, day);
    } else {
      // Clicked day from next month
      targetDate = new Date(viewYear, viewMonth + 1, day);
    }
    onChange(formatLocalDate(targetDate));
    setViewDate(targetDate);
    setIsOpen(false);
  };

  const calendarCells = useMemo(() => {
    const cells: { day: number; currentMonth: boolean; key: string }[] = [];
    
    // Previous month filler days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      cells.push({ day, currentMonth: false, key: `prev-${day}` });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, currentMonth: true, key: `curr-${day}` });
    }

    // Next month filler days (to complete 6 rows = 42 cells)
    const totalCells = 42;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      cells.push({ day, currentMonth: false, key: `next-${day}` });
    }

    return cells;
  }, [firstDayOfWeek, daysInMonth, prevMonthDays]);

  const isSelected = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const isToday = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  return (
    <div className={cn("relative w-full select-none", className)}>
      {/* Trigger input button */}
      <button
        type="button"
        onClick={() => {
          setViewDate(parseLocalDate(value));
          setIsOpen(!isOpen);
        }}
        className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-3 text-xs text-foreground focus:outline-none flex items-center justify-between font-medium text-left cursor-pointer"
      >
        <span>{formatDisplayDate(value)}</span>
        <CalendarIcon className="size-4 text-muted-foreground" />
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Transparent Backdrop to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-850 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header controls */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-850 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              
              <span className="text-xs font-bold text-foreground">
                {MONTHS[viewMonth]} {viewYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-850 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground tracking-wider border-b border-neutral-850/60 pb-1.5">
              {WEEKDAYS.map(day => (
                <div key={day} className={cn(day === 'Sun' && "text-rose-500")}>
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map(({ day, currentMonth, key }) => {
                const active = isSelected(day, currentMonth);
                const today = isToday(day, currentMonth);
                
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectDay(day, currentMonth)}
                    className={cn(
                      "aspect-square text-[11px] font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer",
                      !currentMonth && "text-muted-foreground/30 hover:bg-neutral-850/30",
                      currentMonth && !active && "text-foreground hover:bg-neutral-850",
                      today && !active && "border border-primary/45 text-primary",
                      active && "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/20 scale-105"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            {/* Quick action: Today */}
            <div className="flex justify-between items-center border-t border-neutral-850/60 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  const todayStr = formatLocalDate(new Date());
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                Today
              </button>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { AccountType } from './account.js';

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/:/g, '').trim().replace(/[^a-zA-Z0-9\-_]/g, '').replace(/[\s]+/g, '-');
}

export function generateHledgerPath(type: AccountType, displayName: string, parentGroup: string | null): string {
  const typePrefix = type === 'Asset' 
    ? 'Assets' 
    : type === 'Liability' 
    ? 'Liabilities' 
    : type === 'Expense' 
    ? 'Expenses' 
    : type === 'Income'
    ? 'Income'
    : type === 'Equity'
    ? 'Equity'
    : type;
  
  const cleanNameSegment = sanitizePathSegment(displayName);
  const groupSegment = parentGroup ? `:${sanitizePathSegment(parentGroup)}` : '';
  return `${typePrefix}${groupSegment}:${cleanNameSegment}`;
}

export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  return true;
}


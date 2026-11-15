export type DateFormatOption =
  | 'MMM DD, YYYY'
  | 'YYYY-MM-DD'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'DD-MMM-YYYY';

export const DATE_FORMAT_OPTIONS: { value: DateFormatOption; label: string; example: string }[] = [
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Nov 15, 2026)', example: 'Nov 15, 2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-11-15)', example: '2026-11-15' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/11/2026)', example: '15/11/2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (11/15/2026)', example: '11/15/2026' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY (15-Nov-2026)', example: '15-Nov-2026' }
];

const DATE_FORMAT_STORAGE_KEY = 'dkt_ethiopia_date_format_v1';

export function loadSavedDateFormat(): DateFormatOption {
  try {
    const raw = localStorage.getItem(DATE_FORMAT_STORAGE_KEY) as DateFormatOption | null;
    if (raw && DATE_FORMAT_OPTIONS.some(opt => opt.value === raw)) {
      return raw;
    }
  } catch {
    // Ignore storage read error
  }
  return 'MMM DD, YYYY';
}

export function saveDateFormat(fmt: DateFormatOption): void {
  try {
    localStorage.setItem(DATE_FORMAT_STORAGE_KEY, fmt);
  } catch {
    // Ignore storage write error
  }
}

export function normalizeIsoDateString(val: string | number): string {
  if (!val) return '';
  const str = String(val).trim();
  const num = Number(str);

  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed) && str.length > 5 && !/^\d+$/.test(str)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return str;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateWithPreference(
  dateStr: string,
  format?: DateFormatOption
): string {
  if (!dateStr) return '—';
  const activeFormat = format || loadSavedDateFormat();
  const iso = normalizeIsoDateString(dateStr);

  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return dateStr;
  }

  const [y, m, d] = iso.split('-');
  const monthIndex = parseInt(m, 10) - 1;
  const monthName = monthIndex >= 0 && monthIndex < 12 ? MONTHS[monthIndex] : m;
  const dayNum = parseInt(d, 10);

  switch (activeFormat) {
    case 'YYYY-MM-DD':
      return `${y}-${m}-${d}`;
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`;
    case 'DD-MMM-YYYY':
      return `${d}-${monthName}-${y}`;
    case 'MMM DD, YYYY':
    default:
      return `${monthName} ${dayNum}, ${y}`;
  }
}

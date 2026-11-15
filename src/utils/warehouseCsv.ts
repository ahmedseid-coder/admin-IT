import {
  EIGHT_REGIONAL_WAREHOUSES,
  WarehouseBatchItem,
  WarehouseCode
} from '../types/warehouse';

const MONTHS_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12'
};

/**
 * Parse warehouse dates such as "6/30/2031", "Jan-30", "Aug-28", "11/15/2026 0:00", "11/7/20260;00"
 */
export function parseWarehouseDate(raw: string): string {
  if (!raw) return '';
  let str = raw.trim().replace(/;/g, ':');
  if (!str) return '';

  // Fix typo like "11/7/20260:00" -> strip extra 0 attached to 4-digit year before time
  str = str.replace(/(\d{4})0:(\d{2})/, '$1 0:$2');

  // Remove time part if present
  const datePart = str.split(/\s+/)[0];

  // ISO format already
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  // M/D/YYYY format
  const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    let year = slashMatch[3];
    if (year.length === 2) year = `20${year}`;
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }

  // MMM-YY format e.g. "Jan-30", "Aug-28"
  const mmmYyMatch = datePart.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (mmmYyMatch) {
    const mon = MONTHS_MAP[mmmYyMatch[1].toLowerCase()];
    if (mon) {
      return `20${mmmYyMatch[2]}-${mon}-01`;
    }
  }

  return str;
}

/**
 * Format ISO YYYY-MM-DD as M/D/YYYY (matching attached CSV format e.g. "6/30/2031")
 */
export function formatToSlashDate(isoDate: string): string {
  if (!isoDate) return '';
  const iso = parseWarehouseDate(isoDate);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const year = match[1];
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  return `${month}/${day}/${year}`;
}

/**
 * Format ISO YYYY-MM-DD as "M/D/YYYY 0:00" (matching attached CSV created_at column)
 */
export function formatToCsvTimestamp(isoDate: string): string {
  if (!isoDate) return '';
  const slash = formatToSlashDate(isoDate);
  if (!slash || !slash.includes('/')) return isoDate;
  return `${slash} 0:00`;
}

export function resolveWarehouseCode(regionStr: string, fallback?: WarehouseCode): WarehouseCode {
  const lower = (regionStr || '').toLowerCase();
  const matched = EIGHT_REGIONAL_WAREHOUSES.find(
    w =>
      lower.includes(w.code.toLowerCase()) ||
      lower.includes(w.name.toLowerCase()) ||
      (w.code === 'AO06' && lower.includes('bahir'))
  );
  return matched ? matched.code : fallback || 'AO04';
}

export type ExpiryStatus = 'Expired' | 'Expiring Soon' | 'Valid' | 'No Expiry';
export type ExpiryUrgencyTier = 'expired' | 'critical' | 'approaching' | 'valid' | 'none';

/**
 * Signed integer days from today until expiryDateIso.
 * Negative values mean already expired.
 */
export function getDaysUntilExpiry(expiryDateIso: string): number | null {
  if (!expiryDateIso || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDateIso)) {
    return null;
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const exp = new Date(`${expiryDateIso}T00:00:00Z`);
  if (isNaN(exp.getTime())) return null;

  return Math.round((exp.getTime() - todayUtc) / 86400000);
}

export function getExpiryStatus(expiryDateIso: string, warningDays = 180): ExpiryStatus {
  const diffDays = getDaysUntilExpiry(expiryDateIso);
  if (diffDays === null) return 'No Expiry';
  if (diffDays < 0) return 'Expired';
  if (diffDays <= warningDays) return 'Expiring Soon';
  return 'Valid';
}

export function getExpiryUrgencyTier(
  expiryDateIso: string,
  warningDays = 180
): ExpiryUrgencyTier {
  const diffDays = getDaysUntilExpiry(expiryDateIso);
  if (diffDays === null) return 'none';
  if (diffDays < 0) return 'expired';
  if (diffDays <= Math.min(90, warningDays)) return 'critical';
  if (diffDays <= warningDays) return 'approaching';
  return 'valid';
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

export interface ParseWarehouseCsvOptions {
  fallbackCode?: WarehouseCode;
  overrideCreatedAt?: string;
}

export function parseWarehouseBatchCsv(
  csvText: string,
  fallbackCode?: WarehouseCode,
  options?: ParseWarehouseCsvOptions
): WarehouseBatchItem[] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  let startIndex = 0;
  const colIndex: Record<string, number> = {
    no: 0,
    region: 1,
    warehouse_manager: 2,
    technical_manager: 3,
    product_description: 4,
    unit: 5,
    manufacturer: 6,
    batch_number: 7,
    expiry_date: 8,
    quantity: 9,
    remark: 10,
    created_at: 11
  };

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('product_description') || lower.includes('batch_number')) {
      const headerCols = splitCsvLine(lines[i]).map(h => h.toLowerCase().trim());
      headerCols.forEach((h, idx) => {
        if (h === 'no.' || h === 'no' || (idx === 0 && h === '')) colIndex.no = idx;
        else if (h.includes('region')) colIndex.region = idx;
        else if (h.includes('warehouse_manager')) colIndex.warehouse_manager = idx;
        else if (h.includes('technical_manager')) colIndex.technical_manager = idx;
        else if (h.includes('product')) colIndex.product_description = idx;
        else if (h === 'unit') colIndex.unit = idx;
        else if (h.includes('manufacturer')) colIndex.manufacturer = idx;
        else if (h.includes('batch')) colIndex.batch_number = idx;
        else if (h.includes('expiry')) colIndex.expiry_date = idx;
        else if (h.includes('quantity') || h === 'qty') colIndex.quantity = idx;
        else if (h.includes('remark')) colIndex.remark = idx;
        else if (h.includes('created')) colIndex.created_at = idx;
      });
      startIndex = i + 1;
      break;
    }
  }

  const items: WarehouseBatchItem[] = [];
  const baseTs = Date.now();
  const effectiveFallback = options?.fallbackCode ?? fallbackCode;

  lines.slice(startIndex).forEach((line, idx) => {
    const cols = splitCsvLine(line);
    if (cols.length < 5) return;

    const rawNo = (cols[colIndex.no] || '').trim();
    const regionRaw = (cols[colIndex.region] || '').trim();
    const warehouseCode = resolveWarehouseCode(regionRaw, effectiveFallback);
    const meta = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code === warehouseCode)!;

    const productDescription = (cols[colIndex.product_description] || '').trim();
    if (!productDescription) return;

    const qtyNum = Number(String(cols[colIndex.quantity] || '0').replace(/,/g, ''));
    const rawRemark = (cols[colIndex.remark] || '').trim();
    const cleanRemark = rawRemark.replace(/G00d/gi, 'Good').replace(/^Goog$/i, 'Good');
    const parsedCreatedAt = parseWarehouseDate(cols[colIndex.created_at] || '');

    items.push({
      id: `wh-${warehouseCode.toLowerCase()}-${baseTs}-${idx}`,
      itemNo: rawNo || undefined,
      warehouseCode,
      region: regionRaw || meta.regionLabel,
      warehouseManager: (cols[colIndex.warehouse_manager] || '').trim() || meta.defaultWarehouseManager,
      technicalManager: (cols[colIndex.technical_manager] || '').trim() || meta.defaultTechnicalManager,
      productDescription,
      unit: (cols[colIndex.unit] || '').trim() || 'EA',
      manufacturer: (cols[colIndex.manufacturer] || '').trim() || 'DKT Ethiopia',
      batchNumber: (cols[colIndex.batch_number] || '').trim(),
      expiryDate: parseWarehouseDate(cols[colIndex.expiry_date] || ''),
      quantity: isNaN(qtyNum) ? 0 : qtyNum,
      remark: cleanRemark,
      createdAt:
        options?.overrideCreatedAt ||
        parsedCreatedAt ||
        new Date().toISOString().split('T')[0]
    });
  });

  return items;
}

/**
 * Export warehouse batch inventory in the exact weekly CSV format:
 * " ,region,warehouse_manager,technical_manager,product_description,unit,manufacturer,batch_number,expiry_date,quantity,remark,created_at"
 */
export function exportWarehouseBatchCsv(
  items: WarehouseBatchItem[],
  options?: { weekTimestampIso?: string }
): string {
  const headers = [
    ' ',
    'region',
    'warehouse_manager',
    'technical_manager',
    'product_description',
    'unit',
    'manufacturer',
    'batch_number',
    'expiry_date',
    'quantity',
    'remark',
    'created_at'
  ];

  const escape = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let groupCounter = 0;
  let lastGroupKey = '';

  const rows = items.map(item => {
    const groupKey = `${item.warehouseCode}::${item.productDescription.trim().toLowerCase()}`;
    let rowNo = '';
    if (groupKey !== lastGroupKey) {
      groupCounter += 1;
      rowNo = item.itemNo || String(groupCounter);
      lastGroupKey = groupKey;
    }

    const createdFormatted = options?.weekTimestampIso
      ? formatToCsvTimestamp(options.weekTimestampIso)
      : formatToCsvTimestamp(item.createdAt);

    return [
      rowNo,
      item.region,
      item.warehouseManager,
      item.technicalManager,
      item.productDescription,
      item.unit,
      item.manufacturer,
      item.batchNumber,
      formatToSlashDate(item.expiryDate),
      item.quantity,
      item.remark,
      createdFormatted
    ]
      .map(escape)
      .join(',');
  });

  return `\uFEFF${[headers.join(','), ...rows].join('\n')}`;
}

/**
 * Generate a ready-to-fill Weekly Stock Status CSV template for a specific regional warehouse
 */
export function exportWeeklyTemplateCsv(
  warehouseCode: WarehouseCode,
  weekDateIso: string
): string {
  const meta = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code === warehouseCode)!;
  const sampleProducts: {
    no: string;
    product: string;
    unit: string;
    batch: string;
    expiry: string;
    qty: number;
    remark: string;
  }[] = [
    {
      no: '1',
      product: 'Hiwot Trust condom',
      unit: 'EA',
      batch: 'M44260510',
      expiry: '2031-06-30',
      qty: 0,
      remark: 'Good condition'
    },
    {
      no: '2',
      product: 'Sensation Condom',
      unit: 'EA',
      batch: 'M47250713',
      expiry: '2030-06-01',
      qty: 0,
      remark: 'Good condition'
    },
    {
      no: '3',
      product: 'Mela one',
      unit: 'EA',
      batch: 'NR02843A',
      expiry: '2029-01-06',
      qty: 0,
      remark: 'Fast moving'
    },
    {
      no: '4',
      product: 'Choice',
      unit: 'Cycle',
      batch: '4007261',
      expiry: '2029-06-01',
      qty: 0,
      remark: 'Good'
    },
    {
      no: '5',
      product: 'Safe t kit',
      unit: 'Kit',
      batch: 'NR02912A',
      expiry: '2028-01-06',
      qty: 0,
      remark: 'Good condition'
    },
    {
      no: '6',
      product: 'Depo',
      unit: 'Vial',
      batch: '147086',
      expiry: '2030-01-01',
      qty: 0,
      remark: 'Slow moving'
    }
  ];

  const templateRows: WarehouseBatchItem[] = sampleProducts.map((p, idx) => ({
    id: `tpl-${idx}`,
    itemNo: p.no,
    warehouseCode: meta.code,
    region: meta.regionLabel,
    warehouseManager: meta.defaultWarehouseManager,
    technicalManager: meta.defaultTechnicalManager,
    productDescription: p.product,
    unit: p.unit,
    manufacturer: 'DKT Ethiopia',
    batchNumber: p.batch,
    expiryDate: p.expiry,
    quantity: p.qty,
    remark: p.remark,
    createdAt: weekDateIso
  }));

  return exportWarehouseBatchCsv(templateRows, { weekTimestampIso: weekDateIso });
}

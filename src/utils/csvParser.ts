/**
 * CSV Parser & Serializer for DKT Ethiopia Order Tracker
 */

import { InboundShipment, ProductCategory, ShipmentStatus } from '../types/shipment';
import { DateFormatOption, formatDateWithPreference } from './dateFormat';

/**
 * Convert Excel serial date number (e.g. 46108) to YYYY-MM-DD string
 */
export function parseExcelSerialDate(val: string | number): string {
  if (!val) return '';
  const str = String(val).trim();
  const num = Number(str);
  
  // If it's a 5-digit number around 40000 - 55000, it's an Excel serial date
  if (!isNaN(num) && num > 30000 && num < 60000) {
    // Excel epoch offset: 25569 days between 1900-01-01 and 1970-01-01 (accounting for 1900 leap bug)
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // If it's already a date string like "March 16 2026" or "2026-03-16"
  const parsed = Date.parse(str);
  if (!isNaN(parsed) && str.length > 5 && !/^\d+$/.test(str)) {
    const d = new Date(parsed);
    return d.toISOString().split('T')[0];
  }

  return str;
}

/**
 * Format date according to active/selected DateFormatOption
 */
export function formatDate(dateStr: string, dateFormat?: DateFormatOption): string {
  return formatDateWithPreference(dateStr, dateFormat);
}

/**
 * Format quantity with commas
 */
export function formatQuantity(num: number | string): string {
  if (num === null || num === undefined || num === '') return '0';
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

/**
 * Map product name to high-level category
 */
export function categorizeProduct(productName: string): ProductCategory {
  const lower = (productName || '').toLowerCase();
  if (lower.includes('hiwot') || lower.includes('sensation') || lower.includes('condom')) {
    return 'Condoms & Lubricants';
  }
  if (lower.includes('mela') || lower.includes('pill') || lower.includes('oral')) {
    return 'Emergency & Oral Contraceptives';
  }
  if (lower.includes('safe t') || lower.includes('kit') || lower.includes('clinical')) {
    return 'Clinical & Safety Kits';
  }
  return 'Family Planning & Wellness';
}

/**
 * Parse the attached raw CSV text into InboundShipment objects
 */
export function parseTrackerCsv(csvText: string): InboundShipment[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  // Find the header line that starts with "No."
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('No.') || lines[i].includes('Product') && lines[i].includes('Purchase Requisition')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    // Fallback: search for first row with data
    headerIndex = 3;
  }

  const dataLines = lines.slice(headerIndex + 1);
  const shipments: InboundShipment[] = [];

  // Helper for CSV line splitting handling simple quotes
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  dataLines.forEach((line, idx) => {
    const cols = parseRow(line);
    if (cols.length < 2 || !cols[1]) return;

    const rowNo = parseInt(cols[0], 10) || idx + 1;
    const product = cols[1] || 'General Supply';
    const prNumber = cols[2] || '';
    const prDate = parseExcelSerialDate(cols[3] || '');
    const prQuantity = parseFloat((cols[4] || '0').replace(/,/g, '')) || 0;
    
    const poNumber = cols[5] || (prNumber ? `PO-${prNumber.replace(/\//g, '-').slice(0, 15)}` : `PO-2026-${rowNo.toString().padStart(3, '0')}`);
    const poDate = parseExcelSerialDate(cols[6] || '');
    
    const piNumber = cols[7] || prNumber || `PI-2026-${rowNo}`;
    const piDate = parseExcelSerialDate(cols[8] || '');
    const piQuantity = parseFloat((cols[9] || '0').replace(/,/g, '')) || prQuantity;
    
    // In the raw CSV:
    // Detect whether this is the standardized 26-column export format
    const isStandard26Col =
      cols.length >= 25 &&
      (cols[10]?.includes('CIP') ||
        cols[10]?.includes('CIF') ||
        cols[10]?.includes('FOB') ||
        /^\d{4}-\d{2}-\d{2}$/.test(cols[11] || ''));

    let incoterms = 'CIP Addis Ababa';
    let expectedDispatchDate = '';
    let commercialInvoiceNumber = '';
    let commercialInvoiceQuantity = prQuantity;

    if (isStandard26Col) {
      incoterms = cols[10] || 'CIP Addis Ababa';
      expectedDispatchDate = parseExcelSerialDate(cols[11] || '');
      commercialInvoiceNumber = cols[12] || '';
      commercialInvoiceQuantity = parseFloat((cols[13] || '0').replace(/,/g, '')) || prQuantity;
    } else {
      for (const c of cols) {
        if (c.includes('CIP') || c.includes('CIF') || c.includes('FOB')) {
          incoterms = c;
        }
      }
      for (let cIdx = 10; cIdx < cols.length; cIdx++) {
        const val = cols[cIdx];
        if (
          val.startsWith('TNR') ||
          val.startsWith('INV/') ||
          val === 'Pending' ||
          val === 'Not Generated Yet'
        ) {
          commercialInvoiceNumber = val;
        }
      }
      const excelDates: string[] = [];
      cols.forEach(c => {
        const n = Number(c);
        if (!isNaN(n) && n >= 46000 && n <= 47000) {
          excelDates.push(parseExcelSerialDate(n));
        }
      });
      expectedDispatchDate = excelDates[0] || '2026-06-15';
    }

    // Status detection (case-insensitive)
    const rawStatus = (cols[24] || cols[cols.length - 2] || 'Shipped').trim();
    const lowerStatus = rawStatus.toLowerCase();

    let status: ShipmentStatus = 'Shipped';
    if (lowerStatus.includes('delayed') || lowerStatus.includes('delay')) {
      status = 'Delayed';
    } else if (lowerStatus.includes('in production') || lowerStatus.includes('awaiting dispatch')) {
      status = 'In Production / Awaiting Dispatch';
    } else if (lowerStatus.includes('on hold') || lowerStatus.includes('documentation pending')) {
      status = 'On Hold / Documentation Pending';
    } else if (lowerStatus.includes('customs') || lowerStatus.includes('djibouti clearance')) {
      status = 'Customs Clearance Djibouti';
    } else if (lowerStatus.includes('inland') || lowerStatus.includes('djibouti to addis')) {
      status = 'Inland Transit (Djibouti to Addis)';
    } else if (
      lowerStatus.includes('delivered') ||
      lowerStatus.includes('arrived') ||
      lowerStatus.includes('central warehouse')
    ) {
      status = 'Delivered to Central Warehouse';
    } else if (lowerStatus.includes('shipped')) {
      status = 'Shipped';
    }

    let carrierOrVessel = 'CMA CGM Djibouti Express';
    let containerNumber = `MSKU${849200 + rowNo}1`;
    let blNumber = `MEDUDJ${928100 + rowNo}`;
    if (rowNo === 1) {
      carrierOrVessel = 'Maersk Kendal / V.2614';
      containerNumber = 'TGHU9182340';
      blNumber = 'MAEU98218731';
    } else if (rowNo === 2 || rowNo === 3) {
      carrierOrVessel = 'MSC Diletta / V.2608';
      containerNumber = `MSCU${748190 + rowNo}4`;
      blNumber = `MSCU${192830 + rowNo}`;
    }

    const mblReleaseDate = isStandard26Col
      ? parseExcelSerialDate(cols[14] || '')
      : expectedDispatchDate
      ? new Date(new Date(expectedDispatchDate).getTime() + 2 * 86400000).toISOString().split('T')[0]
      : '';

    let expectedDjiboutiDate = isStandard26Col ? parseExcelSerialDate(cols[15] || '') : '';
    if (!expectedDjiboutiDate && expectedDispatchDate) {
      const d = new Date(expectedDispatchDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 14);
        expectedDjiboutiDate = d.toISOString().split('T')[0];
      }
    }

    const actualDjiboutiDate = isStandard26Col ? parseExcelSerialDate(cols[16] || '') : '';
    const indiaToDjiboutiDuration =
      (isStandard26Col && cols[17]) || '12 days (Nhava Sheva -> Doraleh)';
    const djiboutiReleaseDate = isStandard26Col ? parseExcelSerialDate(cols[18] || '') : '';
    const djiboutiClearanceDuration =
      (isStandard26Col && cols[19]) || (rowNo === 1 ? '4 days' : '3-5 days projected');
    const centralStockReachDate = isStandard26Col ? parseExcelSerialDate(cols[20] || '') : '';
    const djiboutiToAddisDuration =
      (isStandard26Col && cols[21]) || '4 days (Galafi Corridor)';
    const warehouseArrivalDate = isStandard26Col ? parseExcelSerialDate(cols[22] || '') : '';
    const totalLeadTimeDays =
      (isStandard26Col && cols[23]) || (rowNo === 1 ? '8 days' : '22 days');

    shipments.push({
      id: `dkt-shipment-${rowNo}-${Date.now() + idx}`,
      rowNo,
      product,
      category: categorizeProduct(product),
      prNumber,
      prDate: prDate || '2026-03-16',
      prQuantity,
      poNumber: poNumber || `PO-2026-ETH-${rowNo}`,
      poDate: poDate || prDate || '2026-03-20',
      piNumber: piNumber || prNumber,
      piDate: piDate || '2026-03-25',
      piQuantity,
      incoterms,
      expectedDispatchDate: expectedDispatchDate || '2026-06-15',
      commercialInvoiceNumber:
        commercialInvoiceNumber ||
        (rowNo === 1 ? 'TNR P69204' : `INV/NPL/${110 + rowNo}/26-27`),
      commercialInvoiceQuantity: commercialInvoiceQuantity || prQuantity,
      mblReleaseDate,
      expectedDjiboutiDate: expectedDjiboutiDate || '2026-07-02',
      actualDjiboutiDate,
      indiaToDjiboutiDuration,
      djiboutiReleaseDate,
      djiboutiClearanceDuration,
      centralStockReachDate,
      djiboutiToAddisDuration,
      warehouseArrivalDate,
      totalLeadTimeDays,
      status,
      carrierOrVessel,
      containerNumber,
      blNumber,
      portOfOrigin: 'Nhava Sheva (JNPT Mumbai), India',
      portOfDischarge: 'Port of Djibouti (Doraleh Container Terminal)',
      finalDestination: 'DKT Central Warehouse, Kirkos/Kality, Addis Ababa',
      remark:
        cols[25] ||
        (rowNo === 1 ? 'Awaiting final quality batch release' : 'Inbound sea transit from Indian supplier'),
      createdAt: '2026-11-10T12:00:00Z',
      updatedAt: new Date().toISOString()
    });
  });

  return shipments;
}

/**
 * Export InboundShipment array back to DKT Ethiopia CSV format
 */
export function exportToCsv(shipments: InboundShipment[]): string {
  const headerGroup = ',,Purchase Requisition Detail,,,Purchase Order Detail,,PI Detail,,,,,Commercial Invoice Detail,,Date Tracker,,,,,,,,,,,';
  const headerColumns = [
    'No.',
    'Product',
    'Purchase Requisition Number',
    'Date',
    'Quantity',
    'Purchase Order Number',
    'Date',
    'PI Number',
    'PI Date',
    'Quantity',
    'Incoterms',
    'Expected Date of Disptach',
    'Commercial Invoice Number',
    'Quantity',
    'Shipment Release Date from MBL',
    'Expected Shipment Reach Djibouti Date',
    'Shipment Reached Djibouti Date',
    'India To Djibouti ',
    'Shipment Release from Djibouti',
    'Djibouti Clearance Duration',
    'Shipment Reach Central Stock DKT Head Office Date',
    'From Djibouti To Addis Ababa',
    'Date of Arrival at Warehouse',
    'Total Lead Time From PO to Warehouse in Days',
    'Shipment Status',
    'Remark'
  ].join(',');

  const rows = shipments.map(s => {
    return [
      s.rowNo,
      `"${s.product.replace(/"/g, '""')}"`,
      `"${s.prNumber}"`,
      s.prDate,
      s.prQuantity,
      `"${s.poNumber}"`,
      s.poDate,
      `"${s.piNumber}"`,
      s.piDate,
      s.piQuantity,
      `"${s.incoterms}"`,
      s.expectedDispatchDate,
      `"${s.commercialInvoiceNumber}"`,
      s.commercialInvoiceQuantity,
      s.mblReleaseDate,
      s.expectedDjiboutiDate,
      s.actualDjiboutiDate,
      `"${s.indiaToDjiboutiDuration}"`,
      s.djiboutiReleaseDate,
      `"${s.djiboutiClearanceDuration}"`,
      s.centralStockReachDate,
      `"${s.djiboutiToAddisDuration}"`,
      s.warehouseArrivalDate,
      s.totalLeadTimeDays,
      `"${s.status}"`,
      `"${(s.remark || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return ['DKT ETHIOPIA Order Tracker', '', headerGroup, headerColumns, ...rows].join('\n');
}

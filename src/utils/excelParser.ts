import * as XLSX from 'xlsx';
import { InboundShipment } from '../types/shipment';
import { parseTrackerCsv, exportToCsv } from './csvParser';

/**
 * Parse either an Excel (.xlsx / .xls) ArrayBuffer or CSV text into InboundShipment records
 */
export function parseExcelWorkbook(buffer: ArrayBuffer): InboundShipment[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  const csvString = XLSX.utils.sheet_to_csv(worksheet);
  return parseTrackerCsv(csvString);
}

/**
 * Export InboundShipment array to a downloadable .xlsx Excel workbook
 */
export function exportToExcelWorkbook(shipments: InboundShipment[], filename?: string): void {
  const csvString = exportToCsv(shipments);
  const rows = csvString.split('\n').map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 36 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Order Tracker');

  const outName =
    filename || `DKT_Ethiopia_Inbound_Tracker_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, outName);
}

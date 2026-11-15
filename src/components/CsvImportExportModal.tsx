import React, { useState, useRef } from 'react';
import { InboundShipment } from '../types/shipment';
import { exportToCsv, parseTrackerCsv } from '../utils/csvParser';
import { parseExcelWorkbook, exportToExcelWorkbook } from '../utils/excelParser';
import { ConfirmModal } from './ConfirmModal';
import {
  Download,
  Upload,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

interface CsvImportExportModalProps {
  shipments: InboundShipment[];
  onImportShipments: (imported: InboundShipment[], replace: boolean) => void;
  onResetToDefault: () => void;
}

export const CsvImportExportModal: React.FC<CsvImportExportModalProps> = ({
  shipments,
  onImportShipments,
  onResetToDefault
}) => {
  const [importedPreview, setImportedPreview] = useState<InboundShipment[] | null>(null);
  const [importedFilename, setImportedFilename] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replaceMode, setReplaceMode] = useState<boolean>(true);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadExcel = () => {
    exportToExcelWorkbook(shipments);
    setSuccessMessage(`Excel workbook exported (${shipments.length} records).`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportToCsv(shipments);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `DKT_Ethiopia_Order_Tracker_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage(`CSV tracker exported (${shipments.length} records).`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportedFilename(file.name);
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = parseExcelWorkbook(buffer);
          if (parsed.length === 0) {
            setImportError(
              'No valid DKT Ethiopia shipment rows found in the uploaded Excel sheet.'
            );
            setImportedPreview(null);
          } else {
            setImportedPreview(parsed);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown Excel parse error';
          setImportError(`Failed to read Excel workbook: ${msg}`);
          setImportedPreview(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const text = event.target?.result as string;
          const parsed = parseTrackerCsv(text);
          if (parsed.length === 0) {
            setImportError(
              'Could not find valid shipment rows in the uploaded CSV. Ensure it follows the DKT Ethiopia tracker format.'
            );
            setImportedPreview(null);
          } else {
            setImportedPreview(parsed);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown CSV parse error';
          setImportError(`Failed to parse CSV: ${msg}`);
          setImportedPreview(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (!importedPreview) return;
    onImportShipments(importedPreview, replaceMode);
    setSuccessMessage(
      `Imported ${importedPreview.length} shipments from "${importedFilename || 'uploaded file'}".`
    );
    setImportedPreview(null);
    setImportedFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {importError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{importError}</span>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Export Card: Excel & CSV */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Export Tracker (Excel &amp; CSV)
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Export all {shipments.length} active consignments in DKT Ethiopia&apos;s official 26-column order tracker format.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDownloadExcel}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Import Excel or CSV File
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Upload an updated <span className="font-mono">.xlsx</span>, <span className="font-mono">.xls</span>, or <span className="font-mono">.csv</span> workbook. Automatically parses Excel serial dates and maps columns.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="tracker-file-input"
            />
            <label
              htmlFor="tracker-file-input"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose .xlsx / .csv File...</span>
            </label>
          </div>
        </div>

        {/* Clear Production Ledger Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Clear Active Shipment Ledger
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Remove all {shipments.length} active shipments from this device&apos;s ledger to start a clean import cycle.
            </p>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={shipments.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Ledger</span>
          </button>
        </div>
      </div>

      {/* Import Preview Section */}
      {importedPreview && (
        <div className="p-5 bg-white border border-slate-300 rounded-xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                <span>
                  Preview: {importedPreview.length} Shipments Detected ({importedFilename})
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Review the parsed rows below before applying changes to the active tracker.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={replaceMode}
                  onChange={e => setReplaceMode(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-0"
                />
                <span>Replace existing orders</span>
              </label>

              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
              >
                Confirm &amp; Apply Import
              </button>
              <button
                onClick={() => {
                  setImportedPreview(null);
                  setImportedFilename('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-2">No.</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">PR Number</th>
                  <th className="p-2 text-right">Quantity</th>
                  <th className="p-2">Incoterms</th>
                  <th className="p-2">Commercial Invoice</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {importedPreview.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-500">#{item.rowNo}</td>
                    <td className="p-2 font-bold text-slate-900">{item.product}</td>
                    <td className="p-2 font-mono text-slate-700">{item.prNumber || '—'}</td>
                    <td className="p-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {item.prQuantity.toLocaleString()}
                    </td>
                    <td className="p-2 text-slate-800">{item.incoterms}</td>
                    <td className="p-2 font-mono text-slate-700">
                      {item.commercialInvoiceNumber}
                    </td>
                    <td className="p-2 text-slate-800">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schema Note */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2 shadow-xs">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-red-600" />
          <span>DKT Ethiopia 26-Column Inbound Schema Reference</span>
        </h4>
        <p className="text-slate-600 leading-relaxed text-[11px]">
          Supports Excel (<span className="font-mono">.xlsx / .xls</span>) and <span className="font-mono">.csv</span> files, automatically converting Excel serial date timestamps (e.g. 46108, 46187, 46249), Incoterms (CIP Addis Ababa, CIF Djibouti, CIF Addis Ababa), and milestones from PR/PO issuance through Djibouti port clearance to Central Warehouse delivery.
        </p>
      </div>

      {/* Confirm Clear Ledger Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Clear Active Shipment Ledger?"
        message={`This will clear all ${shipments.length} consignments from the active tracker on this device so you can import fresh production records.`}
        confirmLabel="Clear Ledger"
        tone="warning"
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          onResetToDefault();
          setIsResetConfirmOpen(false);
          setSuccessMessage('Active shipment ledger cleared for fresh production intake.');
          setTimeout(() => setSuccessMessage(null), 3500);
        }}
      />
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { InboundShipment, ShipmentStatus } from '../types/shipment';
import { formatQuantity, formatDate } from '../utils/csvParser';
import { DateFormatOption, DATE_FORMAT_OPTIONS } from '../utils/dateFormat';
import {
  Search,
  ArrowUpDown,
  Eye,
  Trash2,
  Copy,
  Download,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Pencil,
  Check,
  X,
  FileDown,
  Printer,
  Calendar
} from 'lucide-react';
import { isDelayedOrCriticalShipment } from './MetricsCards';

interface ShipmentTableViewProps {
  shipments: InboundShipment[];
  onSelectShipment: (shipment: InboundShipment) => void;
  onUpdateStatus: (id: string, status: ShipmentStatus) => void;
  onUpdateShipment: (updated: InboundShipment) => void;
  onDeleteShipment: (id: string) => void;
  onDuplicateShipment: (shipment: InboundShipment) => void;
  onExportCsv: () => void;
  onExportExcel?: () => void;
  onDownloadSummaryPdf?: (viewShipments: InboundShipment[], filterSummary: string) => void;
  onPrintSummary?: () => void;
  dateFormat: DateFormatOption;
  onChangeDateFormat: (fmt: DateFormatOption) => void;
  initialFilterStatus?: string;
  initialFilterCiIssue?: boolean;
  initialFilterCriticalOnly?: boolean;
  isSmt?: boolean;
}

export const ShipmentTableView: React.FC<ShipmentTableViewProps> = ({
  shipments,
  onSelectShipment,
  onUpdateStatus,
  onUpdateShipment,
  onDeleteShipment,
  onDuplicateShipment,
  onExportCsv,
  onExportExcel,
  onDownloadSummaryPdf,
  onPrintSummary,
  dateFormat,
  onChangeDateFormat,
  initialFilterStatus,
  initialFilterCiIssue = false,
  initialFilterCriticalOnly = false,
  isSmt = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus || 'ALL');
  const [incotermFilter, setIncotermFilter] = useState<string>('ALL');
  const [ciIssueOnly, setCiIssueOnly] = useState<boolean>(initialFilterCiIssue);
  const [criticalOnly, setCriticalOnly] = useState<boolean>(initialFilterCriticalOnly);
  const [sortField, setSortField] = useState<keyof InboundShipment>('rowNo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    product: string;
    prNumber: string;
    prDate: string;
    poNumber: string;
    prQuantity: string;
    incoterms: string;
    piNumber: string;
    commercialInvoiceNumber: string;
    expectedDispatchDate: string;
    totalLeadTimeDays: string;
    status: ShipmentStatus;
  } | null>(null);

  useEffect(() => {
    setStatusFilter(initialFilterStatus || 'ALL');
  }, [initialFilterStatus]);

  useEffect(() => {
    setCiIssueOnly(Boolean(initialFilterCiIssue));
  }, [initialFilterCiIssue]);

  useEffect(() => {
    setCriticalOnly(Boolean(initialFilterCriticalOnly));
  }, [initialFilterCriticalOnly]);

  const incotermsList = useMemo(() => {
    const set = new Set(shipments.map(s => s.incoterms).filter(Boolean));
    return Array.from(set);
  }, [shipments]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    incotermFilter !== 'ALL' ||
    ciIssueOnly ||
    criticalOnly;

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setIncotermFilter('ALL');
    setCiIssueOnly(false);
    setCriticalOnly(false);
  };

  const filteredShipments = useMemo(() => {
    return shipments
      .filter(s => {
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const match =
            s.product.toLowerCase().includes(q) ||
            s.prNumber.toLowerCase().includes(q) ||
            s.poNumber.toLowerCase().includes(q) ||
            s.piNumber.toLowerCase().includes(q) ||
            s.commercialInvoiceNumber.toLowerCase().includes(q) ||
            (s.carrierOrVessel && s.carrierOrVessel.toLowerCase().includes(q)) ||
            (s.containerNumber && s.containerNumber.toLowerCase().includes(q)) ||
            (s.remark && s.remark.toLowerCase().includes(q));
          if (!match) return false;
        }

        if (statusFilter !== 'ALL' && s.status !== statusFilter) {
          return false;
        }

        if (incotermFilter !== 'ALL' && s.incoterms !== incotermFilter) {
          return false;
        }

        if (ciIssueOnly) {
          const isIssue =
            s.commercialInvoiceNumber === 'Not Generated Yet' ||
            s.commercialInvoiceNumber === 'Pending' ||
            !s.commercialInvoiceNumber;
          if (!isIssue) return false;
        }

        if (criticalOnly && !isDelayedOrCriticalShipment(s)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }, [shipments, searchTerm, statusFilter, incotermFilter, ciIssueOnly, criticalOnly, sortField, sortAsc]);

  const handleSort = (field: keyof InboundShipment) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const statusOptions: ShipmentStatus[] = [
    'In Production / Awaiting Dispatch',
    'Shipped',
    'Customs Clearance Djibouti',
    'Inland Transit (Djibouti to Addis)',
    'Delivered to Central Warehouse',
    'On Hold / Documentation Pending',
    'Delayed'
  ];

  const getStatusBadgeStyle = (status: ShipmentStatus) => {
    switch (status) {
      case 'In Production / Awaiting Dispatch':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Shipped':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Customs Clearance Djibouti':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Inland Transit (Djibouti to Addis)':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Delivered to Central Warehouse':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Delayed':
        return 'bg-red-50 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const startEditingRow = (s: InboundShipment) => {
    if (isSmt) return;
    setEditingRowId(s.id);
    setEditDraft({
      product: s.product,
      prNumber: s.prNumber,
      prDate: s.prDate,
      poNumber: s.poNumber,
      prQuantity: String(s.prQuantity || 0),
      incoterms: s.incoterms,
      piNumber: s.piNumber,
      commercialInvoiceNumber: s.commercialInvoiceNumber,
      expectedDispatchDate: s.expectedDispatchDate,
      totalLeadTimeDays: s.totalLeadTimeDays,
      status: s.status
    });
  };

  const cancelEditingRow = () => {
    setEditingRowId(null);
    setEditDraft(null);
  };

  const saveEditingRow = (original: InboundShipment) => {
    if (!editDraft || isSmt) return;
    const parsedQty = parseInt(editDraft.prQuantity.replace(/,/g, ''), 10);
    const nextQty = !isNaN(parsedQty) && parsedQty >= 0 ? parsedQty : original.prQuantity;

    onUpdateShipment({
      ...original,
      product: editDraft.product.trim() || original.product,
      prNumber: editDraft.prNumber.trim(),
      prDate: editDraft.prDate.trim(),
      poNumber: editDraft.poNumber.trim(),
      prQuantity: nextQty,
      piQuantity: nextQty,
      commercialInvoiceQuantity: nextQty,
      incoterms: editDraft.incoterms.trim() || original.incoterms,
      piNumber: editDraft.piNumber.trim(),
      commercialInvoiceNumber: editDraft.commercialInvoiceNumber.trim(),
      expectedDispatchDate: editDraft.expectedDispatchDate.trim(),
      totalLeadTimeDays: editDraft.totalLeadTimeDays.trim(),
      status: editDraft.status,
      updatedAt: new Date().toISOString()
    });
    cancelEditingRow();
  };

  const buildFilterSummary = () => {
    const parts: string[] = [];
    if (statusFilter !== 'ALL') parts.push(`Status: ${statusFilter}`);
    if (incotermFilter !== 'ALL') parts.push(`Incoterm: ${incotermFilter}`);
    if (ciIssueOnly) parts.push('Missing CI Only');
    if (criticalOnly) parts.push('Delayed / Critical LT');
    if (searchTerm.trim()) parts.push(`Query: "${searchTerm.trim()}"`);
    return parts.join(', ');
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      {isSmt && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            SMT Read-Only View: Inspect Consignment Dossiers or Export Stakeholder Summary PDF
          </span>
          <span className="text-xs text-slate-500">
            Inline order editing, deletion, and spreadsheet exports are restricted to Inbound Logistics.
          </span>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search PR, PO, PI, CI #, Product, Container..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="In Production / Awaiting Dispatch">In Production / Dispatch</option>
            <option value="Shipped">Shipped (Sea Transit)</option>
            <option value="Customs Clearance Djibouti">Djibouti Customs</option>
            <option value="Inland Transit (Djibouti to Addis)">Inland to Addis</option>
            <option value="Delivered to Central Warehouse">Delivered to Central Stock</option>
            <option value="On Hold / Documentation Pending">On Hold / Pending</option>
            <option value="Delayed">Delayed</option>
          </select>

          <select
            value={incotermFilter}
            onChange={e => setIncotermFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white"
          >
            <option value="ALL">All Incoterms</option>
            {incotermsList.map(term => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCiIssueOnly(!ciIssueOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              ciIssueOnly
                ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Missing CI Only</span>
          </button>

          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              criticalOnly
                ? 'bg-red-50 border-red-400 text-red-700 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Delayed / Critical LT</span>
          </button>

          {/* Date Format Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <label htmlFor="ledger-date-format" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Date Format:
            </label>
            <select
              id="ledger-date-format"
              value={dateFormat}
              onChange={e => onChangeDateFormat(e.target.value as DateFormatOption)}
              className="bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              {DATE_FORMAT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}

          {/* Stakeholder Summary PDF & Print (Available to Both SMT & Inbound Logistics) */}
          {onDownloadSummaryPdf && (
            <button
              type="button"
              onClick={() => onDownloadSummaryPdf(filteredShipments, buildFilterSummary())}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-semibold whitespace-nowrap shrink-0 shadow-xs"
            >
              <FileDown className="w-4 h-4 text-red-400" />
              <span>Summary PDF</span>
            </button>
          )}

          {onPrintSummary && (
            <button
              type="button"
              onClick={onPrintSummary}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors font-medium whitespace-nowrap shrink-0"
              title="Print current order ledger"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          )}

          {/* Export actions are strictly hidden from SMT read-only role */}
          {!isSmt && (
            <>
              {onExportExcel && (
                <button
                  onClick={onExportExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-semibold whitespace-nowrap shrink-0 shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
              )}
              <button
                onClick={onExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-colors font-medium whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th
                onClick={() => handleSort('rowNo')}
                className="py-3.5 px-3.5 cursor-pointer hover:text-slate-900 font-semibold"
              >
                <div className="flex items-center gap-1">
                  <span>No.</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort('product')}
                className="py-3.5 px-3.5 cursor-pointer hover:text-slate-900 font-semibold min-w-[200px]"
              >
                <div className="flex items-center gap-1">
                  <span>Product &amp; Commodity</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3.5 px-3.5 font-semibold min-w-[140px]">PR / PO Detail</th>
              <th
                onClick={() => handleSort('prQuantity')}
                className="py-3.5 px-3.5 cursor-pointer hover:text-slate-900 font-semibold text-right min-w-[120px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Quantity</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3.5 px-3.5 font-semibold min-w-[140px]">Incoterms / PI</th>
              <th className="py-3.5 px-3.5 font-semibold min-w-[150px]">Commercial Invoice</th>
              <th className="py-3.5 px-3.5 font-semibold min-w-[150px]">Dispatch / Corridor</th>
              <th className="py-3.5 px-3.5 font-semibold min-w-[210px]">Shipment Status</th>
              <th className="py-3.5 px-3.5 font-semibold text-right min-w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredShipments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No shipments matching current filters.
                </td>
              </tr>
            ) : (
              filteredShipments.map(s => {
                const isCiIssue =
                  s.commercialInvoiceNumber === 'Not Generated Yet' ||
                  s.commercialInvoiceNumber === 'Pending' ||
                  !s.commercialInvoiceNumber;
                const isEditing = editingRowId === s.id && editDraft !== null && !isSmt;

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors group ${
                      isEditing ? 'bg-red-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-3.5 font-mono text-slate-500 font-semibold align-top">
                      #{s.rowNo}
                    </td>

                    <td className="py-3.5 px-3.5 align-top">
                      {isEditing && editDraft ? (
                        <input
                          type="text"
                          value={editDraft.product}
                          onChange={e =>
                            setEditDraft(prev => (prev ? { ...prev, product: e.target.value } : prev))
                          }
                          aria-label="Edit product name"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => onSelectShipment(s)}
                            className="text-left font-bold text-slate-900 hover:text-red-600 transition-colors"
                          >
                            {s.product}
                          </button>
                          <div className="text-xs text-slate-500 truncate mt-0.5">{s.category}</div>
                        </>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 text-slate-700 align-top">
                      {isEditing && editDraft ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editDraft.prNumber}
                            onChange={e =>
                              setEditDraft(prev =>
                                prev ? { ...prev, prNumber: e.target.value } : prev
                              )
                            }
                            placeholder="PR Number"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-red-600"
                          />
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="date"
                              value={editDraft.prDate}
                              onChange={e =>
                                setEditDraft(prev =>
                                  prev ? { ...prev, prDate: e.target.value } : prev
                                )
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-[11px] font-mono focus:outline-none focus:border-red-600"
                            />
                            <input
                              type="text"
                              value={editDraft.poNumber}
                              onChange={e =>
                                setEditDraft(prev =>
                                  prev ? { ...prev, poNumber: e.target.value } : prev
                                )
                              }
                              placeholder="PO #"
                              className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-[11px] font-mono focus:outline-none focus:border-red-600"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-mono text-sm font-semibold">{s.prNumber || '—'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDate(s.prDate, dateFormat)} · PO {s.poNumber || '—'}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 text-right align-top">
                      {isEditing && editDraft ? (
                        <input
                          type="number"
                          value={editDraft.prQuantity}
                          onChange={e =>
                            setEditDraft(prev =>
                              prev ? { ...prev, prQuantity: e.target.value } : prev
                            )
                          }
                          aria-label="Edit quantity"
                          className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right focus:outline-none focus:border-red-600"
                        />
                      ) : (
                        <>
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatQuantity(s.prQuantity)}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">units</div>
                        </>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 align-top">
                      {isEditing && editDraft ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editDraft.incoterms}
                            onChange={e =>
                              setEditDraft(prev =>
                                prev ? { ...prev, incoterms: e.target.value } : prev
                              )
                            }
                            placeholder="Incoterms"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-red-600"
                          />
                          <input
                            type="text"
                            value={editDraft.piNumber}
                            onChange={e =>
                              setEditDraft(prev =>
                                prev ? { ...prev, piNumber: e.target.value } : prev
                              )
                            }
                            placeholder="PI Number"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-red-600"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-slate-800 font-semibold">{s.incoterms}</div>
                          <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                            {s.piNumber || 'Pending PI'}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 align-top">
                      {isEditing && editDraft ? (
                        <input
                          type="text"
                          value={editDraft.commercialInvoiceNumber}
                          onChange={e =>
                            setEditDraft(prev =>
                              prev
                                ? { ...prev, commercialInvoiceNumber: e.target.value }
                                : prev
                            )
                          }
                          placeholder="Commercial Invoice #"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-red-600"
                        />
                      ) : (
                        <>
                          {isCiIssue ? (
                            <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium text-xs">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span>{s.commercialInvoiceNumber || 'Pending'}</span>
                            </div>
                          ) : (
                            <div className="font-mono font-medium text-slate-900">
                              {s.commercialInvoiceNumber}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-0.5">
                            Qty:{' '}
                            <span className="font-mono tabular-nums">
                              {formatQuantity(s.commercialInvoiceQuantity || s.prQuantity)}
                            </span>
                          </div>
                        </>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 text-slate-700 align-top">
                      {isEditing && editDraft ? (
                        <div className="space-y-1.5">
                          <input
                            type="date"
                            value={editDraft.expectedDispatchDate}
                            onChange={e =>
                              setEditDraft(prev =>
                                prev ? { ...prev, expectedDispatchDate: e.target.value } : prev
                              )
                            }
                            aria-label="Edit expected dispatch date"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-red-600"
                          />
                          <input
                            type="text"
                            value={editDraft.totalLeadTimeDays}
                            onChange={e =>
                              setEditDraft(prev =>
                                prev ? { ...prev, totalLeadTimeDays: e.target.value } : prev
                              )
                            }
                            placeholder="Lead time (e.g. 24 days)"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-red-600"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-medium">
                            {formatDate(s.expectedDispatchDate, dateFormat)}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {s.totalLeadTimeDays ? `${s.totalLeadTimeDays} · ` : ''}
                            {s.carrierOrVessel || 'Nhava Sheva -> Doraleh'}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 align-top">
                      {!isSmt ? (
                        <select
                          value={isEditing && editDraft ? editDraft.status : s.status}
                          onChange={e => {
                            const val = e.target.value as ShipmentStatus;
                            if (isEditing) {
                              setEditDraft(prev => (prev ? { ...prev, status: val } : prev));
                            } else {
                              onUpdateStatus(s.id, val);
                            }
                          }}
                          className={`w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-medium ${
                            (isEditing && editDraft ? editDraft.status : s.status) ===
                            'In Production / Awaiting Dispatch'
                              ? 'border-amber-300 text-amber-800 bg-amber-50/50'
                              : (isEditing && editDraft ? editDraft.status : s.status) === 'Shipped'
                              ? 'border-blue-300 text-blue-800 bg-blue-50/50'
                              : (isEditing && editDraft ? editDraft.status : s.status) ===
                                'Customs Clearance Djibouti'
                              ? 'border-purple-300 text-purple-800 bg-purple-50/50'
                              : (isEditing && editDraft ? editDraft.status : s.status) ===
                                'Inland Transit (Djibouti to Addis)'
                              ? 'border-teal-300 text-teal-800 bg-teal-50/50'
                              : (isEditing && editDraft ? editDraft.status : s.status) ===
                                'Delivered to Central Warehouse'
                              ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50'
                              : (isEditing && editDraft ? editDraft.status : s.status) === 'Delayed'
                              ? 'border-red-300 text-red-700 bg-red-50/60'
                              : 'border-slate-300 text-slate-800'
                          }`}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt} value={opt} className="bg-white text-slate-900">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md border text-xs font-semibold ${getStatusBadgeStyle(
                            s.status
                          )}`}
                        >
                          {s.status}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEditingRow(s)}
                              title="Save Order Edits"
                              className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingRow}
                              title="Cancel Edit"
                              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => onSelectShipment(s)}
                              title="Inspect Consignment Dossier"
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!isSmt && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditingRow(s)}
                                  title="Edit Order in Ledger"
                                  className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDuplicateShipment(s)}
                                  title="Duplicate Consignment"
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteShipment(s.id)}
                                  title="Delete Shipment"
                                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <div>
          Showing {filteredShipments.length} of {shipments.length} records
        </div>
        <div className="flex items-center gap-2">
          <span>Filtered inbound units:</span>
          <span className="font-mono font-bold tabular-nums text-slate-900">
            {formatQuantity(filteredShipments.reduce((acc, s) => acc + (s.prQuantity || 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
};

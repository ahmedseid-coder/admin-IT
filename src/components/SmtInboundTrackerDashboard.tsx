import React, { useState, useMemo } from 'react';
import { InboundShipment, ShipmentStatus } from '../types/shipment';
import { formatQuantity, formatDate } from '../utils/csvParser';
import { DateFormatOption, DATE_FORMAT_OPTIONS } from '../utils/dateFormat';
import {
  Factory,
  Ship,
  Anchor,
  Truck,
  Building2,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  FileDown,
  Printer,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

interface SmtInboundTrackerDashboardProps {
  shipments: InboundShipment[];
  onSelectShipment: (shipment: InboundShipment) => void;
  dateFormat: DateFormatOption;
  onChangeDateFormat: (fmt: DateFormatOption) => void;
  onDownloadSummaryPdf: (viewShipments: InboundShipment[], filterSummary: string) => void;
  onPrintSummary: () => void;
}

interface CorridorStageDef {
  step: number;
  status: ShipmentStatus;
  shortLabel: string;
  fullLabel: string;
  location: string;
  color: string;
  badgeClass: string;
  barClass: string;
  icon: React.ReactNode;
}

const CORRIDOR_STAGES: CorridorStageDef[] = [
  {
    step: 1,
    status: 'In Production / Awaiting Dispatch',
    shortLabel: 'Production',
    fullLabel: '01. Production & Dispatch',
    location: 'Manufacturer (India)',
    color: '#d97706',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    barClass: 'bg-amber-500',
    icon: <Factory className="w-4 h-4 text-amber-600" />
  },
  {
    step: 2,
    status: 'Shipped',
    shortLabel: 'Ocean Freight',
    fullLabel: '02. Ocean Transit',
    location: 'Nhava Sheva -> Doraleh',
    color: '#2563eb',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    barClass: 'bg-blue-600',
    icon: <Ship className="w-4 h-4 text-blue-600" />
  },
  {
    step: 3,
    status: 'Customs Clearance Djibouti',
    shortLabel: 'Djibouti Customs',
    fullLabel: '03. Djibouti Port Customs',
    location: 'Doraleh Terminal',
    color: '#9333ea',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    barClass: 'bg-purple-600',
    icon: <Anchor className="w-4 h-4 text-purple-600" />
  },
  {
    step: 4,
    status: 'Inland Transit (Djibouti to Addis)',
    shortLabel: 'Inland Convoy',
    fullLabel: '04. Inland Transit',
    location: 'Galafi -> Addis Ababa',
    color: '#0d9488',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    barClass: 'bg-teal-600',
    icon: <Truck className="w-4 h-4 text-teal-600" />
  },
  {
    step: 5,
    status: 'Delivered to Central Warehouse',
    shortLabel: 'Central Warehouse',
    fullLabel: '05. DKT Central Warehouse',
    location: 'Kality / Central Hub',
    color: '#16a34a',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    barClass: 'bg-emerald-600',
    icon: <Building2 className="w-4 h-4 text-emerald-600" />
  }
];

function getStageIndex(status: ShipmentStatus): number {
  const idx = CORRIDOR_STAGES.findIndex(s => s.status === status);
  return idx >= 0 ? idx : 0;
}

export const SmtInboundTrackerDashboard: React.FC<SmtInboundTrackerDashboardProps> = ({
  shipments,
  onSelectShipment,
  dateFormat,
  onChangeDateFormat,
  onDownloadSummaryPdf,
  onPrintSummary
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalUnits = useMemo(
    () => shipments.reduce((sum, s) => sum + (s.prQuantity || 0), 0),
    [shipments]
  );

  const stageSummary = useMemo(() => {
    return CORRIDOR_STAGES.map(stage => {
      const matched = shipments.filter(s => s.status === stage.status);
      const units = matched.reduce((sum, s) => sum + (s.prQuantity || 0), 0);
      const pct = shipments.length > 0 ? Math.round((matched.length / shipments.length) * 100) : 0;
      return {
        ...stage,
        count: matched.length,
        units,
        pct,
        unitsMillions: Number((units / 1000000).toFixed(2))
      };
    });
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      if (selectedStage !== 'ALL' && s.status !== selectedStage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          s.product.toLowerCase().includes(q) ||
          s.prNumber.toLowerCase().includes(q) ||
          s.poNumber.toLowerCase().includes(q) ||
          s.piNumber.toLowerCase().includes(q) ||
          s.commercialInvoiceNumber.toLowerCase().includes(q) ||
          (s.carrierOrVessel && s.carrierOrVessel.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [shipments, selectedStage, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Real-Time Corridor Flow Visualization (Production -> DKT Central Warehouse) */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Real-Time Inbound Order Journey (Production to DKT Central Warehouse)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select any stage along the India -&gt; Djibouti -&gt; Addis Ababa corridor to inspect live orders in that phase.
            </p>
          </div>
          {selectedStage !== 'ALL' && (
            <button
              onClick={() => setSelectedStage('ALL')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Show All Stages</span>
            </button>
          )}
        </div>

        {/* 5-Stage End-to-End Corridor Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5">
          {stageSummary.map(stage => {
            const isSelected = selectedStage === stage.status;
            return (
              <button
                key={stage.status}
                type="button"
                onClick={() =>
                  setSelectedStage(prev => (prev === stage.status ? 'ALL' : stage.status))
                }
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-red-50/70 border-red-600 ring-1 ring-red-600/20 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      {stage.icon}
                    </div>
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {stage.count} {stage.count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {stage.fullLabel}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{stage.location}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Volume</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatQuantity(stage.units)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${stage.barClass}`}
                      style={{ width: `${Math.max(stage.pct, stage.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stage Distribution Chart */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-8 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageSummary}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 13, fill: '#334155' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 13, fill: '#475569' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
                          <div className="font-bold text-slate-900">{d.fullLabel}</div>
                          <div className="font-mono text-slate-700 mt-1">
                            {d.count} {d.count === 1 ? 'order' : 'orders'} ·{' '}
                            {formatQuantity(d.units)} units
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                  onClick={entry => {
                    const clickedStatus = (entry as unknown as { payload?: { status?: string } })
                      ?.payload?.status;
                    if (clickedStatus) {
                      setSelectedStage(prev =>
                        prev === clickedStatus ? 'ALL' : clickedStatus
                      );
                    }
                  }}
                >
                  {stageSummary.map(entry => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-4 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="text-sm font-bold text-slate-900">
              Corridor Progress Summary
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Tracked Volume</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatQuantity(totalUnits)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Active Orders</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {shipments.length} consignments
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">At Central Warehouse</span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {
                    shipments.filter(s => s.status === 'Delivered to Central Warehouse').length
                  }{' '}
                  delivered
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">In Transit / Port</span>
                <span className="font-mono font-bold text-blue-700 tabular-nums">
                  {
                    shipments.filter(
                      s =>
                        s.status === 'Shipped' ||
                        s.status === 'Customs Clearance Djibouti' ||
                        s.status === 'Inland Transit (Djibouti to Addis)'
                    ).length
                  }{' '}
                  in motion
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Consignment Tracking Feed (Each Order Visualized Step-by-Step) */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Live Inbound Order Tracking Feed ({filteredShipments.length})
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Step-by-step milestone tracker for every commodity order heading to DKT Central Warehouse.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search product, PR, PO, CI #, vessel..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={dateFormat}
                onChange={e => onChangeDateFormat(e.target.value as DateFormatOption)}
                aria-label="SMT Date display format"
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {DATE_FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                const parts: string[] = [];
                if (selectedStage !== 'ALL') parts.push(`Stage: ${selectedStage}`);
                if (searchQuery.trim()) parts.push(`Query: "${searchQuery.trim()}"`);
                onDownloadSummaryPdf(filteredShipments, parts.join(', '));
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shadow-xs"
            >
              <FileDown className="w-4 h-4" />
              <span>Summary PDF</span>
            </button>

            <button
              type="button"
              onClick={onPrintSummary}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSelectedStage('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              selectedStage === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({shipments.length})
          </button>
          {stageSummary.map(st => (
            <button
              key={st.status}
              type="button"
              onClick={() => setSelectedStage(st.status)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedStage === st.status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.shortLabel} ({st.count})
            </button>
          ))}
        </div>

        {/* Consignment Milestone Tracker List */}
        {filteredShipments.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
            No inbound orders match the current stage or search filter.
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredShipments.map(shipment => {
              const currentIdx = getStageIndex(shipment.status);
              const stageMeta = CORRIDOR_STAGES[currentIdx];
              const isCiIssue =
                shipment.commercialInvoiceNumber === 'Not Generated Yet' ||
                shipment.commercialInvoiceNumber === 'Pending' ||
                !shipment.commercialInvoiceNumber;

              return (
                <div
                  key={shipment.id}
                  onClick={() => onSelectShipment(shipment)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectShipment(shipment);
                    }
                  }}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-red-300 bg-slate-50/40 hover:bg-white transition-all cursor-pointer space-y-4"
                >
                  {/* Top Order Summary Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-500">
                          #{shipment.rowNo}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {shipment.product}
                        </h3>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${stageMeta.badgeClass}`}
                        >
                          {shipment.status}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono">
                          PR: <strong className="text-slate-800">{shipment.prNumber || 'Pending'}</strong>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-mono">
                          PO: <strong className="text-slate-800">{shipment.poNumber || 'Pending'}</strong>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span>{shipment.incoterms}</span>
                        {shipment.carrierOrVessel && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-slate-700 font-medium">
                              {shipment.carrierOrVessel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                      <div className="md:text-right">
                        <div className="text-base font-bold font-mono tabular-nums text-red-600">
                          {formatQuantity(shipment.prQuantity)} units
                        </div>
                        <div className="text-xs text-slate-500">
                          Dispatch: {formatDate(shipment.expectedDispatchDate)}
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-red-600">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </span>
                    </div>
                  </div>

                  {/* 5-Stage Horizontal Corridor Stepper */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                    {CORRIDOR_STAGES.map((stepMeta, idx) => {
                      const isDone = idx < currentIdx || (idx === 4 && currentIdx === 4);
                      const isCurrent = idx === currentIdx && !(idx === 4 && currentIdx === 4);

                      return (
                        <div
                          key={stepMeta.status}
                          className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
                            isDone
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : isCurrent
                              ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isCurrent ? (
                            <Clock className="w-4 h-4 text-red-600 shrink-0" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className="truncate">{stepMeta.shortLabel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Key Milestone Dates & Invoice Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        Djibouti ETA:{' '}
                        <strong className="font-mono text-slate-800">
                          {shipment.actualDjiboutiDate
                            ? formatDate(shipment.actualDjiboutiDate, dateFormat)
                            : formatDate(shipment.expectedDjiboutiDate, dateFormat)}
                        </strong>
                      </span>
                      <span>
                        Clearance:{' '}
                        <strong className="font-mono text-slate-800">
                          {shipment.djiboutiClearanceDuration || 'Est. 4 days'}
                        </strong>
                      </span>
                      <span>
                        Central Stock Arrival:{' '}
                        <strong className="font-mono text-slate-800">
                          {shipment.warehouseArrivalDate
                            ? formatDate(shipment.warehouseArrivalDate, dateFormat)
                            : shipment.centralStockReachDate
                            ? formatDate(shipment.centralStockReachDate, dateFormat)
                            : 'Scheduled'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCiIssue ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>CI: {shipment.commercialInvoiceNumber || 'Pending'}</span>
                        </span>
                      ) : (
                        <span className="font-mono text-slate-700">
                          CI: {shipment.commercialInvoiceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

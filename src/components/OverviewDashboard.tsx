import React from 'react';
import { InboundShipment, ShipmentStatus } from '../types/shipment';
import { HubStockItem } from '../types/stock';
import { formatQuantity, formatDate } from '../utils/csvParser';
import { getStockRiskLevel, calculateMonthsOfStock } from '../utils/stockData';
import {
  Ship,
  Clock,
  FileCheck,
  Truck,
  Building2,
  AlertCircle,
  ArrowRight,
  Eye,
  ShieldCheck,
  Warehouse
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

export type WorkspaceTab =
  | 'overview'
  | 'pipeline'
  | 'table'
  | 'stock'
  | 'warehouses'
  | 'corridor'
  | 'analytics'
  | 'audit'
  | 'settings'
  | 'import-export';

interface OverviewDashboardProps {
  shipments: InboundShipment[];
  stockItems: HubStockItem[];
  onNavigateTab: (tab: WorkspaceTab) => void;
  onFilterTableByStatus: (status: string) => void;
  onFilterTableByCiIssue: () => void;
  onSelectShipment: (shipment: InboundShipment) => void;
  isSmt: boolean;
}

const STAGE_META: {
  status: ShipmentStatus;
  shortLabel: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    status: 'In Production / Awaiting Dispatch',
    shortLabel: 'Production',
    color: '#d97706',
    icon: <Clock className="w-4 h-4 text-amber-600" />
  },
  {
    status: 'Shipped',
    shortLabel: 'Ocean Transit',
    color: '#2563eb',
    icon: <Ship className="w-4 h-4 text-blue-600" />
  },
  {
    status: 'Customs Clearance Djibouti',
    shortLabel: 'Djibouti Port',
    color: '#9333ea',
    icon: <FileCheck className="w-4 h-4 text-purple-600" />
  },
  {
    status: 'Inland Transit (Djibouti to Addis)',
    shortLabel: 'Inland Convoy',
    color: '#0d9488',
    icon: <Truck className="w-4 h-4 text-teal-600" />
  },
  {
    status: 'Delivered to Central Warehouse',
    shortLabel: 'Central Stock',
    color: '#16a34a',
    icon: <Building2 className="w-4 h-4 text-emerald-600" />
  }
];

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  shipments,
  stockItems,
  onNavigateTab,
  onFilterTableByStatus,
  onFilterTableByCiIssue,
  onSelectShipment,
  isSmt
}) => {
  const stageChartData = STAGE_META.map(stage => {
    const matching = shipments.filter(s => s.status === stage.status);
    const units = matching.reduce((acc, s) => acc + (s.prQuantity || 0), 0);
    return {
      status: stage.status,
      name: stage.shortLabel,
      orders: matching.length,
      unitsMillions: Number((units / 1000000).toFixed(2)),
      units,
      color: stage.color
    };
  });

  const ciAttentionShipments = shipments.filter(
    s =>
      s.commercialInvoiceNumber === 'Not Generated Yet' ||
      s.commercialInvoiceNumber === 'Pending' ||
      !s.commercialInvoiceNumber
  );

  const customsShipments = shipments.filter(
    s => s.status === 'Customs Clearance Djibouti'
  );

  const atRiskStock = stockItems.filter(item => {
    const level = getStockRiskLevel(item);
    return level === 'Critical' || level === 'Low Safety Stock';
  });

  return (
    <div className="space-y-6">
      {/* Top Analytical Split: Pipeline Stage Chart + Priority Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Interactive Stage Distribution */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Inbound Consignments by Corridor Stage
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Click any stage row below to drill down into matching shipments.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('pipeline')}
                className="text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Open Pipeline Board</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageChartData}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-md text-xs">
                            <div className="font-bold text-slate-900">{d.status}</div>
                            <div className="font-mono text-slate-700 mt-1">
                              {d.orders} {d.orders === 1 ? 'consignment' : 'consignments'} · {formatQuantity(d.units)} units
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="orders"
                    radius={[6, 6, 0, 0]}
                    onClick={entry => {
                      const clickedStatus = (entry as unknown as { payload?: { status?: string } })
                        ?.payload?.status;
                      if (clickedStatus) onFilterTableByStatus(clickedStatus);
                    }}
                    className="cursor-pointer"
                  >
                    {stageChartData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Stage Strip */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STAGE_META.map(stage => {
              const count = shipments.filter(s => s.status === stage.status).length;
              return (
                <button
                  key={stage.status}
                  onClick={() => onFilterTableByStatus(stage.status)}
                  className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    {stage.icon}
                    <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                      {count}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 truncate">
                    {stage.shortLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Priority Action & Risk Feed */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Priority Attention &amp; Risk Monitor
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Documentation bottlenecks and safety-stock alerts
                </p>
              </div>
              {isSmt ? (
                <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Read Only</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-emerald-700 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Actionable</span>
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {ciAttentionShipments.slice(0, 3).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectShipment(s)}
                  className="w-full text-left p-3 rounded-lg bg-amber-50/70 hover:bg-amber-50 border border-amber-200/90 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {s.product} · #{s.rowNo}
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span className="truncate">
                        Commercial Invoice: {s.commercialInvoiceNumber || 'Pending'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 shrink-0 tabular-nums">
                    {formatQuantity(s.prQuantity)}
                  </span>
                </button>
              ))}

              {customsShipments.slice(0, 1).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectShipment(s)}
                  className="w-full text-left p-3 rounded-lg bg-purple-50/70 hover:bg-purple-50 border border-purple-200/90 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {s.product} · Port of Djibouti Clearance
                    </div>
                    <div className="text-[11px] text-purple-800 mt-0.5 truncate">
                      {s.carrierOrVessel || 'Doraleh Terminal'} · {s.djiboutiClearanceDuration}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-purple-800 shrink-0">
                    Inspect
                  </span>
                </button>
              ))}

              {atRiskStock.length > 0 && (
                <button
                  onClick={() => onNavigateTab('stock')}
                  className="w-full text-left p-3 rounded-lg bg-red-50/70 hover:bg-red-50 border border-red-200/90 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {atRiskStock.length} Hub Stock Lines Below Safety Threshold
                    </div>
                    <div className="text-[11px] text-red-700 mt-0.5 truncate">
                      {atRiskStock.map(item => item.product).slice(0, 2).join(', ')} require replenishment tracking
                    </div>
                  </div>
                  <Warehouse className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={onFilterTableByCiIssue}
              className="font-semibold text-slate-700 hover:text-red-600 transition-colors"
            >
              Filter Missing CI ({ciAttentionShipments.length})
            </button>
            <button
              onClick={() => onNavigateTab('stock')}
              className="font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
            >
              <span>View Stock Risk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Split: Active Shipments Snapshot + Regional Stock Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent / Active Shipments Table Snapshot */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Active Inbound Orders Snapshot
            </h2>
            <button
              onClick={() => onNavigateTab('table')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
            >
              <span>Full Shipment Ledger ({shipments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Commodity</th>
                  <th className="py-2 px-3 font-semibold">PR / Incoterms</th>
                  <th className="py-2 px-3 font-semibold text-right">Quantity</th>
                  <th className="py-2 px-3 font-semibold">Dispatch</th>
                  <th className="py-2 pl-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.slice(0, 6).map(s => (
                  <tr
                    key={s.id}
                    onClick={() => onSelectShipment(s)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-slate-900">{s.product}</div>
                      <div className="text-[11px] text-slate-500">{s.carrierOrVessel || 'Pending Carrier'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-slate-700">{s.prNumber || '—'}</div>
                      <div className="text-[11px] text-slate-500">{s.incoterms}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatQuantity(s.prQuantity)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {formatDate(s.expectedDispatchDate)}
                    </td>
                    <td className="py-2.5 pl-3">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* National Hub Stock Readiness */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              National Hub Coverage (MOS)
            </h2>
            <button
              onClick={() => onNavigateTab('stock')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
            >
              <span>All Hubs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stockItems.slice(0, 5).map(item => {
              const mos = calculateMonthsOfStock(item);
              const risk = getStockRiskLevel(item);
              const pct = Math.min(100, Math.round((mos / 4) * 100));

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-slate-900">{item.product}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-500">{item.region}</span>
                    </div>
                    <div className="font-mono tabular-nums font-semibold shrink-0 text-slate-800">
                      {mos} mo ·{' '}
                      <span
                        className={
                          risk === 'Critical'
                            ? 'text-red-600'
                            : risk === 'Low Safety Stock'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }
                      >
                        {risk}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        risk === 'Critical'
                          ? 'bg-red-600'
                          : risk === 'Low Safety Stock'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { InboundShipment } from '../types/shipment';
import { formatQuantity } from '../utils/csvParser';
import {
  Package,
  Ship,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const CRITICAL_LEAD_TIME_DAYS = 28;

export function parseLeadTimeDays(totalLeadTimeDays?: string): number {
  const match = String(totalLeadTimeDays || '').match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export function isDelayedOrCriticalShipment(
  shipment: InboundShipment,
  criticalThresholdDays = CRITICAL_LEAD_TIME_DAYS
): boolean {
  const isDelayed = String(shipment.status || '').toLowerCase().includes('delayed');
  const leadTimeDays = parseLeadTimeDays(shipment.totalLeadTimeDays);
  return isDelayed || leadTimeDays >= criticalThresholdDays;
}

interface MetricsCardsProps {
  shipments: InboundShipment[];
  criticalLeadTimeDays?: number;
  onFilterByStatus?: (status: string) => void;
  onFilterByCiIssue?: () => void;
  onFilterByCriticalOrDelayed?: () => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  shipments,
  criticalLeadTimeDays = CRITICAL_LEAD_TIME_DAYS,
  onFilterByStatus,
  onFilterByCiIssue,
  onFilterByCriticalOrDelayed
}) => {
  const totalUnits = shipments.reduce((acc, s) => acc + (s.prQuantity || 0), 0);

  const inProductionShipments = shipments.filter(
    s => s.status === 'In Production / Awaiting Dispatch'
  );
  const oceanTransitShipments = shipments.filter(s => s.status === 'Shipped');
  const djiboutiCustomsShipments = shipments.filter(
    s => s.status === 'Customs Clearance Djibouti'
  );
  const inlandTransitShipments = shipments.filter(
    s => s.status === 'Inland Transit (Djibouti to Addis)'
  );
  const deliveredShipments = shipments.filter(
    s => s.status === 'Delivered to Central Warehouse'
  );
  const warehouseCorridorShipments = [...inlandTransitShipments, ...deliveredShipments];

  const pendingCiShipments = shipments.filter(
    s =>
      s.commercialInvoiceNumber === 'Not Generated Yet' ||
      s.commercialInvoiceNumber === 'Pending' ||
      !s.commercialInvoiceNumber
  );

  const delayedOrCriticalShipments = shipments.filter(s =>
    isDelayedOrCriticalShipment(s, criticalLeadTimeDays)
  );
  const delayedOnlyCount = shipments.filter(s =>
    String(s.status || '').toLowerCase().includes('delayed')
  ).length;
  const maxCriticalLeadTime = delayedOrCriticalShipments.reduce((max, s) => {
    const days = parseLeadTimeDays(s.totalLeadTimeDays);
    return days > max ? days : max;
  }, 0);

  const oceanHasCritical = oceanTransitShipments.some(s =>
    isDelayedOrCriticalShipment(s, criticalLeadTimeDays)
  );
  const customsHasCritical = djiboutiCustomsShipments.some(s =>
    isDelayedOrCriticalShipment(s, criticalLeadTimeDays)
  );
  const warehouseHasCritical = warehouseCorridorShipments.some(s =>
    isDelayedOrCriticalShipment(s, criticalLeadTimeDays)
  );
  const ciHasCritical = pendingCiShipments.some(s =>
    isDelayedOrCriticalShipment(s, criticalLeadTimeDays)
  );
  const hasCriticalAlerts = delayedOrCriticalShipments.length > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {/* Total Pipeline Quantity */}
      <div className="p-4 bg-gradient-to-br from-white to-red-50/40 rounded-xl border border-slate-200 border-t-4 border-t-red-600 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
          <span className="font-bold">Total Inbound Volume</span>
          <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatQuantity(totalUnits)}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5 truncate">
            <span>{shipments.length} orders</span>
            <span aria-hidden="true">·</span>
            <span>{inProductionShipments.length} in production</span>
          </div>
        </div>
      </div>

      {/* Ocean Freight / Sea Transit */}
      <div
        onClick={() => onFilterByStatus?.('Shipped')}
        className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
          oceanHasCritical
            ? 'border-2 border-red-500 animate-critical-border bg-red-50/40'
            : 'bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 border-t-4 border-t-blue-600 shadow-xs hover:border-blue-500 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span className="font-semibold">Ocean Transit</span>
          <div
            className={`p-1.5 rounded-lg ${
              oceanHasCritical ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Ship className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              oceanHasCritical ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {oceanTransitShipments.length}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
            {oceanHasCritical ? (
              <span className="font-semibold text-red-600">
                Critical LT / Delayed flagged
              </span>
            ) : (
              <>
                <span>India -&gt; Djibouti</span>
                <span aria-hidden="true">·</span>
                <span>~12-14d sea</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Djibouti Port & Customs */}
      <div
        onClick={() => onFilterByStatus?.('Customs Clearance Djibouti')}
        className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
          customsHasCritical
            ? 'border-2 border-red-500 animate-critical-border bg-red-50/40'
            : 'bg-gradient-to-br from-white to-amber-50/50 border border-slate-200 border-t-4 border-t-amber-500 shadow-xs hover:border-amber-500 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span className="font-semibold">Djibouti Customs</span>
          <div
            className={`p-1.5 rounded-lg ${
              customsHasCritical ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              customsHasCritical ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {djiboutiCustomsShipments.length}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
            {customsHasCritical ? (
              <span className="font-semibold text-red-600">
                Clearance delay attention
              </span>
            ) : (
              <>
                <span>Avg 4.0d clearance</span>
                <span aria-hidden="true">·</span>
                <span>ESLSE transit</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overland & Delivered to Central Warehouse */}
      <div
        onClick={() => onFilterByStatus?.('Delivered to Central Warehouse')}
        className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
          warehouseHasCritical
            ? 'border-2 border-red-500 animate-critical-border bg-red-50/40'
            : 'bg-gradient-to-br from-white to-emerald-50/50 border border-slate-200 border-t-4 border-t-emerald-600 shadow-xs hover:border-emerald-500 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
          <span className="font-bold">Central Warehouse</span>
          <div
            className={`p-1.5 rounded-lg ${
              warehouseHasCritical
                ? 'bg-red-100 text-red-600'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              warehouseHasCritical ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {deliveredShipments.length}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5 truncate">
            <span>{inlandTransitShipments.length} on road</span>
            <span aria-hidden="true">·</span>
            <span className={warehouseHasCritical ? 'font-semibold text-red-600' : ''}>
              {warehouseHasCritical
                ? `${warehouseCorridorShipments.filter(s => isDelayedOrCriticalShipment(s, criticalLeadTimeDays)).length} critical LT`
                : `${deliveredShipments.length} arrived Addis`}
            </span>
          </div>
        </div>
      </div>

      {/* Commercial Invoice Alerts */}
      <div
        onClick={onFilterByCiIssue}
        className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
          ciHasCritical
            ? 'border-2 border-red-500 animate-critical-border bg-red-50/40'
            : 'bg-gradient-to-br from-white to-rose-50/50 border border-slate-200 border-t-4 border-t-rose-500 shadow-xs hover:border-red-500 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span className="font-semibold">Missing CI Docs</span>
          <div
            className={`p-1.5 rounded-lg ${
              pendingCiShipments.length > 0
                ? 'bg-red-100 text-red-600'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              pendingCiShipments.length > 0 ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {pendingCiShipments.length}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
            <span>
              {pendingCiShipments.length > 0 ? 'Pending supplier CI' : 'All CI generated'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Filter</span>
          </div>
        </div>
      </div>

      {/* Delayed & Critical Lead Time Attention Card */}
      <div
        onClick={onFilterByCriticalOrDelayed}
        className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
          hasCriticalAlerts
            ? 'bg-red-50/60 border-2 border-red-500 animate-critical-border'
            : 'bg-white border border-slate-200 shadow-xs hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <span className={`font-semibold ${hasCriticalAlerts ? 'text-red-800' : 'text-slate-600'}`}>
            Delayed &amp; Critical LT
          </span>
          <div
            className={`p-1.5 rounded-lg ${
              hasCriticalAlerts ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              hasCriticalAlerts ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {delayedOrCriticalShipments.length}
          </div>
          <div className="text-xs mt-1.5 flex items-center gap-1.5 truncate">
            {hasCriticalAlerts ? (
              <span className="font-semibold text-red-700 truncate">
                {delayedOnlyCount > 0 ? `${delayedOnlyCount} delayed · ` : ''}
                Max {maxCriticalLeadTime}d (&ge;{criticalLeadTimeDays}d SLA)
              </span>
            ) : (
              <span className="text-slate-500">All orders within SLA</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

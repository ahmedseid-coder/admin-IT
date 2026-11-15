import React, { useMemo, useState } from 'react';
import { InboundShipment } from '../types/shipment';
import { formatQuantity, formatDate } from '../utils/csvParser';
import { DateFormatOption, normalizeIsoDateString } from '../utils/dateFormat';
import { 
  PieChart as PieIcon, 
  Clock, 
  FileCheck2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface AnalyticsViewProps {
  shipments: InboundShipment[];
  dateFormat?: DateFormatOption;
  onSelectShipment?: (shipment: InboundShipment) => void;
}

interface MonthlyLeadTimeData {
  month: string;
  totalLeadTime: number;
  oceanTransit: number;
  djiboutiClearance: number;
  inlandTrucking: number;
  shipmentsCount: number;
  targetSla: number;
}

const DEFAULT_TARGET_SLA_DAYS = 25;

function parseDurationDays(raw?: string): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const val = Number(match[1]);
  return Number.isFinite(val) && val > 0 ? val : null;
}

function diffDaysIso(startIso: string, endIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
    return null;
  }
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  const days = Math.round((end - start) / 86400000);
  return days >= 0 && days <= 365 ? days : null;
}

type AnalyticsSubTab = 'trends' | 'forecast';
type ForecastModel = 'six_month_avg' | 'recent_three_month' | 'conservative_sla';

interface PredictedArrival {
  shipment: InboundShipment;
  anchorLabel: string;
  anchorDateIso: string;
  appliedLeadDays: number;
  predictedDateIso: string;
  predictedMonthKey: string; // YYYY-MM
  confidenceRange: string;
  isPastTarget: boolean;
}

function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + Math.round(days));
  return dt.toISOString().split('T')[0];
}

function getMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  const nextY = dt.getUTCFullYear();
  const nextM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${nextY}-${nextM}`;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  shipments,
  dateFormat,
  onSelectShipment
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('trends');
  const [chartMode, setChartMode] = useState<'overall' | 'stacked'>('overall');
  const [forecastModel, setForecastModel] = useState<ForecastModel>('six_month_avg');
  const totalUnits = shipments.reduce((acc, s) => acc + (s.prQuantity || 0), 0);

  // Compute monthly corridor lead-time dataset dynamically from live shipments
  const monthlyLeadTimeData = useMemo<MonthlyLeadTimeData[]>(() => {
    const groups = new Map<
      string,
      {
        label: string;
        totalDays: number[];
        oceanDays: number[];
        dwellDays: number[];
        inlandDays: number[];
        count: number;
      }
    >();

    shipments.forEach(s => {
      const poIso = normalizeIsoDateString(s.poDate || s.prDate);
      const dispatchIso = normalizeIsoDateString(s.expectedDispatchDate);
      const djiboutiIso = normalizeIsoDateString(s.actualDjiboutiDate || s.expectedDjiboutiDate);
      const warehouseIso = normalizeIsoDateString(s.warehouseArrivalDate || s.centralStockReachDate);

      const anchorIso = poIso || dispatchIso || djiboutiIso || s.createdAt?.slice(0, 10) || '';
      const monthKey = /^\d{4}-\d{2}/.test(anchorIso) ? anchorIso.slice(0, 7) : 'Active';
      const monthLabel =
        monthKey === 'Active'
          ? 'Active Ledger'
          : new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC'
            });

      const current = groups.get(monthKey) || {
        label: monthLabel,
        totalDays: [],
        oceanDays: [],
        dwellDays: [],
        inlandDays: [],
        count: 0
      };
      current.count += 1;

      const parsedTotal =
        (typeof s.totalLeadTimeDays === 'number' && s.totalLeadTimeDays > 0
          ? s.totalLeadTimeDays
          : null) ||
        diffDaysIso(poIso || dispatchIso, warehouseIso) ||
        diffDaysIso(dispatchIso, djiboutiIso);

      const parsedOcean = diffDaysIso(dispatchIso, djiboutiIso);
      const parsedDwell = parseDurationDays(s.djiboutiClearanceDuration);
      const parsedInland = diffDaysIso(djiboutiIso, warehouseIso);

      if (parsedTotal !== null) current.totalDays.push(parsedTotal);
      if (parsedOcean !== null) current.oceanDays.push(parsedOcean);
      if (parsedDwell !== null) current.dwellDays.push(parsedDwell);
      if (parsedInland !== null) current.inlandDays.push(Math.max(1, parsedInland - (parsedDwell || 0)));

      groups.set(monthKey, current);
    });

    const avg = (arr: number[], fallback: number) =>
      arr.length > 0
        ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
        : fallback;

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, g]) => {
        const ocean = avg(g.oceanDays, 0);
        const dwell = avg(g.dwellDays, 0);
        const inland = avg(g.inlandDays, 0);
        const total = avg(g.totalDays, Number((ocean + dwell + inland).toFixed(1)));
        return {
          month: g.label,
          totalLeadTime: total,
          oceanTransit: ocean,
          djiboutiClearance: dwell,
          inlandTrucking: inland,
          shipmentsCount: g.count,
          targetSla: DEFAULT_TARGET_SLA_DAYS
        };
      });
  }, [shipments]);

  // Forecast corridor benchmarks derived from real shipments when available, or SLA baseline constants
  const historicalBenchmarks = useMemo(() => {
    const validMonths = monthlyLeadTimeData.filter(d => d.totalLeadTime > 0);
    const sixMonthTotalAvg =
      validMonths.length > 0
        ? validMonths.reduce((s, d) => s + d.totalLeadTime, 0) / validMonths.length
        : 25;
    const sixMonthClearanceAndInland =
      validMonths.length > 0
        ? validMonths.reduce(
            (s, d) => s + (d.djiboutiClearance || 4) + (d.inlandTrucking || 3),
            0
          ) / validMonths.length
        : 7;
    const sixMonthPostDispatch =
      validMonths.length > 0
        ? validMonths.reduce(
            (s, d) =>
              s + (d.oceanTransit || 13) + (d.djiboutiClearance || 4) + (d.inlandTrucking || 3),
            0
          ) / validMonths.length
        : 20;

    const recent3 = validMonths.slice(-3);
    const recent3TotalAvg =
      recent3.length > 0
        ? recent3.reduce((s, d) => s + d.totalLeadTime, 0) / recent3.length
        : 23;
    const recent3ClearanceAndInland =
      recent3.length > 0
        ? recent3.reduce(
            (s, d) => s + (d.djiboutiClearance || 3.5) + (d.inlandTrucking || 3),
            0
          ) / recent3.length
        : 6.5;
    const recent3PostDispatch =
      recent3.length > 0
        ? recent3.reduce(
            (s, d) =>
              s + (d.oceanTransit || 12.5) + (d.djiboutiClearance || 3.5) + (d.inlandTrucking || 3),
            0
          ) / recent3.length
        : 19;

    if (forecastModel === 'recent_three_month') {
      return {
        label: 'Recent 3-Month Trend',
        totalPoToWarehouseDays: Math.round(recent3TotalAvg),
        postDispatchDays: Math.round(recent3PostDispatch),
        djiboutiToWarehouseDays: Math.round(recent3ClearanceAndInland),
        inlandDays: 3
      };
    }

    if (forecastModel === 'conservative_sla') {
      return {
        label: 'Conservative Buffer (+4d)',
        totalPoToWarehouseDays: Math.round(sixMonthTotalAvg) + 4,
        postDispatchDays: Math.round(sixMonthPostDispatch) + 4,
        djiboutiToWarehouseDays: Math.round(sixMonthClearanceAndInland) + 3,
        inlandDays: 5
      };
    }

    return {
      label: validMonths.length > 0 ? 'Historical Corridor Avg' : 'Corridor SLA Baseline (25d)',
      totalPoToWarehouseDays: Math.round(sixMonthTotalAvg),
      postDispatchDays: Math.round(sixMonthPostDispatch),
      djiboutiToWarehouseDays: Math.round(sixMonthClearanceAndInland),
      inlandDays: 4
    };
  }, [forecastModel, monthlyLeadTimeData]);

  // Compute expected arrival forecasts for all pending orders (not yet Delivered to Central Warehouse)
  const pendingForecasts = useMemo<PredictedArrival[]>(() => {
    const todayIso = new Date().toISOString().split('T')[0];

    return shipments
      .filter(s => s.status !== 'Delivered to Central Warehouse')
      .map(s => {
        const djiboutiIso = normalizeIsoDateString(
          s.actualDjiboutiDate || s.expectedDjiboutiDate
        );
        const dispatchIso = normalizeIsoDateString(s.expectedDispatchDate);
        const poIso = normalizeIsoDateString(s.poDate || s.prDate);

        let anchorLabel = 'Dispatch Date';
        let anchorDateIso = dispatchIso;
        let appliedLeadDays = historicalBenchmarks.postDispatchDays;
        let predictedDateIso = '';

        if (
          s.status === 'Inland Transit (Djibouti to Addis)' &&
          djiboutiIso &&
          /^\d{4}-\d{2}-\d{2}$/.test(djiboutiIso)
        ) {
          anchorLabel = 'Doraleh Release + Overland';
          anchorDateIso = djiboutiIso;
          appliedLeadDays =
            historicalBenchmarks.djiboutiToWarehouseDays;
          predictedDateIso = addDaysIso(djiboutiIso, appliedLeadDays);
        } else if (
          djiboutiIso &&
          /^\d{4}-\d{2}-\d{2}$/.test(djiboutiIso) &&
          (s.status === 'Shipped' || s.status === 'Customs Clearance Djibouti')
        ) {
          anchorLabel = 'Doraleh ETA + Clearance & Road';
          anchorDateIso = djiboutiIso;
          appliedLeadDays = historicalBenchmarks.djiboutiToWarehouseDays;
          predictedDateIso = addDaysIso(djiboutiIso, appliedLeadDays);
        } else if (dispatchIso && /^\d{4}-\d{2}-\d{2}$/.test(dispatchIso)) {
          anchorLabel = 'Expected Dispatch + Corridor LT';
          anchorDateIso = dispatchIso;
          appliedLeadDays = historicalBenchmarks.postDispatchDays;
          predictedDateIso = addDaysIso(dispatchIso, appliedLeadDays);
        } else if (poIso && /^\d{4}-\d{2}-\d{2}$/.test(poIso)) {
          anchorLabel = 'PO Date + Historical Total LT';
          anchorDateIso = poIso;
          appliedLeadDays = historicalBenchmarks.totalPoToWarehouseDays;
          predictedDateIso = addDaysIso(poIso, appliedLeadDays);
        } else {
          anchorLabel = 'Rolling Projection';
          anchorDateIso = todayIso;
          appliedLeadDays = historicalBenchmarks.postDispatchDays;
          predictedDateIso = addDaysIso(todayIso, appliedLeadDays);
        }

        const predictedMonthKey = predictedDateIso.slice(0, 7);
        return {
          shipment: s,
          anchorLabel,
          anchorDateIso,
          appliedLeadDays,
          predictedDateIso,
          predictedMonthKey,
          confidenceRange: s.status === 'Delayed' ? '±4–6d (Delayed)' : '±2d SLA window',
          isPastTarget: predictedDateIso < todayIso
        };
      })
      .sort((a, b) => a.predictedDateIso.localeCompare(b.predictedDateIso));
  }, [shipments, historicalBenchmarks]);

  const forecastMonthBuckets = useMemo(() => {
    const counts = new Map<string, number>();
    pendingForecasts.forEach(item => {
      if (item.predictedMonthKey) {
        counts.set(item.predictedMonthKey, (counts.get(item.predictedMonthKey) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, count]) => ({
        monthKey,
        label: getMonthLabel(monthKey),
        count
      }));
  }, [pendingForecasts]);

  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Ensure calendar focuses on a month with forecasts if user switches to Forecast or data updates
  const activeCalendarMonth = useMemo(() => {
    if (
      forecastMonthBuckets.length > 0 &&
      !forecastMonthBuckets.some(b => b.monthKey === selectedCalendarMonth)
    ) {
      return forecastMonthBuckets[0].monthKey;
    }
    return selectedCalendarMonth;
  }, [forecastMonthBuckets, selectedCalendarMonth]);

  const calendarDays = useMemo(() => {
    const [year, month] = activeCalendarMonth.split('-').map(Number);
    if (!year || !month) return [];
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const cells: {
      dayNumber: number | null;
      isoDate: string;
      arrivals: PredictedArrival[];
    }[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ dayNumber: null, isoDate: '', arrivals: [] });
    }
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        isoDate: iso,
        arrivals: pendingForecasts.filter(item => item.predictedDateIso === iso)
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dayNumber: null, isoDate: '', arrivals: [] });
    }
    return cells;
  }, [activeCalendarMonth, pendingForecasts]);

  // Group by product
  const productSummary = shipments.reduce((acc, s) => {
    const key = s.product || 'Other';
    if (!acc[key]) {
      acc[key] = { name: key, category: s.category, units: 0, count: 0 };
    }
    acc[key].units += (s.prQuantity || 0);
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { name: string; category: string; units: number; count: number }>);

  const productList = Object.values(productSummary).sort((a, b) => b.units - a.units);

  // Group by incoterm
  const incotermSummary = shipments.reduce((acc, s) => {
    const key = s.incoterms || 'Unspecified';
    if (!acc[key]) {
      acc[key] = { term: key, count: 0, units: 0 };
    }
    acc[key].count += 1;
    acc[key].units += (s.prQuantity || 0);
    return acc;
  }, {} as Record<string, { term: string; count: number; units: number }>);

  const incotermList = Object.values(incotermSummary).sort((a, b) => b.units - a.units);

  // Documentation readiness
  const readyCi = shipments.filter(
    s => s.commercialInvoiceNumber && s.commercialInvoiceNumber !== 'Not Generated Yet' && s.commercialInvoiceNumber !== 'Pending'
  );
  const pendingCi = shipments.filter(
    s => s.commercialInvoiceNumber === 'Pending' || s.commercialInvoiceNumber === 'Not Generated Yet' || !s.commercialInvoiceNumber
  );

  return (
    <div className="space-y-5">
      {/* Analytics Sub-View Switcher (Trends vs Forecast) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('trends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeSubTab === 'trends'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span>Trends &amp; Breakdown</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('forecast')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeSubTab === 'forecast'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Forecast</span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {pendingForecasts.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>
            Target SLA benchmark:{' '}
            <strong className="font-mono text-slate-800">{DEFAULT_TARGET_SLA_DAYS}d PO-to-Stock</strong>
          </span>
        </div>
      </div>

      {activeSubTab === 'forecast' ? (
        <div className="space-y-5">
          {/* Forecast Model Controls & Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span>Projected Central Warehouse Arrival Calendar</span>
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Predicts arrival dates for {pendingForecasts.length} pending orders using historical India-Djibouti-Addis corridor lead times.
                </p>
              </div>

              {/* Forecast Benchmark Selector */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setForecastModel('six_month_avg')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    forecastModel === 'six_month_avg'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  6-Mo Avg (25d)
                </button>
                <button
                  type="button"
                  onClick={() => setForecastModel('recent_three_month')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    forecastModel === 'recent_three_month'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recent 3-Mo (23d)
                </button>
                <button
                  type="button"
                  onClick={() => setForecastModel('conservative_sla')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    forecastModel === 'conservative_sla'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Conservative (+4d)
                </button>
              </div>
            </div>

            {/* Active Model Parameters Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Applied Model</span>
                <span className="font-bold text-slate-900">{historicalBenchmarks.label}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Post-Dispatch Corridor</span>
                <span className="font-mono font-bold text-blue-700">
                  {historicalBenchmarks.postDispatchDays} days avg
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Doraleh -&gt; Warehouse</span>
                <span className="font-mono font-bold text-teal-700">
                  {historicalBenchmarks.djiboutiToWarehouseDays} days avg
                </span>
              </div>
            </div>

            {/* Month Jump Pills + Prev/Next Month Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                {forecastMonthBuckets.map(bucket => {
                  const isCurrent = bucket.monthKey === activeCalendarMonth;
                  return (
                    <button
                      key={bucket.monthKey}
                      type="button"
                      onClick={() => setSelectedCalendarMonth(bucket.monthKey)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {bucket.label} ({bucket.count})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCalendarMonth(shiftMonthKey(activeCalendarMonth, -1))
                  }
                  aria-label="Previous month"
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-[140px] text-center text-sm font-bold text-slate-900">
                  {getMonthLabel(activeCalendarMonth)}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCalendarMonth(shiftMonthKey(activeCalendarMonth, 1))
                  }
                  aria-label="Next month"
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7-Column Projected Arrival Calendar Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2.5 border-r last:border-r-0 border-slate-200">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 bg-white">
                {calendarDays.map((cell, idx) => {
                  const isToday = cell.isoDate === new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={`${cell.isoDate || 'empty'}-${idx}`}
                      className={`min-h-[104px] p-2 border-b border-r border-slate-200 nth-[7n]:border-r-0 ${
                        cell.dayNumber === null ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      {cell.dayNumber !== null && (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                                isToday
                                  ? 'bg-red-600 text-white'
                                  : cell.arrivals.length > 0
                                  ? 'text-slate-900 bg-slate-100'
                                  : 'text-slate-400'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>
                            {cell.arrivals.length > 0 && (
                              <span className="text-[10px] font-mono font-semibold text-red-600">
                                {cell.arrivals.length} ETA
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            {cell.arrivals.map(arrival => (
                              <button
                                key={arrival.shipment.id}
                                type="button"
                                onClick={() => onSelectShipment?.(arrival.shipment)}
                                className={`w-full text-left px-2 py-1 rounded-md border text-[11px] leading-tight transition-colors ${
                                  arrival.shipment.status === 'Delayed'
                                    ? 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100'
                                    : arrival.isPastTarget
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                                    : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                                }`}
                                title={`#${arrival.shipment.rowNo} ${arrival.shipment.product} · Predicted ${formatDate(arrival.predictedDateIso, dateFormat)}`}
                              >
                                <div className="font-bold truncate">
                                  #{arrival.shipment.rowNo} {arrival.shipment.product}
                                </div>
                                <div className="font-mono text-[10px] opacity-80 truncate">
                                  {formatQuantity(arrival.shipment.prQuantity)} units
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pending Orders Forecast Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Pending Consignment Arrival Predictions ({pendingForecasts.length})
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wide">
                    <th className="py-3 px-4 font-semibold">Order</th>
                    <th className="py-3 px-4 font-semibold">Current Stage</th>
                    <th className="py-3 px-4 font-semibold">Baseline Anchor</th>
                    <th className="py-3 px-4 font-semibold">Historical Lead</th>
                    <th className="py-3 px-4 font-semibold">Predicted Arrival</th>
                    <th className="py-3 px-4 font-semibold">Window</th>
                    <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingForecasts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                        All tracked shipments have arrived at DKT Central Warehouse.
                      </td>
                    </tr>
                  ) : (
                    pendingForecasts.map(item => (
                      <tr key={item.shipment.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            #{item.shipment.rowNo} {item.shipment.product}
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            PO {item.shipment.poNumber || '—'} ·{' '}
                            {formatQuantity(item.shipment.prQuantity)} units
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                          {item.shipment.status}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <div>{item.anchorLabel}</div>
                          <div className="font-mono text-slate-800 font-semibold mt-0.5">
                            {formatDate(item.anchorDateIso, dateFormat)}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-blue-700">
                          +{item.appliedLeadDays} days
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCalendarMonth(item.predictedMonthKey)}
                            className="font-mono text-xs font-bold text-red-700 hover:underline"
                          >
                            {formatDate(item.predictedDateIso, dateFormat)}
                          </button>
                          {item.isPastTarget && (
                            <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
                              Target window passed · expedite
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                          {item.confidenceRange}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectShipment?.(item.shipment)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 text-xs font-semibold text-slate-700 hover:text-red-700"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span className="font-semibold">Commercial Invoice Readiness</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {readyCi.length} of {shipments.length} Generated
          </div>
          <div className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5">
            <span className="text-amber-600 font-semibold">{pendingCi.length} Pending Actions</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round((readyCi.length / Math.max(shipments.length, 1)) * 100)}% Complete</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span className="font-semibold">Djibouti Customs Dwell Time</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {(() => {
            const dwells = monthlyLeadTimeData.filter(d => d.djiboutiClearance > 0);
            const avgDwell =
              dwells.length > 0
                ? (dwells.reduce((s, d) => s + d.djiboutiClearance, 0) / dwells.length).toFixed(1)
                : null;
            return (
              <>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {avgDwell ? `${avgDwell} Days` : 'No Dwell Data'}
                </div>
                <div className="text-sm mt-1.5 flex items-center gap-1.5 text-slate-600 font-medium">
                  <TrendingDown className="w-4 h-4 text-purple-600" />
                  <span>
                    {avgDwell
                      ? `Computed across ${shipments.length} tracked order(s)`
                      : 'Add shipments with Djibouti dwell logs'}
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span className="font-semibold">Corridor Lead Time Efficiency</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          {(() => {
            const totals = monthlyLeadTimeData.filter(d => d.totalLeadTime > 0);
            const avgLead =
              totals.length > 0
                ? Number(
                    (totals.reduce((s, d) => s + d.totalLeadTime, 0) / totals.length).toFixed(1)
                  )
                : null;
            return (
              <>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {avgLead !== null ? `${avgLead} Days (Avg)` : 'No Lead Time Yet'}
                </div>
                <div className="text-sm mt-1.5 flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {avgLead !== null
                      ? avgLead <= DEFAULT_TARGET_SLA_DAYS
                        ? `Within ${DEFAULT_TARGET_SLA_DAYS}-Day SMT Target`
                        : `Exceeds ${DEFAULT_TARGET_SLA_DAYS}-Day SMT Target`
                      : `Target SLA Ceiling: ${DEFAULT_TARGET_SLA_DAYS} Days`}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* SMT LEAD TIME TREND CHART (Using Recharts) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Corridor Lead Time Trend
              </h3>
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-md">
                Live Shipment Telemetry
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Monthly consignment duration (PO issuance -&gt; Central Warehouse arrival) computed from recorded shipments.
            </p>
          </div>

          {/* Chart View Toggle Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm">
            <button
              onClick={() => setChartMode('overall')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                chartMode === 'overall'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overall Lead Time
            </button>
            <button
              onClick={() => setChartMode('stacked')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                chartMode === 'stacked'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Corridor Leg Breakdown
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-72 w-full pt-2">
          {monthlyLeadTimeData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/70 text-center p-6">
              <BarChart2 className="w-8 h-8 text-slate-300 mb-2" />
              <div className="text-sm font-bold text-slate-700">
                No Shipment Lead Time History Recorded
              </div>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Create a new inbound order or import an Excel/CSV tracker file to generate live corridor lead time charts.
              </p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthlyLeadTimeData}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="leadTimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="oceanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 13, fill: '#475569' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 13, fill: '#475569' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                unit="d"
                domain={[0, 32]}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyLeadTimeData;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
                          <span>{label}</span>
                          <span className="font-mono text-slate-500 font-normal">
                            {data.shipmentsCount} consignments
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono font-bold text-red-600">
                          <span>Total Lead Time:</span>
                          <span>{data.totalLeadTime} days</span>
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100 font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Ocean Transit:</span>
                            <span className="text-blue-600 font-medium">{data.oceanTransit}d</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Djibouti Customs Dwell:</span>
                            <span className="text-purple-600 font-medium">{data.djiboutiClearance}d</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Overland Trucking:</span>
                            <span className="text-teal-600 font-medium">{data.inlandTrucking}d</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
                          <span>Target SLA:</span>
                          <span className="font-mono">{data.targetSla} days</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
              />

              <ReferenceLine 
                y={25.0} 
                stroke="#d97706" 
                strokeDasharray="4 4" 
                label={{ 
                  value: 'SMT Target SLA (25 Days)', 
                  fill: '#d97706', 
                  fontSize: 10,
                  position: 'insideTopLeft'
                }} 
              />

              {chartMode === 'overall' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="totalLeadTime"
                    name="Average Lead Time (Days)"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#leadTimeGradient)"
                    dot={{ r: 4, fill: '#dc2626', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#dc2626' }}
                  />
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="oceanTransit"
                    name="Ocean Transit (India -> Djibouti)"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={0.6}
                    fill="url(#oceanGradient)"
                    stackId="corridor"
                  />
                  <Line
                    type="monotone"
                    dataKey="djiboutiClearance"
                    name="Djibouti Port Dwell (Days)"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inlandTrucking"
                    name="Inland Convoy (Djibouti -> Addis)"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalLeadTime"
                    name="Total PO-to-Warehouse"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#dc2626' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Executive SMT Efficiency Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 mt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
              Active Corridor Consignments
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              <span>{shipments.length} Tracked Orders</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {monthlyLeadTimeData.length} reporting month period(s) in ledger.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
              Doraleh Port Customs Watch
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {shipments.filter(s => s.status === 'Customs Clearance Djibouti').length} In Clearance
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Live customs dwell durations tracked per consignment.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
              SMT SLA Ceiling
            </span>
            <div className="font-bold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{DEFAULT_TARGET_SLA_DAYS}-Day Corridor Target</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Configurable alert threshold available in Alert Settings.
            </p>
          </div>
        </div>
      </div>

      {/* Main Analytics Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Commodity Volume Allocation */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-bold text-slate-900">Commodity Volume Breakdown</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total: {formatQuantity(totalUnits)} units
            </span>
          </div>

          <div className="space-y-3.5">
            {productList.map(item => {
              const pct = totalUnits > 0 ? (item.units / totalUnits) * 100 : 0;
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatQuantity(item.units)} units ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  {/* Visual Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-red-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{item.category}</span>
                    <span>{item.count} {item.count === 1 ? 'consignment' : 'consignments'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incoterms Breakdown & Customs Responsibility */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900">Incoterms Risk & Responsibility</h3>
              </div>
              <span className="text-xs text-slate-400">Trade Terms</span>
            </div>

            <div className="space-y-3">
              {incotermList.map(item => {
                const pct = totalUnits > 0 ? (item.units / totalUnits) * 100 : 0;
                const isCipAddis = item.term.includes('CIP Addis');
                const isCifDjibouti = item.term.includes('CIF Djibouti');

                return (
                  <div key={item.term} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900">{item.term}</span>
                      <span className="font-mono tabular-nums text-red-600 font-bold">
                        {formatQuantity(item.units)} units ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 leading-snug">
                      {isCipAddis && 'Carriage & Insurance paid to Addis Ababa. Supplier covers transit risks until central destination.'}
                      {isCifDjibouti && 'Cost, Insurance & Freight to Djibouti Port. DKT Ethiopia arranges inland transport and clearance via ESLSE.'}
                      {!isCipAddis && !isCifDjibouti && 'Standard international freight arrangement with customs destination delivery.'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Documentation & Priority Advisory */}
          {pendingCi.length > 0 ? (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-amber-900">
                  Commercial Invoice Attention ({pendingCi.length} pending)
                </div>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  {pendingCi[0].product} ({pendingCi[0].prNumber || pendingCi[0].poNumber || 'Active PR'}) is marked &quot;{pendingCi[0].commercialInvoiceNumber || 'Pending'}&quot;. Follow up with supplier documentation to avoid Port of Djibouti demurrage.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-emerald-900">Documentation Status Clear</div>
                <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                  {shipments.length === 0
                    ? 'No pending shipments with missing commercial invoices in the production ledger.'
                    : 'All tracked consignments have valid Commercial Invoice numbers assigned.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

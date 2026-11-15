import React, { useMemo, useState } from 'react';
import { AuditActionType, AuditLogEntry } from '../types/audit';
import { InboundShipment, ShipmentStatus } from '../types/shipment';
import { formatAuditTimestamp, exportAuditLogsToCsv } from '../utils/auditLog';
import {
  Search,
  History,
  ArrowRight,
  Download,
  RotateCcw,
  ShieldCheck,
  Eye,
  Clock,
  Users,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
  shipments: InboundShipment[];
  onSelectShipment: (shipment: InboundShipment) => void;
  isSmt?: boolean;
}

type TimeframeFilter = 'ALL' | 'TODAY' | '7D' | '30D';

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  shipments,
  onSelectShipment,
  isSmt = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('ALL');

  const shipmentsById = useMemo(() => {
    const map = new Map<string, InboundShipment>();
    shipments.forEach(s => map.set(s.id, s));
    return map;
  }, [shipments]);

  const stats = useMemo(() => {
    const statusChanges = auditLogs.filter(l => l.action === 'STATUS_CHANGE').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = auditLogs.filter(l => l.timestamp.startsWith(todayStr)).length;
    const uniqueUsers = new Set(auditLogs.map(l => l.changedByUsername)).size;
    return {
      total: auditLogs.length,
      statusChanges,
      todayCount,
      uniqueUsers
    };
  }, [auditLogs]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    actionFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    timeframeFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setActionFilter('ALL');
    setRoleFilter('ALL');
    setTimeframeFilter('ALL');
  };

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return auditLogs.filter(entry => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const searchable = [
          entry.product,
          entry.poNumber,
          entry.prNumber,
          entry.previousStatus || '',
          entry.newStatus,
          entry.changedByName,
          entry.changedByUsername,
          entry.changedByRole,
          entry.changedByRoleLabel,
          entry.note || '',
          entry.action
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      if (
        statusFilter !== 'ALL' &&
        entry.newStatus !== statusFilter &&
        entry.previousStatus !== statusFilter
      ) {
        return false;
      }

      if (actionFilter !== 'ALL' && entry.action !== actionFilter) {
        return false;
      }

      if (roleFilter !== 'ALL' && entry.changedByRole !== roleFilter) {
        return false;
      }

      if (timeframeFilter !== 'ALL') {
        const ts = new Date(entry.timestamp).getTime();
        if (isNaN(ts)) return false;
        if (timeframeFilter === 'TODAY' && ts < todayStart.getTime()) return false;
        if (timeframeFilter === '7D' && now - ts > 7 * 86400000) return false;
        if (timeframeFilter === '30D' && now - ts > 30 * 86400000) return false;
      }

      return true;
    });
  }, [auditLogs, searchQuery, statusFilter, actionFilter, roleFilter, timeframeFilter]);

  const handleExportAuditCsv = () => {
    const csv = exportAuditLogsToCsv(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `DKT_Ethiopia_Status_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusPillClass = (status?: string) => {
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
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getActionLabel = (action: AuditActionType) => {
    switch (action) {
      case 'STATUS_CHANGE':
        return { label: 'Status Change', style: 'bg-red-50 text-red-700 border-red-200' };
      case 'SHIPMENT_CREATED':
        return { label: 'Order Created', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'SHIPMENT_UPDATED':
        return { label: 'Dossier Updated', style: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SHIPMENT_DELETED':
        return { label: 'Order Removed', style: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'CSV_IMPORTED':
        return { label: 'Spreadsheet Import', style: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'BASELINE_RESTORED':
        return { label: 'Baseline Restored', style: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  };

  const statusFilterOptions: ShipmentStatus[] = [
    'In Production / Awaiting Dispatch',
    'Shipped',
    'Customs Clearance Djibouti',
    'Inland Transit (Djibouti to Addis)',
    'Delivered to Central Warehouse',
    'On Hold / Documentation Pending',
    'Delayed'
  ];

  return (
    <div className="space-y-5">
      {/* Audit Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-1.5">
            <span className="font-semibold">Total Audit Events</span>
            <History className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.total}
          </div>
          <div className="text-xs text-slate-500 mt-1">Recorded in local audit ledger</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-1.5">
            <span className="font-semibold">Status Transitions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.statusChanges}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pipeline &amp; ledger stage updates</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-1.5">
            <span className="font-semibold">Updates Today</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.todayCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Real-time cross-tab sync enabled</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-1.5">
            <span className="font-semibold">Contributing Officers</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.uniqueUsers}
          </div>
          <div className="text-xs text-slate-500 mt-1">Tracked with user ID &amp; role</div>
        </div>
      </div>

      {/* Main Search & Audit Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-red-600" />
              <span>Shipment Status Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable timeline of every shipment status transition, timestamp, user, and role.
            </p>
          </div>

          {!isSmt && (
            <button
              type="button"
              onClick={handleExportAuditCsv}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-300 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit CSV</span>
            </button>
          )}
        </div>

        {/* Comprehensive Search & Multi-Criteria Filter Bar */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search audit logs by product, PO #, PR #, status, officer name, @username, role, or notes..."
                aria-label="Search audit logs"
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              aria-label="Filter by audit action type"
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Event Types</option>
              <option value="STATUS_CHANGE">Status Changes Only</option>
              <option value="SHIPMENT_CREATED">Order Created</option>
              <option value="SHIPMENT_UPDATED">Dossier Updated</option>
              <option value="SHIPMENT_DELETED">Order Removed</option>
              <option value="CSV_IMPORTED">Spreadsheet Import</option>
              <option value="BASELINE_RESTORED">Baseline Restored</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by shipment status"
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Statuses</option>
              {statusFilterOptions.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              aria-label="Filter by user role"
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All User Roles</option>
              <option value="INBOUND_LOGISTICS">Inbound Logistics Team</option>
              <option value="SMT">SMT (Senior Management Team)</option>
            </select>

            <select
              value={timeframeFilter}
              onChange={e => setTimeframeFilter(e.target.value as TimeframeFilter)}
              aria-label="Filter by timeframe"
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>

            <span className="ml-auto text-xs font-mono text-slate-500">
              Showing {filteredLogs.length} of {auditLogs.length} events
            </span>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 font-semibold min-w-[155px]">Timestamp</th>
                <th className="py-3 px-4 font-semibold min-w-[200px]">Shipment / Order</th>
                <th className="py-3 px-4 font-semibold min-w-[130px]">Event</th>
                <th className="py-3 px-4 font-semibold min-w-[280px]">Status Transition</th>
                <th className="py-3 px-4 font-semibold min-w-[200px]">Updated By &amp; Role</th>
                <th className="py-3 px-4 font-semibold min-w-[220px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="text-sm font-semibold text-slate-700">
                      No audit log entries match your search or filter criteria.
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Try adjusting your search keywords, role filter, or timeframe.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Search &amp; Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(entry => {
                  const ts = formatAuditTimestamp(entry.timestamp);
                  const actionMeta = getActionLabel(entry.action);
                  const liveShipment = shipmentsById.get(entry.shipmentId);

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {ts.date}
                        </div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums mt-0.5">
                          {ts.time}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {entry.rowNo !== undefined && (
                            <span className="font-mono text-xs font-bold text-slate-400">
                              #{entry.rowNo}
                            </span>
                          )}
                          {liveShipment ? (
                            <button
                              type="button"
                              onClick={() => onSelectShipment(liveShipment)}
                              className="font-bold text-slate-900 hover:text-red-600 text-left transition-colors"
                            >
                              {entry.product}
                            </button>
                          ) : (
                            <span className="font-bold text-slate-700">{entry.product}</span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-500 mt-0.5">
                          PO: {entry.poNumber} · PR: {entry.prNumber}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${actionMeta.style}`}
                        >
                          {actionMeta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.previousStatus && (
                            <>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${getStatusPillClass(
                                  entry.previousStatus
                                )}`}
                              >
                                {entry.previousStatus}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${getStatusPillClass(
                              entry.newStatus
                            )}`}
                          >
                            {entry.newStatus}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {entry.changedByName}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          @{entry.changedByUsername}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                              entry.changedByRole === 'INBOUND_LOGISTICS'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                          >
                            {entry.changedByRole === 'INBOUND_LOGISTICS' ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                            <span>
                              {entry.changedByRole === 'INBOUND_LOGISTICS'
                                ? 'Inbound Logistics'
                                : 'SMT'}
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 leading-relaxed">
                        {entry.note || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import { AuditActionType, AuditLogEntry } from '../types/audit';
import { User, ROLE_PERMISSIONS } from '../types/auth';
import { InboundShipment, ShipmentStatus } from '../types/shipment';

export const AUDIT_LOG_STORAGE_KEY = 'dkt_ethiopia_prod_audit_logs_v1';

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export function loadSavedAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load audit logs from localStorage:', err);
  }
  return [];
}

export function saveAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save audit logs to localStorage:', err);
  }
}

export function createAuditEntry(params: {
  user: User;
  action: AuditActionType;
  shipment: Pick<InboundShipment, 'id' | 'product' | 'poNumber' | 'prNumber'> & {
    rowNo?: number;
  };
  previousStatus?: ShipmentStatus | string;
  newStatus: ShipmentStatus | string;
  note?: string;
}): AuditLogEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    shipmentId: params.shipment.id,
    rowNo: params.shipment.rowNo,
    product: params.shipment.product,
    poNumber: params.shipment.poNumber || '—',
    prNumber: params.shipment.prNumber || '—',
    action: params.action,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    changedByUserId: params.user.id,
    changedByName: params.user.name,
    changedByUsername: params.user.username,
    changedByRole: params.user.role,
    changedByRoleLabel: ROLE_PERMISSIONS[params.user.role].label,
    note: params.note
  };
}

export function formatAuditTimestamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return { date: iso, time: '' };
  }
  const date = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return { date, time };
}

export function exportAuditLogsToCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'Audit ID',
    'Timestamp (ISO)',
    'Action',
    'Row No.',
    'Product',
    'PO Number',
    'PR Number',
    'Previous Status',
    'New Status',
    'Changed By Name',
    'Username',
    'User Role',
    'Note'
  ];

  const escape = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = logs.map(entry =>
    [
      entry.id,
      entry.timestamp,
      entry.action,
      entry.rowNo ?? '',
      entry.product,
      entry.poNumber,
      entry.prNumber,
      entry.previousStatus ?? '',
      entry.newStatus,
      entry.changedByName,
      entry.changedByUsername,
      entry.changedByRoleLabel,
      entry.note ?? ''
    ]
      .map(escape)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

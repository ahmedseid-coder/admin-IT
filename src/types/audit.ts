import { UserRole } from './auth';
import { ShipmentStatus } from './shipment';

export type AuditActionType =
  | 'STATUS_CHANGE'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_UPDATED'
  | 'SHIPMENT_DELETED'
  | 'CSV_IMPORTED'
  | 'BASELINE_RESTORED';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601 timestamp
  shipmentId: string;
  rowNo?: number;
  product: string;
  poNumber: string;
  prNumber: string;
  action: AuditActionType;
  previousStatus?: ShipmentStatus | string;
  newStatus: ShipmentStatus | string;
  changedByUserId: string;
  changedByName: string;
  changedByUsername: string;
  changedByRole: UserRole;
  changedByRoleLabel: string;
  note?: string;
}

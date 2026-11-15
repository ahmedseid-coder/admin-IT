import {
  WarehouseBatchHistoryAction,
  WarehouseBatchHistoryEntry,
  WarehouseBatchItem
} from '../types/warehouse';
import { ROLE_PERMISSIONS, User } from '../types/auth';

export const WAREHOUSE_STORAGE_KEY = 'dkt_ethiopia_prod_warehouses_v1';
export const WAREHOUSE_HISTORY_STORAGE_KEY = 'dkt_ethiopia_prod_warehouse_history_v1';

export const INITIAL_WAREHOUSE_BATCHES: WarehouseBatchItem[] = [];

export function loadSavedWarehouseBatches(): WarehouseBatchItem[] {
  try {
    const raw = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load regional warehouse batches:', err);
  }
  return [];
}

export function saveWarehouseBatches(items: WarehouseBatchItem[]): void {
  try {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save regional warehouse batches:', err);
  }
}

export function loadSavedWarehouseHistory(): WarehouseBatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(WAREHOUSE_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load regional warehouse history:', err);
  }
  return [];
}

export function saveWarehouseHistory(entries: WarehouseBatchHistoryEntry[]): void {
  try {
    localStorage.setItem(WAREHOUSE_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save regional warehouse history:', err);
  }
}

export function createWarehouseHistoryEntry(params: {
  batch: Pick<
    WarehouseBatchItem,
    'id' | 'batchNumber' | 'productDescription' | 'warehouseCode' | 'region'
  >;
  user: User;
  action: WarehouseBatchHistoryAction;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  note: string;
}): WarehouseBatchHistoryEntry {
  return {
    id: `wh-hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    batchId: params.batch.id,
    batchNumber: params.batch.batchNumber || '—',
    productDescription: params.batch.productDescription,
    warehouseCode: params.batch.warehouseCode,
    region: params.batch.region,
    action: params.action,
    timestamp: new Date().toISOString(),
    changedByName: params.user.name,
    changedByUsername: params.user.username,
    changedByRoleLabel: ROLE_PERMISSIONS[params.user.role].label,
    fieldChanged: params.fieldChanged,
    previousValue: params.previousValue,
    newValue: params.newValue,
    note: params.note
  };
}

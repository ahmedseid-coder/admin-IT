/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { InboundShipment, ShipmentStatus } from './types/shipment';
import { User } from './types/auth';
import { HubStockItem } from './types/stock';
import { AuditLogEntry } from './types/audit';
import {
  EIGHT_REGIONAL_WAREHOUSES,
  WarehouseBatchHistoryEntry,
  WarehouseBatchItem,
  WarehouseCode
} from './types/warehouse';
import { SmtAlertSettings } from './types/alertSettings';
import {
  STORAGE_KEY as SHIPMENTS_STORAGE_KEY,
  loadSavedShipments,
  saveShipments
} from './utils/initialData';
import { exportToCsv } from './utils/csvParser';
import { exportToExcelWorkbook } from './utils/excelParser';
import { loadSavedHubStock, saveHubStock, getStockRiskLevel } from './utils/stockData';
import {
  AUDIT_LOG_STORAGE_KEY,
  loadSavedAuditLogs,
  saveAuditLogs,
  createAuditEntry
} from './utils/auditLog';
import {
  WAREHOUSE_HISTORY_STORAGE_KEY,
  WAREHOUSE_STORAGE_KEY,
  createWarehouseHistoryEntry,
  loadSavedWarehouseBatches,
  loadSavedWarehouseHistory,
  saveWarehouseBatches,
  saveWarehouseHistory
} from './utils/warehouseData';
import {
  createDefaultAlertSettings,
  evaluateLeadTimeAlerts,
  getAlertSettingsStorageKey,
  loadSavedAlertSettings,
  saveAlertSettings,
  triggerBrowserPushNotification
} from './utils/alertSettings';
import {
  DateFormatOption,
  loadSavedDateFormat,
  saveDateFormat
} from './utils/dateFormat';
import { generateShipmentSummaryPdf } from './utils/pdfReport';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginPage } from './components/LoginPage';
import { MetricsCards } from './components/MetricsCards';
import { OverviewDashboard, WorkspaceTab } from './components/OverviewDashboard';
import { SmtInboundTrackerDashboard } from './components/SmtInboundTrackerDashboard';
import { PipelineBoardView } from './components/PipelineBoardView';
import { ShipmentTableView } from './components/ShipmentTableView';
import { NationalStockView } from './components/NationalStockView';
import { RegionalWarehousesView } from './components/RegionalWarehousesView';
import { CorridorMapView } from './components/CorridorMapView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuditLogView } from './components/AuditLogView';
import { SmtSettingsView } from './components/SmtSettingsView';
import { ShipmentDetailDrawer } from './components/ShipmentDetailDrawer';
import { AddShipmentModal } from './components/AddShipmentModal';
import { CsvImportExportModal } from './components/CsvImportExportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ShareAndInstallModal, OfflineIndicator } from './components/ShareAndInstallModal';
import { Eye, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';

const AUTH_STORAGE_KEY = 'dkt_ethiopia_current_user_v2';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        if (parsed && (parsed.role === 'SMT' || parsed.role === 'INBOUND_LOGISTICS')) {
          return parsed;
        }
      }
    } catch {
      // Ignore corrupt session storage
    }
    return null;
  });

  const [shipments, setShipments] = useState<InboundShipment[]>(() => loadSavedShipments());
  const [hubStock, setHubStock] = useState<HubStockItem[]>(() => loadSavedHubStock());
  const [warehouseBatches, setWarehouseBatches] = useState<WarehouseBatchItem[]>(() =>
    loadSavedWarehouseBatches()
  );
  const [warehouseHistory, setWarehouseHistory] = useState<WarehouseBatchHistoryEntry[]>(() =>
    loadSavedWarehouseHistory()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => loadSavedAuditLogs());
  const [alertSettings, setAlertSettings] = useState<SmtAlertSettings>(() =>
    currentUser
      ? loadSavedAlertSettings(currentUser.username, currentUser.email)
      : createDefaultAlertSettings()
  );
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(() => loadSavedDateFormat());
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<InboundShipment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('ALL');
  const [tableCiIssueFilter, setTableCiIssueFilter] = useState<boolean>(false);
  const [tableCriticalFilter, setTableCriticalFilter] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    saveShipments(shipments);
  }, [shipments]);

  useEffect(() => {
    saveHubStock(hubStock);
  }, [hubStock]);

  useEffect(() => {
    saveWarehouseBatches(warehouseBatches);
  }, [warehouseBatches]);

  useEffect(() => {
    saveWarehouseHistory(warehouseHistory);
  }, [warehouseHistory]);

  useEffect(() => {
    saveAuditLogs(auditLogs);
  }, [auditLogs]);

  // Keep shipments and audit logs synced in real time across tabs
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === SHIPMENTS_STORAGE_KEY && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as InboundShipment[];
          if (Array.isArray(updated)) {
            setShipments(updated);
          }
        } catch {
          // Ignore malformed storage payload
        }
      } else if (e.key === AUDIT_LOG_STORAGE_KEY && e.newValue) {
        try {
          const updatedLogs = JSON.parse(e.newValue) as AuditLogEntry[];
          if (Array.isArray(updatedLogs)) {
            setAuditLogs(updatedLogs);
          }
        } catch {
          // Ignore malformed storage payload
        }
      } else if (e.key === WAREHOUSE_STORAGE_KEY && e.newValue) {
        try {
          const updatedBatches = JSON.parse(e.newValue) as WarehouseBatchItem[];
          if (Array.isArray(updatedBatches)) {
            setWarehouseBatches(updatedBatches);
          }
        } catch {
          // Ignore malformed storage payload
        }
      } else if (e.key === WAREHOUSE_HISTORY_STORAGE_KEY && e.newValue) {
        try {
          const updatedHistory = JSON.parse(e.newValue) as WarehouseBatchHistoryEntry[];
          if (Array.isArray(updatedHistory)) {
            setWarehouseHistory(updatedHistory);
          }
        } catch {
          // Ignore malformed storage payload
        }
      } else if (
        currentUser &&
        e.key === getAlertSettingsStorageKey(currentUser.username) &&
        e.newValue
      ) {
        try {
          const updatedSettings = JSON.parse(e.newValue) as SmtAlertSettings;
          if (updatedSettings && updatedSettings.routes) {
            setAlertSettings(updatedSettings);
          }
        } catch {
          // Ignore malformed storage payload
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [currentUser]);

  const lowStockCount = useMemo(() => {
    return hubStock.filter(item => {
      const level = getStockRiskLevel(item);
      return level === 'Critical' || level === 'Low Safety Stock';
    }).length;
  }, [hubStock]);

  const evaluatedAlertMatches = useMemo(
    () => evaluateLeadTimeAlerts(shipments, alertSettings),
    [shipments, alertSettings]
  );

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAlertSettings(loadSavedAlertSettings(user.username, user.email));
    setActiveTab('overview');
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage failure
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedShipment(null);
    setIsAddModalOpen(false);
    setIsMobileSidebarOpen(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage failure
    }
  };

  const isSmt = currentUser?.role === 'SMT';

  const handleSelectTab = (tab: WorkspaceTab) => {
    if (isSmt && (tab === 'import-export' || tab === 'stock')) {
      showToast('This module is restricted to Inbound Logistics officers.', 'error');
      return;
    }
    setActiveTab(tab);
  };

  const handleUpdateStatus = (id: string, newStatus: ShipmentStatus) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }

    const target = shipments.find(s => s.id === id);
    if (!target || target.status === newStatus) {
      return;
    }

    const previousStatus = target.status;

    setShipments(prev =>
      prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      })
    );

    const entry = createAuditEntry({
      user: currentUser,
      action: 'STATUS_CHANGE',
      shipment: target,
      previousStatus,
      newStatus,
      note: `Status moved from "${previousStatus}" to "${newStatus}".`
    });
    setAuditLogs(prev => [entry, ...prev]);

    if (selectedShipment && selectedShipment.id === id) {
      setSelectedShipment(prev => (prev ? { ...prev, status: newStatus } : null));
    }
    if (
      alertSettings.pushEnabled &&
      (newStatus === 'Delayed' || newStatus === 'Customs Clearance Djibouti')
    ) {
      triggerBrowserPushNotification(
        `Shipment Status Alert: ${target.product}`,
        `PO ${target.poNumber || '—'} moved to "${newStatus}".`
      );
    }
    showToast(`Shipment updated to "${newStatus}".`);
  };

  const handleUpdateShipment = (updated: InboundShipment) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    const previous = shipments.find(s => s.id === updated.id);
    setShipments(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedShipment(updated);

    const statusChanged = previous && previous.status !== updated.status;
    const entry = createAuditEntry({
      user: currentUser,
      action: statusChanged ? 'STATUS_CHANGE' : 'SHIPMENT_UPDATED',
      shipment: updated,
      previousStatus: previous?.status,
      newStatus: updated.status,
      note: statusChanged
        ? `Status updated via consignment dossier from "${previous.status}" to "${updated.status}".`
        : 'Updated consignment milestones, invoice references, or operational remarks.'
    });
    setAuditLogs(prev => [entry, ...prev]);

    showToast(`Saved changes for ${updated.product}.`);
  };

  const handleAddShipment = (newShipment: InboundShipment) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    setShipments(prev => [newShipment, ...prev]);
    const entry = createAuditEntry({
      user: currentUser,
      action: 'SHIPMENT_CREATED',
      shipment: newShipment,
      newStatus: newShipment.status,
      note: `Created new inbound order (${newShipment.prQuantity.toLocaleString('en-US')} units).`
    });
    setAuditLogs(prev => [entry, ...prev]);
    showToast(`Added inbound order for ${newShipment.product}.`);
  };

  const handleRequestDeleteShipment = (id: string) => {
    if (isSmt) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    setPendingDeleteId(id);
  };

  const handleConfirmDeleteShipment = () => {
    if (!pendingDeleteId || isSmt || !currentUser) return;
    const target = shipments.find(s => s.id === pendingDeleteId);
    setShipments(prev => prev.filter(s => s.id !== pendingDeleteId));
    if (selectedShipment && selectedShipment.id === pendingDeleteId) {
      setSelectedShipment(null);
    }
    if (target) {
      const entry = createAuditEntry({
        user: currentUser,
        action: 'SHIPMENT_DELETED',
        shipment: target,
        previousStatus: target.status,
        newStatus: 'Deleted',
        note: `Removed consignment #${target.rowNo} (${target.product}) from tracker.`
      });
      setAuditLogs(prev => [entry, ...prev]);
    }
    setPendingDeleteId(null);
    showToast('Shipment record removed.');
  };

  const handleDuplicateShipment = (shipment: InboundShipment) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    const duplicated: InboundShipment = {
      ...shipment,
      id: `dkt-shipment-${Date.now()}`,
      rowNo: shipments.length + 1,
      prNumber: shipment.prNumber ? `${shipment.prNumber}-COPY` : 'PR-COPY',
      poNumber: shipment.poNumber ? `${shipment.poNumber}-COPY` : 'PO-COPY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setShipments(prev => [...prev, duplicated]);
    const entry = createAuditEntry({
      user: currentUser,
      action: 'SHIPMENT_CREATED',
      shipment: duplicated,
      newStatus: duplicated.status,
      note: `Duplicated from consignment #${shipment.rowNo} (${shipment.poNumber}).`
    });
    setAuditLogs(prev => [entry, ...prev]);
    showToast(`Duplicated consignment "${shipment.product}".`);
  };

  const handleImportShipments = (imported: InboundShipment[], replace: boolean) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    if (replace) {
      setShipments(imported);
    } else {
      setShipments(prev => [...prev, ...imported]);
    }
    const entry = createAuditEntry({
      user: currentUser,
      action: 'CSV_IMPORTED',
      shipment: {
        id: 'bulk-import',
        product: `${imported.length} Inbound Orders`,
        poNumber: replace ? 'Full Replace' : 'Append Batch',
        prNumber: `${imported.length} rows`
      },
      newStatus: replace ? 'Tracker Replaced' : 'Records Appended',
      note: `Imported ${imported.length} shipment records (${replace ? 'replaced existing tracker' : 'appended to tracker'}).`
    });
    setAuditLogs(prev => [entry, ...prev]);
    showToast(`Imported ${imported.length} shipment records.`);
  };

  const handleResetToDefault = () => {
    if (isSmt || !currentUser) return;
    setShipments([]);
    localStorage.removeItem(SHIPMENTS_STORAGE_KEY);
    const entry = createAuditEntry({
      user: currentUser,
      action: 'BASELINE_RESTORED',
      shipment: {
        id: 'ledger-cleared',
        product: 'Production Shipment Ledger',
        poNumber: 'Cleared',
        prNumber: '0 records'
      },
      newStatus: 'Clean Ledger',
      note: 'Cleared active shipment ledger for fresh production intake.'
    });
    setAuditLogs(prev => [entry, ...prev]);
    showToast('Active shipment ledger cleared.');
  };

  const handleUpdateStockItem = (updated: HubStockItem) => {
    if (isSmt) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    setHubStock(prev => prev.map(item => (item.id === updated.id ? updated : item)));
    showToast(`Updated stock count for ${updated.hubName}.`);
  };

  const handleAddStockItem = (newItem: HubStockItem) => {
    if (isSmt) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    setHubStock(prev => [newItem, ...prev]);
    showToast(`Added ${newItem.product} stock line to ${newItem.hubName}.`);
  };

  const handleAddWarehouseBatch = (item: WarehouseBatchItem) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    setWarehouseBatches(prev => [item, ...prev]);
    const histEntry = createWarehouseHistoryEntry({
      batch: item,
      user: currentUser,
      action: 'CREATED',
      newValue: `${item.quantity.toLocaleString('en-US')} ${item.unit}`,
      note: `Created batch ${item.batchNumber || '—'} in ${item.region} (${item.quantity.toLocaleString('en-US')} ${item.unit}).`
    });
    setWarehouseHistory(prev => [histEntry, ...prev]);
    showToast(`Added ${item.productDescription} batch to ${item.region}.`);
  };

  const handleUpdateWarehouseBatch = (updated: WarehouseBatchItem) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    const previous = warehouseBatches.find(b => b.id === updated.id);
    setWarehouseBatches(prev => prev.map(b => (b.id === updated.id ? updated : b)));

    if (previous) {
      const newEntries: WarehouseBatchHistoryEntry[] = [];
      if (previous.remark !== updated.remark) {
        newEntries.push(
          createWarehouseHistoryEntry({
            batch: updated,
            user: currentUser,
            action: 'STATUS_MOVEMENT',
            fieldChanged: 'Movement / Condition Remark',
            previousValue: previous.remark || '—',
            newValue: updated.remark || '—',
            note: `Status/movement updated from "${previous.remark || '—'}" to "${updated.remark || '—'}".`
          })
        );
      }
      if (previous.quantity !== updated.quantity) {
        newEntries.push(
          createWarehouseHistoryEntry({
            batch: updated,
            user: currentUser,
            action: 'UPDATED',
            fieldChanged: 'Quantity',
            previousValue: `${previous.quantity.toLocaleString('en-US')} ${previous.unit}`,
            newValue: `${updated.quantity.toLocaleString('en-US')} ${updated.unit}`,
            note: `Quantity adjusted from ${previous.quantity.toLocaleString('en-US')} to ${updated.quantity.toLocaleString('en-US')} ${updated.unit}.`
          })
        );
      }
      if (newEntries.length === 0) {
        newEntries.push(
          createWarehouseHistoryEntry({
            batch: updated,
            user: currentUser,
            action: 'UPDATED',
            note: `Updated batch details for ${updated.productDescription} (${updated.batchNumber || '—'}).`
          })
        );
      }
      setWarehouseHistory(prev => [...newEntries, ...prev]);
    }

    showToast(`Updated batch record for ${updated.productDescription}.`);
  };

  const handleDeleteWarehouseBatch = (id: string) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    const target = warehouseBatches.find(b => b.id === id);
    setWarehouseBatches(prev => prev.filter(b => b.id !== id));
    if (target) {
      const histEntry = createWarehouseHistoryEntry({
        batch: target,
        user: currentUser,
        action: 'DELETED',
        previousValue: `${target.quantity.toLocaleString('en-US')} ${target.unit}`,
        newValue: 'Removed',
        note: `Deleted batch ${target.batchNumber || '—'} (${target.productDescription}) from ${target.region}.`
      });
      setWarehouseHistory(prev => [histEntry, ...prev]);
    }
    showToast('Warehouse batch record removed.');
  };

  const handleReallocateWarehouseBatch = (params: {
    sourceBatchId: string;
    targetWarehouseCode: WarehouseCode;
    quantityToMove: number;
    remark: string;
  }) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    const source = warehouseBatches.find(b => b.id === params.sourceBatchId);
    const targetMeta = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code === params.targetWarehouseCode);
    if (!source || !targetMeta || params.targetWarehouseCode === source.warehouseCode) return;

    const moveQty = Math.min(source.quantity, Math.max(1, Math.round(params.quantityToMove)));
    const remainingQty = Math.max(0, source.quantity - moveQty);
    const todayIso = new Date().toISOString().split('T')[0];

    const updatedSource: WarehouseBatchItem = {
      ...source,
      quantity: remainingQty,
      remark: params.remark
        ? `Re-allocated ${moveQty} to ${targetMeta.code} (${params.remark})`
        : source.remark
    };

    const existingDest = warehouseBatches.find(
      b =>
        b.warehouseCode === targetMeta.code &&
        b.batchNumber.trim().toLowerCase() === source.batchNumber.trim().toLowerCase() &&
        b.productDescription.trim().toLowerCase() === source.productDescription.trim().toLowerCase()
    );

    const destBatch: WarehouseBatchItem = existingDest
      ? {
          ...existingDest,
          quantity: existingDest.quantity + moveQty,
          remark: params.remark || existingDest.remark || `Received from ${source.region}`,
          createdAt: todayIso
        }
      : {
          ...source,
          id: `wh-${targetMeta.code.toLowerCase()}-${Date.now()}`,
          warehouseCode: targetMeta.code,
          region: targetMeta.regionLabel,
          warehouseManager: targetMeta.defaultWarehouseManager,
          technicalManager: targetMeta.defaultTechnicalManager,
          quantity: moveQty,
          remark: params.remark || `Re-allocated from ${source.region}`,
          createdAt: todayIso
        };

    setWarehouseBatches(prev => {
      const mapped = prev.map(b => {
        if (b.id === source.id) return updatedSource;
        if (existingDest && b.id === existingDest.id) return destBatch;
        return b;
      });
      return existingDest ? mapped : [destBatch, ...mapped];
    });

    const sourceHistory = createWarehouseHistoryEntry({
      batch: updatedSource,
      user: currentUser,
      action: 'REALLOCATED',
      fieldChanged: 'Regional Allocation',
      previousValue: `${source.region} (${source.quantity.toLocaleString('en-US')} ${source.unit})`,
      newValue: `Sent ${moveQty.toLocaleString('en-US')} ${source.unit} -> ${targetMeta.regionLabel} (Remaining: ${remainingQty.toLocaleString('en-US')})`,
      note: `Re-allocated ${moveQty.toLocaleString('en-US')} ${source.unit} from ${source.region} to ${targetMeta.regionLabel}.${params.remark ? ` Note: ${params.remark}` : ''}`
    });

    const destHistory = createWarehouseHistoryEntry({
      batch: destBatch,
      user: currentUser,
      action: 'REALLOCATED',
      fieldChanged: 'Regional Receipt',
      previousValue: existingDest
        ? `${existingDest.quantity.toLocaleString('en-US')} ${existingDest.unit}`
        : '0 (New Transfer)',
      newValue: `${destBatch.quantity.toLocaleString('en-US')} ${destBatch.unit} at ${targetMeta.regionLabel}`,
      note: `Received ${moveQty.toLocaleString('en-US')} ${source.unit} via re-allocation from ${source.region}.${params.remark ? ` Note: ${params.remark}` : ''}`
    });

    setWarehouseHistory(prev => [destHistory, sourceHistory, ...prev]);
    showToast(
      `Re-allocated ${moveQty.toLocaleString('en-US')} ${source.unit} to ${targetMeta.regionLabel}.`
    );
  };

  const handleImportWarehouseBatches = (
    imported: WarehouseBatchItem[],
    targetCode: WarehouseCode | 'ALL',
    replaceTarget: boolean
  ) => {
    if (isSmt || !currentUser) {
      showToast('SMT role has read-only access.', 'error');
      return;
    }
    if (replaceTarget) {
      const importedCodes = new Set(imported.map(i => i.warehouseCode));
      setWarehouseBatches(prev => [
        ...prev.filter(existing =>
          targetCode === 'ALL'
            ? !importedCodes.has(existing.warehouseCode)
            : existing.warehouseCode !== targetCode
        ),
        ...imported
      ]);
    } else {
      setWarehouseBatches(prev => [...imported, ...prev]);
    }

    const importHistoryEntries = imported.map(item =>
      createWarehouseHistoryEntry({
        batch: item,
        user: currentUser,
        action: 'IMPORTED',
        newValue: `${item.quantity.toLocaleString('en-US')} ${item.unit}`,
        note: `Imported via Weekly Stock CSV into ${item.region} (${item.quantity.toLocaleString('en-US')} ${item.unit}${item.remark ? `, remark: ${item.remark}` : ''}).`
      })
    );
    setWarehouseHistory(prev => [...importHistoryEntries, ...prev]);

    showToast(`Imported ${imported.length} regional warehouse batch row(s).`);
  };

  const handleFilterByStatus = (status: string) => {
    setTableStatusFilter(status);
    setTableCiIssueFilter(false);
    setTableCriticalFilter(false);
    setActiveTab('table');
  };

  const handleFilterByCiIssue = () => {
    setTableCiIssueFilter(true);
    setTableCriticalFilter(false);
    setTableStatusFilter('ALL');
    setActiveTab('table');
  };

  const handleFilterByCriticalOrDelayed = () => {
    setTableCriticalFilter(true);
    setTableCiIssueFilter(false);
    setTableStatusFilter('ALL');
    setActiveTab('table');
  };

  const handleExportCsv = () => {
    if (isSmt) {
      showToast('Exports are restricted to Inbound Logistics officers.', 'error');
      return;
    }
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
    showToast('CSV tracker exported.');
  };

  const handleExportExcel = () => {
    if (isSmt) {
      showToast('Exports are restricted to Inbound Logistics officers.', 'error');
      return;
    }
    exportToExcelWorkbook(shipments);
    showToast('Excel (.xlsx) workbook exported.');
  };

  const handleChangeDateFormat = (fmt: DateFormatOption) => {
    setDateFormat(fmt);
    saveDateFormat(fmt);
    showToast(`Date format changed to ${fmt}.`);
  };

  const getActiveViewLabel = (): string => {
    switch (activeTab) {
      case 'overview':
        return isSmt ? 'Live Inbound Order Tracking' : 'Executive Overview';
      case 'pipeline':
        return 'Inbound Pipeline Board';
      case 'table':
        return 'Order Status Ledger';
      case 'stock':
        return 'National Stock Status';
      case 'warehouses':
        return '8 Regional Warehouses';
      case 'corridor':
        return 'Corridor Route Map';
      case 'analytics':
        return 'Lead Time & Efficiency Trends';
      case 'audit':
        return 'Status Audit Log';
      case 'settings':
        return 'SMT Alert & Notification Settings';
      case 'import-export':
        return 'Excel & CSV Center';
    }
  };

  const handleSaveAlertSettings = (updated: SmtAlertSettings) => {
    setAlertSettings(updated);
    if (currentUser) {
      saveAlertSettings(currentUser.username, updated);
    }
  };

  const handleDownloadSummaryPdf = (
    customShipments?: InboundShipment[],
    filterSummary?: string
  ) => {
    if (!currentUser) return;
    try {
      generateShipmentSummaryPdf({
        shipments: customShipments || shipments,
        viewTitle: getActiveViewLabel(),
        filterSummary,
        currentUser,
        dateFormat
      });
      showToast('Stakeholder Summary PDF report downloaded.');
    } catch (err) {
      console.error('Failed to generate summary PDF:', err);
      showToast('Could not generate PDF summary report.', 'error');
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  // Unauthenticated view: Always render Role-Based Login Page
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const pendingDeleteItem = pendingDeleteId
    ? shipments.find(s => s.id === pendingDeleteId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/80 via-blue-50/35 to-rose-50/30 text-slate-900 flex font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        shipments={shipments}
        lowStockCount={lowStockCount}
        auditLogCount={auditLogs.length}
        alertRuleMatchesCount={evaluatedAlertMatches.length}
        onFilterCustomsPending={() => handleFilterByStatus('Customs Clearance Djibouti')}
        onFilterExpiringDocs={handleFilterByCiIssue}
        onSelectShipment={setSelectedShipment}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          activeTab={activeTab}
          onOpenNewShipmentModal={() => setIsAddModalOpen(true)}
          onDownloadSummaryPdf={() => handleDownloadSummaryPdf()}
          onPrintSummary={handlePrintSummary}
          dateFormat={dateFormat}
          onChangeDateFormat={handleChangeDateFormat}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenSettings={() => handleSelectTab('settings')}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 pt-5 pb-24 lg:py-6">
          {/* Role Status Context Banner */}
          {isSmt ? (
            <div className="mb-5 p-4 bg-gradient-to-r from-red-50 via-white to-rose-50/80 rounded-xl border border-red-200 border-l-4 border-l-red-600 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Senior Management Team (SMT) — Inbound Order Monitor
                    </h2>
                    <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-md">
                      Read &amp; View Only
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">
                    Live tracking of inbound reproductive health shipments from factory production to DKT Central Warehouse.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono font-semibold text-red-700 bg-white/80 px-3 py-1.5 rounded-lg border border-red-200/70 whitespace-nowrap shrink-0">
                Production -&gt; Doraleh Port -&gt; DKT Central Warehouse
              </div>
            </div>
          ) : (
            <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 via-white to-teal-50/80 rounded-xl border border-emerald-200 border-l-4 border-l-emerald-600 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">
                    Inbound Logistics Full Access:
                  </span>
                  <span className="ml-1.5 text-slate-700">
                    Create, edit, delete consignments, update hub stock levels, and import/export Excel (.xlsx) &amp; CSV files.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700 bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200/70 whitespace-nowrap shrink-0">
                <span>Mumbai / JNPT</span>
                <span aria-hidden="true">-&gt;</span>
                <span>Djibouti</span>
                <span aria-hidden="true">-&gt;</span>
                <span className="text-red-600 font-bold">Addis Ababa</span>
              </div>
            </div>
          )}

          {/* Executive KPI Strip */}
          <MetricsCards
            shipments={shipments}
            criticalLeadTimeDays={alertSettings.criticalLeadTimeDays}
            onFilterByStatus={handleFilterByStatus}
            onFilterByCiIssue={handleFilterByCiIssue}
            onFilterByCriticalOrDelayed={handleFilterByCriticalOrDelayed}
          />

          {/* Active Workspace View */}
          {activeTab === 'overview' &&
            (isSmt ? (
              <SmtInboundTrackerDashboard
                shipments={shipments}
                onSelectShipment={setSelectedShipment}
                dateFormat={dateFormat}
                onChangeDateFormat={handleChangeDateFormat}
                onDownloadSummaryPdf={handleDownloadSummaryPdf}
                onPrintSummary={handlePrintSummary}
              />
            ) : (
              <OverviewDashboard
                shipments={shipments}
                stockItems={hubStock}
                onNavigateTab={handleSelectTab}
                onFilterTableByStatus={handleFilterByStatus}
                onFilterTableByCiIssue={handleFilterByCiIssue}
                onSelectShipment={setSelectedShipment}
                isSmt={isSmt}
              />
            ))}

          {activeTab === 'pipeline' && (
            <PipelineBoardView
              shipments={shipments}
              onSelectShipment={setSelectedShipment}
              onUpdateStatus={handleUpdateStatus}
              dateFormat={dateFormat}
              isSmt={isSmt}
            />
          )}

          {activeTab === 'table' && (
            <ShipmentTableView
              shipments={shipments}
              onSelectShipment={setSelectedShipment}
              onUpdateStatus={handleUpdateStatus}
              onUpdateShipment={handleUpdateShipment}
              onDeleteShipment={handleRequestDeleteShipment}
              onDuplicateShipment={handleDuplicateShipment}
              onExportCsv={handleExportCsv}
              onExportExcel={handleExportExcel}
              onDownloadSummaryPdf={handleDownloadSummaryPdf}
              onPrintSummary={handlePrintSummary}
              dateFormat={dateFormat}
              onChangeDateFormat={handleChangeDateFormat}
              initialFilterStatus={tableStatusFilter}
              initialFilterCiIssue={tableCiIssueFilter}
              initialFilterCriticalOnly={tableCriticalFilter}
              isSmt={isSmt}
            />
          )}

          {activeTab === 'stock' && !isSmt && (
            <NationalStockView
              stockItems={hubStock}
              shipments={shipments}
              onUpdateStockItem={handleUpdateStockItem}
              onAddStockItem={handleAddStockItem}
              isSmt={isSmt}
            />
          )}

          {activeTab === 'warehouses' && (
            <RegionalWarehousesView
              batches={warehouseBatches}
              historyEntries={warehouseHistory}
              dateFormat={dateFormat}
              isSmt={isSmt}
              onAddBatch={handleAddWarehouseBatch}
              onUpdateBatch={handleUpdateWarehouseBatch}
              onDeleteBatch={handleDeleteWarehouseBatch}
              onReallocateBatch={handleReallocateWarehouseBatch}
              onImportBatches={handleImportWarehouseBatches}
            />
          )}

          {activeTab === 'corridor' && (
            <CorridorMapView
              shipments={shipments}
              onSelectShipment={setSelectedShipment}
              isSmt={isSmt}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              shipments={shipments}
              dateFormat={dateFormat}
              onSelectShipment={setSelectedShipment}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogView
              auditLogs={auditLogs}
              shipments={shipments}
              onSelectShipment={setSelectedShipment}
              isSmt={isSmt}
            />
          )}

          {activeTab === 'settings' && (
            <SmtSettingsView
              currentUser={currentUser}
              shipments={shipments}
              settings={alertSettings}
              onSaveSettings={handleSaveAlertSettings}
              onSelectShipment={setSelectedShipment}
              onNotify={showToast}
            />
          )}

          {activeTab === 'import-export' && !isSmt && (
            <CsvImportExportModal
              shipments={shipments}
              onImportShipments={handleImportShipments}
              onResetToDefault={handleResetToDefault}
            />
          )}
        </main>
      </div>

      {/* Consignment Dossier & Milestone Drawer */}
      <ShipmentDetailDrawer
        shipment={selectedShipment}
        onClose={() => setSelectedShipment(null)}
        onUpdateShipment={handleUpdateShipment}
        auditLogs={
          selectedShipment
            ? auditLogs.filter(log => log.shipmentId === selectedShipment.id)
            : []
        }
        dateFormat={dateFormat}
        isSmt={isSmt}
      />

      {/* Add New Shipment Modal (Inbound Logistics Only) */}
      {!isSmt && (
        <AddShipmentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddShipment={handleAddShipment}
          nextRowNo={shipments.length + 1}
        />
      )}

      {/* Confirm Delete Shipment Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingDeleteId)}
        title="Delete Shipment Record?"
        message={
          pendingDeleteItem
            ? `Remove consignment #${pendingDeleteItem.rowNo} (${pendingDeleteItem.product}, PR ${pendingDeleteItem.prNumber || '—'}) from the active tracker?`
            : 'Remove this shipment from the active tracker?'
        }
        confirmLabel="Delete Order"
        tone="danger"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDeleteShipment}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenMoreMenu={() => setIsMobileSidebarOpen(true)}
        shipments={shipments}
      />

      {/* Share Link & Desktop Shortcut Modal */}
      <ShareAndInstallModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Non-blocking Toast Banner */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 lg:bottom-5 right-4 sm:right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

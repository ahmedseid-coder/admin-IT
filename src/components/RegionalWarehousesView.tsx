import React, { useMemo, useRef, useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Upload,
  Download,
  Edit3,
  Save,
  X,
  Trash2,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Users,
  Eye,
  Filter,
  Clock,
  CalendarDays,
  FileSpreadsheet,
  Sparkles,
  History,
  ArrowRightLeft,
  User as UserIcon
} from 'lucide-react';
import {
  EIGHT_REGIONAL_WAREHOUSES,
  WarehouseBatchHistoryEntry,
  WarehouseBatchItem,
  WarehouseCode
} from '../types/warehouse';
import {
  exportWarehouseBatchCsv,
  exportWeeklyTemplateCsv,
  getDaysUntilExpiry,
  getExpiryStatus,
  getExpiryUrgencyTier,
  parseWarehouseBatchCsv
} from '../utils/warehouseCsv';
import { formatDate, formatQuantity } from '../utils/csvParser';
import { DateFormatOption } from '../utils/dateFormat';

interface RegionalWarehousesViewProps {
  batches: WarehouseBatchItem[];
  historyEntries: WarehouseBatchHistoryEntry[];
  dateFormat: DateFormatOption;
  isSmt: boolean;
  onAddBatch: (item: WarehouseBatchItem) => void;
  onUpdateBatch: (item: WarehouseBatchItem) => void;
  onDeleteBatch: (id: string) => void;
  onReallocateBatch: (params: {
    sourceBatchId: string;
    targetWarehouseCode: WarehouseCode;
    quantityToMove: number;
    remark: string;
  }) => void;
  onImportBatches: (
    items: WarehouseBatchItem[],
    targetCode: WarehouseCode | 'ALL',
    replaceTarget: boolean
  ) => void;
}

export const RegionalWarehousesView: React.FC<RegionalWarehousesViewProps> = ({
  batches,
  historyEntries,
  dateFormat,
  isSmt,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
  onReallocateBatch,
  onImportBatches
}) => {
  const [selectedCode, setSelectedCode] = useState<WarehouseCode | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<
    'ALL' | 'FLAGGED' | 'Expired' | 'Expiring Soon' | 'Valid' | 'No Expiry'
  >('ALL');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [warningDays, setWarningDays] = useState<number>(180);
  const [weeklyReportDate, setWeeklyReportDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );

  const [isAddOpen, setIsAddOpen] = useState(false);

  // Batch History & Re-allocation Drawer state
  const [historyBatchId, setHistoryBatchId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'history' | 'reallocate'>('history');
  const [reallocateTargetCode, setReallocateTargetCode] = useState<WarehouseCode>('AO01');
  const [reallocateQuantity, setReallocateQuantity] = useState<number>(0);
  const [reallocateRemark, setReallocateRemark] = useState<string>('');
  const [statusMovementRemark, setStatusMovementRemark] = useState<string>('');

  // Weekly CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFallbackCode, setImportFallbackCode] = useState<WarehouseCode>('AO04');
  const [importReplaceMode, setImportReplaceMode] = useState<boolean>(true);
  const [useSelectedWeekDate, setUseSelectedWeekDate] = useState<boolean>(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importPreviewItems, setImportPreviewItems] = useState<WarehouseBatchItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Add form state
  const [newWarehouseCode, setNewWarehouseCode] = useState<WarehouseCode>('AO01');
  const [newProduct, setNewProduct] = useState('');
  const [newUnit, setNewUnit] = useState('EA');
  const [newManufacturer, setNewManufacturer] = useState('DKT Ethiopia');
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [newRemark, setNewRemark] = useState('Good condition');
  const [newItemNo, setNewItemNo] = useState('');
  const [newWarehouseManager, setNewWarehouseManager] = useState('');
  const [newTechnicalManager, setNewTechnicalManager] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<WarehouseBatchItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Per-warehouse aggregate metrics across all 8 regional warehouses
  const warehouseStats = useMemo(() => {
    const weekRefMs = new Date(`${weeklyReportDate}T00:00:00Z`).getTime();
    return EIGHT_REGIONAL_WAREHOUSES.map(meta => {
      const items = batches.filter(b => b.warehouseCode === meta.code);
      const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const outOfStockCount = items.filter(i => (Number(i.quantity) || 0) <= 0).length;

      let expiredCount = 0;
      let approachingCount = 0;
      let latestCreatedIso = '';

      items.forEach(i => {
        const tier = getExpiryUrgencyTier(i.expiryDate, warningDays);
        if (tier === 'expired') expiredCount += 1;
        else if (tier === 'critical' || tier === 'approaching') approachingCount += 1;

        if (i.createdAt && /^\d{4}-\d{2}-\d{2}$/.test(i.createdAt)) {
          if (!latestCreatedIso || i.createdAt > latestCreatedIso) {
            latestCreatedIso = i.createdAt;
          }
        }
      });

      const distinctProducts = new Set(items.map(i => i.productDescription.trim().toLowerCase())).size;
      const latestMs = latestCreatedIso
        ? new Date(`${latestCreatedIso}T00:00:00Z`).getTime()
        : 0;
      const reportedThisWeek =
        Boolean(latestMs) && !isNaN(weekRefMs) && Math.abs(weekRefMs - latestMs) <= 7 * 86400000;

      const latestRow = items[0];
      return {
        meta,
        itemsCount: items.length,
        distinctProducts,
        totalUnits,
        outOfStockCount,
        expiredCount,
        approachingCount,
        expiryAlertCount: expiredCount + approachingCount,
        latestCreatedIso,
        reportedThisWeek,
        warehouseManager: latestRow?.warehouseManager || meta.defaultWarehouseManager,
        technicalManager: latestRow?.technicalManager || meta.defaultTechnicalManager
      };
    });
  }, [batches, warningDays, weeklyReportDate]);

  // Scope-level expiry watchlist summary (respects selected warehouse card)
  const scopeBatches = useMemo(
    () => (selectedCode === 'ALL' ? batches : batches.filter(b => b.warehouseCode === selectedCode)),
    [batches, selectedCode]
  );

  const expiryWatchlist = useMemo(() => {
    let expiredCount = 0;
    let criticalCount = 0;
    let approachingCount = 0;
    let unitsAtRisk = 0;
    const affectedWarehouses = new Set<WarehouseCode>();

    scopeBatches.forEach(item => {
      const tier = getExpiryUrgencyTier(item.expiryDate, warningDays);
      if (tier === 'expired') {
        expiredCount += 1;
        unitsAtRisk += Number(item.quantity) || 0;
        affectedWarehouses.add(item.warehouseCode);
      } else if (tier === 'critical') {
        criticalCount += 1;
        unitsAtRisk += Number(item.quantity) || 0;
        affectedWarehouses.add(item.warehouseCode);
      } else if (tier === 'approaching') {
        approachingCount += 1;
        unitsAtRisk += Number(item.quantity) || 0;
        affectedWarehouses.add(item.warehouseCode);
      }
    });

    return {
      expiredCount,
      criticalCount,
      approachingCount,
      totalFlagged: expiredCount + criticalCount + approachingCount,
      unitsAtRisk,
      affectedWarehousesCount: affectedWarehouses.size
    };
  }, [scopeBatches, warningDays]);

  const filteredBatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return batches.filter(item => {
      if (selectedCode !== 'ALL' && item.warehouseCode !== selectedCode) {
        return false;
      }
      if (stockFilter === 'IN_STOCK' && item.quantity <= 0) return false;
      if (stockFilter === 'OUT_OF_STOCK' && item.quantity > 0) return false;

      if (expiryFilter !== 'ALL') {
        const st = getExpiryStatus(item.expiryDate, warningDays);
        if (expiryFilter === 'FLAGGED') {
          if (st !== 'Expired' && st !== 'Expiring Soon') return false;
        } else if (st !== expiryFilter) {
          return false;
        }
      }

      if (movementFilter !== 'ALL') {
        const rem = (item.remark || '').toLowerCase();
        if (!rem.includes(movementFilter.toLowerCase())) return false;
      }

      if (q) {
        const searchable = [
          item.itemNo || '',
          item.region,
          item.warehouseCode,
          item.warehouseManager,
          item.technicalManager,
          item.productDescription,
          item.unit,
          item.manufacturer,
          item.batchNumber,
          item.remark
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [batches, selectedCode, stockFilter, expiryFilter, movementFilter, searchTerm, warningDays]);

  const summaryMetrics = useMemo(() => {
    const totalUnits = filteredBatches.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const outOfStock = filteredBatches.filter(i => i.quantity <= 0).length;
    const expiredOrSoon = filteredBatches.filter(i => {
      const st = getExpiryStatus(i.expiryDate, warningDays);
      return st === 'Expired' || st === 'Expiring Soon';
    }).length;
    const productsCount = new Set(
      filteredBatches.map(i => i.productDescription.trim().toLowerCase())
    ).size;
    return {
      totalUnits,
      batchRows: filteredBatches.length,
      productsCount,
      outOfStock,
      expiredOrSoon
    };
  }, [filteredBatches, warningDays]);

  const selectedMeta = useMemo(
    () =>
      selectedCode === 'ALL'
        ? null
        : warehouseStats.find(w => w.meta.code === selectedCode) || null,
    [selectedCode, warehouseStats]
  );

  const weeklySubmittedCount = useMemo(
    () => warehouseStats.filter(w => w.reportedThisWeek).length,
    [warehouseStats]
  );

  const handleOpenAddForm = () => {
    if (isSmt) return;
    const defaultCode: WarehouseCode = selectedCode === 'ALL' ? 'AO01' : selectedCode;
    const meta = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code === defaultCode)!;
    setNewWarehouseCode(defaultCode);
    setNewWarehouseManager(meta.defaultWarehouseManager);
    setNewTechnicalManager(meta.defaultTechnicalManager);
    setNewProduct('');
    setNewUnit('EA');
    setNewManufacturer('DKT Ethiopia');
    setNewBatchNumber('');
    setNewExpiryDate('');
    setNewQuantity(0);
    setNewRemark('Good condition');
    setNewItemNo('');
    setIsAddOpen(prev => !prev);
  };

  const handleSelectAddWarehouse = (code: WarehouseCode) => {
    setNewWarehouseCode(code);
    const meta = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code === code)!;
    setNewWarehouseManager(meta.defaultWarehouseManager);
    setNewTechnicalManager(meta.defaultTechnicalManager);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSmt || !newProduct.trim()) return;
    const meta = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code === newWarehouseCode)!;
    const item: WarehouseBatchItem = {
      id: `wh-${newWarehouseCode.toLowerCase()}-${Date.now()}`,
      itemNo: newItemNo.trim() || undefined,
      warehouseCode: newWarehouseCode,
      region: meta.regionLabel,
      warehouseManager: newWarehouseManager.trim() || meta.defaultWarehouseManager,
      technicalManager: newTechnicalManager.trim() || meta.defaultTechnicalManager,
      productDescription: newProduct.trim(),
      unit: newUnit.trim() || 'EA',
      manufacturer: newManufacturer.trim() || 'DKT Ethiopia',
      batchNumber: newBatchNumber.trim(),
      expiryDate: newExpiryDate.trim(),
      quantity: Math.max(0, Number(newQuantity) || 0),
      remark: newRemark.trim(),
      createdAt: weeklyReportDate || new Date().toISOString().split('T')[0]
    };
    onAddBatch(item);
    setIsAddOpen(false);
  };

  const handleStartEdit = (item: WarehouseBatchItem) => {
    if (isSmt) return;
    setConfirmDeleteId(null);
    setEditingId(item.id);
    setEditDraft({ ...item });
  };

  const handleSaveEdit = () => {
    if (isSmt || !editDraft) return;
    onUpdateBatch({
      ...editDraft,
      quantity: Math.max(0, Number(editDraft.quantity) || 0)
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const triggerCsvDownload = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportWeeklyCsv = () => {
    const scopeItems =
      selectedCode === 'ALL'
        ? batches
        : batches.filter(b => b.warehouseCode === selectedCode);
    const csv = exportWarehouseBatchCsv(scopeItems);
    const suffix = selectedCode === 'ALL' ? 'All_8_Warehouses' : selectedCode;
    triggerCsvDownload(
      csv,
      `DKT_Weekly_Stock_Status_${suffix}_${weeklyReportDate}.csv`
    );
  };

  const handleDownloadWeeklyTemplate = () => {
    const targetCode: WarehouseCode = selectedCode === 'ALL' ? 'AO01' : selectedCode;
    const csv = exportWeeklyTemplateCsv(targetCode, weeklyReportDate);
    triggerCsvDownload(
      csv,
      `DKT_Weekly_Stock_Template_${targetCode}_${weeklyReportDate}.csv`
    );
  };

  const handleOpenImportModal = () => {
    if (isSmt) return;
    setImportFallbackCode(selectedCode === 'ALL' ? 'AO04' : selectedCode);
    setImportPreviewItems(null);
    setImportFileName('');
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleModalFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSmt) return;
    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = ev => {
      const text = String(ev.target?.result || '');
      const parsed = parseWarehouseBatchCsv(text, importFallbackCode, {
        fallbackCode: importFallbackCode,
        overrideCreatedAt: useSelectedWeekDate ? weeklyReportDate : undefined
      });
      if (parsed.length === 0) {
        setImportError(
          'No valid batch rows were detected. Ensure the CSV matches the regional format (region, warehouse_manager, technical_manager, product_description, unit, manufacturer, batch_number, expiry_date, quantity, remark, created_at).'
        );
        setImportPreviewItems(null);
      } else {
        setImportPreviewItems(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmWeeklyImport = () => {
    if (!importPreviewItems || importPreviewItems.length === 0 || isSmt) return;
    const detectedCodes = Array.from(new Set(importPreviewItems.map(i => i.warehouseCode)));
    const targetScope: WarehouseCode | 'ALL' =
      detectedCodes.length === 1 ? detectedCodes[0] : 'ALL';

    onImportBatches(importPreviewItems, targetScope, importReplaceMode);
    if (detectedCodes.length === 1) {
      setSelectedCode(detectedCodes[0]);
    }
    setIsImportModalOpen(false);
    setImportPreviewItems(null);
    setImportFileName('');
  };

  const importPreviewStats = useMemo(() => {
    if (!importPreviewItems) return null;
    const totalUnits = importPreviewItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const regions = Array.from(new Set(importPreviewItems.map(i => i.region)));
    const flaggedCount = importPreviewItems.filter(i => {
      const st = getExpiryStatus(i.expiryDate, warningDays);
      return st === 'Expired' || st === 'Expiring Soon';
    }).length;
    return { totalUnits, regions, flaggedCount };
  }, [importPreviewItems, warningDays]);

  const activeDrawerBatch = useMemo(
    () => (historyBatchId ? batches.find(b => b.id === historyBatchId) || null : null),
    [batches, historyBatchId]
  );

  const historyCountByBatchId = useMemo(() => {
    const map = new Map<string, number>();
    historyEntries.forEach(entry => {
      map.set(entry.batchId, (map.get(entry.batchId) || 0) + 1);
    });
    return map;
  }, [historyEntries]);

  const activeBatchHistory = useMemo(() => {
    if (!activeDrawerBatch) return [];
    return historyEntries.filter(entry => entry.batchId === activeDrawerBatch.id);
  }, [historyEntries, activeDrawerBatch]);

  const handleOpenBatchDrawer = (
    item: WarehouseBatchItem,
    initialTab: 'history' | 'reallocate' = 'history'
  ) => {
    setHistoryBatchId(item.id);
    setDrawerTab(initialTab);
    const altHub = EIGHT_REGIONAL_WAREHOUSES.find(w => w.code !== item.warehouseCode);
    setReallocateTargetCode(altHub ? altHub.code : 'HQ00');
    setReallocateQuantity(Math.max(1, item.quantity));
    setReallocateRemark('');
    setStatusMovementRemark(item.remark || 'Good condition');
  };

  const handleConfirmReallocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSmt || !activeDrawerBatch) return;
    if (reallocateTargetCode === activeDrawerBatch.warehouseCode) return;
    const moveQty = Math.min(
      activeDrawerBatch.quantity,
      Math.max(1, Math.round(Number(reallocateQuantity) || 0))
    );
    if (moveQty <= 0) return;

    onReallocateBatch({
      sourceBatchId: activeDrawerBatch.id,
      targetWarehouseCode: reallocateTargetCode,
      quantityToMove: moveQty,
      remark: reallocateRemark.trim()
    });
    setDrawerTab('history');
  };

  const handleApplyMovementStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSmt || !activeDrawerBatch) return;
    onUpdateBatch({
      ...activeDrawerBatch,
      remark: statusMovementRemark.trim() || activeDrawerBatch.remark
    });
    setDrawerTab('history');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner + Weekly Stock Status Controls */}
      <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  8 Regional Warehouses — Weekly Stock Status &amp; Expiry Monitor
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  HQ00 · AO01–AO07
                </span>
                {isSmt && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                    <Eye className="w-3 h-3" /> Read-Only View
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Weekly stock status across Addis Ababa Central, Adama, Hawassa, Dire Dawa, Dessie, Jimma, Bahidar &amp; Mekele with automatic approaching-expiry flags.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCode('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                selectedCode === 'ALL'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All 8 Warehouses ({batches.length})
            </button>

            {!isSmt && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Batch</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenImportModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Import Weekly CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportWeeklyCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Export Weekly CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadWeeklyTemplate}
                  title="Download blank weekly stock status CSV template in DKT regional format"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Weekly Template</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Weekly Reporting Period & Regional Submission Strip */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <CalendarDays className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="font-semibold text-slate-700">Weekly Stock Date:</span>
              <input
                type="date"
                value={weeklyReportDate}
                onChange={e => setWeeklyReportDate(e.target.value)}
                aria-label="Weekly reporting date"
                className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold font-mono">
              {weeklySubmittedCount}/8 Hubs Updated This Week
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {warehouseStats.map(w => (
              <button
                key={w.meta.code}
                type="button"
                onClick={() => setSelectedCode(w.meta.code)}
                title={`${w.meta.regionLabel}: Last report ${w.latestCreatedIso ? formatDate(w.latestCreatedIso, dateFormat) : 'N/A'}`}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                  selectedCode === w.meta.code
                    ? 'bg-red-600 text-white border-red-600'
                    : w.reportedThisWeek
                    ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedCode === w.meta.code
                      ? 'bg-white'
                      : w.reportedThisWeek
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span>{w.meta.code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Automatic Approaching-Expiry Alert Watchlist Banner */}
      {expiryWatchlist.totalFlagged > 0 && (
        <div className="p-4 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/70 to-red-50/70 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Automatic Expiry Flagging Active ({expiryWatchlist.totalFlagged} batch
                  {expiryWatchlist.totalFlagged === 1 ? '' : 'es'} highlighted)
                </h3>
                {expiryWatchlist.expiredCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-mono font-bold">
                    {expiryWatchlist.expiredCount} Expired
                  </span>
                )}
                {expiryWatchlist.criticalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white text-[11px] font-mono font-bold">
                    {expiryWatchlist.criticalCount} Critical (&le;90d)
                  </span>
                )}
                {expiryWatchlist.approachingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-mono font-bold">
                    {expiryWatchlist.approachingCount} Approaching (&le;{warningDays}d)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 mt-1">
                <strong className="font-mono text-slate-900">
                  {formatQuantity(expiryWatchlist.unitsAtRisk)}
                </strong>{' '}
                units across{' '}
                <strong className="font-mono text-slate-900">
                  {expiryWatchlist.affectedWarehousesCount}
                </strong>{' '}
                regional warehouse{expiryWatchlist.affectedWarehousesCount === 1 ? '' : 's'} require
                FEFO dispatch or quarantine review. Flagged rows are automatically highlighted below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="font-semibold text-slate-700">Flag Window:</span>
              <select
                value={warningDays}
                onChange={e => setWarningDays(Number(e.target.value))}
                aria-label="Approaching expiry alert threshold"
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value={90}>90 Days (3 mo)</option>
                <option value={180}>180 Days (6 mo)</option>
                <option value={365}>365 Days (12 mo)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                setExpiryFilter(prev => (prev === 'FLAGGED' ? 'ALL' : 'FLAGGED'))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                expiryFilter === 'FLAGGED'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
              }`}
            >
              {expiryFilter === 'FLAGGED'
                ? 'Show All Batches'
                : `Focus ${expiryWatchlist.totalFlagged} Flagged Batches`}
            </button>
          </div>
        </div>
      )}

      {/* 8 Regional Warehouse Cards Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {warehouseStats.map(stat => {
          const isSelected = selectedCode === stat.meta.code;
          const hasExpired = stat.expiredCount > 0;
          const hasApproaching = stat.approachingCount > 0;

          return (
            <button
              key={stat.meta.code}
              type="button"
              onClick={() =>
                setSelectedCode(prev => (prev === stat.meta.code ? 'ALL' : stat.meta.code))
              }
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-red-50/70 border-red-400 ring-2 ring-red-500/20 shadow-xs'
                  : hasExpired
                  ? 'bg-white border-red-200 hover:border-red-300 hover:shadow-xs'
                  : hasApproaching
                  ? 'bg-white border-amber-200 hover:border-amber-300 hover:shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {stat.meta.code}
                    </span>
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {stat.meta.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-1">
                    {stat.meta.zone}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {hasExpired && (
                    <span
                      title={`${stat.expiredCount} expired batch(es)`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700"
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {stat.expiredCount} exp
                    </span>
                  )}
                  {hasApproaching && (
                    <span
                      title={`${stat.approachingCount} batch(es) approaching expiry within ${warningDays} days`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {stat.approachingCount} soon
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-500">Total Units</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {formatQuantity(stat.totalUnits)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <div className="font-mono font-semibold">
                    {stat.itemsCount} batches
                  </div>
                  {stat.outOfStockCount > 0 ? (
                    <div className="text-[11px] font-semibold text-amber-700">
                      {stat.outOfStockCount} out of stock
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      All in stock
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">
                    WH: <strong className="text-slate-700">{stat.warehouseManager}</strong>
                  </span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  {stat.latestCreatedIso ? formatDate(stat.latestCreatedIso, dateFormat) : 'No report'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Batch Inline Drawer (Inbound Logistics Only) */}
      {!isSmt && isAddOpen && (
        <form
          onSubmit={handleCreateBatch}
          className="p-5 bg-white rounded-xl border border-red-200 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Add New Batch Record to Regional Warehouse
            </h3>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close add batch form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Regional Warehouse *
              </label>
              <select
                value={newWarehouseCode}
                onChange={e => handleSelectAddWarehouse(e.target.value as WarehouseCode)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              >
                {EIGHT_REGIONAL_WAREHOUSES.map(w => (
                  <option key={w.code} value={w.code}>
                    {w.regionLabel} — {w.zone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Product Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Hiwot Trust condom"
                value={newProduct}
                onChange={e => setNewProduct(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                placeholder="e.g. M44260510"
                value={newBatchNumber}
                onChange={e => setNewBatchNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={newExpiryDate}
                onChange={e => setNewExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min={0}
                required
                value={newQuantity}
                onChange={e => setNewQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                placeholder="EA, Cycle, Vial, Kit, Set, Sachet"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={newManufacturer}
                onChange={e => setNewManufacturer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Remark / Movement
              </label>
              <input
                type="text"
                value={newRemark}
                onChange={e => setNewRemark(e.target.value)}
                placeholder="Good condition, Fast moving, Slow moving..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Warehouse Manager
              </label>
              <input
                type="text"
                value={newWarehouseManager}
                onChange={e => setNewWarehouseManager(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Technical Manager
              </label>
              <input
                type="text"
                value={newTechnicalManager}
                onChange={e => setNewTechnicalManager(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Line No. (Optional)
              </label>
              <input
                type="text"
                value={newItemNo}
                onChange={e => setNewItemNo(e.target.value)}
                placeholder="e.g. 17"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Save Batch Record
            </button>
          </div>
        </form>
      )}

      {/* Selected Scope KPI Strip + Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
              Scope:{' '}
              <span className="text-red-700 font-bold">
                {selectedMeta ? selectedMeta.meta.regionLabel : 'All 8 Regional Warehouses'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
              <strong className="text-slate-900">{formatQuantity(summaryMetrics.totalUnits)}</strong>{' '}
              units
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
              <strong className="text-slate-900">{summaryMetrics.productsCount}</strong> SKUs ·{' '}
              <strong className="text-slate-900">{summaryMetrics.batchRows}</strong> batches
            </div>
            {summaryMetrics.outOfStock > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1">
                <PackageX className="w-3.5 h-3.5" />
                <span>{summaryMetrics.outOfStock} Zero Stock</span>
              </div>
            )}
            {summaryMetrics.expiredOrSoon > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{summaryMetrics.expiredOrSoon} Expiry Highlighted</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" /> Expired
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-orange-500 inline-block" /> Critical (&le;90d)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" /> Approaching (&le;{warningDays}d)
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search product, batch #, manager, manufacturer, remark..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value as 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK')}
              aria-label="Filter by stock level"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock (&gt; 0)</option>
              <option value="OUT_OF_STOCK">Out of Stock (0)</option>
            </select>
          </div>

          <select
            value={expiryFilter}
            onChange={e =>
              setExpiryFilter(
                e.target.value as
                  | 'ALL'
                  | 'FLAGGED'
                  | 'Expired'
                  | 'Expiring Soon'
                  | 'Valid'
                  | 'No Expiry'
              )
            }
            aria-label="Filter by expiry status"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Expiry Statuses</option>
            <option value="FLAGGED">Flagged (Expired + Approaching)</option>
            <option value="Expired">Expired Only</option>
            <option value="Expiring Soon">Approaching Expiry (&le; {warningDays}d)</option>
            <option value="Valid">Valid Shelf Life</option>
            <option value="No Expiry">No Expiry Date</option>
          </select>

          <select
            value={movementFilter}
            onChange={e => setMovementFilter(e.target.value)}
            aria-label="Filter by movement remark"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Remarks / Movement</option>
            <option value="Fast moving">Fast moving</option>
            <option value="Slow moving">Slow moving</option>
            <option value="Good">Good condition</option>
            <option value="No moving">No moving</option>
            <option value="FEFO">FEFO Priority</option>
          </select>
        </div>

        {/* Batch Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3.5">No.</th>
                <th className="py-3 px-3.5">Region</th>
                <th className="py-3 px-3.5">Managers</th>
                <th className="py-3 px-3.5">Product Description</th>
                <th className="py-3 px-3.5">Batch No.</th>
                <th className="py-3 px-3.5">Expiry Date &amp; Alert</th>
                <th className="py-3 px-3.5 text-right">Quantity</th>
                <th className="py-3 px-3.5">Remark</th>
                <th className="py-3 px-3.5">Weekly Date</th>
                <th className="py-3 px-3.5 text-right">Actions &amp; History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-10 px-4 text-center text-sm text-slate-500"
                  >
                    {batches.length === 0
                      ? 'No regional warehouse batch records uploaded yet. Add a batch or import a Weekly Stock CSV above.'
                      : 'No warehouse batch records match the active search or filters.'}
                  </td>
                </tr>
              ) : (
                filteredBatches.map(item => {
                  const isEditing = editingId === item.id && editDraft !== null;
                  const tier = getExpiryUrgencyTier(item.expiryDate, warningDays);
                  const daysLeft = getDaysUntilExpiry(item.expiryDate);
                  const isZero = item.quantity <= 0;

                  const rowHighlightClass =
                    tier === 'expired'
                      ? 'bg-red-50/75 border-l-4 border-l-red-600 hover:bg-red-100/60'
                      : tier === 'critical'
                      ? 'bg-orange-50/80 border-l-4 border-l-orange-500 hover:bg-orange-100/60'
                      : tier === 'approaching'
                      ? 'bg-amber-50/70 border-l-4 border-l-amber-400 hover:bg-amber-100/50'
                      : 'hover:bg-slate-50/90';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${rowHighlightClass}`}
                    >
                      <td className="py-3 px-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {item.itemNo || '—'}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800">
                          {item.region}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-xs text-slate-700 min-w-[165px]">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editDraft.warehouseManager}
                              onChange={e =>
                                setEditDraft({ ...editDraft, warehouseManager: e.target.value })
                              }
                              className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                              placeholder="Warehouse Manager"
                            />
                            <input
                              type="text"
                              value={editDraft.technicalManager}
                              onChange={e =>
                                setEditDraft({ ...editDraft, technicalManager: e.target.value })
                              }
                              className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                              placeholder="Technical Manager"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.warehouseManager}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Tech: {item.technicalManager}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 min-w-[190px]">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editDraft.productDescription}
                              onChange={e =>
                                setEditDraft({
                                  ...editDraft,
                                  productDescription: e.target.value
                                })
                              }
                              className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold"
                            />
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editDraft.unit}
                                onChange={e =>
                                  setEditDraft({ ...editDraft, unit: e.target.value })
                                }
                                className="w-20 px-2 py-1 rounded border border-slate-300 text-xs"
                                placeholder="Unit"
                              />
                              <input
                                type="text"
                                value={editDraft.manufacturer}
                                onChange={e =>
                                  setEditDraft({ ...editDraft, manufacturer: e.target.value })
                                }
                                className="flex-1 px-2 py-1 rounded border border-slate-300 text-xs"
                                placeholder="Manufacturer"
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenBatchDrawer(item, 'history')}
                            className="text-left group"
                            title="Inspect batch movement history"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                              {item.productDescription}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.unit} · {item.manufacturer}
                            </div>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.batchNumber}
                            onChange={e =>
                              setEditDraft({ ...editDraft, batchNumber: e.target.value })
                            }
                            className="w-28 px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                          />
                        ) : (
                          item.batchNumber || '—'
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDraft.expiryDate}
                            onChange={e =>
                              setEditDraft({ ...editDraft, expiryDate: e.target.value })
                            }
                            className="px-2 py-1 rounded border border-slate-300 text-xs"
                          />
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs font-mono font-semibold text-slate-900">
                              {item.expiryDate ? formatDate(item.expiryDate, dateFormat) : '—'}
                            </div>
                            {tier === 'expired' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Expired {daysLeft !== null ? `${Math.abs(daysLeft)}d ago` : ''}
                              </span>
                            )}
                            {tier === 'critical' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Expires in {daysLeft}d (Critical)
                              </span>
                            )}
                            {tier === 'approaching' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                <Clock className="w-2.5 h-2.5" />
                                Approaching ({daysLeft}d left)
                              </span>
                            )}
                            {tier === 'valid' && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-medium">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editDraft.quantity}
                            onChange={e =>
                              setEditDraft({
                                ...editDraft,
                                quantity: Number(e.target.value)
                              })
                            }
                            className="w-24 px-2 py-1 rounded border border-slate-300 text-xs font-mono text-right"
                          />
                        ) : isZero ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                            0 (Out)
                          </span>
                        ) : (
                          <span className="font-mono tabular-nums font-bold text-slate-900">
                            {formatQuantity(item.quantity)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-xs text-slate-700 min-w-[130px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.remark}
                            onChange={e =>
                              setEditDraft({ ...editDraft, remark: e.target.value })
                            }
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                          />
                        ) : item.remark ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${
                              item.remark.toLowerCase().includes('fast')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.remark.toLowerCase().includes('fefo')
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : item.remark.toLowerCase().includes('slow') ||
                                  item.remark.toLowerCase().includes('no moving')
                                ? 'bg-slate-100 text-slate-700'
                                : item.remark.toLowerCase().includes('replenish')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {item.remark}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {item.createdAt ? formatDate(item.createdAt, dateFormat) : '—'}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {!isSmt && isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                              title="Save changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft(null);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              title="Cancel editing"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : !isSmt && confirmDeleteId === item.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteBatch(item.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenBatchDrawer(item, 'history')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold transition-colors"
                              title="View batch movement & re-allocation history"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>History</span>
                              {(historyCountByBatchId.get(item.id) || 0) > 0 && (
                                <span className="font-mono text-[10px] font-bold px-1 rounded bg-purple-200 text-purple-900">
                                  {historyCountByBatchId.get(item.id)}
                                </span>
                              )}
                            </button>
                            {!isSmt && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit batch row"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete batch row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Stock Status CSV Import Modal (Inbound Logistics Only) */}
      {!isSmt && isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Import Regional Warehouse Weekly Stock Status CSV"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Import Weekly Regional Warehouse Stock CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Matches attached DKT regional CSV schema (`region, warehouse_manager, technical_manager, product_description, ...`)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                aria-label="Close weekly CSV import dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Warehouse (if `region` column omitted)
                  </label>
                  <select
                    value={importFallbackCode}
                    onChange={e => setImportFallbackCode(e.target.value as WarehouseCode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
                  >
                    {EIGHT_REGIONAL_WAREHOUSES.map(w => (
                      <option key={w.code} value={w.code}>
                        {w.regionLabel} — {w.zone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Weekly Snapshot Date Override
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSelectedWeekDate}
                      onChange={e => setUseSelectedWeekDate(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span>
                      Tag imported rows with <strong>{weeklyReportDate}</strong>
                    </span>
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importReplaceMode}
                  onChange={e => setImportReplaceMode(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span>
                  Replace existing stock rows for detected warehouse(s) (Recommended for weekly stock snapshots)
                </span>
              </label>

              {/* Upload Trigger Zone */}
              <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 text-center space-y-2.5">
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleModalFileSelected}
                  className="hidden"
                />
                <div className="text-sm font-bold text-slate-800">
                  {importFileName
                    ? `Loaded file: ${importFileName}`
                    : 'Select a Weekly Warehouse Stock CSV file'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Supports `M/D/YYYY` and `MMM-YY` expiry dates, blank continuation `No.` rows, and `M/D/YYYY H:mm` timestamps.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose CSV File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWeeklyTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Download Template</span>
                  </button>
                </div>
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
                  {importError}
                </div>
              )}

              {importPreviewItems && importPreviewStats && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-emerald-900 text-sm">
                      Ready to Import {importPreviewItems.length} Batch Row(s)
                    </span>
                    <span className="font-mono font-bold text-emerald-800">
                      {formatQuantity(importPreviewStats.totalUnits)} Total Units
                    </span>
                  </div>
                  <div className="text-slate-700">
                    Detected warehouse(s):{' '}
                    <strong className="font-mono">
                      {importPreviewStats.regions.join(', ')}
                    </strong>
                  </div>
                  {importPreviewStats.flaggedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {importPreviewStats.flaggedCount} batch(es) in this CSV are expired or
                        approaching expiry (&le;{warningDays}d) and will be highlighted automatically.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importPreviewItems || importPreviewItems.length === 0}
                onClick={handleConfirmWeeklyImport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white transition-colors"
              >
                Confirm Weekly Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Movement History & Re-allocation Slide-Over Drawer */}
      {activeDrawerBatch && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Batch History and Movement Details"
        >
          <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50/70 via-white to-red-50/40 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                    {activeDrawerBatch.region}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-xs font-bold">
                    Batch: {activeDrawerBatch.batchNumber || '—'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1.5 truncate">
                  {activeDrawerBatch.productDescription}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  On Hand:{' '}
                  <strong className="font-mono text-slate-900">
                    {formatQuantity(activeDrawerBatch.quantity)} {activeDrawerBatch.unit}
                  </strong>{' '}
                  · Expiry:{' '}
                  <strong className="font-mono text-slate-900">
                    {activeDrawerBatch.expiryDate
                      ? formatDate(activeDrawerBatch.expiryDate, dateFormat)
                      : 'N/A'}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryBatchId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                aria-label="Close batch history drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tabs: History vs Overview / Re-allocate */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerTab('history')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  drawerTab === 'history'
                    ? 'bg-white text-purple-800 border border-purple-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({activeBatchHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('reallocate')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  drawerTab === 'reallocate'
                    ? 'bg-white text-red-700 border border-red-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isSmt ? 'Batch Details' : 'Movement & Re-allocate'}</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {drawerTab === 'history' ? (
                activeBatchHistory.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/60 space-y-2">
                    <History className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-sm font-bold text-slate-700">
                      No Recorded History Events Yet
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Future status movements, regional hub re-allocations, and quantity updates on this batch will appear here chronologically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeBatchHistory.map(entry => {
                      const badgeStyles =
                        entry.action === 'REALLOCATED'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : entry.action === 'STATUS_MOVEMENT'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : entry.action === 'CREATED' || entry.action === 'IMPORTED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : entry.action === 'DELETED'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200';

                      return (
                        <div
                          key={entry.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeStyles}`}
                            >
                              {entry.action.replace('_', ' ')}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-slate-800 leading-relaxed">
                            {entry.note}
                          </p>

                          {(entry.previousValue || entry.newValue) && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-mono flex flex-wrap items-center gap-1.5">
                              {entry.fieldChanged && (
                                <span className="font-bold text-slate-600">
                                  {entry.fieldChanged}:
                                </span>
                              )}
                              {entry.previousValue && (
                                <span className="text-slate-500 line-through">
                                  {entry.previousValue}
                                </span>
                              )}
                              {entry.previousValue && entry.newValue && (
                                <span className="text-slate-400">&rarr;</span>
                              )}
                              {entry.newValue && (
                                <span className="text-slate-900 font-bold">{entry.newValue}</span>
                              )}
                            </div>
                          )}

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <strong className="text-slate-700">{entry.changedByName}</strong> (
                              {entry.changedByRoleLabel})
                            </span>
                            <span className="font-mono">{entry.region}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-5 text-xs">
                  {/* Metadata Snapshot */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block">Warehouse Manager</span>
                      <strong className="text-slate-900">{activeDrawerBatch.warehouseManager}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Technical Manager</span>
                      <strong className="text-slate-900">{activeDrawerBatch.technicalManager}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Manufacturer</span>
                      <strong className="text-slate-900">{activeDrawerBatch.manufacturer}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Current Status / Remark</span>
                      <strong className="text-slate-900">{activeDrawerBatch.remark || '—'}</strong>
                    </div>
                  </div>

                  {!isSmt && (
                    <>
                      {/* Movement Status Remark Form */}
                      <form
                        onSubmit={handleApplyMovementStatusUpdate}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                      >
                        <h4 className="text-sm font-bold text-slate-900">
                          Update Movement / Condition Status
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={statusMovementRemark}
                            onChange={e => setStatusMovementRemark(e.target.value)}
                            placeholder="e.g. Fast moving, FEFO Priority, Quarantine..."
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors shrink-0"
                          >
                            Log Status Update
                          </button>
                        </div>
                      </form>

                      {/* Re-allocate Between Regional Warehouses Form */}
                      <form
                        onSubmit={handleConfirmReallocation}
                        className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Re-allocate Stock to Another Regional Warehouse
                          </h4>
                        </div>
                        <p className="text-slate-600">
                          Transfer full or partial quantity from{' '}
                          <strong>{activeDrawerBatch.region}</strong> to any of the 8 DKT Ethiopia regional hubs and automatically log an audit trail.
                        </p>

                        {activeDrawerBatch.quantity <= 0 ? (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                            This batch currently has 0 units available to re-allocate.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                  Destination Warehouse
                                </label>
                                <select
                                  value={reallocateTargetCode}
                                  onChange={e =>
                                    setReallocateTargetCode(e.target.value as WarehouseCode)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                                >
                                  {EIGHT_REGIONAL_WAREHOUSES.filter(
                                    w => w.code !== activeDrawerBatch.warehouseCode
                                  ).map(w => (
                                    <option key={w.code} value={w.code}>
                                      {w.regionLabel} — {w.zone}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                  Quantity to Re-allocate (Max: {formatQuantity(activeDrawerBatch.quantity)})
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={activeDrawerBatch.quantity}
                                  required
                                  value={reallocateQuantity}
                                  onChange={e => setReallocateQuantity(Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-700 mb-1">
                                Re-allocation / Dispatch Note
                              </label>
                              <input
                                type="text"
                                value={reallocateRemark}
                                onChange={e => setReallocateRemark(e.target.value)}
                                placeholder="e.g. Emergency regional stock balancing or FEFO dispatch"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                              <span>Confirm Stock Re-allocation</span>
                            </button>
                          </div>
                        )}
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { InboundShipment, ProductCategory } from '../types/shipment';
import { HubStockItem } from '../types/stock';
import { formatQuantity } from '../utils/csvParser';
import { calculateMonthsOfStock, getStockRiskLevel } from '../utils/stockData';
import { Search, Warehouse, AlertTriangle, CheckCircle2, Edit3, Save, X, Plus } from 'lucide-react';

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Condoms & Lubricants',
  'Emergency & Oral Contraceptives',
  'Clinical & Safety Kits',
  'Family Planning & Wellness'
];

interface NationalStockViewProps {
  stockItems: HubStockItem[];
  shipments: InboundShipment[];
  onUpdateStockItem?: (updated: HubStockItem) => void;
  onAddStockItem?: (newItem: HubStockItem) => void;
  isSmt: boolean;
}

export const NationalStockView: React.FC<NationalStockViewProps> = ({
  stockItems,
  shipments,
  onUpdateStockItem,
  onAddStockItem,
  isSmt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editStockOnHand, setEditStockOnHand] = useState<number>(0);
  const [editMonthlyConsumption, setEditMonthlyConsumption] = useState<number>(0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHubName, setNewHubName] = useState('Central Warehouse (Kality)');
  const [newRegion, setNewRegion] = useState('Addis Ababa(HQ00)');
  const [newProduct, setNewProduct] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Condoms & Lubricants');
  const [newStockOnHand, setNewStockOnHand] = useState<number>(0);
  const [newMonthlyConsumption, setNewMonthlyConsumption] = useState<number>(1000);
  const [newSafetyStockLevel, setNewSafetyStockLevel] = useState<number>(1500);

  const regions = useMemo(() => {
    return Array.from(new Set(stockItems.map(i => i.region)));
  }, [stockItems]);

  // Compute incoming inbound pipeline units per product (not yet delivered)
  const inboundByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    shipments.forEach(s => {
      if (s.status !== 'Delivered to Central Warehouse') {
        const key = s.product.trim().toLowerCase();
        map[key] = (map[key] || 0) + (s.prQuantity || 0);
      }
    });
    return map;
  }, [shipments]);

  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          item.product.toLowerCase().includes(q) ||
          item.hubName.toLowerCase().includes(q) ||
          item.region.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (regionFilter !== 'ALL' && item.region !== regionFilter) return false;
      if (riskFilter !== 'ALL' && getStockRiskLevel(item) !== riskFilter) return false;
      return true;
    });
  }, [stockItems, searchTerm, regionFilter, riskFilter]);

  const totalStockOnHand = stockItems.reduce((sum, i) => sum + i.stockOnHand, 0);
  const criticalCount = stockItems.filter(i => getStockRiskLevel(i) === 'Critical').length;
  const lowSafetyCount = stockItems.filter(i => getStockRiskLevel(i) === 'Low Safety Stock').length;

  const startEdit = (item: HubStockItem) => {
    if (isSmt) return;
    setEditingItemId(item.id);
    setEditStockOnHand(item.stockOnHand);
    setEditMonthlyConsumption(item.monthlyConsumption);
  };

  const saveEdit = (item: HubStockItem) => {
    if (isSmt || !onUpdateStockItem) return;
    onUpdateStockItem({
      ...item,
      stockOnHand: Math.max(0, Number(editStockOnHand) || 0),
      monthlyConsumption: Math.max(1, Number(editMonthlyConsumption) || 1),
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    setEditingItemId(null);
  };

  const handleCreateStockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSmt || !onAddStockItem || !newProduct.trim()) return;
    const item: HubStockItem = {
      id: `hub-stock-${Date.now()}`,
      hubName: newHubName.trim() || 'Central Warehouse (Kality)',
      region: newRegion.trim() || 'Addis Ababa(HQ00)',
      product: newProduct.trim(),
      category: newCategory,
      stockOnHand: Math.max(0, Number(newStockOnHand) || 0),
      monthlyConsumption: Math.max(1, Number(newMonthlyConsumption) || 1),
      safetyStockLevel: Math.max(0, Number(newSafetyStockLevel) || 0),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    onAddStockItem(item);
    setNewProduct('');
    setNewStockOnHand(0);
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">National Stock on Hand</span>
            <Warehouse className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatQuantity(totalStockOnHand)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Central Kality &amp; Regional Hubs ({stockItems.length} stock lines)
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Safety-Stock Risk Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-600">
            {criticalCount + lowSafetyCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {criticalCount} Critical · {lowSafetyCount} Below Safety Threshold
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Incoming Inbound Pipeline</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {formatQuantity(
              shipments
                .filter(s => s.status !== 'Delivered to Central Warehouse')
                .reduce((sum, s) => sum + (s.prQuantity || 0), 0)
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Active replenishment en route to Addis Ababa
          </div>
        </div>
      </div>

      {/* Add Hub Stock Form */}
      {!isSmt && isAddOpen && (
        <form
          onSubmit={handleCreateStockItem}
          className="p-5 bg-white rounded-xl border border-red-200 shadow-xs space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Add National / Regional Hub Stock Record
            </h3>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              aria-label="Close add stock form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hub Name *</label>
              <input
                type="text"
                required
                value={newHubName}
                onChange={e => setNewHubName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Region *</label>
              <input
                type="text"
                required
                value={newRegion}
                onChange={e => setNewRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Commodity *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hiwot Trust Condom"
                value={newProduct}
                onChange={e => setNewProduct(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
              >
                {PRODUCT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock on Hand *</label>
              <input
                type="number"
                min={0}
                required
                value={newStockOnHand}
                onChange={e => setNewStockOnHand(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Monthly Burn *</label>
              <input
                type="number"
                min={1}
                required
                value={newMonthlyConsumption}
                onChange={e => setNewMonthlyConsumption(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Safety Stock Level</label>
              <input
                type="number"
                min={0}
                value={newSafetyStockLevel}
                onChange={e => setNewSafetyStockLevel(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Save Hub Stock Line
            </button>
          </div>
        </form>
      )}

      {/* Hub Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search hub, region, or commodity..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Regions &amp; Hubs</option>
              {regions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="Critical">Critical (&lt; 1.2 MOS)</option>
              <option value="Low Safety Stock">Low Safety Stock</option>
              <option value="Watch">Watch</option>
              <option value="Optimal">Optimal</option>
            </select>

            {!isSmt && onAddStockItem && (
              <button
                type="button"
                onClick={() => setIsAddOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock Line</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-3 font-semibold">Hub &amp; Region</th>
                <th className="py-3 px-3 font-semibold">Commodity</th>
                <th className="py-3 px-3 font-semibold text-right">Stock on Hand</th>
                <th className="py-3 px-3 font-semibold text-right">Monthly Burn</th>
                <th className="py-3 px-3 font-semibold text-right">Safety Stock</th>
                <th className="py-3 px-3 font-semibold text-right">Inbound Pipeline</th>
                <th className="py-3 px-3 font-semibold text-right">Coverage (MOS)</th>
                <th className="py-3 px-3 font-semibold">Risk Status</th>
                {!isSmt && <th className="py-3 px-3 font-semibold text-right">Edit</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isSmt ? 8 : 9} className="py-10 px-4 text-center text-sm text-slate-500">
                    {stockItems.length === 0
                      ? 'No hub stock lines entered yet. Click "Add Stock Line" above to record production inventory.'
                      : 'No hub stock records match the current search or filters.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const mos = calculateMonthsOfStock(item);
                  const risk = getStockRiskLevel(item);
                  const inboundQty = inboundByProduct[item.product.trim().toLowerCase()] || 0;
                  const isEditing = editingItemId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{item.hubName}</div>
                        <div className="text-[11px] text-slate-500">{item.region}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{item.product}</div>
                        <div className="text-[11px] text-slate-500">{item.category}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editStockOnHand}
                            onChange={e => setEditStockOnHand(Number(e.target.value))}
                            className="w-28 bg-white border border-red-400 rounded px-2 py-1 text-right text-xs font-mono"
                          />
                        ) : (
                          formatQuantity(item.stockOnHand)
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editMonthlyConsumption}
                            onChange={e => setEditMonthlyConsumption(Number(e.target.value))}
                            className="w-24 bg-white border border-red-400 rounded px-2 py-1 text-right text-xs font-mono"
                          />
                        ) : (
                          formatQuantity(item.monthlyConsumption)
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatQuantity(item.safetyStockLevel)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-700 font-semibold">
                        {inboundQty > 0 ? `+${formatQuantity(inboundQty)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {mos} mo
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            risk === 'Critical'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : risk === 'Low Safety Stock'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : risk === 'Watch'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {risk}
                        </span>
                      </td>
                      {!isSmt && (
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => saveEdit(item)}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Save stock count"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                              title="Update hub stock count"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
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

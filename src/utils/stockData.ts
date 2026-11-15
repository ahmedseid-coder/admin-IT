import { HubStockItem, StockRiskLevel } from '../types/stock';

export const INITIAL_HUB_STOCK: HubStockItem[] = [];

export const STOCK_STORAGE_KEY = 'dkt_ethiopia_prod_hub_stock_v1';

export function loadSavedHubStock(): HubStockItem[] {
  try {
    const raw = localStorage.getItem(STOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return [];
}

export function saveHubStock(items: HubStockItem[]): void {
  try {
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write errors
  }
}

export function calculateMonthsOfStock(item: HubStockItem): number {
  if (!item.monthlyConsumption || item.monthlyConsumption <= 0) return 0;
  return Number((item.stockOnHand / item.monthlyConsumption).toFixed(1));
}

export function getStockRiskLevel(item: HubStockItem): StockRiskLevel {
  const mos = calculateMonthsOfStock(item);
  if (mos < 1.2) return 'Critical';
  if (item.stockOnHand < item.safetyStockLevel || mos < 2.0) return 'Low Safety Stock';
  if (mos < 3.0) return 'Watch';
  return 'Optimal';
}

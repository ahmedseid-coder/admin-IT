import { ProductCategory } from './shipment';

export type StockRiskLevel = 'Optimal' | 'Watch' | 'Low Safety Stock' | 'Critical';

export interface HubStockItem {
  id: string;
  hubName: string;
  region: string;
  product: string;
  category: ProductCategory;
  stockOnHand: number;
  monthlyConsumption: number;
  safetyStockLevel: number;
  lastUpdated: string;
}

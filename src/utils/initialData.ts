import { InboundShipment } from '../types/shipment';

export const INITIAL_DKT_SHIPMENTS: InboundShipment[] = [];

export const STORAGE_KEY = 'dkt_ethiopia_prod_shipments_v1';

export function loadSavedShipments(): InboundShipment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load shipments from localStorage:', err);
  }
  return [];
}

export function saveShipments(shipments: InboundShipment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
  } catch (err) {
    console.error('Failed to save shipments to localStorage:', err);
  }
}

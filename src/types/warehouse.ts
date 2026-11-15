export type WarehouseCode =
  | 'HQ00'
  | 'AO01'
  | 'AO02'
  | 'AO03'
  | 'AO04'
  | 'AO05'
  | 'AO06'
  | 'AO07';

export interface WarehouseMetadata {
  code: WarehouseCode;
  name: string;
  regionLabel: string; // e.g. "Dessie(AO04)"
  zone: string;
  defaultWarehouseManager: string;
  defaultTechnicalManager: string;
}

export interface WarehouseBatchItem {
  id: string;
  itemNo?: string; // e.g. "1", "2", ... from CSV No. column
  warehouseCode: WarehouseCode;
  region: string; // e.g. "Dessie(AO04)"
  warehouseManager: string;
  technicalManager: string;
  productDescription: string;
  unit: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string; // ISO YYYY-MM-DD or raw string
  quantity: number;
  remark: string;
  createdAt: string; // ISO YYYY-MM-DD or timestamp
}

export type WarehouseBatchHistoryAction =
  | 'CREATED'
  | 'UPDATED'
  | 'REALLOCATED'
  | 'STATUS_MOVEMENT'
  | 'IMPORTED'
  | 'DELETED';

export interface WarehouseBatchHistoryEntry {
  id: string;
  batchId: string;
  batchNumber: string;
  productDescription: string;
  warehouseCode: WarehouseCode;
  region: string;
  action: WarehouseBatchHistoryAction;
  timestamp: string;
  changedByName: string;
  changedByUsername: string;
  changedByRoleLabel: string;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  note: string;
}

export const EIGHT_REGIONAL_WAREHOUSES: WarehouseMetadata[] = [
  {
    code: 'HQ00',
    name: 'Addis Ababa Central',
    regionLabel: 'Addis Ababa(HQ00)',
    zone: 'Central Hub (Kality)',
    defaultWarehouseManager: 'Dawit Bekele',
    defaultTechnicalManager: 'Hanna Tesfaye'
  },
  {
    code: 'AO01',
    name: 'Adama',
    regionLabel: 'Adama(AO01)',
    zone: 'Oromia Central Corridor',
    defaultWarehouseManager: 'Tadesse Gemechu',
    defaultTechnicalManager: 'Bontu Alemu'
  },
  {
    code: 'AO02',
    name: 'Hawassa',
    regionLabel: 'Hawassa(AO02)',
    zone: 'Sidama & Southern Region',
    defaultWarehouseManager: 'Bereket Abebe',
    defaultTechnicalManager: 'Selamawit Desta'
  },
  {
    code: 'AO03',
    name: 'Dire Dawa',
    regionLabel: 'Dire Dawa(AO03)',
    zone: 'Eastern Corridor',
    defaultWarehouseManager: 'Fikru Kebede',
    defaultTechnicalManager: 'Nadia Yusuf'
  },
  {
    code: 'AO04',
    name: 'Dessie',
    regionLabel: 'Dessie(AO04)',
    zone: 'North-East Amhara',
    defaultWarehouseManager: 'Meaza Walelign',
    defaultTechnicalManager: 'Eliase Gerima'
  },
  {
    code: 'AO05',
    name: 'Jimma',
    regionLabel: 'Jimma(AO05)',
    zone: 'South-West Oromia',
    defaultWarehouseManager: 'Chala Tolosa',
    defaultTechnicalManager: 'Meron Girma'
  },
  {
    code: 'AO06',
    name: 'Bahidar',
    regionLabel: 'Bahidar(AO06)',
    zone: 'North-West Amhara',
    defaultWarehouseManager: 'Yohannes Mekonnen',
    defaultTechnicalManager: 'Tigist Tsegaye'
  },
  {
    code: 'AO07',
    name: 'Mekele',
    regionLabel: 'Mekele(AO07)',
    zone: 'Tigray Northern Hub',
    defaultWarehouseManager: 'Hagos Berhe',
    defaultTechnicalManager: 'Alem Gebre'
  }
];

import { InboundShipment } from './shipment';

export type ShipmentRouteId =
  | 'mumbai-djibouti'
  | 'mundra-djibouti'
  | 'djibouti-customs'
  | 'galafi-addis'
  | 'regional-distribution';

export interface ShipmentRouteDefinition {
  id: ShipmentRouteId;
  name: string;
  corridorCode: string;
  origin: string;
  destination: string;
  description: string;
}

export const DKT_SHIPMENT_ROUTES: ShipmentRouteDefinition[] = [
  {
    id: 'mumbai-djibouti',
    name: 'Nhava Sheva (Mumbai) -> Doraleh Port',
    corridorCode: 'SEA-IN-BOM',
    origin: 'Nhava Sheva / Mumbai, India',
    destination: 'Doraleh Port, Djibouti',
    description: 'Primary Indian ocean freight corridor for condoms & clinical kits (~12-14d sea).'
  },
  {
    id: 'mundra-djibouti',
    name: 'Mundra / Gujarat -> Doraleh Port',
    corridorCode: 'SEA-IN-MUN',
    origin: 'Mundra Port / Gujarat, India',
    destination: 'Doraleh Port, Djibouti',
    description: 'Western India pharmaceutical sea corridor for oral & emergency contraceptives.'
  },
  {
    id: 'djibouti-customs',
    name: 'Doraleh Port Customs & ESLSE Clearance',
    corridorCode: 'PORT-DJ-DCT',
    origin: 'Doraleh Container Terminal',
    destination: 'ESLSE Customs Bonded Yard',
    description: 'Port terminal dwell, commercial invoice verification & Ethiopian customs bond release.'
  },
  {
    id: 'galafi-addis',
    name: 'Djibouti -> Galafi -> Addis Ababa Overland',
    corridorCode: 'LAND-ET-GAL',
    origin: 'Port of Djibouti',
    destination: 'DKT Central Warehouse (Kality)',
    description: '910 km multimodal truck convoy via Galafi border post, Awash & Mojo dry port.'
  },
  {
    id: 'regional-distribution',
    name: 'Central Kality -> 8 Regional Warehouses',
    corridorCode: 'DIST-ET-REG',
    origin: 'Addis Ababa Central (HQ00)',
    destination: 'Adama, Hawassa, Dire Dawa, Dessie, Jimma, Bahidar, Mekele',
    description: 'National stock allocation & warehouse receiving milestones across 8 hubs.'
  }
];

export type EmailDigestCadence = 'immediate' | 'daily' | 'weekly';

export interface RouteSubscriptionPreference {
  routeId: ShipmentRouteId;
  enabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface SmtAlertSettings {
  warningLeadTimeDays: number;
  criticalLeadTimeDays: number;
  customsClearanceMaxDays: number;
  seaTransitMaxDays: number;
  alertOnDelayedStatus: boolean;
  alertOnMissingDocuments: boolean;
  emailEnabled: boolean;
  emailAddress: string;
  emailCadence: EmailDigestCadence;
  pushEnabled: boolean;
  routes: Record<ShipmentRouteId, RouteSubscriptionPreference>;
  updatedAt: string;
}

export function getShipmentRouteIds(shipment: InboundShipment): ShipmentRouteId[] {
  const routes: ShipmentRouteId[] = [];
  const originLower = (shipment.portOfOrigin || '').toLowerCase();
  const inlandLower = (shipment.djiboutiToAddisDuration || '').toLowerCase();

  if (originLower.includes('mundra') || originLower.includes('gujarat')) {
    routes.push('mundra-djibouti');
  } else {
    routes.push('mumbai-djibouti');
  }

  if (
    shipment.status === 'Customs Clearance Djibouti' ||
    shipment.status === 'On Hold / Documentation Pending' ||
    shipment.status === 'Delayed' ||
    (shipment.djiboutiClearanceDuration || '').trim().length > 0
  ) {
    routes.push('djibouti-customs');
  }

  if (
    shipment.status === 'Inland Transit (Djibouti to Addis)' ||
    shipment.status === 'Delivered to Central Warehouse' ||
    inlandLower.includes('galafi') ||
    inlandLower.includes('overland') ||
    inlandLower.includes('trucking') ||
    inlandLower.includes('convoy')
  ) {
    routes.push('galafi-addis');
  }

  if (shipment.status === 'Delivered to Central Warehouse') {
    routes.push('regional-distribution');
  }

  return Array.from(new Set(routes));
}

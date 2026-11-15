/**
 * DKT Ethiopia Inbound Shipment Order Tracking Types
 */

export type ShipmentStatus =
  | 'Requisition & PO'
  | 'In Production / Awaiting Dispatch'
  | 'Shipped' // In ocean transit (India -> Djibouti)
  | 'Customs Clearance Djibouti'
  | 'Inland Transit (Djibouti to Addis)'
  | 'Delivered to Central Warehouse'
  | 'On Hold / Documentation Pending'
  | 'Delayed';

export type IncotermType =
  | 'CIP Addis Ababa'
  | 'CIF Addis Ababa'
  | 'CIF Djibouti'
  | 'FOB Mumbai / Nhava Sheva'
  | 'EXW Origin';

export type ProductCategory =
  | 'Condoms & Lubricants'
  | 'Emergency & Oral Contraceptives'
  | 'Clinical & Safety Kits'
  | 'Family Planning & Wellness';

export interface InboundShipment {
  id: string;
  rowNo: number;
  product: string;
  category: ProductCategory;
  
  // Purchase Requisition Detail
  prNumber: string;
  prDate: string;
  prQuantity: number;
  
  // Purchase Order Detail
  poNumber: string;
  poDate: string;
  
  // Proforma Invoice (PI) Detail
  piNumber: string;
  piDate: string;
  piQuantity: number;
  incoterms: IncotermType | string;
  expectedDispatchDate: string;
  
  // Commercial Invoice Detail
  commercialInvoiceNumber: string;
  commercialInvoiceQuantity: number;
  
  // Milestone Dates & Corridor Tracking
  mblReleaseDate: string; // Master Bill of Lading Release
  expectedDjiboutiDate: string; // Expected reach Djibouti
  actualDjiboutiDate: string; // Reached Djibouti
  indiaToDjiboutiDuration: string; // e.g. "14 days", "In Ocean Transit"
  djiboutiReleaseDate: string; // Released from Djibouti port
  djiboutiClearanceDuration: string; // e.g. "4 days"
  centralStockReachDate: string; // Central Stock DKT Head Office Date
  djiboutiToAddisDuration: string; // e.g. "3 days"
  warehouseArrivalDate: string; // Arrival at Warehouse
  totalLeadTimeDays: string; // Total Lead Time from PO to Warehouse in Days
  
  // Status, Logistics info & Notes
  status: ShipmentStatus;
  carrierOrVessel?: string;
  containerNumber?: string;
  blNumber?: string; // Bill of Lading #
  portOfOrigin: string; // e.g. Nhava Sheva (Mumbai), India
  portOfDischarge: string; // Port of Djibouti (Doraleh)
  finalDestination: string; // DKT Ethiopia Central Stock / Head Office, Addis Ababa
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyChainKPIs {
  totalShipments: number;
  totalUnitsInbound: number;
  inProductionCount: number;
  oceanTransitCount: number;
  djiboutiCustomsCount: number;
  inlandCorridorCount: number;
  deliveredCount: number;
  pendingCiCount: number;
  averageClearanceDays: number;
  averageLeadTimeDays: number;
}

import { InboundShipment } from '../types/shipment';

export type PendingAlertCategory = 'customs' | 'documents';

export interface PendingActionAlert {
  id: string;
  category: PendingAlertCategory;
  title: string;
  detail: string;
  severity: 'high' | 'medium';
  shipment: InboundShipment;
}

export interface SidebarNotificationsSummary {
  totalCount: number;
  customsPendingCount: number;
  expiringDocsCount: number;
  alerts: PendingActionAlert[];
}

export function computeSidebarNotifications(
  shipments: InboundShipment[]
): SidebarNotificationsSummary {
  const alerts: PendingActionAlert[] = [];
  let customsPendingCount = 0;
  let expiringDocsCount = 0;

  for (const s of shipments) {
    // 1. Customs Clearance Pending
    if (
      s.status === 'Customs Clearance Djibouti' ||
      s.status === 'On Hold / Documentation Pending'
    ) {
      customsPendingCount += 1;
      alerts.push({
        id: `customs-${s.id}`,
        category: 'customs',
        title: 'Customs Clearance Pending',
        detail: `#${s.rowNo} ${s.product} · ${s.djiboutiClearanceDuration || 'Doraleh Port'}`,
        severity: 'high',
        shipment: s
      });
    }

    // 2. Expiring or Missing Trade Documents (CI, B/L, or aged PI permit window)
    const ciMissing =
      !s.commercialInvoiceNumber ||
      s.commercialInvoiceNumber === 'Not Generated Yet' ||
      s.commercialInvoiceNumber === 'Pending';

    const blMissing =
      s.blNumber === 'Pending' ||
      (!s.blNumber && s.status !== 'Delivered to Central Warehouse');

    const piAgeDays = s.piDate
      ? Math.floor(
          (new Date('2026-11-15T00:00:00Z').getTime() - new Date(s.piDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;
    const isPermitExpiring =
      piAgeDays > 180 && s.status !== 'Delivered to Central Warehouse';

    if (ciMissing || blMissing || isPermitExpiring) {
      expiringDocsCount += 1;
      const reason = isPermitExpiring
        ? 'PI / Import Permit expiring'
        : ciMissing
        ? `CI ${s.commercialInvoiceNumber || 'Pending'}`
        : 'Bill of Lading pending';

      alerts.push({
        id: `docs-${s.id}`,
        category: 'documents',
        title: isPermitExpiring ? 'Expiring Documents' : 'Expiring / Pending Docs',
        detail: `#${s.rowNo} ${s.product} · ${reason}`,
        severity: isPermitExpiring || ciMissing ? 'high' : 'medium',
        shipment: s
      });
    }
  }

  return {
    totalCount: customsPendingCount + expiringDocsCount,
    customsPendingCount,
    expiringDocsCount,
    alerts
  };
}

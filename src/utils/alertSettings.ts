import { InboundShipment } from '../types/shipment';
import {
  DKT_SHIPMENT_ROUTES,
  RouteSubscriptionPreference,
  ShipmentRouteId,
  SmtAlertSettings,
  getShipmentRouteIds
} from '../types/alertSettings';

export const ALERT_SETTINGS_STORAGE_PREFIX = 'dkt_ethiopia_smt_alert_settings_v1_';

export function getAlertSettingsStorageKey(username: string): string {
  return `${ALERT_SETTINGS_STORAGE_PREFIX}${username.trim().toLowerCase() || 'default'}`;
}

export function createDefaultAlertSettings(email = ''): SmtAlertSettings {
  const routes = DKT_SHIPMENT_ROUTES.reduce((acc, route) => {
    acc[route.id] = {
      routeId: route.id,
      enabled: true,
      emailEnabled: true,
      pushEnabled: true
    };
    return acc;
  }, {} as Record<ShipmentRouteId, RouteSubscriptionPreference>);

  return {
    warningLeadTimeDays: 24,
    criticalLeadTimeDays: 28,
    customsClearanceMaxDays: 4,
    seaTransitMaxDays: 14,
    alertOnDelayedStatus: true,
    alertOnMissingDocuments: true,
    emailEnabled: Boolean(email),
    emailAddress: email,
    emailCadence: 'immediate',
    pushEnabled: false,
    routes,
    updatedAt: new Date().toISOString()
  };
}

export function loadSavedAlertSettings(username: string, fallbackEmail = ''): SmtAlertSettings {
  const defaults = createDefaultAlertSettings(fallbackEmail);
  try {
    const raw = localStorage.getItem(getAlertSettingsStorageKey(username));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SmtAlertSettings>;
    return {
      ...defaults,
      ...parsed,
      emailAddress: parsed.emailAddress ?? fallbackEmail,
      routes: {
        ...defaults.routes,
        ...(parsed.routes || {})
      }
    };
  } catch {
    return defaults;
  }
}

export function saveAlertSettings(username: string, settings: SmtAlertSettings): void {
  try {
    localStorage.setItem(getAlertSettingsStorageKey(username), JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save SMT alert settings:', err);
  }
}

export function parseNumericDays(text?: string): number {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export interface EvaluatedLeadTimeAlert {
  shipment: InboundShipment;
  matchedRoutes: ShipmentRouteId[];
  severity: 'critical' | 'warning';
  reasons: string[];
  leadTimeDays: number;
  customsDays: number;
  seaDays: number;
}

export function evaluateLeadTimeAlerts(
  shipments: InboundShipment[],
  settings: SmtAlertSettings
): EvaluatedLeadTimeAlert[] {
  const alerts: EvaluatedLeadTimeAlert[] = [];

  for (const s of shipments) {
    const shipmentRoutes = getShipmentRouteIds(s);
    const subscribedMatchedRoutes = shipmentRoutes.filter(
      routeId => settings.routes[routeId]?.enabled
    );

    // Only alert if at least one of the shipment's routes is subscribed
    if (subscribedMatchedRoutes.length === 0) continue;

    const leadTimeDays = parseNumericDays(s.totalLeadTimeDays);
    const customsDays = parseNumericDays(s.djiboutiClearanceDuration);
    const seaDays = parseNumericDays(s.indiaToDjiboutiDuration);
    const isDelayed = String(s.status || '').toLowerCase().includes('delayed');
    const ciMissing =
      !s.commercialInvoiceNumber ||
      s.commercialInvoiceNumber === 'Not Generated Yet' ||
      s.commercialInvoiceNumber === 'Pending';

    const reasons: string[] = [];
    let severity: 'critical' | 'warning' = 'warning';

    if (leadTimeDays >= settings.criticalLeadTimeDays) {
      severity = 'critical';
      reasons.push(`Total lead time ${leadTimeDays}d >= ${settings.criticalLeadTimeDays}d critical limit`);
    } else if (leadTimeDays >= settings.warningLeadTimeDays) {
      reasons.push(`Total lead time ${leadTimeDays}d >= ${settings.warningLeadTimeDays}d warning limit`);
    }

    if (customsDays > settings.customsClearanceMaxDays) {
      severity = 'critical';
      reasons.push(`Djibouti clearance ${customsDays}d > ${settings.customsClearanceMaxDays}d max`);
    }

    if (seaDays > settings.seaTransitMaxDays) {
      reasons.push(`Sea transit ${seaDays}d > ${settings.seaTransitMaxDays}d max`);
    }

    if (settings.alertOnDelayedStatus && isDelayed) {
      severity = 'critical';
      reasons.push('Shipment flagged as Delayed');
    }

    if (settings.alertOnMissingDocuments && ciMissing && s.status !== 'Delivered to Central Warehouse') {
      reasons.push(`Commercial Invoice pending (${s.commercialInvoiceNumber || 'Missing'})`);
    }

    if (reasons.length > 0) {
      alerts.push({
        shipment: s,
        matchedRoutes: subscribedMatchedRoutes,
        severity,
        reasons,
        leadTimeDays,
        customsDays,
        seaDays
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.leadTimeDays - a.leadTimeDays;
  });
}

export type BrowserPushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getBrowserPushPermissionState(): BrowserPushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserPushPermission(): Promise<BrowserPushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return getBrowserPushPermissionState();
  }
}

export function triggerBrowserPushNotification(
  title: string,
  body: string
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }
  try {
    new Notification(title, {
      body,
      icon: '/assets/aistudio/Eniyew_Sig_406801b8.png',
      tag: 'dkt-ethiopia-leadtime-alert'
    });
    return true;
  } catch {
    return false;
  }
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Mail,
  Smartphone,
  SlidersHorizontal,
  Route,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Send,
  ShieldCheck,
  Eye,
  Clock,
  Ship,
  X,
  Copy,
  Check
} from 'lucide-react';
import { InboundShipment } from '../types/shipment';
import { User } from '../types/auth';
import {
  DKT_SHIPMENT_ROUTES,
  EmailDigestCadence,
  ShipmentRouteId,
  SmtAlertSettings,
  getShipmentRouteIds
} from '../types/alertSettings';
import {
  BrowserPushPermissionState,
  createDefaultAlertSettings,
  evaluateLeadTimeAlerts,
  getBrowserPushPermissionState,
  parseNumericDays,
  requestBrowserPushPermission,
  triggerBrowserPushNotification
} from '../utils/alertSettings';
import { formatQuantity } from '../utils/csvParser';

interface SmtSettingsViewProps {
  currentUser: User;
  shipments: InboundShipment[];
  settings: SmtAlertSettings;
  onSaveSettings: (updated: SmtAlertSettings) => void;
  onSelectShipment: (shipment: InboundShipment) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const SmtSettingsView: React.FC<SmtSettingsViewProps> = ({
  currentUser,
  shipments,
  settings,
  onSaveSettings,
  onSelectShipment,
  onNotify
}) => {
  const [draft, setDraft] = useState<SmtAlertSettings>(settings);
  const [pushPermission, setPushPermission] = useState<BrowserPushPermissionState>(() =>
    getBrowserPushPermissionState()
  );
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const isSmt = currentUser.role === 'SMT';

  const evaluatedAlerts = useMemo(
    () => evaluateLeadTimeAlerts(shipments, draft),
    [shipments, draft]
  );

  // Per-route live stats from current shipments
  const routeMetrics = useMemo(() => {
    return DKT_SHIPMENT_ROUTES.map(route => {
      const matched = shipments.filter(s => getShipmentRouteIds(s).includes(route.id));
      const maxLeadTime = matched.reduce((max, s) => {
        const d = parseNumericDays(s.totalLeadTimeDays);
        return d > max ? d : max;
      }, 0);
      const alertCount = evaluatedAlerts.filter(a => a.matchedRoutes.includes(route.id)).length;
      return {
        route,
        activeCount: matched.length,
        maxLeadTime,
        alertCount
      };
    });
  }, [shipments, evaluatedAlerts]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );

  const subscribedRoutesCount = useMemo(
    () => Object.values(draft.routes).filter(r => r.enabled).length,
    [draft.routes]
  );

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const normalized: SmtAlertSettings = {
      ...draft,
      warningLeadTimeDays: Math.min(draft.warningLeadTimeDays, draft.criticalLeadTimeDays),
      updatedAt: new Date().toISOString()
    };
    onSaveSettings(normalized);
    onNotify('Alert thresholds and route notification preferences saved.');
  };

  const handleResetDefaults = () => {
    const defaults = createDefaultAlertSettings(currentUser.email);
    setDraft(defaults);
    onSaveSettings(defaults);
    onNotify('Restored default DKT Ethiopia lead time thresholds & route subscriptions.');
  };

  const handleToggleRoute = (
    routeId: ShipmentRouteId,
    field: 'enabled' | 'emailEnabled' | 'pushEnabled'
  ) => {
    setDraft(prev => ({
      ...prev,
      routes: {
        ...prev.routes,
        [routeId]: {
          ...prev.routes[routeId],
          [field]: !prev.routes[routeId]?.[field]
        }
      }
    }));
  };

  const handleSetAllRoutes = (enabled: boolean) => {
    setDraft(prev => {
      const nextRoutes = { ...prev.routes };
      DKT_SHIPMENT_ROUTES.forEach(r => {
        nextRoutes[r.id] = {
          ...nextRoutes[r.id],
          enabled
        };
      });
      return { ...prev, routes: nextRoutes };
    });
  };

  const handleEnableBrowserPush = async () => {
    const perm = await requestBrowserPushPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      setDraft(prev => ({ ...prev, pushEnabled: true }));
      triggerBrowserPushNotification(
        'DKT Ethiopia Alerts Enabled',
        `Lead time alerts (>= ${draft.criticalLeadTimeDays}d critical) subscribed for ${subscribedRoutesCount} route(s).`
      );
      onNotify('Browser push notifications enabled.');
    } else if (perm === 'denied') {
      onNotify(
        'Browser notification permission was blocked by browser/iframe settings.',
        'error'
      );
    } else if (perm === 'unsupported') {
      onNotify('Browser Notifications API is unavailable in this environment.', 'error');
    }
  };

  const handleSendTestPush = () => {
    const topAlert = evaluatedAlerts[0];
    const title = topAlert
      ? `Lead Time Alert: ${topAlert.shipment.product} (${topAlert.leadTimeDays}d)`
      : 'DKT Ethiopia SMT Test Alert';
    const body = topAlert
      ? `PO ${topAlert.shipment.poNumber || '—'} · ${topAlert.reasons[0]}`
      : `Threshold active: Warning ${draft.warningLeadTimeDays}d / Critical ${draft.criticalLeadTimeDays}d across ${subscribedRoutesCount} route(s).`;

    const fired = triggerBrowserPushNotification(title, body);
    if (fired) {
      onNotify(`Browser push sent: "${title}"`);
    } else {
      onNotify(
        `Preview alert (${pushPermission === 'granted' ? 'ready' : 'browser permission required'}): ${title}`,
        pushPermission === 'granted' ? 'success' : 'error'
      );
    }
  };

  const emailDigestBody = useMemo(() => {
    const lines = [
      `DKT ETHIOPIA — SMT LEAD TIME & CORRIDOR ALERT DIGEST`,
      `Recipient: ${draft.emailAddress || currentUser.email} (${currentUser.name})`,
      `Thresholds: Warning >= ${draft.warningLeadTimeDays}d | Critical >= ${draft.criticalLeadTimeDays}d | Customs > ${draft.customsClearanceMaxDays}d | Sea > ${draft.seaTransitMaxDays}d`,
      `Subscribed Routes: ${subscribedRoutesCount} of ${DKT_SHIPMENT_ROUTES.length}`,
      ``,
      `MATCHING ALERTS (${evaluatedAlerts.length}):`,
      ...(evaluatedAlerts.length > 0
        ? evaluatedAlerts.map(
            (a, idx) =>
              `${idx + 1}. [${a.severity.toUpperCase()}] #${a.shipment.rowNo} ${a.shipment.product} (PO: ${a.shipment.poNumber || '—'}) — ${a.reasons.join('; ')}`
          )
        : ['No active shipments currently breach your configured thresholds.'])
    ];
    return lines.join('\n');
  }, [draft, currentUser, subscribedRoutesCount, evaluatedAlerts]);

  const handleCopyEmailDigest = () => {
    navigator.clipboard?.writeText(emailDigestBody);
    setCopiedEmailText(true);
    setTimeout(() => setCopiedEmailText(false), 2000);
    onNotify('Email alert digest copied to clipboard.');
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                SMT Alert Thresholds &amp; Route Notification Settings
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {isSmt ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-red-600" /> SMT Profile: @{currentUser.username}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Profile: @{currentUser.username}
                  </>
                )}
              </span>
              {hasUnsavedChanges && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Customize lead time SLA thresholds and subscribe to email or browser push alerts per inbound shipment route.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Lead Time Thresholds + Delivery Channels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Card 1: Custom Lead Time Alert Thresholds */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Custom Lead Time Alert Thresholds
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluated in real time against PO-to-Warehouse &amp; port clearance durations
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {evaluatedAlerts.length} active alert{evaluatedAlerts.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Warning Threshold */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="warning-lead-time"
                  className="text-xs font-bold text-slate-800"
                >
                  Total Lead Time Warning Threshold (Days)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="warning-lead-time"
                    type="number"
                    min={5}
                    max={90}
                    value={draft.warningLeadTimeDays}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        warningLeadTimeDays: Math.max(5, Number(e.target.value) || 5)
                      }))
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-right text-slate-900"
                  />
                  <span className="text-xs text-slate-500">days</span>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                value={draft.warningLeadTimeDays}
                onChange={e =>
                  setDraft(prev => ({
                    ...prev,
                    warningLeadTimeDays: Number(e.target.value)
                  }))
                }
                aria-label="Warning lead time slider"
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>5d</span>
                <span>Recommended: 24d</span>
                <span>60d</span>
              </div>
            </div>

            {/* Critical SLA Threshold */}
            <div className="p-3.5 rounded-xl bg-red-50/40 border border-red-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="critical-lead-time"
                  className="text-xs font-bold text-red-900"
                >
                  Critical Lead Time Escalation Limit (Days)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="critical-lead-time"
                    type="number"
                    min={7}
                    max={120}
                    value={draft.criticalLeadTimeDays}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        criticalLeadTimeDays: Math.max(7, Number(e.target.value) || 7)
                      }))
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-red-300 bg-white font-mono text-xs font-bold text-right text-red-700"
                  />
                  <span className="text-xs text-red-700">days</span>
                </div>
              </div>
              <input
                type="range"
                min={7}
                max={90}
                value={draft.criticalLeadTimeDays}
                onChange={e =>
                  setDraft(prev => ({
                    ...prev,
                    criticalLeadTimeDays: Number(e.target.value)
                  }))
                }
                aria-label="Critical lead time slider"
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="text-[11px] text-red-700">
                Also controls the pulsing red SLA indicator on the Executive KPI Cards.
              </div>
            </div>

            {/* Segment Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label
                  htmlFor="customs-max-days"
                  className="block text-xs font-bold text-slate-800 mb-1.5"
                >
                  Djibouti Customs Max (Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="customs-max-days"
                    type="number"
                    min={1}
                    max={30}
                    value={draft.customsClearanceMaxDays}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        customsClearanceMaxDays: Math.max(1, Number(e.target.value) || 1)
                      }))
                    }
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">days clearance limit</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label
                  htmlFor="sea-max-days"
                  className="block text-xs font-bold text-slate-800 mb-1.5"
                >
                  Ocean Transit Max (Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="sea-max-days"
                    type="number"
                    min={5}
                    max={45}
                    value={draft.seaTransitMaxDays}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        seaTransitMaxDays: Math.max(5, Number(e.target.value) || 5)
                      }))
                    }
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">days sea limit</span>
                </div>
              </div>
            </div>

            {/* Extra Condition Checkboxes */}
            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center gap-2.5 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.alertOnDelayedStatus}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, alertOnDelayedStatus: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="font-medium">
                  Immediately escalate any shipment marked <strong className="text-red-700">Delayed</strong>
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.alertOnMissingDocuments}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, alertOnMissingDocuments: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="font-medium">
                  Include active orders with missing Commercial Invoice / expiring trade docs
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Email & Browser Push Delivery Channels */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Email &amp; Browser Push Notification Channels
              </h3>
              <p className="text-xs text-slate-500">
                Choose how SMT receives notifications for subscribed routes
              </p>
            </div>
          </div>

          {/* Email Channel Block */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Email Alert Subscription</div>
                  <div className="text-xs text-slate-500">
                    Send threshold breach digests to your SMT email
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={draft.emailEnabled}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, emailEnabled: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className={draft.emailEnabled ? 'text-emerald-700' : 'text-slate-500'}>
                  {draft.emailEnabled ? 'Subscribed' : 'Paused'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={draft.emailAddress}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, emailAddress: e.target.value }))
                  }
                  placeholder="smt@dktethiopia.org"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Frequency
                </label>
                <select
                  value={draft.emailCadence}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      emailCadence: e.target.value as EmailDigestCadence
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-red-500"
                >
                  <option value="immediate">Immediate on Threshold Breach</option>
                  <option value="daily">Daily Executive Digest (08:00 EAT)</option>
                  <option value="weekly">Weekly Monday Corridor Summary</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500">
                Covering {subscribedRoutesCount} subscribed route(s)
              </span>
              <button
                type="button"
                onClick={() => setIsEmailPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>Preview Email Digest</span>
              </button>
            </div>
          </div>

          {/* Browser Push Notification Block */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Browser Push Notifications
                  </div>
                  <div className="text-xs text-slate-500">
                    Real-time desktop &amp; browser alerts via Web Notifications API
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={draft.pushEnabled}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, pushEnabled: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className={draft.pushEnabled ? 'text-emerald-700' : 'text-slate-500'}>
                  {draft.pushEnabled ? 'Active' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Permission:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : pushPermission === 'denied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pushPermission === 'granted'
                    ? 'Granted'
                    : pushPermission === 'denied'
                    ? 'Blocked'
                    : pushPermission === 'unsupported'
                    ? 'Unsupported'
                    : 'Not Requested'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={handleEnableBrowserPush}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
                  >
                    Allow Browser Push
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Send Test Push
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Route-Specific Notification Subscriptions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Shipment Route Subscriptions ({subscribedRoutesCount}/{DKT_SHIPMENT_ROUTES.length} active)
              </h3>
              <p className="text-xs text-slate-500">
                Select which supply corridors trigger email digests or browser push alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSetAllRoutes(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors"
            >
              Subscribe All
            </button>
            <button
              type="button"
              onClick={() => handleSetAllRoutes(false)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold transition-colors"
            >
              Unsubscribe All
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {routeMetrics.map(({ route, activeCount, maxLeadTime, alertCount }) => {
            const pref = draft.routes[route.id] || {
              routeId: route.id,
              enabled: true,
              emailEnabled: true,
              pushEnabled: true
            };
            return (
              <div
                key={route.id}
                className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                  pref.enabled ? 'bg-white' : 'bg-slate-50/70 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={pref.enabled}
                    onChange={() => handleToggleRoute(route.id, 'enabled')}
                    aria-label={`Subscribe to ${route.name}`}
                    className="mt-1 rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {route.corridorCode}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {route.name}
                      </span>
                      {alertCount > 0 && pref.enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-[11px] font-mono font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          {alertCount} breach{alertCount === 1 ? '' : 'es'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{route.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-600 font-mono">
                      <span>{activeCount} active shipment(s)</span>
                      <span>·</span>
                      <span>Max observed LT: {maxLeadTime > 0 ? `${maxLeadTime}d` : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-7 lg:pl-0">
                  <button
                    type="button"
                    disabled={!pref.enabled}
                    onClick={() => handleToggleRoute(route.id, 'emailEnabled')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      !pref.enabled
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : pref.emailEnabled
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email {pref.emailEnabled ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!pref.enabled}
                    onClick={() => handleToggleRoute(route.id, 'pushEnabled')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      !pref.enabled
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : pref.pushEnabled
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Push {pref.pushEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Live Evaluated Alerts Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Ship className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Live Shipments Triggering Your Alert Rules ({evaluatedAlerts.length})
              </h3>
              <p className="text-xs text-slate-500">
                Preview updates live as you adjust thresholds or route subscriptions above
              </p>
            </div>
          </div>
        </div>

        {evaluatedAlerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No shipments currently breach your configured lead time thresholds on subscribed routes.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {evaluatedAlerts.map(alert => (
              <button
                key={alert.shipment.id}
                type="button"
                onClick={() => onSelectShipment(alert.shipment)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      #{alert.shipment.rowNo} · {alert.shipment.poNumber || '—'}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {alert.shipment.product}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({formatQuantity(alert.shipment.prQuantity)} units)
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    {alert.reasons.join(' · ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-red-600">
                  <span>Inspect Dossier -&gt;</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Non-blocking Email Digest Preview Modal */}
      {isEmailPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Email Alert Digest Preview"
        >
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  SMT Email Alert Digest Preview
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close email preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs text-slate-600 flex flex-wrap gap-2">
                <span>
                  To: <strong className="text-slate-900">{draft.emailAddress || currentUser.email}</strong>
                </span>
                <span>·</span>
                <span>
                  Cadence: <strong className="text-slate-900 capitalize">{draft.emailCadence}</strong>
                </span>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                {emailDigestBody}
              </pre>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyEmailDigest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                {copiedEmailText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Digest</span>
                  </>
                )}
              </button>
              <a
                href={`mailto:${encodeURIComponent(
                  draft.emailAddress || currentUser.email
                )}?subject=${encodeURIComponent(
                  `DKT Ethiopia Lead Time Alert Digest (${evaluatedAlerts.length} Active)`
                )}&body=${encodeURIComponent(emailDigestBody)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in Email Client</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

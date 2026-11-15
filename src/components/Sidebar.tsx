import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Kanban,
  Table,
  Warehouse,
  MapPin,
  BarChart3,
  FileSpreadsheet,
  LogOut,
  Eye,
  ShieldCheck,
  X,
  Bell,
  Clock,
  FileWarning,
  ChevronDown,
  ChevronUp,
  History,
  Building2,
  SlidersHorizontal
} from 'lucide-react';
import { User, ROLE_PERMISSIONS } from '../types/auth';
import { InboundShipment } from '../types/shipment';
import { computeSidebarNotifications } from '../utils/notifications';
import { WorkspaceTab } from './OverviewDashboard';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  currentUser: User;
  onLogout: () => void;
  shipments: InboundShipment[];
  lowStockCount: number;
  auditLogCount?: number;
  alertRuleMatchesCount?: number;
  onFilterCustomsPending: () => void;
  onFilterExpiringDocs: () => void;
  onSelectShipment: (shipment: InboundShipment) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  shipments,
  lowStockCount,
  auditLogCount = 0,
  alertRuleMatchesCount = 0,
  onFilterCustomsPending,
  onFilterExpiringDocs,
  onSelectShipment,
  isOpenMobile,
  onCloseMobile
}) => {
  const [isAlertsExpanded, setIsAlertsExpanded] = useState<boolean>(true);
  const isSmt = currentUser.role === 'SMT';
  const perm = ROLE_PERMISSIONS[currentUser.role];

  const notifications = useMemo(
    () => computeSidebarNotifications(shipments),
    [shipments]
  );

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    iconBgClass: string;
    activeIconBgClass: string;
    badge?: string | number;
    alertCount?: number;
    logisticsOnly?: boolean;
  }[] = [
    {
      id: 'overview',
      label: isSmt ? 'Live Inbound Tracking' : 'Executive Overview',
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-red-50 text-red-600',
      activeIconBgClass: 'bg-red-600 text-white'
    },
    {
      id: 'pipeline',
      label: 'Inbound Pipeline',
      icon: <Kanban className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-indigo-50 text-indigo-600',
      activeIconBgClass: 'bg-indigo-600 text-white',
      alertCount: notifications.customsPendingCount
    },
    {
      id: 'table',
      label: 'Order Status Ledger',
      icon: <Table className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-blue-50 text-blue-600',
      activeIconBgClass: 'bg-blue-600 text-white',
      badge: shipments.length
    },
    {
      id: 'stock',
      label: 'National Stock Status',
      icon: <Warehouse className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-emerald-50 text-emerald-600',
      activeIconBgClass: 'bg-emerald-600 text-white',
      badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
      logisticsOnly: true
    },
    {
      id: 'warehouses',
      label: 'Regional Warehouses',
      icon: <Building2 className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-rose-50 text-rose-600',
      activeIconBgClass: 'bg-rose-600 text-white',
      badge: 8
    },
    {
      id: 'corridor',
      label: 'Corridor Route Map',
      icon: <MapPin className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-teal-50 text-teal-600',
      activeIconBgClass: 'bg-teal-600 text-white'
    },
    {
      id: 'analytics',
      label: isSmt ? 'Lead Time & Forecast' : 'Supply Analytics',
      icon: <BarChart3 className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-amber-50 text-amber-600',
      activeIconBgClass: 'bg-amber-600 text-white'
    },
    {
      id: 'audit',
      label: 'Status Audit Log',
      icon: <History className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-purple-50 text-purple-600',
      activeIconBgClass: 'bg-purple-600 text-white',
      badge: auditLogCount > 0 ? auditLogCount : undefined
    },
    {
      id: 'settings',
      label: isSmt ? 'Alert Settings' : 'Alert Preferences',
      icon: <SlidersHorizontal className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-pink-50 text-pink-600',
      activeIconBgClass: 'bg-pink-600 text-white',
      badge: alertRuleMatchesCount > 0 ? alertRuleMatchesCount : undefined
    },
    {
      id: 'import-export',
      label: 'Excel & CSV Center',
      icon: <FileSpreadsheet className="w-4 h-4" strokeWidth={2.5} />,
      iconBgClass: 'bg-cyan-50 text-cyan-600',
      activeIconBgClass: 'bg-cyan-600 text-white',
      logisticsOnly: true
    }
  ];

  const visibleItems = navItems.filter(item => !item.logisticsOnly || !isSmt);

  const handleNavClick = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-72">
      {/* Brand Block */}
      <div className="px-5 py-4 bg-gradient-to-r from-red-50/70 via-white to-white border-t-3 border-t-red-600 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/assets/aistudio/Eniyew_Sig_406801b8.png"
            alt="DKT Ethiopia"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-900 tracking-tight truncate">
              DKT Ethiopia
            </div>
            <div className="text-xs text-slate-500 font-medium truncate">
              {isSmt ? 'SMT Inbound Monitor' : 'Inbound Supply Portal'}
            </div>
          </div>
        </div>

        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links + Real-Time Notification Panel */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <nav className="space-y-1.5">
          <div className="px-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isSmt ? 'Inbound Order Tracking' : 'Supply Chain Modules'}
          </div>

          {visibleItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-red-50 text-red-700 border border-red-200/80 shadow-2xs'
                    : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? item.activeIconBgClass : item.iconBgClass
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate font-bold">{item.label}</span>
                </span>

                <span className="flex items-center gap-1.5 shrink-0">
                  {item.alertCount !== undefined && item.alertCount > 0 && (
                    <span
                      title={`${item.alertCount} pending customs clearance`}
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800"
                    >
                      {item.alertCount}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        item.id === 'stock'
                          ? 'bg-amber-100 text-amber-800'
                          : isActive
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Real-Time Pending Actions Notification Center */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAlertsExpanded(prev => !prev)}
            className="w-full px-3.5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors"
            aria-expanded={isAlertsExpanded}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <Bell
                  className={`w-4 h-4 ${
                    notifications.totalCount > 0 ? 'text-red-600' : 'text-slate-400'
                  }`}
                />
              </div>
              <span className="text-sm font-bold text-slate-900 truncate">
                Pending Actions
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                  notifications.totalCount > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {notifications.totalCount}
              </span>
              {isAlertsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {isAlertsExpanded && (
            <div className="p-2.5 space-y-2">
              {/* Customs Clearance Pending Filter Action */}
              <button
                type="button"
                onClick={() => {
                  onFilterCustomsPending();
                  onCloseMobile();
                }}
                className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 transition-colors flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    Customs Clearance Pending
                  </span>
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    notifications.customsPendingCount > 0
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {notifications.customsPendingCount}
                </span>
              </button>

              {/* Expiring / Missing Documents Filter Action */}
              <button
                type="button"
                onClick={() => {
                  onFilterExpiringDocs();
                  onCloseMobile();
                }}
                className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-colors flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileWarning className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    Expiring Documents
                  </span>
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    notifications.expiringDocsCount > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {notifications.expiringDocsCount}
                </span>
              </button>

              {/* Live Alert Items (Click to Inspect Order Dossier) */}
              {notifications.alerts.length > 0 ? (
                <div className="pt-1 space-y-1.5 max-h-44 overflow-y-auto">
                  {notifications.alerts.slice(0, 4).map(alert => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        onSelectShipment(alert.shipment);
                        onCloseMobile();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-white hover:bg-red-50/60 border border-slate-200/80 hover:border-red-200 transition-colors block"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            alert.category === 'customs' ? 'text-purple-700' : 'text-amber-800'
                          }`}
                        >
                          {alert.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          Inspect
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 truncate mt-0.5">
                        {alert.detail}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-medium">
                  All customs &amp; trade documents are clear.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role & Session Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                {currentUser.name}
              </div>
              <div className="text-xs font-mono text-slate-500 truncate">
                @{currentUser.username}
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold">
            {isSmt ? (
              <>
                <Eye className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="text-red-700 truncate">{perm.shortLabel}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 truncate">{perm.shortLabel}</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Switch Role</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-72 lg:shrink-0 sticky top-0 h-screen z-20">
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

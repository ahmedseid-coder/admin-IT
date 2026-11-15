import React, { useMemo } from 'react';
import { LayoutDashboard, Kanban, Table, Menu } from 'lucide-react';
import { WorkspaceTab } from './OverviewDashboard';
import { InboundShipment } from '../types/shipment';
import { computeSidebarNotifications } from '../utils/notifications';

interface MobileBottomNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenMoreMenu: () => void;
  shipments: InboundShipment[];
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMoreMenu,
  shipments
}) => {
  const notifications = useMemo(
    () => computeSidebarNotifications(shipments),
    [shipments]
  );

  const isMoreActive =
    activeTab !== 'overview' &&
    activeTab !== 'pipeline' &&
    activeTab !== 'table';

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    badgeCount?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      icon: <Kanban className="w-5 h-5" />,
      badgeCount: notifications.customsPendingCount
    },
    {
      id: 'table',
      label: 'Table',
      icon: <Table className="w-5 h-5" />
    }
  ];

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl mx-1 my-1.5 transition-colors ${
                isActive
                  ? 'text-red-600 bg-red-50/80 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              <span className="relative">
                {item.icon}
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-purple-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    {item.badgeCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMoreMenu}
          aria-label="More views and notifications"
          className={`relative flex flex-col items-center justify-center gap-1 rounded-xl mx-1 my-1.5 transition-colors ${
            isMoreActive
              ? 'text-red-600 bg-red-50/80 font-semibold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
          }`}
        >
          <span className="relative">
            <Menu className="w-5 h-5" />
            {notifications.totalCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {notifications.totalCount}
              </span>
            )}
          </span>
          <span className="text-[11px] leading-none tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};

import React, { useState } from 'react';
import {
  Plus,
  LogOut,
  Eye,
  ShieldCheck,
  ChevronDown,
  FileDown,
  Printer,
  Calendar,
  SlidersHorizontal,
  Share2
} from 'lucide-react';
import { User, ROLE_PERMISSIONS } from '../types/auth';
import { DateFormatOption, DATE_FORMAT_OPTIONS } from '../utils/dateFormat';
import { WorkspaceTab } from './OverviewDashboard';
import { PWAInstallButton } from './ShareAndInstallModal';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onOpenNewShipmentModal: () => void;
  onDownloadSummaryPdf: () => void;
  onPrintSummary: () => void;
  dateFormat: DateFormatOption;
  onChangeDateFormat: (fmt: DateFormatOption) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenShareModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenNewShipmentModal,
  onDownloadSummaryPdf,
  onPrintSummary,
  dateFormat,
  onChangeDateFormat,
  currentUser,
  onLogout,
  onOpenSettings,
  onOpenShareModal
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isSmt = currentUser.role === 'SMT';
  const perm = ROLE_PERMISSIONS[currentUser.role];

  const tabTitles: Record<WorkspaceTab, { title: string; subtitle: string }> = {
    overview: isSmt
      ? {
          title: 'Live Inbound Order Tracking',
          subtitle: 'Real-time order progression from Production to DKT Central Warehouse'
        }
      : {
          title: 'Executive Overview',
          subtitle: 'National stock coverage & inbound corridor monitor'
        },
    pipeline: {
      title: 'Inbound Pipeline Board',
      subtitle: 'Stage-by-stage order progression through Djibouti to DKT Central Warehouse'
    },
    table: {
      title: 'Order Status Ledger',
      subtitle: 'Searchable DKT Ethiopia inbound order & documentation registry'
    },
    stock: {
      title: 'National Stock Status',
      subtitle: 'Central Kality & regional hub inventory linked to incoming orders'
    },
    warehouses: {
      title: '8 Regional Warehouses',
      subtitle: 'Addis Ababa, Adama, Hawassa, Dire Dawa, Dessie, Jimma, Bahidar & Mekele batch ledger'
    },
    corridor: {
      title: 'Corridor Route Map',
      subtitle: 'India (Nhava Sheva) -> Doraleh Port (Djibouti) -> DKT Central Warehouse'
    },
    analytics: {
      title: isSmt ? 'Lead Time & Efficiency Trends' : 'Supply Chain Analytics',
      subtitle: '6-month lead time trend, product mix & port clearance benchmarks'
    },
    audit: {
      title: 'Status Audit Log',
      subtitle: 'Searchable history of shipment status transitions, timestamps & user roles'
    },
    settings: {
      title: 'SMT Alert & Notification Settings',
      subtitle: 'Custom lead time SLA thresholds and route-level email & browser push subscriptions'
    },
    'import-export': {
      title: 'Excel & CSV Import / Export',
      subtitle: 'Sync spreadsheets (.xlsx, .xls, .csv) and manage production tracker records'
    }
  };

  const meta = tabTitles[activeTab];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 h-14 sm:h-16 bg-gradient-to-r from-white via-white to-red-50/40 border-t-3 border-t-red-600 border-b border-slate-200 text-slate-900 shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/assets/aistudio/Eniyew_Sig_406801b8.png"
          alt="DKT Ethiopia"
          className="h-7 w-auto object-contain shrink-0 lg:hidden"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {meta.title}
            </h1>
            <span className="hidden xl:inline text-slate-300">/</span>
            <span className="hidden xl:inline text-sm text-slate-500 truncate">
              {meta.subtitle}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Global Date Format Selector */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700"
          title="Select date display format"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={dateFormat}
            onChange={e => onChangeDateFormat(e.target.value as DateFormatOption)}
            aria-label="Date display format"
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            {DATE_FORMAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.value}
              </option>
            ))}
          </select>
        </div>

        {/* Summary PDF & Print Controls for Current View */}
        <button
          type="button"
          onClick={onDownloadSummaryPdf}
          title="Download summary PDF report for current view"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-red-300 text-xs sm:text-sm font-semibold text-slate-700 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
        >
          <FileDown className="w-4 h-4 text-red-600 shrink-0" />
          <span className="hidden sm:inline">Summary PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>

        <button
          type="button"
          onClick={onPrintSummary}
          title="Print current shipment summary"
          aria-label="Print summary"
          className="hidden sm:flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>

        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            title="Share production app link & download desktop shortcut"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden md:inline">Share / Shortcut</span>
          </button>
        )}

        <PWAInstallButton compact />

        <div
          className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 ${
            isSmt
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {isSmt ? <Eye className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>{perm.shortLabel}</span>
        </div>

        {!isSmt && (
          <button
            onClick={onOpenNewShipmentModal}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-xs"
            aria-label="New Inbound Order"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Order</span>
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 transition-colors text-sm text-slate-700 whitespace-nowrap shrink-0"
            aria-label="Account menu"
          >
            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <span className="hidden sm:inline font-semibold text-slate-800 max-w-[110px] truncate">
              @{currentUser.username}
            </span>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-3 z-50 text-sm">
                <div className="pb-2.5 border-b border-slate-100">
                  <div className="font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                    @{currentUser.username} · {currentUser.email}
                  </div>
                  <div className="text-xs font-bold text-red-600 mt-1.5">
                    {perm.label}
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
                  {perm.summary}
                </div>

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-pink-600" />
                    <span>Lead Time &amp; Alert Settings</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200/80 rounded-lg transition-colors text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out / Switch Account</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

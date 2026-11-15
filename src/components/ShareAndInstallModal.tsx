import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MonitorDown,
  Smartphone,
  Mail,
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  Laptop
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const CANONICAL_APP_URL =
  'https://ais-pre-sk3nqncdxmrlwhi3ni6jku-112237249230.europe-west3.run.app';

export function getShareableAppUrl(): string {
  if (typeof window === 'undefined') return CANONICAL_APP_URL;
  const { origin, hostname } = window.location;
  if (
    origin.startsWith('http') &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1'
  ) {
    return origin;
  }
  return CANONICAL_APP_URL;
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install DKT Ethiopia Supply Portal as a standalone desktop or mobile app"
        className={`flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs whitespace-nowrap shrink-0 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 sm:py-2 text-xs sm:text-sm'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                Install on iPhone / iPad
              </h3>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal pl-4">
                <li>
                  Tap the <strong>Share</strong> icon in your Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to place <strong>DKT Supply</strong> on your home screen.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-2 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-amber-500"
    >
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode — Locally cached records are active</span>
    </div>
  );
};

interface ShareAndInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAndInstallModal: React.FC<ShareAndInstallModalProps> = ({
  isOpen,
  onClose
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [downloadedLabel, setDownloadedLabel] = useState<string | null>(null);

  if (!isOpen) return null;

  const appUrl = getShareableAppUrl();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback selection copy
      const input = document.getElementById('dkt-share-app-url') as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'DKT Ethiopia Supply & Stock Portal',
          text: 'Access DKT Ethiopia Inbound Logistics & 8 Regional Warehouses Portal:',
          url: appUrl
        });
      } catch {
        // User dismissed share sheet
      }
    }
  };

  const downloadShortcutFile = (
    filename: string,
    content: string,
    mimeType: string,
    label: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedLabel(label);
    setTimeout(() => setDownloadedLabel(null), 3500);
  };

  const handleDownloadWindowsShortcut = () => {
    const content = `[InternetShortcut]\r\nURL=${appUrl}\r\nIconIndex=0\r\n`;
    downloadShortcutFile(
      'DKT_Ethiopia_Supply_Portal.url',
      content,
      'application/internet-shortcut',
      'Windows Desktop Shortcut (.url)'
    );
  };

  const handleDownloadMacShortcut = () => {
    const escapedUrl = appUrl.replace(/&/g, '&amp;');
    const content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>URL</key>\n  <string>${escapedUrl}</string>\n</dict>\n</plist>\n`;
    downloadShortcutFile(
      'DKT_Ethiopia_Supply_Portal.webloc',
      content,
      'application/xml',
      'macOS Desktop Shortcut (.webloc)'
    );
  };

  const handleDownloadLinuxShortcut = () => {
    const content = `[Desktop Entry]\nVersion=1.0\nType=Application\nName=DKT Ethiopia Supply Portal\nComment=Inbound Shipment & 8 Regional Warehouses Portal\nExec=xdg-open "${appUrl}"\nURL=${appUrl}\nIcon=web-browser\nTerminal=false\n`;
    downloadShortcutFile(
      'DKT_Ethiopia_Supply_Portal.desktop',
      content,
      'application/x-desktop',
      'Linux Desktop Launcher (.desktop)'
    );
  };

  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    'DKT Ethiopia Supply & Stock Portal — Production Access Link'
  )}&body=${encodeURIComponent(
    `Hello Team,\n\nPlease use the DKT Ethiopia Inbound Supply & 8 Regional Warehouses Portal link below to process your tasks or install it as a desktop/mobile shortcut:\n\n${appUrl}\n\nTo add a desktop shortcut:\n- Chrome / Edge: Open the link and click the Install icon in the address bar (or Menu -> Cast, save, and share -> Create shortcut).\n- iPhone / iPad: Open in Safari -> Share -> Add to Home Screen.\n\nBest regards,\nDKT Ethiopia Supply Chain`
  )}`;

  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Share App Link and Desktop Shortcut"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-red-50/70 via-white to-blue-50/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Share App Link &amp; Desktop Shortcut
              </h2>
              <p className="text-xs text-slate-600 truncate">
                Distribute access across regional offices, laptops &amp; mobile devices
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Close share dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto text-sm">
          {/* 1. Production App Link */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="dkt-share-app-url"
                className="text-xs font-bold uppercase tracking-wide text-slate-600"
              >
                Production Web App Link
              </label>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Multi-Device Ready
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="dkt-share-app-url"
                type="text"
                readOnly
                value={appUrl}
                onFocus={e => e.target.select()}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono text-xs text-slate-800 focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Share via Device</span>
                </button>
              )}

              <a
                href={mailtoHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <Mail className="w-3.5 h-3.5 text-red-600" />
                <span>Email Link to Regional Staff</span>
              </a>

              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open in New Tab</span>
              </a>
            </div>
          </div>

          {/* 2. Install Standalone App (PWA) */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Laptop className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Install Standalone App on This Device
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Creates a native-style app window and desktop/home-screen icon with offline cache support.
                  </p>
                </div>
              </div>
            </div>

            {isInstalled ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>App is already installed in standalone mode on this device</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Install Now (One-Click App Shortcut)</span>
              </button>
            ) : isIOS ? (
              <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-blue-200">
                On iPhone/iPad Safari: tap <strong>Share</strong> &rarr;{' '}
                <strong>Add to Home Screen</strong> to install the portal icon.
              </div>
            ) : (
              <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-blue-200">
                In desktop Chrome or Edge, click the <strong>Install Portal</strong> icon in the browser address bar (or Menu &rarr;{' '}
                <strong>Cast, save, and share &rarr; Create shortcut</strong>), or download a desktop launcher file below.
              </div>
            )}
          </div>

          {/* 3. Download Desktop Shortcut Launcher Files */}
          <div className="space-y-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                <MonitorDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Desktop Shortcut File (For Windows, macOS &amp; Linux)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Save to your Desktop or share via Teams/Telegram/Email so staff can launch the portal in one double-click.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadWindowsShortcut}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-red-300 bg-slate-50 hover:bg-red-50/40 transition-colors text-left"
              >
                <span className="text-xs font-bold text-slate-900">Windows (.url)</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Double-click desktop icon
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMacShortcut}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-red-300 bg-slate-50 hover:bg-red-50/40 transition-colors text-left"
              >
                <span className="text-xs font-bold text-slate-900">macOS (.webloc)</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Finder / Dock web shortcut
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLinuxShortcut}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-red-300 bg-slate-50 hover:bg-red-50/40 transition-colors text-left"
              >
                <span className="text-xs font-bold text-slate-900">Linux (.desktop)</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Ubuntu / GNOME launcher
                </span>
              </button>
            </div>

            {downloadedLabel && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Downloaded {downloadedLabel}. Place it on Desktop to launch anytime.</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

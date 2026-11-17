import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import type { LanguageCode } from '../types/village';

export const PWAInstallButton: React.FC<{ lang: LanguageCode }> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>{lang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{lang === 'hi' ? 'फोन में जोड़ें' : 'Add to Home'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'hi' ? 'iPhone / iPad पर इंस्टॉल करें' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install guide"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {lang === 'hi'
                  ? '1. Safari में नीचे Share आइकन दबाएं। 2. "Add to Home Screen" चुनें।'
                  : '1. Tap the Share button in Safari. 2. Scroll and tap "Add to Home Screen".'}
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{ lang: LanguageCode }> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white shadow-lg md:bottom-4"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>
        {lang === 'hi'
          ? 'ऑफ़लाइन मोड — सेव की गई जानकारी दिख रही है'
          : 'Offline mode — showing cached village data'}
      </span>
    </div>
  );
};

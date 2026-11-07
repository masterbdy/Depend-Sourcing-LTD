import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X, CheckCircle, ShieldAlert } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    // Reload once when the new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // 1. If a worker is already waiting, trigger update toast
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setNeedRefresh(true);
      }

      // 2. Listen for new workers installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setNeedRefresh(true);
          }
        });
      });

      // 3. Periodically check for updates (every 20 minutes) & on visibility change
      const checkUpdate = () => {
        try {
          reg.update().catch(() => {});
        } catch (e) {}
      };

      const intervalId = setInterval(checkUpdate, 20 * 60 * 1000);
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }).catch((err) => {
      console.warn('[PWA] Service worker update monitor error:', err);
    });
  }, []);

  const handleUpdate = () => {
    // Safety check: ensure user is not actively submitting a form
    if ((window as any).__isSubmittingBill) {
      const confirmUpdate = window.confirm(
        'একটি বিল সাবমিট করা হচ্ছে। আপনি কি নিশ্চিত যে এখন আপডেট করতে চান?'
      );
      if (!confirmUpdate) return;
    }

    setIsUpdating(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload
      window.location.reload();
    }
  };

  if (!needRefresh || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-blue-500/40 p-4 shadow-2xl shadow-blue-950/60 text-white backdrop-blur-xl">
        {/* Top gradient highlight */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500" />

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                নতুন ভার্সন পাওয়া গেছে!
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold">New</span>
              </h4>
              <p className="text-[11px] text-slate-300 font-medium">
                নতুন ফিচার ও পারফরম্যান্স আপডেট যুক্ত করা হয়েছে।
              </p>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'আপডেট হচ্ছে...' : 'এখনই আপডেট করুন'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition active:scale-95"
          >
            পরে
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;

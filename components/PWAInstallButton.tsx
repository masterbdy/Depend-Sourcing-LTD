import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2, X, Share, MoreVertical, PlusSquare, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

// Global cache for deferred prompt to survive component unmounts
declare global {
  interface Window {
    __pwa_deferred_prompt?: any;
    __pwa_is_installed?: boolean;
  }
}

export interface PWAInstallButtonProps {
  variant?: 'login' | 'sidebar' | 'header' | 'floating' | 'banner';
  className?: string;
  onInstallSuccess?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'sidebar',
  className = '',
  onInstallSuccess
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => window.__pwa_deferred_prompt || null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.__pwa_is_installed ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // Detect OS / device
    const ua = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    
    if (isIOSDevice) {
      setDeviceType('ios');
    } else if (isAndroidDevice) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Check standalone mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (standalone) {
        setIsInstalled(true);
        window.__pwa_is_installed = true;
      }
    };

    checkStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    // Capture beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      window.__pwa_deferred_prompt = e;
      setDeferredPrompt(e);
    };

    // Capture appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__pwa_is_installed = true;
      window.__pwa_deferred_prompt = null;
      setDeferredPrompt(null);
      if (onInstallSuccess) onInstallSuccess();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstallSuccess]);

  // If already installed in standalone mode, suppress the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const activePrompt = deferredPrompt || window.__pwa_deferred_prompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          window.__pwa_is_installed = true;
          window.__pwa_deferred_prompt = null;
          setDeferredPrompt(null);
          if (onInstallSuccess) onInstallSuccess();
        }
      } catch (err) {
        console.warn('Native PWA install prompt error:', err);
        setShowGuideModal(true);
      }
    } else {
      // Fallback guide modal for iOS or Android Chrome menu flow
      setShowGuideModal(true);
    }
  };

  // Render Guide Modal
  const renderGuideModal = () => {
    if (!showGuideModal) return null;

    return (
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => setShowGuideModal(false)}
      >
        <div 
          className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden p-6 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400" />
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 p-2 shadow-lg shadow-blue-500/20 flex items-center justify-center border border-white/10">
                <img 
                  src="/pwa-192x192.png" 
                  alt="Depend Sourcing Logo" 
                  className="w-full h-full object-contain drop-shadow" 
                  onError={(e) => { (e.currentTarget as any).src = '/icon.svg'; }}
                />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Depend Sourcing Ltd.
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">PWA</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">অফিসিয়াল মোবাইল অ্যাপ ইনস্টল নির্দেশিকা</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuideModal(false)}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Device Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-700/50">
            <button
              onClick={() => setDeviceType('android')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                deviceType === 'android'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Android (Chrome)
            </button>
            <button
              onClick={() => setDeviceType('ios')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                deviceType === 'ios'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share className="w-3.5 h-3.5" /> iPhone / iPad
            </button>
            <button
              onClick={() => setDeviceType('desktop')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                deviceType === 'desktop'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> Desktop
            </button>
          </div>

          {/* Instructions Body */}
          <div className="space-y-3 my-4">
            {deviceType === 'android' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/30">
                    1
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">ব্রাউজারের ৩-ডট মেন্যু চাপুন:</span>
                    Google Chrome ব্রাউজারের উপরে ডান কোনায় থাকা <strong className="text-blue-400 inline-flex items-center gap-0.5"><MoreVertical className="w-3.5 h-3.5 inline" /> ৩টি ডট</strong> আইকনে চাপ দিন।
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/30">
                    2
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">ইনস্টল অপশনটি বেছে নিন:</span>
                    মেনু থেকে <strong className="text-emerald-400">"Install app"</strong> অথবা <strong className="text-emerald-400">"Add to Home screen"</strong> (হোম স্ক্রিনে যোগ করুন) অপশনে চাপ দিন।
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/30">
                    3
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">নিশ্চিত করুন:</span>
                    পপ-আপে <strong className="text-blue-400">"Install"</strong> বাটনে চাপ দিলেই অ্যাপটি আপনার ফোনে ইনস্টল হয়ে যাবে। কোনো APK লাগবে না!
                  </div>
                </div>
              </>
            )}

            {deviceType === 'ios' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-500/30">
                    1
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">শেয়ার আইকন চাপুন:</span>
                    Safari ব্রাউজারের নিচের বারে থাকা <strong className="text-indigo-400 inline-flex items-center gap-0.5"><Share className="w-3.5 h-3.5 inline" /> Share</strong> আইকনে চাপ দিন।
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-500/30">
                    2
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">হোম স্ক্রিনে যোগ করুন:</span>
                    মেনু স্ক্রল করে <strong className="text-emerald-400 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> "Add to Home Screen"</strong> অপশনে চাপ দিন।
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-500/30">
                    3
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">সংরক্ষণ করুন:</span>
                    উপরের ডান কোণায় থাকা <strong className="text-indigo-400">"Add"</strong> চাপলেই ফোনের হোম স্ক্রিনে আইকন চলে আসবে।
                  </div>
                </div>
              </>
            )}

            {deviceType === 'desktop' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                    1
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">অ্যাড্রেস বার আইকন:</span>
                    Chrome/Edge ব্রাউজারের অ্যাড্রেস বারের ডানে থাকা <strong className="text-emerald-400">ইনস্টল আইকন <Download className="w-3.5 h-3.5 inline" /></strong> চাপুন।
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                    2
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">ইনস্টল সম্পন্ন করুন:</span>
                    পপ-আপে <strong>"Install"</strong> ক্লিক করলেই আলাদা স্বতন্ত্র উইন্ডোতে অ্যাপ চলবে।
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Features badge */}
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-[11px] text-slate-300 flex items-center justify-between mb-5">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" /> অফলাইন সাপোর্ট
            </span>
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <Sparkles className="w-4 h-4" /> ফুল স্ক্রিন মোড
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <CheckCircle2 className="w-4 h-4" /> দ্রুত লোডিং
            </span>
          </div>

          {/* Action button */}
          <button
            onClick={() => setShowGuideModal(false)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            বুঝেছি, বন্ধ করুন <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // 1. LOGIN SCREEN VARIANT (Prominent, High-converting, 3D card style)
  if (variant === 'login') {
    return (
      <>
        <div className={`w-full ${className}`}>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full relative group overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-blue-950/90 border border-blue-500/30 hover:border-blue-400/60 shadow-xl shadow-blue-950/40 hover:shadow-2xl hover:shadow-blue-900/40 transition-all duration-300 text-left active:scale-[0.99]"
          >
            {/* Ambient Glow */}
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-400/20 transition-all duration-500" />
            <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all duration-500" />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 border border-white/20 shrink-0">
                  <Download className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                      মোবাইলে অ্যাপ ইনস্টল করুন
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black tracking-wide">
                      PWA
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">
                    Google Chrome দিয়ে সরাসরি ১-ক্লিকে ইনস্টল (APK ছাড়াই)
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-blue-600 text-slate-300 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        </div>
        {renderGuideModal()}
      </>
    );
  }

  // 2. SIDEBAR VARIANT (Permanent Navigation, matching existing styling)
  if (variant === 'sidebar') {
    return (
      <>
        <div className={`px-4 mb-2 relative z-10 ${className}`}>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50 transition-all group shadow-sm active:scale-95"
            title="ইনস্টল করুন Depend Sourcing অ্যাপ"
          >
            <Download className="w-5 h-5 transition-transform group-hover:scale-110 shrink-0" />
            <span className="flex-1 text-left">অ্যাপ ইনস্টল করুন</span>
            <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">PWA</span>
          </button>
        </div>
        {renderGuideModal()}
      </>
    );
  }

  // 3. HEADER VARIANT (Compact mobile header or top bar button)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30 active:scale-95 transition ${className}`}
          title="Install Depend Sourcing App"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ইনস্টল</span>
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // 4. FLOATING / BANNER VARIANT
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-95 transition ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>অ্যাপ ইনস্টল করুন</span>
      </button>
      {renderGuideModal()}
    </>
  );
};

export default PWAInstallButton;

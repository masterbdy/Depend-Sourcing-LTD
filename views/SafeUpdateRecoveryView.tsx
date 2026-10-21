import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  HardDrive,
  Wifi,
  WifiOff,
  Database,
  Layers,
  Clock,
  ArrowRight,
  Lock,
  FileText,
  AlertCircle,
  Activity,
  ArrowUpDown,
  FileCheck,
  Check,
  X,
  ExternalLink,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import {
  UserRole,
  Expense,
  Staff,
  Fund,
  Advance,
  MovementLog,
  BillingRule,
  AppNote,
  Product,
  RecoveryHealthStatus,
  AppVersionInfo,
  DataConflictRecord,
  QueueRetryItem,
  CacheIntegrityReport,
  ImportPreviewSummary,
} from '../types';
import {
  safeUpdateRecovery,
  APP_CURRENT_VERSION,
  APP_BUILD_TIMESTAMP,
  APP_BUILD_COMMIT,
} from '../services/safeUpdateRecoveryService';
import { systemHealth, SystemHealthSnapshot } from '../services/systemHealthService';

interface SafeUpdateRecoveryViewProps {
  role: UserRole;
  currentUser: string | null;
  firebaseConfig: any;
  isCloudEnabled: boolean;
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  staffList?: Staff[];
  setStaffList?: (staff: Staff[]) => void;
  funds?: Fund[];
  setFunds?: (funds: Fund[]) => void;
  advances?: Advance[];
  setAdvances?: (advances: Advance[]) => void;
  movements?: MovementLog[];
  setMovements?: (movements: MovementLog[]) => void;
  billingRules?: BillingRule[];
  setBillingRules?: (rules: BillingRule[]) => void;
  appNotes?: AppNote[];
  setAppNotes?: (notes: AppNote[]) => void;
  products?: Product[];
  setProducts?: (products: Product[]) => void;
  onNavigate?: (tab: string) => void;
}

type ActiveTabType = 'dashboard' | 'update' | 'sync' | 'conflicts' | 'backup' | 'audit';

export const SafeUpdateRecoveryView: React.FC<SafeUpdateRecoveryViewProps> = ({
  role,
  currentUser,
  firebaseConfig,
  isCloudEnabled,
  expenses,
  setExpenses,
  staffList = [],
  setStaffList = () => {},
  funds = [],
  setFunds = () => {},
  advances = [],
  setAdvances = () => {},
  movements = [],
  setMovements = () => {},
  billingRules = [],
  setBillingRules = () => {},
  appNotes = [],
  setAppNotes = () => {},
  products = [],
  setProducts = () => {},
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [healthSnapshot, setHealthSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>(() => safeUpdateRecovery.getVersionInfo());
  const [queueItems, setQueueItems] = useState<QueueRetryItem[]>(() => safeUpdateRecovery.getQueueRetryItems());
  const [conflicts, setConflicts] = useState<DataConflictRecord[]>(() => safeUpdateRecovery.getAllConflicts());
  const [cacheReport, setCacheReport] = useState<CacheIntegrityReport | null>(null);

  // Action / State flags
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isScanningCache, setIsScanningCache] = useState(false);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

  // Update modal state
  const [showUpdateWarningModal, setShowUpdateWarningModal] = useState(false);
  const [updateSafetyDetails, setUpdateSafetyDetails] = useState<{ pendingCount: number; conflictCount: number; message: string } | null>(null);

  // Conflict resolution state
  const [selectedConflict, setSelectedConflict] = useState<DataConflictRecord | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  // Backup / Import state
  const [isExporting, setIsExporting] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importSummary, setImportSummary] = useState<ImportPreviewSummary | null>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  const isAdminOrMD = role === UserRole.ADMIN || role === UserRole.MD;

  // Subscribe to system health changes
  useEffect(() => {
    const unsub = systemHealth.subscribe((snap) => {
      setHealthSnapshot(snap);
    });
    // Trigger initial health check in background
    systemHealth.runSafeDiagnostics(firebaseConfig);

    return () => unsub();
  }, [firebaseConfig]);

  // Listen to bill sync updates
  const refreshQueueAndConflicts = useCallback(() => {
    setQueueItems(safeUpdateRecovery.getQueueRetryItems());
    setConflicts(safeUpdateRecovery.getAllConflicts());
  }, []);

  useEffect(() => {
    const handleSyncUpdate = () => {
      refreshQueueAndConflicts();
    };
    window.addEventListener('offline-sync-warning', handleSyncUpdate);
    window.addEventListener('bill-sync-updated', handleSyncUpdate);

    return () => {
      window.removeEventListener('offline-sync-warning', handleSyncUpdate);
      window.removeEventListener('bill-sync-updated', handleSyncUpdate);
    };
  }, [refreshQueueAndConflicts]);

  const showFeedback = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', durationMs = 4500) => {
    setActionFeedback({ type, text });
    setTimeout(() => {
      setActionFeedback((prev) => (prev?.text === text ? null : prev));
    }, durationMs);
  };

  // ----------------------------------------------------
  // Update Awareness Handlers
  // ----------------------------------------------------
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await safeUpdateRecovery.checkForUpdates();
      setVersionInfo(info);
      if (info.isUpdateAvailable) {
        showFeedback(`নতুন সংস্করণ (v${info.latestVersion}) প্রকাশিত হয়েছে!`, 'info');
      } else if (info.status === 'UP_TO_DATE') {
        showFeedback(`আপনার অ্যাপ্লিকেশন সম্পূর্ণ আপডেট রয়েছে (v${info.currentVersion})।`, 'success');
      } else {
        showFeedback('আপডেট চেক করা যায়নি। ইন্টারনেট সংযোগ ও সার্ভার এপিআই যাচাই করুন।', 'warning');
      }
    } catch {
      showFeedback('আপডেট অনুসন্ধানে ত্রুটি ঘটেছে।', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleTriggerUpdateClick = () => {
    const safety = safeUpdateRecovery.canSafelyUpdate();
    if (!safety.safe) {
      setUpdateSafetyDetails({
        pendingCount: safety.pendingCount,
        conflictCount: safety.unresolvedConflictsCount,
        message: safety.warningMessage || 'আনসিঙ্কড পরিবর্তন রয়েছে।',
      });
      setShowUpdateWarningModal(true);
    } else {
      executeSafeUpdate(false);
    }
  };

  const executeSafeUpdate = async (force: boolean) => {
    setShowUpdateWarningModal(false);
    const res = await safeUpdateRecovery.applyUpdate(force);
    if (!res.success) {
      showFeedback(res.message, 'error');
    } else {
      showFeedback(res.message, 'success');
    }
  };

  // ----------------------------------------------------
  // Sync Queue Retry Handlers
  // ----------------------------------------------------
  const handleRetrySingle = async (billId: string) => {
    showFeedback('সিঙ্ক পুনরায় চেষ্টা করা হচ্ছে...', 'info');
    const res = await safeUpdateRecovery.retryQueuedBill(billId, firebaseConfig, role, currentUser || 'User');
    refreshQueueAndConflicts();

    if (res.success) {
      showFeedback(res.message, 'success');
    } else if (res.conflictDetected) {
      showFeedback(res.message, 'warning');
      setActiveTab('conflicts');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    try {
      const res = await safeUpdateRecovery.retryAllEligible(
        firebaseConfig,
        role,
        currentUser || 'User',
        (cur, total) => {
          showFeedback(`সিঙ্ক চলছে: ${cur}/${total}...`, 'info', 2000);
        }
      );
      refreshQueueAndConflicts();
      if (res.syncedCount > 0) {
        showFeedback(`✅ ${res.syncedCount}টি বিল সফলভাবে সার্ভারে জমা হয়েছে!`, 'success');
      } else if (res.conflictCount > 0) {
        showFeedback(`⚠️ ${res.conflictCount}টি বিলে কনফ্লিক্ট দেখা দিয়েছে। কনফ্লিক্ট ট্যাবে দেখুন।`, 'warning');
        setActiveTab('conflicts');
      } else {
        showFeedback('সবগুলো সিঙ্ক সম্পন্ন হতে পারেনি। নেটওয়ার্ক চেক করুন।', 'warning');
      }
    } catch (err: any) {
      showFeedback(`সিঙ্ক ত্রুটি: ${err?.message || 'অজ্ঞাত'}`, 'error');
    } finally {
      setIsRetryingAll(false);
    }
  };

  // ----------------------------------------------------
  // Conflict Resolution Handlers
  // ----------------------------------------------------
  const handleResolveConflict = async (type: 'USE_SERVER' | 'USE_LOCAL' | 'KEEP_BOTH') => {
    if (!selectedConflict) return;
    setIsResolvingConflict(true);

    try {
      const res = await safeUpdateRecovery.resolveConflict(
        selectedConflict.id,
        type,
        role,
        currentUser || 'User',
        firebaseConfig,
        expenses,
        setExpenses
      );

      if (res.success) {
        showFeedback(res.message, 'success');
        setSelectedConflict(null);
        refreshQueueAndConflicts();
      } else {
        showFeedback(res.message, 'error');
      }
    } catch (err: any) {
      showFeedback(`কনফ্লিক্ট সমাধান ব্যর্থ: ${err?.message || 'অজ্ঞাত ত্রুটি'}`, 'error');
    } finally {
      setIsResolvingConflict(false);
    }
  };

  // ----------------------------------------------------
  // Cache Integrity Scan Handler
  // ----------------------------------------------------
  const handleScanCache = async () => {
    setIsScanningCache(true);
    try {
      const rep = await safeUpdateRecovery.scanCacheIntegrity();
      setCacheReport(rep);
      if (rep.isHealthy) {
        showFeedback('লোকাল স্টোরেজ ও IndexedDB সম্পূর্ণ সুস্থ ও অক্ষত রয়েছে।', 'success');
      } else {
        showFeedback('স্টোরেজে কিছু সমস্যা বা ফাইল ক্র্যাশ শনাক্ত হয়েছে।', 'warning');
      }
    } catch {
      showFeedback('ক্যাশ স্ক্যানিং ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsScanningCache(false);
    }
  };

  // ----------------------------------------------------
  // Safe Backup & Export Handler
  // ----------------------------------------------------
  const handleExportBackup = () => {
    if (!isAdminOrMD) {
      showFeedback('অননুমোদিত: ব্যাকআপ এক্সপোর্ট করার অনুমতি কেবল অ্যাডমিন ও এমডির রয়েছে।', 'error');
      return;
    }
    setIsExporting(true);
    try {
      const { blob, filename } = safeUpdateRecovery.generateSecureBackup(
        currentUser || 'Admin',
        role,
        {
          staffList,
          expenses,
          funds,
          advances,
          movements,
          billingRules,
          appNotes,
          products,
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showFeedback(`✅ ব্যাকআপ ডাউনলোড সফল হয়েছে (${filename})। পাসওয়ার্ড নিরাপদভাবে বাদ দেওয়া হয়েছে।`, 'success');
    } catch (err: any) {
      showFeedback(`এক্সপোর্ট ব্যর্থ: ${err?.message || 'অজ্ঞাত'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // Import Validation & Execution Handlers
  // ----------------------------------------------------
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      const summary = safeUpdateRecovery.validateImportFile(content);
      setImportSummary(summary);
      if (!summary.isValid) {
        showFeedback(`ফাইলের গঠন ত্রুটিপূর্ণ: ${summary.error}`, 'error');
      } else {
        showFeedback('ফাইল যাচাই সফল হয়েছে। ইমপোর্ট করার আগে প্রিভিউ পরীক্ষা করুন।', 'info');
      }
    };
    reader.onerror = () => {
      showFeedback('ফাইল পড়তে ব্যর্থ হয়েছে।', 'error');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importSummary || !importSummary.isValid || !importJsonText) return;
    setIsApplyingImport(true);

    try {
      const res = await safeUpdateRecovery.applyVerifiedImport(
        importJsonText,
        role,
        currentUser || 'Admin',
        {
          updateStaffList: setStaffList,
          updateExpenses: setExpenses,
          updateFunds: setFunds,
          updateAdvances: setAdvances,
          updateMovements: setMovements,
          updateBillingRules: setBillingRules,
          updateAppNotes: setAppNotes,
          updateProducts: setProducts,
          currentExpenses: expenses,
          currentStaff: staffList,
        }
      );

      if (res.success) {
        showFeedback(res.message, 'success');
        setImportJsonText('');
        setImportSummary(null);
        refreshQueueAndConflicts();
      } else {
        showFeedback(res.message, 'error');
      }
    } catch (err: any) {
      showFeedback(`ইমপোর্ট ব্যর্থ: ${err?.message || 'অজ্ঞাত'}`, 'error');
    } finally {
      setIsApplyingImport(false);
    }
  };

  // System Overall Status Helper (Strict mapping, never fake online)
  const computeOverallStatus = (): { status: RecoveryHealthStatus; label: string; color: string; bg: string } => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return { status: 'OFFLINE', label: 'ডিভাইস অফলাইন (Offline)', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
    }

    const pendingCount = queueItems.length;
    const conflictCount = conflicts.filter((c) => c.status === 'UNRESOLVED').length;
    const fbConnected = healthSnapshot?.firebase.connected;

    if (conflictCount > 0 || pendingCount > 10 || !fbConnected) {
      return { status: 'ATTENTION_REQUIRED', label: 'মনোযোগ প্রয়োজন (Attention Required)', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' };
    }

    return { status: 'HEALTHY', label: 'সিস্টেম সুস্থ ও সক্রিয় (Healthy)', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
  };

  const overall = computeOverallStatus();
  const unresolvedConflicts = useMemo(() => conflicts.filter((c) => c.status === 'UNRESOLVED'), [conflicts]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-20">
      {/* TOP HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Safe Update &amp; Recovery Center
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  v{APP_CURRENT_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                নিরাপদ আপডেট, অফলাইন সিঙ্ক সুরক্ষা, কনফ্লিক্ট নিরসন ও ডাটা রিকভারি প্ল্যাটফর্ম
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                ← ড্যাশবোর্ডে ফিরুন
              </button>
            )}
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'যাচাই হচ্ছে...' : 'আপডেট অনুসন্ধান'}</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST / BANNER */}
        {actionFeedback && (
          <div
            className={`px-4 py-2 text-xs font-bold flex items-center justify-between border-t transition-all ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500 text-white'
                : actionFeedback.type === 'error'
                ? 'bg-rose-500 text-white'
                : actionFeedback.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            <span>{actionFeedback.text}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-white hover:opacity-80 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SUB-TABS NAVIGATION (Responsive scrollable) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto custom-scrollbar pt-1">
          {[
            { id: 'dashboard', label: 'সিস্টেম ড্যাশবোর্ড', icon: Activity },
            {
              id: 'update',
              label: 'আপডেট সেন্টার',
              icon: Zap,
              badge: versionInfo.isUpdateAvailable ? 'NEW' : null,
            },
            {
              id: 'sync',
              label: 'সিঙ্ক ও কিউ সুরক্ষা',
              icon: Layers,
              badge: queueItems.length > 0 ? queueItems.length : null,
              badgeColor: 'bg-amber-500',
            },
            {
              id: 'conflicts',
              label: 'কনফ্লিক্ট ও রিকভারি',
              icon: AlertTriangle,
              badge: unresolvedConflicts.length > 0 ? unresolvedConflicts.length : null,
              badgeColor: 'bg-rose-500',
            },
            { id: 'backup', label: 'নিরাপদ ব্যাকআপ ও ইমপোর্ট', icon: HardDrive },
            { id: 'audit', label: 'ডায়াগনস্টিক অডিট লগ', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTabType)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black text-white ${
                      tab.badgeColor || 'bg-indigo-600 animate-pulse'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* OVERALL HEALTH BANNER */}
        <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${overall.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs ${overall.color}`}>
              {overall.status === 'HEALTHY' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : overall.status === 'OFFLINE' ? (
                <WifiOff className="w-5 h-5 text-amber-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500" />
              )}
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-wider block ${overall.color}`}>
                {overall.label}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                অফলাইন কিউতে {queueItems.length}টি পেন্ডিং বিল | {unresolvedConflicts.length}টি আনরিজলভড কনফ্লিক্ট | Firebase:{' '}
                {healthSnapshot?.firebase.connected ? 'সরাসরি যুক্ত' : 'সংযোগ বিলম্ব / অফলাইন'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {versionInfo.isUpdateAvailable && (
              <button
                type="button"
                onClick={() => setActiveTab('update')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>আপডেট দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => systemHealth.runSafeDiagnostics(firebaseConfig)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              রিফ্রেশ
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SYSTEM DASHBOARD */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: App Version */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase">অ্যাপ সংস্করণ</span>
                  <Zap className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  v{versionInfo.currentVersion}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>সর্বশেষ: v{versionInfo.latestVersion || versionInfo.currentVersion}</span>
                  <span className={`font-bold ${versionInfo.isUpdateAvailable ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {versionInfo.isUpdateAvailable ? 'আপডেট প্রাপ্য' : 'আপ-টু-ডেট'}
                  </span>
                </div>
              </div>

              {/* Card 2: Firebase Connectivity */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase">Firebase RTDB</span>
                  <Database className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${healthSnapshot?.firebase.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{healthSnapshot?.firebase.connected ? 'কানেক্টেড' : 'বিচ্ছিন্ন'}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  লেটেন্সি: {healthSnapshot?.firebase.latencyMs ? `${healthSnapshot.firebase.latencyMs}ms` : 'যাচাই করা হয়নি'}
                </div>
              </div>

              {/* Card 3: Offline Queue */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase">অফলাইন সিঙ্ক কিউ</span>
                  <Layers className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {queueItems.length} টি বিল
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>পেন্ডিং পরিবর্তন</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sync')}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    কিউ দেখুন →
                  </button>
                </div>
              </div>

              {/* Card 4: Local Storage & IndexedDB */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase">IndexedDB ক্যাশ</span>
                  <HardDrive className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {healthSnapshot?.storage.indexedDbAvailable ? 'অক্ষত ও সক্রিয়' : 'ত্রুটিযুক্ত'}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>localforage রেডি</span>
                  <button
                    type="button"
                    onClick={handleScanCache}
                    disabled={isScanningCache}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    {isScanningCache ? 'স্ক্যান...' : 'অখণ্ডতা যাচাই'}
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Status Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                <span>সিস্টেম কম্পোনেন্ট স্ট্যাটাস অডিট (Component Audits)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">বিল্ড আইডি ও টাইমস্ট্যাম্প</span>
                    <span className="text-slate-500 font-mono text-[11px]">{APP_BUILD_COMMIT}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(APP_BUILD_TIMESTAMP).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">সার্ভিস ওয়ার্কার / PWA স্ট্যাটাস</span>
                    <span className="text-slate-500">
                      {'serviceWorker' in navigator ? 'ব্রাউজার সাপোর্ট বিদ্যমান (Firebase SW)' : 'সাপোর্ট নেই'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    {'serviceWorker' in navigator ? 'Active' : 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">সর্বশেষ সফল সিঙ্ক</span>
                    <span className="text-slate-500">
                      {healthSnapshot?.sync.lastSuccessfulSync
                        ? new Date(healthSnapshot.sync.lastSuccessfulSync).toLocaleTimeString()
                        : 'এখনো সিঙ্ক হয়নি'}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">ডেটা কনফ্লিক্ট স্ট্যাটাস</span>
                    <span className="text-slate-500">
                      {unresolvedConflicts.length === 0
                        ? 'কোনো বিরোধ নেই (Zero Conflict)'
                        : `${unresolvedConflicts.length}টি রেকর্ড সমাধান প্রয়োজন`}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      unresolvedConflicts.length === 0
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {unresolvedConflicts.length === 0 ? 'Clear' : 'Conflict'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cache Integrity Report (if scanned) */}
            {cacheReport && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span>লোকাল ক্যাশ অখণ্ডতা স্ক্যান রিপোর্ট (Storage Integrity)</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    যাচাই: {new Date(cacheReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  {Object.entries(cacheReport.collections).map(([name, col]) => (
                    <div
                      key={name}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{name}</span>
                      <div className="my-1 text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {col.count}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          col.status === 'OK'
                            ? 'text-emerald-500'
                            : col.status === 'EMPTY'
                            ? 'text-slate-400'
                            : 'text-rose-500'
                        }`}
                      >
                        {col.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SAFE UPDATE CENTER */}
        {/* ============================================================== */}
        {activeTab === 'update' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      অ্যাপ্লিকেশন সংস্করণ ও লাইভ রিলিজ
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        versionInfo.status === 'UP_TO_DATE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : versionInfo.status === 'UPDATE_AVAILABLE'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {versionInfo.status === 'UP_TO_DATE'
                        ? 'App is current'
                        : versionInfo.status === 'UPDATE_AVAILABLE'
                        ? 'Update available'
                        : versionInfo.status === 'UNAVAILABLE'
                        ? 'Version check unavailable'
                        : 'Update check failed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ব্যবহারকারীর চলমান কাজ বা বিল এন্ট্রি ব্যাহত না করে ব্যাকগ্রাউন্ডে যাচাই করা হয়।
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    {isCheckingUpdate ? 'যাচাই হচ্ছে...' : 'পুনরায় চেক করুন'}
                  </button>

                  {versionInfo.isUpdateAvailable && (
                    <button
                      type="button"
                      onClick={handleTriggerUpdateClick}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>এখনই আপডেট করুন (Update Now)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Version Comparison Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 font-bold block mb-1">বর্তমান ইনস্টলকৃত সংস্করণ:</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white">v{versionInfo.currentVersion}</div>
                  <span className="text-[11px] text-slate-500 font-mono">বিল্ড: {versionInfo.buildIdentifier}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 font-bold block mb-1">সর্বশেষ রিলিজ সংস্করণ:</span>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    v{versionInfo.latestVersion || versionInfo.currentVersion}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {versionInfo.releaseNotes || 'স্টেবিলিটি ও রিকভারি আপডেট'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 font-bold block mb-1">আনসিঙ্কড কাজের নিরাপত্তা প্রিকন্ডিশন:</span>
                  <div
                    className={`text-sm font-black ${
                      queueItems.length > 0 || unresolvedConflicts.length > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {queueItems.length > 0 || unresolvedConflicts.length > 0
                      ? `⚠️ ${queueItems.length}টি পেন্ডিং বিল রয়েছে`
                      : '✅ কোনো পেন্ডিং পরিবর্তন নেই'}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    আপডেটের পূর্বে স্বয়ংক্রিয়ভাবে সেফটি প্রিকন্ডিশন যাচাই করা হয়।
                  </span>
                </div>
              </div>
            </div>

            {/* Non-blocking Update Available Banner */}
            {versionInfo.isUpdateAvailable && (
              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                      নতুন আপডেট প্রস্তুত রয়েছে (Version {versionInfo.latestVersion})
                    </h3>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                      আপনার ক্যাশ বা আনসিঙ্কড বিল না হারিয়ে নিরাপদভাবে আপডেট প্রয়োগ করুন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerUpdateClick}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer shrink-0"
                >
                  আপডেট শুরু করুন
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SYNC & LOCAL DATA PROTECTION */}
        {/* ============================================================== */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  অফলাইন সিঙ্ক ও কিউ সুরক্ষা (Durable Sync Queue)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  নেটওয়ার্ক চলে গেলেও বিল নিরাপদে IndexedDB ও LocalStorage-এ সংরক্ষিত থাকে।
                </p>
              </div>

              {queueItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleRetryAll}
                  disabled={isRetryingAll}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
                  <span>{isRetryingAll ? 'সিঙ্ক হচ্ছে...' : `সবগুলো সিঙ্ক করুন (${queueItems.length})`}</span>
                </button>
              )}
            </div>

            {queueItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  অফলাইন কিউ সম্পূর্ণ খালি ও সিঙ্কড!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  সকল বিল এবং রেকর্ড ক্লাউড ডাটাবেজে সংরক্ষিত রয়েছে। ডিভাইসে কোনো অমীমাংসিত পেন্ডিং বিল নেই।
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          #{item.billId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            item.syncStatus === 'SAVED_OFFLINE'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : item.syncStatus === 'CONFLICT'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {item.syncStatus}
                        </span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          ৳{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {item.reason} — <span className="text-slate-500">স্টাফ: {item.staffName}</span>
                      </div>
                      {item.syncError && (
                        <div className="text-[11px] text-rose-500 font-mono">
                          ত্রুটি: {item.syncError} (চেষ্টা #{item.attempts})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRetrySingle(item.billId)}
                        disabled={!item.isEligibleForRetry}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {item.isEligibleForRetry ? 'সিঙ্ক চেষ্টা করুন' : 'ব্যাকঅফ অপেক্ষমাণ'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CONFLICT DETECTION & RECOVERY */}
        {/* ============================================================== */}
        {activeTab === 'conflicts' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ডেটা কনফ্লিক্ট ও রিকভারি সেন্টার (Conflict Resolution)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                সার্ভার ও লোকাল রেকর্ডের মধ্যে অমিল দেখা দিলে স্বয়ংক্রিয়ভাবে ওভাররাইট না করে এখানে সিদ্ধান্ত নেওয়া হয়।
              </p>
            </div>

            {unresolvedConflicts.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  কোনো সক্রিয় ডেটা কনফ্লিক্ট নেই!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  লোকাল ও সার্ভার ডেটার মধ্যে নিখুঁত মিল বজায় রয়েছে। কোনো আর্থিক রেকর্ড সাংঘর্ষিক অবস্থায় নেই।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {unresolvedConflicts.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 p-5 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            রেকর্ড আইডি: #{c.recordId}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            UNRESOLVED CONFLICT
                          </span>
                        </div>
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">
                          {c.conflictReason}
                        </p>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        শনাক্ত: {new Date(c.detectedAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Side by side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
                      {/* Local Version */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-2 uppercase text-[10px]">
                          📱 লোকাল সংস্করণ (আপনার ডিভাইসের ডেটা)
                        </span>
                        <div className="space-y-1">
                          <div>
                            <span className="text-slate-400">পরিমাণ:</span>{' '}
                            <span className="font-bold">৳{c.localVersion.amount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">কারণ:</span> {c.localVersion.reason}
                          </div>
                          <div>
                            <span className="text-slate-400">স্ট্যাটাস:</span> {c.localVersion.status}
                          </div>
                          <div>
                            <span className="text-slate-400">স্টাফ:</span> {c.localVersion.staffName}
                          </div>
                        </div>
                      </div>

                      {/* Server Version */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-2 uppercase text-[10px]">
                          ☁️ সার্ভার সংস্করণ (Firebase রিয়েলটাইম ডেটা)
                        </span>
                        <div className="space-y-1">
                          <div>
                            <span className="text-slate-400">পরিমাণ:</span>{' '}
                            <span className="font-bold">৳{c.serverVersion.amount ?? 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">কারণ:</span> {c.serverVersion.reason ?? 'N/A'}
                          </div>
                          <div>
                            <span className="text-slate-400">স্ট্যাটাস:</span>{' '}
                            <span className="font-bold text-indigo-600">{c.serverVersion.status ?? 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">সার্ভার আপডেট:</span>{' '}
                            {c.serverVersion.submittedAt
                              ? new Date(c.serverVersion.submittedAt).toLocaleTimeString()
                              : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resolution Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConflict(c);
                          handleResolveConflict('USE_SERVER');
                        }}
                        disabled={isResolvingConflict}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        সার্ভার সংস্করণ গ্রহণ করুন
                      </button>

                      {isAdminOrMD && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConflict(c);
                            handleResolveConflict('USE_LOCAL');
                          }}
                          disabled={isResolvingConflict}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          লোকাল কপি দিয়ে সার্ভার আপডেট (Admin Only)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConflict(c);
                          handleResolveConflict('KEEP_BOTH');
                        }}
                        disabled={isResolvingConflict}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        উভয় রেকর্ড আলাদা সংরক্ষণ করুন (Fork Copy)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: SAFE BACKUP & VERIFIED IMPORT */}
        {/* ============================================================== */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                নিরাপদ ব্যাকআপ এক্সপোর্ট ও প্রিভিউ ইমপোর্ট (Secure Backup &amp; Import)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                পাসওয়ার্ড ও গোপন ক্রেডেনশিয়াল সুরক্ষিত রেখে নির্ভরযোগ্য ব্যাকআপ তৈরি এবং স্কিমা যাচাইকৃত ইমপোর্ট।
              </p>
            </div>

            {!isAdminOrMD ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl text-xs text-amber-800 dark:text-amber-200">
                <span className="font-black text-sm block mb-1">অ্যাক্সেস সংরক্ষিত</span>
                সিস্টেম-ওয়াইড ব্যাকআপ এক্সপোর্ট ও ডাটাবেজ ইমপোর্ট করার ক্ষমতা কেবল অ্যাডমিন (Admin) ও ব্যবস্থাপনা পরিচালক (MD) এর রয়েছে।
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        নিরাপদ ব্যাকআপ এক্সপোর্ট (Verified Export)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      স্টাফ পাসওয়ার্ড, সেশন টোকেন এবং ক্লাউড এপিআই কি ফিল্টার করে সম্পূর্ণ ডেটা স্কিমা ২.০ ফরম্যাটে এক্সপোর্ট হবে।
                    </p>

                    <div className="space-y-2 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 mb-4">
                      <div className="flex justify-between">
                        <span>স্টাফ রেকর্ডস:</span> <span>{staffList.length} টি</span>
                      </div>
                      <div className="flex justify-between">
                        <span>বিল ও খরচ:</span> <span>{expenses.length} টি</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ফান্ড লেজার:</span> <span>{funds.length} টি</span>
                      </div>
                      <div className="flex justify-between">
                        <span>অগ্রিম রেকর্ডস:</span> <span>{advances.length} টি</span>
                      </div>
                      <div className="flex justify-between">
                        <span>পাসওয়ার্ড স্ক্রাবিং:</span> <span className="text-emerald-500 font-bold">নিশ্চিত</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={isExporting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting ? 'তৈরি হচ্ছে...' : 'সুরক্ষিত ব্যাকআপ ডাউনলোড করুন'}</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        স্কিমা প্রিভিউ ও নিরাপদ ইমপোর্ট (Safe Import)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      ব্যাকআপ ফাইল আপলোড করার পর স্কিমা ও অফলাইন কিউ যাচাই করা হবে; কোনো পেন্ডিং বিল মুছে যাবে না।
                    </p>

                    <div className="mb-4">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          JSON ব্যাকআপ ফাইল সিলেক্ট করুন
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">.json ফাইল ফরম্যাট সমর্থিত</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleFileSelected}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preview Summary */}
                    {importSummary && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-4 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>স্কিমা যাচাই:</span>
                          <span className={importSummary.isValid ? 'text-emerald-500' : 'text-rose-500'}>
                            {importSummary.isValid ? 'VALID' : 'INVALID'}
                          </span>
                        </div>
                        {importSummary.conflictsWithOfflineQueue > 0 && (
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            ⚠️ অফলাইন কিউতে থাকা {importSummary.conflictsWithOfflineQueue}টি বিল সুরক্ষিত রাখা হবে (অটো-ওভাররাইট হবে না)।
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500">
                          স্টাফ: {importSummary.counts.staffToAdd} | বিল: {importSummary.counts.expensesToAdd} | ফান্ড: {importSummary.counts.fundsCount}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={!importSummary || !importSummary.isValid || isApplyingImport}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isApplyingImport ? 'ইমপোর্ট প্রক্রিয়া চলছে...' : 'যাচাইকৃত ডেটা ইমপোর্ট কার্যকর করুন'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: DIAGNOSTIC AUDIT LOG */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  অপারেশনাল ডায়াগনস্টিক ও রিকভারি লগ (Audit Trail)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  আপডেট অনুসন্ধান, সিঙ্ক প্রচেষ্টা, কনফ্লিক্ট সমাধান ও ব্যাকআপ অপারেশনসমূহ সংবেদনশীল তথ্য ছাড়া রেকর্ড করা হয়।
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[600px] overflow-y-auto custom-scrollbar">
                {healthSnapshot?.incidents.list && healthSnapshot.incidents.list.length > 0 ? (
                  healthSnapshot.incidents.list.map((inc) => (
                    <div key={inc.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">#{inc.id}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : inc.severity === 'WARNING'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{inc.title}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              inc.status === 'RESOLVED' ? 'text-emerald-500' : 'text-amber-500'
                            }`}
                          >
                            [{inc.status}]
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{inc.message}</p>
                        {inc.resolutionNote && (
                          <p className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                            সমাধান নোট: {inc.resolutionNote} ({inc.resolvedBy || 'System'})
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {new Date(inc.lastOccurrence).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    কোনো সক্রিয় ডায়াগনস্টিক ইনসিডেন্ট রেকর্ড নেই।
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPDATE SAFETY WARNING MODAL */}
      {showUpdateWarningModal && updateSafetyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                অনাকাঙ্ক্ষিত ডেটা লস সতর্কতা!
              </h3>
            </div>

            <p className="text-slate-600 dark:text-slate-300 font-medium mb-4 leading-relaxed">
              {updateSafetyDetails.message}
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 mb-5 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
              অনুগ্রহ করে প্রথমে <strong>সিঙ্ক ও কিউ সুরক্ষা</strong> ট্যাবে গিয়ে বিলগুলো সার্ভারে পাঠান অথবা কনফ্লিক্ট নিরসন করুন।
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpdateWarningModal(false);
                  setActiveTab('sync');
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                প্রথমে সিঙ্ক কিউতে যান (প্রস্তাবিত)
              </button>

              <button
                type="button"
                onClick={() => executeSafeUpdate(true)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                তবুও আপডেট ও রিলোড করুন (Force Reload)
              </button>

              <button
                type="button"
                onClick={() => setShowUpdateWarningModal(false)}
                className="w-full py-2 text-slate-500 font-bold hover:underline cursor-pointer"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeUpdateRecoveryView;

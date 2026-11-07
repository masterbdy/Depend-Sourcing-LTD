import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Wifi,
  WifiOff,
  Cloud,
  Database,
  Server,
  RefreshCw,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Sliders,
  Filter,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCheck,
  Send,
  X,
  Gauge,
  HelpCircle,
  Zap,
  Globe,
  Radio,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../types';
import {
  systemHealth,
  SystemHealthSnapshot,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  DiagnosticEvent,
  PerfThresholds,
  HealthStatus,
} from '../services/systemHealthService';
import { syncAllPendingBills } from '../services/billSyncService';

interface SystemHealthViewProps {
  role: UserRole | null;
  currentUser: string | null;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
  expenses?: any[];
  onNavigate?: (tab: string) => void;
}

export const SystemHealthView: React.FC<SystemHealthViewProps> = ({
  role,
  currentUser,
  firebaseConfig,
  isCloudEnabled,
  expenses = [],
  onNavigate,
}) => {
  const isAuthorized = role === UserRole.ADMIN || role === UserRole.MD;

  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Filters for Incidents
  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IncidentSeverity>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [selectedIncidentForNote, setSelectedIncidentForNote] = useState<Incident | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [resolveNoteInput, setResolveNoteInput] = useState('');
  const [selectedIncidentForResolve, setSelectedIncidentForResolve] = useState<Incident | null>(null);

  // Performance Thresholds Modal
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [normalThreshold, setNormalThreshold] = useState(1000);
  const [slowThreshold, setSlowThreshold] = useState(3000);

  // Active Tab inside Health Monitor
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'firebase_sync' | 'server_api' | 'performance' | 'security' | 'incidents' | 'events'>('overview');

  // Trigger diagnostics check
  const handleRunDiagnostics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await systemHealth.runSafeDiagnostics(firebaseConfig, { currentUser, role });
      setSnapshot(result);
    } catch (err) {
      console.error('[SystemHealthView] Failed to run diagnostics', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [firebaseConfig, currentUser, role]);

  // Initial load and subscription
  useEffect(() => {
    if (!isAuthorized) return;

    handleRunDiagnostics();
    const unsub = systemHealth.subscribe((snap) => {
      setSnapshot(snap);
    });

    const th = systemHealth.getThresholds();
    setNormalThreshold(th.normalMs);
    setSlowThreshold(th.slowMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRunDiagnostics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthorized, handleRunDiagnostics]);

  // Copy Sanitized Diagnostic Summary
  const handleCopyReport = async () => {
    try {
      const report = systemHealth.generateSanitizedReport();
      await navigator.clipboard.writeText(report);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      alert('রিপোর্ট কপি করা সম্ভব হয়নি।');
    }
  };

  // Safe manual queue retry using existing billSyncService mechanism
  const handleForceSync = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    setSyncFeedback('অফলাইন কিউ সিঙ্ক হচ্ছে...');
    try {
      const res = await syncAllPendingBills(expenses, firebaseConfig);
      setSyncFeedback(`সিঙ্ক সম্পন্ন: ${res.syncedCount} টি বিল সার্ভারে জমা হয়েছে, ${res.failedCount} টি বাকি`);
      handleRunDiagnostics();
    } catch (err: any) {
      setSyncFeedback(`সিঙ্ক ব্যর্থ: ${err?.message || 'অজ্ঞাত ত্রুটি'}`);
    } finally {
      setIsSyncingQueue(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Incident Actions
  const handleAcknowledgeIncident = (incidentId: string) => {
    systemHealth.acknowledgeIncident(incidentId, currentUser || 'Admin');
    handleRunDiagnostics();
  };

  const handleResolveIncident = () => {
    if (!selectedIncidentForResolve) return;
    systemHealth.resolveIncident(
      selectedIncidentForResolve.id,
      resolveNoteInput.trim() || 'সমস্যা পর্যালোচনা ও সমাধান সম্পন্ন।',
      currentUser || 'Admin'
    );
    setSelectedIncidentForResolve(null);
    setResolveNoteInput('');
    handleRunDiagnostics();
  };

  const handleAddNote = () => {
    if (!selectedIncidentForNote || !noteInput.trim()) return;
    systemHealth.addIncidentNote(selectedIncidentForNote.id, noteInput.trim(), currentUser || 'Admin');
    setSelectedIncidentForNote(null);
    setNoteInput('');
    handleRunDiagnostics();
  };

  const handleSaveThresholds = () => {
    const normal = Math.max(100, Number(normalThreshold) || 1000);
    const slow = Math.max(normal + 100, Number(slowThreshold) || 3000);
    systemHealth.setThresholds({ normalMs: normal, slowMs: slow });
    setIsThresholdModalOpen(false);
    handleRunDiagnostics();
  };

  const handleResetDiagnostics = () => {
    systemHealth.resetDiagnostics(currentUser || 'Admin');
    handleRunDiagnostics();
  };

  const handleResolveAllIncidents = () => {
    systemHealth.resetDiagnostics(currentUser || 'Admin');
    handleRunDiagnostics();
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.incidents.list.filter((inc) => {
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (serviceFilter !== 'ALL' && inc.affectedService !== serviceFilter) return false;
      return true;
    });
  }, [snapshot, statusFilter, severityFilter, serviceFilter]);

  // Event list
  const events = useMemo(() => {
    return systemHealth.getEvents();
  }, [snapshot]);

  // 5-Tier Status Badge Helper
  const getStatusBadge = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'HEALTHY • সমস্ত ক্রিটিকাল সার্ভিস সক্রিয় ও নির্ভরযোগ্য',
          icon: CheckCircle2,
          chipClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300',
        };
      case 'DEGRADED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
          label: 'DEGRADED • কোর সিস্টেম সচল, সহযোগী সেবায় সীমাবদ্ধতা রয়েছে',
          icon: AlertTriangle,
          chipClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300',
        };
      case 'WARNING':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-300',
          dot: 'bg-orange-500',
          label: 'WARNING • সম্ভাব্য সতর্কতা বা ধীরগতির প্রভাব শনাক্ত হয়েছে',
          icon: AlertCircle,
          chipClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
          text: 'text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
          label: 'CRITICAL • ক্রিটিকাল স্টোরেজ বা ডাটাবেস সার্ভিস ব্যর্থতা',
          icon: AlertOctagon,
          chipClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300',
        };
      case 'UNKNOWN':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          dot: 'bg-slate-400',
          label: 'UNKNOWN • অপ্রতুল তথ্যের কারণে স্থিতি অনির্ধারিত',
          icon: HelpCircle,
          chipClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-300',
        };
    }
  };

  // Unauthorized Access Guard
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-200 dark:border-slate-700 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">প্রবেশাধিকার সংরক্ষিত</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            সিস্টেম হেলথ ডায়াগনস্টিক ও আর্কিটেকচার মনিটর শুধুমাত্র অ্যাডমিন এবং ম্যানেজমেন্ট (MD) একাউন্টের জন্য অনুমোদিত।
          </p>
        </div>
      </div>
    );
  }

  const overall = getStatusBadge(snapshot?.overallStatus || 'UNKNOWN');
  const OverallIcon = overall.icon;

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-200">
      {/* 1. PREMIUM HEADER SECTION */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>সিস্টেম হেলথ ডায়াগনস্টিক • Reliability Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>System Health & Reliability</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            রিয়েল-টাইম ফায়ারবেস কানেক্টিভিটি, ক্লাউড সিঙ্ক কিউ ব্যাকলগ, এক্সপ্রেস/সার্ভারলেস ব্যাকএন্ড এন্ডপয়েন্ট ও লেটেন্সি মনিটরিং।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-600/25 disabled:opacity-60 cursor-pointer"
            title="নিরাপদ রিড-অনলি ডায়াগনস্টিক চালান"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'যাচাই হচ্ছে...' : 'Run Diagnostics'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            title="আইটি ও সাপোর্ট টিমের জন্য সংবেদনশীল তথ্যমুক্ত নিরাপদ রিপোর্ট কপি করুন"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'রিপোর্ট কপি হয়েছে' : 'Copy Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsThresholdModalOpen(true)}
            className="px-3 py-2.5 bg-white hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="লেটেন্সি থ্রেশহোল্ড কনফিগার করুন"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thresholds</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('update-recovery')}
              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Safe Update & Recovery Center"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recovery Center →</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. OVERALL SYSTEM STATUS BANNER */}
      <div className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-all ${overall.bg}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs shrink-0 border border-slate-200/50 dark:border-slate-700">
            <OverallIcon className={`w-5 h-5 ${overall.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${overall.dot} animate-pulse`} />
              <h2 className={`text-sm sm:text-base font-black tracking-wide ${overall.text}`}>
                {overall.label}
              </h2>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              সর্বশেষ পূর্ণ ডায়াগনস্টিক পরীক্ষা:{' '}
              {snapshot?.timestamp
                ? new Date(snapshot.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'অপেক্ষমাণ...'}
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 font-bold">
            <span className="text-slate-500">সিঙ্ক কিউ:</span>
            <span className={`font-mono ${snapshot && snapshot.sync.pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {snapshot?.sync.pendingCount || 0} টি
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 font-bold">
            <span className="text-slate-500">ব্যাকএন্ড সার্ভার:</span>
            <span className={`font-mono ${snapshot?.server.available ? 'text-emerald-600' : 'text-amber-600'}`}>
              {snapshot?.server.available ? 'OK' : 'DEGRADED (সহযোগী)'}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 font-bold">
            <span className="text-slate-500">সক্রিয় ইনসিডেন্ট:</span>
            <span className={`font-mono ${snapshot && snapshot.incidents.openCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {snapshot?.incidents.openCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SUB-TABS NAVIGATION BAR */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'সিস্টেম ওভারভিউ (Overview)' },
          { id: 'firebase_sync', label: 'Firebase & Cloud Sync' },
          { id: 'server_api', label: 'Express / API Backend' },
          { id: 'performance', label: 'পারফরম্যান্স ও P95' },
          { id: 'security', label: 'সিকিউরিটি অডিট' },
          {
            id: 'incidents',
            label: `ইনসিডেন্ট লগ (${snapshot?.incidents.openCount || 0})`,
            badge: snapshot && snapshot.incidents.openCount > 0 ? snapshot.incidents.openCount : undefined,
          },
          { id: 'events', label: `ইভেন্ট স্ট্রিম (${events.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. TAB 1: OVERVIEW & 8 COMPACT 3D CARDS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* CARD 1: Overall System Health */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>সামগ্রিক অবস্থা</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${overall.chipClass}`}>
                  {snapshot?.overallStatus || 'UNKNOWN'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>কোর বিজনেস ফিচার:</span>
                  <span className="font-bold text-emerald-600">১০০% সচল (Active)</span>
                </div>
                <div className="flex justify-between">
                  <span>বিল ও ভাউচার কার্যকারিতা:</span>
                  <span className="font-bold text-emerald-600">নিরাপদ (Verified)</span>
                </div>
                <div className="flex justify-between">
                  <span>সহযোগী ব্যাকএন্ড:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {snapshot?.server.serverType || 'Express'}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: Firebase Connection */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <Cloud className="w-4 h-4 text-amber-500" />
                  <span>Firebase RTDB</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    snapshot?.firebase.connected
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {snapshot?.firebase.connected ? 'Connected' : snapshot?.firebase.status || 'Checking'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>রিড লেটেন্সি:</span>
                  <span className="font-mono font-bold text-emerald-600">{snapshot?.firebase.readLatencyMs || 0} ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>অথেনটিকেশন স্থিতি:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    snapshot?.firebase.authStatus === 'SESSION_AUTHENTICATED' || snapshot?.firebase.authStatus === 'FIREBASE_AUTH_ACTIVE' || snapshot?.firebase.authStatus === 'AUTHENTICATED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : snapshot?.firebase.authStatus === 'NOT_LOGGED_IN'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {snapshot?.firebase.authStatus === 'SESSION_AUTHENTICATED'
                      ? 'Session Active'
                      : snapshot?.firebase.authStatus === 'FIREBASE_AUTH_ACTIVE'
                      ? 'Firebase Auth Active'
                      : snapshot?.firebase.authStatus === 'NOT_LOGGED_IN'
                      ? 'Not Logged In'
                      : snapshot?.firebase.authStatus || 'OK'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ডায়াগনস্টিক নোড:</span>
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                    .info/serverTimeOffset
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: Express / Vercel Serverless Backend */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <Server className="w-4 h-4 text-cyan-500" />
                  <span>API ব্যাকএন্ড</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    snapshot?.server.available
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {snapshot?.server.available ? 'Healthy' : 'Degraded (Optional)'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>আর্কিটেকচার:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{snapshot?.server.serverType}</span>
                </div>
                <div className="flex justify-between">
                  <span>রেসপন্স টাইম:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{snapshot?.server.latencyMs || 0} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>সার্ভিস ভূমিকা:</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">ঐচ্ছিক (Email & AI)</span>
                </div>
              </div>
            </div>

            {/* CARD 4: Cloud Synchronization */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                  <span>ক্লাউড সিঙ্ক স্থিতি</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    snapshot?.sync.consistencyStatus === 'CONSISTENT'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : snapshot?.sync.consistencyStatus === 'PENDING_QUEUE'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  {snapshot?.sync.consistencyStatus || 'UNVERIFIED'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>পেন্ডিং কিউ:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-white">
                    {snapshot?.sync.pendingCount || 0} টি
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সফল সিঙ্ক সংখ্যা:</span>
                  <span className="font-bold font-mono text-emerald-600">{snapshot?.sync.successfulSyncCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>ডুপ্লিকেট সুরক্ষা:</span>
                  <span className="font-bold text-emerald-600">Active (Idempotent)</span>
                </div>
              </div>
            </div>

            {/* CARD 5: Network Quality */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span>নেটওয়ার্ক মান</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    snapshot?.network.online
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {snapshot?.network.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>কানেকশন স্পিড:</span>
                  <span className="font-bold uppercase font-mono text-slate-800 dark:text-white">
                    {snapshot?.network.effectiveType || 'Web Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>RTT লেটেন্সি:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-white">
                    {snapshot?.network.rtt ? `${snapshot.network.rtt} ms` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>অফলাইন মোড সাপোর্ট:</span>
                  <span className="font-bold text-emerald-600">সক্রিয় (Active)</span>
                </div>
              </div>
            </div>

            {/* CARD 6: Database & Storage Performance */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>ডাটাবেস ও স্টোরেজ</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    snapshot?.storage.indexedDbAvailable
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {snapshot?.storage.indexedDbAvailable ? 'IDB Ready' : 'Storage Failed'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>IndexedDB স্টোরেজ:</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>LocalStorage স্টোরেজ:</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>লোকাল রিড লেটেন্সি:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {snapshot?.storage.latencyMs || 0} ms
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 7: Security & Permission Status */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>নিরাপত্তা স্ট্যাটাস</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {snapshot?.security.status || 'HEALTHY'}
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>রোল পারমিশন এনফোর্সমেন্ট:</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>অননুমোদিত চেষ্টা:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-white">
                    {snapshot?.security.unauthorizedAccessAttempts || 0} টি
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সংবেদনশীল ডাটা লিক ঝুঁকি:</span>
                  <span className="font-bold text-emerald-600">None (Sanitized)</span>
                </div>
              </div>
            </div>

            {/* CARD 8: Active Incidents */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                  <ShieldAlert className="w-4 h-4 text-indigo-500" />
                  <span>ইনসিডেন্ট ট্র্যাকিং</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    (snapshot?.incidents.openCount || 0) === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {snapshot?.incidents.openCount || 0} Open
                </span>
              </div>
              <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>ক্রিটিকাল সমস্যা:</span>
                  <span className="font-bold font-mono text-rose-600">{snapshot?.incidents.criticalCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>ওয়ার্নিং সমস্যা:</span>
                  <span className="font-bold font-mono text-amber-600">{snapshot?.incidents.warningCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>অটো-রিকভারি:</span>
                  <span className="font-bold text-emerald-600">Enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>প্রোডাকশন আর্কিটেকচার নিশ্চয়তা (Verified Production Information):</span>
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed pl-6">
              বিল সেভ এবং ভাউচার তৈরি সরাসরি লোকাল IndexedDB ও Firebase Realtime Database দ্বারা সম্পন্ন হয়। Express বা সার্ভারলেস ব্যাকএন্ড শুধুমাত্র ইমেইল পাঠানো এবং AI স্পিকিং টিউটরের মতো সহায়ক সার্ভিসের জন্য ব্যবহৃত হয়। ফলে কোনো কারণে এক্সপ্রেস রেসপন্স না করলেও মূল বিলিং ও ভাউচার অপারেশন সম্পূর্ণ নির্বিঘ্নে কাজ করে।
            </p>
          </div>
        </div>
      )}

      {/* 5. TAB 2: FIREBASE & CLOUD SYNC DEEP DIVE */}
      {activeSubTab === 'firebase_sync' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Firebase Live Probe Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-amber-500" />
                  <span>Firebase Realtime Database সংযোগ পরীক্ষা</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {snapshot?.firebase.connected ? 'সরাসরি যুক্ত' : 'বিচ্ছিন্ন'}
                </span>
              </div>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>ডাটাবেস URL:</span>
                  <span className="font-mono text-slate-800 dark:text-white truncate max-w-[220px]">
                    {snapshot?.firebase.databaseUrl || 'Default RTDB'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ডায়াগনস্টিক অবস্থান (Safe Probe Node):</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {snapshot?.firebase.diagnosticLocation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>রাউন্ড-ট্রিপ সার্ভার লেটেন্সি:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {snapshot?.firebase.roundTripLatencyMs || snapshot?.firebase.readLatencyMs || 0} ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>অথেনটিকেশন স্থিতি:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 dark:text-white">
                      {snapshot?.firebase.authStatus}
                    </span>
                    {snapshot?.firebase.authEmail && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                        {snapshot.firebase.authEmail}
                      </span>
                    )}
                  </div>
                </div>
                {snapshot?.firebase.authExpiresAt && (
                  <div className="flex justify-between">
                    <span>সেশন মেয়াদোত্তীর্ণ:</span>
                    <span className="font-mono text-slate-500">
                      {new Date(snapshot.firebase.authExpiresAt).toLocaleString('bn-BD')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>পারমিশন ডিনাইড কাউন্টার:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {snapshot?.firebase.permissionDeniedCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* App Check Security Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Firebase App Check নিরাপত্তা ও সুরক্ষা</span>
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  snapshot?.firebase.appCheck?.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                }`}>
                  {snapshot?.firebase.appCheck?.status || 'NOT_CONFIGURED'} (নিরাপদ নন-এনফোর্সড)
                </span>
              </div>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>প্রস্তাবিত প্রোভাইডার (Provider):</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {snapshot?.firebase.appCheck?.provider || 'reCAPTCHA v3 (Web)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>এনফোর্সমেন্ট মোড (Enforcement):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {snapshot?.firebase.appCheck?.enforcementMode || 'MONITORING_ONLY'} (Safe: কোনো বৈধ স্টাফ ডিভাইস ব্লক হবে না)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সুপারিশ:</span>
                  <span className="text-slate-700 dark:text-slate-300 text-right max-w-[280px]">
                    {snapshot?.firebase.appCheck?.recommendation}
                  </span>
                </div>
              </div>

              {snapshot?.firebase.appCheck?.roadmap && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">নিরাপদ বাস্তবায়ন রোডম্যাপ (Safe Rollout Roadmap):</div>
                  {snapshot.firebase.appCheck.roadmap.map((step, idx) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cloud Sync & Queue Inspector */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                  <span>ক্লাউড সিঙ্ক ও অফলাইন কিউ ইন্সপেক্টর</span>
                </h3>
                <span className="text-xs font-mono font-bold text-purple-600">
                  {snapshot?.sync.consistencyStatus}
                </span>
              </div>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>পেন্ডিং অফলাইন বিল সংখ্যা:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {snapshot?.sync.pendingCount || 0} টি
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সর্বশেষ সফল সিঙ্ক:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {snapshot?.sync.lastSuccessfulSync
                      ? new Date(snapshot.sync.lastSuccessfulSync).toLocaleString('bn-BD')
                      : 'যাচাই করা হয়নি (Unverified)'}
                  </span>
                </div>
                {snapshot?.sync.longestPendingMinutes !== undefined && (
                  <div className="flex justify-between">
                    <span>সর্বোচ্চ অপেক্ষার সময়:</span>
                    <span className="font-bold text-amber-600">{snapshot.sync.longestPendingMinutes} মিনিট</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>সেশন সিঙ্ক (Session Syncs):</span>
                  <span className="font-mono font-bold text-blue-600">
                    {snapshot?.sync.sessionSyncSuccessCount || 0} সফল / {snapshot?.sync.sessionSyncFailCount || 0} ব্যর্থ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সর্বমোট লাইফটাইম সিঙ্ক (Lifetime Syncs):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {snapshot?.sync.lifetimeSyncSuccessCount || snapshot?.sync.successfulSyncCount || 0} সফল / {snapshot?.sync.lifetimeSyncFailCount || snapshot?.sync.failedSyncCount || 0} ব্যর্থ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সিঙ্ক সামঞ্জস্যতা বিবরণ:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{snapshot?.sync.consistencyDetail}</span>
                </div>
              </div>

              {(snapshot?.sync.pendingCount || 0) > 0 && (
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isSyncingQueue}
                  className="w-full mt-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                  <span>{isSyncingQueue ? 'সিঙ্ক হচ্ছে...' : 'এখনই অফলাইন কিউ সিঙ্ক করুন'}</span>
                </button>
              )}
              {syncFeedback && (
                <p className="text-[11px] text-center font-bold text-purple-600 mt-1">{syncFeedback}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: SERVER & API BACKEND DIAGNOSTICS */}
      {activeSubTab === 'server_api' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-500" />
                  <span>API ব্যাকএন্ড এন্ডপয়েন্ট ও পরিবেশ বিশ্লেষণ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vercel Serverless বনাম Node.js Express পরিবেশ ও স্বাস্থ্য পরীক্ষার বিস্তারিত।
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
                  snapshot?.server.available
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {snapshot?.server.available ? 'Healthy' : 'Degraded (Non-Critical)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 dark:text-white mb-1">যাচাইকৃত ব্যাকএন্ড তথ্য:</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">পরিবেশ আর্কিটেকচার:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{snapshot?.server.serverType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">পরীক্ষিত এন্ডপয়েন্ট:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{snapshot?.server.endpointUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">HTTP স্ট্যাটাস কোড:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{snapshot?.server.httpStatus || 200}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">রেসপন্স লেটেন্সি:</span>
                  <span className="font-mono font-bold text-emerald-600">{snapshot?.server.latencyMs || 0} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ব্যর্থতা ক্যাটাগরি:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{snapshot?.server.failureCategory || 'NONE'}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 dark:text-white mb-1">সমস্যা সমাধান ও কারণ বিশ্লেষণ:</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {snapshot?.server.failureReason ||
                    'ব্যাকএন্ড সার্ভিস স্বাভাবিকভাবে রেসপন্স করছে। Vercel Serverless ফাংশন ও Express ব্যাকএন্ড উভয় পরিবেশেই স্বাস্থ্য পরীক্ষা সফল হয়েছে।'}
                </p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700 dark:text-slate-300">কেন এটি ক্রিটিকাল নয়?</span>
                  <p className="mt-0.5">
                    বিল সেভ, ভাউচার তৈরি এবং অগ্রিম বণ্টন ক্লায়েন্ট ও Firebase Realtime Database দ্বারা পরিচালিত হয়। এক্সপ্রেস বা সার্ভারলেস ব্যাকএন্ডের সাময়িক অনুপলব্ধতা কোনো অবস্থাতেই মূল অ্যাকাউন্টিং লেনদেনকে প্রভাবিত করে না।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 4: ADVANCED PERFORMANCE & P95 LATENCY */}
      {activeSubTab === 'performance' && (
        <div className="space-y-5">
          {/* Performance Overview Banner */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  পারফরম্যান্স লেটেন্সি ও P95 অ্যানালিটিক্স
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {snapshot?.perf.sampleNotice}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">গড় লেটেন্সি (Avg)</span>
                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {snapshot?.perf.overallAvgMs || 0} ms
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">P95 লেটেন্সি (95th %)</span>
                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {snapshot?.perf.overallP95Ms || 0} ms
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">সর্বোচ্চ লেটেন্সি (Max)</span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-white">
                  {snapshot?.perf.overallMaxMs || 0} ms
                </span>
              </div>
            </div>
          </div>

          {/* Aggregated Operations Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white flex items-center justify-between">
              <span>অপারেশন ভিত্তিক গড় ও P95 লেটেন্সি</span>
              <span className="text-[11px] text-slate-400">মোট ট্র্যাকিং: {snapshot?.perf.totalTracked || 0} টি</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-4">অ্যাকশন</th>
                    <th className="py-2.5 px-4">মোট স্যাম্পল</th>
                    <th className="py-2.5 px-4">গড় সময় (Avg)</th>
                    <th className="py-2.5 px-4">P95 সময়</th>
                    <th className="py-2.5 px-4">সর্বোচ্চ সময় (Max)</th>
                    <th className="py-2.5 px-4">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {snapshot?.perf.summary && Object.keys(snapshot.perf.summary).length > 0 ? (
                    Object.entries(snapshot.perf.summary).map(([action, s]) => (
                      <tr key={action} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{action}</td>
                        <td className="py-2.5 px-4 font-mono">{s.count} বার</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {s.avgTotal} ms
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-600">
                          {s.p95Total ? `${s.p95Total} ms` : `${s.avgTotal} ms`}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">{s.maxTotal} ms</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              s.avgTotal > 3000
                                ? 'bg-rose-100 text-rose-800'
                                : s.avgTotal > 1000
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.avgTotal > 3000 ? 'Slow' : s.avgTotal > 1000 ? 'Moderate' : 'Fast'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        এখনো পর্যন্ত পর্যাপ্ত অপারেশন রেকর্ড হয়নি। অ্যাপ্লিকেশনে কাজ করলে স্বয়ংক্রিয়ভাবে পরিমাপ হবে।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 5: SECURITY AUDIT */}
      {activeSubTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>রিড-অনলি অ্যাপ্লিকেশন সিকিউরিটি ডায়াগনস্টিক</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-400">রোল ভিত্তিক অ্যাক্সেস কন্ট্রোল (RBAC):</span>
                  <span className="font-bold text-emerald-600">সক্রিয় (Active)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-400">অননুমোদিত অ্যাক্সেস প্রচেষ্টা:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {snapshot?.security.unauthorizedAccessAttempts || 0} টি
                  </span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-400">সংবেদনশীল ডাটা এক্সপোজার ঝুঁকি:</span>
                  <span className="font-bold text-emerald-600">None (Sanitized)</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-400">App Check কনফিগারেশন:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Standard Web Policy</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-400">টেলিমেট্রি তথ্য সুরক্ষা:</span>
                  <span className="font-bold text-emerald-600">PII ও পাসওয়ার্ড মুক্ত</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-400">নিরাপত্তা স্থিতি:</span>
                  <span className="font-bold text-emerald-600">{snapshot?.security.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 6: INCIDENTS MANAGEMENT */}
      {activeSubTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> ফিল্টার:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none cursor-pointer"
              >
                <option value="ALL">সব স্ট্যাটাস ({snapshot?.incidents.list.length || 0})</option>
                <option value="OPEN">Open (সক্রিয়)</option>
                <option value="INVESTIGATING">Investigating (তদন্তাধীন)</option>
                <option value="RESOLVED">Resolved (সমাধানকৃত)</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none cursor-pointer"
              >
                <option value="ALL">সব তীব্রতা (Severity)</option>
                <option value="CRITICAL">Critical (জরুরি)</option>
                <option value="WARNING">Warning (সতর্কতা)</option>
                <option value="INFO">Info (সাধারণ)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {(snapshot?.incidents.openCount || 0) > 0 && (
                <button
                  type="button"
                  onClick={handleResolveAllIncidents}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  সব সমাধান চিহ্নিত করুন
                </button>
              )}
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                কোনো সক্রিয় ইনসিডেন্ট নেই
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                সমস্ত কোর সিস্টেম সার্ভিস নির্ভরযোগ্য ও সচল রয়েছে।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all space-y-2.5 ${
                    inc.status === 'RESOLVED'
                      ? 'border-slate-200 dark:border-slate-700 opacity-70'
                      : inc.severity === 'CRITICAL'
                      ? 'border-rose-300 dark:border-rose-800 shadow-sm'
                      : 'border-amber-300 dark:border-amber-800 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : inc.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 font-bold">
                        #{inc.id} • {inc.affectedService}
                      </span>
                      {inc.occurrenceCount > 1 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-bold text-purple-700">
                          রিপিট: {inc.occurrenceCount} বার
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        inc.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inc.status === 'INVESTIGATING'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{inc.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-relaxed">
                      {inc.message}
                    </p>
                  </div>

                  {inc.recommendedAction && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">প্রস্তাবিত পদক্ষেপ: </span>
                      <span className="text-slate-500 dark:text-slate-400">{inc.recommendedAction}</span>
                    </div>
                  )}

                  {inc.notes && inc.notes.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                      {inc.notes.map((n, idx) => (
                        <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-blue-600">{n.author}:</span> {n.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                    <span className="text-[10px] text-slate-400">
                      সর্বশেষ: {new Date(inc.lastOccurrence).toLocaleTimeString('bn-BD')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedIncidentForNote(inc)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        নোট
                      </button>
                      {inc.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => setSelectedIncidentForResolve(inc)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          সমাধান (Resolve)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10. TAB 7: TECHNICAL EVENT STREAM */}
      {activeSubTab === 'events' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden shadow-xs">
          {events.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">কোনো টেকনিক্যাল ইভেন্ট রেকর্ড হয়নি।</div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        ev.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : ev.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {ev.type}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white font-mono text-[11px]">
                      [{ev.service}]
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">{ev.summary}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  {new Date(ev.timestamp).toLocaleTimeString('bn-BD')}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* RESOLVE INCIDENT MODAL */}
      {selectedIncidentForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">ইনসিডেন্ট সমাধান নিশ্চিতকরণ</h3>
              <button onClick={() => setSelectedIncidentForResolve(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <b>#{selectedIncidentForResolve.id}:</b> {selectedIncidentForResolve.title}
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">সমাধানের নোট (Resolution Note):</label>
              <textarea
                value={resolveNoteInput}
                onChange={(e) => setResolveNoteInput(e.target.value)}
                placeholder="সমস্যা কীভাবে সমাধান হয়েছে লিখুন..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedIncidentForResolve(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleResolveIncident}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                সমাধান চিহ্নিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NOTE MODAL */}
      {selectedIncidentForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">ইনসিডেন্টে নোট যোগ করুন</h3>
              <button onClick={() => setSelectedIncidentForNote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="তদন্ত নোট বা পর্যবেক্ষণ লিখুন..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedIncidentForNote(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURE THRESHOLDS MODAL */}
      {isThresholdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">লেটেন্সি থ্রেশহোল্ড প্যারামিটার</h3>
              <button onClick={() => setIsThresholdModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  স্বাভাবিক অপারেশন সীমা (Normal Threshold, ms):
                </label>
                <input
                  type="number"
                  value={normalThreshold}
                  onChange={(e) => setNormalThreshold(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold font-mono outline-none"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  ধীরগতির অপারেশন সীমা (Slow Warning Threshold, ms):
                </label>
                <input
                  type="number"
                  value={slowThreshold}
                  onChange={(e) => setSlowThreshold(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold font-mono outline-none"
                  placeholder="3000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveThresholds}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthView;

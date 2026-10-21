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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'incidents' | 'performance' | 'events'>('overview');

  // Trigger diagnostics check
  const handleRunDiagnostics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await systemHealth.runSafeDiagnostics(firebaseConfig);
      setSnapshot(result);
    } catch (err) {
      console.error('[SystemHealthView] Failed to run diagnostics', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [firebaseConfig]);

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

    // Visibility-aware light listener (re-check when user switches back to this tab)
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

  // Save Thresholds
  const handleSaveThresholds = () => {
    const normal = Math.max(100, Number(normalThreshold) || 1000);
    const slow = Math.max(normal + 100, Number(slowThreshold) || 3000);
    systemHealth.setThresholds({ normalMs: normal, slowMs: slow });
    setIsThresholdModalOpen(false);
    handleRunDiagnostics();
  };

  // Reset Performance Metrics & Resolve Incidents
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

  // Status Badge Colors Helper
  const getStatusBadge = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Healthy • সচল ও নির্ভরযোগ্য',
          icon: CheckCircle2,
        };
      case 'DEGRADED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
          label: 'Degraded • ধীরগতি বা ব্যাকলগ',
          icon: AlertTriangle,
        };
      case 'OFFLINE':
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          dot: 'bg-slate-500',
          label: 'Offline • নেটওয়ার্ক বিচ্ছিন্ন',
          icon: WifiOff,
        };
      case 'UNAVAILABLE':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
          text: 'text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
          label: 'Unavailable • ক্রাইটিকাল সমস্যা',
          icon: AlertOctagon,
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          dot: 'bg-gray-400',
          label: 'Unknown • অজানা স্থিতি',
          icon: Info,
        };
    }
  };

  // Unauthorized Access Guard
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-200 dark:border-slate-700 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">প্রবেশাধিকার সংরক্ষিত</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            সিস্টেম হেলথ মনিটর ও টেকনিক্যাল ডায়াগনস্টিক তথ্য শুধুমাত্র অ্যাডমিন এবং ম্যানেজমেন্ট (MD) একাউন্টের জন্য অনুমোদিত।
          </p>
        </div>
      </div>
    );
  }

  const overall = getStatusBadge(snapshot?.overallStatus || 'UNKNOWN');
  const OverallIcon = overall.icon;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>সিস্টেম হেলথ মনিটর • Production Diagnostics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>System Health Monitor</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
            ব্রাউজার কানেক্টিভিটি, ফায়ারবেস ক্লাউড সংযোগ, লোকাল ডাটাবেস ও ব্যাকলগ সিঙ্কের রিয়েল-টাইম স্বাস্থ্য পরীক্ষা।
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-60 cursor-pointer"
            title="নিরাপদ রিড-অনলি ডায়াগনস্টিক চালান"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'পরীক্ষা হচ্ছে...' : 'Run Diagnostics'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            title="আইটি ও সাপোর্ট টিমের জন্য সেনিটাইজড রিপোর্ট কপি করুন"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'রিপোর্ট কপি হয়েছে' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsThresholdModalOpen(true)}
            className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="লেটেন্সি থ্রেশহোল্ড পরিবর্তন করুন"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('update-recovery')}
              className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-200 dark:border-blue-800"
              title="Safe Update & Recovery Center খুলুন"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safe Recovery Center →</span>
            </button>
          )}
        </div>
      </div>

      {/* OVERALL STATUS BANNER */}
      <div className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${overall.bg}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs shrink-0">
            <OverallIcon className={`w-5 h-5 ${overall.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${overall.dot} animate-pulse`} />
              <h2 className={`text-base font-black tracking-wide ${overall.text}`}>
                {overall.label}
              </h2>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-0.5">
              সর্বশেষ স্বয়ংক্রিয় পরীক্ষা:{' '}
              {snapshot?.timestamp
                ? new Date(snapshot.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'অপেক্ষমাণ...'}
            </p>
          </div>
        </div>

        {/* Sync / Incident Highlights */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 font-bold">
            <span className="text-gray-500">অফলাইন পেন্ডিং বিল:</span>
            <span className={`font-mono ${snapshot && snapshot.sync.pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {snapshot?.sync.pendingCount || 0}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 font-bold">
            <span className="text-gray-500">খোলা ইনসিডেন্ট:</span>
            <span className={`font-mono ${snapshot && snapshot.incidents.openCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {snapshot?.incidents.openCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          সার্ভিস ওভারভিউ (Overview)
        </button>
        <button
          onClick={() => setActiveSubTab('incidents')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'incidents'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>ইনসিডেন্ট লগ (Incidents)</span>
          {snapshot && snapshot.incidents.openCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
              {snapshot.incidents.openCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'performance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          পারফরম্যান্স ডায়াগনস্টিক (Latency)
        </button>
        <button
          onClick={() => setActiveSubTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'events'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          টেকনিক্যাল ইভেন্ট স্ট্রিম ({events.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CORE SERVICES */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Network Connectivity Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span>ইন্টারনেট নেটওয়ার্ক</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    snapshot?.network.online
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {snapshot?.network.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>ব্রাউজার কানেকশন:</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {snapshot?.network.online ? 'সক্রিয় (Active)' : 'সংযোগ বিচ্ছিন্ন'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>নেটওয়ার্ক টাইপ:</span>
                  <span className="font-bold text-gray-800 dark:text-white font-mono uppercase">
                    {snapshot?.network.effectiveType || 'Standard Web'}
                  </span>
                </div>
                {snapshot?.network.rtt !== undefined && (
                  <div className="flex justify-between">
                    <span>নেটওয়ার্ক RTT:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-white">{snapshot.network.rtt} ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Firebase Cloud Realtime Database */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                  <Cloud className="w-4 h-4 text-amber-500" />
                  <span>Firebase RTDB</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    snapshot?.firebase.connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {snapshot?.firebase.connected ? 'Connected' : snapshot?.firebase.status || 'Checking'}
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>সার্ভার রিচ্যাবিলিটি:</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {snapshot?.firebase.connected ? 'সরাসরি যুক্ত' : 'রেসপন্স নেই'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>রেসপন্স লেটেন্সি:</span>
                  <span
                    className={`font-mono font-bold ${
                      (snapshot?.firebase.latencyMs || 0) > 1000 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {snapshot?.firebase.latencyMs || 0} ms
                  </span>
                </div>
                <div className="flex justify-between truncate">
                  <span>সর্বশেষ সফল চেক:</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {snapshot?.firebase.lastSuccessfulCheck
                      ? new Date(snapshot.firebase.lastSuccessfulCheck).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Local Storage & IndexedDB */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>লোকাল ডাটাবেস (IDB)</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    snapshot?.storage.indexedDbAvailable
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {snapshot?.storage.indexedDbAvailable ? 'Available' : 'Failed'}
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>IndexedDB রিড/রাইট:</span>
                  <span className="font-bold text-emerald-600">
                    {snapshot?.storage.indexedDbAvailable ? 'সক্ষম (Pass)' : 'ব্যর্থ'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>LocalStorage স্টোরেজ:</span>
                  <span className="font-bold text-emerald-600">
                    {snapshot?.storage.localStorageAvailable ? 'সক্ষম' : 'ব্যর্থ'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>লোকাল রিড লেটেন্সি:</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-white">
                    {snapshot?.storage.latencyMs || 0} ms
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Sync Queue & Offline Backlog */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                  <span>সিঙ্ক কিউ (Sync Queue)</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    (snapshot?.sync.pendingCount || 0) === 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {(snapshot?.sync.pendingCount || 0) === 0 ? 'Up to Date' : `${snapshot?.sync.pendingCount} Pending`}
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>অফলাইন পেন্ডিং বিল:</span>
                  <span className="font-bold text-gray-800 dark:text-white font-mono">
                    {snapshot?.sync.pendingCount || 0} টি
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সর্বশেষ সফল সিঙ্ক:</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {snapshot?.sync.lastSuccessfulSync
                      ? new Date(snapshot.sync.lastSuccessfulSync).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
                      : 'অপেক্ষমাণ'}
                  </span>
                </div>
                {snapshot?.sync.longestPendingMinutes !== undefined && (
                  <div className="flex justify-between">
                    <span>সর্বোচ্চ অপেক্ষার সময়:</span>
                    <span className="font-bold text-amber-600">{snapshot.sync.longestPendingMinutes} মিনিট</span>
                  </div>
                )}
              </div>
              {(snapshot?.sync.pendingCount || 0) > 0 && (
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isSyncingQueue}
                  className="w-full mt-2 py-2 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                  <span>{isSyncingQueue ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক পুনরায় চালান'}</span>
                </button>
              )}
              {syncFeedback && (
                <p className="text-[11px] text-center font-bold text-purple-600 dark:text-purple-400 mt-1 animate-in fade-in">
                  {syncFeedback}
                </p>
              )}
            </div>

            {/* 5. Express API Server */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                  <Server className="w-4 h-4 text-cyan-500" />
                  <span>Express API ব্যাকএন্ড</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    snapshot?.server.available
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {snapshot?.server.available ? 'Healthy' : 'Unavailable'}
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>API রেসপন্স টাইম:</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-white">
                    {snapshot?.server.latencyMs || 0} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>সার্ভার আপটাইম:</span>
                  <span className="font-bold text-gray-800 dark:text-white font-mono">
                    {snapshot?.server.uptime ? `${Math.floor(snapshot.server.uptime / 60)} মিনিট` : 'Live'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Node রানটাইম:</span>
                  <span className="font-mono text-gray-500 text-[11px]">{snapshot?.server.version || 'v20+'}</span>
                </div>
              </div>
            </div>

            {/* 6. Performance Summary Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <span>অপারেশন লেটেন্সি সামারি</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {snapshot?.perf.totalTracked || 0} Tracked
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>স্বাভাবিক অপারেশন (&lt; {snapshot?.perf.thresholds.normalMs}ms):</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {Math.max(0, (snapshot?.perf.totalTracked || 0) - (snapshot?.perf.slowOperationsCount || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ধীরগতির অপারেশন (&gt; {snapshot?.perf.thresholds.slowMs}ms):</span>
                  <span className={`font-mono font-bold ${(snapshot?.perf.slowOperationsCount || 0) > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                    {snapshot?.perf.slowOperationsCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>কনফিগারেশন:</span>
                  <button
                    onClick={() => setIsThresholdModalOpen(true)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    থ্রেশহোল্ড পরিবর্তন করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT DETECTION & MANAGEMENT */}
      {activeSubTab === 'incidents' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> ফিল্টার:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none cursor-pointer"
              >
                <option value="ALL">সব স্ট্যাটাস ({snapshot?.incidents.list.length || 0})</option>
                <option value="OPEN">Open (সক্রিয়)</option>
                <option value="INVESTIGATING">Investigating (তদন্তাধীন)</option>
                <option value="RESOLVED">Resolved (সমাধানকৃত)</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none cursor-pointer"
              >
                <option value="ALL">সব তীব্রতা (Severity)</option>
                <option value="CRITICAL">Critical (জরুরি)</option>
                <option value="WARNING">Warning (সতর্কতা)</option>
                <option value="INFO">Info (সাধারণ)</option>
              </select>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none cursor-pointer"
              >
                <option value="ALL">সব সার্ভিস</option>
                <option value="Firebase">Firebase</option>
                <option value="SyncQueue">SyncQueue</option>
                <option value="IndexedDB">IndexedDB</option>
                <option value="Network">Network</option>
                <option value="ServerAPI">ServerAPI</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-500 font-bold">
                প্রদর্শিত হচ্ছে: {filteredIncidents.length} টি
              </span>
              {(snapshot?.incidents.openCount || 0) > 0 && (
                <button
                  type="button"
                  onClick={handleResolveAllIncidents}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  সবগুলো সমাধান করুন ({snapshot?.incidents.openCount})
                </button>
              )}
            </div>
          </div>

          {/* Incidents List */}
          {filteredIncidents.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                কোনো ইনসিডেন্ট পাওয়া যায়নি
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                নির্বাচিত ফিল্টারে কোনো ইনসিডেন্ট নেই। সমস্ত সিস্টেম স্বাভাবিক নিয়মে কাজ করছে।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all space-y-3 ${
                    inc.status === 'RESOLVED'
                      ? 'border-gray-200 dark:border-slate-700 opacity-75'
                      : inc.severity === 'CRITICAL'
                      ? 'border-rose-300 dark:border-rose-800 shadow-sm'
                      : 'border-amber-300 dark:border-amber-800 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : inc.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-[10px] font-mono font-bold text-gray-700 dark:text-gray-300">
                        #{inc.id} • {inc.affectedService}
                      </span>
                      {inc.occurrenceCount > 1 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                          রিপিট: {inc.occurrenceCount} বার
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black self-start sm:self-auto ${
                        inc.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : inc.status === 'INVESTIGATING'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white">{inc.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1 leading-relaxed">
                      {inc.message}
                    </p>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-2 text-xs">
                    <ShieldAlert className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-700 dark:text-gray-200 block">প্রস্তাবিত পদক্ষেপ (Recommended Action):</span>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">{inc.recommendedAction}</span>
                    </div>
                  </div>

                  {/* Notes List */}
                  {inc.notes && inc.notes.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">অ্যাডমিন নোটস:</span>
                      {inc.notes.map((n, idx) => (
                        <div key={idx} className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{n.author}</span>: {n.text}
                          <span className="text-[10px] text-gray-400 ml-1">
                            ({new Date(n.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons for Admins */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-700 text-xs">
                    <div className="text-[10px] text-gray-400">
                      প্রথম: {new Date(inc.firstOccurrence).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })} •{' '}
                      সর্বশেষ: {new Date(inc.lastOccurrence).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <div className="flex items-center gap-2">
                      {inc.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeIncident(inc.id)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          ইনভেস্টিগেট করুন
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedIncidentForNote(inc)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        নোট যোগ করুন
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

      {/* TAB 3: PERFORMANCE DIAGNOSTICS & MEASUREMENTS */}
      {activeSubTab === 'performance' && (
        <div className="space-y-6">
          {/* Latency Thresholds Banner */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-black text-gray-900 dark:text-white block">লেটেন্সি ডায়াগনস্টিক প্যারামিটার:</span>
              <span className="text-gray-500 font-medium">
                স্বাভাবিক: &lt; {snapshot?.perf.thresholds.normalMs}ms | ধীরগতি ওয়ার্নিং: {snapshot?.perf.thresholds.normalMs} - {snapshot?.perf.thresholds.slowMs}ms | ক্রাইটিকাল: &gt; {snapshot?.perf.thresholds.slowMs}ms
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetDiagnostics}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all cursor-pointer"
              >
                মেট্রিক হিস্ট্রি রিসেট
              </button>
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl transition-all cursor-pointer"
              >
                থ্রেশহোল্ড পরিবর্তন
              </button>
            </div>
          </div>

          {/* Operation Summary Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 font-bold text-sm text-gray-800 dark:text-white flex items-center justify-between">
              <span>অপারেশন ভিত্তিক গড় লেটেন্সি (Aggregate Metrics)</span>
              <span className="text-xs text-gray-400 font-normal">রিয়েল-টাইম মেপে নেওয়া সময়</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">অ্যাকশন / সার্ভিস</th>
                    <th className="py-3 px-4">মোট ট্র্যাকিং</th>
                    <th className="py-3 px-4">গড় সময় (Avg)</th>
                    <th className="py-3 px-4">সর্বোচ্চ সময় (Max)</th>
                    <th className="py-3 px-4">নেটওয়ার্ক সময়</th>
                    <th className="py-3 px-4">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 font-medium">
                  {snapshot?.perf.summary && Object.keys(snapshot.perf.summary).length > 0 ? (
                    Object.entries(snapshot.perf.summary).map(([action, s]) => {
                      const isSlow = s.avgTotal > (snapshot.perf.thresholds.slowMs || 3000);
                      const isWarn = s.avgTotal > (snapshot.perf.thresholds.normalMs || 1000);
                      return (
                        <tr key={action} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-bold text-gray-800 dark:text-white">{action}</td>
                          <td className="py-3 px-4 font-mono">{s.count} বার</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {s.avgTotal.toFixed(1)} ms
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                            {s.maxTotal.toFixed(1)} ms
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-500">{s.avgNet.toFixed(1)} ms</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isSlow
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : isWarn
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {isSlow ? 'Critical' : isWarn ? 'Slow' : 'Fast'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        এখনো পর্যন্ত কোনো অপারেশন পরিমাপ করা হয়নি। অ্যাপ্লিকেশন ব্যবহার করলে স্বয়ংক্রিয়ভাবে পরিমাপ হবে।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Performance Metric Samples */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-3">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>সাম্প্রতিক অপারেশন মেজারমেন্টস (Recent Samples)</span>
            </h3>
            <div className="space-y-2">
              {snapshot?.perf.recentMetrics && snapshot.perf.recentMetrics.length > 0 ? (
                snapshot.perf.recentMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs font-medium"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">{m.action}</span>
                      <span className="text-[10px] text-gray-400">
                        ক্যাটাগরি: {m.category} • নেটওয়ার্ক: {m.networkDuration}ms • রেন্ডার: {m.renderDuration}ms
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold block ${
                          m.totalDuration > 3000
                            ? 'text-rose-600'
                            : m.totalDuration > 1000
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {m.totalDuration} ms
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(m.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">কোনো সাম্প্রতিক স্যাম্পল নেই।</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICAL DIAGNOSTIC EVENT STREAM */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-500">
              টেকনিক্যাল অডিট হিস্ট্রি (সীমাবদ্ধ মেমোরি: সর্বোচ্চ ১০০টি ইভেন্ট)
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              নো পার্সোনাল ডাটা / নো বিল বিবরণী
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700/60 overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">কোনো টেকনিক্যাল ইভেন্ট রেকর্ড হয়নি।</div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          ev.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : ev.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ev.type}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-white font-mono text-[11px]">
                        [{ev.service}]
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">{ev.summary}</p>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString('bn-BD', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RESOLVE INCIDENT MODAL */}
      {selectedIncidentForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white">ইনসিডেন্ট সমাধান নিশ্চিত করুন</h3>
              <button onClick={() => setSelectedIncidentForResolve(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              <b>#{selectedIncidentForResolve.id}:</b> {selectedIncidentForResolve.title}
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">সমাধানের নোট (Resolution Note):</label>
              <textarea
                value={resolveNoteInput}
                onChange={(e) => setResolveNoteInput(e.target.value)}
                placeholder="সমস্যাটি কীভাবে সমাধান হয়েছে বা কী পদক্ষেপ নেওয়া হয়েছে লিখুন..."
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedIncidentForResolve(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold cursor-pointer"
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
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white">ইনসিডেন্টে নোট যোগ করুন</h3>
              <button onClick={() => setSelectedIncidentForNote(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="তদন্ত নোট বা পর্যবেক্ষণ লিখুন..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedIncidentForNote(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
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
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white">লেটেন্সি ডায়াগনস্টিক থ্রেশহোল্ড</h3>
              <button onClick={() => setIsThresholdModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              অপারেশনের সময়কাল পরিমাপ করে কখন সতর্কতা এবং কখন ক্রাইটিকাল রিপোর্ট করা হবে তা নির্ধারণ করুন।
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  স্বাভাবিক অপারেশন সীমা (Normal Threshold, ms):
                </label>
                <input
                  type="number"
                  value={normalThreshold}
                  onChange={(e) => setNormalThreshold(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs font-bold font-mono outline-none"
                  placeholder="1000"
                />
                <span className="text-[10px] text-gray-400">ডিফল্ট: ১০০০ মিলি-সেকেন্ড (১ সেকেন্ড)</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  ধীরগতির অপারেশন সীমা (Slow Warning Threshold, ms):
                </label>
                <input
                  type="number"
                  value={slowThreshold}
                  onChange={(e) => setSlowThreshold(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs font-bold font-mono outline-none"
                  placeholder="3000"
                />
                <span className="text-[10px] text-gray-400">ডিফল্ট: ৩০০০ মিলি-সেকেন্ড (৩ সেকেন্ড)</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveThresholds}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthView;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Smartphone,
  Phone,
  MessageSquare,
  Activity,
  Zap,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Sparkles,
  ArrowUpDown,
  Download,
  AlertOctagon
} from 'lucide-react';
import { Staff, StaffLocation, UserRole } from '../types';

interface StaffBatteryProps {
  staffList: Staff[];
  onlineUsers?: Record<string, any>;
  liveLocations?: Record<string, StaffLocation>;
  currentUser?: string;
  role?: UserRole;
}

export const StaffBatteryView: React.FC<StaffBatteryProps> = ({
  staffList = [],
  onlineUsers = {},
  liveLocations = {},
  currentUser,
  role = UserRole.ADMIN,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'LOW' | 'CHARGING' | 'HEALTHY'>('ALL');
  const [sortBy, setSortBy] = useState<'BATTERY_ASC' | 'BATTERY_DESC' | 'NAME'>('BATTERY_ASC');
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Local client device battery detection
  const [localBattery, setLocalBattery] = useState<{
    level: number | null;
    charging: boolean;
    supported: boolean;
  }>({ level: null, charging: false, supported: false });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((b: any) => {
          setLocalBattery({
            level: typeof b.level === 'number' ? Math.round(b.level * 100) : null,
            charging: !!b.charging,
            supported: true,
          });
          const update = () => {
            setLocalBattery({
              level: typeof b.level === 'number' ? Math.round(b.level * 100) : null,
              charging: !!b.charging,
              supported: true,
            });
          };
          b.addEventListener('levelchange', update);
          b.addEventListener('chargingchange', update);
        })
        .catch(() => {
          setLocalBattery({ level: null, charging: false, supported: false });
        });
    }
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    const safeStaffList = staffList || [];
    const activeStaff = safeStaffList.filter((s) => s.status === 'ACTIVE' && !s.deletedAt);

    let onlineDevices: Array<{
      staffId: string;
      staffName: string;
      role: string;
      photo?: string;
      phone?: string;
      designation?: string;
      department?: string;
      deviceName: string;
      batteryLevel: number | null;
      isCharging: boolean;
      lastUpdated: string;
      powerRisk: 'CRITICAL' | 'LOW' | 'MODERATE' | 'HEALTHY' | 'UNAVAILABLE';
      riskLabel: string;
      isLocalUser: boolean;
    }> = [];

    activeStaff.forEach((staff) => {
      const uData = onlineUsers ? onlineUsers[staff.name] : null;
      const locData = liveLocations ? liveLocations[staff.id] : null;

      const isOnline =
        Boolean(uData && uData.status === 'online') ||
        Boolean(
          locData &&
            new Date().getTime() - new Date(locData.timestamp).getTime() < 15 * 60 * 1000
        ) ||
        staff.name === currentUser;

      if (!isOnline && !isSimulationMode) return;

      const isLocal = staff.name === currentUser;
      let batteryPct: number | null = null;
      let charging = false;

      if (isLocal && localBattery.supported && localBattery.level !== null) {
        batteryPct = localBattery.level;
        charging = localBattery.charging;
      } else if (uData && typeof uData.batteryLevel === 'number') {
        batteryPct = uData.batteryLevel <= 1 ? Math.round(uData.batteryLevel * 100) : Math.round(uData.batteryLevel);
        charging = !!uData.isCharging;
      } else if (locData && typeof locData.batteryLevel === 'number') {
        batteryPct = locData.batteryLevel <= 1 ? Math.round(locData.batteryLevel * 100) : Math.round(locData.batteryLevel);
        charging = false;
      }

      const devName =
        (uData && uData.deviceName) ||
        (locData && locData.deviceName) ||
        (isLocal && typeof navigator !== 'undefined'
          ? /Android/i.test(navigator.userAgent)
            ? 'Android Phone'
            : /iPhone|iPad/i.test(navigator.userAgent)
            ? 'Apple iPhone (iOS)'
            : 'Office Workstation'
          : 'Staff Device');

      let powerRisk: 'CRITICAL' | 'LOW' | 'MODERATE' | 'HEALTHY' | 'UNAVAILABLE' = 'UNAVAILABLE';
      let riskLabel = 'ডাটা অপ্রাপ্য';

      if (batteryPct !== null) {
        if (batteryPct < 20) {
          powerRisk = 'CRITICAL';
          riskLabel = 'মারাত্মক শাটডাউন ঝুঁকি (<২০%)';
        } else if (batteryPct <= 35) {
          powerRisk = 'LOW';
          riskLabel = 'লো ব্যাটারি (২০-৩৫%)';
        } else if (batteryPct <= 70) {
          powerRisk = 'MODERATE';
          riskLabel = 'পর্যাপ্ত চার্জ (৩৬-৭০%)';
        } else {
          powerRisk = 'HEALTHY';
          riskLabel = 'উত্তম হেলথ (>৭০%)';
        }
      }

      onlineDevices.push({
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role || 'STAFF',
        photo: staff.photo,
        phone: staff.phone,
        designation: (staff as any).designation || 'স্টাফ মেম্বার',
        department: (staff as any).department || 'অফিস',
        deviceName: devName,
        batteryLevel: batteryPct,
        isCharging: charging,
        lastUpdated: (uData && uData.timestamp) || (locData && locData.timestamp) || new Date().toISOString(),
        powerRisk,
        riskLabel,
        isLocalUser: isLocal,
      });
    });

    if (isSimulationMode) {
      const demoDevices = [
        {
          staffId: 'sim-staff-1',
          staffName: 'মেহেদী হাসান (Field Sourcing)',
          role: 'STAFF',
          phone: '01711223344',
          designation: 'ফিল্ড অফিসার',
          department: 'সোর্সিং',
          deviceName: 'Samsung Galaxy A54 5G',
          batteryLevel: 14,
          isCharging: false,
          lastUpdated: new Date().toISOString(),
          powerRisk: 'CRITICAL' as const,
          riskLabel: 'মারাত্মক শাটডাউন ঝুঁকি (১৪%)',
          isLocalUser: false,
        },
        {
          staffId: 'sim-staff-2',
          staffName: 'রহিম আহমেদ (Delivery Lead)',
          role: 'STAFF',
          phone: '01811556677',
          designation: 'ডেলিভারি এক্সিকিউটিভ',
          department: 'লজিস্টিকস',
          deviceName: 'Xiaomi Redmi Note 12',
          batteryLevel: 28,
          isCharging: false,
          lastUpdated: new Date().toISOString(),
          powerRisk: 'LOW' as const,
          riskLabel: 'লো ব্যাটারি (২৮%)',
          isLocalUser: false,
        },
        {
          staffId: 'sim-staff-3',
          staffName: 'আরিফ হোসেন (Accounts/Billing)',
          role: 'STAFF',
          phone: '01911889900',
          designation: 'অ্যাকাউন্টিং অফিসার',
          department: 'হিসাব বিভাগ',
          deviceName: 'Vivo V27 5G',
          batteryLevel: 84,
          isCharging: true,
          lastUpdated: new Date().toISOString(),
          powerRisk: 'HEALTHY' as const,
          riskLabel: 'উত্তম হেলথ (৮৪%) - চার্জিং সংযুক্ত ⚡',
          isLocalUser: false,
        },
        {
          staffId: 'sim-staff-4',
          staffName: 'তানভীর আহমেদ (Merchandising)',
          role: 'STAFF',
          phone: '01611334455',
          designation: 'মার্চেন্ডাইজার',
          department: 'মার্কেটিং',
          deviceName: 'iPhone 13 Pro',
          batteryLevel: 58,
          isCharging: false,
          lastUpdated: new Date().toISOString(),
          powerRisk: 'MODERATE' as const,
          riskLabel: 'পর্যাপ্ত চার্জ (৫৮%)',
          isLocalUser: false,
        },
      ];
      onlineDevices = [...onlineDevices.filter((d) => d.isLocalUser), ...demoDevices];
    }

    const devicesWithBattery = onlineDevices.filter((d) => d.batteryLevel !== null);
    const averageBattery =
      devicesWithBattery.length > 0
        ? Math.round(
            devicesWithBattery.reduce((sum, d) => sum + (d.batteryLevel || 0), 0) /
              devicesWithBattery.length
          )
        : null;

    const criticalDevices = onlineDevices.filter((d) => d.powerRisk === 'CRITICAL');
    const lowDevices = onlineDevices.filter((d) => d.powerRisk === 'LOW');
    const proneToPowerIssues = [...criticalDevices, ...lowDevices];
    const chargingDevices = onlineDevices.filter((d) => d.isCharging);
    const healthyDevices = onlineDevices.filter((d) => d.powerRisk === 'HEALTHY' || d.powerRisk === 'MODERATE');

    return {
      onlineDevices,
      devicesWithBattery,
      averageBattery,
      criticalDevices,
      lowDevices,
      proneToPowerIssues,
      chargingDevices,
      healthyDevices,
      totalOnline: onlineDevices.length,
    };
  }, [staffList, onlineUsers, liveLocations, currentUser, localBattery, isSimulationMode]);

  // Filter and sort device list
  const filteredDevices = useMemo(() => {
    let list = [...analytics.onlineDevices];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.staffName.toLowerCase().includes(q) ||
          d.deviceName.toLowerCase().includes(q) ||
          (d.phone && d.phone.includes(q))
      );
    }

    if (filterType === 'CRITICAL') {
      list = list.filter((d) => d.powerRisk === 'CRITICAL');
    } else if (filterType === 'LOW') {
      list = list.filter((d) => d.powerRisk === 'LOW' || d.powerRisk === 'CRITICAL');
    } else if (filterType === 'CHARGING') {
      list = list.filter((d) => d.isCharging);
    } else if (filterType === 'HEALTHY') {
      list = list.filter((d) => d.powerRisk === 'HEALTHY' || d.powerRisk === 'MODERATE');
    }

    list.sort((a, b) => {
      if (sortBy === 'BATTERY_ASC') {
        const valA = a.batteryLevel !== null ? a.batteryLevel : 999;
        const valB = b.batteryLevel !== null ? b.batteryLevel : 999;
        return valA - valB;
      }
      if (sortBy === 'BATTERY_DESC') {
        const valA = a.batteryLevel !== null ? a.batteryLevel : -1;
        const valB = b.batteryLevel !== null ? b.batteryLevel : -1;
        return valB - valA;
      }
      return a.staffName.localeCompare(b.staffName);
    });

    return list;
  }, [analytics.onlineDevices, searchQuery, filterType, sortBy]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getBatteryColorClass = (pct: number | null) => {
    if (pct === null) return 'text-gray-400 bg-gray-50 border-gray-200';
    if (pct < 20) return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    if (pct <= 35) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    if (pct <= 70) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
  };

  const getBatteryBarColor = (pct: number | null) => {
    if (pct === null) return 'bg-gray-300';
    if (pct < 20) return 'bg-red-500';
    if (pct <= 35) return 'bg-amber-500';
    if (pct <= 70) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 animate-pulse" /> রিয়েল-টাইম পাওয়ার ও ডিভাইস হেলথ
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <Battery className="w-8 h-8 text-emerald-400" />
              স্টাফ ডিভাইস ব্যাটারি মনিটর
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              অনলাইনে থাকা সকল কর্মরত স্টাফদের মোবাইল ও ডিভাইসের ব্যাটারি স্ট্যাটাস, পাওয়ার ট্রেন্ড এবং সম্ভাব্য শাটডাউন ঝুঁকি মনিটর করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSimulationMode(!isSimulationMode)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                isSimulationMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isSimulationMode ? 'সিমুলেশন চলছে (বন্ধ করুন)' : 'টেস্ট ডেমো ডাটা চালু'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Average Battery Health & Power Risk Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Battery Health */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-b-4 border-indigo-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              গড় ব্যাটারি হেলথ
            </span>
            <div className={`p-2.5 rounded-xl ${
              analytics.averageBattery === null
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                : analytics.averageBattery < 25
                ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                : analytics.averageBattery < 50
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}>
              <Battery className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {analytics.averageBattery !== null ? `${analytics.averageBattery}%` : 'N/A'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({analytics.devicesWithBattery.length} টি ডিভাইস ট্র্যাকড)
            </span>
          </div>
          {/* Progress visual */}
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getBatteryBarColor(analytics.averageBattery)}`}
              style={{ width: `${Math.min(analytics.averageBattery || 0, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
            {analytics.averageBattery === null
              ? 'পর্যাপ্ত সেন্সর ডাটা নেই'
              : analytics.averageBattery >= 60
              ? '✅ অনলাইন ফ্লিট পাওয়ার চমৎকার'
              : analytics.averageBattery >= 40
              ? '⚠️ পাওয়ার স্বাভাবিক সীমার মধ্যে'
              : '🚨 গড় পাওয়ার কম, অনেকেই চার্জে দেননি'}
          </p>
        </div>

        {/* Metric 2: Prone to Power Issues / Critical */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-b-4 border-red-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ঝুঁকিপূর্ণ ডিভাইস
            </span>
            <div className={`p-2.5 rounded-xl ${
              analytics.proneToPowerIssues.length > 0
                ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 animate-pulse'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-600 dark:text-red-400">
              {analytics.proneToPowerIssues.length} টি
            </span>
            {analytics.criticalDevices.length > 0 && (
              <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
                {analytics.criticalDevices.length} ক্রিটিক্যাল
              </span>
            )}
          </div>
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-3 font-semibold">
            {analytics.criticalDevices.length > 0
              ? 'শাটডাউন ও অফলাইন হওয়ার প্রবল সম্ভাবনা (<২০%)'
              : analytics.lowDevices.length > 0
              ? 'লো ব্যাটারি রয়েছে, চার্জ করা প্রয়োজন'
              : 'সব ডিভাইসে নিরাপদ চার্জ রয়েছে'}
          </p>
        </div>

        {/* Metric 3: Currently Charging */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-b-4 border-amber-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              চার্জিং অবস্থায় আছে
            </span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <BatteryCharging className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {analytics.chargingDevices.length} টি
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">ডিভাইস চার্জ হচ্ছে</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 font-medium">
            চার্জারের সাথে সংযুক্ত এবং ব্যাকআপ নিশ্চিত
          </p>
        </div>

        {/* Metric 4: Total Active Online Staff */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-b-4 border-emerald-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              মোট অনলাইন স্টাফ
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {analytics.totalOnline} জন
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">লাইভ উপস্থিতি</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 font-medium">
            সরাসরি ক্লাউড সকেট অথবা জিপিএস ট্র্যাকিং সংযুক্ত
          </p>
        </div>
      </div>

      {/* Critical Power Warning Banner if devices at risk */}
      {analytics.criticalDevices.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-base">
                জরুরি সতর্কতা: {analytics.criticalDevices.length} টি স্টাফ ডিভাইস শাটডাউন ঝুঁকিতে রয়েছে!
              </h4>
              <p className="text-xs text-red-100 mt-0.5">
                {analytics.criticalDevices.map((d) => d.staffName).join(', ')} — চার্জ ২০% এর কম। জরুরি কল বা হোয়াটসঅ্যাপ নোটিশ পাঠান।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analytics.criticalDevices[0]?.phone && (
              <a
                href={`https://wa.me/88${analytics.criticalDevices[0].phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `জরুরি অফিস নোটিশ: প্রিয় ${analytics.criticalDevices[0].staffName}, আপনার ডিভাইসের ব্যাটারি মাত্রাঙ্ক কম (${analytics.criticalDevices[0].batteryLevel}%)। অবিলম্বে ফোন চার্জে লাগান যাতে ফিল্ড ট্র্যাকিং বা অফিস যোগাযোগে সমস্যা না হয়।`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> হোয়াটসঅ্যাপ এ সতর্কবার্তা পাঠান
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Table / Device List Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Controls: Search, Filter, Sort */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">অনলাইন ডিভাইস তালিকা ও ব্যাটারি লেভেল</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                মোট ফিল্টারকৃত ডিভাইস: {filteredDevices.length} টি
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 md:flex-initial">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="স্টাফ নাম বা ফোন মডেল খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'ALL'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                সকল ({analytics.totalOnline})
              </button>
              <button
                onClick={() => setFilterType('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  filterType === 'CRITICAL'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                ঝুঁকিপূর্ণ ({analytics.proneToPowerIssues.length})
              </button>
              <button
                onClick={() => setFilterType('CHARGING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  filterType === 'CHARGING'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                চার্জিং ({analytics.chargingDevices.length})
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => {
                if (sortBy === 'BATTERY_ASC') setSortBy('BATTERY_DESC');
                else if (sortBy === 'BATTERY_DESC') setSortBy('NAME');
                else setSortBy('BATTERY_ASC');
              }}
              className="p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1 hover:bg-gray-100"
              title="সর্টিং পরিবর্তন করুন"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortBy === 'BATTERY_ASC' ? 'কম চার্জ আগে' : sortBy === 'BATTERY_DESC' ? 'বেশি চার্জ আগে' : 'নাম অনুসারে'}
            </button>
          </div>
        </div>

        {/* Device Table / Responsive List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">স্টাফ মেম্বার</th>
                <th className="py-3 px-4">ডিভাইস ও মডেল</th>
                <th className="py-3 px-4">ব্যাটারি লেভেল</th>
                <th className="py-3 px-4">পাওয়ার স্ট্যাটাস / ঝুঁকি</th>
                <th className="py-3 px-4">সর্বশেষ আপডেট</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {filteredDevices.map((device) => {
                const isExpanded = expandedStaffId === device.staffId;

                return (
                  <React.Fragment key={device.staffId}>
                    <tr className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors">
                      {/* Staff Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {device.photo ? (
                            <img
                              src={device.photo}
                              alt={device.staffName}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shrink-0">
                              {device.staffName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {device.staffName}
                              {device.isLocalUser && (
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black">
                                  আপনি
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">
                              {device.designation} • {device.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Device Model */}
                      <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{device.deviceName}</span>
                        </div>
                      </td>

                      {/* Battery Level */}
                      <td className="py-3.5 px-4">
                        {device.batteryLevel !== null ? (
                          <div className="space-y-1.5 min-w-[130px]">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1">
                                {device.isCharging ? (
                                  <BatteryCharging className="w-4 h-4 text-amber-500 animate-pulse" />
                                ) : (
                                  <Battery className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                )}
                                {device.batteryLevel}%
                              </span>
                              {device.isCharging && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded">
                                  চার্জিং
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${getBatteryBarColor(device.batteryLevel)}`}
                                style={{ width: `${Math.min(device.batteryLevel, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">সেন্সর ডাটা অনুপলব্ধ</span>
                        )}
                      </td>

                      {/* Power Risk / Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getBatteryColorClass(
                            device.batteryLevel
                          )}`}
                        >
                          {device.powerRisk === 'CRITICAL' ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                              মারাত্মক শাটডাউন ঝুঁকি
                            </>
                          ) : device.powerRisk === 'LOW' ? (
                            <>
                              <BatteryWarning className="w-3.5 h-3.5" />
                              লো ব্যাটারি (চার্জ প্রয়োজন)
                            </>
                          ) : device.powerRisk === 'MODERATE' ? (
                            <>
                              <Battery className="w-3.5 h-3.5" />
                              স্বাভাবিক
                            </>
                          ) : device.powerRisk === 'HEALTHY' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              উত্তম হেলথ
                            </>
                          ) : (
                            'N/A'
                          )}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(device.lastUpdated).toLocaleTimeString('bn-BD', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {device.phone && (
                            <>
                              <a
                                href={`tel:${device.phone}`}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                                title="সরাসরি কল দিন"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/88${device.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `অফিস সতর্কতা: প্রিয় ${device.staffName}, আপনার ডিভাইসের ব্যাটারি মাত্রাঙ্ক (${device.batteryLevel !== null ? device.batteryLevel + '%' : 'কম'})। কাজের প্রয়োজনে অনুগ্রহ করে অবিলম্বে চার্জে লাগান।`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 transition-colors"
                                title="হোয়াটসঅ্যাপে সতর্কবার্তা পাঠান"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => setExpandedStaffId(isExpanded ? null : device.staffId)}
                            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                            title="বিস্তারিত দেখুন"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Device Diagnostics */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-gray-900/40">
                        <td colSpan={6} className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                              <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-indigo-500" />
                                {device.staffName} এর ডিভাইস ডায়াগনস্টিক তথ্য
                              </h4>
                              {device.phone && (
                                <button
                                  onClick={() => handleCopy(device.phone!, device.staffId)}
                                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  {copiedText === device.staffId ? 'ফোন নম্বর কপি হয়েছে!' : `ফোন নম্বর: ${device.phone}`}
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">ডিভাইস ও ব্রাউজার</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{device.deviceName}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">পাওয়ার রিস্ক লেভেল</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{device.riskLabel}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">পরামর্শ / রিকমেন্ডেশন</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {device.batteryLevel !== null && device.batteryLevel < 20
                                    ? 'জরুরি ভিত্তিতে পাওয়ার ব্যাংক বা চার্জার লাগাতে বলুন।'
                                    : device.batteryLevel !== null && device.batteryLevel <= 35
                                    ? 'কাজে বের হওয়ার আগে পর্যাপ্ত চার্জ নিশ্চিত করতে বলুন।'
                                    : 'ব্যাটারি লেভেল স্থিতিশীল এবং কাজের উপযোগী।'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Battery className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold">কোনো উপযুক্ত অনলাইন স্টাফ ডিভাইস খুঁজে পাওয়া যায়নি</p>
                    <p className="text-xs text-gray-400 mt-1">
                      স্টাফ অনলাইনে আসলে তাদের ডিভাইসের ব্যাটারি স্ট্যাটাস স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হবে।
                    </p>
                    {!isSimulationMode && (
                      <button
                        onClick={() => setIsSimulationMode(true)}
                        className="mt-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100"
                      >
                        সিমুলেশন ডাটা পরীক্ষা করুন
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default StaffBatteryView;

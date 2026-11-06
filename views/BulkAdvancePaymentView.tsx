import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  WalletCards,
  UsersRound,
  CheckCircle2,
  AlertTriangle,
  Search,
  RotateCcw,
  Send,
  Printer,
  Download,
  Calendar,
  Layers,
  Building2,
  Coins,
  History,
  Info,
  ShieldCheck,
  Check,
  ChevronRight,
  Filter,
  DollarSign,
  Plus,
  Sparkles,
  X,
  CreditCard,
  FileCheck,
  Clock,
  Briefcase
} from 'lucide-react';
import { Staff, AdvanceLog, UserRole } from '../types';

interface BulkAdvancePaymentProps {
  staffList: Staff[];
  advances: AdvanceLog[];
  setAdvances: React.Dispatch<React.SetStateAction<AdvanceLog[]>>;
  role: UserRole;
  currentUser: string | null;
  cashOnHand?: number;
  onNavigateToLedger?: () => void;
  onBack?: () => void;
}

interface StaffAdvanceInput {
  amount: string; // Stored as clean numeric string
  note: string;
}

interface BatchTransactionSummary {
  batchId: string;
  batchNote: string;
  type: 'REGULAR' | 'SALARY';
  date: string;
  executedBy: string;
  totalAmount: number;
  recipientCount: number;
  items: {
    transactionId: string;
    staffId: string;
    staffName: string;
    designation: string;
    amount: number;
    note: string;
  }[];
  timestamp: string;
}

export const BulkAdvancePaymentView: React.FC<BulkAdvancePaymentProps> = ({
  staffList = [],
  advances = [],
  setAdvances,
  role,
  currentUser,
  cashOnHand,
  onNavigateToLedger,
  onBack,
}) => {
  // Access control
  const isAuthorized = role === UserRole.ADMIN || role === UserRole.MD;

  // View state: 'entry' or 'history'
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  // Batch Metadata
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceType, setAdvanceType] = useState<'REGULAR' | 'SALARY'>('REGULAR');
  const [globalBatchNote, setGlobalBatchNote] = useState('');

  // Per-staff input state
  const [staffInputs, setStaffInputs] = useState<Record<string, StaffAdvanceInput>>({});

  // Quick Preset modal
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetAmount, setPresetAmount] = useState('');
  const [presetTarget, setPresetTarget] = useState<'all' | 'filtered'>('filtered');

  // Confirmation & safety modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Post-submission summary receipt
  const [latestSummary, setLatestSummary] = useState<BatchTransactionSummary | null>(null);

  // Track focused card for auto-scroll on mobile
  const [activeFocusedId, setActiveFocusedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 1. Calculate existing Regular Advance balance per staff member
  const staffBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    (advances || []).forEach((adv) => {
      if (adv.isDeleted || adv.isHardDeleted) return;
      if (!balances[adv.staffId]) balances[adv.staffId] = 0;
      if (adv.type === 'REGULAR' || !adv.type) {
        balances[adv.staffId] += Number(adv.amount || 0);
      }
    });
    return balances;
  }, [advances]);

  // 2. Filter eligible staff (exclude inactive/deleted if active filter enabled)
  const eligibleStaff = useMemo(() => {
    return (staffList || []).filter((s) => {
      if (s.isHardDeleted || s.deletedAt) return false;
      if (filterActiveOnly) {
        return s.status === 'ACTIVE' || !s.status;
      }
      return true;
    });
  }, [staffList, filterActiveOnly]);

  // 3. Search filtered staff list
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return eligibleStaff;
    return eligibleStaff.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const sId = (s.staffId || '').toLowerCase();
      const des = (s.designation || '').toLowerCase();
      const mobile = (s.mobile || '').toLowerCase();
      return name.includes(q) || sId.includes(q) || des.includes(q) || mobile.includes(q);
    });
  }, [eligibleStaff, searchQuery]);

  // 4. Live Financial KPI Metrics
  const metrics = useMemo(() => {
    let totalAdvanceAmount = 0;
    let recipientsCount = 0;
    let zeroCount = 0;

    eligibleStaff.forEach((s) => {
      const input = staffInputs[s.id];
      const amt = Number(input?.amount || 0);
      if (amt > 0) {
        totalAdvanceAmount += amt;
        recipientsCount += 1;
      } else {
        zeroCount += 1;
      }
    });

    return {
      totalAdvanceAmount,
      recipientsCount,
      totalEligible: eligibleStaff.length,
      zeroCount,
    };
  }, [eligibleStaff, staffInputs]);

  // Handle amount change for single staff
  const handleAmountChange = (staffId: string, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setStaffInputs((prev) => ({
      ...prev,
      [staffId]: {
        amount: cleaned,
        note: prev[staffId]?.note || '',
      },
    }));
  };

  // Quick increment buttons (+1000, +2000, +5000, +10000)
  const handleQuickAdd = (staffId: string, addAmount: number) => {
    const current = Number(staffInputs[staffId]?.amount || 0);
    const nextAmount = current + addAmount;
    setStaffInputs((prev) => ({
      ...prev,
      [staffId]: {
        amount: String(nextAmount),
        note: prev[staffId]?.note || '',
      },
    }));
  };

  // Clear single staff amount
  const handleClearSingle = (staffId: string) => {
    setStaffInputs((prev) => {
      const next = { ...prev };
      delete next[staffId];
      return next;
    });
  };

  // Set note for single staff
  const handleNoteChange = (staffId: string, noteVal: string) => {
    setStaffInputs((prev) => ({
      ...prev,
      [staffId]: {
        amount: prev[staffId]?.amount || '',
        note: noteVal,
      },
    }));
  };

  // Apply preset to all or filtered staff
  const handleApplyPreset = () => {
    const amt = Number(presetAmount);
    if (isNaN(amt) || amt <= 0) return;

    const targets = presetTarget === 'filtered' ? filteredStaff : eligibleStaff;
    setStaffInputs((prev) => {
      const next = { ...prev };
      targets.forEach((s) => {
        next[s.id] = {
          amount: String(amt),
          note: next[s.id]?.note || '',
        };
      });
      return next;
    });
    setShowPresetModal(false);
    setPresetAmount('');
  };

  // Reset all entered amounts
  const handleResetAll = () => {
    setStaffInputs({});
    setGlobalBatchNote('');
    setShowResetConfirmModal(false);
  };

  // Focus & smart scroll to keep active input visible above keyboard on mobile
  const handleInputFocus = (staffId: string) => {
    setActiveFocusedId(staffId);
    setTimeout(() => {
      const el = cardRefs.current[staffId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Prepared recipients list for review modal
  const recipientsList = useMemo(() => {
    const list: {
      staff: Staff;
      amount: number;
      note: string;
      currentBalance: number;
    }[] = [];

    eligibleStaff.forEach((s) => {
      const input = staffInputs[s.id];
      const amt = Number(input?.amount || 0);
      if (amt > 0) {
        list.push({
          staff: s,
          amount: amt,
          note: input?.note || globalBatchNote || '',
          currentBalance: staffBalances[s.id] || 0,
        });
      }
    });

    return list;
  }, [eligibleStaff, staffInputs, globalBatchNote, staffBalances]);

  // Open Mandatory Confirmation Dialog (does NOT process any transaction)
  const handleOpenConfirmation = () => {
    // Revalidate: Check if every amount is zero or empty
    const validRecipients = eligibleStaff.filter((s) => Number(staffInputs[s.id]?.amount || 0) > 0);
    if (validRecipients.length === 0 || metrics.totalAdvanceAmount <= 0) {
      setValidationWarning('কোনো কর্মচারীর জন্য অগ্রিম টাকার পরিমাণ লিখা হয়নি। অনুগ্রহ করে কমপক্ষে একজন কর্মচারীর জন্য পরিমাণ লিখুন।');
      return;
    }
    // Open mandatory confirmation dialog without modifying any records
    setShowConfirmModal(true);
  };

  // Execute batch disbursement commit ONLY after explicit confirmation
  const handleConfirmAndExecute = async () => {
    // 1. Immediate revalidation right before processing
    const currentValidRecipients = eligibleStaff.filter((s) => Number(staffInputs[s.id]?.amount || 0) > 0);
    if (currentValidRecipients.length === 0 || metrics.totalAdvanceAmount <= 0) {
      setValidationWarning('কোনো বৈধ অগ্রিম পরিমাণ পাওয়া যায়নি। অনুগ্রহ করে পুনরায় পরীক্ষা করুন।');
      setShowConfirmModal(false);
      return;
    }
    if (isSubmitting) return; // Prevent double-click & duplicate execution

    setIsSubmitting(true);

    try {
      // 1. Generate unique Batch ID: BATCH-ADV-YYYYMMDD-XXXX
      const todayStr = batchDate.replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const batchId = `BATCH-ADV-${todayStr}-${randomSuffix}`;

      // Build submission timestamp
      const submitDate = new Date(batchDate);
      const now = new Date();
      submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      const isoTimestamp = submitDate.toISOString();

      // 2. Generate individual AdvanceLog items
      const newAdvanceLogs: AdvanceLog[] = recipientsList.map((item, index) => {
        const itemIndex = String(index + 1).padStart(2, '0');
        const transactionId = `ADV-TXN-${todayStr}-${randomSuffix}-${itemIndex}`;
        const individualNote = item.note.trim()
          ? item.note.trim()
          : globalBatchNote.trim()
          ? globalBatchNote.trim()
          : `বাল্ক অগ্রিম [${batchId}]`;

        return {
          id: Math.random().toString(36).substr(2, 9),
          staffId: item.staff.id,
          staffName: item.staff.name,
          amount: item.amount,
          note: individualNote,
          date: isoTimestamp,
          givenBy: currentUser || 'Admin',
          isDeleted: false,
          type: advanceType,
          batchId: batchId,
          batchNote: globalBatchNote.trim() || undefined,
          transactionId: transactionId,
        };
      });

      // 3. Atomically update application state & trigger syncData via createUpdater
      setAdvances((prev) => [...(prev || []), ...newAdvanceLogs]);

      // 4. Create summary receipt
      const summary: BatchTransactionSummary = {
        batchId,
        batchNote: globalBatchNote || 'বাল্ক অগ্রিম পেমেন্ট',
        type: advanceType,
        date: batchDate,
        executedBy: currentUser || 'Admin',
        totalAmount: metrics.totalAdvanceAmount,
        recipientCount: recipientsList.length,
        items: newAdvanceLogs.map((log, idx) => ({
          transactionId: log.transactionId || `ADV-TXN-${idx + 1}`,
          staffId: log.staffId,
          staffName: log.staffName,
          designation: recipientsList[idx]?.staff.designation || '',
          amount: log.amount,
          note: log.note || '',
        })),
        timestamp: isoTimestamp,
      };

      setLatestSummary(summary);
      setShowConfirmModal(false);

      // Clear input fields for next batch
      setStaffInputs({});
      setGlobalBatchNote('');
    } catch (err) {
      console.error('Error during bulk advance payment:', err);
      alert('পেমেন্ট প্রসেস করার সময় ত্রুটি হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group existing advances by batchId for the history view
  const batchHistory = useMemo(() => {
    const batchesMap: Record<string, {
      batchId: string;
      batchNote?: string;
      date: string;
      givenBy: string;
      type: string;
      totalAmount: number;
      count: number;
      items: AdvanceLog[];
    }> = {};

    (advances || []).forEach((adv) => {
      if (adv.isDeleted || adv.isHardDeleted || !adv.batchId) return;
      if (!batchesMap[adv.batchId]) {
        batchesMap[adv.batchId] = {
          batchId: adv.batchId,
          batchNote: adv.batchNote || adv.note,
          date: adv.date,
          givenBy: adv.givenBy || 'Admin',
          type: adv.type || 'REGULAR',
          totalAmount: 0,
          count: 0,
          items: [],
        };
      }
      batchesMap[adv.batchId].totalAmount += Number(adv.amount || 0);
      batchesMap[adv.batchId].count += 1;
      batchesMap[adv.batchId].items.push(adv);
    });

    return Object.values(batchesMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [advances]);

  // Selected batch for detailed history modal
  const [selectedBatchHistory, setSelectedBatchHistory] = useState<typeof batchHistory[0] | null>(null);

  // CSV Export for Summary Receipt
  const handleExportCSV = (summary: BatchTransactionSummary) => {
    const headers = ['Transaction ID', 'Employee Name', 'Staff ID', 'Designation', 'Amount (BDT)', 'Date', 'Type', 'Batch ID', 'Note'];
    const rows = summary.items.map((item) => [
      `"${item.transactionId}"`,
      `"${item.staffName}"`,
      `"${item.staffId}"`,
      `"${item.designation}"`,
      item.amount,
      `"${summary.date}"`,
      `"${summary.type}"`,
      `"${summary.batchId}"`,
      `"${item.note}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${summary.batchId}-Receipt.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unauthorized screen
  if (!isAuthorized) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">অননুমোদিত অ্যাক্সেস</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            বাল্ক অগ্রিম পেমেন্ট ব্যবস্থাপনা শুধুমাত্র অ্যাডমিন (Admin) এবং ব্যবস্থাপনা পরিচালক (MD) এর জন্য সংরক্ষিত।
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-md"
            >
              ড্যাশবোর্ডে ফিরে যান
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-36 md:pb-16 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* =========================================================================
          1. 3D HERO HEADER & NAVIGATION BAR (COMPACT, DIMENSIONAL, IMMERSIVE)
         ========================================================================= */}
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0B1528] to-[#0A192F] text-white border-b border-white/10 shadow-[0_20px_50px_-20px_rgba(2,6,23,0.7)] overflow-hidden">
        {/* Ambient 3D Glow Orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/3"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 relative z-10">
          {/* Top Bar: Back Button, Title, Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  title="ফিরে যান"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 flex items-center justify-center text-white backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {/* 3D Icon Badge */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-700 flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)] border border-white/20 shrink-0">
                <WalletCards className="w-6 h-6 text-emerald-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                    বাল্ক অগ্রিম পেমেন্ট
                  </h1>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                    Bulk Advance Portal
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300/80 mt-0.5 font-medium">
                  Depend Sourcing Ltd. • কর্মচারীদের এককালীন অগ্রিম বিতরণ ও লেজার সমন্বয়
                </p>
              </div>
            </div>

            {/* Mode Switcher Tab (Entry vs Audit History) */}
            <div className="flex items-center bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md self-start sm:self-auto shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('entry')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'entry'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4 text-emerald-300" />
                <span>পেমেন্ট এন্ট্রি</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-4 h-4 text-blue-300" />
                <span>ব্যাচ হিস্ট্রি ({batchHistory.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 sm:mt-6 space-y-6">
        {/* =========================================================================
            2. LIVE 3D FINANCIAL SUMMARY DOCK (DIMENSIONAL CARDS, SOFT SHADOWS)
           ========================================================================= */}
        {activeTab === 'entry' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* CARD 1: Total Advance Amount (Emerald Glowing 3D Surface) */}
              <div className="relative bg-gradient-to-br from-white to-emerald-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200/70 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.18),0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    মোট অগ্রিম পরিমাণ
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-sm shadow-[0_4px_10px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    ৳
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
                    <span className="text-emerald-600 text-xl font-bold">৳</span>
                    <span>{metrics.totalAdvanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>লাইভ বিতরণ ক্যালকুলেশন</span>
                  </div>
                </div>
              </div>

              {/* CARD 2: Recipients Count */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_10px_25px_-8px_rgba(15,23,42,0.06),0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    প্রাপক কর্মচারী
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_4px_10px_rgba(37,99,235,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    <UsersRound className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {metrics.recipientsCount}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      / {metrics.totalEligible} জন
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    অগ্রিম প্রাপক হিসেবে নির্ধারিত
                  </div>
                </div>
              </div>

              {/* CARD 3: Zero Advance Count */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_10px_25px_-8px_rgba(15,23,42,0.06),0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    শূন্য অগ্রিম স্টাফ
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black border border-slate-200">
                    ০
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-600 font-mono">
                    {metrics.zeroCount}
                    <span className="text-xs font-normal text-slate-500 ml-1">জন</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    কোন অগ্রিম যোগ করা হয়নি
                  </div>
                </div>
              </div>

              {/* CARD 4: Office Cash on Hand Advisory */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_10px_25px_-8px_rgba(15,23,42,0.06),0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    অফিস ক্যাশ ইন হ্যান্ড
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-[0_4px_10px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {typeof cashOnHand === 'number' ? (
                      <>৳ {cashOnHand.toLocaleString('en-IN')}</>
                    ) : (
                      'লেজার লিঙ্কড'
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {typeof cashOnHand === 'number' && metrics.totalAdvanceAmount > cashOnHand ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> মোট অগ্রিম ক্যাশের চেয়ে বেশি
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">ক্যাশ ব্যালেন্স পর্যাপ্ত</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                3. BATCH CONTROLS & FILTERING DOCK (3D LAYERED CARD)
               ========================================================================= */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_12px_35px_-10px_rgba(15,23,42,0.08)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                    <Layers className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      ব্যাচ কনফিগারেশন ও ফিল্টার
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      তারিখ, অ্যাকাউন্ট টাইপ এবং উদ্দেশ্য নির্ধারণ করুন
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">অনুমোদনকারী:</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                    {currentUser || 'Admin'}
                  </span>
                </div>
              </div>

              {/* Input Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    পেমেন্ট তারিখ (Date)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={batchDate}
                      onChange={(e) => setBatchDate(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono shadow-inner"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    অ্যাকাউন্ট ধরণ (Account)
                  </label>
                  <select
                    value={advanceType}
                    onChange={(e) => setAdvanceType(e.target.value as 'REGULAR' | 'SALARY')}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium shadow-inner"
                  >
                    <option value="REGULAR">সাধারণ অগ্রিম (Regular Advance - ডিফল্ট)</option>
                    <option value="SALARY">বেতন অগ্রিম (Salary Advance)</option>
                  </select>
                </div>

                {/* Batch Note */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ব্যাচ রেফারেন্স বা উদ্দেশ্য (Purpose Note)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: ঈদ বোনাস/অগ্রিম ২০২৬, মাসিক অফিস অগ্রিম..."
                    value={globalBatchNote}
                    onChange={(e) => setGlobalBatchNote(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Search & Bulk Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search Bar */}
                  <div className="relative flex-1 sm:w-72 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="নাম, আইডি বা পদবী দিয়ে খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs sm:text-sm pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition-all shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Active Only Filter */}
                  <button
                    type="button"
                    onClick={() => setFilterActiveOnly(!filterActiveOnly)}
                    className={`text-xs px-3.5 py-2.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                      filterActiveOnly
                        ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/10'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{filterActiveOnly ? 'সক্রিয় স্টাফ' : 'সব স্টাফ'}</span>
                    <span className="text-[10px] opacity-75 ml-0.5">({eligibleStaff.length})</span>
                  </button>
                </div>

                {/* Quick Action Tools */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPresetModal(true)}
                    className="text-xs px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold transition-all flex items-center gap-1.5 shadow-[0_4px_12px_rgba(37,99,235,0.3)] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-300" />
                    <span>একই পরিমাণ পূরণ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (metrics.recipientsCount > 0) {
                        setShowResetConfirmModal(true);
                      } else {
                        handleResetAll();
                      }
                    }}
                    disabled={metrics.recipientsCount === 0 && !globalBatchNote}
                    className={`text-xs px-3.5 py-2.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                      metrics.recipientsCount > 0
                        ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 active:scale-95 shadow-2xs cursor-pointer'
                        : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>রিসেট (Reset)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================================================
                4. EASY STAFF ENTRY: HIGHLY COMPACT 3D STAFF ROWS (12-15 VISIBLE AT ONCE)
               ========================================================================= */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    কর্মচারী তালিকা ও অগ্রিম ইনপুট
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {filteredStaff.length} জন প্রদর্শিত
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  নির্ধারিত প্রাপক: <span className="font-bold text-emerald-600">{metrics.recipientsCount} জন</span>
                </div>
              </div>

              {filteredStaff.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <UsersRound className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">কোন কর্মচারী পাওয়া যায়নি</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    আপনার সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো স্টাফ পাওয়া যায়নি।
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                    >
                      অনুসন্ধান ফিল্টার মুছুন
                    </button>
                  )}
                </div>
              ) : (
                /* Compact Elevated 3D Container */
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_6px_25px_-5px_rgba(15,23,42,0.06)] overflow-hidden">
                  {/* Subtle Table Header */}
                  <div className="px-3 py-2 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center text-slate-400">#</span>
                      <span>স্টাফ ও আইডি</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="hidden sm:inline text-slate-400">বর্তমান বকেয়া</span>
                      <span className="w-24 sm:w-28 text-right pr-1">অগ্রিম (৳)</span>
                    </div>
                  </div>

                  {/* High Density Rows (Target: 42-48px height, 12-15 rows visible at once on mobile) */}
                  <div className="p-1 sm:p-1.5 space-y-1">
                    {filteredStaff.map((staff, idx) => {
                      const input = staffInputs[staff.id] || { amount: '', note: '' };
                      const amtNum = Number(input.amount || 0);
                      const isEntered = amtNum > 0;
                      const currentBal = staffBalances[staff.id] || 0;
                      const isFocused = activeFocusedId === staff.id;

                      return (
                        <div
                          key={staff.id}
                          ref={(el) => {
                            cardRefs.current[staff.id] = el;
                          }}
                          className={`h-[44px] min-h-[44px] max-h-[44px] px-2.5 rounded-xl flex items-center justify-between transition-all duration-150 border ${
                            isEntered
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-[0_2px_8px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'
                              : isFocused
                              ? 'bg-blue-50/40 border-blue-400 shadow-sm ring-1 ring-blue-500/20'
                              : idx % 2 === 0
                              ? 'bg-white hover:bg-slate-50/80 border-slate-200/60'
                              : 'bg-slate-50/40 hover:bg-slate-50 border-slate-200/60'
                          }`}
                        >
                          {/* Left: Serial, Avatar (28px), Name, Employee ID */}
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {/* Serial */}
                            <span className="font-mono text-[10px] text-slate-400 w-5 shrink-0 text-center font-bold">
                              {idx + 1}
                            </span>

                            {/* Small circular profile photo (28px) */}
                            <div className="relative shrink-0">
                              {staff.photo ? (
                                <img
                                  src={staff.photo}
                                  alt={staff.name}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-2xs"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center border border-white/20 shadow-2xs">
                                  {(staff.name || 'S').charAt(0).toUpperCase()}
                                </div>
                              )}
                              {isEntered && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                              )}
                            </div>

                            {/* Name & ID */}
                            <div className="min-w-0 flex items-center gap-1.5 flex-1">
                              <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                                {staff.name}
                              </span>
                              {staff.staffId && (
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  ({staff.staffId})
                                </span>
                              )}
                              {/* Desktop-only: subtle current balance hint */}
                              {currentBal !== 0 && (
                                <span
                                  className={`hidden md:inline-flex text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                                    currentBal > 0
                                      ? 'text-amber-700 bg-amber-50'
                                      : 'text-emerald-700 bg-emerald-50'
                                  }`}
                                >
                                  বকেয়া: ৳{currentBal.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Compact Amount Input Field (approx 90-110px wide) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div
                              className={`h-8 w-24 sm:w-28 rounded-lg flex items-center px-2 transition-all border shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                                isEntered
                                  ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20'
                                  : 'bg-slate-50 border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-600/20'
                              }`}
                            >
                              <span
                                className={`text-xs font-bold font-mono mr-1 select-none ${
                                  isEntered ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                ৳
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                enterKeyHint="next"
                                placeholder="0"
                                value={input.amount}
                                onFocus={() => handleInputFocus(staff.id)}
                                onChange={(e) => handleAmountChange(staff.id, e.target.value)}
                                className="w-full text-right font-mono font-bold text-xs text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                              />
                            </div>

                            {/* Micro Clear Button (only when entered) */}
                            {isEntered && (
                              <button
                                type="button"
                                onClick={() => handleClearSingle(staff.id)}
                                title="মুছুন"
                                className="w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center text-xs transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Desktop Accessible Action Section (No Fixed Overlay on Desktop) */}
              <div className="hidden md:flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] mt-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200">
                      ৳
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                        মোট অগ্রিম বরাদ্দ ({metrics.recipientsCount} জন প্রাপক)
                      </span>
                      <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                        ৳ {metrics.totalAdvanceAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 pl-4 border-l border-slate-200 space-y-0.5">
                    <div>শূন্য অগ্রিম: <span className="font-bold text-slate-700">{metrics.zeroCount} জন</span></div>
                    <div>মোট যোগ্য স্টাফ: <span className="font-bold text-slate-700">{metrics.totalEligible} জন</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (metrics.recipientsCount > 0) {
                        setShowResetConfirmModal(true);
                      } else {
                        handleResetAll();
                      }
                    }}
                    disabled={metrics.recipientsCount === 0 && !globalBatchNote}
                    className={`h-11 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      metrics.recipientsCount > 0
                        ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 active:scale-95 shadow-2xs cursor-pointer'
                        : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>রিসেট (Reset)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleOpenConfirmation}
                    className={`h-11 px-6 rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] cursor-pointer ${
                      metrics.recipientsCount > 0 && metrics.totalAdvanceAmount > 0
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-white active:scale-95'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-600 border border-slate-300/80 shadow-none'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>পেমেন্ট নিশ্চিত করুন (Submit Advance Payment)</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* =========================================================================
            5. TAB 2: BATCH DISBURSEMENT HISTORY & AUDIT SECTION
           ========================================================================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-[0_12px_35px_-10px_rgba(15,23,42,0.08)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  বাল্ক অগ্রিম পেমেন্ট অডিট হিস্ট্রি
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  পূর্ববর্তী সকল বিতরণ ব্যাচ এবং কর্মচারীভিত্তিক লেনদেন রেকর্ড
                </p>
              </div>
              <div className="text-xs font-mono font-bold bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700 self-start sm:self-auto">
                মোট ব্যাচ: {batchHistory.length} টি
              </div>
            </div>

            {batchHistory.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">কোন পূর্ববর্তী ব্যাচ হিস্ট্রি পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  এখনো কোনো বাল্ক অগ্রিম পেমেন্ট রেকর্ড সম্পন্ন করা হয়নি। নতুন পেমেন্ট তৈরি করতে প্রথম ট্যাবে যান।
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('entry')}
                  className="mt-5 text-xs font-bold px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md"
                >
                  পেমেন্ট শুরু করুন
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {batchHistory.map((batch) => (
                  <div
                    key={batch.batchId}
                    className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {batch.batchId}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono">
                          {batch.count} জন প্রাপক
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                        <span>{batch.batchNote || 'নিয়মিত বাল্ক অগ্রিম'}</span>
                        <span>•</span>
                        <span className="text-slate-400">তারিখ:</span>
                        <span className="font-mono font-semibold">
                          {new Date(batch.date).toLocaleDateString('bn-BD', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">অপারেটর:</span>
                        <span className="font-semibold text-slate-700">{batch.givenBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase block">মোট বিতরণ</span>
                        <span className="text-lg font-black text-emerald-700 font-mono">
                          ৳ {batch.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBatchHistory(batch)}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-all shadow-2xs"
                      >
                        বিস্তারিত অডিট
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          6. SMART SCROLLING: PERMANENTLY ACCESSIBLE MOBILE STICKY ACTION BAR
         ========================================================================= */}
      {activeTab === 'entry' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-12px_30px_rgba(0,0,0,0.6)] px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom,12px))]">
          {/* Top Mini Strip: Live Total Amount & Recipient Count */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px]">মোট অগ্রিম:</span>
              <span className="text-emerald-400 font-mono font-black text-base">
                ৳ {metrics.totalAdvanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium">
              প্রাপক: <strong className="text-emerald-400 font-mono font-bold">{metrics.recipientsCount}</strong>/{metrics.totalEligible} জন
            </div>
          </div>

          {/* Two Clearly Visible Buttons Side by Side: Reset & Submit */}
          <div className="flex items-center gap-2 pt-2">
            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                if (metrics.recipientsCount > 0) {
                  setShowResetConfirmModal(true);
                } else {
                  handleResetAll();
                }
              }}
              disabled={metrics.recipientsCount === 0 && !globalBatchNote}
              className={`h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                metrics.recipientsCount > 0
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 active:scale-95 cursor-pointer shadow-sm'
                  : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>রিসেট (Reset)</span>
            </button>

            {/* Submit Advance Payment Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleOpenConfirmation}
              className={`flex-1 h-11 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(16,185,129,0.35)] cursor-pointer ${
                metrics.recipientsCount > 0 && metrics.totalAdvanceAmount > 0
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-white active:scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 shadow-none'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="truncate">পেমেন্ট নিশ্চিত করুন (Submit)</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL: QUICK PRESET FILL (ELEVATED 3D MODAL)
         ========================================================================= */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <DollarSign className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    একই পরিমাণ পূরণ করুন
                  </h3>
                  <p className="text-xs text-slate-500">Quick Preset Bulk Fill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  অগ্রিম টাকার পরিমাণ (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg font-black font-mono text-slate-400">
                    ৳
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="যেমন: 5000"
                    value={presetAmount}
                    onChange={(e) => setPresetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-xl font-mono font-black pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-2">
                {[1000, 2000, 3000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPresetAmount(String(amt))}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold transition-all active:scale-95 border border-slate-200"
                  >
                    ৳ {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Target Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  প্রয়োগের পরিসীমা (Target Staff)
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPresetTarget('filtered')}
                    className={`p-3 rounded-2xl border text-left font-medium transition-all ${
                      presetTarget === 'filtered'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="font-bold">ফিল্টারকৃত স্টাফ ({filteredStaff.length} জন)</div>
                    <div className="text-[11px] opacity-75">বর্তমানে স্ক্রীনে দৃশ্যমান তালিকা</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTarget('all')}
                    className={`p-3 rounded-2xl border text-left font-medium transition-all ${
                      presetTarget === 'all'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="font-bold">সকল সক্রিয় স্টাফ ({eligibleStaff.length} জন)</div>
                    <div className="text-[11px] opacity-75">প্রতিষ্ঠানের সব সক্রিয় কর্মচারী</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={!presetAmount || Number(presetAmount) <= 0}
                onClick={handleApplyPreset}
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
              >
                প্রয়োগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. MODAL: VALIDATION WARNING (NO AMOUNT ENTERED)
         ========================================================================= */}
      {validationWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              সতর্কবার্তা (Warning)
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {validationWarning}
            </p>
            <button
              type="button"
              onClick={() => setValidationWarning(null)}
              className="w-full py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md shadow-amber-600/30 cursor-pointer"
            >
              ঠিক আছে (OK)
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. MODAL: RESET CONFIRMATION
         ========================================================================= */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
              <RotateCcw className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ইনপুট রিসেট নিশ্চিতকরণ
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              আপনি কি বর্তমান সব এন্ট্রি এবং টাকার পরিমাণ মুছে ফেলতে চান? এটি শুধুমাত্র বর্তমান ইনপুটগুলো খালি করবে, পূর্বের কোনো সেভ করা অ্যাকাউন্ট রেকর্ড পরিবর্তন করবে না।
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-600/30"
              >
                হ্যাঁ, রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          9. MODAL: FINAL REVIEW & SUBMISSION BREAKDOWN
         ========================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    অগ্রিম পেমেন্ট নিশ্চিতকরণ (Confirmation)
                  </h3>
                  <p className="text-xs text-slate-500">
                    লেনদেন কার্যকর করার পূর্বে মোট টাকা ও কর্মচারী তালিকা পর্যালোচনা করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => !isSubmitting && setShowConfirmModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">মোট পরিমাণ</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  ৳ {metrics.totalAdvanceAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">মোট প্রাপক</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {recipientsList.length} জন
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">কার্যকর তারিখ</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {batchDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">অ্যাকাউন্ট ধরণ</span>
                <span className="text-xs font-bold text-slate-800">
                  {advanceType === 'REGULAR' ? 'সাধারণ অগ্রিম' : 'বেতন অগ্রিম'}
                </span>
              </div>
            </div>

            {/* Staff Recipient Breakdown List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>প্রাপক কর্মচারীদের তালিকা</span>
                <span className="font-mono text-slate-500">{recipientsList.length} জন অন্তর্ভুক্ত</span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
                {recipientsList.map((item, idx) => (
                  <div key={item.staff.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-slate-400 w-5 text-center text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {item.staff.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.staff.designation || 'Staff'} {item.staff.staffId && `• ${item.staff.staffId}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-emerald-700 text-sm">
                        ৳ {item.amount.toLocaleString('en-IN')}
                      </div>
                      {item.note && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {item.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>নিরাপত্তা ও নিরীক্ষা নিশ্চিতকরণ:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed pl-5">
                অনুমোদনের সাথে সাথে একটি নির্দিষ্ট ব্যাচ আইডি তৈরি হবে এবং প্রতিটি পেমেন্ট সংশ্লিষ্ট কর্মচারীর রেগুলার অগ্রিম লেজারে অন্তর্ভুক্ত হবে।
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => !isSubmitting && setShowConfirmModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                বাতিল (Cancel)
              </button>

              <button
                type="button"
                disabled={isSubmitting || recipientsList.length === 0}
                onClick={handleConfirmAndExecute}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-white rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>প্রসেসিং হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>নিশ্চিত ও বিতরণ করুন (Confirm & Submit)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          10. MODAL: POST-SUBMISSION VOUCHER & RECEIPT
         ========================================================================= */}
      {latestSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Badge */}
            <div className="text-center pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 text-white flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                বিতরণ সফলভাবে সম্পন্ন (Disbursement Success)
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5">
                বাল্ক অগ্রিম পেমেন্ট ভাউচার
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1 font-bold">
                Batch ID: {latestSummary.batchId}
              </p>
            </div>

            {/* Receipt Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">মোট বিতরণ</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  ৳ {latestSummary.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">প্রাপক সংখ্যা</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {latestSummary.recipientCount} জন
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">তারিখ</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {latestSummary.date}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">অনুমোদনকারী</span>
                <span className="text-xs font-bold text-slate-800">
                  {latestSummary.executedBy}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-2 space-y-2">
              <div className="text-xs font-bold text-slate-700">বিতরণ বিবরণী</div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
                {latestSummary.items.map((item, idx) => (
                  <div key={item.transactionId} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-400 w-5 text-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{item.staffName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-semibold">{item.transactionId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-700">
                        ৳ {item.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">সফল (Posted)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট রিসিট</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCSV(latestSummary)}
                  className="px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV ডাউনলোড</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToLedger && (
                  <button
                    type="button"
                    onClick={() => {
                      setLatestSummary(null);
                      onNavigateToLedger();
                    }}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    ফান্ড লেজারে দেখুন
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setLatestSummary(null)}
                  className="px-6 py-2.5 text-xs font-black rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-md"
                >
                  সম্পন্ন (Done)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          11. MODAL: DETAILED HISTORICAL BATCH AUDIT MODAL
         ========================================================================= */}
      {selectedBatchHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ব্যাচ অডিট বিবরণী (Batch Audit Breakdown)
                </h3>
                <div className="text-xs font-mono text-slate-500 mt-0.5 font-bold">
                  ID: {selectedBatchHistory.batchId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchHistory(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">মোট টাকা</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  ৳ {selectedBatchHistory.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">মোট প্রাপক</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {selectedBatchHistory.count} জন
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">তারিখ</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {new Date(selectedBatchHistory.date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">অপারেটর</span>
                <span className="text-xs font-bold text-slate-800">
                  {selectedBatchHistory.givenBy}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">কর্মচারীদের তালিকা</div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
                {selectedBatchHistory.items.map((item, idx) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-400 w-5 text-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{item.staffName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-semibold">
                          {item.transactionId || item.id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-700">
                        ৳ {item.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.note || selectedBatchHistory.batchNote || 'নিয়মিত অগ্রিম'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBatchHistory(null)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkAdvancePaymentView;

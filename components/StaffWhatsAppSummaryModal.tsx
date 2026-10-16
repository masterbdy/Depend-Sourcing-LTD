import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MessageCircle,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Edit2,
  Save,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  AlertCircle,
  FileText,
  Info,
} from 'lucide-react';
import { Staff, Expense, AdvanceLog } from '../types';
import {
  getDhakaDateStr,
  formatToInternationalPhone,
  calculateStaffDateSummary,
  formatStaffProfileWhatsAppMessage,
  formatBDT,
} from '../services/voucherService';

interface StaffWhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  expenses: Expense[];
  advances: AdvanceLog[];
  currentUser?: string | null;
  onUpdateStaffPhone?: (staffId: string, newPhone: string) => Promise<void> | void;
}

export const StaffWhatsAppSummaryModal: React.FC<StaffWhatsAppSummaryModalProps> = ({
  isOpen,
  onClose,
  staff,
  expenses = [],
  advances = [],
  currentUser,
  onUpdateStaffPhone,
}) => {
  const todayDhaka = useMemo(() => getDhakaDateStr(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayDhaka);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [isSavingPhone, setIsSavingPhone] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Initialize phone when staff changes
  useEffect(() => {
    if (staff) {
      const initialPhone = (staff as any).whatsappNumber || staff.mobile || '';
      setPhoneInput(initialPhone);
      setIsEditingPhone(!initialPhone.trim());
      setSelectedDate(getDhakaDateStr(new Date()));
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  // Validate phone
  const phoneValidation = formatToInternationalPhone(phoneInput);

  // Calculate live date-wise summary
  const summary = calculateStaffDateSummary(staff.id, selectedDate, expenses, advances);

  // Generate full WhatsApp message text
  const messageText = formatStaffProfileWhatsAppMessage({
    staff,
    summary,
    currentUser,
  });

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = messageText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSavePhone = async () => {
    if (!onUpdateStaffPhone) {
      setIsEditingPhone(false);
      return;
    }
    setIsSavingPhone(true);
    try {
      await onUpdateStaffPhone(staff.id, phoneInput.trim());
      setIsEditingPhone(false);
    } catch (err: any) {
      alert(`নম্বর সংরক্ষণ ব্যর্থ: ${err?.message || 'অজানা ত্রুটি'}`);
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleQuickDatePreset = (preset: 'today' | 'yesterday') => {
    if (preset === 'today') {
      setSelectedDate(todayDhaka);
    } else {
      const now = new Date();
      now.setDate(now.getDate() - 1);
      setSelectedDate(getDhakaDateStr(now));
    }
  };

  const handleOpenWhatsApp = () => {
    if (!phoneValidation.valid) {
      alert(phoneValidation.error || 'সঠিক হোয়াটসঅ্যাপ নম্বর প্রদান করুন।');
      return;
    }

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${phoneValidation.international}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="bg-[#075E54] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-600/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner">
              <MessageCircle className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>WhatsApp Financial Summary</span>
                <span className="text-[10px] bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Official
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80 font-medium">
                স্টাফ প্রোফাইল ভিত্তিক আর্থিক বিবরণী ও বিল রিমাইন্ডার
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          {/* RECIPIENT CARD */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {staff.photo ? (
                  <img
                    src={staff.photo}
                    alt={staff.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xl flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
                    {staff.name.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Recipient Staff Member
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {staff.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {staff.designation} • <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">ID: {staff.staffId}</span>
                </div>
              </div>
            </div>

            {/* PHONE & VERIFICATION STATUS */}
            <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-700/60">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                WhatsApp Phone
              </div>

              {isEditingPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="01712-XXXXXX"
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none w-36"
                  />
                  <button
                    type="button"
                    onClick={handleSavePhone}
                    disabled={isSavingPhone}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    title="Save Phone"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  {staff.mobile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(false)}
                      className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center sm:justify-end gap-2">
                  {phoneValidation.valid ? (
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {phoneValidation.display}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      নম্বর নেই / ত্রুটিপূর্ণ
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                    title="Edit Phone Number"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* WARNING IF PHONE INVALID */}
          {!phoneValidation.valid && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">সঠিক প্রাপক ও নম্বর নিশ্চিত করুন</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {phoneValidation.error} উপরের এডিট বাটনে ক্লিক করে সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর (যেমন: 01712XXXXXX) লিখুন।
                </p>
              </div>
            </div>
          )}

          {/* DATE SELECTOR (PART B.2) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>লেনদেনের তারিখ নির্বাচন (Transaction Date)</span>
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  বাংলাদেশ সময় (Asia/Dhaka) অনুযায়ী তারিখের অগ্রিম ও বিল যাচাই
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset('today')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    selectedDate === todayDhaka
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  আজ (Today)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset('yesterday')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                >
                  গতকাল (Yesterday)
                </button>
              </div>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* FINANCIAL POSITION CARDS FOR SELECTED DATE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: Selected Date Regular Advance */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <div className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                তারিখের সাধারণ অগ্রিম
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                ৳ {formatBDT(summary.dateRegularAdvance)}
              </div>
              <div className="text-[8.5px] text-slate-400 mt-0.5">
                {summary.targetDateFormatted} এর হিসাব
              </div>
            </div>

            {/* Card 2: Selected Date Salary Advance */}
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 rounded-xl p-3">
              <div className="text-[8.5px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                তারিখের বেতন অগ্রিম
              </div>
              <div className="text-base font-black text-purple-900 dark:text-purple-300 mt-1">
                {summary.dateSalaryAdvance > 0 ? `৳ ${formatBDT(summary.dateSalaryAdvance)}` : '৳ 0.00'}
              </div>
              <div className="text-[8.5px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                {summary.dateSalaryAdvance > 0 ? 'উক্ত দিনে প্রদত্ত' : 'দেওয়া হয়নি'}
              </div>
            </div>

            {/* Card 3: All-Time Balance */}
            <div
              className="rounded-xl p-3 border"
              style={{
                backgroundColor: summary.allTimeBalance < 0 ? 'rgba(254, 242, 242, 0.7)' : 'rgba(240, 253, 244, 0.7)',
                borderColor: summary.allTimeBalance < 0 ? '#FCA5A5' : '#86EFAC',
              }}
            >
              <div
                className="text-[8.5px] font-black uppercase tracking-wider"
                style={{ color: summary.allTimeBalance < 0 ? '#991B1B' : '#166534' }}
              >
                {summary.allTimeBalance < 0 ? 'কোম্পানির কাছে পাওনা' : 'ক্যাশ ইন হ্যান্ড (অতিরিক্ত)'}
              </div>
              <div
                className="text-base font-black mt-1"
                style={{ color: summary.allTimeBalance < 0 ? '#B91C1C' : '#15803D' }}
              >
                ৳ {formatBDT(Math.abs(summary.allTimeBalance))}
              </div>
              <div
                className="text-[8.5px] mt-0.5 font-medium"
                style={{ color: summary.allTimeBalance < 0 ? '#991B1B' : '#166534' }}
              >
                All-Time Ledger Balance
              </div>
            </div>

            {/* Card 4: Bill Status / Reminder Indicator */}
            <div
              className={`rounded-xl p-3 border ${
                summary.hasUnsubmittedBillReminder
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : summary.billStatusType === 'ALL_SUBMITTED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-[8.5px] font-black uppercase tracking-wider text-slate-500">
                বিল জমা স্থিতি
              </div>
              <div className="text-xs font-black mt-1 flex items-center gap-1.5">
                {summary.hasUnsubmittedBillReminder ? (
                  <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> রিমাইন্ডার প্রযোজ্য
                  </span>
                ) : summary.billStatusType === 'ALL_SUBMITTED' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> বিল জমা সম্পন্ন
                  </span>
                ) : summary.billStatusType === 'LINKAGE_NEEDS_VERIFICATION' ? (
                  <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0" /> যাচাই প্রয়োজন
                  </span>
                ) : (
                  <span className="text-slate-500">অগ্রিম ছিল না</span>
                )}
              </div>
              <div className="text-[8px] text-slate-400 mt-0.5 truncate" title={summary.billStatusDescription}>
                {summary.billStatusDescription}
              </div>
            </div>
          </div>

          {/* SAME-DAY / UNPAID REMINDER BANNER (PART C) */}
          {summary.hasUnsubmittedBillReminder && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500 text-white font-black text-[10px]">
                  REMINDER
                </span>
                <span className="font-semibold">
                  {summary.isToday ? 'আজকের অগ্রিমের বিল এখনো জমা পড়েনি।' : `${summary.targetDateFormatted} তারিখের অগ্রিমের বিপরীতে বিল জমা হয়নি।`}
                </span>
              </div>
              <span className="font-black text-amber-900 dark:text-amber-200">
                বাকি বিল: ৳ {formatBDT(summary.unsubmittedAdvanceAmount || summary.dateRegularAdvance)}
              </span>
            </div>
          )}

          {/* MESSAGE PREVIEW (PART A.6) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp মেসেজ লাইভ প্রিভিউ (Message Preview)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#EFEAE2] dark:bg-[#0B141A] p-4 rounded-2xl border border-slate-300 dark:border-slate-800 max-h-56 overflow-y-auto custom-scrollbar font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text shadow-inner">
              <div className="bg-[#DCF8C6] dark:bg-[#005C4B] p-3 rounded-2xl rounded-tr-none shadow-sm text-slate-900 dark:text-white border border-emerald-200/50 dark:border-emerald-700/30">
                {messageText}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              * WhatsApp খোলার পর মেসেজটি স্বয়ংক্রিয়ভাবে ইনপুট বক্সে উপস্থিত থাকবে। ব্যবহারকারী Send না করা পর্যন্ত কোনো মেসেজ প্রেরিত হবে না।
            </p>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
            প্রাপক: <strong className="text-slate-800 dark:text-slate-200">{staff.name}</strong> •{' '}
            {phoneValidation.valid ? (
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {phoneValidation.display}
              </span>
            ) : (
              <span className="text-red-500 font-bold">নম্বর অনুপস্থিত</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              বাতিল করুন
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!phoneValidation.valid}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>WhatsApp-এ মেসেজ পাঠান</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  Share2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Send,
  Loader2,
  Eye,
  Building,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import { Expense, Staff, AdvanceLog, UserRole } from '../types';
import {
  generateVoucherQRCode,
  getStaffVoucherStats,
  getVoucherStatusBadge,
  formatBDT,
  printCorporateVoucher,
  downloadCorporateVoucherPNG,
  formatVoucherWhatsAppText,
} from '../services/voucherService';
import { numberToWordsEnglish, numberToWordsBengali } from '../services/numberToWords';

interface PaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  staffList: Staff[];
  expenses: Expense[];
  advances: AdvanceLog[];
  role: UserRole;
  currentUser: string | null;
}

export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  expense,
  staffList,
  expenses,
  advances,
  role,
  currentUser,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [companyLogo, setCompanyLogo] = useState<string>('');

  useEffect(() => {
    try {
      const logo = localStorage.getItem('company_logo');
      if (logo) setCompanyLogo(logo);
    } catch {}
  }, []);

  useEffect(() => {
    if (!expense) return;
    let isMounted = true;
    generateVoucherQRCode(
      expense.id,
      expense.staffName,
      expense.amount,
      expense.createdAt,
      expense.status
    ).then((url) => {
      if (isMounted) setQrCodeUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [expense]);

  if (!isOpen || !expense) return null;

  const staff = staffList.find((s) => s.id === expense.staffId);
  const staffName = staff?.name || expense.staffName || 'Staff Member';
  const staffId = staff?.staffId || expense.staffId || 'N/A';
  const designation = staff?.designation || 'Staff Member';
  const workLocation = staff?.workLocation || 'HEAD_OFFICE';
  const mobile = staff?.mobile || 'N/A';
  const voucherNo = `DS-VCH-${expense.id.slice(0, 8).toUpperCase()}`;

  const createdDate = new Date(expense.createdAt || new Date());
  const dateFormattedEn = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const dateFormattedBn = createdDate.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = createdDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const stats = getStaffVoucherStats(expense.staffId, expenses, advances);
  const statusInfo = getVoucherStatusBadge(expense.status);

  // Signatory
  let signatoryName = 'Shariful Islam';
  let signatoryTitle = 'Managing Director';
  let signatoryOrg = 'Depend Sourcing Ltd.';
  try {
    const savedSignatoryId = localStorage.getItem('authorized_signatory_id');
    if (savedSignatoryId === 'chairman') {
      signatoryName = 'Moyna Islam';
      signatoryTitle = 'Chairman';
    }
  } catch {}

  const amountWordsEn = numberToWordsEnglish(Number(expense.amount || 0));
  const amountWordsBn = numberToWordsBengali(Number(expense.amount || 0));

  const voucherOptions = {
    expense,
    staff,
    staffList,
    expenses,
    advances,
    companyLogo,
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      await printCorporateVoucher(voucherOptions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPNG = async () => {
    setIsExporting(true);
    try {
      await downloadCorporateVoucherPNG(voucherOptions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = formatVoucherWhatsAppText(voucherOptions);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-slate-700/60 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP TOOLBAR */}
        <div className="bg-[#142B4A] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#C6A45A]/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C6A45A] text-[#142B4A] flex items-center justify-center font-black text-sm">
              DS
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm tracking-wide text-white">
                Official Corporate Payment Voucher
              </div>
              <div className="text-[10px] text-slate-300 font-mono">
                {voucherNo} • {dateFormattedEn}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-white/10 disabled:opacity-50"
              title="Print Document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              disabled={isExporting}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-white/10 disabled:opacity-50"
              title="Download PNG Voucher Image"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span className="hidden sm:inline">PNG Image</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Share via WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all ml-1"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE DOCUMENT CONTAINER */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-950 flex-1 flex justify-center custom-scrollbar">
          {/* THE ACTUAL CORPORATE VOUCHER CANVAS */}
          <div className="w-full max-w-[760px] bg-white text-[#273244] rounded-lg shadow-xl border border-slate-200 p-6 sm:p-10 font-['Noto_Sans_Bengali',sans-serif] text-xs leading-relaxed select-text">
            
            {/* VOUCHER HEADER */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-[#C6A45A] mb-5">
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt="Depend Sourcing"
                    className="max-h-12 max-w-[130px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-[#142B4A] text-[#C6A45A] flex items-center justify-center font-black text-xl border-2 border-[#C6A45A]">
                      DS
                    </div>
                    <div>
                      <div className="text-lg font-black text-[#142B4A] tracking-tight leading-none">
                        DEPEND SOURCING
                      </div>
                      <div className="text-[9px] font-bold text-[#C6A45A] uppercase tracking-widest mt-0.5">
                        Promise Beyond Business
                      </div>
                    </div>
                  </div>
                )}
                <div className="border-l border-slate-200 pl-3 ml-1 hidden sm:block">
                  <div className="text-[13px] font-black text-[#142B4A]">DEPEND SOURCING LTD.</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Office Management & Billing Center
                  </div>
                  <div className="text-[8.5px] text-slate-400">Official Financial Instrument</div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-[#142B4A] text-white px-3 py-1 rounded text-[10px] font-black tracking-wider uppercase border border-[#C6A45A]">
                  Payment / Bill Voucher
                </div>
                <div className="text-xs font-black text-[#142B4A] mt-1.5 font-mono">
                  {voucherNo}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  Date: {dateFormattedEn} • {timeFormatted}
                </div>
              </div>
            </div>

            {/* STATUS BANNER */}
            <div
              className="flex justify-between items-center px-4 py-2.5 rounded-lg border mb-5"
              style={{
                backgroundColor: statusInfo.bg,
                borderColor: statusInfo.border,
                color: statusInfo.text,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wide uppercase"
                  style={{ backgroundColor: statusInfo.text }}
                >
                  {statusInfo.labelEn}
                </span>
                <span className="text-xs font-bold">
                  {statusInfo.labelBn} —{' '}
                  <span className="text-[10px] font-medium opacity-90">{statusInfo.desc}</span>
                </span>
              </div>
              <div className="text-[9.5px] font-bold uppercase tracking-wider hidden sm:block">
                Ref: #{expense.id.slice(0, 6).toUpperCase()}
              </div>
            </div>

            {/* BENEFICIARY & AUDIT INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="sm:col-span-2 bg-[#F3F6FA] border border-slate-200 rounded-lg p-3.5 flex justify-between items-center">
                <div>
                  <div className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Beneficiary / Staff Information (প্রাপক)
                  </div>
                  <div className="text-base font-black text-[#142B4A]">{staffName}</div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    {designation} •{' '}
                    <span className="font-mono text-[#2457A7] font-bold">ID: {staffId}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Work Location: <strong className="text-slate-700">{workLocation}</strong> • Mobile:{' '}
                    <strong className="text-slate-700">{mobile}</strong>
                  </div>
                </div>
                <div className="shrink-0 ml-3">
                  {staff?.photo ? (
                    <img
                      src={staff.photo}
                      alt={staffName}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-black text-[#2457A7] text-xl">
                      {staffName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                <div>
                  <div className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Audit & Submission
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Submitted: <strong>{dateFormattedBn}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Server Sync: <strong>{expense.syncStatus || 'SUBMITTED'}</strong>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[9.5px] text-slate-600">
                  Authorized: <strong>{signatoryName}</strong> ({signatoryTitle})
                </div>
              </div>
            </div>

            {/* MAIN AMOUNT HIGHLIGHT BOX */}
            <div className="bg-[#142B4A] text-white rounded-lg p-5 mb-5 border-t-4 border-[#C6A45A]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="text-[9.5px] font-black text-[#C6A45A] uppercase tracking-widest">
                    Voucher Principal Amount (বিল টাকার পরিমাণ)
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
                    ৳ {formatBDT(Number(expense.amount || 0))}
                  </div>
                  <div className="text-xs text-slate-300 font-semibold mt-0.5">
                    Bangladeshi Taka (BDT)
                  </div>
                </div>

                <div className="text-left sm:text-right bg-white/10 p-2.5 rounded-lg border border-[#C6A45A]/30">
                  <div className="text-[8.5px] font-bold text-[#C6A45A] uppercase tracking-wider">
                    Workflow Settlement
                  </div>
                  <div className="text-xs font-black text-white mt-0.5">
                    {expense.status === 'APPROVED'
                      ? 'Approved & Ready for Cash/Adj'
                      : expense.status === 'REJECTED'
                      ? 'Bill Disallowed'
                      : 'Under Verification'}
                  </div>
                  <div className="text-[9px] text-slate-300 font-mono mt-0.5">
                    Ref: #{expense.id.slice(0, 8)}
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              <div className="mt-3.5 pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[8.5px] font-bold text-[#C6A45A] uppercase tracking-wider">
                    Amount in Words (English)
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">{amountWordsEn}</div>
                </div>
                <div>
                  <div className="text-[8.5px] font-bold text-[#C6A45A] uppercase tracking-wider">
                    কথায় (বাংলা)
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">{amountWordsBn}</div>
                </div>
              </div>
            </div>

            {/* RESTRICTED EMPLOYEE FINANCIAL SUMMARY */}
            <div className="mb-5">
              <div className="flex justify-between items-center text-[10px] font-black text-[#142B4A] uppercase tracking-wider mb-2">
                <span>Individual Staff Financial Position (ব্যক্তিগত হিসাব স্থিতি)</span>
                <span className="text-[9px] font-semibold text-slate-400">
                  Staff ID: {staffId} • Private Staff Ledger
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#F3F6FA] border border-slate-200 rounded p-2.5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                    Today's Received Adv
                  </div>
                  <div className="text-xs font-black text-[#142B4A] mt-1">
                    ৳ {formatBDT(stats.staffTodayAdvances)}
                  </div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Regular advance today</div>
                </div>

                <div className="bg-[#F3F6FA] border border-slate-200 rounded p-2.5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                    All-Time Advance
                  </div>
                  <div className="text-xs font-black text-[#142B4A] mt-1">
                    ৳ {formatBDT(stats.totalRegularAdvance)}
                  </div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Total regular drawn</div>
                </div>

                <div className="bg-[#F3F6FA] border border-slate-200 rounded p-2.5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                    Total Approved Bills
                  </div>
                  <div className="text-xs font-black text-emerald-700 mt-1">
                    ৳ {formatBDT(stats.totalApprovedExpenses)}
                  </div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Total adjusted expenses</div>
                </div>

                <div
                  className="rounded p-2.5 border"
                  style={{
                    backgroundColor: stats.balance < 0 ? '#FEF2F2' : '#F0FDF4',
                    borderColor: stats.balance < 0 ? '#FCA5A5' : '#86EFAC',
                  }}
                >
                  <div
                    className="text-[8px] font-black uppercase tracking-wider"
                    style={{ color: stats.balance < 0 ? '#991B1B' : '#166534' }}
                  >
                    {stats.balance < 0 ? 'Payable to Staff' : 'Cash in Hand (অতিরিক্ত)'}
                  </div>
                  <div
                    className="text-xs font-black mt-1"
                    style={{ color: stats.balance < 0 ? '#B91C1C' : '#15803D' }}
                  >
                    ৳ {formatBDT(Math.abs(stats.balance))}
                  </div>
                  <div
                    className="text-[8px] mt-0.5"
                    style={{ color: stats.balance < 0 ? '#991B1B' : '#166534' }}
                  >
                    {stats.balance < 0 ? 'Due reimbursement' : 'Advance in hand'}
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMIZED EXPENSE TABLE */}
            <div className="mb-5 overflow-x-auto">
              <div className="text-[10px] font-black text-[#142B4A] uppercase tracking-wider mb-2">
                Itemized Particulars / Bill Description (খরচের বিবরণ)
              </div>

              <table className="w-full border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-[#142B4A] text-white">
                    <th className="p-2.5 text-center w-10 border-r border-white/20 font-black text-[9.5px]">
                      SL
                    </th>
                    <th className="p-2.5 text-left w-24 border-r border-white/20 font-black text-[9.5px]">
                      Date
                    </th>
                    <th className="p-2.5 text-left border-r border-white/20 font-black text-[9.5px]">
                      Particulars / Purpose / Description
                    </th>
                    <th className="p-2.5 text-center w-20 border-r border-white/20 font-black text-[9.5px]">
                      Scope / Qty
                    </th>
                    <th className="p-2.5 text-right w-28 font-black text-[9.5px]">Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="p-3 text-center font-bold text-slate-500 border-b border-r border-slate-200 align-top">
                      01
                    </td>
                    <td className="p-3 text-left font-medium text-slate-800 border-b border-r border-slate-200 align-top">
                      {dateFormattedEn}
                      <div className="text-[9px] text-slate-400 mt-0.5">{timeFormatted}</div>
                    </td>
                    <td className="p-3 text-left border-b border-r border-slate-200 align-top">
                      <div className="font-bold text-[#142B4A] text-sm break-words">
                        {expense.reason}
                      </div>
                      <div className="text-[9.5px] text-slate-500 mt-1 flex gap-3">
                        <span>Beneficiary: <strong>{staffName}</strong></span>
                        <span>Location: <strong>{workLocation}</strong></span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-600 border-b border-r border-slate-200 align-top">
                      1 Entry
                    </td>
                    <td className="p-3 text-right font-black text-[#142B4A] text-sm border-b border-slate-200 align-top">
                      ৳ {formatBDT(Number(expense.amount || 0))}
                    </td>
                  </tr>

                  <tr className="bg-[#F3F6FA] font-bold">
                    <td
                      colSpan={4}
                      className="p-2.5 text-right text-slate-600 border-b border-r border-slate-200 text-[10px] uppercase"
                    >
                      Subtotal (মোট বিল পরিমাণ):
                    </td>
                    <td className="p-2.5 text-right text-[#142B4A] font-black border-b border-slate-200 text-xs">
                      ৳ {formatBDT(Number(expense.amount || 0))}
                    </td>
                  </tr>

                  <tr className="bg-white font-black">
                    <td
                      colSpan={4}
                      className="p-2.5 text-right text-[#142B4A] border-b border-r border-slate-200 text-[10px] uppercase"
                    >
                      Authorized Net Payable / Settlement:
                    </td>
                    <td
                      className="p-2.5 text-right border-b border-slate-200 text-sm"
                      style={{ color: expense.status === 'APPROVED' ? '#15803D' : '#B45309' }}
                    >
                      ৳ {expense.status === 'APPROVED' ? formatBDT(Number(expense.amount || 0)) : '0.00 (Pending)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* REJECTION REASON (IF REJECTED) */}
            {expense.status === 'REJECTED' && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3.5 mb-5 text-red-800">
                <div className="text-[9px] font-black uppercase tracking-wider text-red-700">
                  Bill Disallowed / বাতিলের কারণ:
                </div>
                <div className="text-xs font-bold text-red-900 mt-1">
                  কর্তৃপক্ষ কর্তৃক এই বিলটি বাতিল করা হয়েছে। বিস্তারিত জানতে অ্যাকাউন্টস বা ম্যানেজমেন্টের সাথে যোগাযোগ করুন।
                </div>
              </div>
            )}

            {/* ATTACHED RECEIPT / VOUCHER IMAGE PREVIEW (IF ATTACHED) */}
            {expense.voucherImage && (
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-black text-[#142B4A] uppercase tracking-wider">
                      Attached Physical Receipt / সংযুক্ত ভাউচারের মূল কপি
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Verified Upload
                    </span>
                  </div>
                  <a
                    href={expense.voucherImage}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-[#2457A7] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>পূর্ণাঙ্গ ভিউ</span>
                  </a>
                </div>
                <div className="relative group max-h-48 overflow-hidden rounded border border-slate-200 bg-slate-100 flex justify-center">
                  <img
                    src={expense.voucherImage}
                    alt="Attached physical voucher receipt"
                    className="max-h-48 object-contain cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => {
                      const win = window.open();
                      if (win) {
                        win.document.write(`<img src="${expense.voucherImage}" style="max-width:100%; height:auto;" />`);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* QR CODE & SECURITY VERIFICATION */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 mb-6">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="Voucher Verification QR"
                    className="w-16 h-16 border border-slate-200 p-1 rounded bg-white shrink-0"
                  />
                )}
                <div>
                  <div className="text-[9px] font-black text-[#142B4A] uppercase tracking-wider">
                    Document Security & Verification
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                    Token: <span className="font-mono text-[#2457A7]">#AUTH-{expense.id.toUpperCase()}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5 max-w-sm">
                    Scan QR code to verify authenticity. Synchronized with Depend Sourcing Cloud & Local ledger.
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-[8.5px] font-black text-slate-400 uppercase">Doc Class</div>
                <div className="text-[10px] font-black text-[#142B4A]">FIN-VCH-DS</div>
                <div className="text-[8.5px] text-slate-400">Confidential</div>
              </div>
            </div>

            {/* SIGNATURE BLOCKS */}
            <div className="grid grid-cols-3 gap-4 pt-4 mt-6 text-center">
              <div>
                <div className="border-t border-slate-300 w-4/5 mx-auto mb-1.5"></div>
                <div className="text-xs font-bold text-[#142B4A]">{staffName}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Beneficiary / Receiver
                </div>
                <div className="text-[8px] text-slate-400">Submitted via App</div>
              </div>

              <div>
                <div className="border-t border-slate-300 w-4/5 mx-auto mb-1.5"></div>
                <div className="text-xs font-bold text-[#142B4A]">Accounts & Audit</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Checked & Verified By
                </div>
                <div className="text-[8px] text-slate-400">Office Administration</div>
              </div>

              <div>
                <div className="border-t-2 border-[#C6A45A] w-4/5 mx-auto mb-1.5"></div>
                <div className="text-xs font-bold text-[#142B4A]">{signatoryName}</div>
                <div className="text-[9px] font-bold text-[#C6A45A] uppercase tracking-wider">
                  {signatoryTitle}
                </div>
                <div className="text-[8px] text-slate-500">{signatoryOrg}</div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-center text-[8.5px] text-slate-400">
              <div>
                This document was electronically generated by Depend Sourcing Office Management & Billing Center System.
              </div>
              <div className="font-mono">
                Page 1 of 1 • System Generated: {new Date().toISOString().split('T')[0]}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

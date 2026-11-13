import React from 'react';
import { Receipt, Clock, CheckCircle2, X } from 'lucide-react';
import { COMPANY_FULL_NAME, DEPEND_NOTIFICATION_ASSETS } from '../services/notificationDesignService';

interface BillReminderGlassBannerProps {
  title: string;
  message: string;
  canSnooze: boolean;
  reminderCount: number;
  maxReminders: number;
  onBillNow: () => void;
  onSnooze10m: () => void;
  onNoBillToday: () => void;
  onDismiss: () => void;
}

export const BillReminderGlassBanner: React.FC<BillReminderGlassBannerProps> = ({
  title,
  message,
  canSnooze,
  reminderCount,
  maxReminders,
  onBillNow,
  onSnooze10m,
  onNoBillToday,
  onDismiss,
}) => {
  return (
    <div
      role="dialog"
      aria-label="Daily Bill Reminder"
      className="fixed bottom-24 md:bottom-6 right-4 left-4 md:left-auto md:w-[410px] z-[240] rounded-3xl border border-white/40 dark:border-white/15 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.28)] p-4 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <img
          src={DEPEND_NOTIFICATION_ASSETS.LARGE_ICON}
          alt={COMPANY_FULL_NAME}
          className="w-11 h-11 rounded-2xl object-contain bg-white p-1 border border-slate-200/70 dark:border-slate-700/70 shadow-sm shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold tracking-wide text-slate-600 dark:text-slate-300 truncate">
              {COMPANY_FULL_NAME} • বিল রিমাইন্ডার ({reminderCount}/{maxReminders})
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="বন্ধ করুন"
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug mt-0.5">
            {title}
          </h4>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed mt-1.5 whitespace-pre-line">
            {message}
          </p>
        </div>
      </div>

      {/* Three side-by-side equal-width compact Glass UI Action Buttons */}
      <div className={`grid ${canSnooze ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-3.5`}>
        {/* 1. Light Teal Glass Effect */}
        <button
          type="button"
          onClick={onBillNow}
          className="w-full px-2 py-2 rounded-xl border border-teal-400/45 bg-teal-400/20 hover:bg-teal-400/30 active:scale-[0.98] backdrop-blur-md text-teal-900 dark:text-teal-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm whitespace-nowrap"
        >
          <Receipt className="w-3.5 h-3.5 shrink-0" />
          <span>এখনই করছি</span>
        </button>

        {/* 2. Light Grey Glass Effect */}
        {canSnooze && (
          <button
            type="button"
            onClick={onSnooze10m}
            className="w-full px-2 py-2 rounded-xl border border-slate-400/40 bg-slate-400/20 hover:bg-slate-400/30 active:scale-[0.98] backdrop-blur-md text-slate-800 dark:text-slate-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>১০ মিনিট পর</span>
          </button>
        )}

        {/* 3. Light Red/Rose Glass Effect */}
        <button
          type="button"
          onClick={onNoBillToday}
          className="w-full px-2 py-2 rounded-xl border border-rose-400/45 bg-rose-400/20 hover:bg-rose-400/30 active:scale-[0.98] backdrop-blur-md text-rose-900 dark:text-rose-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm whitespace-nowrap"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>বিল নেই</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Flame,
  Award,
  BookOpen,
  Trophy,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';
import { LanguageConfig, UserLanguageProgress } from '../core/types';

interface LanguageDashboardCardProps {
  langConfig: LanguageConfig;
  progress: UserLanguageProgress;
  totalLessons: number;
  onContinue: () => void;
}

export const LanguageDashboardCard: React.FC<LanguageDashboardCardProps> = ({
  langConfig,
  progress,
  totalLessons,
  onContinue,
}) => {
  const completedCount = progress.completedDays?.length || 0;
  const progressPercent = Math.min(100, Math.round((completedCount / (totalLessons || 1)) * 100));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
      <div>
        {/* Top Flag & Title */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-3xl shadow-xs">
              {langConfig.flag}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-gray-900 dark:text-white">
                  {langConfig.name}
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  {progress.level}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">{langConfig.nativeName}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 line-clamp-2 leading-relaxed">
          {langConfig.descriptionBn}
        </p>

        {/* Progress Bar & Stats */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-gray-500">অগ্রগতি (Progress)</span>
            <span className="text-gray-900 dark:text-white">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${langConfig.bannerGradient} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">দিন</span>
            <span className="text-sm font-black text-gray-800 dark:text-gray-200">
              Day {progress.currentDay || 1}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100/60 dark:border-orange-900/40">
            <span className="text-[10px] text-orange-600 font-bold uppercase block flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" /> স্ট্রিক
            </span>
            <span className="text-sm font-black text-orange-700 dark:text-orange-300">
              {progress.streak}d
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/40">
            <span className="text-[10px] text-amber-600 font-bold uppercase block flex items-center justify-center gap-1">
              <Award className="w-3 h-3" /> XP
            </span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-300">
              {progress.xp}
            </span>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className={`w-full py-3 rounded-2xl font-black text-xs md:text-sm text-white flex items-center justify-center gap-2 bg-gradient-to-r ${langConfig.bannerGradient} hover:opacity-95 active:scale-95 transition-all shadow-md`}
      >
        <span>Continue Learning (চালিয়ে যান)</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

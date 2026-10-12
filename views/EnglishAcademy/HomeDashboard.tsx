import React, { useState } from 'react';
import {
  Flame,
  Award,
  BookOpen,
  Mic,
  BookmarkCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';
import { UserLearningProfile } from './types';
import { COURSES_DATA } from './courseData';

interface HomeDashboardProps {
  profile: UserLearningProfile;
  onNavigateTab: (tab: string) => void;
  onContinueLearning: () => void;
  onCompleteDailyChallenge: () => void;
  dailyChallengeCompleted: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  profile,
  onNavigateTab,
  onContinueLearning,
  onCompleteDailyChallenge,
  dailyChallengeCompleted,
}) => {
  const [challengeClaimed, setChallengeClaimed] = useState(dailyChallengeCompleted);

  // Level thresholds
  const currentLevel = profile.level || 1;
  const currentXp = profile.xp || 0;
  const nextLevelXp = currentLevel * 200;
  const currentLevelBaseXp = (currentLevel - 1) * 200;
  const progressInLevel = Math.min(
    100,
    Math.max(0, Math.round(((currentXp - currentLevelBaseXp) / 200) * 100))
  );

  const dailyGoalPercent = Math.min(
    100,
    Math.round(((profile.dailyGoalProgress || 0) / (profile.dailyGoalTarget || 50)) * 100)
  );

  const completedLessonCount = (profile.completedLessons || []).length;
  const totalLessons = COURSES_DATA.length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Streak Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-pink-500/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>প্রফেশনাল ইংলিশ একাডেমি</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              স্বাগতম, {profile.userName || 'লার্নার'}!
            </h1>
            <p className="text-indigo-100 text-sm max-w-lg leading-relaxed">
              অফিসিয়াল যোগাযোগ, মিটিং, ইমেইল ও কনভারসেশনে আপনার আত্মবিশ্বাস বাড়াতে প্রতিদিন মাত্র ১০ মিনিট অনুশীলন করুন।
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 self-stretch md:self-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 border border-amber-400/30">
                <Flame className="w-7 h-7 fill-amber-400 animate-pulse text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                  লার্নিং স্ট্রিক
                </p>
                <p className="text-2xl font-black text-white">
                  {profile.streak} <span className="text-xs font-medium text-amber-300">দিন</span>
                </p>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div>
              <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                লেভেল {currentLevel}
              </p>
              <p className="text-sm font-black text-white">
                {currentXp} <span className="text-[10px] font-bold text-indigo-300">XP</span>
              </p>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/15">
          <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-indigo-100">
            <span>লেভেল {currentLevel} অগ্রগতি</span>
            <span>{currentXp} / {nextLevelXp} XP</span>
          </div>
          <div className="w-full h-3 bg-black/25 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${progressInLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              মোট লার্নিং দিন
            </p>
            <p className="text-xl font-black text-gray-800 dark:text-white">
              {profile.totalDays || 1} <span className="text-xs font-normal text-gray-500">দিন</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              শেখা শব্দভাণ্ডার
            </p>
            <p className="text-xl font-black text-gray-800 dark:text-white">
              {(profile.masteredWordIds || []).length}{' '}
              <span className="text-xs font-normal text-gray-500">টি শব্দ</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              স্পিকিং প্র্যাকটিস
            </p>
            <p className="text-xl font-black text-gray-800 dark:text-white">
              {profile.speakingMinutes || 0} <span className="text-xs font-normal text-gray-500">মিনিট</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              সম্পন্ন লেসন
            </p>
            <p className="text-xl font-black text-gray-800 dark:text-white">
              {completedLessonCount} / {totalLessons}
            </p>
          </div>
        </div>
      </div>

      {/* Target Progress & Daily Challenge in 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Goal Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">
                দৈনিক লক্ষ্য ও টার্গেট
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
              {profile.dailyGoalProgress || 0} / {profile.dailyGoalTarget || 50} XP
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            প্রতিদিন ৫০ XP অর্জন করে আপনার স্ট্রিক অটুট রাখুন। লেসন বা কুইজ সম্পন্ন করলে XP যুক্ত হবে।
          </p>

          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${dailyGoalPercent}%` }}
            />
          </div>

          <button
            onClick={onContinueLearning}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20"
          >
            <span>পড়া চালিয়ে যান (Continue Learning)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Daily Challenge Card */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <Sparkles className="w-4 h-4 fill-amber-500 text-amber-600" />
                আজকের স্পেশাল চ্যালেঞ্জ
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                +25 XP
              </span>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
              ৫টি নতুন অফিস ভোকাবুলারি ফ্ল্যাশকার্ড সম্পন্ন করুন
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              শব্দভাণ্ডার বিল্ডারে গিয়ে অন্তত ৫টি নতুন শব্দ শিখে রিভিও করুন এবং আজকের চ্যালেঞ্জ বোনাস সংগ্রহ করুন।
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/30 flex items-center justify-between">
            {challengeClaimed ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>চ্যালেঞ্জ সম্পন্ন হয়েছে! বোনাস যোগ হয়েছে।</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  onCompleteDailyChallenge();
                  setChallengeClaimed(true);
                }}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                চ্যালেঞ্জ সম্পূর্ণ করুন (+25 XP)
              </button>
            )}
            <button
              onClick={() => onNavigateTab('vocabulary')}
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
            >
              ভোকাবুলারিতে যান
            </button>
          </div>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div>
        <h3 className="text-base font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          লার্নিং সেকশনসমূহ
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigateTab('courses')}
            className="cursor-pointer group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              লার্নিং পাথ (Courses)
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              Beginner থেকে Advanced ৪টি ধাপে ভাগ করা স্ট্রাকচার্ড লেসন ও অডিও উচ্চারণ।
            </p>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              কোর্স শুরু করুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('speaking')}
            className="cursor-pointer group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-600 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              AI স্পিকিং প্র্যাকটিস
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              মাইক্রোফোনে কথা বলে এআই টিউটরের সাথে মিটিং, ইন্টারভিউ ও অফিস চ্যাট প্র্যাকটিস করুন।
            </p>
            <span className="text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              কথা বলা শুরু করুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('vocabulary')}
            className="cursor-pointer group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              ভোকাবুলারি বিল্ডার
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              প্রতিদিনের প্রয়োজনীয় শব্দ, ফ্ল্যাশকার্ড ও বুকমার্ক করা শব্দ রিভিশন দিন।
            </p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              শব্দ শিখুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('grammar')}
            className="cursor-pointer group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              গ্রামার ও কুইজ
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              টেন্স, প্রিপজিশন, সাধারণ ভুল সংশোধন ও ব্যাখ্যাসহ ইন্টারঅ্যাক্টিভ কুইজ।
            </p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              কুইজ খেলুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('office')}
            className="cursor-pointer group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              অফিস ইংলিশ & ইমেইল
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              রেডিমেড ইমেইল টেমপ্লেট, অ্যাকাউন্টস ও ফাইন্যান্স শব্দকোষ এবং মিটিং ডায়ালগ।
            </p>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              টেমপ্লেট দেখুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('leaderboard')}
            className="cursor-pointer group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-600 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
              লিডারবোর্ড ও ব্যাজ
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              অফিসের সহকর্মীদের মধ্যে কার লার্নিং র‍্যাংক কত এবং আপনার অর্জিত ব্যাজসমূহ।
            </p>
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              র‍্যাংক দেখুন <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

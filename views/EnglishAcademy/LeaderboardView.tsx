import React from 'react';
import {
  Award,
  Trophy,
  Flame,
  Star,
  Sparkles,
  CheckCircle2,
  Lock,
  BookmarkCheck,
  Mic,
  GraduationCap
} from 'lucide-react';
import { UserLearningProfile, Badge } from './types';

interface LeaderboardViewProps {
  currentProfile: UserLearningProfile;
  allStaffProfiles: UserLearningProfile[];
}

const BADGES_LIST: Badge[] = [
  {
    id: 'b-first-lesson',
    title: 'First Step',
    titleBn: 'প্রথম পদক্ষেপ',
    descriptionBn: 'প্রথম ইংরেজি লেসন সম্পূর্ণ করার স্বীকৃতি।',
    icon: 'GraduationCap',
    requiredLessons: 1,
  },
  {
    id: 'b-streak-3',
    title: 'Streak Starter',
    titleBn: 'স্ট্রিক স্টার্টার',
    descriptionBn: 'টানা ৩ দিন নিয়মিত ইংরেজি অনুশীলন।',
    icon: 'Flame',
    requiredStreak: 3,
  },
  {
    id: 'b-streak-7',
    title: 'Dedication Master',
    titleBn: 'নিষ্ঠাবান শিক্ষার্থী',
    descriptionBn: 'টানা ৭ দিন নিয়মিত অনুশীলন বজায় রাখা।',
    icon: 'Flame',
    requiredStreak: 7,
  },
  {
    id: 'b-vocab-10',
    title: 'Word Collector',
    titleBn: 'শব্দ সংগ্রাহক',
    descriptionBn: '১০টি ইংরেজি শব্দ সফলভাবে আয়ত্ত করা।',
    icon: 'BookmarkCheck',
    requiredWords: 10,
  },
  {
    id: 'b-speaker',
    title: 'Confident Speaker',
    titleBn: 'আত্মবিশ্বাসী বক্তা',
    descriptionBn: 'AI স্পিকিং প্র্যাকটিসে অন্তত ১৫ মিনিট ব্যয় করা।',
    icon: 'Mic',
  },
  {
    id: 'b-xp-500',
    title: '500 XP Club',
    titleBn: '৫০০ এক্সপি ক্লাব',
    descriptionBn: 'মোট ৫০০ লার্নিং এক্সপি অর্জন।',
    icon: 'Trophy',
    requiredXp: 500,
  },
];

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentProfile,
  allStaffProfiles,
}) => {
  // Sort leaderboard by XP descending
  const sortedProfiles = [...allStaffProfiles].sort((a, b) => (b.xp || 0) - (a.xp || 0));

  // Determine unlocked badges for current user
  const isBadgeUnlocked = (b: Badge) => {
    if (currentProfile.unlockedBadges?.includes(b.id)) return true;
    if (b.requiredLessons && (currentProfile.completedLessons || []).length >= b.requiredLessons) return true;
    if (b.requiredStreak && (currentProfile.streak || 0) >= b.requiredStreak) return true;
    if (b.requiredWords && (currentProfile.masteredWordIds || []).length >= b.requiredWords) return true;
    if (b.requiredXp && (currentProfile.xp || 0) >= b.requiredXp) return true;
    if (b.id === 'b-speaker' && (currentProfile.speakingMinutes || 0) >= 15) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* User Progress Showcase Card */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-2">
              <Trophy className="w-3.5 h-3.5 text-yellow-200" />
              <span>আপনার ব্যক্তিগত অর্জন</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              {currentProfile.userName || 'লার্নার'}
            </h2>
            <p className="text-amber-100 text-xs mt-1">
              লেভেল {currentProfile.level || 1} • মোট অর্জিত XP: {currentProfile.xp || 0}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/15 backdrop-blur-md p-3 rounded-2xl border border-white/20 self-stretch md:self-auto justify-around">
            <div className="text-center px-3">
              <p className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                স্ট্রিক
              </p>
              <p className="text-xl font-black text-white flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 fill-amber-300 text-amber-400" />
                {currentProfile.streak || 0} দিন
              </p>
            </div>
            <div className="w-[1px] h-8 bg-white/20" />
            <div className="text-center px-3">
              <p className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                শেখা শব্দ
              </p>
              <p className="text-xl font-black text-white">
                {(currentProfile.masteredWordIds || []).length}
              </p>
            </div>
            <div className="w-[1px] h-8 bg-white/20" />
            <div className="text-center px-3">
              <p className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                স্পিকিং
              </p>
              <p className="text-xl font-black text-white">
                {currentProfile.speakingMinutes || 0} মি.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Collection Grid */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          অর্জিত ব্যাজসমূহ (Achievement Badges)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {BADGES_LIST.map((badge) => {
            const unlocked = isBadgeUnlocked(badge);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-between ${
                  unlocked
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 text-gray-400 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-xs ${
                    unlocked
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  {unlocked ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                </div>

                <div>
                  <p className="text-xs font-bold line-clamp-1">{badge.titleBn}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-tight">
                    {badge.descriptionBn}
                  </p>
                </div>

                <div className="mt-2">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      unlocked
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {unlocked ? '✓ অর্জিত' : 'লকড'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company Staff Leaderboard */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              কোম্পানি লার্নিং লিডারবোর্ড (Company Leaderboard)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              সহকর্মীদের মধ্যে সেরা শিক্ষার্থীদের র‍্যাংকিং তালিকা
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
            রিয়েল-টাইম
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sortedProfiles.map((p, idx) => {
            const isMe = p.userId === currentProfile.userId;
            const rank = idx + 1;

            return (
              <div
                key={p.userId || idx}
                className={`py-3.5 px-4 rounded-2xl flex items-center justify-between transition-colors ${
                  isMe
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      rank === 1
                        ? 'bg-yellow-400 text-yellow-950 shadow-md shadow-yellow-400/30'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-800'
                        : rank === 3
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </div>

                  <div>
                    <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>{p.userName}</span>
                      {isMe && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-indigo-600 text-white">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      লেভেল {p.level || 1} • {p.streak || 0} দিন স্ট্রিক
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {p.xp || 0} XP
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    {(p.completedLessons || []).length} লেসন সম্পন্ন
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

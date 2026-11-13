import React from 'react';
import {
  Sparkles,
  Target,
  Brain,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight,
  Flame,
  Clock,
  ShieldCheck,
  Zap,
  Mic,
  Headphones,
  BookOpen,
  Layers
} from 'lucide-react';
import {
  LanguageConfig,
  CefrLevel,
  UserLanguageProgress,
  CEFR_LEVELS_METADATA,
  WeakTopic
} from './types';

interface UniversalPersonalAssistantProps {
  langConfig: LanguageConfig;
  progress: UserLanguageProgress;
  onNavigateToTab: (section: string) => void;
  onStartExam: () => void;
}

export const UniversalPersonalAssistant: React.FC<UniversalPersonalAssistantProps> = ({
  langConfig,
  progress,
  onNavigateToTab,
  onStartExam,
}) => {
  const cefrLevel: CefrLevel = progress.cefrLevel || 'A1';
  const levelInfo = CEFR_LEVELS_METADATA[cefrLevel];

  // Practice Distribution: Target is 50% Speaking, 25% Listening, 15% Vocab, 10% Grammar
  const dist = progress.practiceDistribution || {
    speakingMinutes: Math.max(12, progress.conversationMinutes || 12),
    listeningMinutes: Math.max(8, Math.round((progress.conversationMinutes || 12) * 0.5)),
    vocabMinutes: Math.max(5, progress.masteredWordIds?.length ? Math.round(progress.masteredWordIds.length * 0.3) : 6),
    grammarMinutes: Math.max(3, (progress.completedQuizzesCount || 2) * 2),
  };

  const totalMinutes = Math.max(1, dist.speakingMinutes + dist.listeningMinutes + dist.vocabMinutes + dist.grammarMinutes);

  const actualSpeakingPct = Math.round((dist.speakingMinutes / totalMinutes) * 100);
  const actualListeningPct = Math.round((dist.listeningMinutes / totalMinutes) * 100);
  const actualVocabPct = Math.round((dist.vocabMinutes / totalMinutes) * 100);
  const actualGrammarPct = Math.max(0, 100 - (actualSpeakingPct + actualListeningPct + actualVocabPct));

  // Readiness for Speaking Exam
  const lessonsCompleted = progress.completedDays?.length || 0;
  const isLessonsReady = lessonsCompleted >= levelInfo.requiredLessonsCount;
  const isSpeakingReady = dist.speakingMinutes >= levelInfo.requiredSpeakingMinutes;
  const isVocabReady = (progress.masteredWordIds?.length || 0) >= levelInfo.requiredVocabMastery;

  const readinessScore = Math.round(
    ((isLessonsReady ? 35 : (lessonsCompleted / levelInfo.requiredLessonsCount) * 35) +
      (isSpeakingReady ? 35 : (dist.speakingMinutes / levelInfo.requiredSpeakingMinutes) * 35) +
      (isVocabReady ? 30 : ((progress.masteredWordIds?.length || 0) / levelInfo.requiredVocabMastery) * 30))
  );

  const isExamReady = readinessScore >= 80;

  // Weak Topics
  const weakTopics: WeakTopic[] = progress.weakTopics && progress.weakTopics.length > 0
    ? progress.weakTopics
    : [
        {
          topic: `${langConfig.name} জটিল টোন ও স্বরভঙ্গির সাবলীলতা`,
          errorCount: 2,
          lastEncountered: 'আজ',
          languageCode: langConfig.code,
          samplePhrase: 'কথা বলার সময় গতি কিছুটা মন্থর রাখুন'
        },
        {
          topic: `${langConfig.name} কর্মক্ষেত্র ও পেমেন্ট সংক্রান্ত শব্দভাণ্ডার`,
          errorCount: 1,
          lastEncountered: 'গতকাল',
          languageCode: langConfig.code,
          samplePhrase: 'কন্ট্রাক্ট ও কোটেশনের প্রতিশব্দ রিভিশন প্রয়োজন'
        }
      ];

  return (
    <div className="space-y-6">
      {/* Assistant Persona Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-orange-500/20">
              <Brain className="w-9 h-9" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" /> AI Learning Engine Active
              </div>
              <h3 className="text-xl md:text-2xl font-black">
                AI Personal Language Coach
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                আপনার শেখার গতিবিধি বিশ্লেষণ করে কাস্টম দৈনিক অনুশীলন পরিকল্পনা তৈরি করা হয়েছে।
              </p>
            </div>
          </div>

          {/* Exam Readiness Indicator */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-800/40 text-center min-w-[200px]">
            <div className="text-[11px] font-bold text-slate-400">পরীক্ষার প্রস্তুতি সূচক</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{readinessScore}%</div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isExamReady ? '✅ স্পিকিং পরীক্ষার জন্য প্রস্তুত!' : 'আরও কিছু প্র্যাকটিস প্রয়োজন'}
            </p>
            {isExamReady ? (
              <button
                onClick={onStartExam}
                className="mt-2 w-full py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-colors shadow-sm"
              >
                পরীক্ষা দিন
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Part 4: Practice Distribution Meter (Target 50/25/15/10) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="font-black text-gray-900 dark:text-white text-base">
              ভারসাম্যপূর্ণ অনুশীলন বণ্টন (Balanced Practice Distribution)
            </h4>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
            মোট অনুশীলন: {totalMinutes} মিনিট
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          আন্তর্জাতিক মানদণ্ড অনুযায়ী ৫০% স্পিকিং, ২৫% লিসনিং, ১৫% শব্দভাণ্ডার ও ১০% ব্যাকরণ চর্চা রাখা উচিত:
        </p>

        {/* Multi-segment Progress Bar */}
        <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${actualSpeakingPct}%` }}
            className="bg-amber-500 transition-all"
            title={`Speaking: ${actualSpeakingPct}% (Target: 50%)`}
          />
          <div
            style={{ width: `${actualListeningPct}%` }}
            className="bg-cyan-500 transition-all"
            title={`Listening: ${actualListeningPct}% (Target: 25%)`}
          />
          <div
            style={{ width: `${actualVocabPct}%` }}
            className="bg-emerald-500 transition-all"
            title={`Vocabulary: ${actualVocabPct}% (Target: 15%)`}
          />
          <div
            style={{ width: `${actualGrammarPct}%` }}
            className="bg-indigo-600 transition-all"
            title={`Grammar: ${actualGrammarPct}% (Target: 10%)`}
          />
        </div>

        {/* 4 Pillars Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* Speaking */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold">
              <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> কথা বলা (Speaking)</span>
              <span>টার্গেট: ৫০%</span>
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
              {actualSpeakingPct}% <span className="text-xs font-normal text-gray-500">({dist.speakingMinutes} মি.)</span>
            </div>
          </div>

          {/* Listening */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-900/40">
            <div className="flex items-center justify-between text-xs text-cyan-700 dark:text-cyan-400 font-bold">
              <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" /> শোনা (Listening)</span>
              <span>টার্গেট: ২৫%</span>
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
              {actualListeningPct}% <span className="text-xs font-normal text-gray-500">({dist.listeningMinutes} মি.)</span>
            </div>
          </div>

          {/* Vocabulary */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> শব্দভাণ্ডার (Vocab)</span>
              <span>টার্গেট: ১৫%</span>
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
              {actualVocabPct}% <span className="text-xs font-normal text-gray-500">({dist.vocabMinutes} মি.)</span>
            </div>
          </div>

          {/* Grammar */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-bold">
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> ব্যাকরণ (Grammar)</span>
              <span>টার্গেট: ১০%</span>
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
              {actualGrammarPct}% <span className="text-xs font-normal text-gray-500">({dist.grammarMinutes} মি.)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weak Points & AI Recommendations Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Topics Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>দুর্বল বিষয়সমূহ (Weak Topics Queue)</span>
          </div>

          <div className="space-y-2.5">
            {weakTopics.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                  <span>{item.topic}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                    {item.errorCount} বার ভুল
                  </span>
                </div>
                {item.samplePhrase && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    💡 পরামর্শ: {item.samplePhrase}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateToTab('practice')}
            className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs hover:bg-gray-200 transition-colors"
          >
            দুর্বল পয়েন্ট রিভিশন শুরু করুন
          </button>
        </div>

        {/* Personalized Daily Plan */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-sm">
            <Zap className="w-4 h-4" />
            <span>আজকের লক্ষ্য ও পরামর্শ (Daily AI Plan)</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-900 dark:text-white">১০ মিনিট AI স্পিকিং কথোপকথন</p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  {langConfig.name}-এ রেস্তোরাঁ বা সাপ্লায়ার সংক্রান্ত একটি সিনারিও সম্পন্ন করুন।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900">
              <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-900 dark:text-white">৫টি শব্দভাণ্ডার ফ্ল্যাশকার্ড রিভিশন</p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  স্পেসড রিপিটেশন অ্যালগরিদম অনুযায়ী আজ আপনার ৫টি কার্ড রিভিশন বাকি আছে।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-900 dark:text-white">লেভেল পরীক্ষার প্রস্তুতি নিন</p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  CEFR {cefrLevel} সার্টিফিকেট পেতে রিডিং এবং লিসনিং অংশ ঝালাই করুন।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

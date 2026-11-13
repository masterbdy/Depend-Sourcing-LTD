import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Lock,
  Volume2,
  ArrowRight,
  HelpCircle,
  Award,
  Sparkles,
  Layers,
  RotateCcw,
  X,
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
  Zap,
  Loader2,
} from 'lucide-react';
import { UniversalDailyLesson, UserLanguageProgress, LanguageConfig } from './types';

interface UniversalDailyLessonsListProps {
  langConfig: LanguageConfig;
  lessons: UniversalDailyLesson[];
  progress: UserLanguageProgress;
  onCompleteDay: (dayNumber: number, xpReward: number) => void;
  speakText: (text: string, langCode: string) => void;
  isSpeaking: boolean;
  onGenerateNextLesson?: (targetDay: number) => Promise<void>;
  isGeneratingNext?: boolean;
}

export const UniversalDailyLessonsList: React.FC<UniversalDailyLessonsListProps> = ({
  langConfig,
  lessons,
  progress,
  onCompleteDay,
  speakText,
  isSpeaking,
  onGenerateNextLesson,
  isGeneratingNext = false,
}) => {
  const [activeLesson, setActiveLesson] = useState<UniversalDailyLesson | null>(null);
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar' | 'dialogue' | 'quiz'>('vocab');

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const completedDays = progress.completedDays || [];

  const handleOpenLesson = (lesson: UniversalDailyLesson) => {
    setActiveLesson(lesson);
    setActiveTab('vocab');
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  const handleCheckQuiz = () => {
    if (!activeLesson) return;
    let score = 0;
    activeLesson.quiz.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const handleFinishLesson = () => {
    if (!activeLesson) return;
    onCompleteDay(activeLesson.day, activeLesson.xpReward);
    setActiveLesson(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with 3D Depth */}
      <div
        className={`bg-gradient-to-r ${langConfig.bannerGradient} rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl border border-white/20 relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none animate-float-delayed" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-black tracking-wide text-white shadow-inner mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
              <span>
                {langConfig.flag} {langConfig.name} লার্নিং পাথ • Beginner to Advanced
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black drop-shadow-sm">
              Day-by-Day {langConfig.name} কোর্স
            </h2>
            <p className="text-xs md:text-sm text-white/90 max-w-xl mt-1.5 leading-relaxed font-medium">
              প্রতিটি দিন ৪টি মূল স্তম্ভে সাজানো: শব্দভাণ্ডার, বাংলা উচ্চারণ, ব্যাকরণ, কথোপকথন ও কুইজ।
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-white/25 text-center min-w-[150px] shadow-xl hover:scale-105 transition-transform">
            <span className="text-[10px] uppercase font-black text-cyan-200 tracking-wider block">
              কোর্স অগ্রগতি
            </span>
            <span className="text-3xl font-black text-white drop-shadow-sm">
              {completedDays.length} / {lessons.length}
            </span>
            <span className="text-[10px] text-yellow-300 block font-black mt-1">
              Day {progress.currentDay || 1} চলমান
            </span>
          </div>
        </div>
      </div>

      {/* Fast-Track Adaptive Acceleration Bar */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Fast-Track Learning</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                কোনো দৈনিক সীমা নেই • Unlimited Pacing
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              এক দিনে ১, ২, ৫ বা ৭ দিনের পাঠ সম্পূর্ণ করুন। প্রতিটি পাঠে ১০–১৫টি নতুন শব্দ ও প্র্যাকটিক্যাল কথোপকথন।
            </p>
          </div>
        </div>

        {onGenerateNextLesson && (
          <button
            onClick={() => onGenerateNextLesson(lessons.length > 0 ? lessons[lessons.length - 1].day + 1 : 13)}
            disabled={isGeneratingNext}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGeneratingNext ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI পাঠ প্রস্তুত হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>পরবর্তী পাঠ আনলক করুন (Day {lessons.length > 0 ? lessons[lessons.length - 1].day + 1 : 13})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Lessons Grid with 3D Elevation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map((lesson) => {
          const isCompleted = completedDays.includes(lesson.day);
          const isUnlocked = lesson.day === 1 || completedDays.includes(lesson.day - 1);

          return (
            <div
              key={lesson.day}
              className={`rounded-[2rem] p-5 md:p-6 border transition-all duration-300 shadow-sm flex flex-col justify-between space-y-4 hover:-translate-y-1 ${
                isCompleted
                  ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 shadow-emerald-500/5'
                  : isUnlocked
                  ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/80 dark:border-slate-800 hover:border-blue-400 hover:shadow-xl shadow-blue-950/5'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full shadow-xs ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                          : isUnlocked
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      Day {lesson.day}
                    </span>
                    <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      {lesson.level}
                    </span>
                  </div>

                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" /> +{lesson.xpReward} XP
                  </span>
                </div>

                <h3 className="font-black text-base md:text-lg text-slate-900 dark:text-white mt-1">
                  {lesson.titleBn}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-medium leading-relaxed">
                  {lesson.objectiveBn}
                </p>

                {/* Badges Count */}
                <div className="flex items-center gap-3 mt-3.5 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">📖 {lesson.vocabulary.length} শব্দ</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">💬 {lesson.conversation.length} সংলাপ</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">❓ {lesson.quiz.length} কুইজ</span>
                </div>
              </div>

              <div>
                {isUnlocked ? (
                  <button
                    onClick={() => handleOpenLesson(lesson)}
                    className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-md hover:brightness-105 ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 shadow-emerald-600/10'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-blue-600/25 hover:shadow-lg'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>পুনরায় পড়ুন (Review Day {lesson.day})</span>
                      </>
                    ) : (
                      <>
                        <span>শুরু করুন (Start Day {lesson.day})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 border border-slate-200/50 dark:border-slate-700/50">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Day {lesson.day - 1} সম্পন্ন করে আনলক করুন</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lesson Interactive Modal with 3D Glassmorphism */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white">
              <div className="flex items-center gap-3.5">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float">
                  D{activeLesson.day}
                </span>
                <div>
                  <h3 className="font-black text-base md:text-xl text-white drop-shadow-xs">
                    {activeLesson.titleBn}
                  </h3>
                  <p className="text-xs text-cyan-200 font-medium">{activeLesson.title}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveLesson(null)}
                className="p-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Tabs */}
            <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md p-2 gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('vocab')}
                className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 ${
                  activeTab === 'vocab'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ১. শব্দভাণ্ডার ({activeLesson.vocabulary.length})
              </button>
              <button
                onClick={() => setActiveTab('grammar')}
                className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 ${
                  activeTab === 'grammar'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ২. গ্রামার ও নিয়ম
              </button>
              <button
                onClick={() => setActiveTab('dialogue')}
                className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 ${
                  activeTab === 'dialogue'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ৩. কথোপকথন
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 ${
                  activeTab === 'quiz'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ৪. কুইজ ও XP
              </button>
            </div>

            {/* Step Body */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: VOCABULARY */}
              {activeTab === 'vocab' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium">
                    প্রতিটি শব্দের বাংলা উচ্চারণ ও অর্থ লক্ষ্য করুন এবং স্পিকার বাটনে ট্যাপ করে অডিও শুনুন:
                  </p>
                  {activeLesson.vocabulary.map((w) => (
                    <div
                      key={w.id}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-gray-900 dark:text-white">
                            {w.targetWord}
                          </span>
                          {w.romanized && (
                            <span className="text-xs text-amber-600 font-semibold">
                              ({w.romanized})
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                          উচ্চারণ: {w.bengaliPronunciation}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5">
                          অর্থ: {w.bengaliMeaning}
                        </p>
                        {w.exampleTarget && (
                          <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200/60 dark:border-gray-800 pt-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              উদাহরণ: {w.exampleTarget}
                            </span>
                            <br />
                            <span>{w.exampleBengali}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => speakText(w.audioText, langConfig.voiceLangCode)}
                        className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors shrink-0"
                        title="উচ্চারণ শুনুন"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: GRAMMAR */}
              {activeTab === 'grammar' && (
                <div className="space-y-4">
                  {activeLesson.grammarNotes.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2"
                    >
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        {g.ruleTitleBn}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {g.explanationBn}
                      </p>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-xs space-y-1">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          সঠিক: {g.correctExample}
                        </p>
                        {g.incorrectExample && (
                          <p className="line-through text-red-500">
                            ভুল: {g.incorrectExample}
                          </p>
                        )}
                        <p className="text-gray-500 dark:text-gray-400">{g.exampleBn}</p>
                      </div>
                    </div>
                  ))}

                  {activeLesson.businessTipBn && (
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
                      <span className="font-bold block mb-1">💼 বিজনেস প্রোটোকল টিপ:</span>
                      {activeLesson.businessTipBn}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CONVERSATION */}
              {activeTab === 'dialogue' && (
                <div className="space-y-3">
                  {activeLesson.conversation.map((turn, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {turn.speaker} ({turn.speakerRoleBn})
                        </span>
                        <button
                          onClick={() => speakText(turn.targetText, langConfig.voiceLangCode)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {turn.targetText}
                      </p>
                      {turn.romanized && (
                        <p className="text-xs text-amber-600 font-semibold">{turn.romanized}</p>
                      )}
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        উচ্চারণ: {turn.bengaliPronunciation}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        অর্থ: {turn.bengaliMeaning}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: QUIZ */}
              {activeTab === 'quiz' && (
                <div className="space-y-4">
                  {activeLesson.quiz.map((q, idx) => {
                    const isSelected = !!selectedAnswers[q.id];
                    const isCorrect = selectedAnswers[q.id] === q.correctAnswer;

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 space-y-3"
                      >
                        <h4 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">
                          প্রশ্ন {idx + 1}: {q.questionBn}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => {
                            const isChosen = selectedAnswers[q.id] === opt;
                            let btnStyle =
                              'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200';

                            if (quizSubmitted) {
                              if (opt === q.correctAnswer) {
                                btnStyle = 'bg-emerald-500 text-white border-emerald-500 font-bold';
                              } else if (isChosen) {
                                btnStyle = 'bg-red-500 text-white border-red-500 font-bold';
                              }
                            } else if (isChosen) {
                              btnStyle =
                                'bg-amber-500 text-white border-amber-500 font-bold shadow-xs';
                            }

                            return (
                              <button
                                key={opt}
                                disabled={quizSubmitted}
                                onClick={() =>
                                  setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                }
                                className={`p-3 rounded-xl border text-xs text-left transition-all ${btnStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                            💡 {q.explanationBn}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {!quizSubmitted ? (
                    <button
                      onClick={handleCheckQuiz}
                      disabled={Object.keys(selectedAnswers).length < activeLesson.quiz.length}
                      className="w-full py-3 rounded-2xl bg-amber-500 text-white font-bold text-xs md:text-sm hover:bg-amber-600 disabled:opacity-40 transition-all shadow-md shadow-amber-500/20"
                    >
                      উত্তর জমা দিন (Submit Quiz)
                    </button>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3">
                      <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                        🎉 চমৎকার! কুইজ স্কোর: {quizScore} / {activeLesson.quiz.length}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                        <button
                          onClick={handleFinishLesson}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                        >
                          লেসন সমাপ্ত করুন ও +{activeLesson.xpReward} XP গ্রহণ করুন
                        </button>
                        {onGenerateNextLesson && (
                          <button
                            onClick={async () => {
                              const nextDay = activeLesson.day + 1;
                              handleFinishLesson();
                              await onGenerateNextLesson(nextDay);
                            }}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black hover:from-amber-400 hover:to-orange-400 transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>পরবর্তী পাঠে যান (Day {activeLesson.day + 1})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

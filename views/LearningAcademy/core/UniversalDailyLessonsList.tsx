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
  Lightbulb
} from 'lucide-react';
import { UniversalDailyLesson, UserLanguageProgress, LanguageConfig } from './types';

interface UniversalDailyLessonsListProps {
  langConfig: LanguageConfig;
  lessons: UniversalDailyLesson[];
  progress: UserLanguageProgress;
  onCompleteDay: (dayNumber: number, xpReward: number) => void;
  speakText: (text: string, langCode: string) => void;
  isSpeaking: boolean;
}

export const UniversalDailyLessonsList: React.FC<UniversalDailyLessonsListProps> = ({
  langConfig,
  lessons,
  progress,
  onCompleteDay,
  speakText,
  isSpeaking,
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
      {/* Header Banner */}
      <div
        className={`bg-gradient-to-r ${langConfig.bannerGradient} rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>
                {langConfig.flag} {langConfig.name} লার্নিং পাথ • Beginner to Advanced
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              Day-by-Day {langConfig.name} কোর্স
            </h2>
            <p className="text-xs md:text-sm text-white/90 max-w-xl mt-1 leading-relaxed">
              প্রতিটি দিন ৯টি স্তম্ভে সাজানো: ভোকাবুলারি, বাংলা উচ্চারণ, লিসেনিং, স্পিকিং, গ্রামার ও কুইজ।
            </p>
          </div>

          <div className="bg-black/25 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider block">
              কোর্স অগ্রগতি
            </span>
            <span className="text-2xl font-black text-white">
              {completedDays.length} / {lessons.length}
            </span>
            <span className="text-[10px] text-yellow-300 block font-semibold mt-0.5">
              Day {progress.currentDay || 1} চলমান
            </span>
          </div>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map((lesson) => {
          const isCompleted = completedDays.includes(lesson.day);
          const isUnlocked = lesson.day === 1 || completedDays.includes(lesson.day - 1);

          return (
            <div
              key={lesson.day}
              className={`rounded-3xl p-5 md:p-6 border transition-all shadow-sm flex flex-col justify-between space-y-4 ${
                isCompleted
                  ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40'
                  : isUnlocked
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-400'
                  : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isUnlocked
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      Day {lesson.day}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {lesson.level}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> +{lesson.xpReward} XP
                  </span>
                </div>

                <h3 className="font-bold text-base text-gray-900 dark:text-white mt-1">
                  {lesson.titleBn}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {lesson.objectiveBn}
                </p>

                {/* Badges Count */}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500 font-medium">
                  <span>📖 {lesson.vocabulary.length} শব্দ</span>
                  <span>💬 {lesson.conversation.length} সংলাপ</span>
                  <span>❓ {lesson.quiz.length} কুইজ</span>
                </div>
              </div>

              <div>
                {isUnlocked ? (
                  <button
                    onClick={() => handleOpenLesson(lesson)}
                    className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                        : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95'
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
                  <div className="py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Day {lesson.day - 1} সম্পন্ন করে আনলক করুন</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lesson Interactive Modal */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700">
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-gray-50 to-amber-50/40 dark:from-gray-900 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                  D{activeLesson.day}
                </span>
                <div>
                  <h3 className="font-black text-base md:text-lg text-gray-900 dark:text-white">
                    {activeLesson.titleBn}
                  </h3>
                  <p className="text-xs text-gray-500">{activeLesson.title}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveLesson(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-2 gap-2">
              <button
                onClick={() => setActiveTab('vocab')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'vocab'
                    ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ১. শব্দভাণ্ডার ({activeLesson.vocabulary.length})
              </button>
              <button
                onClick={() => setActiveTab('grammar')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'grammar'
                    ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ২. গ্রামার ও নিয়ম
              </button>
              <button
                onClick={() => setActiveTab('dialogue')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dialogue'
                    ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ৩. কথোপকথন
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'quiz'
                    ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
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
                      <button
                        onClick={handleFinishLesson}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-md"
                      >
                        লেসন সমাপ্ত করুন ও +{activeLesson.xpReward} XP গ্রহণ করুন
                      </button>
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

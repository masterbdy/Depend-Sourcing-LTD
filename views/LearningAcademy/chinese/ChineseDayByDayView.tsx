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
  Building2,
  MessageSquareQuote,
  Lightbulb
} from 'lucide-react';
import { ChineseLessonDay, UserChineseProgress } from './types';
import { CHINESE_LESSONS_DATA } from './chineseLessonsData';

interface ChineseDayByDayViewProps {
  progress: UserChineseProgress;
  onCompleteDay: (dayNumber: number, xpReward: number) => void;
  speakChinese: (text: string) => void;
  isSpeaking: boolean;
}

export const ChineseDayByDayView: React.FC<ChineseDayByDayViewProps> = ({
  progress,
  onCompleteDay,
  speakChinese,
  isSpeaking,
}) => {
  const [activeLesson, setActiveLesson] = useState<ChineseLessonDay | null>(null);
  const [activeStep, setActiveStep] = useState<'words' | 'dialogue' | 'quiz'>('words');

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const completedDays = progress.completedDays || [];

  const handleOpenDay = (lesson: ChineseLessonDay) => {
    setActiveLesson(lesson);
    setActiveStep('words');
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

  const handleFinishDay = () => {
    if (!activeLesson) return;
    onCompleteDay(activeLesson.day, activeLesson.xpReward);
    setActiveLesson(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>জিরো লেভেল থেকে চীনা সাপ্লায়ার কোর্স</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              Day-by-Day চাইনিজ লার্নিং পাথ
            </h2>
            <p className="text-xs md:text-sm text-red-100 max-w-xl mt-1 leading-relaxed">
              চীনা বর্ণমালা বা পিনয়িন না জেনেও প্রতিটি দিন ধাপে ধাপে সম্পন্ন করে চীনা সাপ্লায়ার ও কারখানার সাথে সরাসরি ডিল করার ভাষা শিখুন।
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-red-200 tracking-wider block">
              কোর্স অগ্রগতি
            </span>
            <span className="text-2xl font-black text-white">
              {completedDays.length} / {CHINESE_LESSONS_DATA.length}
            </span>
            <span className="text-[10px] text-yellow-300 block font-semibold mt-0.5">
              Day {progress.currentDay || 1} চলমান
            </span>
          </div>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHINESE_LESSONS_DATA.map((lesson) => {
          const isCompleted = completedDays.includes(lesson.day);
          // Day 1 is always unlocked. Next day unlocks if previous day is completed.
          const isUnlocked = lesson.day === 1 || completedDays.includes(lesson.day - 1);

          return (
            <div
              key={lesson.day}
              className={`rounded-3xl p-5 md:p-6 border transition-all shadow-sm flex flex-col justify-between space-y-4 ${
                isCompleted
                  ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40'
                  : isUnlocked
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-400'
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
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      Day {lesson.day}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {lesson.stage}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    +{lesson.xpReward} XP
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {lesson.titleBn}
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">
                  {lesson.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {lesson.objectiveBn}
                </p>

                {/* Preview 2 Core Words */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-2 gap-2 text-xs">
                  {lesson.coreWords.slice(0, 2).map((w, wIdx) => (
                    <div
                      key={wIdx}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800"
                    >
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {w.character}
                      </p>
                      <p className="text-[10px] font-mono text-red-600 dark:text-red-400">
                        {w.pinyin} ({w.pronunciationBn})
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        = {w.meaningBn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {isCompleted ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> সম্পন্ন হয়েছে
                  </span>
                ) : !isUnlocked ? (
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                    <Lock className="w-4 h-4" /> Day {lesson.day - 1} শেষ করলে খুলবে
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> প্রস্তুত
                  </span>
                )}

                <button
                  onClick={() => handleOpenDay(lesson)}
                  disabled={!isUnlocked}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                    isCompleted
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
                      : isUnlocked
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>{isCompleted ? 'পুনরায় পড়ুন' : 'Day ' + lesson.day + ' শুরু করুন'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lesson Reader Modal */}
      {activeLesson && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                    Day {activeLesson.day} • {activeLesson.stage}
                  </span>
                  <span className="text-xs font-bold text-yellow-300">
                    +{activeLesson.xpReward} XP
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black">
                  {activeLesson.titleBn}
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  {activeLesson.title}
                </p>
              </div>

              <button
                onClick={() => setActiveLesson(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:rotate-90"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Navigation Steps inside Lesson */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-2 shrink-0">
              <button
                onClick={() => setActiveStep('words')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeStep === 'words'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-gray-500'
                }`}
              >
                ১. মূল শব্দ ও উচ্চারণ ({activeLesson.coreWords.length})
              </button>
              <button
                onClick={() => setActiveStep('dialogue')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeStep === 'dialogue'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-gray-500'
                }`}
              >
                ২. সাপ্লায়ার কথোপকথন
              </button>
              <button
                onClick={() => setActiveStep('quiz')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeStep === 'quiz'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-gray-500'
                }`}
              >
                ৩. কুইজ টেস্ট
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* STEP 1: CORE WORDS */}
              {activeStep === 'words' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>পড়ার নিয়ম:</strong> প্রথমে বড় চীনা অক্ষরটি দেখুন, এরপর পিনয়িন (Pinyin) ও বাংলা উচ্চারণ দেখে জোরে উচ্চারণ করুন। অডিও শুনতে স্পিকার আইকন চাপুন।
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeLesson.coreWords.map((word, wIdx) => (
                      <div
                        key={wIdx}
                        className="bg-gray-50 dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-200/70 dark:border-gray-700/60 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-3xl font-black text-gray-900 dark:text-white block tracking-wide">
                              {word.character}
                            </span>
                            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 mt-1 block">
                              Pinyin: {word.pinyin}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">
                              বাংলা উচ্চারণ: "{word.pronunciationBn}"
                            </span>
                          </div>

                          <button
                            onClick={() => speakChinese(word.audioText)}
                            className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:scale-105 transition-transform"
                            title="চীনা উচ্চারণ শুনুন"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            = {word.meaningBn}
                          </p>
                          {word.contextNoteBn && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                              {word.contextNoteBn}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-right pt-2">
                    <button
                      onClick={() => setActiveStep('dialogue')}
                      className="py-2.5 px-6 rounded-xl bg-red-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 transition-all"
                    >
                      <span>পরবর্তী ধাপ: সাপ্লায়ার কথোপকথন</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DIALOGUE & BUSINESS TIP */}
              {activeStep === 'dialogue' && (
                <div className="space-y-6">
                  {/* Business Cultural Tip */}
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      চীনা ফ্যাক্টরি বিজনেস টিপস:
                    </p>
                    <p className="leading-relaxed">{activeLesson.businessTipBn}</p>
                  </div>

                  {/* Conversation Turns */}
                  <div className="space-y-3">
                    {activeLesson.dialogue.map((turn, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                              {turn.speaker} ({turn.speakerRoleBn})
                            </span>
                            <p className="text-base font-black text-gray-900 dark:text-white mt-1.5">
                              {turn.chinese}
                            </p>
                            <p className="text-xs font-mono font-semibold text-red-600 dark:text-red-400">
                              {turn.pinyin}
                            </p>
                            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              বাংলা উচ্চারণ: "{turn.pronunciationBn}"
                            </p>
                          </div>

                          <button
                            onClick={() => speakChinese(turn.chinese)}
                            className="p-2 rounded-xl bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 hover:scale-105 transition-transform shrink-0 shadow-xs"
                            title="অডিও শুনুন"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          বাংলা অর্থ: {turn.meaningBn}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setActiveStep('words')}
                      className="text-xs font-bold text-gray-500 hover:underline"
                    >
                      ← পূর্বের শব্দসমূহ
                    </button>
                    <button
                      onClick={() => setActiveStep('quiz')}
                      className="py-2.5 px-6 rounded-xl bg-red-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 transition-all"
                    >
                      <span>পরবর্তী ধাপ: কুইজ টেস্ট</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PRACTICE QUIZ & COMPLETION */}
              {activeStep === 'quiz' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {activeLesson.quiz.map((q, idx) => {
                      const isAnswered = selectedAnswers[q.id] !== undefined;
                      const isCorrect = selectedAnswers[q.id] === q.correctAnswer;

                      return (
                        <div
                          key={q.id}
                          className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700 space-y-3"
                        >
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              প্রশ্ন {idx + 1}
                            </span>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                              {q.question}
                            </p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                              {q.questionBn}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isChosen = selectedAnswers[q.id] === opt;
                              let btnStyle =
                                'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';

                              if (quizSubmitted) {
                                if (opt === q.correctAnswer) {
                                  btnStyle = 'bg-emerald-500 text-white border-emerald-500 font-bold';
                                } else if (isChosen) {
                                  btnStyle = 'bg-rose-500 text-white border-rose-500 font-bold';
                                }
                              } else if (isChosen) {
                                btnStyle = 'bg-red-600 text-white border-red-600 font-bold shadow-xs';
                              }

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => {
                                    if (quizSubmitted) return;
                                    setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                  }}
                                  disabled={quizSubmitted}
                                  className={`p-3 rounded-xl border text-left text-xs transition-all ${btnStyle}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {quizSubmitted && (
                            <div
                              className={`p-3 rounded-xl text-xs leading-relaxed ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200'
                              }`}
                            >
                              <p className="font-bold mb-0.5">
                                {isCorrect ? '✓ একদম সঠিক উত্তর!' : `✗ ভুল উত্তর! সঠিক: ${q.correctAnswer}`}
                              </p>
                              <p>{q.explanationBn}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!quizSubmitted ? (
                    <button
                      onClick={handleCheckQuiz}
                      disabled={Object.keys(selectedAnswers).length < activeLesson.quiz.length}
                      className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      উত্তর যাচাই করুন (Check Answers)
                    </button>
                  ) : (
                    <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent rounded-3xl border border-emerald-200 dark:border-emerald-800/40 text-center space-y-3">
                      <Award className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">
                        স্কোর: {quizScore} / {activeLesson.quiz.length}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        অভিনন্দন! আপনি Day {activeLesson.day} সম্পন্ন করেছেন। পরবর্তী দিনটি আনলক করা হবে।
                      </p>

                      <button
                        onClick={handleFinishDay}
                        className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 inline-flex items-center gap-2"
                      >
                        <Award className="w-4 h-4" />
                        <span>Day {activeLesson.day} সম্পন্ন করুন (+{activeLesson.xpReward} XP)</span>
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

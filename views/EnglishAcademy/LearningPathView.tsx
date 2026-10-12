import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Volume2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Award,
  ChevronRight,
  RotateCcw,
  VolumeX,
  X
} from 'lucide-react';
import { CourseLevel, LessonContent, PracticeQuestion } from './types';
import { COURSES_DATA } from './courseData';

interface LearningPathViewProps {
  completedLessons: string[];
  onCompleteLesson: (lessonId: string, xpReward: number) => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
}

const LEVEL_LABELS: Record<CourseLevel, { label: string; desc: string; badgeColor: string }> = {
  beginner: {
    label: 'Beginner (প্রাথমিক)',
    desc: 'দৈনন্দিন অভিবাদন, নিজের পরিচয় ও সাধারণ বাক্য',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  },
  elementary: {
    label: 'Elementary (মৌলিক অফিস)',
    desc: 'কাজের রুটিন, ডেডলাইন ও ফোন কল হ্যান্ডলিং',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
  },
  intermediate: {
    label: 'Intermediate (মধ্যবর্তী)',
    desc: 'অফিস মিটিং, দ্বিমত পোষণ ও পেশাদার ইমেইল',
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
  },
  advanced: {
    label: 'Advanced (উচ্চপর্যায়)',
    desc: 'নেগোশিয়েশন, এক্সিকিউটিভ প্রেজেন্টেশন ও চুক্তি',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  }
};

export const LearningPathView: React.FC<LearningPathViewProps> = ({
  completedLessons,
  onCompleteLesson,
  speakText,
  isSpeaking,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel>('beginner');
  const [activeLesson, setActiveLesson] = useState<LessonContent | null>(null);

  // Lesson Quiz State
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const filteredLessons = COURSES_DATA.filter((l) => l.courseLevel === selectedLevel);

  const handleOpenLesson = (lesson: LessonContent) => {
    setActiveLesson(lesson);
    setCurrentAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (quizSubmitted) return;
    setCurrentAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleCheckQuiz = () => {
    if (!activeLesson) return;
    let correct = 0;
    activeLesson.questions.forEach((q) => {
      if (currentAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    setQuizScore(correct);
    setQuizSubmitted(true);
  };

  const handleFinishLesson = () => {
    if (!activeLesson) return;
    onCompleteLesson(activeLesson.id, activeLesson.xpReward);
    setActiveLesson(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Level Selector */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              স্ট্রাকচার্ড লার্নিং পাথ
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              আপনার বর্তমান লেভেল অনুযায়ী কোর্স সিলেক্ট করে প্রতিটি লেসন সম্পূর্ণ করুন।
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              লেসন সম্পন্ন
            </span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              {completedLessons.length} / {COURSES_DATA.length}
            </span>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(['beginner', 'elementary', 'intermediate', 'advanced'] as CourseLevel[]).map((lvl) => {
            const isSelected = selectedLevel === lvl;
            const levelLessons = COURSES_DATA.filter((l) => l.courseLevel === lvl);
            const levelCompleted = levelLessons.filter((l) => completedLessons.includes(l.id)).length;

            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black capitalize tracking-tight">
                    {LEVEL_LABELS[lvl].label}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {levelCompleted}/{levelLessons.length}
                  </span>
                </div>
                <p
                  className={`text-[10px] line-clamp-1 ${
                    isSelected ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {LEVEL_LABELS[lvl].desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lesson List for Selected Level */}
      <div className="space-y-4">
        {filteredLessons.map((lesson, idx) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const dayNum = lesson.day || lesson.order || (idx + 1);
          // Day 1 is always unlocked. Day N unlocks when Day N-1 is completed.
          const isUnlocked =
            dayNum === 1 ||
            COURSES_DATA.some((l) => (l.day || l.order) === dayNum - 1 && completedLessons.includes(l.id));

          return (
            <div
              key={lesson.id}
              className={`bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 border transition-all shadow-sm ${
                isCompleted
                  ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : !isUnlocked
                  ? 'border-gray-200/60 dark:border-gray-800 opacity-75 bg-gray-50/40 dark:bg-gray-900/20'
                  : 'border-gray-100 dark:border-gray-700/60 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : !isUnlocked
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : !isUnlocked ? (
                      <Lock className="w-5 h-5 text-gray-400" />
                    ) : (
                      `Day ${dayNum}`
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                        Day {dayNum}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {lesson.category}
                      </span>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                        +{lesson.xpReward} XP
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                      {lesson.titleBn}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {lesson.descriptionBn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
                  {isCompleted && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> সম্পন্ন
                    </span>
                  )}

                  {!isCompleted && !isUnlocked && (
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> পূর্ববর্তী দিন শেষ করুন
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenLesson(lesson)}
                    disabled={!isUnlocked}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm ${
                      isCompleted
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
                        : isUnlocked
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {isCompleted
                        ? 'পুনরায় পড়ুন'
                        : isUnlocked
                        ? `Day ${dayNum} শুরু করুন`
                        : `লকড (Day ${dayNum - 1} সম্পন্ন করুন)`}
                    </span>
                    {isUnlocked ? <ArrowRight className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick Preview of Key Phrases */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {lesson.keyPhrases.slice(0, 2).map((phrase, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {phrase.english}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {phrase.bengali}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(phrase.english);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:scale-110 p-1 transition-transform"
                      title="Listen"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Lesson Modal */}
      {activeLesson && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[92vh] rounded-[2rem] shadow-2xl border border-white/20 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {LEVEL_LABELS[activeLesson.courseLevel].label}
                  </span>
                  <span className="text-xs font-bold text-yellow-300">
                    +{activeLesson.xpReward} XP
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black">
                  {activeLesson.title}
                </h3>
                <p className="text-xs text-indigo-100 font-medium">
                  {activeLesson.titleBn}
                </p>
              </div>

              <button
                onClick={() => setActiveLesson(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:rotate-90"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Description */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs md:text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
                {activeLesson.descriptionBn}
              </div>

              {/* Key Phrases Section */}
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  মূল বাক্য ও বাংলা ব্যাখ্যা (Key Sentences)
                </h4>

                <div className="space-y-3">
                  {activeLesson.keyPhrases.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {phrase.english}
                          </p>
                          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {phrase.bengali}
                          </p>
                        </div>
                        <button
                          onClick={() => speakText(phrase.english)}
                          className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:scale-105 transition-transform shrink-0"
                          title="উচ্চারণ শুনুন"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          ব্যাখ্যা:{' '}
                        </span>
                        {phrase.explanationBn}
                      </div>

                      {phrase.example && (
                        <div className="pt-2 text-xs bg-white dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              উদাহরণ:{' '}
                            </span>
                            {phrase.example}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {phrase.exampleBn}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Practice Questions Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  অনুশীলন প্রশ্নাবলী (Practice Quiz)
                </h4>

                <div className="space-y-4">
                  {activeLesson.questions.map((q, qIdx) => {
                    const isAnswered = currentAnswers[q.id] !== undefined;
                    const isCorrect = currentAnswers[q.id] === q.correctAnswer;

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-3"
                      >
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          প্রশ্ন {qIdx + 1}: {q.question}
                        </p>
                        {q.questionBn && (
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium -mt-2">
                            {q.questionBn}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options?.map((opt, oIdx) => {
                            const isChosen = currentAnswers[q.id] === opt;
                            let btnStyle =
                              'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';

                            if (quizSubmitted) {
                              if (opt === q.correctAnswer) {
                                btnStyle = 'bg-emerald-500 text-white border-emerald-500 font-bold';
                              } else if (isChosen) {
                                btnStyle = 'bg-rose-500 text-white border-rose-500 font-bold';
                              }
                            } else if (isChosen) {
                              btnStyle =
                                'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs';
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectAnswer(q.id, opt)}
                                disabled={quizSubmitted}
                                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${btnStyle}`}
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
                            <p className="font-bold mb-1">
                              {isCorrect ? '✓ সঠিক উত্তর!' : `✗ সঠিক উত্তর: ${q.correctAnswer}`}
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
                    disabled={Object.keys(currentAnswers).length < activeLesson.questions.length}
                    className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    উত্তর যাচাই করুন (Check Answers)
                  </button>
                ) : (
                  <div className="mt-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        স্কোর: {quizScore} / {activeLesson.questions.length}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {quizScore === activeLesson.questions.length
                          ? 'অসাধারণ! আপনি সবগুলো প্রশ্নের সঠিক উত্তর দিয়েছেন।'
                          : 'ভালো হয়েছে! ভুলগুলো দেখে নিয়ে আবার অনুশীলন করুন।'}
                      </p>
                    </div>

                    <button
                      onClick={handleFinishLesson}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                    >
                      <Award className="w-4 h-4" />
                      <span>লেসন সম্পন্ন ও XP দাবি করুন (+{activeLesson.xpReward} XP)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

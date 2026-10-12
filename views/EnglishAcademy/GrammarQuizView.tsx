import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Volume2,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';
import { GrammarTopic, PracticeQuestion } from './types';
import { GRAMMAR_DATA } from './grammarData';

interface GrammarQuizViewProps {
  onAwardXp: (amount: number, reason: string) => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
}

export const GrammarQuizView: React.FC<GrammarQuizViewProps> = ({
  onAwardXp,
  speakText,
  isSpeaking,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic>(GRAMMAR_DATA[0]);
  const [activeTab, setActiveTab] = useState<'rules' | 'quiz'>('rules');

  // Quiz Engine State
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelectOption = (questionId: string, option: string) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleCheckQuiz = () => {
    let correctCount = 0;
    selectedTopic.quizzes.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setSubmitted(true);

    const earnedXp = correctCount * 10;
    if (earnedXp > 0) {
      onAwardXp(earnedXp, `Grammar Quiz: ${selectedTopic.title}`);
    }
  };

  const handleRetakeQuiz = () => {
    setUserAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Grammar Topic Cards Carousel / Grid */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-500" />
          গ্রামার ও কুইজ মাস্টার (Grammar & Interactive Quiz)
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {GRAMMAR_DATA.map((topic) => {
            const isSelected = selectedTopic.id === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopic(topic);
                  handleRetakeQuiz();
                }}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <p className="text-xs font-black truncate">{topic.titleBn}</p>
                <p
                  className={`text-[10px] mt-0.5 truncate ${
                    isSelected ? 'text-amber-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {topic.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Switcher: Grammar Rules vs Interactive Quiz */}
      <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rules'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          নিয়ম ও ব্যাখ্যা (Rules)
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'quiz'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          কুইজ টেস্ট ({selectedTopic.quizzes.length})
        </button>
      </div>

      {/* RULES VIEW */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {selectedTopic.titleBn}
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-2">
              {selectedTopic.title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40">
              {selectedTopic.summaryBn}
            </p>
          </div>

          <div className="space-y-4">
            {selectedTopic.rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-700/60 space-y-3"
              >
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {rule.ruleTitleBn}
                </h4>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {rule.explanationBn}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        ✓ সঠিক রূপ:
                      </span>
                      <button
                        onClick={() => speakText(rule.correctExample)}
                        className="text-emerald-700 dark:text-emerald-400 hover:scale-110 p-0.5"
                        title="উচ্চারণ শুনুন"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                      {rule.correctExample}
                    </p>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                      {rule.exampleBn}
                    </p>
                  </div>

                  {rule.incorrectExample && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/70 dark:border-rose-800/40">
                      <span className="font-bold text-rose-700 dark:text-rose-400 block mb-1">
                        ✗ সচরাচর ভুল রূপ:
                      </span>
                      <p className="font-semibold text-rose-900 dark:text-rose-200 line-through">
                        {rule.incorrectExample}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setActiveTab('quiz')}
              className="py-3 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all active:scale-95"
            >
              <span>এবার কুইজে অংশ নিন (Take Quiz)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* QUIZ VIEW */}
      {activeTab === 'quiz' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                {selectedTopic.titleBn} - কুইজ টেস্ট
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                প্রতিটি সঠিক উত্তরের জন্য পাবেন +10 XP
              </p>
            </div>

            {submitted && (
              <button
                onClick={handleRetakeQuiz}
                className="py-2 px-3.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>পুনরায় দিন</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            {selectedTopic.quizzes.map((q, idx) => {
              const isAnswered = userAnswers[q.id] !== undefined;
              const isCorrect = userAnswers[q.id] === q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-700/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                        {q.type.toUpperCase()}
                      </span>
                      <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white mt-1.5">
                        {idx + 1}. {q.question}
                      </p>
                      {q.questionBn && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                          {q.questionBn}
                        </p>
                      )}
                    </div>

                    {q.audioPrompt && (
                      <button
                        onClick={() => speakText(q.audioPrompt!)}
                        className="p-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0 shadow-sm"
                        title="অডিও শুনুন"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options?.map((opt, oIdx) => {
                      const isChosen = userAnswers[q.id] === opt;
                      let btnStyle =
                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';

                      if (submitted) {
                        if (opt === q.correctAnswer) {
                          btnStyle = 'bg-emerald-500 text-white border-emerald-500 font-bold';
                        } else if (isChosen) {
                          btnStyle = 'bg-rose-500 text-white border-rose-500 font-bold';
                        }
                      } else if (isChosen) {
                        btnStyle = 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(q.id, opt)}
                          disabled={submitted}
                          className={`p-3 rounded-xl border text-left text-xs transition-all ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bengali Explanation on submit */}
                  {submitted && (
                    <div
                      className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200'
                      }`}
                    >
                      <p className="font-bold mb-1">
                        {isCorrect ? '✓ সঠিক উত্তর!' : `✗ ভুল উত্তর! সঠিক ছিল: "${q.correctAnswer}"`}
                      </p>
                      <p>{q.explanationBn}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted ? (
            <button
              onClick={handleCheckQuiz}
              disabled={Object.keys(userAnswers).length < selectedTopic.quizzes.length}
              className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              কুইজ সাবমিট ও ফলাফল দেখুন
            </button>
          ) : (
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent rounded-3xl border border-amber-200 dark:border-amber-800/40 text-center space-y-2">
              <Award className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
              <h4 className="text-lg font-black text-gray-900 dark:text-white">
                আপনার স্কোর: {score} / {selectedTopic.quizzes.length}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                +{score * 10} XP সফলভাবে আপনার অ্যাকাউন্টে যোগ হয়েছে!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

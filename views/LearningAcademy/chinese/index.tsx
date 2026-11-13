import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Calendar,
  BookmarkCheck,
  Flame,
  Award,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowRight,
  Headphones,
  BookOpen,
  Trophy,
  Brain
} from 'lucide-react';
import { UserChineseProgress } from './types';
import { ChineseDayByDayView } from './ChineseDayByDayView';
import { ChineseSupplierSimulator } from './ChineseSupplierSimulator';
import { ChineseVocabularyView } from './ChineseVocabularyView';
import { CHINESE_LESSONS_DATA } from './chineseLessonsData';
import { CHINESE_VOCABULARY_DATA } from './chineseVocabularyData';
import { getLanguageConfig } from '../core/languagesRegistry';
import { UniversalListeningStudio } from '../core/UniversalListeningStudio';
import { UniversalGrammarBuilder } from '../core/UniversalGrammarBuilder';
import { UniversalSpeakingExam } from '../core/UniversalSpeakingExam';
import { UniversalPersonalAssistant } from '../core/UniversalPersonalAssistant';
import { UserLanguageProgress, CefrLevel, SpeakingExamResult, UniversalDailyLesson } from '../core/types';
import { ChineseLessonDay } from './types';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getApp } from 'firebase/app';
import { getAllLessons, requestNextAdaptiveLesson } from '../../../services/dynamicLessonManager';

interface ChineseAcademyViewProps {
  currentUser: string | null;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
}

export const ChineseAcademyView: React.FC<ChineseAcademyViewProps> = ({
  currentUser,
  firebaseConfig,
  isCloudEnabled,
}) => {
  const langConfig = getLanguageConfig('chinese');
  const [activeTab, setActiveTab] = useState<
    'days' | 'simulator' | 'listening' | 'grammar' | 'vocab' | 'exam' | 'assistant'
  >('days');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Safe user key for storage & Firebase isolation
  const safeUserId = useMemo(() => {
    if (!currentUser) return 'guest_user';
    return currentUser.replace(/[.#$[\]]/g, '_').toLowerCase();
  }, [currentUser]);

  const storageKey = `userChineseProgress_${safeUserId}`;

  // Default Profile
  const defaultProgress: UserChineseProgress = {
    userId: safeUserId,
    userName: currentUser || 'User',
    currentDay: 1,
    completedDays: [],
    xp: 0,
    streak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    vocabularyMastered: [],
    simulatorMinutes: 0,
    totalDaysPracticed: 1,
  };

  // State
  const [progress, setProgress] = useState<UserChineseProgress>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaultProgress, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading Chinese Academy progress cache:', e);
    }
    return defaultProgress;
  });

  // Load from Firebase on mount / auth change
  useEffect(() => {
    if (!firebaseConfig?.databaseURL || !safeUserId) return;
    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);
      const userRef = ref(db, `chinese_academy/users/${safeUserId}`);
      const unsub = onValue(userRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setProgress((prev) => {
            const merged = { ...prev, ...val };
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firebase Chinese sync listener error:', e);
    }
  }, [firebaseConfig, safeUserId, storageKey]);

  // Persist helper
  const persistProgress = useCallback(
    (newProgress: UserChineseProgress) => {
      setProgress(newProgress);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newProgress));
      } catch (e) {
        console.warn('LocalStorage quota limit');
      }

      if (firebaseConfig?.databaseURL) {
        try {
          const app = getApp();
          const db = getDatabase(app, firebaseConfig.databaseURL);
          set(ref(db, `chinese_academy/users/${safeUserId}`), newProgress);
        } catch (e) {
          console.error('Failed to sync Chinese progress to Firebase:', e);
        }
      }
    },
    [safeUserId, storageKey, firebaseConfig]
  );

  // Dynamic & Foundational Chinese Lessons State
  const [allLessons, setAllLessons] = useState<ChineseLessonDay[]>(CHINESE_LESSONS_DATA);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAllLessons('chinese', safeUserId, firebaseConfig).then((loaded) => {
      if (mounted && loaded && loaded.length > 0) {
        // Convert UniversalDailyLesson to ChineseLessonDay for any dynamic day >= 13
        const converted: ChineseLessonDay[] = loaded.map((u) => {
          const existing = CHINESE_LESSONS_DATA.find((c) => c.day === u.day);
          if (existing) return existing;
          return {
            day: u.day,
            title: u.title,
            titleBn: u.titleBn,
            stage: 'Orders & Negotiations',
            objectiveBn: u.objectiveBn,
            xpReward: u.xpReward,
            coreWords: (u.vocabulary || []).map((v) => ({
              character: v.targetWord,
              pinyin: v.romanized || '',
              pronunciationBn: v.bengaliPronunciation,
              meaningBn: v.bengaliMeaning,
              audioText: v.audioText || v.targetWord,
              contextNoteBn: v.exampleBengali,
            })),
            dialogue: (u.conversation || []).map((c) => ({
              speaker: c.speaker,
              speakerRoleBn: c.speakerRoleBn,
              chinese: c.targetText,
              pinyin: c.romanized || '',
              pronunciationBn: c.bengaliPronunciation,
              meaningBn: c.bengaliMeaning,
            })),
            businessTipBn: u.businessTipBn || 'উইচ্যাটে দ্রুত ও মার্জিত যোগাযোগ বজায় রাখুন।',
            quiz: (u.quiz || []).map((q) => ({
              id: q.id,
              question: q.question,
              questionBn: q.questionBn,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanationBn: q.explanationBn,
            })),
          };
        });
        setAllLessons(converted);
      }
    });
    return () => {
      mounted = false;
    };
  }, [safeUserId, firebaseConfig]);

  const handleGenerateNextLesson = async (targetDay: number) => {
    setIsGeneratingNext(true);
    try {
      const res = await requestNextAdaptiveLesson({
        language: 'chinese',
        currentDay: targetDay,
        completedDays: progress.completedDays,
        safeUserId,
        weakTopics: progress.weakTopics,
        firebaseConfig,
      });
      if (res?.success && res.lesson) {
        const u = res.lesson;
        const newLesson: ChineseLessonDay = {
          day: u.day,
          title: u.title,
          titleBn: u.titleBn,
          stage: 'Orders & Negotiations',
          objectiveBn: u.objectiveBn,
          xpReward: u.xpReward,
          coreWords: (u.vocabulary || []).map((v) => ({
            character: v.targetWord,
            pinyin: v.romanized || '',
            pronunciationBn: v.bengaliPronunciation,
            meaningBn: v.bengaliMeaning,
            audioText: v.audioText || v.targetWord,
            contextNoteBn: v.exampleBengali,
          })),
          dialogue: (u.conversation || []).map((c) => ({
            speaker: c.speaker,
            speakerRoleBn: c.speakerRoleBn,
            chinese: c.targetText,
            pinyin: c.romanized || '',
            pronunciationBn: c.bengaliPronunciation,
            meaningBn: c.bengaliMeaning,
          })),
          businessTipBn: u.businessTipBn || 'উইচ্যাটে দ্রুত ও মার্জিত যোগাযোগ বজায় রাখুন।',
          quiz: (u.quiz || []).map((q) => ({
            id: q.id,
            question: q.question,
            questionBn: q.questionBn,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanationBn: q.explanationBn,
          })),
        };

        setAllLessons((prev) => {
          const map = new Map<number, ChineseLessonDay>();
          prev.forEach((l) => map.set(l.day, l));
          map.set(newLesson.day, newLesson);
          return Array.from(map.values()).sort((a, b) => a.day - b.day);
        });
      }
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // Speech helper for Chinese
  const speakChinese = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const zhVoice =
        voices.find((v) => v.lang.startsWith('zh') || v.lang.includes('cmn')) ||
        voices.find((v) => v.lang.includes('CN'));

      if (zhVoice) {
        utterance.voice = zhVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    }
  }, []);

  // Complete a Day lesson - Guaranteed duplicate XP protection
  const handleCompleteDay = (dayNumber: number, xpReward: number) => {
    setProgress((prev) => {
      const alreadyDone = (prev.completedDays || []).includes(dayNumber);
      const newCompleted = alreadyDone
        ? prev.completedDays
        : [...(prev.completedDays || []), dayNumber].sort((a, b) => a - b);

      const addedXp = alreadyDone ? 0 : xpReward;
      const today = new Date().toISOString().split('T')[0];
      const isNewDate = prev.lastActiveDate !== today;
      const newStreak = isNewDate ? prev.streak + 1 : prev.streak;

      const nextDay = Math.max(prev.currentDay, dayNumber + 1);

      const updated: UserChineseProgress = {
        ...prev,
        completedDays: newCompleted,
        currentDay: nextDay,
        xp: prev.xp + addedXp,
        streak: newStreak,
        lastActiveDate: today,
        totalDaysPracticed: isNewDate ? prev.totalDaysPracticed + 1 : prev.totalDaysPracticed,
      };

      persistProgress(updated);
      return updated;
    });
  };

  // Award XP from simulator or quiz - duplicate safe
  const handleAwardXp = (amount: number, reason: string) => {
    setProgress((prev) => {
      const updated: UserChineseProgress = {
        ...prev,
        xp: prev.xp + amount,
      };
      persistProgress(updated);
      return updated;
    });
  };

  // Mark vocabulary word as mastered
  const handleMarkMastered = (wordId: string) => {
    setProgress((prev) => {
      const already = (prev.vocabularyMastered || []).includes(wordId);
      const newMastered = already
        ? prev.vocabularyMastered
        : [...(prev.vocabularyMastered || []), wordId];

      const addedXp = already ? 0 : 10;
      const updated: UserChineseProgress = {
        ...prev,
        vocabularyMastered: newMastered,
        xp: prev.xp + addedXp,
      };

      persistProgress(updated);
      return updated;
    });
  };

  // Increment simulator practice minutes
  const handleIncrementSimulatorMinutes = (minutes: number) => {
    if (minutes <= 0) return;
    setProgress((prev) => {
      const updated: UserChineseProgress = {
        ...prev,
        simulatorMinutes: (prev.simulatorMinutes || 0) + minutes,
      };
      persistProgress(updated);
      return updated;
    });
  };

  const totalLessons = CHINESE_LESSONS_DATA.length;
  const completedCount = (progress.completedDays || []).length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalLessons) * 100));

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl shadow-red-600/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-400/20 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>🇨🇳 চীনা বিজনেস ও সাপ্লায়ার একাডেমি (Zero Level to Pro)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              চীনা সাপ্লায়ার ও ফ্যাক্টরি কমিউনিকেশন
            </h1>
            <p className="text-xs md:text-sm text-red-50 leading-relaxed">
              চীনা বর্ণ বা পিনয়িন জানা না থাকলেও সম্পূর্ণ শূন্য থেকে শুরু করুন। নি হাও (Hello) ও দাম জানা থেকে শুরু করে ফ্যাক্টরি ভিজিট, স্যাম্পল ও শিপমেন্ট নেগোশিয়েশন।
            </p>
          </div>

          {/* User Live Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-300 mb-0.5">
                <Flame className="w-4 h-4 fill-amber-300" />
                <span className="text-xs font-bold">স্ট্রাইক</span>
              </div>
              <p className="text-lg font-black text-white">{progress.streak} দিন</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-300 mb-0.5">
                <Award className="w-4 h-4" />
                <span className="text-xs font-bold">মোট XP</span>
              </div>
              <p className="text-lg font-black text-white">{progress.xp}</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-300 mb-0.5">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold">সম্পন্ন দিন</span>
              </div>
              <p className="text-lg font-black text-white">
                {completedCount} / {totalLessons}
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-sky-300 mb-0.5">
                <BookmarkCheck className="w-4 h-4" />
                <span className="text-xs font-bold">শব্দ আয়ত্ত</span>
              </div>
              <p className="text-lg font-black text-white">
                {(progress.vocabularyMastered || []).length} টি
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-2/3">
            <span className="font-bold text-white shrink-0">কোর্স অগ্রগতি:</span>
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-300 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-black text-amber-300 shrink-0">{progressPercent}%</span>
          </div>
          <span className="text-red-100 font-medium text-[11px] self-start sm:self-auto">
            বর্তমান পর্যায়: <strong className="text-white">Day {progress.currentDay}</strong>
          </span>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex flex-wrap gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('days')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'days'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>📅 কোর্স মডিউল (Day 1 - {totalLessons})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'simulator'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>🤖 চীনা সাপ্লায়ার সিমুলেটর</span>
        </button>

        <button
          onClick={() => setActiveTab('listening')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'listening'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>🎧 লিসনিং স্টুডিও (Multi-Speed)</span>
        </button>

        <button
          onClick={() => setActiveTab('grammar')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'grammar'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📚 ব্যাকরণ ও সিনট্যাক্স</span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'vocab'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>📖 শব্দভাণ্ডার ({CHINESE_VOCABULARY_DATA.length} Words)</span>
        </button>

        <button
          onClick={() => setActiveTab('exam')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'exam'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          <span>🏆 CEFR স্পিকিং পরীক্ষা</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'assistant'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>🧠 AI পার্সোনাল কোচ</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'days' && (
        <ChineseDayByDayView
          progress={progress}
          onCompleteDay={handleCompleteDay}
          speakChinese={speakChinese}
          isSpeaking={isSpeaking}
          lessons={allLessons}
          onGenerateNextLesson={handleGenerateNextLesson}
          isGeneratingNext={isGeneratingNext}
        />
      )}

      {activeTab === 'simulator' && (
        <ChineseSupplierSimulator
          onAwardXp={handleAwardXp}
          speakChinese={speakChinese}
          isSpeaking={isSpeaking}
          onIncrementSimulatorMinutes={handleIncrementSimulatorMinutes}
        />
      )}

      {activeTab === 'listening' && (
        <UniversalListeningStudio
          langConfig={langConfig}
          onAwardXp={handleAwardXp}
          speakText={(txt, code, rate) => speakChinese(txt, rate)}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'grammar' && (
        <UniversalGrammarBuilder
          langConfig={langConfig}
          onAwardXp={handleAwardXp}
          speakText={(txt) => speakChinese(txt)}
        />
      )}

      {activeTab === 'vocab' && (
        <ChineseVocabularyView
          masteredIds={progress.vocabularyMastered || []}
          onMarkMastered={handleMarkMastered}
          speakChinese={speakChinese}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'exam' && (
        <UniversalSpeakingExam
          langConfig={langConfig}
          currentCefrLevel="A1"
          userName={currentUser || 'Staff Member'}
          onExamCompleted={(res) => {
            if (res.passed) handleAwardXp(150);
          }}
          speakText={(txt, code, rate) => speakChinese(txt, rate)}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'assistant' && (
        <UniversalPersonalAssistant
          langConfig={langConfig}
          progress={{
            userId: safeUserId,
            languageCode: 'chinese',
            currentDay: progress.currentDay,
            completedDays: progress.completedDays,
            xp: progress.xp,
            streak: progress.streak,
            level: 'beginner',
            cefrLevel: 'A1',
            lastActiveDate: progress.lastActiveDate,
            masteredWordIds: progress.vocabularyMastered,
            conversationMinutes: progress.simulatorMinutes,
            completedQuizzesCount: progress.completedDays.length,
            correctAnswersCount: progress.completedDays.length * 4,
            unlockedBadges: [],
            practiceDistribution: {
              speakingMinutes: Math.max(12, progress.simulatorMinutes || 12),
              listeningMinutes: 8,
              vocabMinutes: Math.max(5, (progress.vocabularyMastered || []).length),
              grammarMinutes: 4,
            },
          }}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onStartExam={() => setActiveTab('exam')}
        />
      )}
    </div>
  );
};

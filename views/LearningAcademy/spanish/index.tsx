import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  BookmarkCheck,
  Flame,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowRight,
  MessageSquare,
  Headphones,
  BookOpen,
  Trophy,
  Brain
} from 'lucide-react';
import { getLanguageConfig } from '../core/languagesRegistry';
import { UniversalDailyLessonsList } from '../core/UniversalDailyLessonsList';
import { UniversalVocabularyView } from '../core/UniversalVocabularyView';
import { UniversalAIConversation } from '../core/UniversalAIConversation';
import { UniversalListeningStudio } from '../core/UniversalListeningStudio';
import { UniversalGrammarBuilder } from '../core/UniversalGrammarBuilder';
import { UniversalSpeakingExam } from '../core/UniversalSpeakingExam';
import { UniversalPersonalAssistant } from '../core/UniversalPersonalAssistant';
import { SPANISH_LESSONS_DATA, SPANISH_VOCABULARY_LIST } from './spanishLessonsData';
import { UserLanguageProgress, CefrLevel, SpeakingExamResult, UniversalDailyLesson } from '../core/types';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getApp } from 'firebase/app';
import { getAllLessons, requestNextAdaptiveLesson } from '../../../services/dynamicLessonManager';

interface SpanishAcademyViewProps {
  currentUser: string | null;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
}

type SpanishSubTab =
  | 'days'
  | 'listening'
  | 'conversation'
  | 'grammar'
  | 'vocab'
  | 'exam'
  | 'assistant';

export const SpanishAcademyView: React.FC<SpanishAcademyViewProps> = ({
  currentUser,
  firebaseConfig,
  isCloudEnabled,
}) => {
  const langConfig = getLanguageConfig('spanish');
  const [activeTab, setActiveTab] = useState<SpanishSubTab>('days');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Safe user key for storage & Firebase isolation
  const safeUserId = useMemo(() => {
    if (!currentUser) return 'guest_user';
    return currentUser.replace(/[.#$[\]]/g, '_').toLowerCase();
  }, [currentUser]);

  const storageKey = `userSpanishProgress_${safeUserId}`;

  // Default Profile
  const defaultProgress: UserLanguageProgress = {
    userId: safeUserId,
    languageCode: 'spanish',
    currentDay: 1,
    completedDays: [],
    xp: 0,
    streak: 1,
    level: 'beginner',
    cefrLevel: 'A1',
    lastActiveDate: new Date().toISOString().split('T')[0],
    masteredWordIds: [],
    conversationMinutes: 10,
    completedQuizzesCount: 0,
    correctAnswersCount: 0,
    unlockedBadges: [],
    practiceDistribution: {
      speakingMinutes: 15,
      listeningMinutes: 8,
      vocabMinutes: 5,
      grammarMinutes: 3,
    },
    weakTopics: [],
    examHistory: [],
  };

  // State
  const [progress, setProgress] = useState<UserLanguageProgress>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...defaultProgress, ...JSON.parse(saved) };
    } catch {}
    return defaultProgress;
  });

  // Sync with Firebase
  useEffect(() => {
    if (!firebaseConfig?.databaseURL || !safeUserId) return;
    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);
      const userRef = ref(db, `learning/users/${safeUserId}/languages/spanish`);
      const unsub = onValue(userRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setProgress((prev) => {
            const merged = { ...prev, ...val };
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firebase Spanish sync listener error:', e);
    }
  }, [firebaseConfig, safeUserId, storageKey]);

  // Persist helper
  const persistProgress = useCallback(
    (newProgress: UserLanguageProgress) => {
      setProgress(newProgress);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newProgress));
      } catch {}

      if (firebaseConfig?.databaseURL) {
        try {
          const app = getApp();
          const db = getDatabase(app, firebaseConfig.databaseURL);
          set(ref(db, `learning/users/${safeUserId}/languages/spanish`), newProgress);
        } catch (e) {
          console.error('Failed to sync Spanish progress to Firebase:', e);
        }
      }
    },
    [safeUserId, storageKey, firebaseConfig]
  );

  // Dynamic & Foundational Spanish Lessons State
  const [allLessons, setAllLessons] = useState<UniversalDailyLesson[]>(SPANISH_LESSONS_DATA);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAllLessons('spanish', safeUserId, firebaseConfig).then((loaded) => {
      if (mounted && loaded && loaded.length > 0) {
        setAllLessons(loaded);
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
        language: 'spanish',
        currentDay: targetDay,
        completedDays: progress.completedDays,
        safeUserId,
        weakTopics: progress.weakTopics,
        firebaseConfig,
      });
      if (res?.success && res.lesson) {
        setAllLessons((prev) => {
          const map = new Map<number, UniversalDailyLesson>();
          prev.forEach((l) => map.set(l.day, l));
          map.set(res.lesson.day, res.lesson);
          return Array.from(map.values()).sort((a, b) => a.day - b.day);
        });
      }
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // Speech helper with optional playback speed
  const speakText = useCallback((text: string, langCode: string = 'es-ES', rate: number = 0.9) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = langCode;
      utterance.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      const esVoice =
        voices.find((v) => v.lang.startsWith('es') && (v.name.includes('Spain') || v.name.includes('Castilian') || v.name.includes('Mexico'))) ||
        voices.find((v) => v.lang.startsWith('es'));

      if (esVoice) utterance.voice = esVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  // Complete a Day lesson
  const handleCompleteDay = (dayNumber: number, xpReward: number) => {
    setProgress((prev) => {
      const alreadyDone = (prev.completedDays || []).includes(dayNumber);
      const newCompleted = alreadyDone
        ? prev.completedDays
        : [...(prev.completedDays || []), dayNumber].sort((a, b) => a - b);

      const nextDay = Math.max(prev.currentDay || 1, dayNumber + 1);
      const updatedXp = alreadyDone ? prev.xp : prev.xp + xpReward;

      const updated: UserLanguageProgress = {
        ...prev,
        completedDays: newCompleted,
        currentDay: nextDay,
        xp: updatedXp,
        level: updatedXp > 250 ? 'intermediate' : updatedXp > 100 ? 'elementary' : 'beginner',
        lastActiveDate: new Date().toISOString().split('T')[0],
      };

      persistProgress(updated);
      return updated;
    });
  };

  // Award XP
  const handleAwardXp = (amount: number, reason: string) => {
    setProgress((prev) => {
      const updatedXp = prev.xp + amount;
      const prevDist = prev.practiceDistribution || {
        speakingMinutes: 15,
        listeningMinutes: 8,
        vocabMinutes: 5,
        grammarMinutes: 3,
      };

      const isSpeakingActivity = reason.toLowerCase().includes('speaking') || reason.toLowerCase().includes('conversation');
      const isListeningActivity = reason.toLowerCase().includes('listening');
      const isVocabActivity = reason.toLowerCase().includes('vocab');
      const isGrammarActivity = reason.toLowerCase().includes('grammar');

      const updatedDist = {
        speakingMinutes: isSpeakingActivity ? prevDist.speakingMinutes + 2 : prevDist.speakingMinutes,
        listeningMinutes: isListeningActivity ? prevDist.listeningMinutes + 2 : prevDist.listeningMinutes,
        vocabMinutes: isVocabActivity ? prevDist.vocabMinutes + 1 : prevDist.vocabMinutes,
        grammarMinutes: isGrammarActivity ? prevDist.grammarMinutes + 1 : prevDist.grammarMinutes,
      };

      const updated: UserLanguageProgress = {
        ...prev,
        xp: updatedXp,
        practiceDistribution: updatedDist,
        lastActiveDate: new Date().toISOString().split('T')[0],
      };
      persistProgress(updated);
      return updated;
    });
  };

  // Toggle vocabulary mastered
  const handleToggleMastered = (wordId: string) => {
    setProgress((prev) => {
      const isMastered = prev.masteredWordIds.includes(wordId);
      const newIds = isMastered
        ? prev.masteredWordIds.filter((id) => id !== wordId)
        : [...prev.masteredWordIds, wordId];

      const updated: UserLanguageProgress = {
        ...prev,
        masteredWordIds: newIds,
      };
      persistProgress(updated);
      return updated;
    });
  };

  // Exam handler
  const handleExamCompleted = (result: SpeakingExamResult) => {
    setProgress((prev) => {
      const history = [...(prev.examHistory || []), result];
      let newCefrLevel: CefrLevel = prev.cefrLevel || 'A1';

      if (result.passed) {
        const nextMap: Record<CefrLevel, CefrLevel> = {
          A1: 'A2',
          A2: 'B1',
          B1: 'B2',
          B2: 'C1',
          C1: 'C2',
          C2: 'C2',
        };
        newCefrLevel = nextMap[newCefrLevel];
      }

      const updated: UserLanguageProgress = {
        ...prev,
        cefrLevel: newCefrLevel,
        examHistory: history,
        xp: prev.xp + (result.passed ? 150 : 30),
      };

      persistProgress(updated);
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Gamification Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl font-black shadow-md">
            {langConfig.flag}
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>{langConfig.name} Academy (Español)</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                CEFR {progress.cefrLevel || 'A1'}
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Day {progress.currentDay} • {progress.completedDays?.length || 0} টি লেসন সম্পন্ন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-black text-xs">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>{progress.streak} Day Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black text-xs">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{progress.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl overflow-x-auto gap-1.5 max-w-full">
        <button
          onClick={() => setActiveTab('days')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'days'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1" />
          ডেইলি লেসন
        </button>

        <button
          onClick={() => setActiveTab('listening')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'listening'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 inline mr-1" />
          লিসনিং স্টুডিও (২৫%)
        </button>

        <button
          onClick={() => setActiveTab('conversation')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'conversation'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
          AI কনভারসেশন টিউটর
        </button>

        <button
          onClick={() => setActiveTab('grammar')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'grammar'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 inline mr-1" />
          ব্যাকরণ ও সিনট্যাক্স
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'vocab'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5 inline mr-1" />
          ভোকাবুলারি ({SPANISH_VOCABULARY_LIST.length})
        </button>

        <button
          onClick={() => setActiveTab('exam')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'exam'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 inline mr-1 text-amber-300" />
          CEFR স্পিকিং পরীক্ষা
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'assistant'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <Brain className="w-3.5 h-3.5 inline mr-1" />
          AI পার্সোনাল কোচ
        </button>
      </div>

      {/* Render Active Sub-View */}
      {activeTab === 'days' && (
        <UniversalDailyLessonsList
          langConfig={langConfig}
          lessons={allLessons}
          progress={progress}
          onCompleteDay={handleCompleteDay}
          speakText={speakText}
          isSpeaking={isSpeaking}
          onGenerateNextLesson={handleGenerateNextLesson}
          isGeneratingNext={isGeneratingNext}
        />
      )}

      {activeTab === 'listening' && (
        <UniversalListeningStudio
          langConfig={langConfig}
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'conversation' && (
        <UniversalAIConversation
          langConfig={langConfig}
          userLevel={progress.level}
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'grammar' && (
        <UniversalGrammarBuilder
          langConfig={langConfig}
          onAwardXp={handleAwardXp}
          speakText={speakText}
        />
      )}

      {activeTab === 'vocab' && (
        <UniversalVocabularyView
          langConfig={langConfig}
          vocabulary={SPANISH_VOCABULARY_LIST}
          masteredIds={progress.masteredWordIds || []}
          onMarkMastered={handleToggleMastered}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'exam' && (
        <UniversalSpeakingExam
          langConfig={langConfig}
          currentCefrLevel={progress.cefrLevel || 'A1'}
          userName={currentUser || 'Staff Member'}
          onExamCompleted={handleExamCompleted}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {activeTab === 'assistant' && (
        <UniversalPersonalAssistant
          langConfig={langConfig}
          progress={progress}
          onNavigateToTab={(tab) => setActiveTab(tab as SpanishSubTab)}
          onStartExam={() => setActiveTab('exam')}
        />
      )}
    </div>
  );
};
export default SpanishAcademyView;

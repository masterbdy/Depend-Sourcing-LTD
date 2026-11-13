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
  ArrowLeft,
  MessageSquare,
  Mic,
  Headphones,
  Trophy,
  Play,
  Brain,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { getLanguageConfig } from '../core/languagesRegistry';
import { UniversalDailyLessonsList } from '../core/UniversalDailyLessonsList';
import { UniversalVocabularyView } from '../core/UniversalVocabularyView';
import { UniversalAIConversation } from '../core/UniversalAIConversation';
import { UniversalListeningStudio } from '../core/UniversalListeningStudio';
import { UniversalGrammarBuilder } from '../core/UniversalGrammarBuilder';
import { UniversalSpeakingExam } from '../core/UniversalSpeakingExam';
import { UniversalPersonalAssistant } from '../core/UniversalPersonalAssistant';
import { SERBIAN_LESSONS_DATA, SERBIAN_VOCABULARY_LIST } from './serbianLessonsData';
import { SerbianSpeakingStudio } from './SerbianSpeakingStudio';
import { UserLanguageProgress, CefrLevel, SpeakingExamResult, UniversalDailyLesson } from '../core/types';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getApp } from 'firebase/app';
import { getAllLessons, requestNextAdaptiveLesson } from '../../../services/dynamicLessonManager';

interface SerbianAcademyViewProps {
  currentUser: string | null;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
  onBackToHome?: () => void;
}

type SerbianSubTab =
  | 'days'
  | 'speaking'
  | 'listening'
  | 'conversation'
  | 'grammar'
  | 'vocab'
  | 'exam'
  | 'assistant';

export const SerbianAcademyView: React.FC<SerbianAcademyViewProps> = ({
  currentUser,
  firebaseConfig,
  isCloudEnabled,
  onBackToHome,
}) => {
  const langConfig = getLanguageConfig('serbian');
  const [activeTab, setActiveTab] = useState<SerbianSubTab>('days');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Safe user key for storage & Firebase isolation
  const safeUserId = useMemo(() => {
    if (!currentUser) return 'guest_user';
    return currentUser.replace(/[.#$[\]]/g, '_').toLowerCase();
  }, [currentUser]);

  const storageKey = `userSerbianProgress_${safeUserId}`;

  // Default Profile
  const defaultProgress: UserLanguageProgress = {
    userId: safeUserId,
    languageCode: 'serbian',
    currentDay: 1,
    completedDays: [],
    xp: 0,
    streak: 1,
    level: 'beginner',
    cefrLevel: 'A1',
    lastActiveDate: new Date().toISOString().split('T')[0],
    masteredWordIds: [],
    conversationMinutes: 12,
    completedQuizzesCount: 0,
    correctAnswersCount: 0,
    unlockedBadges: ['A1 Beginner Badge'],
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

  // Sync with Firebase Realtime Database
  useEffect(() => {
    if (!firebaseConfig?.databaseURL || !safeUserId) return;
    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);
      const userRef = ref(db, `learning/users/${safeUserId}/languages/serbian`);
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
      console.warn('Firebase Serbian sync listener error:', e);
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
          set(ref(db, `learning/users/${safeUserId}/languages/serbian`), newProgress);
        } catch (e) {
          console.error('Failed to sync Serbian progress to Firebase:', e);
        }
      }
    },
    [safeUserId, storageKey, firebaseConfig]
  );

  // Dynamic & Foundational Lessons State
  const [allLessons, setAllLessons] = useState<UniversalDailyLesson[]>(SERBIAN_LESSONS_DATA);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAllLessons('serbian', safeUserId, firebaseConfig).then((loaded) => {
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
        language: 'serbian',
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

  // Speech helper for Serbian with optional rate adjustment
  const speakText = useCallback((text: string, langCode: string = 'sr-RS', rate: number = 0.88) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = langCode;
      utterance.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      const srVoice =
        voices.find((v) => v.lang.startsWith('sr') || v.lang.includes('Serbian')) ||
        voices.find((v) => v.lang.startsWith('hr') || v.lang.startsWith('bs'));

      if (srVoice) utterance.voice = srVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
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

  // Award XP for speaking practice, conversation, or quiz
  const handleAwardXp = (amount: number, reason: string) => {
    setProgress((prev) => {
      const updatedXp = prev.xp + amount;
      const prevDist = prev.practiceDistribution || {
        speakingMinutes: 15,
        listeningMinutes: 8,
        vocabMinutes: 5,
        grammarMinutes: 3,
      };

      // Auto update practice distribution based on activity
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
        conversationMinutes: isSpeakingActivity ? prev.conversationMinutes + 2 : prev.conversationMinutes,
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

  // Exam completion & Level promotion handler
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

  const completedCount = progress.completedDays?.length || 0;
  const progressPercent = Math.round((completedCount / SERBIAN_LESSONS_DATA.length) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top 3D Glassmorphism Header Bar */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-95 flex items-center gap-1.5 text-xs font-black shadow-xs"
              title="Return to Learning Center"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Learning Center</span>
            </button>
          )}

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-rose-700 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/25 border border-white/20 animate-float">
            {langConfig.flag}
          </div>
          <div>
            <h2 className="text-base md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{langConfig.name} Academy (Српски језик)</span>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50">
                CEFR {progress.cefrLevel || 'A1'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Day {progress.currentDay || 1} • {completedCount} / {SERBIAN_LESSONS_DATA.length} পাঠ সম্পন্ন ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-black text-xs shadow-xs border border-orange-200/50">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>{progress.streak} Day Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black text-xs shadow-xs border border-amber-200/50">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{progress.xp} XP</span>
          </div>
        </div>
      </div>

      {/* 8 Core Training Systems Navigation Bar */}
      <div className="flex bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl overflow-x-auto gap-1.5 border border-slate-200/80 dark:border-slate-800 shadow-md">
        <button
          onClick={() => setActiveTab('days')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'days'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>📅 ডেইলি লেসন (১২)</span>
        </button>

        <button
          onClick={() => setActiveTab('speaking')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'speaking'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>🎙️ স্পিকিং স্টুডিও (৫০%)</span>
        </button>

        <button
          onClick={() => setActiveTab('listening')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'listening'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>🎧 লিসনিং স্টুডিও (২৫%)</span>
        </button>

        <button
          onClick={() => setActiveTab('conversation')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'conversation'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>🤖 AI কনভারসেশন টিউটর</span>
        </button>

        <button
          onClick={() => setActiveTab('grammar')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'grammar'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📚 ব্যাকরণ ও সিনট্যাক্স (১০%)</span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'vocab'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>📖 শব্দভাণ্ডার ও ফ্ল্যাশকার্ড (১৫%)</span>
        </button>

        <button
          onClick={() => setActiveTab('exam')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'exam'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>🏆 CEFR স্পিকিং পরীক্ষা</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'assistant'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>🧠 AI পার্সোনাল কোচ</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* 1. Day-by-Day Lessons */}
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

      {/* 2. Speaking Studio (Live Web Speech API & Pronunciation Drill) */}
      {activeTab === 'speaking' && (
        <SerbianSpeakingStudio
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {/* 3. Multi-Speed Listening Studio (0.75x, 1.0x, 1.25x & Dictation) */}
      {activeTab === 'listening' && (
        <UniversalListeningStudio
          langConfig={langConfig}
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {/* 4. AI Voice & Roleplay Simulator (Gemini /api/learning-ai/conversation) */}
      {activeTab === 'conversation' && (
        <UniversalAIConversation
          langConfig={langConfig}
          userLevel={progress.level}
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {/* 5. Practical Grammar & Interactive Sentence Builder */}
      {activeTab === 'grammar' && (
        <UniversalGrammarBuilder
          langConfig={langConfig}
          onAwardXp={handleAwardXp}
          speakText={speakText}
        />
      )}

      {/* 6. Vocabulary Bank & 3D Flashcards */}
      {activeTab === 'vocab' && (
        <UniversalVocabularyView
          langConfig={langConfig}
          vocabulary={SERBIAN_VOCABULARY_LIST}
          masteredIds={progress.masteredWordIds || []}
          onMarkMastered={handleToggleMastered}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {/* 7. CEFR Speaking Examination System & Certificate */}
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

      {/* 8. AI Personal Learning Assistant & 50/25/15/10 Balance Meter */}
      {activeTab === 'assistant' && (
        <UniversalPersonalAssistant
          langConfig={langConfig}
          progress={progress}
          onNavigateToTab={(tab) => setActiveTab(tab as SerbianSubTab)}
          onStartExam={() => setActiveTab('exam')}
        />
      )}
    </div>
  );
};
export default SerbianAcademyView;

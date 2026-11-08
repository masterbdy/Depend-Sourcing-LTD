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
  Play
} from 'lucide-react';
import { getLanguageConfig } from '../core/languagesRegistry';
import { UniversalDailyLessonsList } from '../core/UniversalDailyLessonsList';
import { UniversalVocabularyView } from '../core/UniversalVocabularyView';
import { UniversalAIConversation } from '../core/UniversalAIConversation';
import { SERBIAN_LESSONS_DATA, SERBIAN_VOCABULARY_LIST } from './serbianLessonsData';
import { SerbianSpeakingStudio } from './SerbianSpeakingStudio';
import { UserLanguageProgress } from '../core/types';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getApp } from 'firebase/app';

interface SerbianAcademyViewProps {
  currentUser: string | null;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
  onBackToHome?: () => void;
}

export const SerbianAcademyView: React.FC<SerbianAcademyViewProps> = ({
  currentUser,
  firebaseConfig,
  isCloudEnabled,
  onBackToHome,
}) => {
  const langConfig = getLanguageConfig('serbian');
  const [activeTab, setActiveTab] = useState<'days' | 'speaking' | 'vocab' | 'conversation'>('days');
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
    lastActiveDate: new Date().toISOString().split('T')[0],
    masteredWordIds: [],
    conversationMinutes: 0,
    completedQuizzesCount: 0,
    correctAnswersCount: 0,
    unlockedBadges: [],
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

  // Speech helper for Serbian
  const speakText = useCallback((text: string, langCode: string = 'sr-RS') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = langCode;
      utterance.rate = 0.88;

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
      const updated: UserLanguageProgress = {
        ...prev,
        xp: updatedXp,
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

  const completedCount = progress.completedDays?.length || 0;
  const progressPercent = Math.round((completedCount / SERBIAN_LESSONS_DATA.length) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top 3D Glassmorphism Header Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold"
              title="Return to Learning Center"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Learning Center</span>
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-rose-700 text-white flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/20">
            {langConfig.flag}
          </div>
          <div>
            <h2 className="text-base md:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>{langConfig.name} Academy (Српски језик)</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                {progress.level}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Day {progress.currentDay || 1} • {completedCount} / {SERBIAN_LESSONS_DATA.length} পাঠ সম্পন্ন ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-black text-xs shadow-xs">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>{progress.streak} Day Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black text-xs shadow-xs">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{progress.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs matching Chinese/Spanish architecture */}
      <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl max-w-2xl overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('days')}
          className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'days'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>📅 ডেইলি লেসন (১২)</span>
        </button>

        <button
          onClick={() => setActiveTab('speaking')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'speaking'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>🎙️ স্পিকিং স্টুডিও (৭০%)</span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'vocab'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>📖 ভোকাবুলারি ({SERBIAN_VOCABULARY_LIST.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('conversation')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'conversation'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>🤖 AI কনভারসেশন</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* 1. Day-by-Day Lessons */}
      {activeTab === 'days' && (
        <UniversalDailyLessonsList
          langConfig={langConfig}
          lessons={SERBIAN_LESSONS_DATA}
          progress={progress}
          onCompleteDay={handleCompleteDay}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {/* 2. Speaking & Listening Studio (Speaking-First: 70% Speaking, 20% Listening) */}
      {activeTab === 'speaking' && (
        <SerbianSpeakingStudio
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}

      {/* 3. Vocabulary Bank & Flashcards */}
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

      {/* 4. AI Voice & Roleplay Simulator */}
      {activeTab === 'conversation' && (
        <UniversalAIConversation
          langConfig={langConfig}
          userLevel={progress.level}
          onAwardXp={handleAwardXp}
          speakText={speakText}
          isSpeaking={isSpeaking}
        />
      )}
    </div>
  );
};
export default SerbianAcademyView;

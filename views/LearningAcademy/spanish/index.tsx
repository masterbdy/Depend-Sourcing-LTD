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
  MessageSquare
} from 'lucide-react';
import { getLanguageConfig } from '../core/languagesRegistry';
import { UniversalDailyLessonsList } from '../core/UniversalDailyLessonsList';
import { UniversalVocabularyView } from '../core/UniversalVocabularyView';
import { UniversalAIConversation } from '../core/UniversalAIConversation';
import { SPANISH_LESSONS_DATA, SPANISH_VOCABULARY_LIST } from './spanishLessonsData';
import { UserLanguageProgress } from '../core/types';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getApp } from 'firebase/app';

interface SpanishAcademyViewProps {
  currentUser: string | null;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
}

export const SpanishAcademyView: React.FC<SpanishAcademyViewProps> = ({
  currentUser,
  firebaseConfig,
  isCloudEnabled,
}) => {
  const langConfig = getLanguageConfig('spanish');
  const [activeTab, setActiveTab] = useState<'days' | 'vocab' | 'conversation'>('days');
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

  // Speech helper for Spanish
  const speakText = useCallback((text: string, langCode: string = 'es-ES') => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = langCode;
      utterance.rate = 0.88;

      const voices = window.speechSynthesis.getVoices();
      const esVoice =
        voices.find((v) => v.lang.startsWith('es') || v.lang.includes('Spanish')) ||
        voices.find((v) => v.lang.includes('ES'));

      if (esVoice) utterance.voice = esVoice;

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
        level: updatedXp > 150 ? 'elementary' : 'beginner',
        lastActiveDate: new Date().toISOString().split('T')[0],
      };

      persistProgress(updated);
      return updated;
    });
  };

  // Award XP for conversation or quiz
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
              <span>{langConfig.name} Academy</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {progress.level}
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
      <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('days')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'days'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          📅 ডেইলি লেসন
        </button>
        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'vocab'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          📖 ভোকাবুলারি ({SPANISH_VOCABULARY_LIST.length})
        </button>
        <button
          onClick={() => setActiveTab('conversation')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'conversation'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          🤖 AI কনভারসেশন
        </button>
      </div>

      {/* Render Active Sub-View */}
      {activeTab === 'days' && (
        <UniversalDailyLessonsList
          langConfig={langConfig}
          lessons={SPANISH_LESSONS_DATA}
          progress={progress}
          onCompleteDay={handleCompleteDay}
          speakText={speakText}
          isSpeaking={isSpeaking}
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

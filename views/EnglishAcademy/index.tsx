import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Mic,
  BookmarkCheck,
  Sparkles,
  Briefcase,
  Trophy,
  Settings2,
  Volume2,
  VolumeX,
  Megaphone,
  Flame
} from 'lucide-react';
import { UserRole, Staff } from '../../types';
import {
  UserLearningProfile,
  AcademySettings,
  VocabularyWord
} from './types';
import { HomeDashboard } from './HomeDashboard';
import { LearningPathView } from './LearningPathView';
import { SpeakingPracticeView } from './SpeakingPracticeView';
import { VocabularyBuilderView } from './VocabularyBuilderView';
import { GrammarQuizView } from './GrammarQuizView';
import { OfficeEnglishView } from './OfficeEnglishView';
import { LeaderboardView } from './LeaderboardView';
import { AdminSettingsView } from './AdminSettingsView';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';
import { getApp } from 'firebase/app';

interface EnglishAcademyModuleProps {
  currentUser: string | null;
  role: UserRole | null;
  staffList: Staff[];
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
}

export const EnglishAcademyView: React.FC<EnglishAcademyModuleProps> = ({
  currentUser,
  role,
  staffList,
  firebaseConfig,
  isCloudEnabled,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>('home');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Safe User ID for storage keys
  const safeUserId = useMemo(() => {
    if (!currentUser) return 'guest_user';
    return currentUser.replace(/[.#$[\]]/g, '_').toLowerCase();
  }, [currentUser]);

  // Local Storage Cache Key
  const storageKey = `ea_profile_${safeUserId}`;

  // User Learning Profile State
  const [profile, setProfile] = useState<UserLearningProfile>(() => {
    try {
      const saved = localStorage.getItem(`ea_profile_${safeUserId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load English Academy local profile');
    }

    const today = new Date().toISOString().split('T')[0];
    return {
      userId: safeUserId,
      userName: currentUser || 'Learner',
      xp: 120,
      level: 1,
      streak: 1,
      lastActiveDate: today,
      totalDays: 1,
      completedLessons: ['beg-1'],
      savedWordIds: ['v-1', 'v-2'],
      masteredWordIds: ['v-1'],
      needPracticeWordIds: [],
      speakingMinutes: 3,
      dailyGoalTarget: 50,
      dailyGoalProgress: 20,
      lastGoalDate: today,
      completedQuizzesCount: 1,
      correctAnswersCount: 2,
      unlockedBadges: ['b-first-lesson'],
    };
  });

  // Settings State
  const [settings, setSettings] = useState<AcademySettings>(() => {
    try {
      const saved = localStorage.getItem('ea_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      isEnabled: true,
      allowGuestAccess: true,
      announcementBn: 'ইংলিশ একাডেমি চালু হয়েছে! প্রতিদিন নিয়মিত অনুশীলন করে XP ও ব্যাজ অর্জন করুন।',
    };
  });

  // Custom Words from Admin
  const [customWords, setCustomWords] = useState<VocabularyWord[]>(() => {
    try {
      const saved = localStorage.getItem('ea_custom_words');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // All Staff Profiles for Leaderboard
  const [allStaffProfiles, setAllStaffProfiles] = useState<UserLearningProfile[]>([
    profile,
    {
      userId: 'shariful_islam',
      userName: 'Shariful Islam (MD)',
      xp: 450,
      level: 3,
      streak: 5,
      lastActiveDate: new Date().toISOString().split('T')[0],
      totalDays: 6,
      completedLessons: ['beg-1', 'beg-2', 'ele-1'],
      savedWordIds: ['v-1', 'v-3'],
      masteredWordIds: ['v-1', 'v-2', 'v-3'],
      needPracticeWordIds: [],
      speakingMinutes: 25,
      dailyGoalTarget: 50,
      dailyGoalProgress: 50,
      lastGoalDate: new Date().toISOString().split('T')[0],
      completedQuizzesCount: 4,
      correctAnswersCount: 10,
      unlockedBadges: ['b-first-lesson', 'b-streak-3', 'b-vocab-10'],
    },
    {
      userId: 'moyna_islam',
      userName: 'Moyna Islam (Chairman)',
      xp: 320,
      level: 2,
      streak: 4,
      lastActiveDate: new Date().toISOString().split('T')[0],
      totalDays: 4,
      completedLessons: ['beg-1', 'ele-2'],
      savedWordIds: [],
      masteredWordIds: ['v-4'],
      needPracticeWordIds: [],
      speakingMinutes: 12,
      dailyGoalTarget: 50,
      dailyGoalProgress: 30,
      lastGoalDate: new Date().toISOString().split('T')[0],
      completedQuizzesCount: 2,
      correctAnswersCount: 5,
      unlockedBadges: ['b-first-lesson', 'b-streak-3'],
    },
    {
      userId: 'imran_accounts',
      userName: 'Imran (Accounts)',
      xp: 280,
      level: 2,
      streak: 3,
      lastActiveDate: new Date().toISOString().split('T')[0],
      totalDays: 3,
      completedLessons: ['beg-1', 'ele-1'],
      savedWordIds: ['v-1'],
      masteredWordIds: ['v-1', 'v-5'],
      needPracticeWordIds: [],
      speakingMinutes: 8,
      dailyGoalTarget: 50,
      dailyGoalProgress: 40,
      lastGoalDate: new Date().toISOString().split('T')[0],
      completedQuizzesCount: 2,
      correctAnswersCount: 4,
      unlockedBadges: ['b-first-lesson', 'b-streak-3'],
    }
  ]);

  // Synchronize streak on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = profile.lastActiveDate;

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const isConsecutive = lastDate === yesterday;
      const newStreak = isConsecutive ? (profile.streak || 0) + 1 : 1;
      const newTotalDays = (profile.totalDays || 1) + 1;

      setProfile((prev) => {
        const updated = {
          ...prev,
          streak: newStreak,
          totalDays: newTotalDays,
          lastActiveDate: today,
          dailyGoalProgress: 0,
          lastGoalDate: today,
        };
        try {
          localStorage.setItem(`ea_profile_${safeUserId}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [safeUserId]);

  // Firebase Realtime DB Sync (Read & Listen)
  useEffect(() => {
    if (!firebaseConfig?.databaseURL) return;

    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);

      // Listen to User Profile
      const userRef = ref(db, `english_academy/users/${safeUserId}`);
      const unsubUser = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data === 'object') {
          setProfile((prev) => {
            const merged = { ...prev, ...data };
            localStorage.setItem(`ea_profile_${safeUserId}`, JSON.stringify(merged));
            return merged;
          });
        }
      });

      // Listen to Settings
      const settingsRef = ref(db, 'english_academy/settings');
      const unsubSettings = onValue(settingsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setSettings(val);
          localStorage.setItem('ea_settings', JSON.stringify(val));
        }
      });

      // Listen to Custom Words
      const customRef = ref(db, 'english_academy/custom_words');
      const unsubCustom = onValue(customRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.values(val) as VocabularyWord[];
          setCustomWords(list);
          localStorage.setItem('ea_custom_words', JSON.stringify(list));
        }
      });

      // Listen to Leaderboard
      const lbRef = ref(db, 'english_academy/leaderboard');
      const unsubLb = onValue(lbRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.values(val) as UserLearningProfile[];
          setAllStaffProfiles((prev) => {
            // merge with existing
            const map = new Map<string, UserLearningProfile>();
            prev.forEach((p) => map.set(p.userId, p));
            list.forEach((p) => map.set(p.userId, p));
            return Array.from(map.values());
          });
        }
      });

      return () => {
        unsubUser();
        unsubSettings();
        unsubCustom();
        unsubLb();
      };
    } catch (e) {
      console.warn('Firebase sync listener error in English Academy:', e);
    }
  }, [firebaseConfig, safeUserId]);

  // Persist Profile Helper
  const persistProfile = useCallback(
    (newProfile: UserLearningProfile) => {
      setProfile(newProfile);
      try {
        localStorage.setItem(`ea_profile_${safeUserId}`, JSON.stringify(newProfile));
      } catch (e) {
        console.warn('LocalStorage quota limit during save profile');
      }

      // Sync to Firebase
      if (firebaseConfig?.databaseURL) {
        try {
          const app = getApp();
          const db = getDatabase(app, firebaseConfig.databaseURL);
          set(ref(db, `english_academy/users/${safeUserId}`), newProfile);
          // Also update leaderboard entry
          set(ref(db, `english_academy/leaderboard/${safeUserId}`), {
            userId: newProfile.userId,
            userName: newProfile.userName,
            xp: newProfile.xp,
            level: newProfile.level,
            streak: newProfile.streak,
            completedLessons: newProfile.completedLessons || [],
            speakingMinutes: newProfile.speakingMinutes || 0,
            masteredWordIds: newProfile.masteredWordIds || [],
          });
        } catch (e) {
          console.error('Failed to sync English Academy profile to Firebase:', e);
        }
      }
    },
    [safeUserId, firebaseConfig]
  );

  // Award XP Function
  const handleAwardXp = useCallback(
    (amount: number, reason: string) => {
      setProfile((prev) => {
        const newXp = (prev.xp || 0) + amount;
        const newLevel = Math.floor(newXp / 200) + 1;
        const newDailyProgress = (prev.dailyGoalProgress || 0) + amount;

        const updated: UserLearningProfile = {
          ...prev,
          xp: newXp,
          level: newLevel,
          dailyGoalProgress: newDailyProgress,
        };
        persistProfile(updated);
        return updated;
      });
    },
    [persistProfile]
  );

  // Text-To-Speech Function
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not supported');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95; // slightly slower for optimal clarity

      // Find an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
    }
  }, []);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Lesson Completion Handler
  const handleCompleteLesson = (lessonId: string, xpReward: number) => {
    setProfile((prev) => {
      const alreadyDone = (prev.completedLessons || []).includes(lessonId);
      const newLessons = alreadyDone
        ? prev.completedLessons
        : [...(prev.completedLessons || []), lessonId];

      const awardedXp = alreadyDone ? 0 : xpReward;
      const newXp = (prev.xp || 0) + awardedXp;
      const newLevel = Math.floor(newXp / 200) + 1;

      const updated: UserLearningProfile = {
        ...prev,
        completedLessons: newLessons,
        xp: newXp,
        level: newLevel,
        dailyGoalProgress: (prev.dailyGoalProgress || 0) + awardedXp,
      };
      persistProfile(updated);
      return updated;
    });
  };

  // Vocabulary handlers
  const handleToggleSaveWord = (wordId: string) => {
    setProfile((prev) => {
      const isSaved = (prev.savedWordIds || []).includes(wordId);
      const newSaved = isSaved
        ? prev.savedWordIds.filter((id) => id !== wordId)
        : [...(prev.savedWordIds || []), wordId];

      const updated = { ...prev, savedWordIds: newSaved };
      persistProfile(updated);
      return updated;
    });
  };

  const handleMarkWordMastered = (wordId: string) => {
    setProfile((prev) => {
      const isAlready = (prev.masteredWordIds || []).includes(wordId);
      const newMastered = isAlready
        ? prev.masteredWordIds
        : [...(prev.masteredWordIds || []), wordId];
      const newNeedPractice = (prev.needPracticeWordIds || []).filter((id) => id !== wordId);

      const addedXp = isAlready ? 0 : 10;
      const newXp = (prev.xp || 0) + addedXp;

      const updated: UserLearningProfile = {
        ...prev,
        masteredWordIds: newMastered,
        needPracticeWordIds: newNeedPractice,
        xp: newXp,
        level: Math.floor(newXp / 200) + 1,
        dailyGoalProgress: (prev.dailyGoalProgress || 0) + addedXp,
      };
      persistProfile(updated);
      return updated;
    });
  };

  const handleMarkWordNeedPractice = (wordId: string) => {
    setProfile((prev) => {
      const isAlready = (prev.needPracticeWordIds || []).includes(wordId);
      const newNeed = isAlready
        ? prev.needPracticeWordIds
        : [...(prev.needPracticeWordIds || []), wordId];
      const newMastered = (prev.masteredWordIds || []).filter((id) => id !== wordId);

      const updated = {
        ...prev,
        needPracticeWordIds: newNeed,
        masteredWordIds: newMastered,
      };
      persistProfile(updated);
      return updated;
    });
  };

  const handleIncrementSpeakingMinutes = (minutes: number) => {
    setProfile((prev) => {
      const updated = {
        ...prev,
        speakingMinutes: (prev.speakingMinutes || 0) + minutes,
      };
      persistProfile(updated);
      return updated;
    });
  };

  const handleCompleteDailyChallenge = () => {
    handleAwardXp(25, 'Daily Challenge Completed');
  };

  // Admin Settings Updates
  const handleUpdateSettings = (newSettings: AcademySettings) => {
    setSettings(newSettings);
    localStorage.setItem('ea_settings', JSON.stringify(newSettings));
    if (firebaseConfig?.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        set(ref(db, 'english_academy/settings'), newSettings);
      } catch (e) {
        console.error('Failed to sync settings', e);
      }
    }
  };

  const handleAddCustomWord = (word: VocabularyWord) => {
    const updated = [...customWords, word];
    setCustomWords(updated);
    localStorage.setItem('ea_custom_words', JSON.stringify(updated));
    if (firebaseConfig?.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        set(ref(db, `english_academy/custom_words/${word.id}`), word);
      } catch (e) {
        console.error('Failed to sync custom word', e);
      }
    }
  };

  const handleDeleteCustomWord = (wordId: string) => {
    const updated = customWords.filter((w) => w.id !== wordId);
    setCustomWords(updated);
    localStorage.setItem('ea_custom_words', JSON.stringify(updated));
    if (firebaseConfig?.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        set(ref(db, `english_academy/custom_words/${wordId}`), null);
      } catch (e) {
        console.error('Failed to delete custom word from Firebase', e);
      }
    }
  };

  const isAdminOrMd = role === UserRole.ADMIN || role === UserRole.MD;

  // Navigation Items
  const navTabs = [
    { id: 'home', label: 'হোম ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'courses', label: 'লার্নিং পাথ', icon: BookOpen },
    { id: 'speaking', label: 'AI স্পিকিং', icon: Mic },
    { id: 'vocabulary', label: 'ভোকাবুলারি', icon: BookmarkCheck },
    { id: 'grammar', label: 'গ্রামার ও কুইজ', icon: Sparkles },
    { id: 'office', label: 'অফিস ইংলিশ', icon: Briefcase },
    { id: 'leaderboard', label: 'লিডারবোর্ড', icon: Trophy },
    ...(isAdminOrMd ? [{ id: 'admin', label: 'অ্যাডমিন সেটিংস', icon: Settings2 }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Announcement Banner (if any) */}
      {settings.announcementBn && (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-amber-300 dark:border-amber-700/60 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
            <span className="font-semibold">{settings.announcementBn}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
            Notice
          </span>
        </div>
      )}

      {/* Internal Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {navTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main View Router */}
      <div className="transition-all duration-300">
        {activeSubTab === 'home' && (
          <HomeDashboard
            profile={profile}
            onNavigateTab={(tab) => setActiveSubTab(tab)}
            onContinueLearning={() => setActiveSubTab('courses')}
            onCompleteDailyChallenge={handleCompleteDailyChallenge}
            dailyChallengeCompleted={profile.dailyGoalProgress >= (profile.dailyGoalTarget || 50)}
          />
        )}

        {activeSubTab === 'courses' && (
          <LearningPathView
            completedLessons={profile.completedLessons || []}
            onCompleteLesson={handleCompleteLesson}
            speakText={speakText}
            isSpeaking={isSpeaking}
          />
        )}

        {activeSubTab === 'speaking' && (
          <SpeakingPracticeView
            onAwardXp={handleAwardXp}
            speakText={speakText}
            isSpeaking={isSpeaking}
            onIncrementSpeakingMinutes={handleIncrementSpeakingMinutes}
          />
        )}

        {activeSubTab === 'vocabulary' && (
          <VocabularyBuilderView
            savedWordIds={profile.savedWordIds || []}
            masteredWordIds={profile.masteredWordIds || []}
            needPracticeWordIds={profile.needPracticeWordIds || []}
            onToggleSaveWord={handleToggleSaveWord}
            onMarkWordMastered={handleMarkWordMastered}
            onMarkWordNeedPractice={handleMarkWordNeedPractice}
            speakText={speakText}
            isSpeaking={isSpeaking}
          />
        )}

        {activeSubTab === 'grammar' && (
          <GrammarQuizView
            onAwardXp={handleAwardXp}
            speakText={speakText}
            isSpeaking={isSpeaking}
          />
        )}

        {activeSubTab === 'office' && (
          <OfficeEnglishView
            speakText={speakText}
            isSpeaking={isSpeaking}
          />
        )}

        {activeSubTab === 'leaderboard' && (
          <LeaderboardView
            currentProfile={profile}
            allStaffProfiles={allStaffProfiles}
          />
        )}

        {activeSubTab === 'admin' && isAdminOrMd && (
          <AdminSettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            customWords={customWords}
            onAddCustomWord={handleAddCustomWord}
            onDeleteCustomWord={handleDeleteCustomWord}
          />
        )}
      </div>
    </div>
  );
};

export default EnglishAcademyView;

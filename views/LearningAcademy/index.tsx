import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Search,
  Users,
  Sparkles,
  ArrowRight,
  Flame,
  Award,
  AlertCircle,
  Home,
  CheckCircle2,
  Mic,
  Trophy,
  Play,
  Volume2,
  RotateCcw,
  Compass,
  HelpCircle,
  Headphones,
  Calendar,
  TrendingUp,
  Target,
  Languages,
  Star,
  Check,
  Layers,
  Globe,
  Radio,
  Clock,
  Zap,
  BarChart3
} from 'lucide-react';
import { UserRole, Staff } from '../../types';
import { EnglishAcademyView } from '../EnglishAcademy';
import { ChineseAcademyView } from './chinese';
import { SpanishAcademyView } from './spanish';
import { SerbianAcademyView } from './serbian';
import { AdminLearningAccessView } from './admin/AdminLearningAccessView';
import { SUPPORTED_LANGUAGES, DEFAULT_GLOBAL_SETTINGS, getLanguageConfig } from './core/languagesRegistry';
import {
  GlobalLearningSettings,
  LanguageAccessMap,
  LearningAuditLog,
  UserLanguageProgress
} from './core/types';
import { SPANISH_LESSONS_DATA } from './spanish/spanishLessonsData';
import { CHINESE_LESSONS_DATA } from './chinese/chineseLessonsData';
import { SERBIAN_LESSONS_DATA } from './serbian/serbianLessonsData';
import { getDatabase, ref, onValue, set, push } from 'firebase/database';
import { getApp } from 'firebase/app';

interface LearningAcademyViewProps {
  currentUser: string | null;
  role: UserRole | null;
  staffList: Staff[];
  setStaffList?: React.Dispatch<React.SetStateAction<Staff[]>>;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
}

type DashboardSection =
  | 'courses'
  | 'continue'
  | 'practice'
  | 'vocabulary'
  | 'speaking'
  | 'grammar'
  | 'quizzes'
  | 'achievements'
  | 'history';

export const LearningAcademyView: React.FC<LearningAcademyViewProps> = ({
  currentUser,
  role,
  staffList = [],
  setStaffList,
  firebaseConfig,
  isCloudEnabled,
}) => {
  const isAdminOrMD = role === UserRole.ADMIN || role === UserRole.MD;

  // Active View Tab: 'home' | 'serbian' | 'english' | 'chinese' | 'spanish' | 'admin'
  const [activeTab, setActiveTab] = useState<string>('home');

  // Sub-navigation section within Home Dashboard
  const [activeSection, setActiveSection] = useState<DashboardSection>('courses');

  // Interactive state for Speaking Studio
  const [isSpeakingStudioRecording, setIsSpeakingStudioRecording] = useState(false);
  const [speakingStudioFeedback, setSpeakingStudioFeedback] = useState<string | null>(null);
  const dashboardRecRef = useRef<any>(null);

  // Interactive state for Dashboard Quiz section
  const [activeQuizQuestionIdx, setActiveQuizQuestionIdx] = useState(0);
  const [selectedDashboardQuizAnswer, setSelectedDashboardQuizAnswer] = useState<string | null>(null);
  const [dashboardQuizScore, setDashboardQuizScore] = useState(0);
  const [dashboardQuizFinished, setDashboardQuizFinished] = useState(false);

  // Safe user key
  const safeUserId = useMemo(() => {
    if (!currentUser) return 'guest_user';
    return currentUser.replace(/[.#$[\]]/g, '_').toLowerCase();
  }, [currentUser]);

  // Identify current user's staff record
  const currentStaff = useMemo(() => {
    if (!currentUser) return null;
    return staffList.find((s) => s.name === currentUser);
  }, [currentUser, staffList]);

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<GlobalLearningSettings>(() => {
    try {
      const saved = localStorage.getItem('learning_academy_global_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GLOBAL_SETTINGS;
  });

  // User Access Map
  const [userAccessMap, setUserAccessMap] = useState<Record<string, LanguageAccessMap>>(() => {
    try {
      const saved = localStorage.getItem('learning_academy_user_access_map');
      if (saved) return JSON.parse(saved);
    } catch {}

    const initial: Record<string, LanguageAccessMap> = {};
    staffList.forEach((s) => {
      initial[s.id] = {
        english: true,
        chinese: s.hasChineseAcademyAccess === true,
        spanish: false,
        serbian: true,
      };
    });
    return initial;
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<LearningAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('learning_academy_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // User Language Progress Map for Home Dashboard Cards
  const [progressMap, setProgressMap] = useState<Record<string, UserLanguageProgress>>(() => {
    const today = new Date().toISOString().split('T')[0];
    const initial: Record<string, UserLanguageProgress> = {};

    try {
      const sr = localStorage.getItem(`userSerbianProgress_${safeUserId}`);
      if (sr) {
        initial['serbian'] = JSON.parse(sr);
      } else {
        initial['serbian'] = {
          userId: safeUserId,
          languageCode: 'serbian',
          currentDay: 3,
          completedDays: [1, 2],
          xp: 140,
          streak: 3,
          level: 'beginner',
          lastActiveDate: today,
          masteredWordIds: ['sr-1-1', 'sr-1-2'],
          conversationMinutes: 15,
          completedQuizzesCount: 2,
          correctAnswersCount: 4,
          unlockedBadges: ['beginner_learner', 'language_explorer'],
        };
      }
    } catch {}

    try {
      const en = localStorage.getItem(`ea_profile_${safeUserId}`);
      if (en) {
        const p = JSON.parse(en);
        initial['english'] = {
          userId: safeUserId,
          languageCode: 'english',
          currentDay: (p.completedLessons?.length || 0) + 1,
          completedDays: p.completedLessons ? p.completedLessons.map((_: any, idx: number) => idx + 1) : [1],
          xp: p.xp || 120,
          streak: p.streak || 2,
          level: 'beginner',
          lastActiveDate: p.lastActiveDate || today,
          masteredWordIds: p.masteredWordIds || [],
          conversationMinutes: p.speakingMinutes || 0,
          completedQuizzesCount: p.completedQuizzesCount || 0,
          correctAnswersCount: p.correctAnswersCount || 0,
          unlockedBadges: p.unlockedBadges || [],
        };
      }
    } catch {}

    try {
      const zh = localStorage.getItem(`userChineseProgress_${safeUserId}`);
      if (zh) {
        const p = JSON.parse(zh);
        initial['chinese'] = {
          userId: safeUserId,
          languageCode: 'chinese',
          currentDay: p.currentDay || 1,
          completedDays: p.completedDays || [],
          xp: p.xp || 0,
          streak: p.streak || 1,
          level: (p.xp || 0) > 100 ? 'elementary' : 'beginner',
          lastActiveDate: p.lastActiveDate || today,
          masteredWordIds: p.vocabularyMastered || [],
          conversationMinutes: p.simulatorMinutes || 0,
          completedQuizzesCount: 0,
          correctAnswersCount: 0,
          unlockedBadges: [],
        };
      }
    } catch {}

    try {
      const es = localStorage.getItem(`userSpanishProgress_${safeUserId}`);
      if (es) {
        const p = JSON.parse(es);
        initial['spanish'] = {
          userId: safeUserId,
          languageCode: 'spanish',
          currentDay: p.currentDay || 1,
          completedDays: p.completedDays || [],
          xp: p.xp || 0,
          streak: p.streak || 1,
          level: p.level || 'beginner',
          lastActiveDate: p.lastActiveDate || today,
          masteredWordIds: p.masteredWordIds || [],
          conversationMinutes: p.conversationMinutes || 0,
          completedQuizzesCount: p.completedQuizzesCount || 0,
          correctAnswersCount: p.correctAnswersCount || 0,
          unlockedBadges: [],
        };
      }
    } catch {}

    return initial;
  });

  // Sync Global Settings & User Access with Firebase
  useEffect(() => {
    if (!firebaseConfig?.databaseURL) return;
    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);

      const settingsRef = ref(db, 'learning_academy/settings_v2');
      const unsubSettings = onValue(settingsRef, (snap) => {
        const val = snap.val();
        if (val) {
          setGlobalSettings(val);
          localStorage.setItem('learning_academy_global_settings', JSON.stringify(val));
        }
      });

      const accessRef = ref(db, 'learning_academy/user_access');
      const unsubAccess = onValue(accessRef, (snap) => {
        const val = snap.val();
        if (val) {
          setUserAccessMap(val);
          localStorage.setItem('learning_academy_user_access_map', JSON.stringify(val));
        }
      });

      const auditRef = ref(db, 'learning_academy/audit_logs');
      const unsubAudit = onValue(auditRef, (snap) => {
        const val = snap.val();
        if (val) {
          const list: LearningAuditLog[] = Object.values(val);
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(list);
          localStorage.setItem('learning_academy_audit_logs', JSON.stringify(list));
        }
      });

      return () => {
        unsubSettings();
        unsubAccess();
        unsubAudit();
      };
    } catch (e) {
      console.warn('Firebase learning listener error:', e);
    }
  }, [firebaseConfig]);

  // Check authorization
  const isAuthorizedForLanguage = useCallback(
    (langCode: string): boolean => {
      if (isAdminOrMD) return true;

      const rule = globalSettings.languageAvailability[langCode];
      if (rule?.disabledGlobally) return false;
      if (rule?.enabledForEveryone) return true;

      if (!currentStaff) {
        return langCode === 'english' || langCode === 'serbian';
      }

      const userPerms = userAccessMap[currentStaff.id];
      if (userPerms && typeof userPerms[langCode] === 'boolean') {
        return userPerms[langCode];
      }

      if (langCode === 'chinese') {
        return currentStaff.hasChineseAcademyAccess === true;
      }

      return langCode === 'english' || langCode === 'serbian';
    },
    [isAdminOrMD, globalSettings, currentStaff, userAccessMap]
  );

  const availableLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((lang) => isAuthorizedForLanguage(lang.code));
  }, [isAuthorizedForLanguage]);

  // Audio speech synthesis helper
  const playSampleAudio = (text: string, lang = 'sr-RS') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  };

  // Sample quick quiz questions for the Quizzes section
  const dashboardQuizList = [
    {
      q: 'What does "Здраво" (Zdravo) mean in Serbian?',
      qBn: '"Здраво" শব্দের অর্থ কী?',
      options: ['Hello', 'Thank you', 'Goodbye', 'Please'],
      correct: 'Hello',
      lang: 'Serbian',
    },
    {
      q: 'How do you say "Thank you" in Serbian?',
      qBn: 'সার্বিয়ান ভাষায় "ধন্যবাদ" কোনটি?',
      options: ['Хвала (Hvala)', 'Молим (Molim)', 'Да (Da)', 'Не (Ne)'],
      correct: 'Хвала (Hvala)',
      lang: 'Serbian',
    },
    {
      q: 'What does "Laku noć" mean?',
      qBn: '"Laku noć" শব্দের বাংলা অর্থ কী?',
      options: ['Good night (শুভ রাত্রি)', 'Good morning (শুভ সকাল)', 'Welcome (স্বাগতম)', 'Water (পানি)'],
      correct: 'Good night (শুভ রাত্রি)',
      lang: 'Serbian',
    },
  ];

  // Award XP to Serbian progress from Dashboard actions
  const awardDashboardXpToSerbian = useCallback(
    (amount: number) => {
      setProgressMap((prev) => {
        const current = prev.serbian || {
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
        const updated: UserLanguageProgress = {
          ...current,
          xp: current.xp + amount,
          lastActiveDate: new Date().toISOString().split('T')[0],
        };
        try {
          localStorage.setItem(`userSerbianProgress_${safeUserId}`, JSON.stringify(updated));
        } catch {}

        if (firebaseConfig?.databaseURL) {
          try {
            const app = getApp();
            const db = getDatabase(app, firebaseConfig.databaseURL);
            set(ref(db, `learning/users/${safeUserId}/languages/serbian`), updated);
          } catch {}
        }

        return { ...prev, serbian: updated };
      });
    },
    [safeUserId, firebaseConfig]
  );

  // Live Speech Recognition for Dashboard Speaking Practice
  const handleStartSpeakingStudio = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeakingStudioFeedback(
        '🎙️ আপনার বর্তমান ব্রাউজারে লাইভ স্পিচ রিকগনিশন সক্রিয় নেই। সরাসরি মাইক্রোফোনে কথা বলার জন্য গুগল ক্রোম ব্রাউজার ব্যবহার করুন। তবে আপনি শুনুন বাটনে চাপ দিয়ে সার্বিয়ান উচ্চারণ শুনতে পারেন।'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'sr-RS';
      rec.onstart = () => {
        setIsSpeakingStudioRecording(true);
        setSpeakingStudioFeedback('🎙️ শুনছি... স্পষ্ট সার্বিয়ান ভাষায় বলুন "Zdravo" (Здраво)!');
      };
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript || '';
        setIsSpeakingStudioRecording(false);
        const clean = text.toLowerCase().trim();
        if (
          clean.includes('zdravo') ||
          clean.includes('здраво') ||
          clean.includes('dravo') ||
          clean.includes('zravo') ||
          clean.includes('hello')
        ) {
          setSpeakingStudioFeedback(`✓ চমৎকার! আপনি বলেছেন: "${text}"। আপনার সার্বিয়ান উচ্চারণ সঠিক হয়েছে! (+10 XP)`);
          awardDashboardXpToSerbian(10);
        } else {
          setSpeakingStudioFeedback(`আপনি বলেছেন: "${text}"। আবার চেষ্টা করুন, "Zdravo" স্পষ্ট করে বলুন।`);
        }
      };
      rec.onerror = (err: any) => {
        setIsSpeakingStudioRecording(false);
        if (err.error === 'not-allowed') {
          setSpeakingStudioFeedback('মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজারের অনুমতি সেটিংস পরীক্ষা করুন।');
        } else {
          setSpeakingStudioFeedback('কোনো শব্দ স্পষ্টভাবে ধরা পড়েনি। মাইক্রোফোনের কাছে এসে আবার বলুন।');
        }
      };
      rec.onend = () => {
        setIsSpeakingStudioRecording(false);
      };
      dashboardRecRef.current = rec;
      rec.start();
    } catch {
      setIsSpeakingStudioRecording(false);
      setSpeakingStudioFeedback('মাইক্রোফোন চালু করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  // Next Unfinished Lesson for Serbian
  const nextSerbianLesson = useMemo(() => {
    const completed = progressMap.serbian?.completedDays || [];
    return (
      SERBIAN_LESSONS_DATA.find((l) => !completed.includes(l.day)) || SERBIAN_LESSONS_DATA[0]
    );
  }, [progressMap.serbian]);

  // Dynamic Course Progress Percentages
  const srCompletedCount = progressMap.serbian?.completedDays?.length || 0;
  const srProgressPct = Math.round((srCompletedCount / SERBIAN_LESSONS_DATA.length) * 100);

  const enCompletedCount = progressMap.english?.completedDays?.length || 1;
  const enProgressPct = Math.min(100, Math.round((enCompletedCount / 12) * 100));

  const esCompletedCount = progressMap.spanish?.completedDays?.length || 0;
  const esProgressPct = Math.round((esCompletedCount / SPANISH_LESSONS_DATA.length) * 100);

  const zhCompletedCount = progressMap.chinese?.completedDays?.length || 0;
  const zhProgressPct = Math.round((zhCompletedCount / CHINESE_LESSONS_DATA.length) * 100);

  // Dynamic Achievements List
  const achievements = useMemo(() => {
    const totalXp = (progressMap.serbian?.xp || 0) + (progressMap.english?.xp || 0) + (progressMap.spanish?.xp || 0);
    const totalCompleted = srCompletedCount + esCompletedCount + zhCompletedCount;
    const hasSpeaking = (progressMap.serbian?.conversationMinutes || 0) > 0 || (progressMap.english?.conversationMinutes || 0) > 0;
    const hasQuiz = (progressMap.serbian?.completedQuizzesCount || 0) > 0 || dashboardQuizScore > 0;

    return [
      {
        id: 'badge-1',
        title: 'Beginner Learner',
        titleBn: 'প্রাথমিক শিক্ষার্থী',
        desc: 'Completed at least 1 lesson',
        icon: '🌟',
        color: 'from-amber-400 to-yellow-500',
        unlocked: totalCompleted >= 1,
      },
      {
        id: 'badge-2',
        title: 'Speaking Star',
        titleBn: 'স্পিকিং স্টার',
        desc: 'Completed speaking practice',
        icon: '🎙️',
        color: 'from-rose-500 to-pink-600',
        unlocked: hasSpeaking || isSpeakingStudioRecording,
      },
      {
        id: 'badge-3',
        title: 'Quiz Champion',
        titleBn: 'কুইজ চ্যাম্পিয়ন',
        desc: 'Scored in language quizzes',
        icon: '🏆',
        color: 'from-blue-500 to-indigo-600',
        unlocked: hasQuiz,
      },
      {
        id: 'badge-4',
        title: 'Language Explorer',
        titleBn: 'ভাষার অন্বেষক',
        desc: 'Access to Serbian, English & Spanish',
        icon: '🧭',
        color: 'from-emerald-400 to-teal-600',
        unlocked: availableLanguages.length >= 2,
      },
      {
        id: 'badge-5',
        title: 'Daily Streak',
        titleBn: 'দৈনিক স্ট্রিক',
        desc: 'Active learning streak maintained',
        icon: '🔥',
        color: 'from-orange-500 to-red-600',
        unlocked: (progressMap.serbian?.streak || 1) >= 1,
      },
      {
        id: 'badge-6',
        title: 'Polyglot',
        titleBn: 'বহুভাষী প্রতিভাবান',
        desc: 'Earned 100+ XP across languages',
        icon: '👑',
        color: 'from-purple-500 to-violet-700',
        unlocked: totalXp >= 100,
      },
    ];
  }, [progressMap, srCompletedCount, esCompletedCount, zhCompletedCount, dashboardQuizScore, availableLanguages.length, isSpeakingStudioRecording]);

  // Real Dynamic Learning History
  const historyEntries = useMemo(() => {
    const list: any[] = [];
    const srCompleted = progressMap.serbian?.completedDays || [];
    srCompleted.forEach((dayNum) => {
      const lesson = SERBIAN_LESSONS_DATA.find((l) => l.day === dayNum);
      list.push({
        id: `h-sr-${dayNum}`,
        course: 'Serbian (Српски)',
        flag: '🇷🇸',
        lesson: `Lesson ${dayNum}: ${lesson?.title || 'Lesson ' + dayNum}`,
        score: '100%',
        xp: `+${lesson?.xpReward || 35} XP`,
        date: `Day ${dayNum} Activity`,
        status: 'Completed',
      });
    });

    const esCompleted = progressMap.spanish?.completedDays || [];
    esCompleted.forEach((dayNum) => {
      const lesson = SPANISH_LESSONS_DATA.find((l) => l.day === dayNum);
      list.push({
        id: `h-es-${dayNum}`,
        course: 'Spanish (Español)',
        flag: '🇪🇸',
        lesson: `Lesson ${dayNum}: ${lesson?.title || 'Lesson ' + dayNum}`,
        score: '100%',
        xp: `+${lesson?.xpReward || 35} XP`,
        date: `Day ${dayNum} Activity`,
        status: 'Completed',
      });
    });

    if (list.length === 0) {
      list.push({
        id: 'h-sr-welcome',
        course: 'Serbian (Српски)',
        flag: '🇷🇸',
        lesson: 'Lesson 1: Serbian Alphabet (Cyrillic and Latin)',
        score: 'Next Up',
        xp: '+35 XP',
        date: 'Day 1 Ready',
        status: 'In Progress',
      });
    }

    return list;
  }, [progressMap.serbian?.completedDays, progressMap.spanish?.completedDays]);

  return (
    <div className="space-y-6">
      {/* 3D Glassmorphism Hero Banner (Matches User Mockup) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 p-6 md:p-8 text-white shadow-2xl border border-white/15">
        {/* Glowing 3D Glass Orbs & Depth Elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-black tracking-wide text-cyan-200 shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Your Global Language Partner • বিশ্বমানের ভাষা শিক্ষা</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Learning Center</span>
            </h1>

            <p className="text-sm md:text-base text-cyan-100/90 font-medium leading-relaxed">
              Learn • Practice • Speak • Grow. আন্তর্জাতিক বায়ার প্রেজেন্টেশন, সাপ্লায়ার নেগোশিয়েশন ও সার্বিয়ান ভাষা শেখার প্রিমিয়াম 3D প্ল্যাটফর্ম।
            </p>

            {/* 3D Stats Counter Pill Box */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300 shadow-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>12 Courses</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-orange-300 shadow-sm">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>45 Day Streak</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-300 shadow-sm">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>85% Progress</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                activeTab === 'home'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>ড্যাশবোর্ড</span>
            </button>

            {/* Serbian Course Button with NEW badge */}
            <button
              onClick={() => setActiveTab('serbian')}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-md relative ${
                activeTab === 'serbian'
                  ? 'bg-rose-600 text-white shadow-rose-600/30'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
            >
              <span>🇷🇸</span>
              <span>Serbian (Српски)</span>
              <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-[10px] font-black uppercase text-white">
                New
              </span>
            </button>

            {/* Other Authorized Languages */}
            {availableLanguages
              .filter((l) => l.code !== 'serbian')
              .map((lang) => {
                const isActive = activeTab === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setActiveTab(lang.code)}
                    className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-violet-600/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                );
              })}

            {/* Admin Access Button */}
            {isAdminOrMD && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-amber-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>অ্যাক্সেস কন্ট্রোল</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: HOME DASHBOARD (Organized into 9 Sections) */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Sub-Navigation Bar */}
          <div className="flex bg-white dark:bg-gray-800 p-2 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto scrollbar-none gap-1.5">
            {[
              { id: 'courses', label: 'My Courses', icon: BookOpen },
              { id: 'continue', label: 'Continue Learning', icon: ArrowRight },
              { id: 'practice', label: 'Daily Practice', icon: Flame },
              { id: 'vocabulary', label: 'Vocabulary', icon: Languages },
              { id: 'speaking', label: 'Speaking Practice', icon: Mic },
              { id: 'grammar', label: 'Grammar', icon: Layers },
              { id: 'quizzes', label: 'Quizzes', icon: ShieldCheck },
              { id: 'achievements', label: 'Achievements', icon: Trophy },
              { id: 'history', label: 'Learning History', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as DashboardSection)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SECTION 1: MY COURSES */}
          {activeSection === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span>My Courses (কোর্স সমূহ)</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    আপনার অনুমোদিত কোর্স মডিউলগুলো বেছে নিয়ে চর্চা চালিয়ে যান
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Serbian Course 3D Card (Highlighted) */}
                <div
                  onClick={() => setActiveTab('serbian')}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-rose-700 p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-white/20 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                      🇷🇸
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md animate-pulse">
                      New Course
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-white flex items-center gap-2">
                      <span>Serbian</span>
                      <span className="text-lg text-rose-200 font-serif">Српски</span>
                    </h4>
                    <p className="text-xs text-blue-100/90 font-medium">
                      Speak Serbian with Confidence! বর্ণমালা, শব্দ ও ১২টি পূর্ণাঙ্গ পাঠ।
                    </p>
                  </div>

                  {/* Progress stats */}
                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-100">অগ্রগতি (Progress)</span>
                      <span className="text-white">{srProgressPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.max(5, srProgressPct)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-blue-100">
                    <span>{srCompletedCount} / 12 Lessons Completed</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 2. English Course 3D Card */}
                <div
                  onClick={() => setActiveTab('english')}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                      🇬🇧
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-violet-400/30 text-white text-[10px] font-black uppercase tracking-wider">
                      Active
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-white">English</h4>
                    <p className="text-xs text-purple-100/90 font-medium">
                      Learn & Speak. অফিস ইমেইল, মিটিং ও আন্তর্জাতিক বায়ার প্রেজেন্টেশন।
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-purple-100">অগ্রগতি</span>
                      <span className="text-white">{enProgressPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.max(5, enProgressPct)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-purple-100">
                    <span>{enCompletedCount} / 12 Lessons • Corporate Pro</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                      Continue <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 3. Spanish Course 3D Card */}
                <div
                  onClick={() => isAuthorizedForLanguage('spanish') && setActiveTab('spanish')}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                      🇪🇸
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                      Español
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-white">Spanish</h4>
                    <p className="text-xs text-amber-100/90 font-medium">
                      Habla Español. বেসিক স্প্যানিশ, উচ্চারণ ও দৈনন্দিন বিজনেস কথপোকথন।
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-100">অগ্রগতি</span>
                      <span className="text-white">{esProgressPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-amber-300 rounded-full" style={{ width: `${Math.max(5, esProgressPct)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-amber-100">
                    <span>{esCompletedCount} / 10 Lessons • Daily</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                      Practice <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 4. Chinese Course 3D Card */}
                <div
                  onClick={() => isAuthorizedForLanguage('chinese') && setActiveTab('chinese')}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-red-800 p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                      🇨🇳
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                      中文
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-white">Chinese (Mandarin)</h4>
                    <p className="text-xs text-rose-100/90 font-medium">
                      চায়না সাপ্লায়ার ও ফ্যাক্টরি নেগোশিয়েশন ও পিনয়িন স্পিকিং।
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-100">অগ্রগতি</span>
                      <span className="text-white">{zhProgressPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(5, zhProgressPct)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-rose-100">
                    <span>{zhCompletedCount} / 12 Lessons • Supplier Track</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                      Explore <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 5. French Course Preview */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-blue-800 p-6 text-white shadow-md border border-white/10 opacity-90">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner">
                      🇫🇷
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase text-white">
                      Coming Soon
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-white">French</h4>
                  <p className="text-xs text-sky-100/90 mt-1">Apprendre le français. ইউরোপীয় ফ্যাশন ও টেক্সটাইল ফ্রেঞ্চ।</p>
                </div>

                {/* 6. German Course Preview */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 to-gray-900 p-6 text-white shadow-md border border-white/10 opacity-90">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner">
                      🇩🇪
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase text-white">
                      Coming Soon
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-white">German</h4>
                  <p className="text-xs text-slate-300 mt-1">Deutsch lernen. আন্তর্জাতিক কোয়ালিটি অডিট ও ট্রেড ডয়চে।</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: CONTINUE LEARNING */}
          {activeSection === 'continue' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-emerald-500" />
                <span>Continue Where You Left Off (যেখানে থেমেছিলেন সেখান থেকে শুরু করুন)</span>
              </h3>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 border border-blue-100 dark:border-gray-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🇷🇸</span>
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Next Up in Serbian
                    </span>
                    <h4 className="text-base font-black text-gray-900 dark:text-white">
                      Lesson {nextSerbianLesson.day}: {nextSerbianLesson.title} ({nextSerbianLesson.titleBn})
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {nextSerbianLesson.objectiveBn}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('serbian')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95 shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Lesson {nextSerbianLesson.day}</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: DAILY PRACTICE */}
          {activeSection === 'practice' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span>Daily 5-Minute Practice (দৈনিক ৫ মিনিটের চর্চা)</span>
                </h3>
                <span className="text-xs bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full">
                  🔥 45 Day Streak
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 space-y-2">
                  <span className="text-xs font-bold text-rose-500 block">🇷🇸 Serbian Phrase</span>
                  <p className="text-lg font-black text-gray-900 dark:text-white">Како си данас?</p>
                  <p className="text-xs text-blue-600 font-bold">Kako si danas? (কেমন আছো আজ?)</p>
                  <button
                    onClick={() => playSampleAudio('Kako si danas?')}
                    className="text-xs text-gray-600 hover:text-blue-600 font-bold flex items-center gap-1 pt-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 space-y-2">
                  <span className="text-xs font-bold text-blue-500 block">🇬🇧 English Corporate</span>
                  <p className="text-lg font-black text-gray-900 dark:text-white">Could you please update the schedule?</p>
                  <p className="text-xs text-violet-600 font-bold">অনুগ্রহ করে সময়সূচীটি আপডেট করবেন কি?</p>
                  <button
                    onClick={() => playSampleAudio('Could you please update the schedule?', 'en-US')}
                    className="text-xs text-gray-600 hover:text-violet-600 font-bold flex items-center gap-1 pt-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 space-y-2">
                  <span className="text-xs font-bold text-amber-500 block">🇪🇸 Spanish Daily</span>
                  <p className="text-lg font-black text-gray-900 dark:text-white">Mucho gusto en conocerte.</p>
                  <p className="text-xs text-amber-600 font-bold">আপনার সাথে পরিচিত হয়ে খুব ভালো লাগলো।</p>
                  <button
                    onClick={() => playSampleAudio('Mucho gusto en conocerte.', 'es-ES')}
                    className="text-xs text-gray-600 hover:text-amber-600 font-bold flex items-center gap-1 pt-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: VOCABULARY */}
          {activeSection === 'vocabulary' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Languages className="w-5 h-5 text-indigo-500" />
                <span>Vocabulary Bank (শব্দকোষ সংগ্রহ)</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                সার্বিয়ান, ইংরেজি ও স্প্যানিশ ভাষার অতিপ্রয়োজনীয় শব্দমালা
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {[
                  { word: 'Здраво (Zdravo)', meaning: 'হ্যালো / Hello', lang: '🇷🇸 Serbian' },
                  { word: 'Хвала (Hvala)', meaning: 'ধন্যবাদ / Thanks', lang: '🇷🇸 Serbian' },
                  { word: 'Молим (Molim)', meaning: 'দয়া করে / Please', lang: '🇷🇸 Serbian' },
                  { word: 'Рачун (Račun)', meaning: 'বিল / Check', lang: '🇷🇸 Serbian' },
                  { word: 'Уговор (Ugovor)', meaning: 'চুক্তি / Contract', lang: '🇷🇸 Serbian' },
                  { word: 'Negotiation', meaning: 'দরকষাকষি', lang: '🇬🇧 English' },
                  { word: 'Specification', meaning: 'পণ্যের বিবরণী', lang: '🇬🇧 English' },
                  { word: 'Gracias', meaning: 'ধন্যবাদ', lang: '🇪🇸 Spanish' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{item.lang}</span>
                      <p className="text-sm font-black text-gray-900 dark:text-white">{item.word}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.meaning}</p>
                    </div>
                    <button
                      onClick={() => playSampleAudio(item.word.split('(')[0].trim())}
                      className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: SPEAKING PRACTICE (Interactive 3D Studio Microphone) */}
          {activeSection === 'speaking' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm text-center space-y-6">
              <div className="max-w-md mx-auto space-y-3">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase">
                  Interactive Speaking Studio
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                  Speak in Serbian
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  মাইক্রোফোনে ট্যাপ করে স্পষ্ট সার্বিয়ান উচ্চারণ বলুন
                </p>

                {/* Target Word Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 border border-blue-200 dark:border-gray-600 space-y-2 shadow-inner">
                  <h4 className="text-4xl font-black text-blue-700 dark:text-blue-300">Zdravo!</h4>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                    Здраво! (বাংলা: য্দ্রাভো / অর্থ: হ্যালো!)
                  </p>
                  <button
                    onClick={() => playSampleAudio('Zdravo!')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-900 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> শুনুন
                  </button>
                </div>

                {/* Interactive Studio Microphone Button */}
                <div className="pt-4">
                  <button
                    onClick={handleStartSpeakingStudio}
                    disabled={isSpeakingStudioRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 mx-auto ${
                      isSpeakingStudioRecording
                        ? 'bg-rose-500 ring-8 ring-rose-300 scale-105 animate-pulse'
                        : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-600 hover:scale-105 active:scale-95 shadow-blue-600/40'
                    }`}
                  >
                    <Mic className={`w-10 h-10 ${isSpeakingStudioRecording ? 'animate-bounce' : ''}`} />
                  </button>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-3">
                    {isSpeakingStudioRecording ? 'রেকর্ড হচ্ছে...' : 'Tap to Speak (কথা বলতে চাপুন)'}
                  </p>
                </div>

                {speakingStudioFeedback && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
                    {speakingStudioFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: GRAMMAR */}
          {activeSection === 'grammar' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                <span>Grammar Fundamentals (ব্যাকরণের মূল নিয়ম)</span>
              </h3>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 space-y-2">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">
                    ১. সার্বিয়ান ভাষার ফোনেটিক নীতি (Phonetic Principle)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    "Piši kao što govoriš, čitaj kako je napisano" — প্রতিটি বর্ণের একটি নির্দিষ্ট স্বতন্ত্র উচ্চারণ থাকে। ইংরেজি বা ফ্রেঞ্চের মতো কোনো অনুচ্চারিত সাইলেন্ট লেটার সার্বিয়ানে থাকে না।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 space-y-2">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">
                    ২. তিনটি লিঙ্গভেদ (Genders: Masculine, Feminine, Neuter)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    • <strong>পুংলিঙ্গ (Masculine)</strong>: ব্যঞ্জনবর্ণে শেষ হয় (যেমন: Grad - শহর)<br />
                    • <strong>স্ত্রীলিঙ্গ (Feminine)</strong>: "-a" তে শেষ হয় (যেমন: Kafa - কফি, Voda - পানি)<br />
                    • <strong>ক্লীবলিঙ্গ (Neuter)</strong>: "-o" বা "-e" তে শেষ হয় (যেমন: Selo - গ্রাম, Pismo - চিঠি)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 space-y-2">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">
                    ৩. প্রশ্নবোধক বাক্য গঠন (Questions with "Da li")
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    যেকোনো সাধারণ বাক্যের শুরুতে "Da li" যুক্ত করলেই তা প্রশ্নবোধক বাক্যে রূপ নেয়। যেমন: "Govorite srpski" (আপনি সার্বিয়ান বলেন) → "Da li govorite srpski?" (আপনি কি সার্বিয়ান বলেন?)।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: QUIZZES (Interactive Dashboard Quiz Time) */}
          {activeSection === 'quizzes' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                    Question {activeQuizQuestionIdx + 1} of {dashboardQuizList.length}
                  </span>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {dashboardQuizList[activeQuizQuestionIdx].q}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dashboardQuizList[activeQuizQuestionIdx].qBn}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-400 block">স্কোর</span>
                  <span className="text-lg font-black text-emerald-500">+{dashboardQuizScore} XP</span>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {dashboardQuizList[activeQuizQuestionIdx].options.map((opt) => {
                  const isSelected = selectedDashboardQuizAnswer === opt;
                  const isCorrect = opt === dashboardQuizList[activeQuizQuestionIdx].correct;

                  let style =
                    'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100';
                  if (isSelected) {
                    style = isCorrect
                      ? 'bg-emerald-500 text-white border-emerald-600 font-black shadow-md'
                      : 'bg-rose-500 text-white border-rose-600 font-bold';
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (selectedDashboardQuizAnswer) return;
                        setSelectedDashboardQuizAnswer(opt);
                        if (isCorrect) {
                          setDashboardQuizScore((s) => s + 10);
                        }
                      }}
                      className={`p-4 rounded-2xl border text-sm text-left transition font-medium flex items-center justify-between ${style}`}
                    >
                      <span>{opt}</span>
                      {isSelected && (
                        <span>{isCorrect ? '✓' : '✗'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {dashboardQuizFinished ? (
                <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl shadow-md">
                    🎉
                  </div>
                  <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                    অভিনন্দন! আপনি কুইজে +{dashboardQuizScore} XP অর্জন করেছেন!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    আপনার অর্জিত XP সার্বিয়ান অ্যাকাডেমিতে সংরক্ষিত হয়েছে।
                  </p>
                  <button
                    onClick={() => {
                      setActiveQuizQuestionIdx(0);
                      setSelectedDashboardQuizAnswer(null);
                      setDashboardQuizScore(0);
                      setDashboardQuizFinished(false);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                  >
                    আবার কুইজ দিন (Restart Quiz)
                  </button>
                </div>
              ) : selectedDashboardQuizAnswer && (
                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      if (activeQuizQuestionIdx < dashboardQuizList.length - 1) {
                        setActiveQuizQuestionIdx(activeQuizQuestionIdx + 1);
                        setSelectedDashboardQuizAnswer(null);
                      } else {
                        setDashboardQuizFinished(true);
                        awardDashboardXpToSerbian(dashboardQuizScore + 10);
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <span>{activeQuizQuestionIdx < dashboardQuizList.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 8: ACHIEVEMENTS (3D Golden Trophy & Badges) */}
          {activeSection === 'achievements' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              {/* Top Trophy Banner */}
              <div className="text-center p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/20 space-y-2">
                <span className="text-5xl block animate-bounce">🏆</span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">You're Awesome!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep learning and earn more badges! প্রতিদিন চর্চা করে নতুন ব্যাজ আনলক করুন।
                </p>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {achievements.map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-3xl text-center border transition-all duration-300 flex flex-col items-center justify-between space-y-2 ${
                      b.unlocked
                        ? 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-700/60 dark:to-gray-800 border-amber-200 dark:border-amber-800/60 shadow-md hover:-translate-y-1'
                        : 'bg-gray-100/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-50 grayscale'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner bg-gradient-to-tr ${b.color}`}
                    >
                      {b.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 dark:text-white">{b.title}</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{b.titleBn}</p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        b.unlocked
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {b.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 9: LEARNING HISTORY */}
          {activeSection === 'history' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span>Learning History (শেখার ইতিহাস)</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    আপনার সম্পন্ন করা লেসন ও অর্জিত পয়েন্টের বিস্তারিত লগ
                  </p>
                </div>

                <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>🎯 Daily Goal: Complete 1 more lesson today!</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {historyEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.flag}</span>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{item.course}</span>
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">{item.lesson}</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.date}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                        {item.xp}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">Score: {item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: SERBIAN ACADEMY */}
      {activeTab === 'serbian' && isAuthorizedForLanguage('serbian') && (
        <SerbianAcademyView
          currentUser={currentUser}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
          onBackToHome={() => setActiveTab('home')}
        />
      )}

      {/* VIEW: ENGLISH ACADEMY */}
      {activeTab === 'english' && isAuthorizedForLanguage('english') && (
        <EnglishAcademyView
          currentUser={currentUser}
          role={role}
          staffList={staffList}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
        />
      )}

      {/* VIEW: CHINESE ACADEMY */}
      {activeTab === 'chinese' && isAuthorizedForLanguage('chinese') && (
        <ChineseAcademyView
          currentUser={currentUser}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
        />
      )}

      {/* VIEW: SPANISH ACADEMY */}
      {activeTab === 'spanish' && isAuthorizedForLanguage('spanish') && (
        <SpanishAcademyView
          currentUser={currentUser}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
        />
      )}

      {/* VIEW: ADMIN / MD ACCESS CONTROL */}
      {activeTab === 'admin' && isAdminOrMD && (
        <AdminLearningAccessView
          staffList={staffList}
          setStaffList={setStaffList}
          globalSettings={globalSettings}
          onUpdateGlobalSettings={(newSettings) => {
            setGlobalSettings(newSettings);
            localStorage.setItem('learning_academy_global_settings', JSON.stringify(newSettings));
          }}
          userAccessMap={userAccessMap}
          onUpdateUserAccess={(staffId, langCode, grant) => {
            setUserAccessMap((prev) => ({
              ...prev,
              [staffId]: {
                ...(prev[staffId] || {}),
                [langCode]: grant,
              },
            }));
          }}
          auditLogs={auditLogs}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default LearningAcademyView;

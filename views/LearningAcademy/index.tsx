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
      {/* 3D Glassmorphism Hero Banner (Matches User 3D Reference) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0B192C] via-[#1E3A8A] to-[#4C1D95] p-6 md:p-8 text-white shadow-2xl border border-white/20">
        {/* Glowing 3D Glass Orbs & Depth Elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-400/25 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/25 rounded-full blur-3xl pointer-events-none animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-black tracking-wide text-cyan-200 shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Your Global Language Partner • বিশ্বমানের ভাষা শিক্ষা</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3 drop-shadow-sm">
              <span>Learning Center</span>
            </h1>

            <p className="text-sm md:text-base text-cyan-100/90 font-medium leading-relaxed">
              Learn • Practice • Speak • Grow. আন্তর্জাতিক বায়ার প্রেজেন্টেশন, সাপ্লায়ার নেগোশিয়েশন ও সার্বিয়ান ভাষা শেখার প্রিমিয়াম 3D প্ল্যাটফর্ম।
            </p>

            {/* 3D Stats Counter Pill Box with Floating Depth */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 text-xs font-black text-amber-300 shadow-lg shadow-black/10 hover:scale-105 transition-transform cursor-default">
                <Trophy className="w-4 h-4 text-amber-400 drop-shadow" />
                <span>12 Courses</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 text-xs font-black text-orange-300 shadow-lg shadow-black/10 hover:scale-105 transition-transform cursor-default">
                <Flame className="w-4 h-4 text-orange-400 drop-shadow" />
                <span>45 Day Streak</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 text-xs font-black text-emerald-300 shadow-lg shadow-black/10 hover:scale-105 transition-transform cursor-default">
                <Star className="w-4 h-4 text-yellow-400 drop-shadow" />
                <span>85% Progress</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons with Micro-interactions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 transition-all duration-200 active:scale-[0.96] shadow-md hover:brightness-105 ${
                activeTab === 'home'
                  ? 'bg-white text-slate-900 shadow-xl ring-2 ring-white/50'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>ড্যাশবোর্ড</span>
            </button>

            {/* Serbian Course Button with NEW badge */}
            <button
              onClick={() => setActiveTab('serbian')}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 transition-all duration-200 active:scale-[0.96] shadow-md relative hover:brightness-105 ${
                activeTab === 'serbian'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xl shadow-rose-600/40 ring-2 ring-rose-400/50'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md'
              }`}
            >
              <span className="text-base">🇷🇸</span>
              <span>Serbian (Српски)</span>
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-[10px] font-black uppercase text-white shadow-xs">
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
                    className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all duration-200 active:scale-[0.96] shadow-md hover:brightness-105 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-600/40 ring-2 ring-violet-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                );
              })}

            {/* Admin Access Button */}
            {isAdminOrMD && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all duration-200 active:scale-[0.96] shadow-md hover:brightness-105 ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-xl shadow-amber-600/40 ring-2 ring-amber-400/50'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
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
          {/* Horizontal Sub-Navigation Bar with Glassmorphic Backdrop */}
          <div className="flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-blue-950/5 overflow-x-auto scrollbar-none gap-1.5">
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
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all duration-200 active:scale-[0.96] ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
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
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#BE123C] p-6 text-white shadow-xl shadow-blue-950/20 hover:shadow-2xl hover:shadow-rose-500/25 transition-all duration-300 hover:-translate-y-1.5 border border-white/25 active:scale-[0.98]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      🇷🇸
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-rose-600/40 animate-pulse">
                      New Course
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h4 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-xs">
                      <span>Serbian</span>
                      <span className="text-lg text-rose-200 font-serif">Српски</span>
                    </h4>
                    <p className="text-xs text-blue-100/95 font-medium leading-relaxed">
                      Speak Serbian with Confidence! বর্ণমালা, শব্দ ও ১২টি পূর্ণাঙ্গ পাঠ।
                    </p>
                  </div>

                  {/* Progress stats with animated shimmer */}
                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2 relative z-10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-100">অগ্রগতি (Progress)</span>
                      <span className="text-white font-black">{srProgressPct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/25 overflow-hidden p-0.5 border border-white/15">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full relative overflow-hidden transition-all duration-700"
                        style={{ width: `${Math.max(6, srProgressPct)}%` }}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-blue-100 relative z-10">
                    <span className="text-emerald-300 font-black">{srCompletedCount} / 12 Lessons Completed</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 group-hover:bg-white group-hover:text-slate-900 transition-all font-black text-white shadow-xs">
                      Start <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* 2. English Course 3D Card */}
                <div
                  onClick={() => setActiveTab('english')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3B0764] via-[#6D28D9] to-[#1E3A8A] p-6 text-white shadow-xl shadow-purple-950/20 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-1.5 border border-white/25 active:scale-[0.98]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      🇬🇧
                    </div>
                    <span className="px-3 py-1 rounded-full bg-violet-400/30 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20">
                      Active
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h4 className="text-2xl font-black text-white drop-shadow-xs">English</h4>
                    <p className="text-xs text-purple-100/95 font-medium leading-relaxed">
                      Learn & Speak. অফিস ইমেইল, মিটিং ও আন্তর্জাতিক বায়ার প্রেজেন্টেশন।
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2 relative z-10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-purple-100">অগ্রগতি</span>
                      <span className="text-white font-black">{enProgressPct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/25 overflow-hidden p-0.5 border border-white/15">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full relative overflow-hidden transition-all duration-700"
                        style={{ width: `${Math.max(6, enProgressPct)}%` }}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-purple-100 relative z-10">
                    <span className="text-cyan-200 font-black">{enCompletedCount} / 12 Lessons • Pro</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 group-hover:bg-white group-hover:text-slate-900 transition-all font-black text-white shadow-xs">
                      Continue <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* 3. Spanish Course 3D Card */}
                <div
                  onClick={() => isAuthorizedForLanguage('spanish') && setActiveTab('spanish')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#7C2D12] via-[#EA580C] to-[#C2410C] p-6 text-white shadow-xl shadow-orange-950/20 hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:-translate-y-1.5 border border-white/25 active:scale-[0.98]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      🇪🇸
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20">
                      Español
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h4 className="text-2xl font-black text-white drop-shadow-xs">Spanish</h4>
                    <p className="text-xs text-amber-100/95 font-medium leading-relaxed">
                      Habla Español. বেসিক স্প্যানিশ, উচ্চারণ ও দৈনন্দিন বিজনেস কথপোকথন।
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2 relative z-10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-100">অগ্রগতি</span>
                      <span className="text-white font-black">{esProgressPct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/25 overflow-hidden p-0.5 border border-white/15">
                      <div
                        className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full relative overflow-hidden transition-all duration-700"
                        style={{ width: `${Math.max(6, esProgressPct)}%` }}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-amber-100 relative z-10">
                    <span className="text-yellow-300 font-black">{esCompletedCount} / 10 Lessons • Daily</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 group-hover:bg-white group-hover:text-slate-900 transition-all font-black text-white shadow-xs">
                      Practice <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* 4. Chinese Course 3D Card */}
                <div
                  onClick={() => isAuthorizedForLanguage('chinese') && setActiveTab('chinese')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#881337] via-[#BE123C] to-[#991B1B] p-6 text-white shadow-xl shadow-red-950/20 hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 hover:-translate-y-1.5 border border-white/25 active:scale-[0.98]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      🇨🇳
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20">
                      中文
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h4 className="text-2xl font-black text-white drop-shadow-xs">Chinese (Mandarin)</h4>
                    <p className="text-xs text-rose-100/95 font-medium leading-relaxed">
                      চায়না সাপ্লায়ার ও ফ্যাক্টরি নেগোশিয়েশন ও পিনয়িন স্পিকিং।
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2 relative z-10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-100">অগ্রগতি</span>
                      <span className="text-white font-black">{zhProgressPct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/25 overflow-hidden p-0.5 border border-white/15">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full relative overflow-hidden transition-all duration-700"
                        style={{ width: `${Math.max(6, zhProgressPct)}%` }}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-rose-100 relative z-10">
                    <span className="text-amber-200 font-black">{zhCompletedCount} / 12 Lessons • Track</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 group-hover:bg-white group-hover:text-slate-900 transition-all font-black text-white shadow-xs">
                      Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* 5. French Course Preview */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0C4A6E] via-[#0284C7] to-[#1E3A8A] p-6 text-white shadow-lg border border-white/20 opacity-90 hover:opacity-100 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                      🇫🇷
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase text-white backdrop-blur-md border border-white/20">
                      Coming Soon
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-white">French</h4>
                  <p className="text-xs text-sky-100/90 mt-1">Apprendre le français. ইউরোপীয় ফ্যাশন ও টেক্সটাইল ফ্রেঞ্চ।</p>
                </div>

                {/* 6. German Course Preview */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1E293B] via-[#334155] to-[#0F172A] p-6 text-white shadow-lg border border-white/20 opacity-90 hover:opacity-100 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                      🇩🇪
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase text-white backdrop-blur-md border border-white/20">
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
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-emerald-500" />
                <span>Continue Where You Left Off (যেখানে থেমেছিলেন সেখান থেকে শুরু করুন)</span>
              </h3>

              <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border border-white/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner animate-float">
                    🇷🇸
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 text-[10px] font-black uppercase tracking-wider mb-1 backdrop-blur-md border border-cyan-400/30">
                      Next Up in Serbian
                    </span>
                    <h4 className="text-lg font-black text-white drop-shadow-xs">
                      Lesson {nextSerbianLesson.day}: {nextSerbianLesson.title} ({nextSerbianLesson.titleBn})
                    </h4>
                    <p className="text-xs text-blue-100/80 font-medium mt-0.5">
                      {nextSerbianLesson.objectiveBn}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('serbian')}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] shrink-0 relative z-10"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Lesson {nextSerbianLesson.day}</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: DAILY PRACTICE */}
          {activeSection === 'practice' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span>Daily 5-Minute Practice (দৈনিক ৫ মিনিটের চর্চা)</span>
                </h3>
                <span className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white font-black px-3.5 py-1.5 rounded-full shadow-md shadow-orange-500/20">
                  🔥 45 Day Streak
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-500 uppercase tracking-wide">🇷🇸 Serbian Phrase</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">Daily Drill</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">Како си данас?</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">Kako si danas? (কেমন আছো আজ?)</p>
                  <button
                    onClick={() => playSampleAudio('Kako si danas?')}
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 font-bold inline-flex items-center gap-1.5 pt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-500" /> Listen
                  </button>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-red-500 uppercase tracking-wide">🇨🇳 Chinese Daily</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold">WeChat Pro</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">今天工作顺利吗？</p>
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold">Jīntiān gōngzuò shùnlì ma? (আজকের কাজ কেমন চলছে?)</p>
                  <button
                    onClick={() => playSampleAudio('今天工作顺利吗？', 'zh-CN')}
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-red-600 font-bold inline-flex items-center gap-1.5 pt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-red-500" /> Listen
                  </button>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-500 uppercase tracking-wide">🇬🇧 English Corporate</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">Meeting Pro</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">Could you please update the schedule?</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-bold">অনুগ্রহ করে সময়সূচীটি আপডেট করবেন কি?</p>
                  <button
                    onClick={() => playSampleAudio('Could you please update the schedule?', 'en-US')}
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-violet-600 font-bold inline-flex items-center gap-1.5 pt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-violet-500" /> Listen
                  </button>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-500 uppercase tracking-wide">🇪🇸 Spanish Daily</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">Conversation</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">Mucho gusto en conocerte.</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">আপনার সাথে পরিচিত হয়ে খুব ভালো লাগলো।</p>
                  <button
                    onClick={() => playSampleAudio('Mucho gusto en conocerte.', 'es-ES')}
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-amber-600 font-bold inline-flex items-center gap-1.5 pt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Listen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: VOCABULARY */}
          {activeSection === 'vocabulary' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Languages className="w-5 h-5 text-indigo-500" />
                <span>Vocabulary Bank (শব্দকোষ সংগ্রহ)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                সার্বিয়ান, চাইনিজ, ইংরেজি ও স্প্যানিশ ভাষার অতিপ্রয়োজনীয় শব্দমালা
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
                {[
                  { word: 'Здраво (Zdravo)', meaning: 'হ্যালো / Hello', lang: '🇷🇸 Serbian', code: 'sr-RS' },
                  { word: 'Хвала (Hvala)', meaning: 'ধন্যবাদ / Thanks', lang: '🇷🇸 Serbian', code: 'sr-RS' },
                  { word: '你好 (Nǐ hǎo)', meaning: 'হ্যালো / কেমন আছেন', lang: '🇨🇳 Chinese', code: 'zh-CN' },
                  { word: '谢谢 (Xièxie)', meaning: 'ধন্যবাদ / Thanks', lang: '🇨🇳 Chinese', code: 'zh-CN' },
                  { word: 'Negotiation', meaning: 'দরকষাকষি', lang: '🇬🇧 English', code: 'en-US' },
                  { word: 'Specification', meaning: 'পণ্যের বিবরণী', lang: '🇬🇧 English', code: 'en-US' },
                  { word: 'Mucho gusto', meaning: 'পরিচিত হয়ে আনন্দিত', lang: '🇪🇸 Spanish', code: 'es-ES' },
                  { word: 'Muchas gracias', meaning: 'অনেক ধন্যবাদ', lang: '🇪🇸 Spanish', code: 'es-ES' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 hover:-translate-y-0.5 shadow-xs"
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.lang}</span>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{item.word}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.meaning}</p>
                    </div>
                    <button
                      onClick={() => playSampleAudio(item.word.split('(')[0].trim(), item.code)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition active:scale-95"
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
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 text-center space-y-6">
              <div className="max-w-md mx-auto space-y-4">
                <span className="px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                  Interactive Speaking Studio
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                  Speak in Serbian
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  মাইক্রোফোনে ট্যাপ করে স্পষ্ট সার্বিয়ান উচ্চারণ বলুন
                </p>

                {/* Target Word Card with 3D Depth */}
                <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white border border-white/20 space-y-3 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="text-4xl md:text-5xl font-black text-cyan-300 tracking-tight drop-shadow-md">
                    Zdravo!
                  </h4>
                  <p className="text-sm font-bold text-blue-100/90">
                    Здраво! (বাংলা: য্দ্রাভো / অর্থ: হ্যালো!)
                  </p>
                  <button
                    onClick={() => playSampleAudio('Zdravo!')}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-black text-white shadow-md border border-white/25 transition active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> শুনুন
                  </button>

                  {/* Audio Equalizer Waveform Indicator */}
                  <div className="flex items-center justify-center gap-1 pt-2">
                    {[12, 24, 18, 30, 22, 14, 28, 16, 26, 12].map((height, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          isSpeakingStudioRecording
                            ? 'bg-rose-400 animate-pulse'
                            : 'bg-cyan-400/60'
                        }`}
                        style={{ height: `${height}px` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Interactive Studio Microphone Button with Multi-Ring Pulse */}
                <div className="pt-2">
                  <div className="relative inline-block">
                    {isSpeakingStudioRecording && (
                      <>
                        <div className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
                        <div className="absolute -inset-2 rounded-full bg-rose-500/30 animate-pulse pointer-events-none" />
                      </>
                    )}
                    <button
                      onClick={handleStartSpeakingStudio}
                      disabled={isSpeakingStudioRecording}
                      className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 mx-auto ${
                        isSpeakingStudioRecording
                          ? 'bg-rose-500 ring-8 ring-rose-300 scale-105 animate-pulse'
                          : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-600 hover:scale-105 active:scale-95 shadow-blue-600/40 ring-4 ring-blue-500/20'
                      }`}
                    >
                      <Mic className={`w-10 h-10 ${isSpeakingStudioRecording ? 'animate-bounce' : ''}`} />
                    </button>
                  </div>
                  <p className="text-xs font-black text-slate-500 dark:text-slate-400 mt-3">
                    {isSpeakingStudioRecording ? '🎙️ শুনছি... স্পষ্ট করে বলুন!' : 'Tap to Speak (কথা বলতে চাপুন)'}
                  </p>
                </div>

                {speakingStudioFeedback && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black shadow-sm animate-in fade-in">
                    {speakingStudioFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: GRAMMAR */}
          {activeSection === 'grammar' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                <span>Grammar Fundamentals (ব্যাকরণের মূল নিয়ম)</span>
              </h3>

              <div className="space-y-3.5 pt-2">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-black">১</span>
                    <span>সার্বিয়ান ভাষার ফোনেটিক নীতি (Phonetic Principle)</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    "Piši kao što govoriš, čitaj kako je napisano" — প্রতিটি বর্ণের একটি নির্দিষ্ট স্বতন্ত্র উচ্চারণ থাকে। ইংরেজি বা ফ্রেঞ্চের মতো কোনো অনুচ্চারিত সাইলেন্ট লেটার সার্বিয়ানে থাকে না।
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-black">২</span>
                    <span>তিনটি লিঙ্গভেদ (Genders: Masculine, Feminine, Neuter)</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    • <strong>পুংলিঙ্গ (Masculine)</strong>: ব্যঞ্জনবর্ণে শেষ হয় (যেমন: Grad - শহর)<br />
                    • <strong>স্ত্রীলিঙ্গ (Feminine)</strong>: "-a" তে শেষ হয় (যেমন: Kafa - কফি, Voda - পানি)<br />
                    • <strong>ক্লীবলিঙ্গ (Neuter)</strong>: "-o" বা "-e" তে শেষ হয় (যেমন: Selo - গ্রাম, Pismo - চিঠি)
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-black">৩</span>
                    <span>প্রশ্নবোধক বাক্য গঠন (Questions with "Da li")</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    যেকোনো সাধারণ বাক্যের শুরুতে "Da li" যুক্ত করলেই তা প্রশ্নবোধক বাক্যে রূপ নেয়। যেমন: "Govorite srpski" (আপনি সার্বিয়ান বলেন) → "Da li govorite srpski?" (আপনি কি সার্বিয়ান বলেন?)।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: QUIZZES (Interactive Dashboard Quiz Time) */}
          {activeSection === 'quizzes' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider mb-2">
                    Question {activeQuizQuestionIdx + 1} of {dashboardQuizList.length}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                    {dashboardQuizList[activeQuizQuestionIdx].q}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {dashboardQuizList[activeQuizQuestionIdx].qBn}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block">স্কোর</span>
                  <span className="text-lg font-black text-emerald-500">+{dashboardQuizScore} XP</span>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {dashboardQuizList[activeQuizQuestionIdx].options.map((opt) => {
                  const isSelected = selectedDashboardQuizAnswer === opt;
                  const isCorrect = opt === dashboardQuizList[activeQuizQuestionIdx].correct;

                  let style =
                    'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-blue-400 hover:bg-slate-100/80';
                  if (isSelected) {
                    style = isCorrect
                      ? 'bg-emerald-500 text-white border-emerald-600 font-black shadow-lg shadow-emerald-500/30'
                      : 'bg-rose-500 text-white border-rose-600 font-bold shadow-lg shadow-rose-500/30';
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
                      className={`p-4 rounded-2xl border text-sm text-left transition-all duration-200 font-medium flex items-center justify-between active:scale-[0.98] ${style}`}
                    >
                      <span>{opt}</span>
                      {isSelected && (
                        <span className="text-base font-black">{isCorrect ? '✓' : '✗'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {dashboardQuizFinished ? (
                <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-300 dark:border-emerald-800 text-center space-y-3 shadow-md">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/30 animate-bounce">
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
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95"
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
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 active:scale-95"
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
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-6">
              {/* Top Trophy Banner with 3D Depth */}
              <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-amber-500/15 via-yellow-400/10 to-orange-500/15 border border-amber-400/30 space-y-3 relative overflow-hidden shadow-lg shadow-amber-500/10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-5xl shadow-xl shadow-amber-500/40 mx-auto animate-float">
                  🏆
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">You're Awesome!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
                  Keep learning and earn more badges! প্রতিদিন চর্চা করে নতুন ব্যাজ আনলক করুন।
                </p>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {achievements.map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-3xl text-center border transition-all duration-300 flex flex-col items-center justify-between space-y-2.5 ${
                      b.unlocked
                        ? 'bg-gradient-to-b from-white to-slate-50 dark:from-slate-800/80 dark:to-slate-900 border-amber-300 dark:border-amber-600/50 shadow-lg shadow-amber-500/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/20'
                        : 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-40 grayscale'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-gradient-to-tr ${b.color} ${
                        b.unlocked ? 'animate-float' : ''
                      }`}
                    >
                      {b.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">{b.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{b.titleBn}</p>
                    </div>
                    <span
                      className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${
                        b.unlocked
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                          : 'bg-slate-200 text-slate-500'
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
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span>Learning History (শেখার ইতিহাস)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    আপনার সম্পন্ন করা লেসন ও অর্জিত পয়েন্টের বিস্তারিত লগ
                  </p>
                </div>

                <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2 shadow-xs">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>🎯 Daily Goal: Complete 1 more lesson today!</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {historyEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-blue-400 transition-all duration-200 hover:-translate-y-0.5 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.flag}</span>
                      <div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.course}</span>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{item.lesson}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.date}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                        {item.xp}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Score: {item.score}</span>
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

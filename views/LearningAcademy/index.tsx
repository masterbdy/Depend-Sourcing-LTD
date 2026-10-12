import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { UserRole, Staff } from '../../types';
import { EnglishAcademyView } from '../EnglishAcademy';
import { ChineseAcademyView } from './chinese';
import { SpanishAcademyView } from './spanish';
import { AdminLearningAccessView } from './admin/AdminLearningAccessView';
import { LanguageDashboardCard } from './dashboard/LanguageDashboardCard';
import { SUPPORTED_LANGUAGES, DEFAULT_GLOBAL_SETTINGS, getLanguageConfig } from './core/languagesRegistry';
import {
  GlobalLearningSettings,
  LanguageAccessMap,
  LearningAuditLog,
  UserLanguageProgress
} from './core/types';
import { SPANISH_LESSONS_DATA } from './spanish/spanishLessonsData';
import { CHINESE_LESSONS_DATA } from './chinese/chineseLessonsData';
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

export const LearningAcademyView: React.FC<LearningAcademyViewProps> = ({
  currentUser,
  role,
  staffList = [],
  setStaffList,
  firebaseConfig,
  isCloudEnabled,
}) => {
  const isAdminOrMD = role === UserRole.ADMIN || role === UserRole.MD;

  // Active View Tab: 'home' | 'english' | 'chinese' | 'spanish' | 'admin'
  const [activeTab, setActiveTab] = useState<string>('home');

  // Identify current user's staff record
  const currentStaff = useMemo(() => {
    if (!currentUser) return null;
    return staffList.find((s) => s.name === currentUser);
  }, [currentUser, staffList]);

  // Safe user key
  const safeUserId = useMemo(() => {
    if (!currentUser) return 'guest_user';
    return currentUser.replace(/[.#$[\]]/g, '_').toLowerCase();
  }, [currentUser]);

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<GlobalLearningSettings>(() => {
    try {
      const saved = localStorage.getItem('learning_academy_global_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GLOBAL_SETTINGS;
  });

  // User Access Map: { [staffId]: { english: true, chinese: false, spanish: false } }
  const [userAccessMap, setUserAccessMap] = useState<Record<string, LanguageAccessMap>>(() => {
    try {
      const saved = localStorage.getItem('learning_academy_user_access_map');
      if (saved) return JSON.parse(saved);
    } catch {}

    // Initialize from staff list legacy fields
    const initial: Record<string, LanguageAccessMap> = {};
    staffList.forEach((s) => {
      initial[s.id] = {
        english: true,
        chinese: s.hasChineseAcademyAccess === true,
        spanish: false,
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

    // Load from individual storage if present
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
          streak: p.streak || 1,
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

      // Listen settings
      const settingsRef = ref(db, 'learning_academy/settings_v2');
      const unsubSettings = onValue(settingsRef, (snap) => {
        const val = snap.val();
        if (val) {
          setGlobalSettings(val);
          localStorage.setItem('learning_academy_global_settings', JSON.stringify(val));
        }
      });

      // Listen user access map
      const accessRef = ref(db, 'learning_academy/user_access');
      const unsubAccess = onValue(accessRef, (snap) => {
        const val = snap.val();
        if (val) {
          setUserAccessMap(val);
          localStorage.setItem('learning_academy_user_access_map', JSON.stringify(val));
        }
      });

      // Listen audit logs
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

  // Check if current user is authorized for a specific language
  const isAuthorizedForLanguage = useCallback(
    (langCode: string): boolean => {
      // 1. Admin/MD has universal access unless globally disabled
      if (isAdminOrMD) return true;

      const rule = globalSettings.languageAvailability[langCode];
      // 2. If globally disabled, normal staff cannot access
      if (rule?.disabledGlobally) return false;

      // 3. If enabled for everyone, user can access
      if (rule?.enabledForEveryone) return true;

      // 4. Default rules
      if (!currentStaff) {
        return langCode === 'english';
      }

      const userPerms = userAccessMap[currentStaff.id];
      if (userPerms && typeof userPerms[langCode] === 'boolean') {
        return userPerms[langCode];
      }

      // Legacy fallback for chinese
      if (langCode === 'chinese') {
        return currentStaff.hasChineseAcademyAccess === true;
      }

      // English defaults to true, Spanish and others default to false
      return langCode === 'english';
    },
    [isAdminOrMD, globalSettings, currentStaff, userAccessMap]
  );

  // Authorized languages list for current user
  const availableLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((lang) => isAuthorizedForLanguage(lang.code));
  }, [isAuthorizedForLanguage]);

  // Update Global Settings Helper + Audit Log
  const handleUpdateGlobalSettings = (newSettings: GlobalLearningSettings) => {
    setGlobalSettings(newSettings);
    localStorage.setItem('learning_academy_global_settings', JSON.stringify(newSettings));

    const auditEntry: LearningAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      performedBy: currentUser || 'Admin',
      action: 'UPDATE_SETTINGS',
      detailsBn: 'গ্লোবাল লার্নিং সেটিংস আপডেট করা হয়েছে।',
    };

    setAuditLogs((prev) => [auditEntry, ...prev]);

    if (firebaseConfig?.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        set(ref(db, 'learning_academy/settings_v2'), newSettings);
        push(ref(db, 'learning_academy/audit_logs'), auditEntry);
      } catch (e) {
        console.error('Failed to sync global settings:', e);
      }
    }
  };

  // Update User Language Access + Audit Log
  const handleUpdateUserAccess = (staffId: string, langCode: string, grant: boolean) => {
    if (!isAdminOrMD) return;

    const staffMember = staffList.find((s) => s.id === staffId);
    const targetName = staffMember ? staffMember.name : 'স্টাফ';
    const langObj = getLanguageConfig(langCode);

    setUserAccessMap((prev) => {
      const current = prev[staffId] || { english: true, chinese: false, spanish: false };
      const updated = {
        ...prev,
        [staffId]: {
          ...current,
          [langCode]: grant,
        },
      };
      localStorage.setItem('learning_academy_user_access_map', JSON.stringify(updated));

      if (firebaseConfig?.databaseURL) {
        try {
          const app = getApp();
          const db = getDatabase(app, firebaseConfig.databaseURL);
          set(ref(db, `learning_academy/user_access/${staffId}`), updated[staffId]);
        } catch {}
      }

      return updated;
    });

    // Also sync legacy field if chinese
    if (langCode === 'chinese' && setStaffList) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, hasChineseAcademyAccess: grant } : s))
      );
    }

    // Record in Audit Log
    const auditEntry: LearningAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      performedBy: currentUser || 'Admin',
      targetUser: targetName,
      targetUserId: staffId,
      action: grant ? 'GRANT_ACCESS' : 'REVOKE_ACCESS',
      languageCode: langCode,
      languageName: langObj.name,
      detailsBn: `${targetName}-এর জন্য ${langObj.name} একাডেমি অ্যাক্সেস ${
        grant ? 'মঞ্জুর (Grant)' : 'বাতিল (Revoke)'
      } করা হয়েছে।`,
    };

    setAuditLogs((prev) => [auditEntry, ...prev]);

    if (firebaseConfig?.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        push(ref(db, 'learning_academy/audit_logs'), auditEntry);
      } catch (e) {
        console.error('Audit log write error:', e);
      }
    }
  };

  // Ensure user cannot stay on unauthorized tab
  useEffect(() => {
    if (activeTab === 'admin' && !isAdminOrMD) {
      setActiveTab('home');
      return;
    }
    if (
      activeTab !== 'home' &&
      activeTab !== 'admin' &&
      !isAuthorizedForLanguage(activeTab)
    ) {
      setActiveTab('home');
    }
  }, [activeTab, isAdminOrMD, isAuthorizedForLanguage]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-xs font-bold text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>অফিস লার্নিং প্ল্যাটফর্ম • Multi-Language Academy</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>📚 Learning Academy</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            আন্তর্জাতিক যোগাযোগ, বায়ার প্রেজেন্টেশন ও সাপ্লায়ার নেগোশিয়েশন দক্ষতা বৃদ্ধির প্ল্যাটফর্ম।
          </p>
        </div>

        {/* Global Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Academy Home Dashboard */}
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xs ${
              activeTab === 'home'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>ড্যাশবোর্ড</span>
          </button>

          {/* Authorized Language Buttons */}
          {availableLanguages.map((lang) => {
            const isActive = activeTab === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setActiveTab(lang.code)}
                className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xs ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            );
          })}

          {/* Admin Access Control Button */}
          {isAdminOrMD && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xs ${
                activeTab === 'admin'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>লার্নিং অ্যাক্সেস</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: LEARNING ACADEMY HOME (Dashboard with authorized language cards) */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>আপনার অনুমোদিত কোর্স মডিউলসমূহ</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              যেকোনো ভাষার কার্ডে ট্যাপ করে সেখান থেকে সরাসরি প্রতিদিনের পড়া এগিয়ে নিন।
            </p>
          </div>

          {availableLanguages.length === 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-3xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                কোনো ল্যাঙ্গুয়েজ কোর্স অ্যাক্সেস সক্রিয় নেই
              </h3>
              <p className="text-xs text-gray-500">
                এডমিন বা ম্যানেজমেন্টের সাথে যোগাযোগ করে আপনার জন্য কোর্স অনুমোদন গ্রহণ করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableLanguages.map((lang) => {
                const prog = progressMap[lang.code] || {
                  userId: safeUserId,
                  languageCode: lang.code,
                  currentDay: 1,
                  completedDays: [],
                  xp: lang.code === 'english' ? 120 : 0,
                  streak: 1,
                  level: 'beginner',
                  lastActiveDate: new Date().toISOString().split('T')[0],
                  masteredWordIds: [],
                  conversationMinutes: 0,
                  completedQuizzesCount: 0,
                  correctAnswersCount: 0,
                  unlockedBadges: [],
                };

                const totalLessons =
                  lang.code === 'english'
                    ? 12
                    : lang.code === 'chinese'
                    ? CHINESE_LESSONS_DATA.length
                    : SPANISH_LESSONS_DATA.length;

                return (
                  <LanguageDashboardCard
                    key={lang.code}
                    langConfig={lang}
                    progress={prog}
                    totalLessons={totalLessons}
                    onContinue={() => setActiveTab(lang.code)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ENGLISH ACADEMY */}
      {activeTab === 'english' && isAuthorizedForLanguage('english') && (
        <EnglishAcademyView
          currentUser={currentUser}
          role={role}
          staffList={staffList}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
        />
      )}

      {/* VIEW 3: CHINESE ACADEMY */}
      {activeTab === 'chinese' && isAuthorizedForLanguage('chinese') && (
        <ChineseAcademyView
          currentUser={currentUser}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
        />
      )}

      {/* VIEW 4: SPANISH ACADEMY */}
      {activeTab === 'spanish' && isAuthorizedForLanguage('spanish') && (
        <SpanishAcademyView
          currentUser={currentUser}
          firebaseConfig={firebaseConfig}
          isCloudEnabled={isCloudEnabled}
        />
      )}

      {/* VIEW 5: ADMIN / MD LANGUAGE ACCESS CONTROL */}
      {activeTab === 'admin' && isAdminOrMD && (
        <AdminLearningAccessView
          staffList={staffList}
          setStaffList={setStaffList}
          globalSettings={globalSettings}
          onUpdateGlobalSettings={handleUpdateGlobalSettings}
          userAccessMap={userAccessMap}
          onUpdateUserAccess={handleUpdateUserAccess}
          auditLogs={auditLogs}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default LearningAcademyView;

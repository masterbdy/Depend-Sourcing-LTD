import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Power,
  Users,
  Sparkles,
  RotateCcw,
  History,
  Lock,
  Globe
} from 'lucide-react';
import { Staff } from '../../../types';
import { SUPPORTED_LANGUAGES } from '../core/languagesRegistry';
import { GlobalLearningSettings, LearningAuditLog, LanguageAccessMap } from '../core/types';

interface AdminLearningAccessViewProps {
  staffList: Staff[];
  setStaffList?: React.Dispatch<React.SetStateAction<Staff[]>>;
  globalSettings: GlobalLearningSettings;
  onUpdateGlobalSettings: (newSettings: GlobalLearningSettings) => void;
  userAccessMap: Record<string, LanguageAccessMap>;
  onUpdateUserAccess: (staffId: string, langCode: string, grant: boolean) => void;
  auditLogs: LearningAuditLog[];
  currentUser: string | null;
}

export const AdminLearningAccessView: React.FC<AdminLearningAccessViewProps> = ({
  staffList,
  setStaffList,
  globalSettings,
  onUpdateGlobalSettings,
  userAccessMap,
  onUpdateUserAccess,
  auditLogs,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLangFilter, setSelectedLangFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'granted' | 'revoked'>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'global' | 'audit'>('users');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Toggle global availability for all users
  const handleToggleEveryone = (langCode: string) => {
    const current = globalSettings.languageAvailability[langCode] || {
      enabledForEveryone: false,
      disabledGlobally: false,
    };
    const updated = {
      ...globalSettings,
      languageAvailability: {
        ...globalSettings.languageAvailability,
        [langCode]: {
          ...current,
          enabledForEveryone: !current.enabledForEveryone,
        },
      },
    };
    onUpdateGlobalSettings(updated);
    showNotification(
      `🌐 ${langCode.toUpperCase()}: ${
        !current.enabledForEveryone ? 'সকল স্টাফের জন্য উন্মুক্ত করা হয়েছে' : 'সবার জন্য উন্মুক্ততা বন্ধ করা হয়েছে'
      }`
    );
  };

  // Toggle global kill switch (disable completely)
  const handleToggleGloballyDisabled = (langCode: string) => {
    const current = globalSettings.languageAvailability[langCode] || {
      enabledForEveryone: false,
      disabledGlobally: false,
    };
    const updated = {
      ...globalSettings,
      languageAvailability: {
        ...globalSettings.languageAvailability,
        [langCode]: {
          ...current,
          disabledGlobally: !current.disabledGlobally,
        },
      },
    };
    onUpdateGlobalSettings(updated);
    showNotification(
      `⚠️ ${langCode.toUpperCase()}: ${
        !current.disabledGlobally ? 'সাময়িকভাবে বন্ধ করা হয়েছে' : 'পুনরায় সক্রিয় করা হয়েছে'
      }`
    );
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (s.status === 'DEACTIVATED' || s.isHardDeleted) return false;

      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.staffId && s.staffId.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedLangFilter !== 'all') {
        const hasAccess = !!userAccessMap[s.id]?.[selectedLangFilter];
        if (accessFilter === 'granted' && !hasAccess) return false;
        if (accessFilter === 'revoked' && hasAccess) return false;
      }

      return true;
    });
  }, [staffList, searchQuery, selectedLangFilter, accessFilter, userAccessMap]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Mode Switcher */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            লার্নিং এক্সেস কন্ট্রোল ও অডিট (Learning Access)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            প্রতিটি ভাষার অ্যাক্সেস পারমিশন, বৈশ্বিক সেটিংস এবং পরিবর্তনের অডিট লগ পর্যবেক্ষণ করুন।
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            স্টাফ পারমিশন ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'global'
                ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            গ্লোবাল রুলস
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            অডিট হিস্ট্রি ({auditLogs.length})
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-2xl animate-in fade-in flex items-center justify-between shadow-xs">
          <span>{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* TAB 1: USER PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-5">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="স্টাফের নাম, পদবি বা স্টাফ আইডি দিয়ে সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
              />
            </div>

            {/* Filter by Language */}
            <select
              value={selectedLangFilter}
              onChange={(e) => setSelectedLangFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="all">সকল ভাষা ফিল্টার</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>

            {selectedLangFilter !== 'all' && (
              <select
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value as any)}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="all">অনুমোদন স্ট্যাটাস: সকল</option>
                <option value="granted">অনুমোদিত (✅)</option>
                <option value="revoked">অনুমতিহীন (❌)</option>
              </select>
            )}
          </div>

          {/* User Cards / Rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                কোনো স্টাফ সদস্য খুঁজে পাওয়া যায়নি।
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const userAccess = userAccessMap[staff.id] || {
                  english: true,
                  chinese: staff.hasChineseAcademyAccess === true,
                  spanish: false,
                };

                return (
                  <div
                    key={staff.id}
                    className="p-4 md:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-black text-sm shrink-0">
                        {staff.photo ? (
                          <img
                            src={staff.photo}
                            alt={staff.name}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          staff.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {staff.name}
                          </h4>
                          {staff.role && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">
                              {staff.role}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {staff.designation} {staff.staffId ? `• ID: ${staff.staffId}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Language Access Switches */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                      {SUPPORTED_LANGUAGES.map((lang) => {
                        const hasAccess = userAccess[lang.code] === true;
                        const isGloballyDisabled =
                          globalSettings.languageAvailability[lang.code]?.disabledGlobally;
                        const isEveryoneEnabled =
                          globalSettings.languageAvailability[lang.code]?.enabledForEveryone;

                        return (
                          <button
                            key={lang.code}
                            onClick={() => {
                              onUpdateUserAccess(staff.id, lang.code, !hasAccess);
                              showNotification(
                                `${staff.name}-কে ${lang.name} ${
                                  !hasAccess ? 'অনুমোদন দেওয়া হয়েছে ✅' : 'বাতিল করা হয়েছে ❌'
                                }`
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                              hasAccess
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                            }`}
                            title={`${lang.name} টগল করুন`}
                          >
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            <span>{hasAccess ? '✅' : '❌'}</span>
                            {isEveryoneEnabled && (
                              <span className="text-[9px] px-1 py-0.2 bg-blue-100 text-blue-800 rounded">
                                সবার
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL RULES */}
      {activeTab === 'global' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-600" />
              গ্লোবাল ল্যাঙ্গুয়েজ রুলস (Global Master Rules)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              এক ক্লিকে প্রতিষ্ঠানের সকল কর্মীর জন্য যেকোনো ভাষা উন্মুক্ত করুন অথবা সাময়িকভাবে সম্পূর্ণ বন্ধ রাখুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const rule = globalSettings.languageAvailability[lang.code] || {
                enabledForEveryone: false,
                disabledGlobally: false,
              };

              return (
                <div
                  key={lang.code}
                  className="p-5 rounded-3xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <h4 className="font-black text-sm text-gray-900 dark:text-white">
                          {lang.name}
                        </h4>
                        <p className="text-[10px] text-gray-400">ডিফল্ট: {lang.defaultAccess ? 'উন্মুক্ত' : 'বন্ধ'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Enable for Everyone Switch */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          সবার জন্য উন্মুক্ত
                        </span>
                        <p className="text-[10px] text-gray-400">ব্যক্তিগত পারমিশন ছাড়াই সবাই দেখতে পাবে</p>
                      </div>
                      <button
                        onClick={() => handleToggleEveryone(lang.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          rule.enabledForEveryone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {rule.enabledForEveryone ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* Globally Disabled Switch */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          গ্লোবালি অফ (Kill Switch)
                        </span>
                        <p className="text-[10px] text-gray-400">এডমিন ছাড়া সবার জন্য লুকিয়ে রাখবে</p>
                      </div>
                      <button
                        onClick={() => handleToggleGloballyDisabled(lang.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          rule.disabledGlobally
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {rule.disabledGlobally ? 'OFF (বন্ধ)' : 'সক্রিয়'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-violet-600" />
              অডিট লগ ও হিস্ট্রি (Audit Log System)
            </h3>
            <span className="text-xs font-bold text-gray-400">সর্বমোট {auditLogs.length} টি রেকর্ড</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                এখনো কোনো অ্যাক্সেস পরিবর্তন রেকর্ড নেই।
              </div>
            ) : (
              auditLogs.slice(0, 30).map((log) => (
                <div
                  key={log.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 dark:text-white">{log.detailsBn}</p>
                    <p className="text-[11px] text-gray-500">
                      সম্পাদনাকারী: <span className="font-semibold">{log.performedBy}</span>
                      {log.targetUser ? ` • টার্গেট: ${log.targetUser}` : ''}
                    </p>
                  </div>

                  <span className="text-[10px] text-gray-400 shrink-0 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                    {new Date(log.timestamp).toLocaleString('bn-BD')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

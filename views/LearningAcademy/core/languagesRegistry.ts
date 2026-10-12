import { LanguageConfig, GlobalLearningSettings } from './types';

// Scalable Language Registry
// Additional languages like Arabic, Japanese, Korean, French, German can be registered here with zero redesign!
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'english',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    bannerGradient: 'from-violet-600 via-indigo-600 to-purple-700',
    primaryColor: 'violet',
    descriptionBn: 'স্পোকেন ইংলিশ, অফিস কমিউনিকেশন, ইমেইল, মিটিং ও বায়ার প্রেজেন্টেশন।',
    defaultAccess: true, // Available to all authorized users unless disabled
    hasRomanization: false,
    voiceLangCode: 'en-US',
    aiScenarioCategory: 'office',
  },
  {
    code: 'chinese',
    name: 'Chinese (Mandarin)',
    nativeName: '中文 (普通话)',
    flag: '🇨🇳',
    bannerGradient: 'from-red-600 via-rose-600 to-amber-600',
    primaryColor: 'red',
    descriptionBn: 'পিনয়িন ও জিরো লেভেল থেকে শুরু করে চাইনিজ সাপ্লায়ার ও ফ্যাক্টরি নেগোশিয়েশন।',
    defaultAccess: false, // OFF by default; Admin/MD must explicitly grant access
    hasRomanization: true,
    romanizationLabel: 'Pinyin',
    voiceLangCode: 'zh-CN',
    aiScenarioCategory: 'supplier',
  },
  {
    code: 'spanish',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    bannerGradient: 'from-amber-500 via-orange-600 to-red-600',
    primaryColor: 'amber',
    descriptionBn: 'জিরো লেভেল স্প্যানিশ, উচ্চারণ, দৈনন্দিন কথাবার্তা ও আন্তর্জাতিক বিজনেস স্প্যানিশ।',
    defaultAccess: false, // Configurable by Admin/MD (available to everyone or selected users)
    hasRomanization: false,
    voiceLangCode: 'es-ES',
    aiScenarioCategory: 'daily',
  },
];

// Helper to look up language by code
export const getLanguageConfig = (code: string): LanguageConfig => {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  if (found) return found;
  // Fallback default
  return SUPPORTED_LANGUAGES[0];
};

// Default Global Settings
export const DEFAULT_GLOBAL_SETTINGS: GlobalLearningSettings = {
  languageAvailability: {
    english: { enabledForEveryone: true, disabledGlobally: false },
    chinese: { enabledForEveryone: false, disabledGlobally: false },
    spanish: { enabledForEveryone: false, disabledGlobally: false },
  },
  dailyXpLimit: 250,
  leaderboardEnabled: true,
  aiConversationEnabled: true,
  voicePracticeEnabled: true,
};

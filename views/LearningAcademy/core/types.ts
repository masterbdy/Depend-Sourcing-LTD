// Reusable Scalable Multi-Language Architecture for Learning Academy

export type CourseLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

export interface LanguageConfig {
  code: string; // 'english' | 'chinese' | 'spanish' | etc.
  name: string; // 'English', 'Chinese (Mandarin)', 'Spanish'
  nativeName: string; // 'English', '中文 (普通话)', 'Español'
  flag: string; // 🇬🇧, 🇨🇳, 🇪🇸
  bannerGradient: string; // CSS gradient class
  primaryColor: string; // e.g. 'violet', 'red', 'amber'
  descriptionBn: string;
  defaultAccess: boolean; // english: true, chinese: false, spanish: false
  hasRomanization: boolean; // true for Chinese (Pinyin)
  romanizationLabel?: string; // 'Pinyin'
  voiceLangCode: string; // 'en-US', 'zh-CN', 'es-ES'
  aiScenarioCategory: string;
}

export interface UniversalWord {
  id: string;
  targetWord: string; // "Hello" / "你好" / "Hola"
  romanized?: string; // Pinyin etc: "Nǐ hǎo"
  bengaliPronunciation: string; // "হ্যালো" / "নি হাও" / "ওলা"
  bengaliMeaning: string; // "= হ্যালো"
  partOfSpeech?: string;
  category: string; // 'greetings', 'office', 'supplier', 'pricing', 'general'
  exampleTarget: string; // "Hello, how are you?" / "你好，你是陈经理吗？" / "Hola, ¿cómo estás?"
  exampleRomanized?: string;
  exampleBengali: string;
  audioText: string;
  difficulty?: 'beginner' | 'elementary' | 'intermediate' | 'advanced';
}

export interface UniversalDialogueTurn {
  speaker: string;
  speakerRoleBn: string;
  targetText: string;
  romanized?: string;
  bengaliPronunciation: string;
  bengaliMeaning: string;
}

export interface UniversalQuizQuestion {
  id: string;
  type?: 'mcq' | 'fill-blank' | 'translation' | 'listening';
  question: string;
  questionBn: string;
  options: string[];
  correctAnswer: string;
  explanationBn: string;
  audioPrompt?: string;
}

export interface UniversalDailyLesson {
  day: number;
  level: CourseLevel;
  title: string;
  titleBn: string;
  objectiveBn: string;
  xpReward: number;
  // 9 Pillars of Daily Lesson
  vocabulary: UniversalWord[];
  grammarNotes: {
    ruleTitleBn: string;
    explanationBn: string;
    correctExample: string;
    incorrectExample?: string;
    exampleBn: string;
  }[];
  conversation: UniversalDialogueTurn[];
  practiceSentences: {
    target: string;
    romanized?: string;
    pronunciationBn: string;
    meaningBn: string;
  }[];
  quiz: UniversalQuizQuestion[];
  businessTipBn?: string;
}

export interface UserLanguageProgress {
  userId: string;
  languageCode: string; // 'english' | 'chinese' | 'spanish'
  currentDay: number;
  completedDays: number[];
  xp: number;
  streak: number;
  level: CourseLevel;
  lastActiveDate: string; // YYYY-MM-DD
  masteredWordIds: string[];
  conversationMinutes: number;
  completedQuizzesCount: number;
  correctAnswersCount: number;
  unlockedBadges: string[];
}

export interface UniversalConversationScenario {
  id: string;
  title: string;
  titleBn: string;
  category: 'daily' | 'office' | 'supplier' | 'customer' | 'shopping' | 'travel' | 'meeting' | 'phone' | 'negotiation' | 'introduction';
  level: CourseLevel;
  initialTarget: string;
  initialRomanized?: string;
  initialBengali: string;
  systemPrompt: string;
}

export interface LanguageAccessMap {
  [languageCode: string]: boolean;
}

export interface UserLearningAccess {
  userId: string;
  userName: string;
  access: LanguageAccessMap;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface GlobalLearningSettings {
  languageAvailability: {
    [languageCode: string]: {
      enabledForEveryone: boolean; // if true, all authorized users can see it
      disabledGlobally: boolean; // if true, nobody except admin can see it
    };
  };
  dailyXpLimit: number;
  leaderboardEnabled: boolean;
  aiConversationEnabled: boolean;
  voicePracticeEnabled: boolean;
}

export interface LearningAuditLog {
  id: string;
  timestamp: string; // ISO
  performedBy: string;
  targetUser?: string;
  targetUserId?: string;
  action: 'GRANT_ACCESS' | 'REVOKE_ACCESS' | 'ENABLE_FOR_EVERYONE' | 'DISABLE_FOR_EVERYONE' | 'UPDATE_SETTINGS';
  languageCode?: string;
  languageName?: string;
  detailsBn: string;
}

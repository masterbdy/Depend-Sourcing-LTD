// Reusable Scalable Multi-Language Architecture for Learning Academy

export type CourseLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface CEFRLevelInfo {
  level: CefrLevel;
  name: string;
  nameBn: string;
  descriptionBn: string;
  requiredLessonsCount: number;
  requiredSpeakingMinutes: number;
  requiredVocabMastery: number;
  minExamPassScore: number;
  badge: string;
  color: string;
  gradient: string;
}

export const CEFR_LEVELS_METADATA: Record<CefrLevel, CEFRLevelInfo> = {
  A1: {
    level: 'A1',
    name: 'Beginner',
    nameBn: 'শুরুয়াতকারী (A1)',
    descriptionBn: 'প্রাথমিক কুশল বিনিময়, পরিচিতি, সাধারণ শব্দভাণ্ডার, সংখ্যা এবং সহজ বাক্যাংশ।',
    requiredLessonsCount: 4,
    requiredSpeakingMinutes: 15,
    requiredVocabMastery: 20,
    minExamPassScore: 75,
    badge: '🌱',
    color: 'emerald',
    gradient: 'from-emerald-600 to-teal-700',
  },
  A2: {
    level: 'A2',
    name: 'Elementary',
    nameBn: 'প্রাথমিক কথোপকথন (A2)',
    descriptionBn: 'দৈনন্দিন কেনাকাটা, ভ্রমণ, দিকনির্দেশনা, রেস্তোরাঁ ও অতীত/ভবিষ্যৎ কালের ব্যবহার।',
    requiredLessonsCount: 8,
    requiredSpeakingMinutes: 30,
    requiredVocabMastery: 45,
    minExamPassScore: 75,
    badge: '🌿',
    color: 'cyan',
    gradient: 'from-cyan-600 to-blue-700',
  },
  B1: {
    level: 'B1',
    name: 'Intermediate',
    nameBn: 'কর্মক্ষেত্র ও কর্মসম্পর্ক (B1)',
    descriptionBn: 'অফিস যোগাযোগ, মতামত প্রকাশ, সমস্যা ও সমাধানের আলোচনা এবং ক্লায়েন্ট ইনকোয়ারি।',
    requiredLessonsCount: 12,
    requiredSpeakingMinutes: 50,
    requiredVocabMastery: 75,
    minExamPassScore: 75,
    badge: '💼',
    color: 'blue',
    gradient: 'from-blue-600 to-indigo-700',
  },
  B2: {
    level: 'B2',
    name: 'Upper Intermediate',
    nameBn: 'সাবলীল বাণিজ্যিক আলোচনা (B2)',
    descriptionBn: 'ফ্যাক্টরি নেগোশিয়েশন, কোয়ালিটি কন্ট্রোল, জটিল বাণিজ্যিক মিটিং ও ব্যবসায়িক সমঝোতা।',
    requiredLessonsCount: 16,
    requiredSpeakingMinutes: 75,
    requiredVocabMastery: 110,
    minExamPassScore: 75,
    badge: '🎯',
    color: 'indigo',
    gradient: 'from-indigo-600 to-purple-700',
  },
  C1: {
    level: 'C1',
    name: 'Advanced',
    nameBn: 'আন্তর্জাতিক কনফারেন্স ও চুক্তি (C1)',
    descriptionBn: 'আন্তর্জাতিক বায়ার মিটিং, লিগ্যাল টার্মস ও চুক্তি রিভিউ, প্রাতিষ্ঠানিক উপস্থাপন।',
    requiredLessonsCount: 20,
    requiredSpeakingMinutes: 100,
    requiredVocabMastery: 150,
    minExamPassScore: 75,
    badge: '🏆',
    color: 'purple',
    gradient: 'from-purple-600 to-pink-700',
  },
  C2: {
    level: 'C2',
    name: 'Proficiency',
    nameBn: 'মাস্টারি ও নেতৃত্ব (C2)',
    descriptionBn: 'নেটিভ স্পিকারদের ন্যায় সাবলীলতা, বাগ্ধারা, কূটনৈতিক বক্তব্য ও উচ্চমার্গীয় লিডারশিপ।',
    requiredLessonsCount: 24,
    requiredSpeakingMinutes: 140,
    requiredVocabMastery: 200,
    minExamPassScore: 75,
    badge: '👑',
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-600',
  },
};

export interface LanguageConfig {
  code: string; // 'english' | 'chinese' | 'spanish' | 'serbian'
  name: string; // 'English', 'Chinese (Mandarin)', 'Spanish', 'Serbian'
  nativeName: string; // 'English', '中文 (普通话)', 'Español', 'Српски'
  flag: string; // 🇬🇧, 🇨🇳, 🇪🇸, 🇷🇸
  bannerGradient: string; // CSS gradient class
  primaryColor: string; // e.g. 'violet', 'red', 'amber', 'blue'
  descriptionBn: string;
  defaultAccess: boolean; // english: true, chinese: false, spanish: false, serbian: true
  hasRomanization: boolean; // true for Chinese (Pinyin) & Serbian (Latin)
  romanizationLabel?: string; // 'Pinyin' | 'Latin'
  voiceLangCode: string; // 'en-US', 'zh-CN', 'es-ES', 'sr-RS'
  aiScenarioCategory: string;
}

export interface UniversalWord {
  id: string;
  targetWord: string; // "Hello" / "你好" / "Hola" / "Здраво"
  romanized?: string; // Pinyin etc: "Nǐ hǎo" / "Zdravo"
  bengaliPronunciation: string; // "হ্যালো" / "নি হাও" / "ওলা" / "জ্দ্রাভো"
  bengaliMeaning: string; // "= হ্যালো"
  partOfSpeech?: string;
  category: string; // 'greetings', 'office', 'supplier', 'pricing', 'general'
  exampleTarget: string; // "Hello, how are you?"
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
  cefrLevel?: CefrLevel;
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

export interface PracticeDistribution {
  speakingMinutes: number;   // Target 50%
  listeningMinutes: number;  // Target 25%
  vocabMinutes: number;      // Target 15%
  grammarMinutes: number;    // Target 10%
}

export interface WeakTopic {
  topic: string;
  errorCount: number;
  lastEncountered: string;
  languageCode: string;
  samplePhrase?: string;
}

export interface SpacedRepetitionCard {
  wordId: string;
  box: number; // 1 to 5 (Leitner system)
  nextReviewDate: string; // YYYY-MM-DD
  reviewCount: number;
  lapses: number;
  isDifficult: boolean;
}

export interface SpeakingExamQuestion {
  id: string;
  part: 'A_READ_ALOUD' | 'B_LISTENING_COMPREHENSION' | 'C_SENTENCE_CONSTRUCTION' | 'D_ORAL_INTERVIEW';
  partTitleBn: string;
  promptTarget: string;
  promptRomanized?: string;
  promptBn: string;
  audioPrompt?: string;
  expectedTranscript?: string;
  options?: string[];
  correctAnswer?: string;
  scrambledWords?: string[];
  correctOrder?: string[];
}

export interface SpeakingExamResult {
  id: string;
  userId: string;
  userName?: string;
  languageCode: string;
  cefrLevel: CefrLevel;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  passed: boolean;
  completedAt: string;
  strengthsBn: string[];
  weaknessesBn: string[];
  recommendationsBn: string;
  promotedToNextLevel?: boolean;
}

export interface UserLanguageProgress {
  userId: string;
  languageCode: string; // 'english' | 'chinese' | 'spanish' | 'serbian'
  currentDay: number;
  completedDays: number[];
  xp: number;
  streak: number;
  level: CourseLevel;
  cefrLevel?: CefrLevel;
  lastActiveDate: string; // YYYY-MM-DD
  masteredWordIds: string[];
  conversationMinutes: number;
  completedQuizzesCount: number;
  correctAnswersCount: number;
  unlockedBadges: string[];
  // Advanced Training Systems Tracking
  practiceDistribution?: PracticeDistribution;
  weakTopics?: WeakTopic[];
  examHistory?: SpeakingExamResult[];
  srsCards?: Record<string, SpacedRepetitionCard>;
  listeningSpeed?: number; // 0.75 | 1.0 | 1.25
}

export interface UniversalConversationScenario {
  id: string;
  title: string;
  titleBn: string;
  category:
    | 'daily'
    | 'office'
    | 'supplier'
    | 'customer'
    | 'shopping'
    | 'travel'
    | 'meeting'
    | 'phone'
    | 'negotiation'
    | 'introduction'
    | 'restaurant'
    | 'hotel'
    | 'airport'
    | 'directions'
    | 'emergency';
  level: CourseLevel;
  cefrLevel?: CefrLevel;
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

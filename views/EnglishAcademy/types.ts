export type CourseLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

export interface PracticeQuestion {
  id: string;
  type: 'mcq' | 'fill-blank' | 'translation' | 'reorder' | 'listening';
  question: string;
  questionBn?: string;
  options?: string[];
  correctAnswer: string;
  explanationBn: string;
  audioPrompt?: string; // Sentence to speak for listening exercises
}

export interface LessonContent {
  id: string;
  day?: number;
  courseLevel: CourseLevel;
  title: string;
  titleBn: string;
  category: string;
  descriptionBn: string;
  order: number;
  xpReward: number;
  keyPhrases: {
    english: string;
    bengali: string;
    explanationBn: string;
    example: string;
    exampleBn: string;
  }[];
  questions: PracticeQuestion[];
}

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech: string; // noun, verb, adjective, etc.
  meaningBn: string;
  explanationBn: string;
  exampleSentence: string;
  exampleSentenceBn: string;
  category: 'daily' | 'office' | 'finance' | 'business' | 'idiom';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GrammarTopic {
  id: string;
  title: string;
  titleBn: string;
  category: 'tenses' | 'articles' | 'prepositions' | 'sentences' | 'common-mistakes' | 'spoken-formulas';
  summaryBn: string;
  rules: {
    ruleTitleBn: string;
    explanationBn: string;
    correctExample: string;
    incorrectExample?: string;
    exampleBn: string;
  }[];
  quizzes: PracticeQuestion[];
}

export interface EmailTemplate {
  id: string;
  title: string;
  titleBn: string;
  category: 'leave' | 'bills' | 'reporting' | 'client' | 'meeting' | 'general';
  subject: string;
  body: string;
  bodyBn: string;
  tipsBn: string[];
}

export interface OfficeDialogue {
  id: string;
  title: string;
  titleBn: string;
  category: 'manager' | 'colleague' | 'meeting' | 'phone' | 'client' | 'accounts';
  descriptionBn: string;
  turns: {
    speaker: string;
    speakerRoleBn: string;
    text: string;
    textBn: string;
  }[];
}

export interface FinanceTerm {
  id: string;
  term: string;
  meaningBn: string;
  contextBn: string;
  example: string;
  exampleBn: string;
}

export interface UserLearningProfile {
  userId: string;
  userName: string;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalDays: number;
  completedLessons: string[]; // lesson IDs
  savedWordIds: string[];
  masteredWordIds: string[];
  needPracticeWordIds: string[];
  speakingMinutes: number;
  dailyGoalTarget: number; // e.g. 50 XP
  dailyGoalProgress: number; // XP earned today
  lastGoalDate: string;
  completedQuizzesCount: number;
  correctAnswersCount: number;
  unlockedBadges: string[];
}

export interface Badge {
  id: string;
  title: string;
  titleBn: string;
  descriptionBn: string;
  icon: string;
  requiredXp?: number;
  requiredStreak?: number;
  requiredWords?: number;
  requiredLessons?: number;
}

export interface SpeakingScenario {
  id: string;
  title: string;
  titleBn: string;
  descriptionBn: string;
  initialPrompt: string;
  initialPromptBn: string;
  systemPrompt: string;
  tags: string[];
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  textBn?: string;
  timestamp: string;
  correction?: {
    correctedText: string;
    explanationBn: string;
    naturalAlternative?: string;
    grammarScore?: number;
  };
}

export interface AcademySettings {
  isEnabled: boolean;
  allowGuestAccess: boolean;
  announcementBn?: string;
}

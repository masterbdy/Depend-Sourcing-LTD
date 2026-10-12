export interface ChineseCoreWord {
  character: string;
  pinyin: string;
  pronunciationBn: string;
  meaningBn: string;
  audioText: string;
  contextNoteBn?: string;
}

export interface ChineseDialogueTurn {
  speaker: string;
  speakerRoleBn: string;
  chinese: string;
  pinyin: string;
  pronunciationBn: string;
  meaningBn: string;
}

export interface ChinesePracticeQuestion {
  id: string;
  question: string;
  questionBn: string;
  chinesePrompt?: string;
  pinyinPrompt?: string;
  options: string[];
  correctAnswer: string;
  explanationBn: string;
}

export interface ChineseLessonDay {
  day: number;
  title: string;
  titleBn: string;
  stage: 'Zero Level Basics' | 'Product & Pricing' | 'Sampling & Quality' | 'Orders & Negotiations' | 'Shipping & Factory';
  objectiveBn: string;
  xpReward: number;
  coreWords: ChineseCoreWord[];
  dialogue: ChineseDialogueTurn[];
  businessTipBn: string;
  quiz: ChinesePracticeQuestion[];
}

export interface ChineseVocabularyWord {
  id: string;
  character: string;
  pinyin: string;
  pronunciationBn: string;
  meaningBn: string;
  category: 'greeting' | 'supplier' | 'price' | 'product' | 'shipping' | 'quality' | 'payment';
  example: string;
  examplePinyin: string;
  exampleBn: string;
  difficulty: 'beginner' | 'intermediate';
}

export interface UserChineseProgress {
  userId: string;
  userName: string;
  currentDay: number;
  completedDays: number[];
  xp: number;
  streak: number;
  lastActiveDate: string;
  vocabularyMastered: string[];
  simulatorMinutes: number;
  totalDaysPracticed: number;
}

export interface ChineseSimulatorMessage {
  id: string;
  sender: 'user' | 'ai';
  chinese: string;
  pinyin?: string;
  meaningBn?: string;
  timestamp: string;
  feedback?: {
    correctedChinese: string;
    userMistake?: string;
    explanationBn: string;
    naturalAlternative?: string;
    score: number;
  };
}

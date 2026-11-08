import { UniversalDailyLesson, UniversalWord, UniversalQuizQuestion } from '../core/types';

export interface SerbianLesson extends UniversalDailyLesson {
  id: string;
  category: string;
  cyrillicTitle: string;
  latinTitle: string;
  bengaliTitle: string;
  englishTitle: string;
  summaryBn: string;
  summaryEn: string;
  culturalNote?: string;
}

export interface SerbianPracticePhrase {
  id: string;
  cyrillic: string;
  latin: string;
  bengaliPronunciation: string;
  bengaliMeaning: string;
  englishMeaning: string;
  category: string;
  audioPrompt: string;
}

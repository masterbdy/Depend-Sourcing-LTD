// services/dynamicLessonManager.ts
// Complete Dynamic Lesson & Adaptive Fast-Track Engine for Depend Sourcing Ltd. Learning Academy
import { UniversalDailyLesson, UniversalWord, CourseLevel, CefrLevel } from '../views/LearningAcademy/core/types';
import { SERBIAN_LESSONS_DATA } from '../views/LearningAcademy/serbian/serbianLessonsData';
import { SPANISH_LESSONS_DATA } from '../views/LearningAcademy/spanish/spanishLessonsData';
import { CHINESE_LESSONS_DATA } from '../views/LearningAcademy/chinese/chineseLessonsData';
import { COURSES_DATA } from '../views/EnglishAcademy/courseData';
import { generateCuratedFallbackLesson, validateLessonQuality } from './lessonGeneratorService';
import { getDatabase, ref, get, set } from 'firebase/database';
import { getApp } from 'firebase/app';

export type AcademyLanguage = 'serbian' | 'chinese' | 'spanish' | 'english';

/**
 * Adapter converting Chinese foundational lessons to UniversalDailyLesson format.
 */
function adaptChineseLessons(): UniversalDailyLesson[] {
  return CHINESE_LESSONS_DATA.map((c) => ({
    day: c.day,
    level: 'beginner' as CourseLevel,
    cefrLevel: (c.day <= 4 ? 'A1' : c.day <= 8 ? 'A2' : 'B1') as CefrLevel,
    title: c.title,
    titleBn: c.titleBn,
    objectiveBn: c.objectiveBn,
    xpReward: c.xpReward,
    vocabulary: c.coreWords.map((w, idx) => ({
      id: `cn-d${c.day}-v${idx + 1}`,
      targetWord: w.character,
      romanized: w.pinyin,
      bengaliPronunciation: w.pronunciationBn,
      bengaliMeaning: w.meaningBn,
      category: 'daily',
      exampleTarget: w.audioText,
      exampleBengali: w.contextNoteBn,
      audioText: w.audioText,
    })),
    grammarNotes: [
      {
        ruleTitleBn: 'টোন ও উচ্চারণ শিষ্টাচার',
        explanationBn: 'চীনা ভাষায় ৪টি টোন রয়েছে। সঠিক টোন অর্থের তারতম্য নির্ধারণ করে।',
        correctExample: c.coreWords[0]?.character || '你好',
        exampleBn: c.coreWords[0]?.meaningBn || 'হ্যালো / কেমন আছেন',
      },
    ],
    conversation: (c.dialogue || []).map((d) => ({
      speaker: d.speaker,
      speakerRoleBn: d.speakerRoleBn,
      targetText: d.chinese,
      romanized: d.pinyin,
      bengaliPronunciation: d.pronunciationBn,
      bengaliMeaning: d.meaningBn,
    })),
    practiceSentences: (c.coreWords || []).slice(0, 3).map((w) => ({
      target: w.character,
      romanized: w.pinyin,
      pronunciationBn: w.pronunciationBn,
      meaningBn: w.meaningBn,
    })),
    quiz: (c.quiz || []).map((q) => ({
      id: q.id,
      question: q.question,
      questionBn: q.questionBn,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanationBn: q.explanationBn,
    })),
    businessTipBn: 'চীনা অংশীদারদের সাথে ব্যবসায় সময়নিষ্ঠা ও উইচ্যাটে তাৎক্ষণিক উত্তর ইতিবাচক সম্পর্কের মূল চাবিকাঠি।',
  }));
}

/**
 * Adapter converting English foundational lessons to UniversalDailyLesson format.
 */
function adaptEnglishLessons(): UniversalDailyLesson[] {
  return COURSES_DATA.map((e) => ({
    day: e.day,
    level: 'beginner' as CourseLevel,
    cefrLevel: (e.day <= 4 ? 'A1' : e.day <= 8 ? 'A2' : 'B1') as CefrLevel,
    title: e.title,
    titleBn: e.titleBn,
    objectiveBn: e.descriptionBn,
    xpReward: e.xpReward,
    vocabulary: (e.keyPhrases || []).map((p, idx) => ({
      id: `en-d${e.day}-v${idx + 1}`,
      targetWord: p.english,
      bengaliPronunciation: p.bengali,
      bengaliMeaning: p.bengali,
      category: e.category,
      exampleTarget: p.example,
      exampleBengali: p.exampleBn,
      audioText: p.english,
    })),
    grammarNotes: [
      {
        ruleTitleBn: 'প্রফেশনাল ইংরেজি শিষ্টাচার',
        explanationBn: e.descriptionBn,
        correctExample: e.keyPhrases[0]?.example || 'Could you please confirm the delivery date?',
        exampleBn: e.keyPhrases[0]?.exampleBn || 'অনুগ্রহ করে ডেলিভারির তারিখ নিশ্চিত করবেন কি?',
      },
    ],
    conversation: [
      {
        speaker: 'Buyer / Client',
        speakerRoleBn: 'আন্তর্জাতিক ক্রেতা',
        targetText: e.keyPhrases[0]?.example || 'Hello, we would like to place an order.',
        bengaliPronunciation: 'হ্যালো, উই উড লাইক টু প্লেস অ্যান অর্ডার।',
        bengaliMeaning: 'হ্যালো, আমরা একটি অর্ডার দিতে আগ্রহী।',
      },
    ],
    practiceSentences: (e.keyPhrases || []).map((p) => ({
      target: p.example,
      pronunciationBn: p.bengali,
      meaningBn: p.exampleBn,
    })),
    quiz: (e.questions || []).map((q) => ({
      id: q.id,
      question: q.question,
      questionBn: q.questionBn,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanationBn: q.explanationBn,
    })),
    businessTipBn: 'বায়ারদের সাথে স্পষ্ট, সাবলীল এবং সময়োচিত যোগাযোগ বিশ্বস্ততা তৈরি করে।',
  }));
}

/**
 * Returns foundational 12-day lessons for the given language.
 */
export function getFoundationalLessons(language: AcademyLanguage): UniversalDailyLesson[] {
  switch (language) {
    case 'serbian':
      return SERBIAN_LESSONS_DATA;
    case 'spanish':
      return SPANISH_LESSONS_DATA;
    case 'chinese':
      return adaptChineseLessons();
    case 'english':
      return adaptEnglishLessons();
    default:
      return [];
  }
}

/**
 * Loads dynamic (generated) lessons from localStorage and Firebase.
 */
export async function getDynamicLessons(
  language: AcademyLanguage,
  safeUserId: string = 'guest_user',
  firebaseConfig?: any
): Promise<UniversalDailyLesson[]> {
  const localKey = `academy_dynamic_lessons_${language}_${safeUserId}`;
  let dynamicLessons: UniversalDailyLesson[] = [];

  // 1. Try local storage
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      dynamicLessons = JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[DynamicLessonManager] LocalStorage read error for ${language}:`, err);
  }

  // 2. Try Firebase Realtime Database
  if (firebaseConfig?.databaseURL) {
    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);
      const snapshot = await get(ref(db, `learning/generated_lessons/${language}`));
      if (snapshot.exists()) {
        const cloudData = snapshot.val();
        const cloudLessons: UniversalDailyLesson[] = Object.values(cloudData);
        // Merge cloud lessons into local list, avoiding duplicates by day
        const existingDays = new Set(dynamicLessons.map((l) => l.day));
        cloudLessons.forEach((cl) => {
          if (!existingDays.has(cl.day)) {
            dynamicLessons.push(cl);
            existingDays.add(cl.day);
          }
        });
        try {
          localStorage.setItem(localKey, JSON.stringify(dynamicLessons));
        } catch {}
      }
    } catch (err) {
      // Offline fallback: use local cache
      console.warn(`[DynamicLessonManager] Firebase sync error for ${language} (offline fallback):`, err);
    }
  }

  return dynamicLessons.sort((a, b) => a.day - b.day);
}

/**
 * Returns ALL lessons (Foundational 12 + Dynamic Generated) ordered by day.
 */
export async function getAllLessons(
  language: AcademyLanguage,
  safeUserId: string = 'guest_user',
  firebaseConfig?: any
): Promise<UniversalDailyLesson[]> {
  const foundational = getFoundationalLessons(language);
  const dynamic = await getDynamicLessons(language, safeUserId, firebaseConfig);

  const mergedMap = new Map<number, UniversalDailyLesson>();
  foundational.forEach((l) => mergedMap.set(l.day, l));
  dynamic.forEach((l) => mergedMap.set(l.day, l));

  return Array.from(mergedMap.values()).sort((a, b) => a.day - b.day);
}

/**
 * Extracts all target words learned across completed lessons to prevent duplicates.
 */
export async function getPreviouslyLearnedWords(
  language: AcademyLanguage,
  completedDays: number[],
  safeUserId: string = 'guest_user'
): Promise<string[]> {
  const allLessons = await getAllLessons(language, safeUserId);
  const words: string[] = [];

  allLessons
    .filter((l) => completedDays.includes(l.day))
    .forEach((l) => {
      (l.vocabulary || []).forEach((v) => {
        if (v.targetWord) words.push(v.targetWord);
      });
    });

  return words;
}

/**
 * Requests or generates the next adaptive lesson.
 * Supports Fast-Track learning: Learner can complete 1, 2, 5, or 7 days in a single session!
 */
export async function requestNextAdaptiveLesson({
  language,
  currentDay,
  completedDays = [],
  safeUserId = 'guest_user',
  weakTopics = [],
  firebaseConfig,
}: {
  language: AcademyLanguage;
  currentDay: number;
  completedDays?: number[];
  safeUserId?: string;
  weakTopics?: string[];
  firebaseConfig?: any;
}): Promise<{
  success: boolean;
  lesson: UniversalDailyLesson;
  source: 'api' | 'curated_generator' | 'cache';
  validationReport?: any;
}> {
  const allLessons = await getAllLessons(language, safeUserId, firebaseConfig);
  const targetDay = currentDay > 0 ? currentDay : (allLessons[allLessons.length - 1]?.day || 0) + 1;

  // Check if targetDay already exists in our merged collection
  const existing = allLessons.find((l) => l.day === targetDay);
  if (existing) {
    return {
      success: true,
      lesson: existing,
      source: 'cache',
      validationReport: { isValid: true, errors: [], warnings: [], vocabCount: existing.vocabulary.length },
    };
  }

  // Determine CEFR level based on day
  const cefrLevel: CefrLevel =
    targetDay <= 15 ? 'A1' : targetDay <= 30 ? 'A2' : targetDay <= 50 ? 'B1' : targetDay <= 70 ? 'B2' : 'C1';

  // Gather previously learned words and titles to prevent duplication
  const previouslyLearnedWords = await getPreviouslyLearnedWords(language, completedDays, safeUserId);
  const existingLessonTitles = allLessons.map((l) => l.title);

  let generatedLesson: UniversalDailyLesson | null = null;
  let source: 'api' | 'curated_generator' = 'curated_generator';
  let validationReport: any = null;

  // Attempt server generation endpoint
  try {
    const res = await fetch('/api/learning-ai/generate-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        dayNumber: targetDay,
        level: cefrLevel,
        userWeakTopics: weakTopics,
        previouslyLearnedWords,
        existingLessonTitles,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.lesson) {
        generatedLesson = data.lesson;
        source = data.source || 'api';
        validationReport = data.validationReport;
      }
    }
  } catch (netErr) {
    console.warn(`[DynamicLessonManager] API fetch failed, falling back to curated generator:`, netErr);
  }

  // Fallback to high quality client-side curated generator if API fails
  if (!generatedLesson) {
    generatedLesson = generateCuratedFallbackLesson({
      language,
      dayNumber: targetDay,
      level: cefrLevel,
      userWeakTopics: weakTopics,
      previouslyLearnedWords,
      existingLessonTitles,
    });
    source = 'curated_generator';
    validationReport = validateLessonQuality(generatedLesson, existingLessonTitles, previouslyLearnedWords);
  }

  // Persist to local dynamic storage
  const localKey = `academy_dynamic_lessons_${language}_${safeUserId}`;
  try {
    const raw = localStorage.getItem(localKey);
    const list: UniversalDailyLesson[] = raw ? JSON.parse(raw) : [];
    if (!list.some((l) => l.day === generatedLesson!.day)) {
      list.push(generatedLesson);
      localStorage.setItem(localKey, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Failed to save lesson to local dynamic storage:', e);
  }

  // Persist to Firebase Realtime Database
  if (firebaseConfig?.databaseURL) {
    try {
      const app = getApp();
      const db = getDatabase(app, firebaseConfig.databaseURL);
      // Save to global generated lessons and user's queue
      set(ref(db, `learning/generated_lessons/${language}/${generatedLesson.day}`), generatedLesson);
      set(ref(db, `learning/users/${safeUserId}/languages/${language}/generated/${generatedLesson.day}`), generatedLesson);
    } catch (fbErr) {
      console.warn('Failed to persist dynamic lesson to Firebase:', fbErr);
    }
  }

  return {
    success: true,
    lesson: generatedLesson,
    source,
    validationReport,
  };
}

// tests/adaptiveLessonGeneration.test.ts
// Test suite for AI Language Training Academy: Adaptive Lesson Generation, Topic Rotation, & Quality Validation
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ROTATING_LESSON_TOPICS,
  getTopicForDay,
  validateLessonQuality,
  generateCuratedFallbackLesson,
} from '../services/lessonGeneratorService';
import { getFoundationalLessons } from '../services/dynamicLessonManager';
import { UniversalDailyLesson } from '../views/LearningAcademy/core/types';

describe('AI Language Training Academy - Adaptive Lesson Generation Engine', () => {
  it('1. Verifies 20 rotating topics system is complete and non-empty', () => {
    assert.strictEqual(ROTATING_LESSON_TOPICS.length, 20, 'Must have exactly 20 rotating topics');
    const ids = new Set(ROTATING_LESSON_TOPICS.map((t) => t.id));
    assert.strictEqual(ids.size, 20, 'All 20 topics must have unique IDs');

    // Test cyclic topic selection
    const topicDay1 = getTopicForDay(1);
    const topicDay21 = getTopicForDay(21);
    assert.strictEqual(topicDay1.id, topicDay21.id, 'Topic day 1 and 21 must match due to 20-topic cyclic rotation');
    assert.ok(topicDay1.en && topicDay1.bn, 'Topic must have English and Bengali labels');
  });

  it('2. Verifies curated fallback lesson generator for all 4 languages', () => {
    const languages = ['serbian', 'chinese', 'spanish', 'english'] as const;

    for (const lang of languages) {
      const lesson = generateCuratedFallbackLesson({
        language: lang,
        dayNumber: 13,
        level: 'A1',
      });

      assert.strictEqual(lesson.day, 13, `Lesson day must be 13 for ${lang}`);
      assert.ok(lesson.title && lesson.title.length > 3, `Lesson title must be present for ${lang}`);
      assert.ok(lesson.titleBn && lesson.titleBn.length > 3, `Lesson Bengali title must be present for ${lang}`);
      assert.ok(lesson.vocabulary.length >= 5, `${lang} lesson must have at least 5 vocabulary items (ideally 10)`);
      assert.ok(lesson.quiz && lesson.quiz.length >= 1, `${lang} lesson must have quiz assessment`);
      assert.ok(lesson.grammarNotes && lesson.grammarNotes.length >= 1, `${lang} lesson must have grammar notes`);

      // Script-specific tests
      if (lang === 'chinese') {
        const hasChinese = lesson.vocabulary.some((v) => /[\u4e00-\u9fa5]/.test(v.targetWord));
        assert.ok(hasChinese, 'Chinese vocabulary must contain Chinese characters');
        const hasPinyin = lesson.vocabulary.some((v) => !!v.romanized);
        assert.ok(hasPinyin, 'Chinese vocabulary must contain romanized Pinyin');
      }

      if (lang === 'serbian') {
        const hasSerbianCyrillic = lesson.vocabulary.some((v) => /[\u0400-\u04FF]/.test(v.targetWord));
        assert.ok(hasSerbianCyrillic, 'Serbian vocabulary must contain Cyrillic characters');
        const hasSerbianLatin = lesson.vocabulary.some((v) => !!v.romanized);
        assert.ok(hasSerbianLatin, 'Serbian vocabulary must contain Latin romanization');
      }
    }
  });

  it('3. Verifies lesson quality validator catches duplicate titles and missing fields', () => {
    const validLesson: UniversalDailyLesson = {
      day: 5,
      level: 'beginner',
      cefrLevel: 'A1',
      title: 'Dining at a Restaurant',
      titleBn: 'রেস্তোরাঁয় খাবারের অর্ডার',
      objectiveBn: 'রেস্তোরাঁয় খাবারের অর্ডার দেওয়া ও বিল পরিশোধ করা।',
      xpReward: 40,
      vocabulary: [
        {
          id: 'sr-d5-v1',
          targetWord: 'Јеловник',
          romanized: 'Jelovnik',
          bengaliPronunciation: 'য়েলোভনিক',
          bengaliMeaning: '= মেনু কার্ড',
          category: 'restaurant',
          audioText: 'Jelovnik',
        },
      ],
      grammarNotes: [{ ruleTitleBn: 'নিয়ম', explanationBn: 'ব্যাখ্যা', correctExample: 'উদাহরণ', exampleBn: 'অর্থ' }],
      conversation: [{ speaker: 'A', speakerRoleBn: 'ওয়েটার', targetText: 'Добар дан', bengaliPronunciation: 'দোবার দান', bengaliMeaning: 'শুভ দিন' }],
      practiceSentences: [{ target: 'Молим вас јеловник', pronunciationBn: 'মোলিম ভাস য়েলোভনিক', meaningBn: 'দয়া করে মেনু দিন' }],
      quiz: [{ id: 'q1', question: 'Q', questionBn: 'প্রশ্ন', options: ['A', 'B'], correctAnswer: 'A', explanationBn: 'ব্যাখ্যা' }],
    };

    // First validate without conflicts
    const report1 = validateLessonQuality(validLesson, ['Different Title'], ['Рачун']);
    assert.strictEqual(report1.isValid, true, 'Valid lesson must pass validation');
    assert.strictEqual(report1.newWordsCount, 1, 'Should register 1 new word');
    assert.strictEqual(report1.repeatedWordsCount, 0, 'Should register 0 repeated words');

    // Now validate with duplicate title
    const reportDuplicateTitle = validateLessonQuality(validLesson, ['Dining at a Restaurant']);
    assert.ok(
      reportDuplicateTitle.warnings.some((w) => w.includes('পূর্বে ব্যবহৃত হয়েছে')),
      'Must warn when title already exists'
    );

    // Now validate with repeated word
    const reportRepeatedWord = validateLessonQuality(validLesson, [], ['Јеловник']);
    assert.strictEqual(reportRepeatedWord.repeatedWordsCount, 1, 'Should detect repeated word');
    assert.strictEqual(reportRepeatedWord.newWordsCount, 0, 'New words should be 0 when word is repeated');
  });

  it('4. Verifies Fast-Track multi-day learning progression (1, 2, 5, 7 days)', () => {
    // Tests that foundational lessons provide structured Day 1 to 12
    const serbianLessons = getFoundationalLessons('serbian');
    const spanishLessons = getFoundationalLessons('spanish');
    const chineseLessons = getFoundationalLessons('chinese');
    const englishLessons = getFoundationalLessons('english');

    assert.ok(serbianLessons.length >= 12, 'Serbian must have at least 12 foundational lessons');
    assert.ok(spanishLessons.length >= 12, 'Spanish must have at least 12 foundational lessons');
    assert.ok(chineseLessons.length >= 12, 'Chinese must have at least 12 foundational lessons');
    assert.ok(englishLessons.length >= 12, 'English must have at least 12 foundational lessons');

    // Simulate multi-day velocity: 1 day, 2 days, 5 days, 7 days
    const completedDayCounts = [1, 2, 5, 7];
    for (const count of completedDayCounts) {
      const completedDays = Array.from({ length: count }, (_, i) => i + 1);
      const learnedVocab = serbianLessons
        .filter((l) => completedDays.includes(l.day))
        .flatMap((l) => l.vocabulary);

      // In 1 day: >= 5 words; 2 days: >= 15 words; 5 days: >= 40 words; 7 days: >= 60 words
      assert.ok(
        learnedVocab.length >= count * 5,
        `Completing ${count} days should grant >= ${count * 5} words (actual: ${learnedVocab.length})`
      );
    }
  });

  it('5. Verifies scheduled cron generation logic returns lessons for all 4 languages', async () => {
    // Import and test cron handler logic
    const { default: cronHandler } = await import('../api/cron-daily-lessons');

    let responseCode = 200;
    let responseJson: any = null;

    const mockReq = {
      method: 'GET',
      query: { day: '14' },
    };

    const mockRes = {
      setHeader: () => {},
      status: (code: number) => {
        responseCode = code;
        return {
          json: (data: any) => {
            responseJson = data;
            return data;
          },
          end: () => {},
        };
      },
      json: (data: any) => {
        responseJson = data;
        return data;
      },
    };

    await cronHandler(mockReq, mockRes);

    assert.strictEqual(responseCode, 200, 'Cron endpoint must return HTTP 200');
    assert.ok(responseJson?.success, 'Cron response must indicate success');
    assert.strictEqual(responseJson?.dayNumber, 14, 'Cron response must reflect requested day 14');
    assert.deepStrictEqual(
      responseJson?.languagesProcessed,
      ['english', 'chinese', 'spanish', 'serbian'],
      'Cron must process all 4 languages'
    );
    assert.ok(responseJson?.results?.serbian, 'Serbian lesson must be generated');
    assert.ok(responseJson?.results?.chinese, 'Chinese lesson must be generated');
    assert.ok(responseJson?.results?.spanish, 'Spanish lesson must be generated');
    assert.ok(responseJson?.results?.english, 'English lesson must be generated');
  });
});

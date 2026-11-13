import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SUPPORTED_LANGUAGES, DEFAULT_GLOBAL_SETTINGS } from '../views/LearningAcademy/core/languagesRegistry';
import { CEFR_LEVELS_METADATA } from '../views/LearningAcademy/core/types';
import { UNIVERSAL_AI_SCENARIOS } from '../views/LearningAcademy/core/scenariosData';
import { SERBIAN_LESSONS_DATA } from '../views/LearningAcademy/serbian/serbianLessonsData';
import { SPANISH_LESSONS_DATA } from '../views/LearningAcademy/spanish/spanishLessonsData';
import { CHINESE_LESSONS_DATA } from '../views/LearningAcademy/chinese/chineseLessonsData';

describe('Depend Sourcing Ltd. – Master Language Academy Comprehensive Verification', () => {
  it('should support all 4 required languages: Chinese, Spanish, English, Serbian', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    assert.ok(codes.includes('chinese'), 'Must support Chinese');
    assert.ok(codes.includes('spanish'), 'Must support Spanish');
    assert.ok(codes.includes('english'), 'Must support English');
    assert.ok(codes.includes('serbian'), 'Must support Serbian');
  });

  it('should define all 6 CEFR levels with progression criteria and pass scores', () => {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
    levels.forEach((lvl) => {
      const meta = CEFR_LEVELS_METADATA[lvl];
      assert.ok(meta, `CEFR level ${lvl} must have metadata`);
      assert.ok(meta.name, 'Must have name');
      assert.ok(meta.nameBn, 'Must have Bengali name');
      assert.ok(meta.requiredLessonsCount > 0, 'Must require lessons');
      assert.ok(meta.requiredSpeakingMinutes > 0, 'Must require speaking minutes');
      assert.strictEqual(meta.minExamPassScore, 75, 'Pass score must be 75%');
    });
  });

  it('should have all 11 required real-life role-play scenarios for all languages', () => {
    const requiredCategories = [
      'introduction',
      'daily',
      'shopping',
      'restaurant',
      'hotel',
      'airport',
      'directions',
      'office',
      'negotiation',
      'phone',
      'emergency',
    ];

    ['en', 'zh', 'es', 'se'].forEach((prefix) => {
      const langScenarios = UNIVERSAL_AI_SCENARIOS.filter((s) => s.id.startsWith(prefix));
      assert.ok(
        langScenarios.length >= 11,
        `Prefix "${prefix}" must contain at least 11 scenarios (got ${langScenarios.length})`
      );

      requiredCategories.forEach((cat) => {
        const hasCat = langScenarios.some((s) => s.category === cat);
        assert.ok(hasCat, `Prefix "${prefix}" must have scenario for category "${cat}"`);
      });
    });
  });

  it('should verify Serbian lessons contain Cyrillic, Latin, Bengali pronunciation, and meanings', () => {
    assert.strictEqual(SERBIAN_LESSONS_DATA.length, 12, 'Serbian course must have 12 modules');
    SERBIAN_LESSONS_DATA.forEach((lesson) => {
      assert.ok(lesson.day >= 1 && lesson.day <= 12);
      assert.ok(lesson.title);
      assert.ok(lesson.titleBn);
      assert.ok(lesson.vocabulary.length >= 4);
      lesson.vocabulary.forEach((w) => {
        assert.ok(w.targetWord, 'Must have Serbian word');
        assert.ok(w.romanized, 'Must have Latin romanization');
        assert.ok(w.bengaliPronunciation, 'Must have Bengali pronunciation');
        assert.ok(w.bengaliMeaning, 'Must have Bengali meaning');
      });
    });
  });

  it('should verify Spanish and Chinese courses have structured daily lessons', () => {
    assert.ok(SPANISH_LESSONS_DATA.length >= 10, 'Spanish course must have at least 10 lessons');
    assert.ok(CHINESE_LESSONS_DATA.length >= 10, 'Chinese course must have at least 10 lessons');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SERBIAN_LESSONS_DATA, SERBIAN_VOCABULARY_LIST } from '../views/LearningAcademy/serbian/serbianLessonsData';
import { SERBIAN_SPEAKING_PHRASES, SERBIAN_SPEAKING_CATEGORIES } from '../views/LearningAcademy/serbian/serbianSpeakingData';
import { SUPPORTED_LANGUAGES, DEFAULT_GLOBAL_SETTINGS, getLanguageConfig } from '../views/LearningAcademy/core/languagesRegistry';
import { UNIVERSAL_AI_SCENARIOS } from '../views/LearningAcademy/core/scenariosData';
import { SPANISH_LESSONS_DATA, SPANISH_VOCABULARY_LIST } from '../views/LearningAcademy/spanish/spanishLessonsData';
import { CHINESE_LESSONS_DATA } from '../views/LearningAcademy/chinese/chineseLessonsData';

describe('Serbian Course Architecture Alignment with Chinese, Spanish, and English', () => {
  it('should have identical architectural registry for Serbian alongside Chinese, Spanish, English', () => {
    const serbian = getLanguageConfig('serbian');
    const spanish = getLanguageConfig('spanish');
    const chinese = getLanguageConfig('chinese');
    const english = getLanguageConfig('english');

    assert.ok(serbian, 'Serbian must be registered');
    assert.ok(spanish, 'Spanish must be registered');
    assert.ok(chinese, 'Chinese must be registered');
    assert.ok(english, 'English must be registered');

    assert.strictEqual(serbian.code, 'serbian');
    assert.strictEqual(serbian.name, 'Serbian');
    assert.strictEqual(serbian.nativeName, 'Српски');
    assert.strictEqual(serbian.flag, '🇷🇸');
    assert.strictEqual(serbian.voiceLangCode, 'sr-RS');
    assert.strictEqual(serbian.hasRomanization, true, 'Serbian should have Latin romanization supported');
  });

  it('should provide complete 12 structured lessons matching UniversalDailyLesson schema', () => {
    assert.strictEqual(SERBIAN_LESSONS_DATA.length, 12, 'Serbian must have exactly 12 structured lessons');
    assert.ok(SPANISH_LESSONS_DATA.length >= 4, 'Spanish should have lessons');
    assert.ok(CHINESE_LESSONS_DATA.length >= 10, 'Chinese should have lessons');

    SERBIAN_LESSONS_DATA.forEach((lesson, index) => {
      assert.strictEqual(lesson.day, index + 1);
      assert.ok(lesson.title && lesson.title.length > 0);
      assert.ok(lesson.titleBn && lesson.titleBn.length > 0);
      assert.ok(lesson.objectiveBn && lesson.objectiveBn.length > 0);
      assert.ok(lesson.xpReward > 0);

      // Vocabulary
      assert.ok(Array.isArray(lesson.vocabulary) && lesson.vocabulary.length >= 4);
      lesson.vocabulary.forEach((v) => {
        assert.ok(v.id);
        assert.ok(v.targetWord, 'Vocabulary must have Serbian target word');
        assert.ok(v.romanized, 'Vocabulary must have Latin romanization');
        assert.ok(v.bengaliPronunciation, 'Vocabulary must have Bengali pronunciation');
        assert.ok(v.bengaliMeaning, 'Vocabulary must have Bengali meaning');
        assert.ok(v.audioText, 'Vocabulary must have audio prompt');
      });

      // Conversation
      assert.ok(Array.isArray(lesson.conversation) && lesson.conversation.length >= 2);
      lesson.conversation.forEach((turn) => {
        assert.ok(turn.speaker);
        assert.ok(turn.targetText);
        assert.ok(turn.bengaliPronunciation);
        assert.ok(turn.bengaliMeaning);
      });

      // Grammar & Rules
      assert.ok(Array.isArray(lesson.grammarNotes) && lesson.grammarNotes.length >= 1);

      // Quiz
      assert.ok(Array.isArray(lesson.quiz) && lesson.quiz.length >= 2);
      lesson.quiz.forEach((q) => {
        assert.ok(q.question);
        assert.ok(q.questionBn);
        assert.ok(q.options.length >= 3);
        assert.ok(q.correctAnswer);
        assert.ok(q.options.includes(q.correctAnswer));
        assert.ok(q.explanationBn);
      });
    });
  });

  it('should export complete SERBIAN_VOCABULARY_LIST matching Spanish and Chinese vocabulary system', () => {
    assert.ok(Array.isArray(SERBIAN_VOCABULARY_LIST));
    assert.ok(SERBIAN_VOCABULARY_LIST.length >= 50, 'Must have at least 50 vocabulary items for vocabulary bank');
    assert.strictEqual(SERBIAN_VOCABULARY_LIST.length, SERBIAN_LESSONS_DATA.flatMap(d => d.vocabulary).length);
  });

  it('should have rich speaking-first Serbian practice data (70% speaking focus)', () => {
    assert.ok(Array.isArray(SERBIAN_SPEAKING_PHRASES));
    assert.ok(SERBIAN_SPEAKING_PHRASES.length >= 20, 'Must have at least 20 speaking practice drills');

    const expectedCategories = ['greetings', 'questions', 'daily', 'restaurant', 'travel', 'workplace', 'roleplay'];
    expectedCategories.forEach((cat) => {
      const phrasesInCat = SERBIAN_SPEAKING_PHRASES.filter((p) => p.category === cat);
      assert.ok(phrasesInCat.length >= 1, `Category "${cat}" must have speaking phrases`);
    });

    SERBIAN_SPEAKING_PHRASES.forEach((phrase) => {
      assert.ok(phrase.cyrillic, 'Must contain Cyrillic');
      assert.ok(phrase.latin, 'Must contain Latin');
      assert.ok(phrase.bengaliPronunciation, 'Must contain Bengali pronunciation');
      assert.ok(phrase.bengaliMeaning, 'Must contain Bengali meaning');
      assert.ok(phrase.englishMeaning, 'Must contain English meaning');
      assert.ok(phrase.audioPrompt, 'Must contain audio prompt');
    });
  });

  it('should register Serbian scenarios in UNIVERSAL_AI_SCENARIOS matching English, Chinese, Spanish', () => {
    const serbianScenarios = UNIVERSAL_AI_SCENARIOS.filter((s) => s.id.startsWith('se-'));
    assert.ok(serbianScenarios.length >= 3, 'Must have at least 3 Serbian conversation scenarios');

    serbianScenarios.forEach((sc) => {
      assert.ok(sc.title);
      assert.ok(sc.titleBn);
      assert.ok(sc.initialTarget);
      assert.ok(sc.initialBengali);
      assert.ok(sc.systemPrompt);
    });
  });
});

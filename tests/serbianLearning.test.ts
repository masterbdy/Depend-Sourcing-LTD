import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SERBIAN_LESSONS_DATA } from '../views/LearningAcademy/serbian/serbianLessonsData';
import { SUPPORTED_LANGUAGES, DEFAULT_GLOBAL_SETTINGS } from '../views/LearningAcademy/core/languagesRegistry';

describe('Serbian Learning Academy Course Structure & Content', () => {
  it('should have exactly 12 structured modules as specified in requirements', () => {
    assert.strictEqual(SERBIAN_LESSONS_DATA.length, 12, 'Must contain exactly 12 structured lessons');
    
    const expectedTitles = [
      'Serbian Alphabet (Cyrillic and Latin)',
      'Basic Vocabulary',
      'Greetings and Introductions',
      'Numbers, Days and Months',
      'Everyday Conversations',
      'Grammar Fundamentals',
      'Sentence Formation',
      'Food and Shopping',
      'Travel and Directions',
      'Speaking and Listening',
      'Reading and Writing',
      'Advanced Serbian'
    ];

    SERBIAN_LESSONS_DATA.forEach((lesson, index) => {
      assert.strictEqual(lesson.day, index + 1, `Lesson day must be ${index + 1}`);
      assert.strictEqual(lesson.title, expectedTitles[index], `Lesson title should match: ${expectedTitles[index]}`);
      assert.ok(lesson.titleBn, `Lesson ${index + 1} must have a titleBn in Bengali`);
      assert.ok(lesson.objectiveBn, `Lesson ${index + 1} must have an objectiveBn`);
      assert.ok(lesson.xpReward > 0, `Lesson ${index + 1} must grant XP rewards`);
    });
  });

  it('should provide complete vocabulary with Cyrillic, Latin, Bengali, and English for every module', () => {
    SERBIAN_LESSONS_DATA.forEach((lesson) => {
      assert.ok(Array.isArray(lesson.vocabulary), `Lesson ${lesson.day} vocabulary must be an array`);
      assert.ok(lesson.vocabulary.length >= 4, `Lesson ${lesson.day} must have at least 4 vocabulary items`);

      lesson.vocabulary.forEach((item, vIdx) => {
        assert.ok(item.targetWord && item.targetWord.trim().length > 0, `Lesson ${lesson.day} vocab #${vIdx + 1} must have targetWord`);
        assert.ok(item.romanized && item.romanized.trim().length > 0, `Lesson ${lesson.day} vocab #${vIdx + 1} must have romanized (Latin)`);
        assert.ok(item.bengaliPronunciation && item.bengaliPronunciation.trim().length > 0, `Lesson ${lesson.day} vocab #${vIdx + 1} must have bengali pronunciation`);
        assert.ok(item.bengaliMeaning && item.bengaliMeaning.trim().length > 0, `Lesson ${lesson.day} vocab #${vIdx + 1} must have bengali meaning`);
        assert.ok(item.exampleTarget && item.exampleTarget.trim().length > 0, `Lesson ${lesson.day} vocab #${vIdx + 1} must have example target`);
        assert.ok(item.exampleBengali && item.exampleBengali.trim().length > 0, `Lesson ${lesson.day} vocab #${vIdx + 1} must have example bengali translation`);
      });
    });
  });

  it('should provide grammar notes, practice sentences, dialogues and quizzes for every module', () => {
    SERBIAN_LESSONS_DATA.forEach((lesson) => {
      assert.ok(Array.isArray(lesson.grammarNotes) && lesson.grammarNotes.length > 0, `Lesson ${lesson.day} must have grammar notes`);
      assert.ok(Array.isArray(lesson.practiceSentences) && lesson.practiceSentences.length > 0, `Lesson ${lesson.day} must have practice sentences`);
      assert.ok(Array.isArray(lesson.conversation) && lesson.conversation.length > 0, `Lesson ${lesson.day} must have conversation dialogue`);
      assert.ok(Array.isArray(lesson.quiz) && lesson.quiz.length >= 2, `Lesson ${lesson.day} must have interactive quiz questions`);

      lesson.quiz.forEach((q, qIdx) => {
        assert.ok(q.question, `Lesson ${lesson.day} quiz #${qIdx + 1} question missing`);
        assert.ok(Array.isArray(q.options) && q.options.length >= 3, `Lesson ${lesson.day} quiz #${qIdx + 1} needs >= 3 options`);
        assert.ok(q.correctAnswer && q.correctAnswer.trim().length > 0, `Lesson ${lesson.day} quiz #${qIdx + 1} missing correctAnswer`);
        assert.ok(q.options.includes(q.correctAnswer), `Lesson ${lesson.day} quiz #${qIdx + 1} correctAnswer must be in options`);
        assert.ok(q.explanationBn, `Lesson ${lesson.day} quiz #${qIdx + 1} explanation missing`);
      });
    });
  });

  it('should properly register Serbian in SUPPORTED_LANGUAGES and global settings', () => {
    const serbianLang = SUPPORTED_LANGUAGES.find((lang) => lang.code === 'serbian');
    assert.ok(serbianLang, 'Serbian must be present in SUPPORTED_LANGUAGES with code "serbian"');
    assert.strictEqual(serbianLang?.name, 'Serbian');
    assert.strictEqual(serbianLang?.nativeName, 'Српски');
    assert.strictEqual(serbianLang?.flag, '🇷🇸');
    assert.strictEqual(serbianLang?.voiceLangCode, 'sr-RS');
    assert.strictEqual(DEFAULT_GLOBAL_SETTINGS.languageAvailability.serbian.enabledForEveryone, true, 'Serbian should be enabled for everyone by default');
    assert.strictEqual(DEFAULT_GLOBAL_SETTINGS.languageAvailability.serbian.disabledGlobally, false, 'Serbian should not be disabled globally');
  });
});

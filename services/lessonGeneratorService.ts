import { UniversalDailyLesson, UniversalWord, CourseLevel, CefrLevel } from '../views/LearningAcademy/core/types';

export interface LessonGenerationRequest {
  language: 'english' | 'chinese' | 'spanish' | 'serbian';
  level?: CefrLevel;
  dayNumber: number;
  requestedTopic?: string;
  userWeakTopics?: string[];
  previouslyLearnedWords?: string[];
  existingLessonTitles?: string[];
  learnerNotes?: string;
}

export interface LessonValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  vocabCount: number;
  newWordsCount: number;
  repeatedWordsCount: number;
  sentencesCount: number;
}

// 20 Core Rotating Topics as specified in Part 10
export const ROTATING_LESSON_TOPICS = [
  { id: 'topic-1', en: 'Introducing Yourself & Professional Identity', bn: 'আত্মপরিচয় ও প্রাতিষ্ঠানিক পরিচিতি', cat: 'introduction' },
  { id: 'topic-2', en: 'Meeting People & Social Networking', bn: 'নতুন মানুষের সাথে সাক্ষাৎ ও সামাজিক শিষ্টাচার', cat: 'daily' },
  { id: 'topic-3', en: 'Daily Routine & Time Management', bn: 'দৈনন্দিন রুটিন ও সময় ব্যবস্থাপনা', cat: 'daily' },
  { id: 'topic-4', en: 'Family, Colleagues & Friends', bn: 'পরিবার, সহকর্মী ও বন্ধুত্ব', cat: 'daily' },
  { id: 'topic-5', en: 'Shopping, Pricing & Bargaining', bn: 'কেনাকাটা, দরদাম ও মূল্য নির্ধারণ', cat: 'shopping' },
  { id: 'topic-6', en: 'Food, Cafe & Restaurant Dining', bn: 'খাবার, ক্যাফে ও রেস্তোরাঁয় খাবারের অর্ডার', cat: 'restaurant' },
  { id: 'topic-7', en: 'Travel, Airports & International Flights', bn: 'ভ্রমণ, বিমানবন্দর ও আন্তর্জাতিক ফ্লাইট', cat: 'airport' },
  { id: 'topic-8', en: 'City Transportation & Metro Transit', bn: 'শহরের পরিবহন ও পাতাল রেল যাতায়াত', cat: 'directions' },
  { id: 'topic-9', en: 'Asking Directions & Navigation', bn: 'রাস্তা ও দিকনির্দেশনা চাওয়া', cat: 'directions' },
  { id: 'topic-10', en: 'Hotel Check-In & Accommodation', bn: 'হোটেল চেক-ইন ও সুযোগ-সুবিধা গ্রহণ', cat: 'hotel' },
  { id: 'topic-11', en: 'Telephone & Voice Call Communication', bn: 'টেলিফোন আলাপ ও কল শিষ্টাচার', cat: 'phone' },
  { id: 'topic-12', en: 'Workplace Communication & Daily Standups', bn: 'কর্মক্ষেত্রে যোগাযোগ ও প্রজেক্ট আপডেট', cat: 'office' },
  { id: 'topic-13', en: 'Business Discussions & Sourcing Negotiations', bn: 'বাণিজ্যিক আলোচনা ও সোর্সিং চুক্তি', cat: 'negotiation' },
  { id: 'topic-14', en: 'Expressing Opinions, Agreement & Disagreement', bn: 'মতামত প্রকাশ, সম্মতি ও দ্বিমত পোষণ', cat: 'office' },
  { id: 'topic-15', en: 'Storytelling, Experiences & Reporting', bn: 'অভিজ্ঞতা বর্ণনা ও ঘটনা উপস্থাপন', cat: 'daily' },
  { id: 'topic-16', en: 'Native Expressions, Collocations & Idioms', bn: 'স্থানীয় কথ্য বাগ্ধারা ও স্বাভাবিক বাচনভঙ্গি', cat: 'daily' },
  { id: 'topic-17', en: 'Social Conversations & Cultural Etiquette', bn: 'সামাজিক আড্ডা ও সাংস্কৃতিক আদব-কায়দা', cat: 'daily' },
  { id: 'topic-18', en: 'Emergency Situations, Healthcare & Pharmacy', bn: 'জরুরি পরিস্থিতি, চিকিৎসা ও ফার্মেসি সেবা', cat: 'emergency' },
  { id: 'topic-19', en: 'Listening Challenges & Accent Comprehension', bn: 'শ্রবণ চ্যালেঞ্জ ও ভিন্ন আঞ্চলিক উচ্চারণ', cat: 'office' },
  { id: 'topic-20', en: 'Pronunciation Mastery & Fluent Speaking', bn: 'স্পষ্ট উচ্চারণ মাস্টারক্লাস ও সাবলীল বাচন', cat: 'introduction' },
];

export function getTopicForDay(dayNumber: number, requestedTopic?: string) {
  if (requestedTopic) {
    const found = ROTATING_LESSON_TOPICS.find(t => t.id === requestedTopic || t.en.toLowerCase().includes(requestedTopic.toLowerCase()));
    if (found) return found;
  }
  const index = Math.abs((dayNumber - 1) % ROTATING_LESSON_TOPICS.length);
  return ROTATING_LESSON_TOPICS[index];
}

/**
 * Validates lesson content against duplicate titles, vocabulary quality, and structure rules.
 */
export function validateLessonQuality(
  lesson: UniversalDailyLesson,
  existingTitles: string[] = [],
  previouslyLearnedWords: string[] = []
): LessonValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!lesson.title || lesson.title.trim().length < 3) {
    errors.push('লেসন শিরোনাম অনুপস্থিত বা অত্যন্ত সংক্ষিপ্ত।');
  }

  // Check duplicate titles
  if (existingTitles.some(t => t.toLowerCase().trim() === lesson.title.toLowerCase().trim())) {
    warnings.push(`শিরোনাম "${lesson.title}" পূর্বে ব্যবহৃত হয়েছে।`);
  }

  if (!lesson.vocabulary || !Array.isArray(lesson.vocabulary)) {
    errors.push('ভোকাবুলারি তালিকা অনুপস্থিত।');
  } else {
    if (lesson.vocabulary.length < 8) {
      warnings.push(`ভোকাবুলারি সংখ্যা কম (${lesson.vocabulary.length} টি, ন্যূনতম ১০টি প্রত্যাশিত)।`);
    }

    lesson.vocabulary.forEach((v, i) => {
      if (!v.targetWord) errors.push(`শব্দ #${i + 1}-এ মূল ভাষা শব্দ অনুপস্থিত।`);
      if (!v.bengaliMeaning) errors.push(`শব্দ #${i + 1}-এ বাংলা অর্থ অনুপস্থিত।`);
      if (!v.bengaliPronunciation) errors.push(`শব্দ #${i + 1}-এ বাংলা উচ্চারণ গাইড অনুপস্থিত।`);
    });
  }

  // Count new vs repeated vocabulary
  const lowerPrevWords = new Set(previouslyLearnedWords.map(w => w.toLowerCase().trim()));
  let newWords = 0;
  let repeatedWords = 0;
  (lesson.vocabulary || []).forEach(v => {
    if (v.targetWord && lowerPrevWords.has(v.targetWord.toLowerCase().trim())) {
      repeatedWords++;
    } else {
      newWords++;
    }
  });

  const sentencesCount = (lesson.practiceSentences?.length || 0) + (lesson.conversation?.length || 0);
  if (sentencesCount < 3) {
    warnings.push('অনুশীলন বাক্যের সংখ্যা কম।');
  }

  if (!lesson.grammarNotes || lesson.grammarNotes.length === 0) {
    warnings.push('ব্যাকরণ ও বাক্যগঠন গাইড অনুপস্থিত।');
  }

  if (!lesson.quiz || lesson.quiz.length === 0) {
    warnings.push('মূল্যায়ন কুইজ অনুপস্থিত।');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    vocabCount: lesson.vocabulary?.length || 0,
    newWordsCount: newWords,
    repeatedWordsCount: repeatedWords,
    sentencesCount,
  };
}

/**
 * Builds AI Prompt tailored strictly for the language, CEFR level, and topic.
 */
export function buildLessonPrompt(req: LessonGenerationRequest): string {
  const topic = getTopicForDay(req.dayNumber, req.requestedTopic);
  const level = req.level || 'A1';

  const languageRules: Record<string, string> = {
    chinese: `
Language: Chinese (Mandarin)
- Include Simplified Chinese Characters (targetWord) AND standard Pinyin with tone marks in 'romanized' (e.g. "Nǐ hǎo").
- Every vocabulary and sentence MUST provide phonetic pronunciation guide written in Bengali script.
- Pay attention to 4 tones in pronunciation notes.
`,
    serbian: `
Language: Serbian (Српски)
- Provide Serbian Cyrillic script in targetWord and Latin alphabet in 'romanized' (e.g. "Добар дан (Dobar dan)").
- Provide authentic pronunciation in Bengali script (e.g. "দোবার দান").
- Emphasize practical conversational speaking and case endings used in daily life.
`,
    spanish: `
Language: Spanish (Español)
- Provide clear European/Latin American Spanish in targetWord.
- Provide accurate pronunciation in Bengali script (e.g. "ওলা, বুয়েনোস দিয়াস").
- Focus on useful verbs, everyday phrases, and natural workplace communication.
`,
    english: `
Language: Professional Spoken English
- Focus on natural spoken expressions, corporate meetings, buyer communication, and email etiquette.
- Provide clear Bengali pronunciation guidance and practical context.
`,
  };

  const weakPointsContext = req.userWeakTopics && req.userWeakTopics.length > 0
    ? `The learner has previously struggled with these topics/words: ${req.userWeakTopics.join(', ')}. Include 2-3 of these as spaced revision items in the lesson and clearly reinforce them.`
    : '';

  const avoidWordsContext = req.previouslyLearnedWords && req.previouslyLearnedWords.length > 0
    ? `Previously mastered vocabulary to avoid duplicating (use FRESH new words): ${req.previouslyLearnedWords.slice(-40).join(', ')}.`
    : '';

  return `You are the Master Curriculum Director and AI Language Coach for Depend Sourcing Ltd.
Generate a structured, authentic, practical daily lesson.

Target Language: ${req.language.toUpperCase()}
CEFR Level: ${level}
Day Number: Day ${req.dayNumber}
Topic: ${topic.en} (${topic.bn})
Category: ${topic.cat}

${languageRules[req.language] || ''}
${weakPointsContext}
${avoidWordsContext}

MANDATORY REQUIREMENTS:
1. Lesson Title (English/Target & Bengali).
2. Objective in Bengali explaining what the learner will achieve.
3. 10 to 14 useful vocabulary words/phrases:
   - targetWord (in target language)
   - romanized (Pinyin with tone marks for Chinese; Latin for Serbian; null for Spanish/English)
   - bengaliPronunciation (phonetic guide in Bengali script)
   - bengaliMeaning (meaning in Bengali starting with '=')
   - category
   - exampleTarget (natural sentence using this word)
   - exampleRomanized
   - exampleBengali (Bengali translation of sentence)
   - audioText (clean target text for text-to-speech)
4. Grammar Notes (1-2 practical speaking rules explained in Bengali, with formula and clear examples).
5. Practical Conversation / Dialogue (4-6 realistic turns between speakers, with Bengali pronunciation and meaning).
6. 6-10 Practice Sentences for speaking & listening drill.
7. Interactive Quiz (2-3 questions: MCQ, translation, or listening check with options, correct answer, and explanation in Bengali).
8. Business & Cultural Tip in Bengali (practical insight for international trade, travel, or workplace etiquette).

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "day": ${req.dayNumber},
  "level": "beginner",
  "cefrLevel": "${level}",
  "title": "Topic Title in English / Target",
  "titleBn": "বাংলায় শিরোনাম",
  "objectiveBn": "বাংলায় পাঠের লক্ষ্য ও উদ্দেশ্য",
  "xpReward": 40,
  "vocabulary": [
    {
      "id": "${req.language.slice(0, 2)}-d${req.dayNumber}-v1",
      "targetWord": "word in target language",
      "romanized": "pinyin or latin if applicable",
      "bengaliPronunciation": "বাংলায় উচ্চারণ",
      "bengaliMeaning": "= অর্থ",
      "category": "${topic.cat}",
      "exampleTarget": "Example sentence in target language",
      "exampleRomanized": "romanized example",
      "exampleBengali": "উদাহরণ বাক্যের বাংলা অনুবাদ",
      "audioText": "word in target language"
    }
  ],
  "grammarNotes": [
    {
      "ruleTitleBn": "নিয়মের নাম",
      "explanationBn": "বাংলায় বিস্তারিত ও সহজ ব্যাখ্যা",
      "correctExample": "সঠিক বাক্য",
      "exampleBn": "বাংলা অর্থ"
    }
  ],
  "conversation": [
    {
      "speaker": "Speaker 1",
      "speakerRoleBn": "ভূমিকা (যেমন: বায়ার)",
      "targetText": "Target text",
      "romanized": "romanized text",
      "bengaliPronunciation": "বাংলা উচ্চারণ",
      "bengaliMeaning": "বাংলা অর্থ"
    }
  ],
  "practiceSentences": [
    {
      "target": "Target sentence",
      "romanized": "romanized sentence",
      "pronunciationBn": "উচ্চারণ বাংলায়",
      "meaningBn": "বাংলা অর্থ"
    }
  ],
  "quiz": [
    {
      "id": "${req.language.slice(0, 2)}-q${req.dayNumber}-1",
      "question": "Question in English",
      "questionBn": "বাংলায় প্রশ্ন",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "explanationBn": "ব্যাখ্যা বাংলায়"
    }
  ],
  "businessTipBn": "বাণিজ্যিক ও ব্যবহারিক পরামর্শ"
}`;
}

/**
 * Curated high-quality fallback generator when Gemini API key is offline or unavailable.
 */
export function generateCuratedFallbackLesson(req: LessonGenerationRequest): UniversalDailyLesson {
  const topic = getTopicForDay(req.dayNumber, req.requestedTopic);
  const level = req.level || 'A1';
  const prefix = req.language.slice(0, 2);

  if (req.language === 'serbian') {
    return {
      day: req.dayNumber,
      level: 'beginner',
      cefrLevel: level,
      title: `${topic.en} (Српски језик)`,
      titleBn: `${topic.bn} - সার্বিয়ান দৈনন্দিন পাঠ`,
      objectiveBn: `সার্বিয়ান ভাষায় ${topic.bn.toLowerCase()} নিয়ে সাবলীলভাবে কথা বলা, উচ্চারণ ও প্রয়োজনীয় শব্দভাণ্ডার আয়ত্ত করা।`,
      xpReward: 40,
      vocabulary: [
        {
          id: `${prefix}-d${req.dayNumber}-v1`,
          targetWord: 'Здраво свима!',
          romanized: 'Zdravo svima!',
          bengaliPronunciation: 'জ্দ্রাভো স্ভিমা!',
          bengaliMeaning: '= সবাইকে হ্যালো!',
          category: topic.cat,
          exampleTarget: 'Здраво свима, драго ми је што смо заједно.',
          exampleRomanized: 'Zdravo svima, drago mi je što smo zajedno.',
          exampleBengali: 'সবাইকে হ্যালো, আমরা একসাথে যুক্ত হতে পেরে আনন্দিত।',
          audioText: 'Zdravo svima, drago mi je što smo zajedno',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v2`,
          targetWord: 'Како сте?',
          romanized: 'Kako ste?',
          bengaliPronunciation: 'কাকো স্তে?',
          bengaliMeaning: '= আপনি কেমন আছেন? (সম্মানার্থে)',
          category: topic.cat,
          exampleTarget: 'Добар дан, како сте данас?',
          exampleRomanized: 'Dobar dan, kako ste danas?',
          exampleBengali: 'শুভ দিন, আজ আপনি কেমন আছেন?',
          audioText: 'Dobar dan, kako ste danas',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v3`,
          targetWord: 'Добро сам, хвала',
          romanized: 'Dobro sam, hvala',
          bengaliPronunciation: 'দোব্রো সাম, খাভালা',
          bengaliMeaning: '= আমি ভালো আছি, ধন্যবাদ',
          category: topic.cat,
          exampleTarget: 'Добро сам, хвала на питању.',
          exampleRomanized: 'Dobro sam, hvala na pitanju.',
          exampleBengali: 'আমি ভালো আছি, জিজ্ঞেস করার জন্য ধন্যবাদ।',
          audioText: 'Dobro sam, hvala na pitanju',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v4`,
          targetWord: 'Ја радим у компанији',
          romanized: 'Ja radim u kompaniji',
          bengaliPronunciation: 'য়া রাদিস উ কোম্পানিয়ি',
          bengaliMeaning: '= আমি কোম্পানিতে কাজ করি',
          category: topic.cat,
          exampleTarget: 'Ја радим у компанији Depend Sourcing.',
          exampleRomanized: 'Ja radim u kompaniji Depend Sourcing.',
          exampleBengali: 'আমি ডিপেন্ড সোর্সিং কোম্পানিতে কাজ করি।',
          audioText: 'Ja radim u kompaniji Depend Sourcing',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v5`,
          targetWord: 'Драго ми је',
          romanized: 'Drago mi je',
          bengaliPronunciation: 'দ্রাগো মি য়ে',
          bengaliMeaning: '= আপনার সাথে পরিচিত হয়ে আনন্দিত হলাম',
          category: topic.cat,
          exampleTarget: 'Драго ми је што смо се упознали.',
          exampleRomanized: 'Drago mi je što smo se upoznali.',
          exampleBengali: 'আপনার সাথে পরিচিত হতে পেরে অত্যন্ত আনন্দিত হলাম।',
          audioText: 'Drago mi je što smo se upoznali',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v6`,
          targetWord: 'Договорено',
          romanized: 'Dogovoreno',
          bengaliPronunciation: 'দোগোভোরেনো',
          bengaliMeaning: '= ঠিক আছে / চুক্তি পাকা (Agreed)',
          category: 'negotiation',
          exampleTarget: 'Све је договорено за сутра.',
          exampleRomanized: 'Sve je dogovoreno za sutra.',
          exampleBengali: 'আগামীকালের জন্য সবকিছু ঠিক করা আছে।',
          audioText: 'Sve je dogovoreno za sutra',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v7`,
          targetWord: 'Молим вас',
          romanized: 'Molim vas',
          bengaliPronunciation: 'মোলিম ভাস',
          bengaliMeaning: '= দয়া করে / অনুগ্রহ করে (Please)',
          category: 'polite',
          exampleTarget: 'Молим вас пошаљите ми податке.',
          exampleRomanized: 'Molim vas pošaljite mi podatke.',
          exampleBengali: 'অনুগ্রহ করে আমাকে তথ্যগুলো পাঠান।',
          audioText: 'Molim vas pošaljite mi podatke',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v8`,
          targetWord: 'Хвала пуно',
          romanized: 'Hvala puno',
          bengaliPronunciation: 'খাভালা পুনো',
          bengaliMeaning: '= অনেক ধন্যবাদ (Thank you very much)',
          category: 'polite',
          exampleTarget: 'Хвала пуно на брзом одговору.',
          exampleRomanized: 'Hvala puno na brzom odgovoru.',
          exampleBengali: 'দ্রুত জবাবের জন্য অনেক ধন্যবাদ।',
          audioText: 'Hvala puno na brzom odgovoru',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v9`,
          targetWord: 'Видимо се ускоро',
          romanized: 'Vidimo se uskoro',
          bengaliPronunciation: 'ভিদিমো সে উস্কোরো',
          bengaliMeaning: '= শীঘ্রই দেখা হবে (See you soon)',
          category: 'farewell',
          exampleTarget: 'Пријатно и видимо се ускоро.',
          exampleRomanized: 'Prijatno i vidimo se uskoro.',
          exampleBengali: 'শুভ বিদায় এবং শীঘ্রই দেখা হবে।',
          audioText: 'Prijatno i vidimo se uskoro',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v10`,
          targetWord: 'Тачно на време',
          romanized: 'Tačno na vreme',
          bengaliPronunciation: 'তাচ্নো না ভ্রেমে',
          bengaliMeaning: '= যথাসময়ে / সময়মতো (On time)',
          category: 'business',
          exampleTarget: 'Испорука стиже тачно на време.',
          exampleRomanized: 'Isporuka stiže tačno na vreme.',
          exampleBengali: 'ডেলিভারিটি একদম সময়মতো পৌঁছাবে।',
          audioText: 'Isporuka stiže tačno na vreme',
        }
      ],
      grammarNotes: [
        {
          ruleTitleBn: 'সার্বিয়ান ভাষায় সম্মানসূচক সম্ভাষণ',
          explanationBn: 'একবচনে বন্ধু বা পরিচিতদের "Ти" (তুমি) বলা হয়, কিন্তু অফিসে বা অপরিচিতদের সাথে সবসময় "Ви" (আপনি) এবং ক্রিয়াপদে -те যুক্ত হয় (যেমন: Како сте)।',
          correctExample: 'Како сте ви данас? (Kako ste vi danas?)',
          exampleBn: 'আজ আপনারা / আপনি কেমন আছেন?',
        }
      ],
      conversation: [
        {
          speaker: 'Никола',
          speakerRoleBn: 'সার্বিয়ান পার্টনার',
          targetText: 'Здраво! Добродошли у Београд. Како је прошао лет? (Zdravo! Dobrodošli u Beograd. Kako je prošao let?)',
          romanized: 'Zdravo! Dobrodošli u Beograd. Kako je prošao let?',
          bengaliPronunciation: 'জ্দ্রাভো! দোব্রোদশ্লি উ বেওগ্রাদ। কাকো য়ে প্রোসাও লেত?',
          bengaliMeaning: 'হ্যালো! বেলগ্রেডে স্বাগতম। ফ্লাইট কেমন কেটেছে?'
        },
        {
          speaker: 'Колега',
          speakerRoleBn: 'ডিপেন্ড সোর্সিং প্রতিনিধি',
          targetText: 'Све је било одлично, хвала пуно. Драго ми је што смо се упознали. (Sve je bilo odlično, hvala puno. Drago mi je što smo se upoznali.)',
          romanized: 'Sve je bilo odlično, hvala puno. Drago mi je što smo se upoznali.',
          bengaliPronunciation: 'স্ভে য়ে বিলো অদলিচ্নো, খাভালা পুনো। দ্রাগো মি য়ে সতো স্মো সে উপোজ্নালি।',
          bengaliMeaning: 'সবকিছু খুব ভালো ছিল, অনেক ধন্যবাদ। আপনার সাথে পরিচিত হয়ে আনন্দিত হলাম।'
        }
      ],
      practiceSentences: [
        {
          target: 'Ја учим српски сваког дана. (Ja učim srpski svakog dana.)',
          romanized: 'Ja učim srpski svakog dana.',
          pronunciationBn: 'য়া উচিম সর্প্স্কি স্ভাকোগ দানা।',
          meaningBn: 'আমি প্রতিদিন সার্বিয়ান শিখছি।'
        },
        {
          target: 'Имамо састанак у десет сати. (Imamo sastanak u deset sati.)',
          romanized: 'Imamo sastanak u deset sati.',
          pronunciationBn: 'ইমামো সাস্তানাক উ দেসেত সাতি।',
          meaningBn: 'সকাল দশটায় আমাদের মিটিং আছে।'
        }
      ],
      quiz: [
        {
          id: `${prefix}-q${req.dayNumber}-1`,
          question: 'What does "Хвала пуно" mean in Serbian?',
          questionBn: '"Хвала пуно" (Hvala puno) শব্দের বাংলা অর্থ কী?',
          options: ['অনেক ধন্যবাদ', 'শুভ সকাল', 'বিদায়', 'স্বাগতম'],
          correctAnswer: 'অনেক ধন্যবাদ',
          explanationBn: 'Hvala অর্থ ধন্যবাদ, আর puno অর্থ অনেক।'
        }
      ],
      businessTipBn: 'সার্বিয়ান ব্যবসায়িক সংস্কৃতিতে প্রথম সাক্ষাতে দৃঢ়ভাবে করমর্দন করা এবং চোখে চোখ রেখে কথা বলা পেশাদারিত্বের লক্ষণ।'
    };
  }

  if (req.language === 'chinese') {
    return {
      day: req.dayNumber,
      level: 'beginner',
      cefrLevel: level,
      title: `${topic.en} (中文实用)`,
      titleBn: `${topic.bn} - চাইনিজ প্র্যাকটিক্যাল পাঠ`,
      objectiveBn: `চীনা ভাষায় ${topic.bn.toLowerCase()} নিয়ে ব্যবসায়িক ও দৈনন্দিন যোগাযোগে পিনয়িন ও সঠিক টোন ব্যবহার শিখুন।`,
      xpReward: 40,
      vocabulary: [
        {
          id: `${prefix}-d${req.dayNumber}-v1`,
          targetWord: '大家好',
          romanized: 'Dàjiā hǎo',
          bengaliPronunciation: 'দা চিয়া হাও',
          bengaliMeaning: '= সবাইকে হ্যালো / শুভকামনা',
          category: topic.cat,
          exampleTarget: '大家好，我是孟加拉国的采购经理。',
          exampleRomanized: 'Dàjiā hǎo, wǒ shì Mèngjiālāguó de cǎigòu jīnglǐ.',
          exampleBengali: 'সবাইকে হ্যালো, আমি বাংলাদেশের সোর্সিং ম্যানেজার।',
          audioText: 'Dàjiā hǎo, wǒ shì Mèngjiālāguó de cǎigòu jīnglǐ',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v2`,
          targetWord: '请多关照',
          romanized: 'Qǐng duō guānzhào',
          bengaliPronunciation: 'ছিং দুও কুয়ান চাও',
          bengaliMeaning: '= অনুগ্রহ করে সহযোগিতা করবেন (সহযোগিতা প্রত্যাশা)',
          category: topic.cat,
          exampleTarget: '初次合作，请多关照。',
          exampleRomanized: 'Chūcì hézuò, qǐng duō guānzhào.',
          exampleBengali: 'প্রথমবার কাজের ক্ষেত্রে আপনাদের সহযোগিতা প্রত্যাশা করছি।',
          audioText: 'Chūcì hézuò, qǐng duō guānzhào',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v3`,
          targetWord: '按时交货',
          romanized: 'Ànshí jiāohuò',
          bengaliPronunciation: 'আন শি চিয়াও হুও',
          bengaliMeaning: '= সময়মতো পণ্য ডেলিভারি দেওয়া',
          category: 'business',
          exampleTarget: '工厂保证按时交货。',
          exampleRomanized: 'Gōngchǎng bǎozhèng ànshí jiāohuò.',
          exampleBengali: 'ফ্যাক্টরি সময়মতো ডেলিভারির নিশ্চয়তা দিয়েছে।',
          audioText: 'Gōngchǎng bǎozhèng ànshí jiāohuò',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v4`,
          targetWord: '面料成分',
          romanized: 'Miànliào chéngfèn',
          bengaliPronunciation: 'মিয়ান লিয়াও ছং ফান',
          bengaliMeaning: '= কাপড়ের কম্পোজিশন বা উপাদান',
          category: 'textile',
          exampleTarget: '请提供面料成分报告。',
          exampleRomanized: 'Qǐng tígōng miànliào chéngfèn bàogào.',
          exampleBengali: 'অনুগ্রহ করে ফ্যাব্রিক কম্পোজিশন রিপোর্ট সরবরাহ করুন।',
          audioText: 'Qǐng tígōng miànliào chéngfèn bàogào',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v5`,
          targetWord: '确认订单',
          romanized: 'Quèrèn dìngdān',
          bengaliPronunciation: 'ছুয়েরেন তিংদান',
          bengaliMeaning: '= অর্ডার কনফার্ম বা নিশ্চিত করা',
          category: 'business',
          exampleTarget: '我们今天确认订单。',
          exampleRomanized: 'Wǒmen jīntiān quèrèn dìngdān.',
          exampleBengali: 'আমরা আজই অর্ডার কনফার্ম করব।',
          audioText: 'Wǒmen jīntiān quèrèn dìngdān',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v6`,
          targetWord: '没问题',
          romanized: 'Méi wèntí',
          bengaliPronunciation: 'মেই ওয়েন থি',
          bengaliMeaning: '= কোনো সমস্যা নেই (No problem)',
          category: 'daily',
          exampleTarget: '这个交期没问题。',
          exampleRomanized: 'Zhège jiāoqī méi wèntí.',
          exampleBengali: 'এই ডেলিভারি তারিখে কোনো সমস্যা নেই।',
          audioText: 'Zhège jiāoqī méi wèntí',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v7`,
          targetWord: '非常感谢',
          romanized: 'Fēicháng gǎnxiè',
          bengaliPronunciation: 'ফেই ছাং কান শিয়ে',
          bengaliMeaning: '= অনেক অনেক ধন্যবাদ',
          category: 'polite',
          exampleTarget: '非常感谢您的支持。',
          exampleRomanized: 'Fēicháng gǎnxiè nín de zhīchí.',
          exampleBengali: 'আপনার সমর্থনের জন্য অনেক ধন্যবাদ।',
          audioText: 'Fēicháng gǎnxiè nín de zhīchí',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v8`,
          targetWord: '质量第一',
          romanized: 'Zhìliàng dìyī',
          bengaliPronunciation: 'চিলিয়াং তি ই',
          bengaliMeaning: '= মানই প্রথম অগ্রাধিকার (Quality first)',
          category: 'quality',
          exampleTarget: '我们始终坚持质量第一。',
          exampleRomanized: 'Wǒmen shǐzhōng jiānchí zhìliàng dìyī.',
          exampleBengali: 'আমরা সর্বদা মানকে প্রথম প্রাধান্য দেই।',
          audioText: 'Wǒmen shǐzhōng jiānchí zhìliàng dìyī',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v9`,
          targetWord: '长期合作',
          romanized: 'Chángqī hézuò',
          bengaliPronunciation: 'ছাং ছি খ্য জুও',
          bengaliMeaning: '= দীর্ঘমেয়াদী ব্যবসায়িক অংশীদারিত্ব',
          category: 'business',
          exampleTarget: '期待与贵司长期合作。',
          exampleRomanized: 'Qīdài yǔ guìsī chángqī hézuò.',
          exampleBengali: 'আপনাদের প্রতিষ্ঠানের সাথে দীর্ঘমেয়াদী কাজের প্রত্যাশা করছি।',
          audioText: 'Qīdài yǔ guìsī chángqī hézuò',
        },
        {
          id: `${prefix}-d${req.dayNumber}-v10`,
          targetWord: '保持联系',
          romanized: 'Bǎochí liánxì',
          bengaliPronunciation: 'পাও ছি লিয়ান শি',
          bengaliMeaning: '= যোগাযোগ অব্যাহত রাখা (Stay in touch)',
          category: 'daily',
          exampleTarget: '我们微信保持联系。',
          exampleRomanized: 'Wǒmen Wēixìn bǎochí liánxì.',
          exampleBengali: 'আমরা উইচ্যাটে যোগাযোগ বজায় রাখব।',
          audioText: 'Wǒmen Wēixìn bǎochí liánxì',
        }
      ],
      grammarNotes: [
        {
          ruleTitleBn: 'চীনা ভাষায় "请" (Qǐng) দিয়ে ভদ্র অনুরোধ প্রকাশ',
          explanationBn: 'কোনো অনুরোধ বা নির্দেশের আগে 请 (অনুগ্রহ করে) বসালে বাক্যটি অত্যন্ত মার্জিত হয় (যেমন: 请坐 = বসুন, 请看 = দেখুন)।',
          correctExample: '请给我发邮件。 (Qǐng gěi wǒ fā yóujiàn.)',
          exampleBn: 'অনুগ্রহ করে আমাকে ইমেইল পাঠান।',
        }
      ],
      conversation: [
        {
          speaker: '陈经理',
          speakerRoleBn: 'ফ্যাক্টরি ম্যানেজার',
          targetText: '你好！面料检测已经完成，色牢度达标。',
          romanized: 'Nǐ hǎo! Miànliào jiǎncè yǐjīng wánchéng, sèláodù dābiāo.',
          bengaliPronunciation: 'নি হাও! মিয়ান লিয়াও চিয়ানসে ইচিং ওয়ানছং, স্যলাওতু তা পিয়াও।',
          bengaliMeaning: 'হ্যালো! ফ্যাব্রিক টেস্ট সম্পন্ন হয়েছে, রঙের স্থায়িত্ব মানসম্পন্ন।'
        },
        {
          speaker: '采购员',
          speakerRoleBn: 'ডিপেন্ড সোর্সিং প্রতিনিধি',
          targetText: '太好了，请安排下周装柜发运。',
          romanized: 'Tài hǎo le, qǐng ānpái xià zhōu zhuāngguì fāyùn.',
          bengaliPronunciation: 'থাই হাও ল্য, ছিং আনফাই শিয়া চৌ চুয়াংকুয়েই ফা ইউন।',
          bengaliMeaning: 'খুব ভালো! অনুগ্রহ করে আগামী সপ্তাহে কনটেইনার লোডিং ও শিপমেন্টের ব্যবস্থা করুন।'
        }
      ],
      practiceSentences: [
        {
          target: '我们对品质非常满意。 (Wǒmen duì pǐnzhì fēicháng mǎnyì.)',
          romanized: 'Wǒmen duì pǐnzhì fēicháng mǎnyì.',
          pronunciationBn: 'ওমেন তুই ফিন চি ফেই ছাং মান ই।',
          meaningBn: 'আমরা কোয়ালিটি নিয়ে অত্যন্ত সন্তুষ্ট।'
        }
      ],
      quiz: [
        {
          id: `${prefix}-q${req.dayNumber}-1`,
          question: 'What does "没问题" (Méi wèntí) mean?',
          questionBn: '"没问题" (Méi wèntí) এর অর্থ কী?',
          options: ['কোনো সমস্যা নেই (No problem)', 'অর্ডার বাতিল', 'দেরি হবে', 'দাম বেশি'],
          correctAnswer: 'কোনো সমস্যা নেই (No problem)',
          explanationBn: 'Méi wèntí অর্থ কোনো সমস্যা নেই।'
        }
      ],
      businessTipBn: 'চীনা বায়ার ও সাপ্লায়ারদের সাথে কাজ করার সময় উইচ্যাটে দ্রুত আপডেট দেওয়া বিশ্বস্ততা বৃদ্ধির অন্যতম প্রধান শর্ত।'
    };
  }

  // Spanish & English Defaults follow similar pattern
  return {
    day: req.dayNumber,
    level: 'beginner',
    cefrLevel: level,
    title: `${topic.en} (${req.language === 'spanish' ? 'Español' : 'English'})`,
    titleBn: `${topic.bn} - ব্যবহারিক পাঠ`,
    objectiveBn: `${req.language === 'spanish' ? 'স্প্যানিশ' : 'ইংরেজি'} ভাষায় ${topic.bn.toLowerCase()} নিয়ে কার্যকর যোগাযোগ নিশ্চিত করা।`,
    xpReward: 40,
    vocabulary: [
      {
        id: `${prefix}-d${req.dayNumber}-v1`,
        targetWord: req.language === 'spanish' ? 'Mucho gusto' : 'Pleased to meet you',
        bengaliPronunciation: req.language === 'spanish' ? 'মুচো গুস্তো' : 'প্লিজড টু মিট ইউ',
        bengaliMeaning: '= আপনার সাথে পরিচিত হয়ে আনন্দিত',
        category: topic.cat,
        exampleTarget: req.language === 'spanish' ? 'Mucho gusto en conocerle.' : 'Pleased to meet you in person.',
        exampleBengali: 'সরাসরি পরিচিত হতে পেরে ভালো লাগল।',
        audioText: req.language === 'spanish' ? 'Mucho gusto en conocerle' : 'Pleased to meet you in person',
      },
      {
        id: `${prefix}-d${req.dayNumber}-v2`,
        targetWord: req.language === 'spanish' ? 'De acuerdo' : 'Agreed / Confirmed',
        bengaliPronunciation: req.language === 'spanish' ? 'দে আকুয়ের্দো' : 'এগ্রিড / কনফার্মড',
        bengaliMeaning: '= একমত / ঠিক আছে',
        category: 'business',
        exampleTarget: req.language === 'spanish' ? 'Estamos de acuerdo con la oferta.' : 'We are agreed with the commercial offer.',
        exampleBengali: 'আমরা বাণিজ্যিক প্রস্তাবের সাথে একমত।',
        audioText: req.language === 'spanish' ? 'Estamos de acuerdo con la oferta' : 'We are agreed with the commercial offer',
      },
      {
        id: `${prefix}-d${req.dayNumber}-v3`,
        targetWord: req.language === 'spanish' ? 'El plazo de entrega' : 'Delivery timeline',
        bengaliPronunciation: req.language === 'spanish' ? 'এল প্লাসো দে এনত্রেগা' : 'ডেলিভারি টাইমলাইন',
        bengaliMeaning: '= পণ্য সরবরাহের সময়সীমা',
        category: 'logistics',
        exampleTarget: req.language === 'spanish' ? 'El plazo de entrega es puntual.' : 'The delivery timeline is strictly maintained.',
        exampleBengali: 'ডেলিভারি সময়সীমা যথাযথভাবে রক্ষা করা হয়।',
        audioText: req.language === 'spanish' ? 'El plazo de entrega es puntual' : 'The delivery timeline is strictly maintained',
      },
      {
        id: `${prefix}-d${req.dayNumber}-v4`,
        targetWord: req.language === 'spanish' ? 'Muchas gracias' : 'Thank you very much',
        bengaliPronunciation: req.language === 'spanish' ? 'মুচাস গ্রাসিয়াস' : 'থ্যাঙ্ক ইউ ভেরি মাচ',
        bengaliMeaning: '= অনেক ধন্যবাদ',
        category: 'polite',
        exampleTarget: req.language === 'spanish' ? 'Muchas gracias por su colaboración.' : 'Thank you very much for your cooperation.',
        exampleBengali: 'আপনার সহযোগিতার জন্য অনেক ধন্যবাদ।',
        audioText: req.language === 'spanish' ? 'Muchas gracias por su colaboración' : 'Thank you very much for your cooperation',
      },
      {
        id: `${prefix}-d${req.dayNumber}-v5`,
        targetWord: req.language === 'spanish' ? 'Hasta pronto' : 'See you soon',
        bengaliPronunciation: req.language === 'spanish' ? 'আস্তা প্রোনতো' : 'সি ইউ সুন',
        bengaliMeaning: '= শীঘ্রই দেখা হবে',
        category: 'farewell',
        exampleTarget: req.language === 'spanish' ? 'Hasta pronto, que tenga buen día.' : 'See you soon, have a productive day.',
        exampleBengali: 'শীঘ্রই দেখা হবে, আপনার দিনটি ভালো কাটুক।',
        audioText: req.language === 'spanish' ? 'Hasta pronto, que tenga buen día' : 'See you soon, have a productive day',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'কর্মক্ষেত্রে স্বাভাবিক ও মার্জিত বাক্য গঠন',
        explanationBn: 'আন্তর্জাতিক বাণিজ্যে সরাসরি আদেশের চেয়ে বিনম্র অনুরোধ বাক্য ক্রেতাদের দৃষ্টি আকর্ষণ করে।',
        correctExample: req.language === 'spanish' ? '¿Podría enviarnos los detalles?' : 'Could you please share the shipment details?',
        exampleBn: 'অনুগ্রহ করে শিপমেন্টের বিস্তারিত কি পাঠাবেন?',
      }
    ],
    conversation: [
      {
        speaker: 'Client',
        speakerRoleBn: 'ক্লায়েন্ট',
        targetText: req.language === 'spanish' ? 'Buenos días, ¿cuál es el estado del pedido?' : 'Good morning, what is the current production status?',
        bengaliPronunciation: req.language === 'spanish' ? 'বুয়েনোস দিয়াস, কুয়াল এস এল এসতাদো দেল পেদিদো?' : 'গুড মর্নিং, হোয়াট ইজ দ্য কারেন্ট প্রোডাকশন স্ট্যাটাস?',
        bengaliMeaning: 'শুভ সকাল, অর্ডারের বর্তমান অবস্থা কী?'
      },
      {
        speaker: 'Manager',
        speakerRoleBn: 'ম্যানেজার',
        targetText: req.language === 'spanish' ? 'Todo avanza según lo programado, sin demoras.' : 'Everything is progressing on schedule with zero delays.',
        bengaliPronunciation: req.language === 'spanish' ? 'তদো আভানসা সেগুন লো প্রোগ্রামাদো, সিন দেমোরাস।' : 'এভরিথিং ইজ প্রোগ্রেসিং অন শিডিউল উইথ জিরো ডিলেইস।',
        bengaliMeaning: 'কোনো বিলম্ব ছাড়াই শিডিউল অনুযায়ী কাজ এগোচ্ছে।'
      }
    ],
    practiceSentences: [
      {
        target: req.language === 'spanish' ? 'Garantizamos la mejor calidad.' : 'We guarantee premium export quality.',
        pronunciationBn: req.language === 'spanish' ? 'গারান্তিসামোস লা মেহোর কালিদাদ।' : 'উই গ্যারান্টি প্রিমিয়াম এক্সপোর্ট কোয়ালিটি।',
        meaningBn: 'আমরা সর্বোচ্চ রপ্তানি মান নিশ্চিত করছি।'
      }
    ],
    quiz: [
      {
        id: `${prefix}-q${req.dayNumber}-1`,
        question: req.language === 'spanish' ? 'What does "De acuerdo" mean?' : 'What does "Pleased to meet you" mean?',
        questionBn: 'বাক্যাংশটির বাংলা অর্থ কী?',
        options: ['একমত / ঠিক আছে', 'না / অসম্মতি', 'দেরি হবে', 'অর্ডার বাতিল'],
        correctAnswer: 'একমত / ঠিক আছে',
        explanationBn: 'এটি সম্মতিসূচক বাক্যাংশ।'
      }
    ],
    businessTipBn: 'বায়ারদের সাথে নিয়মিত লিখিত যোগাযোগ ও দ্রুত জবাব দেওয়া ব্যবসায়িক সমঝোতার মূল চাবিকাঠি।'
  };
}

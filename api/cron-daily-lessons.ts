// Vercel Serverless Function & Cron Job: /api/cron-daily-lessons.ts
// Automatically triggers daily lesson generation for all 4 supported languages
import { generateCuratedFallbackLesson, getTopicForDay } from '../services/lessonGeneratorService.js';

const SUPPORTED_LANGUAGES = ['english', 'chinese', 'spanish', 'serbian'] as const;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Determine target day number based on epoch day or query param
    const queryDay = req.query?.day ? parseInt(req.query.day, 10) : undefined;
    const baseDate = new Date('2025-01-01T00:00:00Z').getTime();
    const dayNumber = queryDay && queryDay > 0 
      ? queryDay 
      : 13 + Math.floor((Date.now() - baseDate) / (1000 * 60 * 60 * 24)) % 100;

    const topic = getTopicForDay(dayNumber);
    const results: Record<string, any> = {};

    for (const lang of SUPPORTED_LANGUAGES) {
      const lesson = generateCuratedFallbackLesson({
        language: lang,
        dayNumber,
        level: 'A1',
      });
      results[lang] = {
        day: lesson.day,
        title: lesson.title,
        titleBn: lesson.titleBn,
        vocabCount: lesson.vocabulary?.length || 0,
        xpReward: lesson.xpReward,
      };
    }

    return res.status(200).json({
      success: true,
      message: `Daily lessons successfully generated for Day ${dayNumber}`,
      dayNumber,
      topic: {
        en: topic.en,
        bn: topic.bn,
        category: topic.cat,
      },
      languagesProcessed: SUPPORTED_LANGUAGES,
      results,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[cron-daily-lessons] Error during daily lesson generation:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate scheduled daily lessons',
    });
  }
}

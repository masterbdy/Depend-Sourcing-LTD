import { CompanyDictionaryEntry, INITIAL_COMPANY_DICTIONARY, SpellCheckSuggestion } from './companyDictionary';

// Local storage key for dictionary
const DICTIONARY_STORAGE_KEY = 'ais_company_dictionary_v2';
const SETTINGS_STORAGE_KEY = 'ais_spell_checker_settings';

export interface SpellCheckerSettings {
  enabled: boolean;
  banglishEnabled: boolean;
  autoSuggest: boolean; // if false, user triggers with a button
}

export const DEFAULT_SPELL_SETTINGS: SpellCheckerSettings = {
  enabled: true,
  banglishEnabled: true,
  autoSuggest: false, // Manual checking only (triggered by user button click)
};

// Helper to get active company dictionary
export const getStoredCompanyDictionary = (): CompanyDictionaryEntry[] => {
  try {
    const saved = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_COMPANY_DICTIONARY;
};

export const saveCompanyDictionary = (dict: CompanyDictionaryEntry[]) => {
  try {
    localStorage.setItem(DICTIONARY_STORAGE_KEY, JSON.stringify(dict));
  } catch (e) {
    console.error('Failed to save company dictionary', e);
  }
};

export const getSpellCheckerSettings = (): SpellCheckerSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) return { ...DEFAULT_SPELL_SETTINGS, ...JSON.parse(saved), autoSuggest: false };
  } catch {}
  return DEFAULT_SPELL_SETTINGS;
};

export const saveSpellCheckerSettings = (settings: SpellCheckerSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save spell checker settings', e);
  }
};

// High-performance Levenshtein distance for fuzzy matching (zero 2D-array heap allocation)
export const getLevenshteinDistance = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  let prev = new Int16Array(n + 1);
  let curr = new Int16Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const codeA = aLower.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = codeA === bLower.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n];
};

// Detect dominant script or language
export const detectInputLanguage = (text: string): 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED' => {
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  if (hasBengali && hasEnglish) return 'MIXED';
  if (hasBengali) return 'BANGLA';
  if (!hasEnglish) return 'MIXED';

  // For Latin text: Check if it looks like Banglish (common Bengali phonetic patterns)
  const banglishPatterns = /\b(khoroch|khoroc|nasta|nashta|jatayat|riksa|vara|bhara|kena|kinar|lagbe|asche|basa|dijel|taka|bhaara|dokan|bari|gari|bhai|apna|amra|tumi|apni|korchi|korechi|hobe|hobena|er|te|theke|ar)\b/i;
  if (banglishPatterns.test(text)) {
    return 'BANGLISH';
  }

  return 'ENGLISH';
};

// Check text offline against dictionary
export const checkTextOffline = (
  text: string,
  dictionary: CompanyDictionaryEntry[],
  settings: SpellCheckerSettings = DEFAULT_SPELL_SETTINGS
): SpellCheckSuggestion[] => {
  if (!settings.enabled || !text || text.trim().length < 2) return [];

  const suggestions: SpellCheckSuggestion[] = [];
  const normalizedText = text.trim();
  const lang = detectInputLanguage(normalizedText);

  // 1. Check exact whole-phrase match first (e.g., 'jatayat khoroch')
  for (const entry of dictionary) {
    if (!entry.isApproved) continue;
    if (entry.language === 'BANGLISH' && !settings.banglishEnabled) continue;
    // If the word is already identical to suggestion, it is already correct - do not suggest
    if (entry.word.trim().toLowerCase() === entry.suggestion.trim().toLowerCase()) continue;

    const regex = new RegExp(`(^|\\s)(${escapeRegExp(entry.word)})(\\s|$)`, 'i');
    if (regex.test(normalizedText)) {
      if (!suggestions.some((s) => s.originalWord.toLowerCase() === entry.word.toLowerCase())) {
        suggestions.push({
          id: `off-phrase-${entry.id}-${Date.now()}`,
          originalWord: entry.word,
          suggestedText: entry.suggestion,
          source: 'DICTIONARY',
          language: entry.language,
          explanationBn: `কোম্পানি ডিকশনারি অনুযায়ী "${entry.word}" এর সঠিক রূপ।`,
          confidence: 0.95,
        });
      }
    }
  }

  // 2. Tokenize words (ignoring numbers & financial values)
  const words = normalizedText
    .split(/[\s,\-\.\/?!;'":\(\)\[\]{}|\\_]+/)
    .filter((w) => w && w.length >= 2 && !/^[০-৯0-9.,+৳$]+$/.test(w));

  for (const word of words) {
    const lowerWord = word.toLowerCase();

    // Look for exact word in dictionary
    const exactMatch = dictionary.find(
      (e) => e.isApproved && e.word.toLowerCase() === lowerWord
    );
    if (exactMatch) {
      if (exactMatch.suggestion.toLowerCase() !== lowerWord) {
        if (!suggestions.some((s) => s.originalWord.toLowerCase() === lowerWord)) {
          suggestions.push({
            id: `off-exact-${exactMatch.id}-${Date.now()}`,
            originalWord: word,
            suggestedText: exactMatch.suggestion,
            source: 'DICTIONARY',
            language: exactMatch.language,
            explanationBn: `ডিকশনারি ম্যাচ: "${exactMatch.suggestion}"`,
            confidence: 0.95,
          });
        }
      }
      continue;
    }

    // Look for close fuzzy match in dictionary
    for (const entry of dictionary) {
      if (!entry.isApproved) continue;
      if (entry.language === 'BANGLISH' && !settings.banglishEnabled) continue;
      // If the word is already identical to the suggestion, it is already correct
      if (entry.suggestion.toLowerCase() === lowerWord) continue;
      if (entry.word.toLowerCase() === lowerWord) continue;

      const target = entry.word.toLowerCase();
      // Only fuzzy match if length difference is small
      if (Math.abs(target.length - lowerWord.length) <= 2) {
        const dist = getLevenshteinDistance(lowerWord, target);
        const maxDist = lowerWord.length > 5 ? 2 : 1;
        if (dist > 0 && dist <= maxDist) {
          if (!suggestions.some((s) => s.originalWord.toLowerCase() === lowerWord)) {
            suggestions.push({
              id: `off-fuzzy-${entry.id}-${Date.now()}`,
              originalWord: word,
              suggestedText: entry.suggestion,
              source: 'DICTIONARY',
              language: entry.language,
              explanationBn: `কাছাকাছি পরিচিত শব্দ: "${entry.suggestion}"`,
              confidence: 0.8,
            });
          }
          break;
        }
      }
    }
  }

  return suggestions;
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// In-memory client-side cache for fast AI and offline spell check lookup
const spellCheckClientCache = new Map<
  string,
  {
    detectedLanguage: 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED';
    fullSentenceSuggestions: string[];
    wordSuggestions: SpellCheckSuggestion[];
    isFallback: boolean;
    timestamp: number;
  }
>();

// Online AI Spell Check Caller with AbortSignal support and in-memory cache
export const checkTextWithAI = async (
  text: string,
  settings: SpellCheckerSettings = DEFAULT_SPELL_SETTINGS,
  dictionary: CompanyDictionaryEntry[] = [],
  signal?: AbortSignal
): Promise<{
  detectedLanguage: 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED';
  fullSentenceSuggestions: string[];
  wordSuggestions: SpellCheckSuggestion[];
  isFallback: boolean;
}> => {
  const offlineResults = checkTextOffline(text, dictionary, settings);
  const detectedLang = detectInputLanguage(text);

  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length < 3) {
    return {
      detectedLanguage: detectedLang,
      fullSentenceSuggestions: [],
      wordSuggestions: offlineResults,
      isFallback: true,
    };
  }

  // Check cache first (valid for 5 minutes)
  const cacheKey = `${trimmed.toLowerCase()}_${settings.banglishEnabled}`;
  const cached = spellCheckClientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return {
      detectedLanguage: cached.detectedLanguage,
      fullSentenceSuggestions: cached.fullSentenceSuggestions,
      wordSuggestions: cached.wordSuggestions,
      isFallback: cached.isFallback,
    };
  }

  // If already aborted before start, exit immediately
  if (signal?.aborted) {
    return {
      detectedLanguage: detectedLang,
      fullSentenceSuggestions: [],
      wordSuggestions: offlineResults,
      isFallback: true,
    };
  }

  try {
    const internalController = new AbortController();
    const timeoutId = setTimeout(() => internalController.abort(), 4000);

    // If caller provided a signal, listen to it to abort internalController
    if (signal) {
      signal.addEventListener('abort', () => internalController.abort(), { once: true });
    }

    const res = await fetch('/api/spell-checker/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        detectedLanguage: detectedLang,
        banglishEnabled: settings.banglishEnabled,
        companyKeywords: dictionary.filter((d) => d.isApproved).map((d) => d.suggestion),
      }),
      signal: internalController.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const aiWordSuggestions: SpellCheckSuggestion[] = Array.isArray(data.wordSuggestions)
        ? data.wordSuggestions
        : [];

      // Combine AI suggestions with offline dictionary suggestions (prioritize dictionary)
      const merged: SpellCheckSuggestion[] = [...offlineResults];
      for (const aiS of aiWordSuggestions) {
        if (!merged.some((m) => m.originalWord.toLowerCase() === aiS.originalWord.toLowerCase())) {
          merged.push(aiS);
        }
      }

      const result = {
        detectedLanguage: (data.detectedLanguage || detectedLang) as 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED',
        fullSentenceSuggestions: Array.isArray(data.fullSentenceSuggestions)
          ? data.fullSentenceSuggestions
          : [],
        wordSuggestions: merged,
        isFallback: false,
      };

      // Save to client cache
      spellCheckClientCache.set(cacheKey, {
        ...result,
        timestamp: Date.now(),
      });

      return result;
    }
  } catch (err: any) {
    // If request was aborted because user typed new text, smoothly exit
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        detectedLanguage: detectedLang,
        fullSentenceSuggestions: [],
        wordSuggestions: offlineResults,
        isFallback: true,
      };
    }
    // API failed or timeout - smoothly fallback to offline dictionary
    console.warn('AI Spell check request failed, falling back to local dictionary', err);
  }

  return {
    detectedLanguage: detectedLang,
    fullSentenceSuggestions: [],
    wordSuggestions: offlineResults,
    isFallback: true,
  };
};

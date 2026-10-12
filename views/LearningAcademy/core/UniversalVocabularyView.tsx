import React, { useState } from 'react';
import {
  BookmarkCheck,
  Bookmark,
  Volume2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Search,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { UniversalWord, LanguageConfig } from './types';

interface UniversalVocabularyViewProps {
  langConfig: LanguageConfig;
  vocabulary: UniversalWord[];
  masteredIds: string[];
  onMarkMastered: (wordId: string) => void;
  speakText: (text: string, langCode: string) => void;
  isSpeaking: boolean;
}

export const UniversalVocabularyView: React.FC<UniversalVocabularyViewProps> = ({
  langConfig,
  vocabulary,
  masteredIds,
  onMarkMastered,
  speakText,
  isSpeaking,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'flashcards'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flashcards state
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const categories = Array.from(new Set(vocabulary.map((w) => w.category)));

  const filteredWords = vocabulary.filter((w) => {
    if (selectedCategory !== 'all' && w.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.targetWord.toLowerCase().includes(q) ||
        (w.romanized && w.romanized.toLowerCase().includes(q)) ||
        w.bengaliPronunciation.includes(q) ||
        w.bengaliMeaning.includes(q)
      );
    }
    return true;
  });

  const currentWord = filteredWords[flashcardIdx] || filteredWords[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-amber-500" />
            <span>
              {langConfig.flag} {langConfig.name} শব্দভাণ্ডার (Vocabulary Bank)
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            বাংলা উচ্চারণ, বাংলা অর্থ ও বাস্তব উদাহরণসহ শব্দ মুখস্থ ও ফ্ল্যাশকার্ড অনুশীলন।
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            শব্দ তালিকা ({vocabulary.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('flashcards');
              setFlashcardIdx(0);
              setIsFlipped(false);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            ফ্ল্যাশকার্ড মোড
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="শব্দ, উচ্চারণ বা বাংলা অর্থ দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            সকল ক্যাটাগরি
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* BROWSE LIST VIEW */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((w) => {
            const isMastered = masteredIds.includes(w.id);

            return (
              <div
                key={w.id}
                className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between space-y-3 hover:border-amber-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xl font-black text-gray-900 dark:text-white">
                        {w.targetWord}
                      </span>
                      {w.romanized && (
                        <p className="text-xs text-amber-600 font-semibold">{w.romanized}</p>
                      )}
                    </div>

                    <button
                      onClick={() => speakText(w.audioText, langConfig.voiceLangCode)}
                      className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      উচ্চারণ: {w.bengaliPronunciation}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      অর্থ: {w.bengaliMeaning}
                    </p>
                  </div>

                  {w.exampleTarget && (
                    <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">
                        {w.exampleTarget}
                      </p>
                      <p className="mt-0.5">{w.exampleBengali}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500">
                    {w.category}
                  </span>

                  <button
                    onClick={() => onMarkMastered(w.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                      isMastered
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isMastered ? 'মুখস্থ হয়েছে' : 'মুখস্থ মার্ক করুন'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FLASHCARD MODE */}
      {activeTab === 'flashcards' && currentWord && (
        <div className="max-w-md mx-auto space-y-6">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[300px] bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col items-center justify-center text-center transition-all hover:scale-[1.01] active:scale-95"
          >
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-wider">
              {isFlipped ? 'বাংলা অর্থ ও উচ্চারণ' : 'টার্গেট ল্যাঙ্গুয়েজ শব্দ (ট্যাপ করে উল্টান)'}
            </span>

            {!isFlipped ? (
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                  {currentWord.targetWord}
                </h3>
                {currentWord.romanized && (
                  <p className="text-sm font-bold text-amber-600">{currentWord.romanized}</p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(currentWord.audioText, langConfig.voiceLangCode);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-xs font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5" /> শুনুন
                </button>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-base font-black text-amber-600">
                  {currentWord.bengaliPronunciation}
                </p>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">
                  {currentWord.bengaliMeaning}
                </h4>
                {currentWord.exampleTarget && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs text-gray-600 dark:text-gray-300 text-left">
                    <p className="font-bold">{currentWord.exampleTarget}</p>
                    <p className="text-gray-500 mt-0.5">{currentWord.exampleBengali}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flashcard Controls */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                setFlashcardIdx((prev) => (prev > 0 ? prev - 1 : filteredWords.length - 1));
                setIsFlipped(false);
              }}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-gray-500">
              {flashcardIdx + 1} / {filteredWords.length}
            </span>

            <button
              onClick={() => {
                setFlashcardIdx((prev) => (prev < filteredWords.length - 1 ? prev + 1 : 0));
                setIsFlipped(false);
              }}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

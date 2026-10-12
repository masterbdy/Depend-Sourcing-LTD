import React, { useState } from 'react';
import {
  BookmarkCheck,
  Bookmark,
  Volume2,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { VocabularyWord } from './types';
import { VOCABULARY_DATA } from './vocabularyData';

interface VocabularyBuilderViewProps {
  savedWordIds: string[];
  masteredWordIds: string[];
  needPracticeWordIds: string[];
  onToggleSaveWord: (wordId: string) => void;
  onMarkWordMastered: (wordId: string) => void;
  onMarkWordNeedPractice: (wordId: string) => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
}

export const VocabularyBuilderView: React.FC<VocabularyBuilderViewProps> = ({
  savedWordIds,
  masteredWordIds,
  needPracticeWordIds,
  onToggleSaveWord,
  onMarkWordMastered,
  onMarkWordNeedPractice,
  speakText,
  isSpeaking,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'flashcards' | 'saved'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flashcard Mode State
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Filtered Words
  const filteredWords = VOCABULARY_DATA.filter((w) => {
    if (activeTab === 'saved' && !savedWordIds.includes(w.id)) {
      return false;
    }
    if (selectedCategory !== 'all' && w.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.word.toLowerCase().includes(q) ||
        w.meaningBn.includes(q) ||
        w.explanationBn.includes(q)
      );
    }
    return true;
  });

  const currentFlashcard = filteredWords[flashcardIndex] || filteredWords[0];

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    setFlashcardIndex((prev) => (prev + 1) % Math.max(1, filteredWords.length));
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    setFlashcardIndex((prev) => (prev - 1 + filteredWords.length) % Math.max(1, filteredWords.length));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ভোকাবুলারি বিল্ডার (Vocabulary Builder)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            প্রতিদিনের অফিস ও ব্যবসায়িক শব্দভাণ্ডার সমৃদ্ধ করুন, ফ্ল্যাশকার্ডে ঝালিয়ে নিন।
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            শব্দকোষ তালিকা ({VOCABULARY_DATA.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('flashcards');
              setFlashcardIndex(0);
              setIsFlipped(false);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            ফ্ল্যাশকার্ড মোড
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            আমার সেভ করা ({savedWordIds.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="শব্দ বা বাংলা অর্থ দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'সবগুলো' },
            { id: 'finance', label: 'ফাইন্যান্স ও বিল' },
            { id: 'office', label: 'অফিস শিষ্টাচার' },
            { id: 'business', label: 'বিজনেস' },
            { id: 'idiom', label: 'ইডিয়াম' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FLASHCARD MODE */}
      {activeTab === 'flashcards' && (
        <div className="max-w-xl mx-auto space-y-6">
          {filteredWords.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
              কোনো শব্দ পাওয়া যায়নি। ক্যাটাগরি পরিবর্তন করে দেখুন।
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 px-2">
                <span>
                  কার্ড {flashcardIndex + 1} / {filteredWords.length}
                </span>
                <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  {currentFlashcard.category}
                </span>
              </div>

              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer min-h-[300px] bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-[2.5rem] p-8 border-2 border-emerald-100 dark:border-gray-700 shadow-xl flex flex-col justify-between relative transition-all duration-300 hover:border-emerald-300 select-none group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {isFlipped ? 'বাংলা অর্থ ও উদাহরণ' : 'ইংরেজি শব্দ (ট্যাপ করে উল্টান)'}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(currentFlashcard.word);
                    }}
                    className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:scale-110 transition-transform"
                    title="উচ্চারণ শুনুন"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-6 text-center">
                  {!isFlipped ? (
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {currentFlashcard.word}
                      </h3>
                      {currentFlashcard.phonetic && (
                        <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                          {currentFlashcard.phonetic}
                        </p>
                      )}
                      <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {currentFlashcard.partOfSpeech}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {currentFlashcard.meaningBn}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                        {currentFlashcard.explanationBn}
                      </p>
                      <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-left text-xs">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {currentFlashcard.exampleSentence}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          {currentFlashcard.exampleSentenceBn}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] text-gray-400 font-bold flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                  <span>কার্ড উল্টাতে ক্লিক করুন</span>
                </div>
              </div>

              {/* Flashcard Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handlePrevFlashcard}
                  className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all"
                  title="পূর্ববর্তী শব্দ"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-2 flex-1 justify-center">
                  <button
                    onClick={() => {
                      onMarkWordNeedPractice(currentFlashcard.id);
                      handleNextFlashcard();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-all active:scale-95"
                  >
                    আবার পড়ব (Need Practice)
                  </button>
                  <button
                    onClick={() => {
                      onMarkWordMastered(currentFlashcard.id);
                      handleNextFlashcard();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    পারা গেছে (Mastered +10 XP)
                  </button>
                </div>

                <button
                  onClick={handleNextFlashcard}
                  className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all"
                  title="পরবর্তী শব্দ"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* BROWSE & SAVED LIST MODE */}
      {(activeTab === 'browse' || activeTab === 'saved') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
              {activeTab === 'saved'
                ? 'আপনি এখনও কোনো শব্দ সেভ করেননি। শব্দের পাশে বুকমার্ক বাটনে ক্লিক করে সেভ করুন।'
                : 'কোনো শব্দ খুঁজে পাওয়া যায়নি।'}
            </div>
          ) : (
            filteredWords.map((word) => {
              const isSaved = savedWordIds.includes(word.id);
              const isMastered = masteredWordIds.includes(word.id);

              return (
                <div
                  key={word.id}
                  className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {word.category}
                        </span>
                        {isMastered && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> মাস্টার্ড
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        {word.word}
                      </h3>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {word.meaningBn}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => speakText(word.word)}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition-colors"
                        title="উচ্চারণ শুনুন"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleSaveWord(word.id)}
                        className={`p-2 rounded-xl border transition-all ${
                          isSaved
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-500'
                        }`}
                        title={isSaved ? 'বুকমার্ক সরানো' : 'বুকমার্ক করুন'}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {word.explanationBn}
                  </p>

                  <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {word.exampleSentence}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      {word.exampleSentenceBn}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

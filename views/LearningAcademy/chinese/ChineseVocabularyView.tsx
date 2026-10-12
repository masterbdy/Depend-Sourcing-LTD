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
import { ChineseVocabularyWord } from './types';
import { CHINESE_VOCABULARY_DATA } from './chineseVocabularyData';

interface ChineseVocabularyViewProps {
  masteredIds: string[];
  onMarkMastered: (wordId: string) => void;
  speakChinese: (text: string) => void;
  isSpeaking: boolean;
}

export const ChineseVocabularyView: React.FC<ChineseVocabularyViewProps> = ({
  masteredIds,
  onMarkMastered,
  speakChinese,
  isSpeaking,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'flashcards'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flashcards state
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const filteredWords = CHINESE_VOCABULARY_DATA.filter((w) => {
    if (selectedCategory !== 'all' && w.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.character.includes(q) ||
        w.pinyin.toLowerCase().includes(q) ||
        w.pronunciationBn.includes(q) ||
        w.meaningBn.includes(q)
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
            <BookmarkCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
            চীনা বিজনেস ভোকাবুলারি (Chinese Business Vocabulary)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            চীনা ক্যারেক্টার, পিনয়িন ও বাংলা উচ্চারণসহ সাপ্লায়ার ও কারখানার পরিভাষা।
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            শব্দ তালিকা ({CHINESE_VOCABULARY_DATA.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('flashcards');
              setFlashcardIdx(0);
              setIsFlipped(false);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-xs'
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="চীনা অক্ষর, পিনয়িন বা বাংলা অর্থ দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'সবগুলো' },
            { id: 'price', label: 'মূল্য ও দর' },
            { id: 'product', label: 'পণ্য ও সাইজ' },
            { id: 'supplier', label: 'সাপ্লায়ার ও কারখানা' },
            { id: 'payment', label: 'পেমেন্ট ও ডিপোজিট' },
            { id: 'shipping', label: 'শিপিং ও ডেলিভারি' },
            { id: 'quality', label: 'কোয়ালিটি' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FLASHCARD MODE */}
      {activeTab === 'flashcards' && currentWord && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 px-2">
            <span>
              কার্ড {flashcardIdx + 1} / {filteredWords.length}
            </span>
            <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              {currentWord.category}
            </span>
          </div>

          {/* Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[300px] bg-gradient-to-br from-white to-red-50/30 dark:from-gray-800 dark:to-gray-900 rounded-[2.5rem] p-8 border-2 border-red-100 dark:border-gray-700 shadow-xl flex flex-col justify-between relative transition-all duration-300 hover:border-red-300 select-none group"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                {isFlipped ? 'বাংলা অর্থ ও উদাহরণ বাক্য' : 'চীনা শব্দ (ট্যাপ করে উল্টান)'}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakChinese(currentWord.character);
                }}
                className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:scale-110 transition-transform"
                title="উচ্চারণ শুনুন"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 text-center">
              {!isFlipped ? (
                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-widest">
                    {currentWord.character}
                  </h3>
                  <p className="text-sm font-mono font-bold text-red-600 dark:text-red-400">
                    {currentWord.pinyin}
                  </p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    বাংলা উচ্চারণ: "{currentWord.pronunciationBn}"
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {currentWord.meaningBn}
                  </h3>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-left text-xs">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {currentWord.example}
                    </p>
                    <p className="text-[11px] font-mono text-red-600 dark:text-red-400">
                      {currentWord.examplePinyin}
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                      {currentWord.exampleBn}
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIdx((prev) => (prev - 1 + filteredWords.length) % filteredWords.length);
              }}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                onMarkMastered(currentWord.id);
                setIsFlipped(false);
                setFlashcardIdx((prev) => (prev + 1) % filteredWords.length);
              }}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>শেখা হয়েছে (Mastered +10 XP)</span>
            </button>

            <button
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIdx((prev) => (prev + 1) % filteredWords.length);
              }}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* BROWSE MODE */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((word) => {
            const isMastered = masteredIds.includes(word.id);

            return (
              <div
                key={word.id}
                className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:border-red-200 dark:hover:border-red-800/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {word.category}
                    </span>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                      {word.character}
                    </h3>
                    <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                      Pinyin: {word.pinyin}
                    </p>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      উচ্চারণ: "{word.pronunciationBn}"
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => speakChinese(word.character)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
                      title="উচ্চারণ শুনুন"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {isMastered && (
                      <span className="p-1 text-emerald-600" title="মাস্টার্ড">
                        <CheckCircle2 className="w-5 h-5" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    = {word.meaningBn}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {word.example}
                  </p>
                  <p className="text-[11px] font-mono text-red-600 dark:text-red-400">
                    {word.examplePinyin}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {word.exampleBn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

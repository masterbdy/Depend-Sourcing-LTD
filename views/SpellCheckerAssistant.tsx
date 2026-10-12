import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  Check,
  CheckCheck,
  X,
  Languages,
  BookOpen,
  Info,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { SpellCheckSuggestion } from '../services/companyDictionary';

interface SpellCheckerAssistantProps {
  value: string;
  onApplyWord: (originalWord: string, replacement: string) => void;
  onApplyFullSentence: (newSentence: string) => void;
  wordSuggestions: SpellCheckSuggestion[];
  fullSentenceSuggestions: string[];
  detectedLanguage: 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED';
  isLoading: boolean;
  onDismissSuggestion: (id: string) => void;
  onDismissAll: () => void;
  onManualTrigger?: () => void;
  isAutoSuggest: boolean;
}

export const SpellCheckerAssistant: React.FC<SpellCheckerAssistantProps> = ({
  value,
  onApplyWord,
  onApplyFullSentence,
  wordSuggestions,
  fullSentenceSuggestions,
  detectedLanguage,
  isLoading,
  onDismissSuggestion,
  onDismissAll,
  onManualTrigger,
  isAutoSuggest,
}) => {
  const [showPreviewSentence, setShowPreviewSentence] = useState<string | null>(null);

  const getLanguageBadge = (lang: string) => {
    switch (lang) {
      case 'BANGLA':
        return { label: 'বাংলা', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' };
      case 'ENGLISH':
        return { label: 'English', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' };
      case 'BANGLISH':
        return { label: 'বাংলিশ (Banglish)', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400' };
      default:
        return { label: 'মিশ্র (Mixed)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400' };
    }
  };

  const badge = getLanguageBadge(detectedLanguage);
  const hasSuggestions = wordSuggestions.length > 0 || fullSentenceSuggestions.length > 0;

  if (!hasSuggestions && !isLoading) {
    if (!isAutoSuggest && onManualTrigger) {
      return (
        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
          <button
            type="button"
            onClick={onManualTrigger}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold transition-colors"
          >
            <Wand2 className="w-3 h-3" /> বানান চেক করুন
          </button>
        </div>
      );
    }
    return null;
  }

  // Calculate batch apply text
  const applyAllChanges = () => {
    let updated = value;
    wordSuggestions.forEach((s) => {
      const regex = new RegExp(`\\b${escapeRegExp(s.originalWord)}\\b`, 'gi');
      updated = updated.replace(regex, s.suggestedText);
    });
    onApplyFullSentence(updated);
  };

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/60 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800/90 border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl shadow-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-indigo-600 text-white shadow-xs">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </span>
          <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            AI স্মার্ট বানান ও ভাষা চেকার
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {wordSuggestions.length > 1 && (
            <button
              type="button"
              onClick={applyAllChanges}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all flex items-center gap-1 shadow-xs"
              title="সবগুলো প্রস্তাবিত সঠিক বানান এক ক্লিকে প্রয়োগ করুন"
            >
              <CheckCheck className="w-3 h-3" /> সব ঠিক করুন ({wordSuggestions.length})
            </button>
          )}

          <button
            type="button"
            onClick={onDismissAll}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="পরামর্শ বাতিল করুন (Keep Original)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Word-level Suggestions Chips */}
      {wordSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {wordSuggestions.map((sug) => (
            <div
              key={sug.id}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-indigo-200/80 dark:border-gray-700 pl-2 pr-1.5 py-1 rounded-lg text-xs shadow-xs hover:border-indigo-400 transition-all"
            >
              <div className="flex items-center gap-1">
                <span className="line-through text-red-500 font-bold opacity-80">{sug.originalWord}</span>
                <span className="text-gray-400">→</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">{sug.suggestedText}</span>
                {sug.source === 'DICTIONARY' && (
                  <span
                    className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1 rounded font-bold"
                    title="কোম্পানি অফিস ডিকশনারি ম্যাচ"
                  >
                    Dict
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0.5 ml-1 border-l border-gray-200 dark:border-gray-700 pl-1">
                <button
                  type="button"
                  onClick={() => onApplyWord(sug.originalWord, sug.suggestedText)}
                  className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 rounded transition-colors"
                  title="এই বানানটি গ্রহণ করুন"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDismissSuggestion(sug.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="অগ্রাহ্য করুন (Keep Original)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Sentence / Banglish to Bangla Conversion Options */}
      {fullSentenceSuggestions.length > 0 && (
        <div className="pt-1.5 border-t border-indigo-100/60 dark:border-gray-700 space-y-1.5">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 uppercase tracking-wider">
            <Languages className="w-3 h-3 text-purple-500" />
            বাংলা বাক্যে রূপান্তর ও মার্জিত সংস্করণ (Context Options):
          </div>

          <div className="space-y-1.5">
            {fullSentenceSuggestions.map((sentence, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 bg-white/90 dark:bg-gray-900/90 rounded-lg border border-purple-100 dark:border-gray-700 text-xs hover:border-purple-300 transition-colors"
              >
                <span className="font-semibold text-gray-800 dark:text-gray-200 leading-snug">
                  "{sentence}"
                </span>
                <button
                  type="button"
                  onClick={() => onApplyFullSentence(sentence)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> প্রয়োগ করুন
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default SpellCheckerAssistant;

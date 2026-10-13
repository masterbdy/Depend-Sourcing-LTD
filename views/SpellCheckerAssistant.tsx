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
  RefreshCw,
  CheckCircle2,
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
  statusMessage?: { type: 'success' | 'error' | 'info'; text: string } | null;
  onDismissSuggestion: (id: string) => void;
  onDismissAll: () => void;
  onManualTrigger?: () => void;
  targetScopeLabel?: string;
}

export const SpellCheckerAssistant: React.FC<SpellCheckerAssistantProps> = React.memo(({
  value,
  onApplyWord,
  onApplyFullSentence,
  wordSuggestions,
  fullSentenceSuggestions,
  detectedLanguage,
  isLoading,
  statusMessage,
  onDismissSuggestion,
  onDismissAll,
  onManualTrigger,
  targetScopeLabel,
}) => {
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

  // Show status banner if checking completed with message or error
  if (!hasSuggestions && !isLoading && statusMessage) {
    return (
      <div
        className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-200 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : statusMessage.type === 'error'
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          <span className="font-semibold">{statusMessage.text}</span>
        </div>
        <button
          type="button"
          onClick={onDismissAll}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // If loading and no suggestions yet
  if (isLoading && !hasSuggestions) {
    return (
      <div className="mt-2 p-2.5 bg-indigo-50/70 dark:bg-gray-800 border border-indigo-100 dark:border-gray-700 rounded-xl flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 animate-pulse">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          <span className="font-semibold">AI বানান ও ব্যাকরণ পরীক্ষা করা হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // If nothing to show
  if (!hasSuggestions && !isLoading) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/60 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800/90 border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl shadow-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-indigo-600 text-white shadow-xs">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </span>
          <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            AI বানান পরীক্ষার ফলাফল
          </span>
          {targetScopeLabel && (
            <span className="text-[10px] bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {targetScopeLabel}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDismissAll}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="পরামর্শ প্যানেল বন্ধ করুন (Dismiss)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Word-level Suggestions Chips with Individual Accept / Ignore buttons */}
      {wordSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>প্রস্তাবিত বানান তালিকা ({wordSuggestions.length} টি ভুল শনাক্ত):</span>
            <span className="text-[9px] text-gray-400">প্রতিটি প্রস্তাবের টিক (✓) বাটনে ক্লিক করে প্রয়োগ করুন</span>
          </div>
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

                <div className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-1.5">
                  <button
                    type="button"
                    onClick={() => onApplyWord(sug.originalWord, sug.suggestedText)}
                    className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded transition-colors active:scale-95"
                    title={`"${sug.suggestedText}" বানানটি গ্রহণ করুন`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissSuggestion(sug.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    title="মূল লেখা বহাল রাখুন (Ignore)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
});

export default SpellCheckerAssistant;

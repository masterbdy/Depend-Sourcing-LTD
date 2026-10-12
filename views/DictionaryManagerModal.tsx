import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  Save,
  Languages,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Info
} from 'lucide-react';
import { CompanyDictionaryEntry, INITIAL_COMPANY_DICTIONARY } from '../services/companyDictionary';
import { SpellCheckerSettings } from '../services/spellCheckerService';

interface DictionaryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dictionary: CompanyDictionaryEntry[];
  onSaveDictionary: (dict: CompanyDictionaryEntry[]) => void;
  settings: SpellCheckerSettings;
  onSaveSettings: (settings: SpellCheckerSettings) => void;
  isAdmin: boolean;
  typoDictionary?: Record<string, string>;
  onSaveTypoDictionary?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  typoSuggestions?: any[];
  onSaveTypoSuggestions?: React.Dispatch<React.SetStateAction<any[]>>;
}

export const DictionaryManagerModal: React.FC<DictionaryManagerModalProps> = ({
  isOpen,
  onClose,
  dictionary,
  onSaveDictionary,
  settings,
  onSaveSettings,
  isAdmin,
  typoDictionary = {},
  onSaveTypoDictionary,
  typoSuggestions = [],
  onSaveTypoSuggestions,
}) => {
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'SUGGESTIONS' | 'SETTINGS'>('ENTRIES');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<string>('ALL');
  const [newWord, setNewWord] = useState('');
  const [newSuggestion, setNewSuggestion] = useState('');
  const [newCategory, setNewCategory] = useState<CompanyDictionaryEntry['category']>('EXPENSE_REASON');
  const [newLanguage, setNewLanguage] = useState<CompanyDictionaryEntry['language']>('BANGLISH');

  const pendingSuggestions = (typoSuggestions || []).filter(
    (s) => !s.status || s.status === 'PENDING'
  );

  const handleApproveTypoSugg = (sugg: any) => {
    const wrong = sugg.wrong;
    const correct = sugg.suggested || sugg.correct;
    if (!wrong || !correct) return;

    // 1. Add to company dictionary
    const newEntry: CompanyDictionaryEntry = {
      id: `cd-${Date.now()}`,
      word: wrong,
      suggestion: correct,
      category: 'EXPENSE_REASON',
      language: 'BANGLA',
      isApproved: true,
      createdAt: new Date().toISOString(),
    };
    onSaveDictionary([newEntry, ...dictionary]);

    // 2. Add to typoDictionary collection
    if (onSaveTypoDictionary) {
      onSaveTypoDictionary((prev) => ({
        ...prev,
        [wrong]: correct,
      }));
    }

    // 3. Mark approved in typoSuggestions collection
    if (onSaveTypoSuggestions) {
      onSaveTypoSuggestions((prev) =>
        prev.map((s) => (s.id === sugg.id ? { ...s, status: 'APPROVED' } : s))
      );
    }
  };

  const handleRejectTypoSugg = (suggId: string) => {
    if (onSaveTypoSuggestions) {
      onSaveTypoSuggestions((prev) =>
        prev.map((s) => (s.id === suggId ? { ...s, status: 'REJECTED' } : s))
      );
    }
  };

  if (!isOpen) return null;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newSuggestion.trim()) return;

    const newEntry: CompanyDictionaryEntry = {
      id: `cd-${Date.now()}`,
      word: newWord.trim(),
      suggestion: newSuggestion.trim(),
      category: newCategory,
      language: newLanguage,
      isApproved: true,
      createdAt: new Date().toISOString(),
    };

    onSaveDictionary([newEntry, ...dictionary]);
    setNewWord('');
    setNewSuggestion('');
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('আপনি কি এই ডিকশনারি শব্দটি মুছে ফেলতে চান?')) {
      onSaveDictionary(dictionary.filter((d) => d.id !== id));
    }
  };

  const handleToggleApprove = (id: string) => {
    onSaveDictionary(
      dictionary.map((d) => (d.id === id ? { ...d, isApproved: !d.isApproved } : d))
    );
  };

  const filteredEntries = dictionary.filter((item) => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.suggestion.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = filterLang === 'ALL' || item.language === filterLang;
    return matchesSearch && matchesLang;
  });

  return (
    <div className="fixed inset-0 z-[1003] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-900/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                কোম্পানি ডিকশনারি ও বানান চেকার কন্ট্রোল
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                অফিস ও খরচের সাধারণ শব্দ, বাংলিশ রূপান্তর এবং এআই সেটিংস নিয়ন্ত্রণ করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-5 bg-gray-50/50 dark:bg-gray-900/40">
          <button
            onClick={() => setActiveTab('ENTRIES')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ENTRIES'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> শব্দ তালিকা ({dictionary.length})
          </button>
          <button
            onClick={() => setActiveTab('SUGGESTIONS')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'SUGGESTIONS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> পেন্ডিং সাজেশন ({pendingSuggestions.length})
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'SETTINGS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> এআই ও কন্ট্রোল সেটিংস
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-5">
          {activeTab === 'ENTRIES' ? (
            <>
              {/* Add New Word Form (Admin Only) */}
              {isAdmin && (
                <form
                  onSubmit={handleAddEntry}
                  className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-3"
                >
                  <div className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> নতুন শব্দ বা বাংলিশ ম্যাপিং যোগ করুন
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      placeholder="ভুল বা বাংলিশ (যেমন: nasta)"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      required
                      className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="সঠিক বাংলা/ইংলিশ (যেমন: নাস্তা)"
                      value={newSuggestion}
                      onChange={(e) => setNewSuggestion(e.target.value)}
                      required
                      className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value as any)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="BANGLISH">বাংলিশ (Banglish)</option>
                      <option value="BANGLA">বাংলা (Bengali)</option>
                      <option value="ENGLISH">English</option>
                      <option value="MIXED">মিশ্র (Mixed)</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> যুক্ত করুন
                    </button>
                  </div>
                </form>
              )}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ডিকশনারিতে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                  {['ALL', 'BANGLISH', 'BANGLA', 'ENGLISH'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setFilterLang(l)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        filterLang === l
                          ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {l === 'ALL' ? 'সকল' : l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word List Table */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                          {item.word}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {item.suggestion}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {item.language}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleApprove(item.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            item.isApproved
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {item.isApproved ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {filteredEntries.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    কোনো ডিকশনারি এন্ট্রি পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'SUGGESTIONS' ? (
            /* Pending Typo Suggestions Tab */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  স্টাফদের বিল এন্ট্রি থেকে প্রস্তাবিত টাইপো শব্দসমূহ এখানে পর্যালোচনার জন্য জমা হয়। অনুমোদন করলে শব্দটি অফিস ডিকশনারিতে যুক্ত হবে।
                </span>
              </div>

              {/* Pending suggestions from typo_suggestions */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/60 font-bold text-xs text-gray-600 dark:text-gray-300">
                  অপেক্ষারত সাজেশনসমূহ ({pendingSuggestions.length})
                </div>

                {pendingSuggestions.map((sugg) => (
                  <div
                    key={sugg.id}
                    className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-red-500 line-through">
                          {sugg.wrong}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {sugg.suggested || sugg.correct}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2">
                        {sugg.staffName && <span>স্টাফ: {sugg.staffName}</span>}
                        {sugg.timestamp && (
                          <span>
                            {new Date(sugg.timestamp).toLocaleDateString('bn-BD')}
                          </span>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveTypoSugg(sugg)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> অনুমোদন
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectTypoSugg(sugg.id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-950/40 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> বাতিল
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {pendingSuggestions.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    বর্তমানে কোনো পেন্ডিং সাজেশন নেই।
                  </div>
                )}
              </div>

              {/* Typo dictionary mappings */}
              {Object.keys(typoDictionary).length > 0 && (
                <div className="mt-4 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 font-bold text-xs text-gray-600 dark:text-gray-300 flex justify-between items-center">
                    <span>সংরক্ষিত টাইপো ডিকশনারি ম্যাপিং ({Object.keys(typoDictionary).length})</span>
                  </div>
                  {Object.entries(typoDictionary).map(([wrong, correct]) => (
                    <div
                      key={wrong}
                      className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{wrong}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{correct}</span>
                      </div>
                      {isAdmin && onSaveTypoDictionary && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`"${wrong}" ম্যাপিংটি ডিলিট করতে চান?`)) {
                              onSaveTypoDictionary((prev) => {
                                const next = { ...prev };
                                delete next[wrong];
                                return next;
                              });
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Settings Tab */
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      স্মার্ট বানান চেকার সক্রিয় রাখুন
                    </h4>
                    <p className="text-xs text-gray-500">
                      বিল লেখার সময় স্বয়ংক্রিয়ভাবে ভুল বানান চিহ্নিত করবে এবং পরামর্শ দিবে
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => onSaveSettings({ ...settings, enabled: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      বাংলিশ থেকে বাংলায় রূপান্তর (Banglish Conversion)
                    </h4>
                    <p className="text-xs text-gray-500">
                      ইংরেজি অক্ষরে লেখা বাংলা শব্দ (যেমন: ofis nasta, jatayat) স্বয়ংক্রিয়ভাবে বাংলায় সাজেস্ট করবে
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.banglishEnabled}
                    onChange={(e) => onSaveSettings({ ...settings, banglishEnabled: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      টাইপিংয়ের সময় লাইভ সাজেশন (Auto Suggest)
                    </h4>
                    <p className="text-xs text-gray-500">
                      টাইপ শেষ হওয়ার ১ সেকেন্ড পর নিজে থেকেই পরামর্শ দেখাবে (বন্ধ থাকলে বাটনে চাপ দিলে দেখাবে)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSuggest}
                    onChange={(e) => onSaveSettings({ ...settings, autoSuggest: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>আর্থিক ডাটা সুরক্ষা:</strong> বানান পরীক্ষক কখনোই টাকার পরিমাণ, তারিখ বা ভাউচার নম্বর পরিবর্তন করতে পারবে না। শুধুমাত্র খরচের বিবরণের টেক্সট পরীক্ষিত হবে।
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryManagerModal;

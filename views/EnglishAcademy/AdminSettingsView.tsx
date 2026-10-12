import React, { useState } from 'react';
import {
  Settings2,
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Power,
  Megaphone,
  BookOpen,
  BookmarkCheck,
  Sparkles
} from 'lucide-react';
import { AcademySettings, VocabularyWord } from './types';

interface AdminSettingsViewProps {
  settings: AcademySettings;
  onUpdateSettings: (newSettings: AcademySettings) => void;
  customWords: VocabularyWord[];
  onAddCustomWord: (word: VocabularyWord) => void;
  onDeleteCustomWord: (wordId: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  customWords,
  onAddCustomWord,
  onDeleteCustomWord,
}) => {
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled ?? true);
  const [allowGuest, setAllowGuest] = useState(settings.allowGuestAccess ?? false);
  const [announcement, setAnnouncement] = useState(settings.announcementBn || '');
  const [isSaved, setIsSaved] = useState(false);

  // New Word Form State
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newExampleBn, setNewExampleBn] = useState('');
  const [newCategory, setNewCategory] = useState<'daily' | 'office' | 'finance' | 'business' | 'idiom'>('office');

  const handleSaveSettings = () => {
    onUpdateSettings({
      isEnabled,
      allowGuestAccess: allowGuest,
      announcementBn: announcement.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCreateWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newMeaning.trim()) return;

    const wordObj: VocabularyWord = {
      id: `custom-${Date.now()}`,
      word: newWord.trim(),
      partOfSpeech: 'noun',
      meaningBn: newMeaning.trim(),
      explanationBn: newExplanation.trim() || newMeaning.trim(),
      exampleSentence: newExample.trim() || `We discussed ${newWord.trim()} in today's office briefing.`,
      exampleSentenceBn: newExampleBn.trim() || `আজকের অফিস ব্রিফিংয়ে আমরা ${newMeaning.trim()} নিয়ে আলোচনা করেছি।`,
      category: newCategory,
      difficulty: 'medium',
    };

    onAddCustomWord(wordObj);
    setNewWord('');
    setNewMeaning('');
    setNewExplanation('');
    setNewExample('');
    setNewExampleBn('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ইংলিশ একাডেমি অ্যাডমিন প্যানেল (Academy Control)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            মডিউলের সার্বিক সক্ষমতা ও কাস্টম লার্নিং কন্টেন্ট পরিচালনার পূর্ণ নিয়ন্ত্রণ।
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border border-amber-200">
          <ShieldCheck className="w-4 h-4" /> অ্যাডমিন অনুমতিপ্রাপ্ত
        </span>
      </div>

      {/* Module Switch & Global Configuration */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
          সাধারণ কনফিগারেশন
        </h3>

        {/* Toggle Module Enable/Disable */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Power className={`w-4 h-4 ${isEnabled ? 'text-emerald-500' : 'text-gray-400'}`} />
              ইংলিশ একাডেমি মডিউল চালু রাখুন
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              এটি বন্ধ করলে স্টাফদের মেন্যুতে মডিউলটি সাময়িকভাবে লুকায়িত থাকবে (অন্য কোনো মডিউলে প্রভাব পড়বে না)।
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Announcement Message */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-amber-500" />
            স্টাফদের জন্য লার্নিং নোটিশ বা উৎসাহবার্তা (ঐচ্ছিক):
          </label>
          <input
            type="text"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="যেমন: এই সপ্তাহের সেরা ইংলিশ প্র্যাকটিসকারীকে বিশেষ পুরস্কার দেওয়া হবে!"
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>সংরক্ষণ সম্পন্ন!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>সেটিংস সেভ করুন</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Custom Word Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" />
          নতুন কাস্টম শব্দ বা পরিভাষা যুক্ত করুন
        </h3>

        <form onSubmit={handleCreateWord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                ইংরেজি শব্দ / পরিভাষা *
              </label>
              <input
                required
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="যেমন: Consignment"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                বাংলা অর্থ *
              </label>
              <input
                required
                type="text"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="যেমন: প্রেরিত পণ্যের চালান"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                ক্যাটাগরি
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="office">Office English</option>
                <option value="finance">Finance & Accounts</option>
                <option value="business">Business Deals</option>
                <option value="daily">Daily Life</option>
                <option value="idiom">Corporate Idiom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                সহজ ব্যাখ্যা (বাংলায়)
              </label>
              <input
                type="text"
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                placeholder="শব্দটির প্রাসঙ্গিক অর্থ ও ব্যবহার"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                উদাহরণ বাক্য (English)
              </label>
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="The consignment was safely delivered."
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                উদাহরণ বাক্যের বাংলা অনুবাদ
              </label>
              <input
                type="text"
                value={newExampleBn}
                onChange={(e) => setNewExampleBn(e.target.value)}
                placeholder="পণ্যের চালানটি নিরাপদে পৌঁছে দেওয়া হয়েছে।"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>শব্দটি যুক্ত করুন</span>
          </button>
        </form>

        {/* Custom Words List */}
        {customWords.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              আপনার যুক্ত করা কাস্টম শব্দসমূহ ({customWords.length})
            </h4>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {customWords.map((cw) => (
                <div
                  key={cw.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white mr-2">
                      {cw.word}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      - {cw.meaningBn}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteCustomWord(cw.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

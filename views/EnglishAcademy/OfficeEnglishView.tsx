import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Volume2,
  Users,
  Briefcase,
  Landmark,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { EMAIL_TEMPLATES, FINANCE_TERMS, OFFICE_DIALOGUES } from './officeEnglishData';

interface OfficeEnglishViewProps {
  speakText: (text: string) => void;
  isSpeaking: boolean;
}

export const OfficeEnglishView: React.FC<OfficeEnglishViewProps> = ({
  speakText,
  isSpeaking,
}) => {
  const [activeSection, setActiveSection] = useState<'emails' | 'finance' | 'dialogues' | 'meetings'>('emails');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header and Section Switcher */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ব্যবহারিক অফিস ইংলিশ (Practical Office English)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ইমেইল রাইটিং, অ্যাকাউন্টস ও ফাইন্যান্স পরিভাষা এবং মিটিং ও ক্লায়েন্ট কমুনিকেশন।
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveSection('emails')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'emails'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            ইমেইল টেমপ্লেট
          </button>
          <button
            onClick={() => setActiveSection('finance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'finance'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            অ্যাকাউন্টস পরিভাষা
          </button>
          <button
            onClick={() => setActiveSection('dialogues')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'dialogues'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            অফিস কথোপকথন
          </button>
          <button
            onClick={() => setActiveSection('meetings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'meetings'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            মিটিং ও প্রেজেন্টেশন
          </button>
        </div>
      </div>

      {/* SECTION 1: EMAIL TEMPLATES */}
      {activeSection === 'emails' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMAIL_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {tmpl.category}
                    </span>
                    <button
                      onClick={() => handleCopy(tmpl.id, `${tmpl.subject}\n\n${tmpl.body}`)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 transition-colors"
                      title="কপি করুন"
                    >
                      {copiedId === tmpl.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {tmpl.titleBn}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {tmpl.title}
                  </p>

                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 mb-3">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Subject Line:
                    </p>
                    <p className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      {tmpl.subject}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto custom-scrollbar">
                    {tmpl.body}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-500" /> টিপস:
                  </p>
                  {tmpl.tipsBn.map((tip, tIdx) => (
                    <p key={tIdx} className="text-[11px] leading-tight">
                      • {tip}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: ACCOUNTS & FINANCE VOCABULARY */}
      {activeSection === 'finance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FINANCE_TERMS.map((term) => (
            <div
              key={term.id}
              className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {term.term}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {term.meaningBn}
                  </p>
                </div>

                <button
                  onClick={() => speakText(term.term)}
                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:scale-105 transition-transform"
                  title="উচ্চারণ শুনুন"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <span className="font-bold text-gray-800 dark:text-gray-200">অর্থ ও ব্যবহার: </span>
                {term.contextBn}
              </p>

              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {term.example}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {term.exampleBn}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3: OFFICE DIALOGUES */}
      {activeSection === 'dialogues' && (
        <div className="space-y-6">
          {OFFICE_DIALOGUES.map((dlg) => (
            <div
              key={dlg.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4"
            >
              <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {dlg.titleBn}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {dlg.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dlg.descriptionBn}
                </p>
              </div>

              <div className="space-y-3">
                {dlg.turns.map((turn, tIdx) => (
                  <div
                    key={tIdx}
                    className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {turn.speaker} ({turn.speakerRoleBn})
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white pt-1">
                        "{turn.text}"
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                        {turn.textBn}
                      </p>
                    </div>

                    <button
                      onClick={() => speakText(turn.text)}
                      className="text-blue-600 dark:text-blue-400 hover:scale-110 p-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0"
                      title="অডিও শুনুন"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 4: MEETINGS & PRESENTATIONS */}
      {activeSection === 'meetings' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6">
          <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            মিটিং ও প্রেজেন্টেশনে ব্যবহৃত বহুল জনপ্রিয় বাক্য
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700 space-y-2">
              <h4 className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">
                ১. মিটিংয়ের শুরু ও সূচনা (Opening)
              </h4>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                "Thank you all for being on time. Let\'s get started with today\'s agenda."
              </p>
              <p className="text-[11px] text-gray-500">
                সময়মতো উপস্থিত থাকার জন্য সবাইকে ধন্যবাদ। আসুন আজকের আলোচ্যসূচি শুরু করি।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700 space-y-2">
              <h4 className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">
                ২. আর্থিক সংখ্যা বা চার্ট উপস্থাপন (Presenting Data)
              </h4>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                "As you can observe from this chart, our conveyance expenses stabilized this month."
              </p>
              <p className="text-[11px] text-gray-500">
                এই চার্টে যেমন দেখতে পাচ্ছেন, চলতি মাসে আমাদের যাতায়াত খরচ স্থিতিশীল হয়েছে।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700 space-y-2">
              <h4 className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">
                ৩. প্রশ্ন বা ব্যাখ্যার আহ্বান (Q&A)
              </h4>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                "I would now like to open the floor for any questions or feedback."
              </p>
              <p className="text-[11px] text-gray-500">
                এখন কোনো প্রশ্ন বা মতামতের জন্য সকলের বক্তব্য আহ্বান করছি।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700 space-y-2">
              <h4 className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">
                ৪. সিদ্ধান্ত ও মিটিং শেষ করা (Closing)
              </h4>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                "To wrap things up, we will finalize the approved bill list by Thursday."
              </p>
              <p className="text-[11px] text-gray-500">
                সমাপ্তি টানতে বলা যায়, আমরা আগামী বৃহস্পতিবারের মধ্যে অনুমোদিত বিলের তালিকা চূড়ান্ত করব।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

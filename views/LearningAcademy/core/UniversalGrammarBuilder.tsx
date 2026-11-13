import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lightbulb,
  ArrowRight,
  Layers,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { LanguageConfig } from './types';

interface GrammarModule {
  id: string;
  ruleTitle: string;
  ruleTitleBn: string;
  explanationBn: string;
  formulaBn: string;
  speakingTipBn: string;
  commonMistake: {
    incorrect: string;
    correct: string;
    reasonBn: string;
  };
  exercise: {
    taskBn: string;
    targetSentence: string;
    scrambled: string[];
    correctOrder: string[];
  };
}

const GRAMMAR_DATA: Record<string, GrammarModule[]> = {
  serbian: [
    {
      id: 'sr-gr-1',
      ruleTitle: 'Serbian Subject-Verb-Object & Gender Harmony',
      ruleTitleBn: 'সার্বিয়ান বাক্যগঠন ও লিঙ্গ সংগতি (Masculine / Feminine)',
      explanationBn: 'সার্বিয়ানে কর্তা (Subject), ক্রিয়া (Verb) ও কর্ম (Object) ছাড়াও বিশেষ্যের শেষ অক্ষর দেখে লিঙ্গ নির্ধারিত হয় (পুরুষবাচক সাধারণত ব্যঞ্জনবর্ণ দিয়ে এবং স্ত্রীবাচক -a দিয়ে শেষ হয়)।',
      formulaBn: 'Subject (কর্তা) + Verb (ক্রিয়া) + Object (কর্ম)',
      speakingTipBn: 'কথোপকথনে সর্বনাম (Ja/Ти/Он) বাদ দিয়ে শুধু ক্রিয়ার রূপ বললেও বাক্য স্বতঃস্ফূর্ত হয় (যেমন: Радим у фирми)।',
      commonMistake: {
        incorrect: 'Ja je umoran.',
        correct: 'Ја сам уморан. (Ja sam umoran.)',
        reasonBn: 'Ja-এর সাথে "sam" ব্যবহৃত হয়, "je" নয় (Ja sam = আমি হই)।',
      },
      exercise: {
        taskBn: 'শব্দগুলো সাজিয়ে সঠিক সার্বিয়ান বাক্য তৈরি করুন: (আমি সার্বিয়ান ভাষা শিখছি)',
        targetSentence: 'Ја учим српски језик.',
        scrambled: ['језик.', 'српски', 'Ја', 'учим'],
        correctOrder: ['Ја', 'учим', 'српски', 'језик.'],
      },
    },
    {
      id: 'sr-gr-2',
      ruleTitle: 'Accusative Case for Orders & Shopping',
      ruleTitleBn: 'কেনাকাটা ও অর্ডারে দ্বিতীয় কারক (Akuzativ)',
      explanationBn: 'রেস্তোরাঁ বা দোকানে যখন কোনো জিনিস চাওয়া হয়, তখন স্ত্রীবাচক শব্দ -a থেকে -u তে রূপান্তরিত হয় (যেমন: kafa -> kafu, voda -> vodu)।',
      formulaBn: 'Желим (আমি চাই) + [স্ত্রীবাচক শব্দ + u] / [পুরুষবাচক অপরিবর্তিত]',
      speakingTipBn: 'ক্যাফেতে অর্ডার দেওয়ার সময় বলুন "Молим вас једну кафу" (কফি স্ত্রীবাচক তাই kafu)।',
      commonMistake: {
        incorrect: 'Želim jedna kafa.',
        correct: 'Желим једну кафу. (Želim jednu kafu.)',
        reasonBn: 'কর্ম কারকে একবচনে স্ত্রীবাচক বিশেষ্য kafa পরিবর্তিত হয়ে kafu হয়।',
      },
      exercise: {
        taskBn: 'সাজিয়ে অর্ডার করুন: (দয়া করে এক কাপ কফি দিন)',
        targetSentence: 'Молим вас једну кафу.',
        scrambled: ['кафу.', 'вас', 'једну', 'Молим'],
        correctOrder: ['Молим', 'вас', 'једну', 'кафу.'],
      },
    },
  ],
  chinese: [
    {
      id: 'zh-gr-1',
      ruleTitle: 'Chinese Word Order: Time & Place Before Action',
      ruleTitleBn: 'চীনা ভাষায় সময় ও স্থান ক্রিয়ার পূর্বে বসে',
      explanationBn: 'ইংরেজি বা বাংলার মতো চাইনিজে সময় এবং স্থান সবসময় প্রধান কাজের (ক্রিয়া) আগে উল্লেখ করতে হয়।',
      formulaBn: 'Subject (কর্তা) + Time (সময়) + Place (স্থান) + Verb (কাজ)',
      speakingTipBn: 'অফিসে কথা বলার সময় সময়টি কর্তার পরপরই উল্লেখ করুন (যেমন: Wǒ jīntiān kāihuì - আমি আজ মিটিং করব)।',
      commonMistake: {
        incorrect: '我 开会 今天。 (Wǒ kāihuì jīntiān.)',
        correct: '我 今天 开会。 (Wǒ jīntiān kāihuì.)',
        reasonBn: 'সময়বাচক শব্দ "今天" (আজ) সবসময় ক্রিয়া "开会"-এর পূর্বে বসবে।',
      },
      exercise: {
        taskBn: 'সাজিয়ে বাক্য তৈরি করুন: (আমরা আগামীকাল ফ্যাক্টরিতে যাব)',
        targetSentence: '我们 明天 去 工厂。',
        scrambled: ['工厂。', '去', '我们', '明天'],
        correctOrder: ['我们', '明天', '去', '工厂。'],
      },
    },
  ],
  spanish: [
    {
      id: 'es-gr-1',
      ruleTitle: 'Ser vs Estar (To Be in Spanish)',
      ruleTitleBn: 'স্প্যানিশে হওয়া বুঝাতে Ser বনাম Estar এর পার্থক্য',
      explanationBn: 'Ser স্থায়ী পরিচয়/পেশা/উৎপত্তির জন্য ব্যবহৃত হয়, আর Estar অস্থায়ী অবস্থা/অনুভূতি/অবস্থান বোঝাতে ব্যবহৃত হয়।',
      formulaBn: 'স্থায়ী গুণ = Ser (Soy/Es/Somos) | সাময়িক অবস্থা = Estar (Estoy/Está/Estamos)',
      speakingTipBn: 'কোম্পানি বা পেশার কথা বলতে Soy ব্যবহার করুন; অবস্থান বা মেজাজ বলতে Estoy ব্যবহার করুন।',
      commonMistake: {
        incorrect: 'Yo estoy un gerente.',
        correct: 'Yo soy un gerente de compras.',
        reasonBn: 'পেশা স্থায়ী পরিচয় হওয়ায় Estar নয়, Ser (Soy) ব্যবহৃত হয়।',
      },
      exercise: {
        taskBn: 'সাজিয়ে বাক্য লিখুন: (আমরা বর্তমানে অফিসে আছি)',
        targetSentence: 'Nosotros estamos en la oficina.',
        scrambled: ['en', 'la', 'Nosotros', 'oficina.', 'estamos'],
        correctOrder: ['Nosotros', 'estamos', 'en', 'la', 'oficina.'],
      },
    },
  ],
  english: [
    {
      id: 'en-gr-1',
      ruleTitle: 'Present Continuous for Immediate Business Actions',
      ruleTitleBn: 'ব্যবসায়িক কর্মকাণ্ডে প্রেজেন্ট কন্টিনিউয়াস টেন্স',
      explanationBn: 'বর্তমানে যে কাজটি চলমান বা আসন্ন মিটিং/ডেলিভারির ক্ষেত্রে Subject + am/is/are + verb-ing ব্যবহৃত হয়।',
      formulaBn: 'Subject + be (am/is/are) + Verb-ing + Object',
      speakingTipBn: 'বায়ারকে আপডেট দেওয়ার সময় বলুন "We are inspecting the fabric right now."',
      commonMistake: {
        incorrect: 'We inspecting the garments now.',
        correct: 'We are inspecting the garments now.',
        reasonBn: 'Auxiliary verb "are" বাদ দেওয়া যায় না।',
      },
      exercise: {
        taskBn: 'সঠিক বাক্যে শব্দগুলো সাজান: (আমরা বায়ারের সাথে আলোচনা করছি)',
        targetSentence: 'We are negotiating with the buyer.',
        scrambled: ['the', 'negotiating', 'with', 'buyer.', 'We', 'are'],
        correctOrder: ['We', 'are', 'negotiating', 'with', 'the', 'buyer.'],
      },
    },
  ],
};

interface UniversalGrammarBuilderProps {
  langConfig: LanguageConfig;
  onAwardXp: (amount: number, reason: string) => void;
  speakText: (text: string, langCode: string) => void;
}

export const UniversalGrammarBuilder: React.FC<UniversalGrammarBuilderProps> = ({
  langConfig,
  onAwardXp,
  speakText,
}) => {
  const modules = GRAMMAR_DATA[langConfig.code] || GRAMMAR_DATA.english;

  const [activeIdx, setActiveIdx] = useState(0);
  const currentMod = modules[activeIdx] || modules[0];

  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>(currentMod.exercise.scrambled);
  const [exerciseResult, setExerciseResult] = useState<boolean | null>(null);

  const handleSelectModule = (idx: number) => {
    setActiveIdx(idx);
    setOrderedWords([]);
    setAvailableWords([...modules[idx].exercise.scrambled]);
    setExerciseResult(null);
  };

  const handleWordClick = (word: string, fromOrdered: boolean) => {
    if (fromOrdered) {
      setOrderedWords(orderedWords.filter((w, i) => i !== orderedWords.lastIndexOf(word)));
      setAvailableWords([...availableWords, word]);
    } else {
      setAvailableWords(availableWords.filter((w, i) => i !== availableWords.indexOf(word)));
      setOrderedWords([...orderedWords, word]);
    }
  };

  const handleCheckOrder = () => {
    const isCorrect = orderedWords.join(' ') === currentMod.exercise.correctOrder.join(' ');
    setExerciseResult(isCorrect);
    if (isCorrect) {
      onAwardXp(20, `${langConfig.name} Grammar Sentence Builder Solved`);
      speakText(currentMod.exercise.targetSentence, langConfig.voiceLangCode);
    }
  };

  const handleReset = () => {
    setOrderedWords([]);
    setAvailableWords([...currentMod.exercise.scrambled]);
    setExerciseResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Topic Switcher */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xl shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black flex items-center gap-2">
              <span>{langConfig.name} Practical Grammar & Sentence Builder</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                Interactive
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              বাংলায় সহজ ব্যাকরণ নিয়ম, ভুলত্রুটি সংশোধন ও ইন্টারঅ্যাক্টিভ বাক্য গঠন।
            </p>
          </div>
        </div>

        {/* Module Selection Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {modules.map((m, i) => (
            <button
              key={m.id}
              onClick={() => handleSelectModule(i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeIdx === i
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              নিয়ম {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Grammar Rule Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            ব্যবহারিক নিয়ম
          </span>
          <h4 className="text-base md:text-lg font-black text-gray-900 dark:text-white mt-0.5">
            {currentMod.ruleTitleBn}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
            {currentMod.explanationBn}
          </p>
        </div>

        {/* Formula Box */}
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-indigo-900 dark:text-indigo-300">গঠন সূত্র: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{currentMod.formulaBn}</span>
          </div>
        </div>

        {/* Common Mistake vs Correct Phrasing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
              <XCircle className="w-4 h-4" /> প্রচলিত ভুল (Common Error):
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 line-through">
              {currentMod.commonMistake.incorrect}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {currentMod.commonMistake.reasonBn}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" /> শুদ্ধ রূপ (Correct):
            </div>
            <p className="font-bold text-gray-900 dark:text-white">
              {currentMod.commonMistake.correct}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              💡 {currentMod.speakingTipBn}
            </p>
          </div>
        </div>
      </div>

      {/* Sentence Builder Interactive Box */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black text-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>ইন্টারঅ্যাক্টিভ বাক্য গঠন অনুশীলন (Sentence Builder)</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> রিসেট
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
          {currentMod.exercise.taskBn}
        </p>

        {/* Selected Ordered Chips Box */}
        <div className="min-h-[70px] p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-indigo-400/40 flex flex-wrap items-center gap-2">
          {orderedWords.length === 0 ? (
            <span className="text-xs text-gray-400">নিচের শব্দগুলোতে ট্যাপ করে ক্রমানুসারে সাজান...</span>
          ) : (
            orderedWords.map((word, idx) => (
              <button
                key={idx}
                onClick={() => handleWordClick(word, true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-rose-600 transition-colors"
              >
                {word}
              </button>
            ))
          )}
        </div>

        {/* Available Chips Box */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50/60 dark:bg-gray-900/40 rounded-2xl">
          {availableWords.map((word, idx) => (
            <button
              key={idx}
              onClick={() => handleWordClick(word, false)}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors shadow-xs"
            >
              {word}
            </button>
          ))}
        </div>

        {/* Verify Button & Result */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleCheckOrder}
            disabled={orderedWords.length === 0}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
          >
            যাচাই করুন
          </button>

          {exerciseResult !== null && (
            <div
              className={`flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl ${
                exerciseResult
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {exerciseResult ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>চমৎকার! বাক্যটি সম্পূর্ণ সঠিক হয়েছে (+২০ XP)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>শব্দক্রম সঠিক হয়নি, পুনরায় চেষ্টা করুন</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

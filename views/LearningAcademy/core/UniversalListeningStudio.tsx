import React, { useState } from 'react';
import {
  Headphones,
  Volume2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  ArrowRight,
  HelpCircle,
  Clock
} from 'lucide-react';
import { LanguageConfig, UniversalWord } from './types';

interface ListeningDrill {
  id: string;
  targetAudioText: string;
  romanized?: string;
  meaningBn: string;
  englishMeaning: string;
  comprehensionQuestionBn: string;
  options: string[];
  correctAnswer: string;
}

interface UniversalListeningStudioProps {
  langConfig: LanguageConfig;
  onAwardXp: (amount: number, reason: string) => void;
  speakText: (text: string, langCode: string, rate?: number) => void;
  isSpeaking: boolean;
}

const LISTENING_DRILLS: Record<string, ListeningDrill[]> = {
  serbian: [
    {
      id: 'sr-list-1',
      targetAudioText: 'Добар дан! Да ли говорите енглески или српски језик?',
      romanized: 'Dobar dan! Da li govorite engleski ili srpski jezik?',
      meaningBn: 'শুভ দিন! আপনি কি ইংরেজি নাকি সার্বিয়ান ভাষায় কথা বলেন?',
      englishMeaning: 'Good day! Do you speak English or Serbian language?',
      comprehensionQuestionBn: 'বক্তা কোন দুটি ভাষার কথা জিজ্ঞেস করেছেন?',
      options: ['ইংরেজি ও সার্বিয়ান', 'স্প্যানিশ ও চাইনিজ', 'জার্মান ও ফরাসি', 'বাংলা ও হিন্দি'],
      correctAnswer: 'ইংরেজি ও সার্বিয়ান',
    },
    {
      id: 'sr-list-2',
      targetAudioText: 'Ова пошиљка одеће стиже у Београд следећег уторка.',
      romanized: 'Ova pošiljka odeće stiže u Beograd sledećeg utorka.',
      meaningBn: 'পোশাকের এই চালানটি আগামী মঙ্গলবার বেলগ্রেডে পৌঁছাবে।',
      englishMeaning: 'This clothing shipment arrives in Belgrade next Tuesday.',
      comprehensionQuestionBn: 'চালানটি কোন দিন বেলগ্রেডে পৌঁছাবে?',
      options: ['আগামী মঙ্গলবার', 'আজ সন্ধ্যায়', 'আগামী মাসে', 'শুক্রবার সকালে'],
      correctAnswer: 'আগামী মঙ্গলবার',
    },
    {
      id: 'sr-list-3',
      targetAudioText: 'Молим вас, донесите нам рачун и чашу воде.',
      romanized: 'Molim vas, donesite nam račun i čašu vode.',
      meaningBn: 'দয়া করে আমাদের বিল এবং এক গ্লাস জল এনে দিন।',
      englishMeaning: 'Please bring us the bill and a glass of water.',
      comprehensionQuestionBn: 'রেস্তোরাঁয় গ্রাহক কী কী চেয়েছেন?',
      options: ['বিল ও এক গ্লাস জল', 'কফি ও কেক', 'মেন্যু ও চামচ', 'রুটি ও সালাদ'],
      correctAnswer: 'বিল ও এক গ্লাস জল',
    },
  ],
  chinese: [
    {
      id: 'zh-list-1',
      targetAudioText: '陈经理，请问这批样品的面料成分是什么？',
      romanized: 'Chén jīnglǐ, qǐngwèn zhè pī yàngpǐn de miànliào chéngfèn shì shénme?',
      meaningBn: 'ম্যানেজার চেন, এই স্যাম্পলের ফ্যাব্রিক উপাদান কী?',
      englishMeaning: 'Manager Chen, what is the fabric composition of this sample batch?',
      comprehensionQuestionBn: 'বক্তা কী সম্পর্কে প্রশ্ন করেছেন?',
      options: ['ফ্যাব্রিক কম্পোজিশন', 'ডেলিভারির তারিখ', 'প্যাকিং কার্টন', 'শ্রমিকদের বেতন'],
      correctAnswer: 'ফ্যাব্রিক কম্পোজিশন',
    },
    {
      id: 'zh-list-2',
      targetAudioText: '我们下周一安排工人加班生产，确保按时交货。',
      romanized: 'Wǒmen xià zhōuyī ānpái gōngrén jiābān shēngchǎn, quèbǎo ànshí jiāohuò.',
      meaningBn: 'আমরা আগামী সোমবার ওভারটাইম প্রোডাকশনের ব্যবস্থা করব যাতে সময়মতো ডেলিভারি নিশ্চিত হয়।',
      englishMeaning: 'We will arrange overtime production next Monday to ensure timely delivery.',
      comprehensionQuestionBn: 'ফ্যাক্টরি কর্তৃপক্ষ কোন দিন ওভারটাইম কাজ করার কথা বলেছে?',
      options: ['আগামী সোমবার', 'আগামীকাল', 'শুক্রবার রাতে', 'রবিবার সকালে'],
      correctAnswer: 'আগামী সোমবার',
    },
  ],
  spanish: [
    {
      id: 'es-list-1',
      targetAudioText: 'Hemos verificado el control de calidad y todos los pantalones están aprobados.',
      meaningBn: 'আমরা কোয়ালিটি কন্ট্রোল চেক করেছি এবং সব প্যান্ট অনুমোদিত হয়েছে।',
      englishMeaning: 'We have verified quality control and all pants are approved.',
      comprehensionQuestionBn: 'কোয়ালিটি পরিদর্শনে কী ফলাফল পাওয়া গেছে?',
      options: ['সব প্যান্ট অনুমোদিত হয়েছে', 'স্যাম্পল রিজেক্ট হয়েছে', 'রং পরিবর্তন করতে হবে', 'সাইজ ভুল হয়েছে'],
      correctAnswer: 'সব প্যান্ট অনুমোদিত হয়েছে',
    },
    {
      id: 'es-list-2',
      targetAudioText: 'El barco sale del puerto de Valencia con destino a Londres el viernes.',
      meaningBn: 'জাহাজটি শুক্রবার ভ্যালেন্সিয়া বন্দর থেকে লন্ডনের উদ্দেশ্যে যাত্রা করবে।',
      englishMeaning: 'The ship departs from the port of Valencia bound for London on Friday.',
      comprehensionQuestionBn: 'জাহাজটি কোন দিন বন্দর ত্যাগ করবে?',
      options: ['শুক্রবার', 'সোমবার', 'শনিবার', 'বুধবার'],
      correctAnswer: 'শুক্রবার',
    },
  ],
  english: [
    {
      id: 'en-list-1',
      targetAudioText: 'Our sourcing team is negotiating a ten percent discount for bulk fabric orders.',
      meaningBn: 'আমাদের সোর্সিং টিম পাইকারি ফ্যাব্রিক অর্ডারের জন্য ১০ শতাংশ ছাড় নিয়ে আলোচনা করছে।',
      englishMeaning: 'Our sourcing team is negotiating a ten percent discount for bulk fabric orders.',
      comprehensionQuestionBn: 'সোর্সিং টিম কত শতাংশ ছাড় চাইছে?',
      options: ['১০ শতাংশ', '৫ শতাংশ', '১৫ শতাংশ', '২০ শতাংশ'],
      correctAnswer: '১০ শতাংশ',
    },
    {
      id: 'en-list-2',
      targetAudioText: 'The quality inspector confirmed zero defects across all thirty thousand units.',
      meaningBn: 'কোয়ালিটি পরিদর্শক ত্রিশ হাজার ইউনিটের সবকটিতে জিরো ডিফেক্ট নিশ্চিত করেছেন।',
      englishMeaning: 'The quality inspector confirmed zero defects across all thirty thousand units.',
      comprehensionQuestionBn: 'পরিদর্শক মোট কতগুলো পণ্যে জিরো ডিফেক্ট পেয়েছেন?',
      options: ['৩০,০০০ পিস', '১০,০০০ পিস', '৫০,০০০ পিস', '৫,০০০ পিস'],
      correctAnswer: '৩০,০০০ পিস',
    },
  ],
};

export const UniversalListeningStudio: React.FC<UniversalListeningStudioProps> = ({
  langConfig,
  onAwardXp,
  speakText,
  isSpeaking,
}) => {
  const drills = LISTENING_DRILLS[langConfig.code] || LISTENING_DRILLS.english;

  const [activeDrillIdx, setActiveDrillIdx] = useState(0);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [dictationInput, setDictationInput] = useState('');
  const [dictationSubmitted, setDictationSubmitted] = useState(false);
  const [dictationScore, setDictationScore] = useState<number | null>(null);

  const currentDrill = drills[activeDrillIdx] || drills[0];

  const handlePlayAudio = (speed: number = selectedSpeed) => {
    setSelectedSpeed(speed);
    speakText(currentDrill.targetAudioText, langConfig.voiceLangCode, speed);
  };

  const handleCheckDictation = () => {
    const cleanUser = dictationInput.trim().toLowerCase().replace(/[.,!?;:()]/g, '');
    const cleanTarget = currentDrill.targetAudioText.trim().toLowerCase().replace(/[.,!?;:()]/g, '');

    const targetWords = cleanTarget.split(/\s+/);
    const userWords = cleanUser.split(/\s+/);

    let match = 0;
    userWords.forEach((w) => {
      if (targetWords.includes(w)) match++;
    });

    const score = Math.min(100, Math.round((match / Math.max(targetWords.length, 1)) * 100));
    setDictationScore(score);
    setDictationSubmitted(true);

    if (score >= 70) {
      onAwardXp(20, `${langConfig.name} Listening Dictation Practice`);
    }
  };

  const handleSelectOption = (opt: string) => {
    setSelectedOption(opt);
    if (opt === currentDrill.correctAnswer) {
      onAwardXp(15, `${langConfig.name} Listening Comprehension Correct`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black text-xl shadow-md">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black flex items-center gap-2">
              <span>{langConfig.name} Listening Studio & Comprehension</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold uppercase">
                Multi-Speed
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              ধীর (0.75x), সাধারণ (1.0x) ও দ্রুত (1.25x) গতিতে অডিও শুনুন এবং ডিকটেশন অনুশীলন করুন।
            </p>
          </div>
        </div>

        {/* Drill Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {drills.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveDrillIdx(i);
                setShowTranscript(false);
                setSelectedOption(null);
                setDictationInput('');
                setDictationSubmitted(false);
                setDictationScore(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeDrillIdx === i
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              পাঠ {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Playback Controls Card */}
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm text-center space-y-6">
        <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25">
          <Headphones className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h4 className="font-black text-gray-900 dark:text-white text-lg">
            অডিওটি মনোযোগ দিয়ে শুনুন
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            প্রয়োজনে ধীর গতিতে শুনুন, তারপর স্বাভাবিক গতিতে রিপিট করুন
          </p>
        </div>

        {/* Multi-Speed Playback Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handlePlayAudio(0.75)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              selectedSpeed === 0.75 && isSpeaking
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
            }`}
          >
            <Volume2 className="w-4 h-4" /> 0.75x ধীর গতি (Slow)
          </button>

          <button
            onClick={() => handlePlayAudio(1.0)}
            className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 shadow-lg transition-all ${
              selectedSpeed === 1.0 && isSpeaking
                ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                : 'bg-cyan-600 text-white hover:bg-cyan-500'
            }`}
          >
            <Play className="w-4 h-4 fill-current" /> 1.0x সাধারণ গতি (Normal)
          </button>

          <button
            onClick={() => handlePlayAudio(1.25)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              selectedSpeed === 1.25 && isSpeaking
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
            }`}
          >
            <Volume2 className="w-4 h-4" /> 1.25x দ্রুত গতি (Fast)
          </button>
        </div>

        {/* Toggle Transcript */}
        <div className="pt-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showTranscript ? 'টেক্সট লুকান (Hide Transcript)' : 'টেক্সট দেখুন (Show Transcript)'}</span>
          </button>

          {showTranscript && (
            <div className="mt-4 p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 text-left max-w-lg mx-auto space-y-1.5 animate-in fade-in">
              <p className="font-black text-gray-900 dark:text-white text-base">
                {currentDrill.targetAudioText}
              </p>
              {currentDrill.romanized && (
                <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                  {currentDrill.romanized}
                </p>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-1 border-t border-cyan-100 dark:border-cyan-900/40">
                🇧🇩 বাংলা: {currentDrill.meaningBn}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dictation & Comprehension Interactive Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Practice 1: Dictation (Type what you hear) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black text-sm">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>ডিকটেশন টেস্ট: যা শুনছেন তা টাইপ করুন</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            অডিও শুনে মূল বাক্যটি হুবহু লিখুন এবং মিল মিলিয়ে স্কোর নিন:
          </p>

          <textarea
            value={dictationInput}
            onChange={(e) => setDictationInput(e.target.value)}
            rows={3}
            placeholder="যা শুনেছেন এখানে টাইপ করুন..."
            className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <button
            onClick={handleCheckDictation}
            disabled={!dictationInput.trim()}
            className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-500 disabled:opacity-40 transition-colors shadow-sm"
          >
            ডিকটেশন পরীক্ষা করুন
          </button>

          {dictationSubmitted && dictationScore !== null && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                dictationScore >= 75
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>নির্ভুলতা স্কোর: {dictationScore}%</span>
                <span>{dictationScore >= 75 ? 'চমৎকার শ্রবণ!' : 'আবার শুনুন'}</span>
              </div>
              <p className="text-[11px] opacity-80">
                আসল বাক্য: {currentDrill.targetAudioText}
              </p>
            </div>
          )}
        </div>

        {/* Practice 2: Comprehension Quiz */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black text-sm">
            <HelpCircle className="w-4 h-4 text-cyan-600" />
            <span>বোধগম্য প্রশ্ন (Comprehension Question)</span>
          </div>
          <p className="text-xs text-gray-900 dark:text-white font-bold">
            {currentDrill.comprehensionQuestionBn}
          </p>

          <div className="space-y-2">
            {currentDrill.options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isCorrect = opt === currentDrill.correctAnswer;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full p-3 rounded-2xl text-xs font-bold text-left transition-all border ${
                    isSelected
                      ? isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300'
                      : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {isSelected && (
                      isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

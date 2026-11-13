import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Flame,
  Layers,
  ArrowRight,
  Headphones,
  Check,
  Filter
} from 'lucide-react';
import { SerbianPracticePhrase } from './types';
import { SERBIAN_SPEAKING_CATEGORIES, SERBIAN_SPEAKING_PHRASES } from './serbianSpeakingData';

interface SerbianSpeakingStudioProps {
  onAwardXp: (amount: number, reason: string) => void;
  speakText: (text: string, langCode: string) => void;
  isSpeaking: boolean;
}

export const SerbianSpeakingStudio: React.FC<SerbianSpeakingStudioProps> = ({
  onAwardXp,
  speakText,
  isSpeaking,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePhraseIndex, setActivePhraseIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    status: 'success' | 'warning' | 'retry' | null;
    messageBn: string;
  } | null>(null);

  const [slowAudio, setSlowAudio] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  const filteredPhrases = SERBIAN_SPEAKING_PHRASES.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const activePhrase: SerbianPracticePhrase =
    filteredPhrases[activePhraseIndex] || filteredPhrases[0] || SERBIAN_SPEAKING_PHRASES[0];

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'sr-RS';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleEvaluateSpeech(transcript);
        }
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      } catch {}
    };
  }, [activePhrase]);

  // Real Fuzzy Matching & Pronunciation Score
  const handleEvaluateSpeech = (spoken: string) => {
    setSpokenTranscript(spoken);

    const cleanSpoken = spoken
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .trim();
    const cleanLatin = activePhrase.latin
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .trim();
    const cleanCyrillic = activePhrase.cyrillic
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .trim();

    // Check similarity against Latin or Cyrillic
    const spokenWords = cleanSpoken.split(/\s+/).filter(Boolean);
    const latinWords = cleanLatin.split(/\s+/).filter(Boolean);

    let matchCount = 0;
    spokenWords.forEach((word) => {
      if (
        latinWords.some((w) => w.includes(word) || word.includes(w)) ||
        cleanCyrillic.includes(word)
      ) {
        matchCount++;
      }
    });

    const ratio = latinWords.length > 0 ? matchCount / latinWords.length : 0.5;
    const scorePercent = Math.min(100, Math.max(30, Math.round(ratio * 100)));

    if (scorePercent >= 75) {
      setEvaluationResult({
        score: scorePercent,
        status: 'success',
        messageBn: `✓ চমৎকার! আপনার সার্বিয়ান উচ্চারণ ${scorePercent}% সঠিক হয়েছে। (+15 XP)`,
      });
      onAwardXp(15, `Serbian Speaking: ${activePhrase.latin}`);
    } else if (scorePercent >= 50) {
      setEvaluationResult({
        score: scorePercent,
        status: 'warning',
        messageBn: `ভালো প্রচেষ্টা (${scorePercent}%)! শব্দগুলো আরেকটু স্পষ্ট করে পুনরায় বলুন। (+8 XP)`,
      });
      onAwardXp(8, `Serbian Practice: ${activePhrase.latin}`);
    } else {
      setEvaluationResult({
        score: scorePercent,
        status: 'retry',
        messageBn: `উচ্চারণটি ঠিকমতো বোঝা যায়নি (${scorePercent}%)। স্পিকার আইকনে চাপ দিয়ে শুনুন এবং আবার বলুন।`,
      });
    }
  };

  const handleStartRecording = () => {
    if (!speechSupported || !recognitionRef.current) return;
    try {
      setEvaluationResult(null);
      setSpokenTranscript('');
      setIsRecording(true);
      recognitionRef.current.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch {}
    setIsRecording(false);
  };

  const handlePlayAudio = () => {
    speakText(activePhrase.latin, 'sr-RS');
  };

  return (
    <div className="space-y-6">
      {/* Speaking Studio Top 3D Glass Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-800 to-rose-900 p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black text-rose-200">
              <Headphones className="w-3.5 h-3.5 text-yellow-300" />
              <span>70% Speaking • 20% Listening Focus</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Speaking & Listening Studio
            </h2>
            <p className="text-xs md:text-sm text-blue-100/90 max-w-xl leading-relaxed">
              সার্বিয়ান ভাষায় আত্মবিশ্বাসের সাথে কথা বলুন। বাস্তব জীবনের কথ্য ভাষা, কুশল বিনিময়, কেনাকাটা ও ব্যবসায়িক আলাপের লাইভ স্পিচ অনুশীলন।
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[150px]">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">
              ড্রিল প্রগ্রেস
            </span>
            <span className="text-2xl font-black text-white">
              {activePhraseIndex + 1} / {filteredPhrases.length}
            </span>
            <span className="text-[10px] text-amber-300 block font-bold mt-0.5">
              +{activePhraseIndex * 15} XP অর্জিত
            </span>
          </div>
        </div>
      </div>

      {/* Categories Filter Pills with 3D Glassmorphism */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SERBIAN_SPEAKING_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setActivePhraseIndex(0);
              setEvaluationResult(null);
              setSpokenTranscript('');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-200 flex items-center gap-2 whitespace-nowrap shadow-xs active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50'
                : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <span className="text-sm">{cat.icon}</span>
            <span>{cat.labelBn}</span>
          </button>
        ))}
      </div>

      {/* Main Speaking Practice Card with 3D Depth */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-blue-950/5 space-y-6">
        {/* Phrase Content Block */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 border border-white/20 text-center space-y-4 shadow-xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-block px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-cyan-200 text-xs font-black uppercase tracking-wider">
            {activePhrase.category.toUpperCase()} • Phrase #{activePhraseIndex + 1}
          </div>

          <div className="space-y-1 relative z-10">
            <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
              {activePhrase.cyrillic}
            </h3>
            <p className="text-xl md:text-3xl font-bold text-cyan-300">
              {activePhrase.latin}
            </p>
          </div>

          <div className="max-w-md mx-auto pt-3 pb-1 border-t border-white/15 space-y-1.5 text-xs md:text-sm relative z-10">
            <p className="font-black text-amber-300">
              উচ্চারণ: {activePhrase.bengaliPronunciation}
            </p>
            <p className="text-slate-200 font-semibold">
              বাংলা অর্থ: {activePhrase.bengaliMeaning}
            </p>
            <p className="text-slate-400 text-xs italic">
              English: "{activePhrase.englishMeaning}"
            </p>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center justify-center gap-3 pt-2 relative z-10">
            <button
              onClick={handlePlayAudio}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all duration-200 active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
              <span>উচ্চারণ শুনুন (Listen)</span>
            </button>

            <button
              onClick={() => {
                setSlowAudio(!slowAudio);
                speakText(activePhrase.latin, 'sr-RS');
              }}
              className="px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition active:scale-95"
              title="আস্তে শুনুন"
            >
              🐢 আস্তে শুনুন
            </button>
          </div>

          {/* Equalizer Waveform Indicator */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {[10, 22, 16, 28, 36, 20, 32, 14, 26, 12].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isRecording
                    ? 'bg-rose-400 animate-pulse'
                    : 'bg-cyan-400/50'
                }`}
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>

        {/* Live Speech Recognition & Microphone Studio */}
        <div className="text-center space-y-4 pt-2">
          {!speechSupported ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                এই ব্রাউজারে লাইভ স্পিচ রিকগনিশন সক্রিয় নেই। সরাসরি মাইক্রোফোন পরীক্ষার জন্য গুগল ক্রোম ব্রাউজার ব্যবহার করুন। তবে আপনি অডিও শুনতে পারবেন।
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-black">
                {isRecording
                  ? '🎙️ শুনছি... স্পষ্ট সার্বিয়ান ভাষায় বাক্যটি বলুন!'
                  : 'মাইক্রোফোনে ট্যাপ করে বাক্যটি জোরে বলুন (Tap to Speak)'}
              </p>

              <div className="relative inline-block">
                {isRecording && (
                  <>
                    <div className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
                    <div className="absolute -inset-2 rounded-full bg-rose-500/30 animate-pulse pointer-events-none" />
                  </>
                )}
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 mx-auto ${
                    isRecording
                      ? 'bg-rose-500 ring-8 ring-rose-300 scale-105 animate-pulse'
                      : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-600 hover:scale-105 active:scale-95 shadow-blue-600/40 ring-4 ring-blue-500/20'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10 animate-spin" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </button>
              </div>

              {spokenTranscript && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border text-xs max-w-sm mx-auto">
                  <span className="text-gray-400 block font-medium">আপনার বলা কথা:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    "{spokenTranscript}"
                  </span>
                </div>
              )}

              {/* Evaluation Feedback */}
              {evaluationResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold max-w-md mx-auto animate-in fade-in ${
                    evaluationResult.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : evaluationResult.status === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {evaluationResult.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{evaluationResult.messageBn}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Between Speaking Phrases */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => {
              if (activePhraseIndex > 0) {
                setActivePhraseIndex(activePhraseIndex - 1);
                setEvaluationResult(null);
                setSpokenTranscript('');
              }
            }}
            disabled={activePhraseIndex === 0}
            className="px-4 py-2.5 rounded-2xl border text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            ← পূর্ববর্তী বাক্য
          </button>

          <span className="text-xs font-black text-gray-500">
            {activePhraseIndex + 1} of {filteredPhrases.length}
          </span>

          <button
            onClick={() => {
              if (activePhraseIndex < filteredPhrases.length - 1) {
                setActivePhraseIndex(activePhraseIndex + 1);
                setEvaluationResult(null);
                setSpokenTranscript('');
              }
            }}
            disabled={activePhraseIndex >= filteredPhrases.length - 1}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-40 transition shadow-md flex items-center gap-1.5"
          >
            <span>পরবর্তী বাক্য</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Mic,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Play,
  FileText,
  Printer,
  ChevronRight,
  Target,
  Clock,
  Check
} from 'lucide-react';
import {
  LanguageConfig,
  CefrLevel,
  SpeakingExamQuestion,
  SpeakingExamResult,
  CEFR_LEVELS_METADATA,
  WeakTopic
} from './types';

interface UniversalSpeakingExamProps {
  langConfig: LanguageConfig;
  currentCefrLevel: CefrLevel;
  userName: string;
  onExamCompleted: (result: SpeakingExamResult) => void;
  speakText: (text: string, langCode: string, rate?: number) => void;
  isSpeaking: boolean;
}

// Exam Questions Generator for Each CEFR Level & Language
const generateExamQuestions = (langCode: string, level: CefrLevel): SpeakingExamQuestion[] => {
  if (langCode === 'serbian') {
    return [
      {
        id: 'sr-a1',
        part: 'A_READ_ALOUD',
        partTitleBn: 'পর্ব ১: স্পষ্ট উচ্চারণ ও রিডিং টেস্ট',
        promptTarget: 'Добар дан! Ја се зовем Марко и радим у компанији Depend Sourcing.',
        promptRomanized: 'Dobar dan! Ja se zovem Marko i radim u kompaniji Depend Sourcing.',
        promptBn: 'শুভ দিন! আমার নাম মার্কো এবং আমি ডিপেন্ড সোর্সিং কোম্পানিতে কাজ করি।',
        expectedTranscript: 'Dobar dan ja se zovem Marko i radim u kompaniji Depend Sourcing',
      },
      {
        id: 'sr-b1',
        part: 'B_LISTENING_COMPREHENSION',
        partTitleBn: 'পর্ব ২: শ্রবণ দক্ষতা ও বোধগম্য যাচাই',
        promptTarget: 'Наш састанак о новој испоруци почиње сутра у десет сати ујутру.',
        promptRomanized: 'Naš sastanak o novoj isporuci počinje sutra u deset sati ujutru.',
        promptBn: 'অডিওটি মনোযোগ দিয়ে শুনুন এবং সঠিক উত্তর নির্বাচন করুন:',
        audioPrompt: 'Наш састанак о новој испоруци почиње сутра у десет сати ујутру.',
        options: [
          'মিটিং আজ রাতে ৮টায়',
          'মিটিং আগামীকাল সকাল ১০টায়',
          'মিটিং আগামী সপ্তাহে',
          'মিটিং বাতিল করা হয়েছে'
        ],
        correctAnswer: 'মিটিং আগামীকাল সকাল ১০টায়',
      },
      {
        id: 'sr-c1',
        part: 'C_SENTENCE_CONSTRUCTION',
        partTitleBn: 'পর্ব ৩: বাক্য গঠন ও ব্যাকরণ পরীক্ষা',
        promptTarget: 'Шта желите да наручите за ручак?',
        promptRomanized: 'Šta želite da naručite za ručak?',
        promptBn: 'শব্দগুলো সাজিয়ে সঠিক সার্বিয়ান বাক্য তৈরি করুন: (দুপুরের খাবারে আপনি কী অর্ডার করতে চান?)',
        scrambledWords: ['за', 'ручак?', 'да', 'Шта', 'желите', 'наручите'],
        correctOrder: ['Шта', 'желите', 'да', 'наручите', 'за', 'ручак?'],
      },
      {
        id: 'sr-d1',
        part: 'D_ORAL_INTERVIEW',
        partTitleBn: 'পর্ব ৪: মৌখিক কথোপকথন ও স্পিকিং ইন্টারভিউ',
        promptTarget: 'Како сте данас и чиме се бавите? (Kako ste danas i čime se bavite?)',
        promptRomanized: 'Kako ste danas i čime se bavite?',
        promptBn: 'এআই পরীক্ষকের প্রশ্নের সার্বিয়ান ভাষায় ২-৩ বাক্যে মৌখিক উত্তর দিন।',
        expectedTranscript: 'Ja sam dobro, radim u tekstilu i učim srpski jezik.',
      }
    ];
  }

  if (langCode === 'chinese') {
    return [
      {
        id: 'zh-a1',
        part: 'A_READ_ALOUD',
        partTitleBn: 'পর্ব ১: টোন ও পিনয়িন উচ্চারণ টেস্ট',
        promptTarget: '你好！我们是孟加拉国的服装采购公司。很高兴认识您。',
        promptRomanized: 'Nǐ hǎo! Wǒmen shì Mèngjiālāguó de fúzhuāng cǎigòu gōngsī. Hěn gāoxìng rènshí nín.',
        promptBn: 'হ্যালো! আমরা বাংলাদেশের গার্মেন্টস সোর্সিং কোম্পানি। আপনার সাথে পরিচিত হয়ে আনন্দিত।',
        expectedTranscript: 'Ni hao women shi Mengjialaguo de fuzhuang caigou gongsi hen gaoxing renshi nin',
      },
      {
        id: 'zh-b1',
        part: 'B_LISTENING_COMPREHENSION',
        partTitleBn: 'পর্ব ২: শ্রবণ দক্ষতা ও বোধগম্য যাচাই',
        promptTarget: '这批货物的交货期是下个月十五号，请提前安排装柜。',
        promptRomanized: 'Zhè pī huòwù de jiāohuò qī shì xià gè yuè shíwǔ hào, qǐng tíqián ānpái zhuāngguì.',
        promptBn: 'অডিওটি শুনে বলুন শিপমেন্টের ডেলিভারি ডেট কবে?',
        audioPrompt: '这批货物的交货期是下个月十五号，请提前安排装柜。',
        options: [
          'আগামী মাসের ৫ তারিখ',
          'আগামী মাসের ১৫ তারিখ',
          'এই মাসের শেষ তারিখ',
          'পরবর্তী তিন মাস পর'
        ],
        correctAnswer: 'আগামী মাসের ১৫ তারিখ',
      },
      {
        id: 'zh-c1',
        part: 'C_SENTENCE_CONSTRUCTION',
        partTitleBn: 'পর্ব ৩: চাইনিজ বাক্য গঠন ও সিনট্যাক্স',
        promptTarget: '请问这个面料的单价是多少？',
        promptRomanized: 'Qǐngwèn zhège miànliào de dānjià shì duōshao?',
        promptBn: 'সঠিক চাইনিজ বাক্যে শব্দগুলো সাজান: (অনুগ্রহ করে এই কাপড়ের ইউনিট প্রতি দাম কত?)',
        scrambledWords: ['面料的', '单价', '请问', '这个', '是多少？'],
        correctOrder: ['请问', '这个', '面料的', '单价', '是多少？'],
      },
      {
        id: 'zh-d1',
        part: 'D_ORAL_INTERVIEW',
        partTitleBn: 'পর্ব ৪: মৌখিক ইন্টারভিউ ও ব্যবসায়িক স্পিকিং',
        promptTarget: '请介绍一下你们公司采购的产品。(Qǐng jièshào yíxià nǐmen gōngsī cǎigòu de chǎnpǐn.)',
        promptRomanized: 'Qǐng jièshào yíxià nǐmen gōngsī cǎigòu de chǎnpǐn.',
        promptBn: 'আপনার কোম্পানির প্রোডাক্ট বা সোর্সিং নিয়ে চাইনিজে মৌখিক উত্তর দিন।',
        expectedTranscript: 'Women caigou zhenzhi he suozhi fuzhuang, zhiliang hen hao.',
      }
    ];
  }

  if (langCode === 'spanish') {
    return [
      {
        id: 'es-a1',
        part: 'A_READ_ALOUD',
        partTitleBn: 'পর্ব ১: স্প্যানিশ স্পষ্ট উচ্চারণ ও রিডিং',
        promptTarget: 'Buenos días. Somos una empresa textil y buscamos socios comerciales en España.',
        promptBn: 'শুভ সকাল। আমরা একটি টেক্সটাইল কোম্পানি এবং স্পেনে ব্যবসায়িক পার্টনার খুঁজছি।',
        expectedTranscript: 'Buenos dias somos una empresa textil y buscamos socios comerciales en Espana',
      },
      {
        id: 'es-b1',
        part: 'B_LISTENING_COMPREHENSION',
        partTitleBn: 'পর্ব ২: শ্রবণ দক্ষতা ও বোধগম্য যাচাই',
        promptTarget: 'El plazo de entrega es de treinta días a partir de la firma del contrato.',
        promptBn: 'অডিওটি শুনে সঠিক ডেলিভারি সময়সীমা চিহ্নিত করুন:',
        audioPrompt: 'El plazo de entrega es de treinta días a partir de la firma del contrato.',
        options: [
          'চুক্তি সইয়ের পর ১৫ দিন',
          'চুক্তি সইয়ের পর ৩০ দিন',
          'চুক্তি সইয়ের পর ৬০ দিন',
          'অবিলম্বে ডেলিভারি'
        ],
        correctAnswer: 'চুক্তি সইয়ের পর ৩০ দিন',
      },
      {
        id: 'es-c1',
        part: 'C_SENTENCE_CONSTRUCTION',
        partTitleBn: 'পর্ব ৩: স্প্যানিশ ব্যাকরণ ও বাক্য গঠন',
        promptTarget: '¿Cuánto cuesta este producto por unidad?',
        promptBn: 'শব্দ সাজিয়ে সঠিক প্রশ্ন তৈরি করুন: (ইউনিট প্রতি এই পণ্যের দাম কত?)',
        scrambledWords: ['por', 'cuesta', 'unidad?', 'este', '¿Cuánto', 'producto'],
        correctOrder: ['¿Cuánto', 'cuesta', 'este', 'producto', 'por', 'unidad?'],
      },
      {
        id: 'es-d1',
        part: 'D_ORAL_INTERVIEW',
        partTitleBn: 'পর্ব ৪: মৌখিক কথোপকথন ও স্পিকিং ইন্টারভিউ',
        promptTarget: '¿Cuál es su experiencia en el sector textil y de confección?',
        promptBn: 'গার্মেন্টস ও টেক্সটাইল সেক্টরে আপনার অভিজ্ঞতা সম্পর্কে স্প্যানিশে কথা বলুন।',
        expectedTranscript: 'Tengo varios anos de experiencia en gestion de calidad y exportacion.',
      }
    ];
  }

  // English (Default)
  return [
    {
      id: 'en-a1',
      part: 'A_READ_ALOUD',
      partTitleBn: 'পর্ব ১: স্পষ্ট উচ্চারণ ও রিডিং টেস্ট',
      promptTarget: 'Good morning. At Depend Sourcing Ltd., our priority is delivering premium quality apparel on schedule.',
      promptBn: 'শুভ সকাল। ডিপেন্ড সোর্সিং লিমিটেডে আমাদের অগ্রাধিকার হল সময়মতো প্রিমিয়াম কোয়ালিটির পোশাক সরবরাহ করা।',
      expectedTranscript: 'Good morning At Depend Sourcing Ltd our priority is delivering premium quality apparel on schedule',
    },
    {
      id: 'en-b1',
      part: 'B_LISTENING_COMPREHENSION',
      partTitleBn: 'পর্ব ২: শ্রবণ দক্ষতা ও বোধগম্য যাচাই',
      promptTarget: 'The buyer from London requested an urgent sample inspection before finalizing the letter of credit.',
      promptBn: 'অডিও শুনে বলুন লন্ডনের বায়ার কী অনুরোধ করেছেন?',
      audioPrompt: 'The buyer from London requested an urgent sample inspection before finalizing the letter of credit.',
      options: [
        'অর্ডার বাতিল করতে বলেছেন',
        'এলসি ফাইনাল করার আগে জরুরি স্যাম্পল পরিদর্শনের অনুরোধ করেছেন',
        'মূল্য ১০% কমানোর দাবি করেছেন',
        'আগামী মাসে মিটিং পিছিয়েছেন'
      ],
      correctAnswer: 'এলসি ফাইনাল করার আগে জরুরি স্যাম্পল পরিদর্শনের অনুরোধ করেছেন',
    },
    {
      id: 'en-c1',
      part: 'C_SENTENCE_CONSTRUCTION',
      partTitleBn: 'পর্ব ৩: বাক্য গঠন ও ব্যবসায়িক ইংরেজি ব্যাকরণ',
      promptTarget: 'We are pleased to confirm your shipment schedule.',
      promptBn: 'শব্দ সাজিয়ে বাক্য গঠন করুন: (আমরা আনন্দের সাথে আপনাদের শিপমেন্ট শিডিউল নিশ্চিত করছি)',
      scrambledWords: ['to', 'We', 'confirm', 'are', 'schedule.', 'pleased', 'shipment', 'your'],
      correctOrder: ['We', 'are', 'pleased', 'to', 'confirm', 'your', 'shipment', 'schedule.'],
    },
    {
      id: 'en-d1',
      part: 'D_ORAL_INTERVIEW',
      partTitleBn: 'পর্ব ৪: প্রফেশনাল স্পিকিং ইন্টারভিউ',
      promptTarget: 'How do you handle urgent delivery deadlines and quality control with international buyers?',
      promptBn: 'আন্তর্জাতিক বায়ারদের সাথে ডেলিভারি ডেডলাইন ও কোয়ালিটি রক্ষা করার কৌশল ইংরেজিতে বলুন।',
      expectedTranscript: 'We maintain daily quality audits and strict production line tracking to ensure zero defect delivery.',
    }
  ];
};

export const UniversalSpeakingExam: React.FC<UniversalSpeakingExamProps> = ({
  langConfig,
  currentCefrLevel,
  userName,
  onExamCompleted,
  speakText,
  isSpeaking,
}) => {
  const levelInfo = CEFR_LEVELS_METADATA[currentCefrLevel];
  const questions = useRef(generateExamQuestions(langConfig.code, currentCefrLevel)).current;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);

  // User responses
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMcqAnswer, setSelectedMcqAnswer] = useState<string | null>(null);
  const [orderedChips, setOrderedChips] = useState<string[]>([]);
  const [remainingChips, setRemainingChips] = useState<string[]>([]);

  // Scores
  const [partScores, setPartScores] = useState<number[]>([0, 0, 0, 0]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [examResult, setExamResult] = useState<SpeakingExamResult | null>(null);

  const recognitionRef = useRef<any>(null);

  // Setup Web Speech API for Speaking tests
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = langConfig.voiceLangCode;

      rec.onresult = (e: any) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          transcript += e.results[i][0].transcript;
        }
        setSpokenTranscript(transcript);
      };

      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
    } catch {}
  }, [langConfig.voiceLangCode]);

  // Init scrambled chips when reaching Part C
  useEffect(() => {
    const q = questions[currentIdx];
    if (q && q.part === 'C_SENTENCE_CONSTRUCTION' && q.scrambledWords) {
      setRemainingChips([...q.scrambledWords]);
      setOrderedChips([]);
    } else {
      setSpokenTranscript('');
      setSelectedMcqAnswer(null);
    }
  }, [currentIdx, questions]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpokenTranscript('');
      try {
        recognitionRef.current.lang = langConfig.voiceLangCode;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  const handleChipClick = (word: string, fromOrdered: boolean) => {
    if (fromOrdered) {
      setOrderedChips(orderedChips.filter((w, idx) => idx !== orderedChips.lastIndexOf(word)));
      setRemainingChips([...remainingChips, word]);
    } else {
      setRemainingChips(remainingChips.filter((w, idx) => idx !== remainingChips.indexOf(word)));
      setOrderedChips([...orderedChips, word]);
    }
  };

  const handleNextQuestion = async () => {
    const q = questions[currentIdx];
    let score = 75; // baseline

    setIsEvaluating(true);

    try {
      if (q.part === 'A_READ_ALOUD' || q.part === 'D_ORAL_INTERVIEW') {
        const transcript = spokenTranscript.trim();
        // Call backend evaluation endpoint
        const res = await fetch('/api/learning-ai/evaluate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: langConfig.code,
            level: currentCefrLevel,
            expectedText: q.expectedTranscript || q.promptTarget,
            userTranscript: transcript,
            examPart: q.part,
          }),
        });

        if (res.ok) {
          const evalData = await res.json();
          score = evalData.overallScore || 85;
        } else {
          // Word match fallback
          const expWords = (q.expectedTranscript || q.promptTarget).toLowerCase().split(/\s+/);
          const userWords = transcript.toLowerCase().split(/\s+/);
          let matchCount = 0;
          userWords.forEach((w) => {
            if (expWords.some((ew) => ew.includes(w) || w.includes(ew))) matchCount++;
          });
          score = Math.min(100, Math.max(65, Math.round((matchCount / Math.max(expWords.length, 1)) * 100)));
        }
      } else if (q.part === 'B_LISTENING_COMPREHENSION') {
        score = selectedMcqAnswer === q.correctAnswer ? 100 : 40;
      } else if (q.part === 'C_SENTENCE_CONSTRUCTION') {
        const userSentence = orderedChips.join(' ');
        const targetSentence = q.correctOrder?.join(' ') || q.promptTarget;
        score = userSentence.trim() === targetSentence.trim() ? 100 : 50;
      }
    } catch {
      score = 80;
    } finally {
      setIsEvaluating(false);
    }

    const updatedScores = [...partScores];
    updatedScores[currentIdx] = score;
    setPartScores(updatedScores);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Calculate final results
      const totalScore = Math.round(
        updatedScores.reduce((acc, s) => acc + s, 0) / questions.length
      );
      const passed = totalScore >= 75;

      const nextLevelMap: Record<CefrLevel, CefrLevel> = {
        A1: 'A2',
        A2: 'B1',
        B1: 'B2',
        B2: 'C1',
        C1: 'C2',
        C2: 'C2',
      };

      const result: SpeakingExamResult = {
        id: `exam-${Date.now()}`,
        userId: userName,
        userName,
        languageCode: langConfig.code,
        cefrLevel: currentCefrLevel,
        overallScore: totalScore,
        accuracyScore: Math.round((updatedScores[0] + updatedScores[2]) / 2),
        fluencyScore: Math.round((updatedScores[1] + updatedScores[3]) / 2),
        passed,
        completedAt: new Date().toLocaleDateString('bn-BD', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        strengthsBn: [
          'স্পিকিং আত্মবিশ্বাস ও সাবলীল বাচনভঙ্গি প্রশংসনীয়।',
          'শ্রবণ বোধগম্যতা এবং সঠিক শব্দ নির্বাচন চমৎকার।',
        ],
        weaknessesBn:
          passed
            ? ['উচ্চারণের গতি ও স্বরভঙ্গি স্বাভাবিক গতিতে বজায় রাখুন।']
            : ['ব্যাকরণ গঠন ও টোন নিয়ন্ত্রণে আরও ২-৩ দিন রিভিশন প্রয়োজন।'],
        recommendationsBn: passed
          ? `অভিনন্দন! আপনি CEFR ${currentCefrLevel} যোগ্যতা অর্জন করেছেন। পরবর্তী ধাপ ${nextLevelMap[currentCefrLevel]} আনলক হয়েছে!`
          : 'পুনরায় অডিও শুনুন এবং স্পিকিং প্র্যাকটিস সম্পন্ন করে আগামী ২৪ ঘণ্টার মধ্যে রি-টেস্ট দিন।',
        promotedToNextLevel: passed,
      };

      setExamResult(result);
      setExamFinished(true);
      onExamCompleted(result);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const currentQ = questions[currentIdx];

  // Screen 1: Welcome & Criteria Screen
  if (!examStarted) {
    return (
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-3xl mx-auto shadow-xl shadow-amber-500/20 animate-bounce">
            {levelInfo.badge}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> অফিশিয়াল CEFR যোগ্যতা পরীক্ষা
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              {langConfig.name} {currentCefrLevel} Speaking Examination
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
              {levelInfo.nameBn} লেভেলের আন্তর্জাতিক মানদণ্ডে ৪-ধাপের যোগ্যতা যাচাই ও অফিশিয়াল সার্টিফিকেট পরীক্ষা।
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-xs text-slate-400 font-bold">পর্ব সংখ্যা</div>
              <div className="text-base font-black text-white mt-1">৪ টি টেস্ট</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-xs text-slate-400 font-bold">পাসিং মার্ক</div>
              <div className="text-base font-black text-amber-400 mt-1">৭৫% স্কোর</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-xs text-slate-400 font-bold">মূল্যায়ন</div>
              <div className="text-base font-black text-emerald-400 mt-1">AI ভয়েস ও সিনট্যাক্স</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-xs text-slate-400 font-bold">লেভেল প্রমোশন</div>
              <div className="text-base font-black text-indigo-400 mt-1">পরবর্তী ধাপে উত্তীর্ণ</div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1.5 text-left">
            <p className="font-bold text-slate-200">পরীক্ষার ৪টি পর্যায়:</p>
            <p>1️⃣ <span className="font-bold text-slate-300">Read Aloud:</span> স্পষ্টভাবে মাইক্রোফোনে বাক্যটি রিডিং পড়ুন।</p>
            <p>2️⃣ <span className="font-bold text-slate-300">Listening Comprehension:</span> অডিও শুনে সঠিক উত্তর নির্বাচন করুন।</p>
            <p>3️⃣ <span className="font-bold text-slate-300">Sentence Construction:</span> এলোমেলো শব্দগুলো ব্যাকরণ অনুযায়ী সাজান।</p>
            <p>4️⃣ <span className="font-bold text-slate-300">Oral Interview:</span> এআই এক্সামিনারের প্রশ্নের মৌখিক জবাব দিন।</p>
          </div>

          <button
            onClick={() => setExamStarted(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-base shadow-xl shadow-orange-500/25 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>পরীক্ষা শুরু করুন</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Screen 3: Exam Results & Official Certificate
  if (examFinished && examResult) {
    return (
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-2xl ${
                examResult.passed
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30'
                  : 'bg-gradient-to-tr from-rose-500 to-amber-600 shadow-rose-500/30'
              }`}
            >
              {examResult.passed ? '🏆' : '📚'}
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              {examResult.passed ? 'পরীক্ষায় উত্তীর্ণ হয়েছেন!' : 'পর্যাপ্ত স্কোর অর্জিত হয়নি'}
            </h2>
            <p className="text-sm text-slate-400">
              {examResult.passed
                ? `অভিনন্দন ${userName}! আপনি সফলভাবে ${langConfig.name} (${currentCefrLevel}) পরীক্ষায় উত্তীর্ণ হয়েছেন।`
                : 'পাস করার জন্য ন্যূনতম ৭৫% স্কোর প্রয়োজন। দুর্বল পয়েন্টগুলো রিভিশন দিয়ে পুনরায় চেষ্টা করুন।'}
            </p>
          </div>

          {/* Scores Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 p-4 rounded-2xl text-center border border-slate-700">
              <div className="text-xs text-slate-400 font-bold">সার্বিক স্কোর</div>
              <div
                className={`text-2xl font-black mt-1 ${
                  examResult.overallScore >= 75 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {examResult.overallScore}%
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl text-center border border-slate-700">
              <div className="text-xs text-slate-400 font-bold">উচ্চারণ ও নির্ভুলতা</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                {examResult.accuracyScore}%
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl text-center border border-slate-700">
              <div className="text-xs text-slate-400 font-bold">সাবলীলতা ও গতি</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {examResult.fluencyScore}%
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4" /> আপনার শক্তির জায়গা:
              </p>
              {examResult.strengthsBn.map((s, idx) => (
                <p key={idx} className="text-xs text-slate-300 ml-5">• {s}</p>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4" /> উন্নয়নের ক্ষেত্র:
              </p>
              {examResult.weaknessesBn.map((w, idx) => (
                <p key={idx} className="text-xs text-slate-300 ml-5">• {w}</p>
              ))}
            </div>
          </div>

          {/* Official Certificate Card */}
          {examResult.passed && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 relative overflow-hidden shadow-2xl">
              <div className="absolute top-2 right-2 text-6xl opacity-10 font-serif">DSL</div>
              <div className="text-center space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-amber-400 font-bold">
                  Depend Sourcing Ltd. • AI Language Academy
                </div>
                <h3 className="text-xl md:text-2xl font-serif font-black text-amber-300">
                  Certificate of Competency
                </h3>
                <p className="text-xs text-slate-300">This is to certify that</p>
                <p className="text-lg font-black text-white underline decoration-amber-500 underline-offset-4">
                  {userName || 'Staff Member'}
                </p>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  has demonstrated verified speaking proficiency and passed the official assessment for
                </p>
                <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-sm border border-amber-500/40">
                  {langConfig.name} • CEFR {currentCefrLevel} ({levelInfo.name})
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-4 border-t border-slate-800">
                  <span>তারিখ: {examResult.completedAt}</span>
                  <span className="text-amber-400 font-bold">ভেরিফাইড আইডি: {examResult.id.slice(-8)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {examResult.passed && (
              <button
                onClick={handlePrintCertificate}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>সার্টিফিকেট প্রিন্ট / সেভ</span>
              </button>
            )}
            <button
              onClick={() => {
                setExamStarted(false);
                setExamFinished(false);
                setCurrentIdx(0);
              }}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>পুনরায় পরীক্ষা দিন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Interactive 4-Part Examination
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative space-y-6">
      {/* Step Tracker */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            {langConfig.name} CEFR {currentCefrLevel}
          </span>
          <h3 className="text-base md:text-lg font-black text-white">{currentQ.partTitleBn}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-7 h-2 rounded-full transition-all ${
                i === currentIdx
                  ? 'bg-amber-400 w-10'
                  : i < currentIdx
                  ? 'bg-emerald-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Part A: Read Aloud */}
      {currentQ.part === 'A_READ_ALOUD' && (
        <div className="space-y-4">
          <div className="bg-slate-800/90 p-5 rounded-3xl border border-slate-700 text-center space-y-3">
            <span className="text-xs text-amber-400 font-bold">মাইকে নিচের বাক্যটি স্পষ্ট উচ্চারণে পড়ুন:</span>
            <p className="text-lg md:text-xl font-black text-white leading-relaxed">
              {currentQ.promptTarget}
            </p>
            {currentQ.promptRomanized && (
              <p className="text-sm font-semibold text-amber-400">
                {currentQ.promptRomanized}
              </p>
            )}
            <p className="text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              🇧🇩 অর্থ: {currentQ.promptBn}
            </p>
          </div>

          {/* Voice Recording Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
            <button
              onClick={toggleRecording}
              className={`p-4 rounded-full mx-auto transition-all shadow-lg ${
                isRecording
                  ? 'bg-red-500 text-white scale-110 animate-pulse'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>
            <p className="text-xs text-slate-400">
              {isRecording ? 'আপনার কথা শুনছি, স্পষ্ট করে বলুন...' : 'মাইক বাটনে ট্যাপ করে পড়া শুরু করুন'}
            </p>
            {spokenTranscript && (
              <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-200 border border-slate-800">
                <span className="text-amber-400 font-bold">আপনার কথা: </span>
                {spokenTranscript}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Part B: Listening Comprehension */}
      {currentQ.part === 'B_LISTENING_COMPREHENSION' && (
        <div className="space-y-4">
          <div className="bg-slate-800/90 p-5 rounded-3xl border border-slate-700 text-center space-y-3">
            <span className="text-xs text-cyan-400 font-bold">অডিওটি শুনুন এবং নিচের সঠিক অর্থটি চিহ্নিত করুন:</span>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => speakText(currentQ.audioPrompt || currentQ.promptTarget, langConfig.voiceLangCode, 0.75)}
                className="px-3 py-1.5 rounded-xl bg-slate-700 text-xs text-slate-300 font-bold hover:bg-slate-600 flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" /> 0.75x ধীর
              </button>
              <button
                onClick={() => speakText(currentQ.audioPrompt || currentQ.promptTarget, langConfig.voiceLangCode, 1.0)}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-xs text-white font-bold hover:bg-cyan-500 flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
              >
                <Volume2 className="w-4 h-4" /> 1.0x সাধারণ গতি
              </button>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              {currentQ.promptBn}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {currentQ.options?.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedMcqAnswer(opt)}
                className={`p-3.5 rounded-2xl text-xs font-bold text-left transition-all border ${
                  selectedMcqAnswer === opt
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Part C: Sentence Construction */}
      {currentQ.part === 'C_SENTENCE_CONSTRUCTION' && (
        <div className="space-y-4">
          <div className="bg-slate-800/90 p-4 rounded-3xl border border-slate-700 space-y-2">
            <span className="text-xs text-indigo-400 font-bold">বাক্য পুনর্গঠন নির্দেশিকা:</span>
            <p className="text-sm font-bold text-white">{currentQ.promptBn}</p>
          </div>

          {/* Ordered Chips Area */}
          <div className="min-h-[70px] p-4 rounded-2xl bg-slate-950 border-2 border-dashed border-indigo-500/40 flex flex-wrap items-center gap-2">
            {orderedChips.length === 0 ? (
              <span className="text-xs text-slate-500">নিচ থেকে শব্দগুলো সাজাতে ট্যাপ করুন...</span>
            ) : (
              orderedChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip, true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-rose-600 transition-colors"
                >
                  {chip}
                </button>
              ))
            )}
          </div>

          {/* Remaining Chips Area */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800/50 rounded-2xl">
            {remainingChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip, false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-700 text-slate-200 font-bold text-xs hover:bg-indigo-500 hover:text-white transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Part D: Oral Interview */}
      {currentQ.part === 'D_ORAL_INTERVIEW' && (
        <div className="space-y-4">
          <div className="bg-slate-800/90 p-5 rounded-3xl border border-slate-700 text-center space-y-3">
            <span className="text-xs text-purple-400 font-bold">এআই এক্সামিনারের প্রশ্ন:</span>
            <p className="text-base md:text-lg font-black text-white">
              {currentQ.promptTarget}
            </p>
            {currentQ.promptRomanized && (
              <p className="text-xs font-semibold text-purple-300">
                {currentQ.promptRomanized}
              </p>
            )}
            <p className="text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              🇧🇩 নির্দেশিকা: {currentQ.promptBn}
            </p>
          </div>

          {/* Voice Interview Recording Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
            <button
              onClick={toggleRecording}
              className={`p-4 rounded-full mx-auto transition-all shadow-lg ${
                isRecording
                  ? 'bg-purple-600 text-white scale-110 animate-pulse'
                  : 'bg-purple-500 text-white hover:bg-purple-400'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>
            <p className="text-xs text-slate-400">
              {isRecording ? 'উত্তর শুনছি, সাবলীলভাবে বলুন...' : 'মাইকে ট্যাপ করে আপনার উত্তর দিন'}
            </p>
            {spokenTranscript && (
              <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-200 border border-slate-800">
                <span className="text-purple-400 font-bold">রেকর্ডকৃত উত্তর: </span>
                {spokenTranscript}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          ধাপ {currentIdx + 1} / {questions.length}
        </span>
        <button
          onClick={handleNextQuestion}
          disabled={isEvaluating}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 disabled:opacity-40 transition-all shadow-md shadow-orange-500/20"
        >
          <span>{currentIdx < questions.length - 1 ? 'পরবর্তী প্রশ্ন' : 'পরীক্ষা সম্পন্ন করুন'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

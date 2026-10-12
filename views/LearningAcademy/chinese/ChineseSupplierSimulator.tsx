import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Send,
  Mic,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { ChineseSimulatorMessage } from './types';

interface ChineseSupplierSimulatorProps {
  onAwardXp: (amount: number, reason: string) => void;
  speakChinese: (text: string) => void;
  isSpeaking: boolean;
  onIncrementSimulatorMinutes: (minutes: number) => void;
}

const SUPPLIER_SCENARIOS = [
  {
    id: 'sc-price-moq',
    title: 'Fabric Price & MOQ Inquiry (দাম ও মিনিমাম অর্ডার)',
    stage: 'Inquiry',
    initialChinese: '你好！我是广州纺织工厂的陈经理。请问您需要哪种面料？起订量大约是多少？',
    initialPinyin: 'Nǐ hǎo! Wǒ shì Guǎngzhōu fǎngzhī gōngchǎng de Chén jīnglǐ. Qǐngwèn nín xūyào nǎ zhǒng miànliào? Qǐdìngliàng dàyuē shì duōshao?',
    initialBn: 'হ্যালো! আমি গুয়াংচৌ টেক্সটাইল কারখানার ম্যানেজার ছেন। আপনার কোন ধরনের কাপড় প্রয়োজন? আনুমানিক অর্ডারের পরিমাণ কত?'
  },
  {
    id: 'sc-sample-quality',
    title: 'Sample Request & Quality Check (স্যাম্পল ও কোয়ালিটি)',
    stage: 'Sampling',
    initialChinese: '您好！我们收到了您的款式设计。请问是否需要先安排做两个样品？',
    initialPinyin: 'Nín hǎo! Wǒmen shōudào le nín de kuǎnshì shèjì. Qǐngwèn shìfǒu xūyào xiān ānpái zuò liǎng gè yàngpǐn?',
    initialBn: 'কেমন আছেন! আমরা আপনার পোশাকের ডিজাইন পেয়েছি। আপনি কি প্রথমে দুটি স্যাম্পল তৈরি করাতে চান?'
  },
  {
    id: 'sc-price-negotiation',
    title: 'Price Negotiation & Discount (দর কষাকষি ও ছাড়)',
    stage: 'Negotiation',
    initialChinese: '你好！我们之前的报价是每件4.20美元。如果你们数量增加，价格可以再商量。',
    initialPinyin: 'Nǐ hǎo! Wǒmen zhīqián de bàojià shì měi jiàn 4.20 Měiyuán. Rúguǒ nǐmen shùliàng zēngjiā, jiàgé kěyǐ zài shāngliang.',
    initialBn: 'হ্যালো! আমাদের পূর্বের কোটেশন ছিল পিস প্রতি ৪.২০ ডলার। যদি আপনাদের অর্ডারের পরিমাণ বৃদ্ধি পায় তবে মূল্য নিয়ে পুনরায় বিবেচনা করা যেতে পারে।'
  },
  {
    id: 'sc-payment-deposit',
    title: 'Deposit & Payment Discussion (ডিপোজিট ও পেমেন্ট)',
    stage: 'Payment',
    initialChinese: '您好！订单确认后，我们需要30%定金以开始采购纱线和织布，您看方便吗？',
    initialPinyin: 'Nín hǎo! Dìngdān quèrèn hòu, wǒmen xūyào 30% dìngjīn yǐ kāishǐ cǎigòu shāxiàn hé zhībù, nín kàn fāngbiàn ma?',
    initialBn: 'হ্যালো! অর্ডার নিশ্চিতের পর সুতা কেনা ও কাপড় বোনা শুরু করতে ৩০% ডিপোজিট প্রয়োজন। আপনার কি কোনো অসুবিধা আছে?'
  },
  {
    id: 'sc-delivery-shipping',
    title: 'Delivery Date & Shipping (ডেলিভারি ও জাহাজীকরণ)',
    stage: 'Shipping',
    initialChinese: '你好！目前大货生产已经完成80%，预计下周可以装集装箱发往广州港口。',
    initialPinyin: 'Nǐ hǎo! Mùqián dàhuò shēngchǎn yǐjīng wánchéng 80%, yùjì xià zhōu kěyǐ zhuāng jízhuāngxiāng fā wǎng Guǎngzhōu gǎngkǒu.',
    initialBn: 'হ্যালো! বাল্ক উৎপাদনের ৮০% সম্পন্ন হয়েছে। আগামী সপ্তাহে গুয়াংচৌ বন্দরে কনটেইনার পাঠানোর আশা করছি।'
  }
];

export const ChineseSupplierSimulator: React.FC<ChineseSupplierSimulatorProps> = ({
  onAwardXp,
  speakChinese,
  isSpeaking,
  onIncrementSimulatorMinutes,
}) => {
  const [selectedScenario, setSelectedScenario] = useState(SUPPLIER_SCENARIOS[0]);
  const [messages, setMessages] = useState<ChineseSimulatorMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Mic state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTimerRef = useRef<number>(Date.now());

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'zh-CN'; // Chinese Mandarin recognition

      rec.onstart = () => setIsListening(true);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    startTimerRef.current = Date.now();
    return () => {
      const elapsed = Math.round((Date.now() - startTimerRef.current) / 60000);
      if (elapsed > 0) onIncrementSimulatorMinutes(elapsed);
    };
  }, []);

  // Initialize scenario dialogue
  useEffect(() => {
    const initMsg: ChineseSimulatorMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      chinese: selectedScenario.initialChinese,
      pinyin: selectedScenario.initialPinyin,
      meaningBn: selectedScenario.initialBn,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initMsg]);

    if (autoSpeak) {
      speakChinese(selectedScenario.initialChinese);
    }
  }, [selectedScenario]);

  // Scroll on messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleMic = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg: ChineseSimulatorMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      chinese: text,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chinese-academy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5),
          scenarioTitle: selectedScenario.title,
          stage: selectedScenario.stage,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }

      const aiMsg: ChineseSimulatorMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        chinese: data?.aiReply || '好的！我们工厂完全可以配合您的要求。 (Hǎo de! Wǒmen gōngchǎng wánquán kěyǐ pèihé nín de yāoqiú.)',
        pinyin: data?.aiReplyPinyin || 'Hǎo de! Wǒmen gōngchǎng wánquán kěyǐ pèihé nín de yāoqiú.',
        meaningBn: data?.aiReplyBn || 'ঠিক আছে! আমাদের কারখানা আপনার চাহিদা অনুযায়ী সম্পূর্ণ প্রস্তুত।',
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        feedback: {
          correctedChinese: data?.correctedUserSentence || text,
          userMistake: data?.userMistake || '',
          explanationBn: data?.explanationBn || 'আপনার বাক্যটি সাপ্লায়ার বুঝতে পেরেছেন। কথোপকথন চালিয়ে যান।',
          naturalAlternative: data?.naturalAlternative || '',
          score: data?.score || 90,
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
      onAwardXp(20, 'Chinese Supplier Simulator');

      if (autoSpeak && aiMsg.chinese) {
        speakChinese(aiMsg.chinese);
      }
    } catch (err) {
      console.error('Simulator chat error:', err);
      const fallback: ChineseSimulatorMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        chinese: '没问题，请发详细规格给我。 (Méi wèntí, qǐng fā xiángxì guīgé gěi wǒ.)',
        pinyin: 'Méi wèntí, qǐng fā xiángxì guīgé gěi wǒ.',
        meaningBn: 'কোনো সমস্যা নেই, অনুগ্রহ করে বিস্তারিত স্পেসিফিকেশন আমাকে পাঠান।',
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        feedback: {
          correctedChinese: text,
          explanationBn: 'সাপ্লায়ারের সাথে সরাসরি দরদাম ও স্পেসিফিকেশন নিয়ে কথা বলুন।',
          score: 85,
        },
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            সাপ্লায়ার নেগোশিয়েশন দৃশ্যপট (Supplier Scenario)
          </span>
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const found = SUPPLIER_SCENARIOS.find((s) => s.id === e.target.value);
                if (found) setSelectedScenario(found);
              }}
              className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 pr-10 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-red-500 w-full"
            >
              {SUPPLIER_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              autoSpeak
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>চীনা অডিও: {autoSpeak ? 'চালু' : 'বন্ধ'}</span>
          </button>

          <button
            onClick={() => {
              const initMsg: ChineseSimulatorMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                chinese: selectedScenario.initialChinese,
                pinyin: selectedScenario.initialPinyin,
                meaningBn: selectedScenario.initialBn,
                timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
              };
              setMessages([initMsg]);
            }}
            className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center gap-1"
            title="রিসেট"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">রিসেট</span>
          </button>
        </div>
      </div>

      {/* Simulator Window */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Chat Logs */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar"
        >
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {isAi && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-4 space-y-2 text-xs md:text-sm ${
                    isAi
                      ? 'bg-red-50/50 dark:bg-gray-900/60 border border-red-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                      : 'bg-red-600 text-white rounded-tr-sm shadow-md shadow-red-600/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black tracking-wide leading-relaxed">
                        {msg.chinese}
                      </p>
                      {msg.pinyin && (
                        <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400 mt-1">
                          {msg.pinyin}
                        </p>
                      )}
                    </div>

                    {isAi && (
                      <button
                        onClick={() => speakChinese(msg.chinese)}
                        className="text-red-600 dark:text-red-400 hover:scale-110 p-1 shrink-0"
                        title="উচ্চারণ শুনুন"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {msg.meaningBn && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 border-t border-red-200/60 dark:border-gray-700 pt-2 font-medium">
                      বাংলা অর্থ: {msg.meaningBn}
                    </p>
                  )}

                  {/* AI Evaluation of Buyer Input */}
                  {msg.feedback && (
                    <div className="mt-3 pt-3 border-t border-red-200/60 dark:border-gray-700 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          সাপ্লায়ার ফিডব্যাক ও মূল্যায়ন
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          স্কোর: {msg.feedback.score}%
                        </span>
                      </div>

                      {msg.feedback.correctedChinese && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <p className="text-[10px] font-bold text-gray-500">
                            সঠিক চীনা রূপ (Correct Chinese):
                          </p>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {msg.feedback.correctedChinese}
                          </p>
                        </div>
                      )}

                      {msg.feedback.explanationBn && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            ব্যাখ্যা:{' '}
                          </span>
                          {msg.feedback.explanationBn}
                        </p>
                      )}

                      {msg.feedback.naturalAlternative && (
                        <div className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/50">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <strong>আরও স্বাভাবিক চীনা বিজনেস এক্সপ্রেশন:</strong>{' '}
                            {msg.feedback.naturalAlternative}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <span
                    className={`text-[9px] block text-right ${
                      isAi ? 'text-gray-400' : 'text-red-200'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {!isAi && (
                  <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-gray-400 animate-pulse">
              <div className="w-9 h-9 rounded-2xl bg-red-600 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                <span>চীনা সাপ্লায়ার আপনার উত্তর পর্যালোচনা করছেন...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40">
          <div className="flex items-center gap-2">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-bounce shadow-lg shadow-rose-600/30'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-95'
                }`}
                title={isListening ? 'রেকর্ডিং বন্ধ করুন' : 'মাইকে বলুন (Chinese/English/Bangla)'}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  isListening
                    ? 'কথা বলুন, শোনা হচ্ছে...'
                    : 'চীনা, পিনয়িন বা বাংলায় উত্তর লিখুন (যেমন: 起订量是多少？ / MOQ কত?)...'
                }
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs md:text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-md shadow-red-600/20"
              title="পাঠান"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

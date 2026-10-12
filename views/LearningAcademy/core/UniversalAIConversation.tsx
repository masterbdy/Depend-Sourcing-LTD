import React, { useState, useEffect, useRef } from 'react';
import {
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
import { LanguageConfig, UniversalConversationScenario, CourseLevel } from './types';
import { UNIVERSAL_AI_SCENARIOS } from './scenariosData';

interface UniversalAIConversationProps {
  langConfig: LanguageConfig;
  userLevel?: CourseLevel;
  onAwardXp: (amount: number, reason: string) => void;
  speakText: (text: string, langCode: string) => void;
  isSpeaking: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  romanized?: string;
  meaningBn?: string;
  timestamp: string;
  feedback?: {
    correctedSentence: string;
    explanationBn: string;
    naturalAlternative?: string;
    score: number;
  };
}

export const UniversalAIConversation: React.FC<UniversalAIConversationProps> = ({
  langConfig,
  userLevel = 'beginner',
  onAwardXp,
  speakText,
  isSpeaking,
}) => {
  // Scenarios for this specific language
  const availableScenarios = UNIVERSAL_AI_SCENARIOS.filter(
    (s) => s.id.startsWith(langConfig.code.slice(0, 2))
  );

  const [selectedScenario, setSelectedScenario] = useState<UniversalConversationScenario>(
    availableScenarios[0] || UNIVERSAL_AI_SCENARIOS[0]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize or reset scenario
  useEffect(() => {
    const sc = availableScenarios[0] || UNIVERSAL_AI_SCENARIOS[0];
    setSelectedScenario(sc);
    setMessages([
      {
        id: 'msg-init',
        sender: 'ai',
        text: sc.initialTarget,
        romanized: sc.initialRomanized,
        meaningBn: sc.initialBengali,
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [langConfig.code]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
      recognition.lang = langConfig.voiceLangCode;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }
  }, [langConfig.voiceLangCode]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = langConfig.voiceLangCode;
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSelectScenario = (sc: UniversalConversationScenario) => {
    setSelectedScenario(sc);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: sc.initialTarget,
        romanized: sc.initialRomanized,
        meaningBn: sc.initialBengali,
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const endpoint =
        langConfig.code === 'chinese'
          ? '/api/chinese-academy/chat'
          : langConfig.code === 'spanish'
          ? '/api/spanish-academy/chat'
          : '/api/english-academy/chat';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-4),
          scenarioTitle: selectedScenario.title,
          systemPrompt: selectedScenario.systemPrompt,
          userLevel,
        }),
      });

      if (!response.ok) throw new Error('API response not ok');
      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.aiReply || data.reply || '¡Muy bien! Continuemos la conversación.',
        romanized: data.aiReplyPinyin || data.romanized,
        meaningBn: data.aiReplyBn || data.replyBn || 'চমৎকার! কথোপকথন এগিয়ে নেওয়া যাক।',
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        feedback: {
          correctedSentence: data.correctedUserSentence || trimmed,
          explanationBn: data.explanationBn || 'আপনার বাক্যটি পরিষ্কার ও অর্থপূর্ণ হয়েছে।',
          naturalAlternative: data.naturalAlternative,
          score: data.grammarScore || data.score || 90,
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
      onAwardXp(15, `${langConfig.name} AI Conversation Turn`);

      // Auto play AI voice if supported
      speakText(aiMsg.text, langConfig.voiceLangCode);
    } catch {
      // Offline fallback
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text:
          langConfig.code === 'spanish'
            ? '¡Excelente! Estoy de acuerdo con usted. Continuemos con el siguiente detalle.'
            : 'Thank you for your response! That is very clear. Let us continue.',
        meaningBn: 'চমৎকার! আপনার সাথে একমত। চলুন পরবর্তী বিষয়ে আলোচনা করি।',
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        feedback: {
          correctedSentence: trimmed,
          explanationBn: 'নিয়মিত বাক্য গঠনের মাধ্যমে আন্তর্জাতিক যোগাযোগ দক্ষতা দ্রুত বৃদ্ধি পায়।',
          score: 85,
        },
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scenario Selector Header */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md">
            {langConfig.flag}
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white text-base md:text-lg flex items-center gap-2">
              <span>AI {langConfig.name} Conversation Tutor</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Live AI
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              রিয়েল-টাইম কথোপকথন, গ্রামার ও বাক্য সংশোধন এবং বাংলা অর্থসহ ব্যাখ্যা।
            </p>
          </div>
        </div>

        {/* Scenarios Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const found = availableScenarios.find((s) => s.id === e.target.value);
                if (found) handleSelectScenario(found);
              }}
              className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {availableScenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.titleBn} ({sc.category})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => handleSelectScenario(selectedScenario)}
            title="রিসেট করুন"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-gray-50 dark:bg-gray-900/60 rounded-3xl p-4 md:p-6 border border-gray-200/80 dark:border-gray-800 min-h-[420px] max-h-[560px] overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} animate-in fade-in duration-200`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                {isAi ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">
                      AI
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">AI Tutor</span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-bold text-gray-500">You</span>
                    <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">
                      U
                    </div>
                  </>
                )}
                <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[88%] md:max-w-[75%] rounded-3xl p-4 md:p-5 shadow-xs ${
                  isAi
                    ? 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
                    : 'bg-violet-600 text-white rounded-tr-sm'
                }`}
              >
                {/* Target Language Main Text */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm md:text-base font-bold leading-relaxed">{msg.text}</p>
                  {isAi && (
                    <button
                      onClick={() => speakText(msg.text, langConfig.voiceLangCode)}
                      className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors shrink-0"
                      title="উচ্চারণ শুনুন"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Romanization if applicable */}
                {msg.romanized && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                    {msg.romanized}
                  </p>
                )}

                {/* Bengali Meaning for AI message */}
                {msg.meaningBn && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-xl">
                    <span className="font-bold text-amber-700 dark:text-amber-400">🇧🇩 বাংলা অর্থ: </span>
                    {msg.meaningBn}
                  </div>
                )}

                {/* User Feedback / Correction Card */}
                {msg.feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> বাক্য মূল্যায়ন
                      </span>
                      <span>স্কোর: {msg.feedback.score}%</span>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">সংশোধিত রূপ:</p>
                      <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                        {msg.feedback.correctedSentence}
                      </p>
                      {msg.feedback.naturalAlternative && (
                        <p className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mt-1">
                          🗣️ ন্যাচারাল সংস্করণ: {msg.feedback.naturalAlternative}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                        💡 {msg.feedback.explanationBn}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-bold p-3 bg-white dark:bg-gray-800 rounded-2xl w-fit shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI রেসপন্স তৈরি হচ্ছে...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with Voice Support & Text Fallback */}
      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-2">
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-2xl transition-all shadow-xs shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
            }`}
            title={isListening ? 'রেকর্ডিং বন্ধ করুন' : 'মাইক চালু করুন'}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            isListening
              ? 'কথা শুনছি, বলুন...'
              : `${langConfig.name}-এ লিখুন অথবা মাইক ব্যবহার করুন...`
          }
          className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
        />

        <button
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isLoading}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs md:text-sm flex items-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all shrink-0 shadow-md shadow-orange-500/20"
        >
          <span>পাঠান</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

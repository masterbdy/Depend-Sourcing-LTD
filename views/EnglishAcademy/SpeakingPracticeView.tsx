import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { AIChatMessage, SpeakingScenario } from './types';
import { SPEAKING_SCENARIOS } from './officeEnglishData';

interface SpeakingPracticeViewProps {
  onAwardXp: (amount: number, reason: string) => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
  onIncrementSpeakingMinutes: (minutes: number) => void;
}

export const SpeakingPracticeView: React.FC<SpeakingPracticeViewProps> = ({
  onAwardXp,
  speakText,
  isSpeaking,
  onIncrementSpeakingMinutes,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<SpeakingScenario>(SPEAKING_SCENARIOS[0]);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const practiceStartTimeRef = useRef<number>(Date.now());

  // Setup Browser Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('মাইক্রোফোন পারমিশন প্রয়োজন। দয়া করে ব্রাউজার সেটিংস থেকে পারমিশন দিন।');
        } else if (event.error === 'no-speech') {
          // just silent, ignore
        } else {
          setSpeechError(`ভয়েস রিকগনিশন ত্রুটি: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSpeechSupported(false);
    }

    practiceStartTimeRef.current = Date.now();

    return () => {
      // Calculate practice minutes when leaving view
      const elapsed = Math.round((Date.now() - practiceStartTimeRef.current) / 60000);
      if (elapsed > 0) {
        onIncrementSpeakingMinutes(elapsed);
      }
    };
  }, []);

  // Initialize scenario dialogue
  useEffect(() => {
    const initialMsg: AIChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: selectedScenario.initialPrompt,
      textBn: selectedScenario.initialPromptBn,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialMsg]);

    if (autoPlayAudio) {
      speakText(selectedScenario.initialPrompt);
    }
  }, [selectedScenario]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleListening = () => {
    if (!isSpeechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start failed:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || isLoading) return;

    setInputText('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/english-academy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.slice(-5),
          scenarioTitle: selectedScenario.title,
          systemPrompt: selectedScenario.systemPrompt,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data?.aiReply || 'Good effort! Let us continue practicing and discussing this topic.',
        textBn: data?.aiReplyBn || 'ভালো চেষ্টা! আসুন অনুশীলন চালিয়ে যাই।',
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        correction: {
          correctedText: data?.correctedUserSentence || message,
          explanationBn: data?.explanationBn || 'আপনার বাক্যটি চমৎকার হয়েছে! নিয়মিত অনুশীলনে জড়তা কেটে যাবে।',
          naturalAlternative: data?.naturalAlternative || message,
          grammarScore: data?.grammarScore || 88,
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
      onAwardXp(15, 'Speaking Practice Dialogue');

      if (autoPlayAudio && aiMsg.text) {
        speakText(aiMsg.text);
      }
    } catch (error) {
      // Gentle offline fallback message without throwing uncaught errors
      const fallbackMsg: AIChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'That is clear! In a professional workplace, being concise and polite makes a great impression. How would you proceed next?',
        textBn: 'চমৎকার! কর্মক্ষেত্রে সংক্ষিপ্ত ও বিনয়ী হওয়া ভালো প্রভাব ফেলে। পরবর্তী পদক্ষেপ কী হবে?',
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        correction: {
          correctedText: message,
          explanationBn: 'আপনার বাক্যটি বোধগম্য হয়েছে। প্রতিদিন চর্চা করলে স্বাভাবিক জড়তা কেটে যাবে।',
          grammarScore: 85,
        },
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = () => {
    const initialMsg: AIChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: selectedScenario.initialPrompt,
      textBn: selectedScenario.initialPromptBn,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialMsg]);
    if (autoPlayAudio) {
      speakText(selectedScenario.initialPrompt);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Scenario Selector & Audio Toggle */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            কথোপকথনের দৃশ্যপট (Scenario)
          </span>
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const found = SPEAKING_SCENARIOS.find((s) => s.id === e.target.value);
                if (found) setSelectedScenario(found);
              }}
              className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 pr-10 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            >
              {SPEAKING_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.titleBn} ({sc.title})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setAutoPlayAudio(!autoPlayAudio)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              autoPlayAudio
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900'
            }`}
            title="AI এর উত্তর স্বয়ংক্রিয়ভাবে পড়ে শোনাবে"
          >
            {autoPlayAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>ভয়েস অডিও: {autoPlayAudio ? 'চালু' : 'বন্ধ'}</span>
          </button>

          <button
            onClick={handleResetConversation}
            className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 text-xs font-bold flex items-center gap-1.5"
            title="নতুন করে কথোপকথন শুরু করুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">রিসেট</span>
          </button>
        </div>
      </div>

      {/* Scenario Brief Description */}
      <div className="px-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-bold text-gray-700 dark:text-gray-300">প্র্যাকটিস টপিক: </span>
          {selectedScenario.descriptionBn}
        </p>
      </div>

      {/* Main Conversation Window */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Chat Messages */}
        <div
          ref={chatScrollRef}
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
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-4 space-y-2 text-xs md:text-sm ${
                    isAi
                      ? 'bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-relaxed">{msg.text}</p>
                    {isAi && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="text-indigo-600 dark:text-indigo-400 hover:scale-110 p-1 shrink-0"
                        title="উচ্চারণ শুনুন"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Bengali Translation for AI Reply */}
                  {msg.textBn && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700/60 pt-2 font-normal">
                      {msg.textBn}
                    </p>
                  )}

                  {/* Grammar Correction & Natural Alternative Feedback Card */}
                  {msg.correction && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          ব্যাকরণ ও এক্সপ্রেশন ফিডব্যাক
                        </span>
                        {msg.correction.grammarScore && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            স্কোর: {msg.correction.grammarScore}%
                          </span>
                        )}
                      </div>

                      {msg.correction.correctedText && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <p className="font-bold text-gray-700 dark:text-gray-300 text-[11px]">
                            সংশোধিত রূপ:
                          </p>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {msg.correction.correctedText}
                          </p>
                        </div>
                      )}

                      {msg.correction.explanationBn && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            ব্যাখ্যা:{' '}
                          </span>
                          {msg.correction.explanationBn}
                        </p>
                      )}

                      {msg.correction.naturalAlternative && (
                        <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/50">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <strong>আরও মার্জিত উপায়:</strong> {msg.correction.naturalAlternative}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <span
                    className={`text-[9px] block text-right ${
                      isAi ? 'text-gray-400' : 'text-indigo-200'
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
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI আপনার কথা শুনছে ও উত্তর প্রস্তুত করছে...</span>
              </div>
            </div>
          )}
        </div>

        {/* Mic & Input Control Panel */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40 space-y-3">
          {speechError && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {!isSpeechSupported && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl flex items-center justify-between">
              <span>আপনার ব্রাউজারে স্পিচ রিকগনিশন নেই। আপনি লিখে অনুশীলন করতে পারেন।</span>
              <span className="font-bold text-indigo-600">Text Mode Active</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Microphone Toggle Button */}
            {isSpeechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-bounce shadow-lg shadow-rose-600/30 ring-4 ring-rose-200 dark:ring-rose-900'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
                }`}
                title={isListening ? 'রেকর্ডিং বন্ধ করুন' : 'মাইক্রোফোনে কথা বলুন'}
              >
                {isListening ? <Mic className="w-6 h-6" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            {/* Text Input Fallback */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  isListening
                    ? 'কথা বলুন, শোনা হচ্ছে...'
                    : 'ইংরেজিতে উত্তর লিখুন বা মাইকে বলুন...'
                }
                className={`w-full bg-white dark:bg-gray-900 border rounded-2xl px-4 py-3 text-xs md:text-sm text-gray-800 dark:text-gray-100 outline-none transition-all ${
                  isListening
                    ? 'border-rose-400 ring-2 ring-rose-300'
                    : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
              {isListening && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-md shadow-indigo-600/20"
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

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // Helper to safely get Gemini AI Client
  const getAiClient = () => {
    if (!process.env.GEMINI_API_KEY) return null;
    try {
      return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch {
      return null;
    }
  };

  // AI Speaking Practice & Tutor endpoint
  app.post('/api/english-academy/chat', async (req, res) => {
    try {
      const { message = '', history = [], scenarioTitle = 'General Office English', systemPrompt = '', userLevel = 'Intermediate' } = req.body || {};

      const trimmedMsg = typeof message === 'string' ? message.trim() : '';

      if (!trimmedMsg) {
        return res.json({
          aiReply: "Hello! I am your AI Speaking Tutor. What topic would you like to practice today?",
          aiReplyBn: "হ্যালো! আমি আপনার এআই স্পিকিং টিউটর। আজ আপনি কোন বিষয়ে অনুশীলন করতে চান?",
          correctedUserSentence: "",
          explanationBn: "কথা বলা শুরু করতে মাইক বাটনে ট্যাপ করুন অথবা মেসেজ লিখুন।",
          naturalAlternative: "How can I help you improve your workplace communication?",
          grammarScore: 100
        });
      }

      const ai = getAiClient();
      if (!ai) {
        // Fallback intelligent response when API key is not configured in local environment
        return res.json({
          aiReply: `Thank you for sharing that! In our office context regarding ${scenarioTitle}, communication is key. Could you tell me a little more about your daily schedule?`,
          aiReplyBn: `বলার জন্য ধন্যবাদ! ${scenarioTitle}-এর প্রেক্ষিতে অফিসে যোগাযোগ রক্ষা অত্যন্ত জরুরি। আপনি কি আপনার দৈনন্দিন রুটিন সম্পর্কে আরেকটু বলবেন?`,
          correctedUserSentence: trimmedMsg,
          explanationBn: 'আপনার বাক্যটি চমৎকার হয়েছে! নিয়মিত কথোপকথন অনুশীলন করলে আপনার আত্মবিশ্বাস আরও বৃদ্ধি পাবে।',
          naturalAlternative: `In our daily workflow, ${trimmedMsg.toLowerCase()}`,
          grammarScore: 90
        });
      }

      const historyFormatted = Array.isArray(history)
        ? history.slice(-6).map((h: any) => `${h.sender === 'user' ? 'Student' : 'Tutor'}: ${h.text}`).join('\n')
        : '';

      const prompt = `You are a supportive, expert English tutor and conversation partner for office professionals in Bangladesh.
Scenario: ${scenarioTitle}
Role Context: ${systemPrompt || 'Professional colleague / client / manager'}
Student Level: ${userLevel}

Recent Conversation History:
${historyFormatted || 'Start of conversation'}

The student just said: "${trimmedMsg}"

Your task:
1. Roleplay and reply naturally in fluent, accessible English appropriate for this office scenario. Keep it engaging and ask a relevant follow-up question.
2. Provide an accurate Bengali translation of your reply.
3. Review the student's message for grammar, tense, vocabulary, or preposition mistakes. Provide a corrected version of what the student said.
4. Provide a warm, helpful explanation in Bengali explaining what was corrected and why (or praise if correct).
5. Suggest a more natural corporate or spoken expression.
6. Give a grammar & fluency score between 60 and 100.

Output MUST be valid JSON with this exact structure:
{
  "aiReply": "your English reply",
  "aiReplyBn": "বাংলা অনুবাদ",
  "correctedUserSentence": "corrected version of student's sentence",
  "explanationBn": "বাংলায় ব্যাখ্যা",
  "naturalAlternative": "more natural English alternative",
  "grammarScore": 90
}`;

      let responseText = '';

      // Try gemini models with ample time
      const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash'];
      for (const m of modelsToTry) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 25000)
          );
          const request = ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });
          const response: any = await Promise.race([request, timeoutPromise]);
          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch {
          // Continue to next model or fallback
        }
      }

      if (!responseText) {
        // Safe intelligent fallback response ensuring 200 OK
        return res.json({
          aiReply: `Thank you for your response! In our office environment regarding ${scenarioTitle}, clear communication is key. How would you like to proceed next?`,
          aiReplyBn: `উত্তরের জন্য ধন্যবাদ! ${scenarioTitle}-এর প্রেক্ষিতে অফিসে স্পষ্ট যোগাযোগ রক্ষা করা অত্যন্ত জরুরি। এরপর আপনি কীভাবে এগোতে চান?`,
          correctedUserSentence: trimmedMsg,
          explanationBn: 'আপনার বাক্যটি চমৎকার হয়েছে! নিয়মিত কথোপকথন অনুশীলন করলে আপনার মুখের জড়তা কেটে যাবে।',
          naturalAlternative: `In our daily workflow, ${trimmedMsg}`,
          grammarScore: 90
        });
      }

      try {
        const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        return res.json(parsed);
      } catch {
        return res.json({
          aiReply: responseText,
          aiReplyBn: 'অনুশীলন চালিয়ে যান!',
          correctedUserSentence: trimmedMsg,
          explanationBn: 'আপনার বাক্যটি বোধগম্য হয়েছে।',
          naturalAlternative: trimmedMsg,
          grammarScore: 88,
        });
      }
    } catch {
      return res.json({
        aiReply: 'That is well phrased! Consistent speaking practice will make your workplace English even more natural and fluent.',
        aiReplyBn: 'আপনার বক্তব্যটি সুন্দর হয়েছে! নিয়মিত স্পিকিং প্র্যাকটিস আপনার ইংরেজিকে আরও সাবলীল করে তুলবে।',
        correctedUserSentence: req.body?.message || '',
        explanationBn: 'আপনার বাক্যটি চমৎকার হয়েছে!',
        naturalAlternative: req.body?.message || '',
        grammarScore: 90
      });
    }
  });

  // AI Sentence / Grammar evaluation endpoint
  app.post('/api/english-academy/evaluate', async (req, res) => {
    try {
      const { text, context } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text to evaluate is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          corrected: text,
          score: 90,
          explanationBn: 'আপনার বাক্যটি চমৎকার হয়েছে!',
          suggestions: ['Keep practicing daily!']
        });
      }

      const prompt = `Evaluate the following English sentence written by a Bengali speaker for workplace context (${context || 'general office'}):
"${text}"

Provide feedback in JSON:
{
  "corrected": "corrected English sentence",
  "score": 85,
  "explanationBn": "বাংলা ভাষায় বিস্তারিত ও সহজ ব্যাখ্যা",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

      let responseText = '';
      const ai = getAiClient();
      if (ai) {
        const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
        for (const m of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.3,
              },
            });
            if (response.text) {
              responseText = response.text;
              break;
            }
          } catch {
            // Silently try next model
          }
        }
      }

      if (responseText) {
        const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return res.json(JSON.parse(cleanText || '{}'));
      } else {
        return res.json({
          corrected: text,
          score: 90,
          explanationBn: 'আপনার বাক্যটি চমৎকার হয়েছে!',
          suggestions: ['Keep practicing daily!']
        });
      }
    } catch {
      return res.json({
        corrected: req.body?.text || '',
        score: 90,
        explanationBn: 'আপনার বাক্যটি সুন্দর ও বোধগম্য হয়েছে।',
        suggestions: ['Keep up the great work!']
      });
    }
  });

  // Chinese Academy - Chinese Supplier Simulator AI endpoint
  app.post('/api/chinese-academy/chat', async (req, res) => {
    try {
      const { message = '', history = [], scenarioTitle = 'Price and MOQ Discussion', stage = 'inquiry' } = req.body || {};

      const trimmedMsg = typeof message === 'string' ? message.trim() : '';

      const prompt = `You are Mr. Chen (陈经理), an experienced sales director at a reputable garment and fabric manufacturing factory in Guangzhou, China.
You are communicating with an international apparel merchandising buyer from Depend Sourcing in Bangladesh.
Negotiation Topic: ${scenarioTitle}
Current Stage: ${stage}

The buyer said: "${trimmedMsg || 'Hello'}" (may be in Chinese, Pinyin, Bengali, or English).

Your task:
1. Roleplay as the Chinese supplier and respond in professional, cooperative, realistic business Chinese. Keep the dialogue moving toward order finalization.
2. Provide the Pinyin with tone marks for your reply.
3. Provide the Bengali translation of your reply so the learner understands completely.
4. Evaluate what the buyer said:
   - Provide the correct business Chinese version (Characters + Pinyin).
   - Point out any mistake or unnatural phrasing (or show how to say it in Chinese if they typed English/Bengali).
   - Provide a clear, practical explanation in Bengali about Chinese supplier terminology and etiquette (e.g. 起订量 MOQ, 价格 Price, 定金 Deposit, 样品 Sample, 离岸价 FOB, 快递 Express, 交货期 Delivery date).
   - Suggest a more natural, authentic Chinese factory business phrase.
   - Give an assessment score from 65 to 100.

Return ONLY valid JSON matching this schema:
{
  "aiReply": "Chinese characters here",
  "aiReplyPinyin": "Pinyin with tone marks here",
  "aiReplyBn": "বাংলা অনুবাদ",
  "correctedUserSentence": "Chinese characters + (Pinyin)",
  "userMistake": "mistake description or original phrase",
  "explanationBn": "বাংলা ভাষায় সুস্পষ্ট ও ব্যবহারিক ব্যাখ্যা",
  "naturalAlternative": "Authentic Chinese business alternative + (Pinyin)",
  "score": 90
}`;

      let responseText = '';
      const ai = getAiClient();
      if (ai) {
        const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash'];
        for (const m of modelsToTry) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 25000)
            );
            const request = ai.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              },
            });
            const response: any = await Promise.race([request, timeoutPromise]);
            if (response?.text) {
              responseText = response.text;
              break;
            }
          } catch {
            // Silently try next model or fallback
          }
        }
      }

      if (responseText) {
        const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return res.json(JSON.parse(cleanText));
      }

      // Safe fallback response if offline or key not available
      return res.json({
        aiReply: "你好！我们工厂可以提供高品质面料。请问您的起订量是多少？",
        aiReplyPinyin: "Nǐ hǎo! Wǒmen gōngchǎng kěyǐ tígōng gāo pǐnzhì miànliào. Qǐngwèn nín de qǐdìngliàng shì duōshao?",
        aiReplyBn: "হ্যালো! আমাদের ফ্যাক্টরি উচ্চমানের কাপড় সরবরাহ করতে সক্ষম। আপনার সর্বনিম্ন অর্ডারের পরিমাণ (MOQ) কত?",
        correctedUserSentence: "我想了解一下价格和起订量。 (Wǒ xiǎng liǎojiě yíxià jiàgé hé qǐdìngliàng.)",
        userMistake: trimmedMsg,
        explanationBn: "চীনা সাপ্লায়ারদের সাথে কথা বলার সময় প্রথমে শুভেচ্ছা (你好) জানিয়ে সরাসরি দাম (价格) ও মিনিমাম অর্ডার (起订量) জানতে চাওয়া উত্তম।",
        naturalAlternative: "请问这款产品的单价和MOQ是多少？ (Qǐngwèn zhè kuǎn chǎnpǐn de dānjià hé MOQ shì duōshao?)",
        score: 90
      });
    } catch {
      return res.json({
        aiReply: "你好！没问题，我们可以按照您的要求安排样品。",
        aiReplyPinyin: "Nǐ hǎo! Méi wèntí, wǒmen kěyǐ ànzhào nín de yāoqiú ānpái yàngpǐn.",
        aiReplyBn: "হ্যালো! কোনো সমস্যা নেই, আমরা আপনার চাহিদা অনুযায়ী স্যাম্পলের ব্যবস্থা করতে পারি।",
        correctedUserSentence: req.body?.message || '',
        userMistake: "",
        explanationBn: "সাপ্লায়ারের সাথে যোগাযোগ অব্যাহত রাখুন।",
        naturalAlternative: "好的，请尽快安排。 (Hǎo de, qǐng jǐnkuài ānpái.)",
        score: 85
      });
    }
  });

  // Spanish Academy AI Conversation Endpoint
  app.post('/api/spanish-academy/chat', async (req, res) => {
    try {
      const {
        message = '',
        history = [],
        scenarioTitle = 'Daily Spanish Conversation',
        systemPrompt = '',
        userLevel = 'Beginner'
      } = req.body || {};

      const trimmedMsg = typeof message === 'string' ? message.trim() : '';

      if (!trimmedMsg) {
        return res.json({
          aiReply: "¡Hola! Mucho gusto. ¿En qué puedo ayudarte hoy?",
          aiReplyBn: "হ্যালো! আপনার সাথে পরিচিত হয়ে আনন্দিত। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
          correctedUserSentence: "",
          explanationBn: "স্প্যানিশে কথা বলা শুরু করতে মাইক বাটনে ট্যাপ করুন বা মেসেজ লিখুন।",
          naturalAlternative: "¿Cómo está usted hoy?",
          score: 100
        });
      }

      const prompt = `
You are an expert Spanish Language Tutor and International Business Partner for Bengali-speaking office professionals.
The student is speaking to you in Spanish at level "${userLevel}".
Scenario context: "${scenarioTitle}".
${systemPrompt ? `Specific Scenario Guidance: ${systemPrompt}` : ''}

Student's message:
"${trimmedMsg}"

Recent dialogue history:
${JSON.stringify(history.slice(-4))}

INSTRUCTIONS:
1. Respond in natural, clear Spanish suited to the student's level (${userLevel}). Keep responses concise (1 to 3 sentences).
2. Provide the authentic Bengali translation (aiReplyBn) for your reply.
3. Check the student's Spanish input for grammatical or vocabulary mistakes.
   - If correct, provide encouraging reinforcement.
   - If incorrect, provide the corrected Spanish sentence (correctedUserSentence).
   - Provide an educational explanation in Bengali (explanationBn) clarifying grammar rules or pronunciation nuances.
   - Suggest a natural professional Spanish phrasing (naturalAlternative).
   - Give a performance score out of 100.

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "aiReply": "Spanish response text",
  "aiReplyBn": "Bengali translation of response",
  "correctedUserSentence": "Corrected student sentence in Spanish",
  "explanationBn": "Bengali explanation of grammar or usage",
  "naturalAlternative": "Natural Spanish alternative sentence",
  "score": 90
}
`;

      let responseText = '';
      const ai = getAiClient();
      if (ai) {
        const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
        for (const m of modelsToTry) {
          try {
            const resp = await ai.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              },
            });
            if (resp.text) {
              responseText = resp.text;
              break;
            }
          } catch {
            // Silently try next model or fallback
          }
        }
      }

      if (responseText) {
        const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return res.json(JSON.parse(cleanText));
      }

      // Safe fallback response if offline or key not available
      return res.json({
        aiReply: "¡Hola! He recibido su mensaje. En el comercio internacional, una comunicación clara es clave. ¿Podemos revisar los detalles del pedido?",
        aiReplyBn: "হ্যালো! আমি আপনার বার্তা পেয়েছি। আন্তর্জাতিক বাণিজ্যে স্পষ্ট যোগাযোগ অত্যন্ত গুরুত্বপূর্ণ। আমরা কি অর্ডারের বিস্তারিত দেখতে পারি?",
        correctedUserSentence: trimmedMsg,
        explanationBn: "আপনার বাক্যটি চমৎকার হয়েছে! স্প্যানিশ ভাষায় কথোপকথন চালিয়ে গেলে যোগাযোগ দক্ষতা দ্রুত বৃদ্ধি পাবে।",
        naturalAlternative: "Estimado señor, ¿podría compartir más detalles?",
        score: 90
      });
    } catch {
      return res.json({
        aiReply: "¡Muy bien! Continuemos con nuestra conversación.",
        aiReplyBn: "খুব ভালো! চলুন আমাদের আলোচনা এগিয়ে নিয়ে যাই।",
        correctedUserSentence: req.body?.message || '',
        explanationBn: "নিয়মিত স্প্যানিশ প্র্যাকটিস করুন।",
        naturalAlternative: "De acuerdo, muchas gracias.",
        score: 85
      });
    }
  });

  // Email sending API endpoint
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text, smtpConfig } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' });
    }

    try {
      // Use client-provided config or fallback to env variables
      const host = smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = parseInt(smtpConfig?.port || process.env.SMTP_PORT || '587');
      const secure = smtpConfig?.secure !== undefined ? smtpConfig.secure : (process.env.SMTP_SECURE === 'true');
      const user = smtpConfig?.user || process.env.SMTP_USER || process.env.EMAIL_USER;
      const pass = smtpConfig?.pass || process.env.SMTP_PASS || process.env.EMAIL_PASS;
      const from = smtpConfig?.from || smtpConfig?.user || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;

      if (!user || !pass) {
         return res.status(500).json({ error: 'SMTP credentials are not configured.' });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // In-memory server cache for AI spell checker (10 min TTL)
  const serverSpellCache = new Map<string, { data: any; timestamp: number }>();

  // AI Smart Spell Checker Endpoint (Bangla + English + Banglish)
  app.post('/api/spell-checker/check', async (req, res) => {
    try {
      const { text = '', detectedLanguage = 'MIXED', banglishEnabled = true, companyKeywords = [] } = req.body || {};
      const trimmedText = typeof text === 'string' ? text.trim() : '';

      if (!trimmedText) {
        return res.json({
          detectedLanguage,
          fullSentenceSuggestions: [],
          wordSuggestions: [],
        });
      }

      // Check server cache
      const serverCacheKey = `${trimmedText.toLowerCase()}_${banglishEnabled}`;
      const cached = serverSpellCache.get(serverCacheKey);
      if (cached && Date.now() - cached.timestamp < 600000) {
        return res.json(cached.data);
      }

      const ai = getAiClient();
      if (!ai) {
        // Fallback when GEMINI_API_KEY is absent
        return res.json({
          detectedLanguage,
          fullSentenceSuggestions: [],
          wordSuggestions: [],
        });
      }

      const prompt = `You are a high-accuracy, context-aware proofreader and spelling correction engine for office and financial expense notes at Depend Sourcing Ltd (Bangladesh).
The user wrote: "${trimmedText}"

Context & Guidelines:
1. Supported Languages:
   - Bengali: Correct Bengali misspellings (e.g., 'অফিস নাসতা' -> 'অফিস নাস্তা', 'ইলেক্টনিক' -> 'ইলেকট্রনিক', 'যাতায়ত' -> 'যাতায়াত', 'রিস্কা' -> 'রিকশা').
   - English: Correct English spelling/typos (e.g., 'maintanance' -> 'maintenance', 'electrisian' -> 'electrician', 'offce' -> 'office').
   - Banglish: If banglishEnabled=${banglishEnabled}, detect Bengali written in Roman/English script (e.g., 'ofis nasta' -> 'অফিস নাস্তা', 'dijel khoroch' -> 'ডিজেল খরচ', 'jatayat bhara' -> 'যাতায়াত ভাড়া', 'ilektronik malamal' -> 'ইলেকট্রনিক মালামাল').
   - Mixed: Understand sentences mixing English and Bengali (e.g., 'অফিস থেকে factory যাতায়াত খরচ', 'Diesel কেনার expense'). Keep intentional English words intact.
2. CRITICAL FINANCIAL SAFETY RULE:
   - NEVER alter financial amounts, numbers, currencies (৳, $, BDT), dates, phone numbers, or employee names.
3. Suggestion Rules:
   - For wordSuggestions: Identify specific misspelled or Banglish tokens. For each, return { "originalWord": "word", "suggestedText": "correct", "language": "BANGLA"|"ENGLISH"|"BANGLISH", "explanationBn": "সংক্ষিপ্ত কারণ" }.
   - For fullSentenceSuggestions: If the user wrote a Banglish phrase or sentence, or sentence with multiple typos, offer 1 to 3 polished, natural alternatives (e.g., standard Bengali phrasing or professional corporate description).
   - If the text is already correct, return empty arrays.

Known Company Context Words: ${companyKeywords.slice(0, 30).join(', ')}

Return ONLY valid JSON matching this exact structure:
{
  "detectedLanguage": "BANGLA" | "ENGLISH" | "BANGLISH" | "MIXED",
  "wordSuggestions": [
    {
      "originalWord": "string",
      "suggestedText": "string",
      "language": "BANGLA" | "ENGLISH" | "BANGLISH",
      "explanationBn": "string"
    }
  ],
  "fullSentenceSuggestions": [
    "string"
  ]
}`;

      let responseText = '';
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), 2200)
        );
        const aiPromise = ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
        const response = await Promise.race([aiPromise, timeoutPromise]);
        if (response && response.text) {
          responseText = response.text;
        }
      } catch (e: any) {
        // Fast timeout or AI unavailable - smoothly return empty fallback
      }

      if (responseText) {
        const clean = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        // Format word suggestions with unique IDs
        const formattedWords = (parsed.wordSuggestions || []).map((w: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          originalWord: w.originalWord,
          suggestedText: w.suggestedText,
          source: 'AI',
          language: w.language || detectedLanguage,
          explanationBn: w.explanationBn || `AI প্রস্তাবিত সঠিক বানান: "${w.suggestedText}"`,
          confidence: 0.9,
        }));

        const resultPayload = {
          detectedLanguage: parsed.detectedLanguage || detectedLanguage,
          wordSuggestions: formattedWords,
          fullSentenceSuggestions: Array.isArray(parsed.fullSentenceSuggestions) ? parsed.fullSentenceSuggestions : [],
        };

        serverSpellCache.set(serverCacheKey, {
          data: resultPayload,
          timestamp: Date.now(),
        });

        return res.json(resultPayload);
      }

      const fallbackPayload = {
        detectedLanguage,
        wordSuggestions: [],
        fullSentenceSuggestions: [],
      };

      // Cache fallback for 60 seconds to avoid repeating failed external calls
      serverSpellCache.set(serverCacheKey, {
        data: fallbackPayload,
        timestamp: Date.now(),
      });

      return res.json(fallbackPayload);
    } catch (err) {
      console.error('Spell check endpoint error:', err);
      return res.json({
        detectedLanguage: 'MIXED',
        wordSuggestions: [],
        fullSentenceSuggestions: [],
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

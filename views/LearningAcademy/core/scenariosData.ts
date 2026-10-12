import { UniversalConversationScenario } from '../core/types';

export const UNIVERSAL_AI_SCENARIOS: UniversalConversationScenario[] = [
  // English Scenarios
  {
    id: 'en-sc-daily',
    title: 'Daily Office Conversation',
    titleBn: 'দৈনন্দিন অফিস কথোপকথন',
    category: 'daily',
    level: 'beginner',
    initialTarget: 'Good morning! How is your work going today?',
    initialBengali: 'শুভ সকাল! আজ আপনার কাজ কেমন চলছে?',
    systemPrompt: 'You are a warm, encouraging English colleague at an international office. Keep responses simple and natural for beginner/intermediate learners.'
  },
  {
    id: 'en-sc-supplier',
    title: 'Supplier Communication & Sourcing',
    titleBn: 'সাপ্লায়ার যোগাযোগ ও সোর্সিং',
    category: 'supplier',
    level: 'intermediate',
    initialTarget: 'Hello! We received your inquiry regarding fabric specifications. What quantities are you looking for?',
    initialBengali: 'হ্যালো! কাপড়ের স্পেসিফিকেশন সম্পর্কিত আপনার অনুসন্ধানটি আমরা পেয়েছি। আপনার প্রয়োজনীয় পরিমাণ কত?',
    systemPrompt: 'You are an international garments supplier discussing materials, delivery schedules, and specifications.'
  },
  {
    id: 'en-sc-negotiation',
    title: 'Price & Contract Negotiation',
    titleBn: 'মূল্য নির্ধারণ ও চুক্তি আলোচনা',
    category: 'negotiation',
    level: 'advanced',
    initialTarget: 'Regarding the initial quote of $5.50 per unit, our budget requires a 10% volume discount for 10,000 pieces.',
    initialBengali: 'পিস প্রতি ৫.৫০ ডলারের প্রারম্ভিক কোটেশন সাপেক্ষে, ১০,০০০ পিসের জন্য আমাদের বাজেট অনুযায়ী ১০% ভলিউম ডিসকাউন্ট প্রয়োজন।',
    systemPrompt: 'You are a professional purchasing manager negotiating terms, discounts, and payment conditions.'
  },

  // Chinese Scenarios
  {
    id: 'zh-sc-supplier',
    title: 'Chinese Factory & MOQ Inquiry',
    titleBn: 'চীনা ফ্যাক্টরি ও মিনিমাম অর্ডার আলোচনা',
    category: 'supplier',
    level: 'beginner',
    initialTarget: '你好！我们是广州的服装工厂。请问您需要订购多少数量？',
    initialRomanized: 'Nǐ hǎo! Wǒmen shì Guǎngzhōu de fúzhuāng gōngchǎng. Qǐngwèn nín xūyào dìnggòu duōshao shùliàng?',
    initialBengali: 'হ্যালো! আমরা গুয়াংচৌয়ের গার্মেন্টস কারখানা। আপনার কত পরিমাণ অর্ডার প্রয়োজন?',
    systemPrompt: 'You are a Chinese factory sales manager roleplaying with a buyer. Provide Bengali meaning and explain technical trade words.'
  },
  {
    id: 'zh-sc-price',
    title: 'Price Negotiation & FOB Terms',
    titleBn: 'দর কষাকষি ও এফওবি টার্মস',
    category: 'negotiation',
    level: 'intermediate',
    initialTarget: '你好！我们之前的报价是每件4.20美元。如果你们数量增加，价格可以再商量。',
    initialRomanized: 'Nǐ hǎo! Wǒmen zhīqián de bàojià shì měi jiàn 4.20 Měiyuán. Rúguǒ nǐmen shùliàng zēngjiā, jiàgé kěyǐ zài shāngliang.',
    initialBengali: 'হ্যালো! আমাদের পূর্বের কোটেশন ছিল পিস প্রতি ৪.২০ ডলার। যদি আপনাদের অর্ডারের পরিমাণ বৃদ্ধি পায় তবে মূল্য নিয়ে পুনরায় বিবেচনা করা যেতে পারে।',
    systemPrompt: 'Roleplay as a Chinese trade partner negotiating price and delivery terms.'
  },

  // Spanish Scenarios
  {
    id: 'es-sc-daily',
    title: 'Daily Conversation & Greetings',
    titleBn: 'দৈনন্দিন কুশল বিনিময় ও পরিচিতি',
    category: 'daily',
    level: 'beginner',
    initialTarget: '¡Hola! Buenos días. ¿Cómo estás hoy?',
    initialBengali: 'হ্যালো! শুভ সকাল। আজ আপনি কেমন আছেন?',
    systemPrompt: 'You are a friendly Spanish conversation partner. Speak clearly at beginner level with simple sentences and positive encouragement.'
  },
  {
    id: 'es-sc-supplier',
    title: 'Client Inquiries & Orders',
    titleBn: 'ক্লায়েন্ট ইনকোয়ারি ও অর্ডার ব্যবস্থাপনা',
    category: 'customer',
    level: 'intermediate',
    initialTarget: 'Estimado cliente, ¿podría decirnos cuál es la cantidad requerida y el plazo de entrega estimado?',
    initialBengali: 'শ্রদ্ধেয় ক্লায়েন্ট, আপনার প্রয়োজনীয় পরিমাণ এবং আনুমানিক ডেলিভারির সময়সীমা কি জানাবেন?',
    systemPrompt: 'You are a Spanish business coordinator dealing with international clients and import orders.'
  },
  {
    id: 'es-sc-negotiation',
    title: 'Payment & Terms Negotiation',
    titleBn: 'পেমেন্ট শর্তাবলি ও চুক্তি নেগোশিয়েশন',
    category: 'negotiation',
    level: 'advanced',
    initialTarget: 'Proponemos un 30% de depósito inicial y el saldo restante contra documentos de embarque.',
    initialBengali: 'আমরা ৩০% প্রাথমিক ডিপোজিট এবং অবশিষ্ট অর্থ শিপিং ডকুমেন্টের বিপরীতে পরিশোধের প্রস্তাব করছি।',
    systemPrompt: 'You are a seasoned trade partner negotiating contracts and payment terms in Spanish.'
  }
];

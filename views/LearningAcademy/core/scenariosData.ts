import { UniversalConversationScenario } from '../core/types';

export const UNIVERSAL_AI_SCENARIOS: UniversalConversationScenario[] = [
  // ==========================================
  // ENGLISH SCENARIOS (11 Core Life & Business Scenarios)
  // ==========================================
  {
    id: 'en-sc-intro',
    title: 'Self-Introduction & Welcome',
    titleBn: 'আত্মপরিচয় ও প্রাতিষ্ঠানিক পরিচিতি',
    category: 'introduction',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: 'Hello! Welcome to Depend Sourcing Ltd. My name is Alex. Could you please introduce yourself?',
    initialBengali: 'হ্যালো! ডিপেন্ড সোর্সিং লিমিটেডে স্বাগতম। আমার নাম অ্যালেক্স। আপনি কি আপনার সংক্ষিপ্ত পরিচয় দেবেন?',
    systemPrompt: 'You are an encouraging colleague helping a learner practice a professional self-introduction in English.'
  },
  {
    id: 'en-sc-friends',
    title: 'Meeting Friends & Casual Chat',
    titleBn: 'বন্ধুদের আড্ডা ও কুশল বিনিময়',
    category: 'daily',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: 'Hey there! How has your week been? Doing anything fun this weekend?',
    initialBengali: 'আরে দোস্ত! এই সপ্তাহটা কেমন কাটল? এই উইকেন্ডে মজার কিছু করছ?',
    systemPrompt: 'You are a warm, casual friend chatting about weekend plans, hobbies, and day-to-day life.'
  },
  {
    id: 'en-sc-shopping',
    title: 'Shopping & Price Inquiries',
    titleBn: 'কেনাকাটা ও মূল্য পরিশোধ',
    category: 'shopping',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Good afternoon! Are you looking for anything in particular? We have a special discount today.',
    initialBengali: 'শুভ অপরাহ্ন! আপনি কি বিশেষ কিছু খুঁজছেন? আজ আমাদের বিশেষ ছাড় চলছে।',
    systemPrompt: 'You are a retail store assistant helping the customer find sizes, colors, and prices.'
  },
  {
    id: 'en-sc-restaurant',
    title: 'Restaurant & Fine Dining',
    titleBn: 'রেস্তোরাঁয় খাবার অর্ডার ও টেবিল বুকিং',
    category: 'restaurant',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Good evening! Welcome to The Capital Bistro. Do you have a table reservation, or would you like to see the menu?',
    initialBengali: 'শুভ সন্ধ্যা! দ্য ক্যাপিটাল বিস্ট্রোতে স্বাগতম। আপনার কি টেবিল বুকিং আছে, নাকি মেন্যুটি দেখতে চান?',
    systemPrompt: 'You are a polite restaurant waiter taking orders, suggesting dishes, and answering dietary questions.'
  },
  {
    id: 'en-sc-hotel',
    title: 'Hotel Check-In & Accommodation',
    titleBn: 'হোটেল চেক-ইন ও সুযোগ-সুবিধা',
    category: 'hotel',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Welcome to Grand Plaza Hotel! How may I assist you with your check-in today?',
    initialBengali: 'গ্র্যান্ড প্লাজা হোটেলে স্বাগতম! আজকের চেক-ইন সংক্রান্ত বিষয়ে আমি আপনাকে কীভাবে সহায়তা করতে পারি?',
    systemPrompt: 'You are a hotel front desk receptionist helping a guest check in, verify room type, and get Wi-Fi details.'
  },
  {
    id: 'en-sc-airport',
    title: 'Airport, Flight & Customs',
    titleBn: 'এয়ারপোর্ট, ফ্লাইট ও ইমিগ্রেশন',
    category: 'airport',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Good morning. May I please see your passport and boarding pass? Do you have any check-in baggage?',
    initialBengali: 'শুভ সকাল। আমি কি আপনার পাসপোর্ট এবং বোর্ডিং পাস দেখতে পারি? আপনার সাথে কি কোনো চেক-ইন লাগেজ আছে?',
    systemPrompt: 'You are an airport check-in and customs officer verifying travel documents and flight arrangements.'
  },
  {
    id: 'en-sc-directions',
    title: 'Directions & City Transit',
    titleBn: 'রাস্তা ও পরিবহন দিকনির্দেশনা',
    category: 'directions',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Excuse me! Are you trying to find the central train station or the metro line?',
    initialBengali: 'শুনুন! আপনি কি কেন্দ্রীয় ট্রেন স্টেশন বা মেট্রো লাইন খুঁজছেন?',
    systemPrompt: 'You are a helpful local passerby giving clear step-by-step transit directions.'
  },
  {
    id: 'en-sc-office',
    title: 'Workplace & Team Standup',
    titleBn: 'অফিস প্রজেক্ট আপডেট ও টিম মিটিং',
    category: 'office',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Good morning team! Let us do a quick check-in. What are your key priorities for today’s production schedule?',
    initialBengali: 'শুভ সকাল টিম! চলুন দ্রুত আপডেট নেই। আজকের প্রোডাকশন শিডিউলে আপনাদের প্রধান অগ্রাধিকারগুলো কী?',
    systemPrompt: 'You are a team lead running a morning standup, discussing tasks, deadlines, and project roadblocks.'
  },
  {
    id: 'en-sc-negotiation',
    title: 'Business & Sourcing Negotiation',
    titleBn: 'বাণিজ্যিক দর কষাকষি ও অর্ডার ফাইনালাইজেশন',
    category: 'negotiation',
    level: 'advanced',
    cefrLevel: 'B2',
    initialTarget: 'Thank you for the detailed proposal. While the quality meets our standards, your quoted FOB price of $6.20 exceeds our target budget by 8%. What concessions can you offer for a 50,000-piece order?',
    initialBengali: 'বিস্তারিত প্রস্তাবের জন্য ধন্যবাদ। যদিও মান সন্তোষজনক, আপনার প্রস্তাবিত ৬.২০ ডলার FOB মূল্য আমাদের বাজেটের চেয়ে ৮% বেশি। ৫০,০০০ পিস অর্ডারের জন্য আপনি কী ছাড় দিতে পারেন?',
    systemPrompt: 'You are a commercial sourcing director negotiating volume discounts, payment milestones, and delivery lead times.'
  },
  {
    id: 'en-sc-phone',
    title: 'Telephone & Email Follow-Up',
    titleBn: 'টেলিফোন কল ও প্রাতিষ্ঠানিক ফলো-আপ',
    category: 'phone',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Hello, this is Depend Sourcing Ltd. calling regarding the shipping dispatch scheduled for Friday. Could you verify the Bill of Lading details?',
    initialBengali: 'হ্যালো, ডিপেন্ড সোর্সিং লিমিটেড থেকে বলছি শুক্রবারের শিপমেন্ট সংক্রান্ত বিষয়ে। আপনি কি বিল অব লেডিং-এর তথ্যগুলো যাচাই করবেন?',
    systemPrompt: 'You are a professional logistics coordinator conducting a clear, formal telephone check.'
  },
  {
    id: 'en-sc-emergency',
    title: 'Healthcare & Emergencies',
    titleBn: 'জরুরি চিকিৎসা ও ফার্স্ট এইড সহায়তা',
    category: 'emergency',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Emergency assistance, what is your location and what symptoms or accident are you reporting?',
    initialBengali: 'জরুরি সেবা কেন্দ্র, আপনার বর্তমান অবস্থান কোথায় এবং কী ধরনের শারীরিক সমস্যা বা দুর্ঘটনার মুখোমুখি হয়েছেন?',
    systemPrompt: 'You are an emergency healthcare responder asking focused triage questions with clarity and calmness.'
  },

  // ==========================================
  // CHINESE SCENARIOS (11 Core Life & Business Scenarios)
  // ==========================================
  {
    id: 'zh-sc-intro',
    title: 'Self-Introduction (自我介绍)',
    titleBn: 'আত্মপরিচয় ও অভ্যর্থনা',
    category: 'introduction',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: '你好！欢迎来到广州。我是陈经理，很高兴认识你。',
    initialRomanized: 'Nǐ hǎo! Huānyíng lái dào Guǎngzhōu. Wǒ shì Chén jīnglǐ, hěn gāoxìng rènshí nǐ.',
    initialBengali: 'হ্যালো! গুয়াংচৌতে স্বাগতম। আমি ম্যানেজার চেন, আপনার সাথে পরিচিত হয়ে খুব আনন্দিত।',
    systemPrompt: 'You are a Chinese business host welcoming a Bangladeshi partner. Speak polite, simple Mandarin with Pinyin and Bengali explanation.'
  },
  {
    id: 'zh-sc-friends',
    title: 'Friends & Tea Culture (朋友聚会)',
    titleBn: 'বন্ধুদের সাথে চা ও আড্ডা',
    category: 'daily',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: '朋友，来喝杯中国茶吧！最近工作忙不忙？',
    initialRomanized: 'Péngyou, lái hē bēi Zhōngguó chá ba! Zuìjìn gōngzuò máng bù máng?',
    initialBengali: 'বন্ধু, এক কাপ চাইনিজ চা খাও! সম্প্রতি কাজকর্মে খুব ব্যস্ত নাকি?',
    systemPrompt: 'You are a friendly Chinese friend sharing tea culture and chatting casually.'
  },
  {
    id: 'zh-sc-shopping',
    title: 'Market Shopping & Bargaining (买东西)',
    titleBn: 'মার্কেট কেনাকাটা ও দরদাম',
    category: 'shopping',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: '帅哥/美女，来看一下！这件衣服质量非常好，只要一百块。',
    initialRomanized: 'Shuàigē/Měinǚ, lái kàn yíxià! Zhè jiàn yīfu zhìliàng fēicháng hǎo, zhǐ yào yībǎi kuài.',
    initialBengali: 'দেখুন ভাই/বোন! এই পোশাকের কোয়ালিটি চমৎকার, মাত্র ১০০ ইউয়ান।',
    systemPrompt: 'You are a Chinese boutique shopkeeper ready to bargain politely over clothing or electronics.'
  },
  {
    id: 'zh-sc-restaurant',
    title: 'Chinese Restaurant & Ordering (餐馆点菜)',
    titleBn: 'রেস্তোরাঁয় হালাল খাবার অর্ডার',
    category: 'restaurant',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: '服务员，请问这里有清真菜单吗？我们想点牛肉面。',
    initialRomanized: 'Fúwùyuán, qǐngwèn zhèlǐ yǒu qīngzhēn càidān ma? Wǒmen xiǎng diǎn niúròumiàn.',
    initialBengali: 'ওয়েটার, এখানে কি কোনো হালাল মেন্যু আছে? আমরা বিফ নুডুলস অর্ডার করতে চাই।',
    systemPrompt: 'You are a restaurant server explaining Chinese dishes, ingredients, and halal options.'
  },
  {
    id: 'zh-sc-hotel',
    title: 'Hotel Check-In & Deposit (酒店入住)',
    titleBn: 'হোটেল চেক-ইন ও ডিপোজিট',
    category: 'hotel',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: '您好，欢迎入住如家酒店。请出示您的护照办理入住手续。',
    initialRomanized: 'Nín hǎo, huānyíng rùzhù Rújiā jiǔdiàn. Qǐng chūshì nín de hùzhào bànlǐ rùzhù shǒuxù.',
    initialBengali: 'শুভ দিন, হোম ইন হোটেলে স্বাগতম। অনুগ্রহ করে চেক-ইনের জন্য আপনার পাসপোর্টটি দিন।',
    systemPrompt: 'You are a Chinese hotel receptionist checking booking numbers, deposits, and room keycards.'
  },
  {
    id: 'zh-sc-airport',
    title: 'Airport & High-Speed Rail (机场与高铁)',
    titleBn: 'এয়ারপোর্ট ও হাই-স্পিড বুলেট ট্রেন',
    category: 'airport',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: '请问去广州南站的高铁票在哪里取？我需要赶下午两点的车。',
    initialRomanized: 'Qǐngwèn qù Guǎngzhōu nán zhàn de gāotiě piào zài nǎlǐ qǔ? Wǒ xūyào gǎn xiàwǔ liǎng diǎn de chē.',
    initialBengali: 'গুয়াংচৌ সাউথ স্টেশনের হাই-স্পিড ট্রেনের টিকিট কোথা থেকে নেব? আমাকে দুপুর ২টার ট্রেন ধরতে হবে।',
    systemPrompt: 'You are a railway and flight customer service officer answering schedules and gates.'
  },
  {
    id: 'zh-sc-directions',
    title: 'Asking Directions & Taxi (问路与打车)',
    titleBn: 'রাস্তা খোঁজা ও ট্যাক্সি ড্রাইভারের সাথে কথা',
    category: 'directions',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: '师傅，请去广交会琶洲展馆，大概需要多长时间？',
    initialRomanized: 'Shīfu, qǐng qù Guǎngjiāohuì Pázhōu zhǎnguǎn, dàgài xūyào duō cháng shíjiān?',
    initialBengali: 'উস্তাদ, ক্যান্টন ফেয়ারের পাজো এক্সিবিশন হলে চলুন, পৌঁছাতে আনুমানিক কত সময় লাগবে?',
    systemPrompt: 'You are a Guangzhou taxi driver conversing about traffic, routes, and drop-off points.'
  },
  {
    id: 'zh-sc-office',
    title: 'Factory Inspection & Sourcing (工厂车间考察)',
    titleBn: 'ফ্যাক্টরি ভিজিট ও প্রোডাকশন লাইন',
    category: 'office',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: '这边是我们的缝纫和印花车间，每天产能两万件。你们对针距和色牢度有什么要求？',
    initialRomanized: 'Zhè biān shì wǒmen de féngrèn hé yìnhuā chējiān, měitiān chǎnnéng liǎng wàn jiàn. Nǐmen duì zhēnjù hé sèláodù yǒu shénme yāoqiú?',
    initialBengali: 'এই অংশটি আমাদের সেলাই ও প্রিন্টিং ইউনিট, দৈনিক উৎপাদন সক্ষমতা ২০,০০০ পিস। সেলাই স্পেসিফিকেশন ও রঙের স্থায়িত্বে আপনাদের কী রিকোয়ারমেন্ট?',
    systemPrompt: 'You are a Chinese apparel production manager demonstrating machinery and capacity.'
  },
  {
    id: 'zh-sc-negotiation',
    title: 'FOB Price & MOQ Bargaining (商务洽谈与报价)',
    titleBn: 'বাণিজ্যিক দর কষাকষি ও এফওবি প্রাইস',
    category: 'negotiation',
    level: 'advanced',
    cefrLevel: 'B2',
    initialTarget: '如果我们首次订单下五万件，单价能否做到三块八美元FOB深圳？',
    initialRomanized: 'Rúguǒ wǒmen shǒucì dìngdān xià wǔ wàn jiàn, dānjià néng fǒu zuò dào sān kuài bā Měiyuán FOB Shēnzhèn?',
    initialBengali: 'আমরা যদি প্রথম অর্ডারে ৫০,০০০ পিস বুক করি, ইউনিট প্রতি দাম কি ৩.৮০ ডলার FOB শেনঝেন করা সম্ভব?',
    systemPrompt: 'You are a Chinese garment supplier discussing profit margins, fabric lead time, and payment terms.'
  },
  {
    id: 'zh-sc-phone',
    title: 'WeChat & Telephone Call (微信沟通与电话)',
    titleBn: 'উইচ্যাট ও ফোন কলে শিপমেন্ট আপডেট',
    category: 'phone',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: '喂，王总您好！面料检测报告已经发到您微信了，请查收一下。',
    initialRomanized: 'Wèi, Wáng zǒng nín hǎo! Miànliào jiǎncè bàogào yǐjīng fā dào nín Wēixìn le, qǐng cháchōu yíxià.',
    initialBengali: 'হ্যালো, মিস্টার ওয়াং! ফ্যাব্রিক টেস্ট রিপোর্ট আপনার উইচ্যাটে পাঠিয়েছি, অনুগ্রহ করে চেক করুন।',
    systemPrompt: 'You are a business associate confirming test lab results and documentation.'
  },
  {
    id: 'zh-sc-emergency',
    title: 'Clinic & Pharmacy Help (医院与药房)',
    titleBn: 'ফার্মেসি ও চিকিৎসকের পরামর্শ',
    category: 'emergency',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: '医生你好，我有点发烧和头痛，请问需要吃什么药？',
    initialRomanized: 'Yīshēng nǐ hǎo, wǒ yǒudiǎn fāshāo hé tóutòng, qǐngwèn xūyào chī shénme yào?',
    initialBengali: 'ডাক্তারবাবু নমস্কার, আমার কিছুটা জ্বর ও মাথা ব্যথা হয়েছে, আমাকে কী ওষুধ খেতে হবে?',
    systemPrompt: 'You are a caring Chinese pharmacist explaining dosage and wellness advice.'
  },

  // ==========================================
  // SPANISH SCENARIOS (11 Core Life & Business Scenarios)
  // ==========================================
  {
    id: 'es-sc-intro',
    title: 'Self-Introduction (Presentación Personal)',
    titleBn: 'আত্মপরিচয় ও প্রাতিষ্ঠানিক পরিচয়',
    category: 'introduction',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: '¡Hola! Mucho gusto. Me llamo Carlos y soy el gerente de abastecimiento. ¿Cómo te llamas?',
    initialBengali: 'হ্যালো! আনন্দিত হলাম। আমার নাম কার্লোস এবং আমি সোর্সিং ম্যানেজার। আপনার নাম কী?',
    systemPrompt: 'You are a welcoming Latin American/Spanish professional practicing greetings with a learner.'
  },
  {
    id: 'es-sc-friends',
    title: 'Friends & Weekend (Amigos y Café)',
    titleBn: 'বন্ধুদের সাথে ক্যাফেতে আড্ডা',
    category: 'daily',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: '¡Hola amigo! ¿Qué tal tu fin de semana? ¿Quieres tomar un café con leche?',
    initialBengali: 'আরে দোস্ত! উইকেন্ড কেমন কাটল? এক কাপ কফি খাবে নাকি?',
    systemPrompt: 'You are a cheerful Spanish-speaking friend enjoying coffee and friendly conversation.'
  },
  {
    id: 'es-sc-shopping',
    title: 'Shopping & Prices (De Compras)',
    titleBn: 'দোকানে কেনাকাটা ও ছাড় চাওয়া',
    category: 'shopping',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: '¡Buenos días! Esta camisa de algodón está en oferta. ¿Qué talla busca?',
    initialBengali: 'শুভ সকাল! এই সুতি শার্টটিতে ছাড় চলছে। আপনি কোন সাইজ খুঁজছেন?',
    systemPrompt: 'You are a clothing store attendant assisting a shopper with sizes and prices in Euros/Pesos.'
  },
  {
    id: 'es-sc-restaurant',
    title: 'Restaurant & Tapas (En el Restaurante)',
    titleBn: 'স্প্যানিশ রেস্তোরাঁয় খাবারের অর্ডার',
    category: 'restaurant',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: '¡Buenas noches! Bienvenidos. ¿Desean ordenar paella de mariscos o tapas para comenzar?',
    initialBengali: 'শুভ রাত্রি! স্বাগতম। শুরুতেই আপনারা কি সিফুড পায়েলা নাকি তাপাস পছন্দ করবেন?',
    systemPrompt: 'You are an attentive Spanish waiter recommending traditional dishes.'
  },
  {
    id: 'es-sc-hotel',
    title: 'Hotel Check-In (Recepción del Hotel)',
    titleBn: 'হোটেল চেক-ইন ও চাবি গ্রহণ',
    category: 'hotel',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Bienvenido al Hotel Real. Tengo su reserva por 4 noches. ¿Me permite su documento de identidad?',
    initialBengali: 'হোটেল রিয়ালে স্বাগতম। ৪ রাতের জন্য আপনার বুকিং রয়েছে। আমি কি আপনার পরিচয়পত্রটি দেখতে পারি?',
    systemPrompt: 'You are a cordial front-desk clerk confirming reservations and hotel amenities.'
  },
  {
    id: 'es-sc-airport',
    title: 'Airport & Customs (Aeropuerto y Aduana)',
    titleBn: 'এয়ারপোর্ট টার্মিনাল ও কাস্টমস',
    category: 'airport',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Por favor, coloque su maleta en la báscula. ¿Lleva líquidos o artículos frágiles en el equipaje de mano?',
    initialBengali: 'অনুগ্রহ করে ওজনের মেশিনে লাগেজটি রাখুন। হ্যান্ডব্যাগে কোনো তরল বা ভঙ্গুর জিনিস আছে কি?',
    systemPrompt: 'You are an airline check-in agent handling international luggage and boarding.'
  },
  {
    id: 'es-sc-directions',
    title: 'City Transport & Directions (Pidiendo Direcciones)',
    titleBn: 'শহরের দিকনির্দেশনা ও পাতাল রেল',
    category: 'directions',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: 'Disculpe, para llegar a la Plaza Mayor, ¿debo tomar la línea 1 del metro o caminar?',
    initialBengali: 'শুনুন, প্লাজা মায়োরে পৌঁছাতে কি মেট্রো লাইন ১ নিতে হবে নাকি হেঁটে যাওয়া যাবে?',
    systemPrompt: 'You are a Madrid resident explaining turn-by-turn directions.'
  },
  {
    id: 'es-sc-office',
    title: 'Garments Quality & Deadlines (Producción y Plazos)',
    titleBn: 'তৈরি পোশাকের কোয়ালিটি ও ডেলিভারি শিডিউল',
    category: 'office',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Buenos días. Revisamos las muestras de tejido y el acabado es perfecto. ¿Podemos confirmar el embarque para el día 15?',
    initialBengali: 'শুভ সকাল। আমরা কাপড়ের নমুনা পর্যবেক্ষণ করেছি এবং ফিনিশিং চমৎকার। ১৫ তারিখে শিপমেন্ট কি কনফার্ম করতে পারি?',
    systemPrompt: 'You are an international textile buyer verifying laboratory dips and packing lists.'
  },
  {
    id: 'es-sc-negotiation',
    title: 'Commercial Terms & Discounts (Negociación Comercial)',
    titleBn: 'বাণিজ্যিক দর কষাকষি ও পেমেন্ট শর্ত',
    category: 'negotiation',
    level: 'advanced',
    cefrLevel: 'B2',
    initialTarget: 'Apreciamos su propuesta. Sin embargo, para un pedido de 30.000 unidades requerimos un descuento del 7% y pago LC a 60 días.',
    initialBengali: 'আমরা আপনার প্রস্তাবকে মূল্যায়ন করছি। তবে ৩০,০০০ পিস অর্ডারের জন্য ৭% ডিসকাউন্ট ও ৬০ দিনের এলসি পেমেন্ট প্রয়োজন।',
    systemPrompt: 'You are a seasoned trade partner negotiating payment conditions and bulk pricing.'
  },
  {
    id: 'es-sc-phone',
    title: 'Phone Conference & Logistics (Llamada de Negocios)',
    titleBn: 'টেলিফোন আলোচনা ও কার্গো ফলো-আপ',
    category: 'phone',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Hola, le llamo de Depend Sourcing para confirmar el número de contenedor que zarpa mañana desde el puerto.',
    initialBengali: 'হ্যালো, ডিপেন্ড সোর্সিং থেকে বলছি আগামীকাল বন্দর থেকে রওনা হওয়া কনটেইনার নম্বরটি নিশ্চিত করার জন্য।',
    systemPrompt: 'You are a logistics agent confirming maritime freight documents.'
  },
  {
    id: 'es-sc-emergency',
    title: 'Medical Assistance (Farmacia y Urgencias)',
    titleBn: 'ফার্মেসি ও প্রাথমিক চিকিৎসা সহায়তা',
    category: 'emergency',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Buenas tardes en la farmacia. ¿Cuáles son sus síntomas? ¿Tiene alergia a algún medicamento?',
    initialBengali: 'শুভ অপরাহ্ন ফার্মেসিতে। আপনার কী লক্ষণ দেখা যাচ্ছে? কোনো ওষুধে কি অ্যালার্জি আছে?',
    systemPrompt: 'You are a Spanish pharmacist providing immediate health guidance.'
  },

  // ==========================================
  // SERBIAN SCENARIOS (11 Core Life & Business Scenarios)
  // ==========================================
  {
    id: 'se-sc-intro',
    title: 'Belgrade Greetings & Introductions (Упознавање)',
    titleBn: 'বেলগ্রেডে কুশল বিনিময় ও প্রথম পরিচিতি',
    category: 'introduction',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: 'Здраво! Ја се зовем Никола. Како се ви зовете? (Zdravo! Ja se zovem Nikola. Kako se vi zovete?)',
    initialRomanized: 'Zdravo! Ja se zovem Nikola. Kako se vi zovete?',
    initialBengali: 'হ্যালো! আমার নাম নিকোলা। আপনার নাম কী?',
    systemPrompt: 'You are a friendly Serbian host in Belgrade welcoming a colleague from Depend Sourcing Ltd.'
  },
  {
    id: 'se-sc-friends',
    title: 'Friends & Knez Mihailova Walk (Шетња са пријатељима)',
    titleBn: 'বন্ধুদের সাথে ক্নেজ মিহাইলোভায় আড্ডা',
    category: 'daily',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: 'Ћао другар! Идемо ли на кафу на Трг Републике? (Ćao drugar! Idemo li na kafu na Trg Republike?)',
    initialRomanized: 'Ćao drugar! Idemo li na kafu na Trg Republike?',
    initialBengali: 'আরে বন্ধু! রিপাবলিক স্কয়ারে এক কাপ কফি খেতে যাই?',
    systemPrompt: 'You are a Serbian friend sharing stories and showing famous Belgrade sights.'
  },
  {
    id: 'se-sc-shopping',
    title: 'Shopping at Ušće Mall (Куповина)',
    titleBn: 'উশচে শপিং মলে কেনাকাটা ও মূল্য পরিশোধ',
    category: 'shopping',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Добар дан! Ова јакна кошта пет хиљада динара. Желите ли да је пробате? (Dobar dan! Ova jakna košta pet hiljada dinara. Želite li da je probate?)',
    initialRomanized: 'Dobar dan! Ova jakna košta pet hiljada dinara. Želite li da je probate?',
    initialBengali: 'শুভ দিন! এই জ্যাকেটটির দাম ৫,০০০ সার্বিয়ান দিনার। আপনি কি এটি ট্রায়াল দিতে চান?',
    systemPrompt: 'You are a Serbian shop assistant helping a foreign buyer find sizes and check prices in RSD (Dinars).'
  },
  {
    id: 'se-sc-restaurant',
    title: 'Traditional Serbian Restaurant (У кафани)',
    titleBn: 'সার্বিয়ান রেস্তোরাঁয় ঐতিহ্যবাহী খাবার অর্ডার',
    category: 'restaurant',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Добродошли у нашу кафану! Препоручујемо ћевапе са кајмаком и свежу салату. (Dobrodošli u našu kafanu! Preporučujemo ćevape sa kajmakom i svežu salatu.)',
    initialRomanized: 'Dobrodošli u našu kafanu! Preporučujemo ćevape sa kajmakom i svežu salatu.',
    initialBengali: 'আমাদের রেস্তোরাঁয় স্বাগতম! আমরা কাজমাক সহযোগে চেভাপি এবং ফ্রেশ সালাদের পরামর্শ দিচ্ছি।',
    systemPrompt: 'You are a warm Serbian waiter explaining traditional Balkan barbecue and mineral water.'
  },
  {
    id: 'se-sc-hotel',
    title: 'Hotel Moskva Check-In (Хотел Москва)',
    titleBn: 'হোটেল মস্কভায় চেক-ইন ও ওয়াইফাই',
    category: 'hotel',
    level: 'elementary',
    cefrLevel: 'A2',
    initialTarget: 'Добар дан! Ваша соба на трећем спрату је спремна. Ево кључа и лозинке за интернет. (Dobar dan! Vaša soba na trećem spratu je spremna. Evo ključa i lozinke za internet.)',
    initialRomanized: 'Dobar dan! Vaša soba na trećem spratu je spremna. Evo ključa i lozinke za internet.',
    initialBengali: 'শুভ দিন! তৃতীয় তলায় আপনার রুম প্রস্তুত। এই নিন চাবি এবং ইন্টারনেটের পাসওয়ার্ড।',
    systemPrompt: 'You are a professional hotel receptionist in central Belgrade.'
  },
  {
    id: 'se-sc-airport',
    title: 'Nikola Tesla Airport (Аеродром Никола Тесла)',
    titleBn: 'নিকোলা টেসলা আন্তর্জাতিক বিমানবন্দর',
    category: 'airport',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Добар дан. Ваш лет за Истанбул полеће са излаза Ц4. Имате ли ручни пртљаг? (Dobar dan. Vaš let za Istanbul poleće sa izlaza C4. Imate li ručni prtljag?)',
    initialRomanized: 'Dobar dan. Vaš let za Istanbul poleće sa izlaza C4. Imate li ručni prtljag?',
    initialBengali: 'শুভ দিন। ইস্তাম্বুলের জন্য আপনার ফ্লাইটটি গেট সি৪ থেকে ছাড়বে। সাথে কি কোনো হ্যান্ড লাগেজ আছে?',
    systemPrompt: 'You are an Air Serbia airport attendant verifying gates and boarding passes.'
  },
  {
    id: 'se-sc-directions',
    title: 'Belgrade Transit & Kalemegdan (Превоз и Калемегдан)',
    titleBn: 'বেলগ্রেডে রাস্তা ও কালমেগদান দুর্গ খোঁজা',
    category: 'directions',
    level: 'beginner',
    cefrLevel: 'A1',
    initialTarget: 'Извините, како да стигнем до тврђаве Калемегдан? Да ли иде трамвај број два? (Izvinite, kako da stignem do tvrđave Kalemegdan? Da li ide tramvaj broj dva?)',
    initialRomanized: 'Izvinite, kako da stignem do tvrđave Kalemegdan? Da li ide tramvaj broj dva?',
    initialBengali: 'শুনুন, কালমেগদান দুর্গে আমি কীভাবে যাব? ২ নম্বর ট্রাম কি সেখানে যায়?',
    systemPrompt: 'You are a Belgrade citizen helping someone navigate trams and walking boulevards.'
  },
  {
    id: 'se-sc-office',
    title: 'European Sourcing & Logistics (Европски састанак)',
    titleBn: 'সার্বিয়ার পার্টনারদের সাথে অফিস মিটিং',
    category: 'office',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Поштовани колега, проверили смо узорке одеће. Квалитет шавова је одличан за европско тржиште. (Poštovani kolega, proverili smo uzorke odeće. Kvalitet šavova je odličan za evropsko tržište.)',
    initialRomanized: 'Poštovani kolega, proverili smo uzorke odeće. Kvalitet šavova je odličan za evropsko tržište.',
    initialBengali: 'শ্রদ্ধেয় সহকর্মী, আমরা কাপড়ের নমুনা পরীক্ষা করেছি। ইউরোপীয় বাজারের জন্য সেলাইয়ের মান চমৎকার।',
    systemPrompt: 'You are a European apparel quality manager coordinating with Depend Sourcing Ltd.'
  },
  {
    id: 'se-sc-negotiation',
    title: 'Trade Contract & Export Terms (Трговински уговор)',
    titleBn: 'আন্তর্জাতিক বাণিজ্যিক চুক্তি ও পেমেন্ট শর্ত',
    category: 'negotiation',
    level: 'advanced',
    cefrLevel: 'B2',
    initialTarget: 'Наш предлог је испорука 20.000 мајица са роком до краја месеца. Можете ли понудити бољу цену за дугорочни уговор? (Naš predlog je isporuka 20.000 majica sa rokom do kraja meseca. Možete li ponuditi bolju cenu za dugoročni ugovor?)',
    initialRomanized: 'Naš predlog je isporuka 20.000 majica sa rokom do kraja meseca. Možete li ponuditi bolju cenu za dugoročni ugovor?',
    initialBengali: 'আমাদের প্রস্তাব হল মাসের শেষ নাগাদ ২০,০০০ টি-শার্টের ডেলিভারি। দীর্ঘমেয়াদী চুক্তির জন্য কি আরও ভালো মূল্য দিতে পারবেন?',
    systemPrompt: 'You are a Serbian procurement executive negotiating contracts, transport lead time, and tariffs.'
  },
  {
    id: 'se-sc-phone',
    title: 'Logistics Phone Confirmation (Телефонски позив)',
    titleBn: 'ফোন কলে শিপমেন্ট ট্র্যাকিং ও আপডেট',
    category: 'phone',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Хало, овде Depend Sourcing. Камион са текстилом стиже сутра на царину у Новом Саду. (Halo, ovde Depend Sourcing. Kamion sa tekstilom stiže sutra na carinu u Novom Sadu.)',
    initialRomanized: 'Halo, ovde Depend Sourcing. Kamion sa tekstilom stiže sutra na carinu u Novom Sadu.',
    initialBengali: 'হ্যালো, ডিপেন্ড সোর্সিং থেকে বলছি। টেক্সটাইলবাহী ট্রাকটি আগামীকাল নোভি সাদ কাস্টমসে পৌঁছাবে।',
    systemPrompt: 'You are a customs broker confirming transit documents over the telephone.'
  },
  {
    id: 'se-sc-emergency',
    title: 'Apothecary & Emergency (Апотека и здравље)',
    titleBn: 'সার্বিয়ার ফার্মেসিতে ওষুধ ও জরুরি সহায়তা',
    category: 'emergency',
    level: 'intermediate',
    cefrLevel: 'B1',
    initialTarget: 'Добар дан. Имате ли нешто за грлобољу и прехладу? Не осећам се добро. (Dobar dan. Imate li nešto za grlobolju i prehladu? Ne osećam se dobro.)',
    initialRomanized: 'Dobar dan. Imate li nešto za grlobolju i prehladu? Ne osećam se dobro.',
    initialBengali: 'শুভ দিন। গলা ব্যথা এবং ঠান্ডার জন্য আপনাদের কাছে কোনো ওষুধ আছে কি? আমি অসুস্থ বোধ করছি।',
    systemPrompt: 'You are a Belgrade pharmacist giving kind and safe guidance for seasonal cough or cold.'
  }
];

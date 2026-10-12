import { ChineseLessonDay } from './types';

export const CHINESE_LESSONS_DATA: ChineseLessonDay[] = [
  // DAY 1
  {
    day: 1,
    title: 'Basic Greetings & Polite Phrases',
    titleBn: 'প্রাথমিক সম্ভাষণ ও সৌজন্যমূলক শব্দ',
    stage: 'Zero Level Basics',
    objectiveBn: 'চীনা ভাষায় কোনো পূর্বজ্ঞান ছাড়াই প্রথম দিনের সহজ অভিবাদন, ধন্যবাদ ও বিদায় জানানো শেখা।',
    xpReward: 35,
    coreWords: [
      {
        character: '你好',
        pinyin: 'Nǐ hǎo',
        pronunciationBn: 'নি হাও',
        meaningBn: 'হ্যালো / কেমন আছেন',
        audioText: '你好',
        contextNoteBn: 'সবচেয়ে প্রচলিত ও ভদ্র কুশল বিনিময়। Nǐ = তুমি/আপনি, Hǎo = ভালো।'
      },
      {
        character: '早上好',
        pinyin: 'Zǎoshang hǎo',
        pronunciationBn: 'চাওশাং হাও',
        meaningBn: 'শুভ সকাল (Good morning)',
        audioText: '早上好',
        contextNoteBn: 'সকালে চীনা ফ্যাক্টরি বা সাপ্লায়ারকে উইচ্যাটে শুভেচ্ছা জানাতে ব্যবহৃত হয়।'
      },
      {
        character: '谢谢',
        pinyin: 'Xièxie',
        pronunciationBn: 'শিয়ে শিয়ে',
        meaningBn: 'ধন্যবাদ (Thank you)',
        audioText: '谢谢',
        contextNoteBn: 'কৃতজ্ঞতা প্রকাশের সবচেয়ে অপরিহার্য চীনা শব্দ।'
      },
      {
        character: '不客气',
        pinyin: 'Bú kèqi',
        pronunciationBn: 'পু খ্যছি',
        meaningBn: 'স্বাগতম / কোনো ব্যাপার না (You are welcome)',
        audioText: '不客气',
        contextNoteBn: 'ধন্যবাদ জানালে উত্তরে বলা হয়।'
      },
      {
        character: '再见',
        pinyin: 'Zàijiàn',
        pronunciationBn: 'চাই চিয়ান',
        meaningBn: 'বিদায় / আবার দেখা হবে (Goodbye)',
        audioText: '再见',
        contextNoteBn: 'কথোপকথন শেষে বিদায় জানানোর সাধারণ বাক্য।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Imran)',
        speakerRoleBn: 'বায়ার (ইমরান)',
        chinese: '你好，陈经理！',
        pinyin: 'Nǐ hǎo, Chén jīnglǐ!',
        pronunciationBn: 'নি হাও, ছেন চিংলি!',
        meaningBn: 'হ্যালো, ম্যানেজার ছেন!'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '你好！早上好！',
        pinyin: 'Nǐ hǎo! Zǎoshang hǎo!',
        pronunciationBn: 'নি হাও! চাওশাং হাও!',
        meaningBn: 'হ্যালো! শুভ সকাল!'
      },
      {
        speaker: 'Buyer (Imran)',
        speakerRoleBn: 'বায়ার (ইমরান)',
        chinese: '谢谢你！',
        pinyin: 'Xièxie nǐ!',
        pronunciationBn: 'শিয়ে শিয়ে নি!',
        meaningBn: 'আপনাকে ধন্যবাদ!'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '不客气，再见！',
        pinyin: 'Bú kèqi, zàijiàn!',
        pronunciationBn: 'পু খ্যছি, চাই চিয়ান!',
        meaningBn: 'স্বাগতম, আবার দেখা হবে!'
      }
    ],
    businessTipBn: 'চীনে কোনো ব্যবসায়িক মিটিং বা উইচ্যাট (WeChat) চ্যাটে প্রথম প্রবেশের সময় সবসময় "你好" (Nǐ hǎo) অথবা "您好" (Nín hǎo - আরও বেশি সম্মানজনক) দিয়ে শুরু করা বাধ্যতামূলক শিষ্টাচার।',
    quiz: [
      {
        id: 'c-q1-1',
        question: 'What is the correct Chinese phrase for "Hello"?',
        questionBn: '"হ্যালো" বা "কেমন আছেন"-এর সঠিক চীনা শব্দ কোনটি?',
        pinyinPrompt: 'Nǐ hǎo',
        options: ['你好 (Nǐ hǎo)', '再见 (Zàijiàn)', '谢谢 (Xièxie)', '不好 (Bù hǎo)'],
        correctAnswer: '你好 (Nǐ hǎo)',
        explanationBn: '你好 (Nǐ hǎo) অর্থ হ্যালো বা কেমন আছেন।'
      },
      {
        id: 'c-q1-2',
        question: 'Which phrase means "Thank you"?',
        questionBn: '"ধন্যবাদ" বোঝাতে কোনটি ব্যবহার করবেন?',
        pinyinPrompt: 'Xièxie',
        options: ['谢谢 (Xièxie)', '早上好 (Zǎoshang hǎo)', '不客气 (Bú kèqi)', '你好 (Nǐ hǎo)'],
        correctAnswer: '谢谢 (Xièxie)',
        explanationBn: '谢谢 (Xièxie) অর্থ ধন্যবাদ।'
      }
    ]
  },

  // DAY 2
  {
    day: 2,
    title: 'Introducing Yourself & Depend Sourcing',
    titleBn: 'নিজের নাম ও কোম্পানির পরিচয় দেওয়া',
    stage: 'Zero Level Basics',
    objectiveBn: 'চীনা সাপ্লায়ারদের কাছে নিজের নাম ও বাংলাদেশ থেকে ডিপেন্ড সোর্সিংয়ের প্রতিনিধি হিসেবে পরিচয় দেওয়া।',
    xpReward: 35,
    coreWords: [
      {
        character: '我',
        pinyin: 'Wǒ',
        pronunciationBn: 'ও',
        meaningBn: 'আমি (I / Me)',
        audioText: '我',
        contextNoteBn: 'নিজের কথা বলতে "我" ব্যবহৃত হয়।'
      },
      {
        character: '叫',
        pinyin: 'Jiào',
        pronunciationBn: 'চিয়াও',
        meaningBn: 'ডাকা / নাম হওয়া (To be called)',
        audioText: '叫',
        contextNoteBn: 'নাম বলতে "我叫..." (Wǒ jiào...) বলা হয়।'
      },
      {
        character: '我是',
        pinyin: 'Wǒ shì',
        pronunciationBn: 'ও শি',
        meaningBn: 'আমি হলাম (I am)',
        audioText: '我是',
        contextNoteBn: 'পদবি বা পরিচয় দিতে ব্যবহৃত হয়।'
      },
      {
        character: '孟加拉国',
        pinyin: 'Mèngjiālāguó',
        pronunciationBn: 'মাং চিয়া লা কুও',
        meaningBn: 'বাংলাদেশ (Bangladesh)',
        audioText: '孟加拉国',
        contextNoteBn: 'চীনা ভাষায় আমাদের দেশের অফিশিয়াল নাম।'
      },
      {
        character: '买家',
        pinyin: 'Mǎijiā',
        pronunciationBn: 'মাই চিয়া',
        meaningBn: 'ক্রেতা / বায়ার (Buyer)',
        audioText: '买家',
        contextNoteBn: 'সাপ্লায়ারের কাছে আপনি একজন 买家 (Mǎijiā)।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Imran)',
        speakerRoleBn: 'বায়ার (ইমরান)',
        chinese: '你好！我叫Imran，我是孟加拉国的买家。',
        pinyin: 'Nǐ hǎo! Wǒ jiào Imran, wǒ shì Mèngjiālāguó de mǎijiā.',
        pronunciationBn: 'নি হাও! ও চিয়াও ইমরান, ও শি মাংচিয়ালাকুও দ্য মাইচিয়া।',
        meaningBn: 'হ্যালো! আমার নাম ইমরান, আমি বাংলাদেশ থেকে একজন বায়ার।'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '你好，Imran！很高兴认识你。我是广州服装工厂的陈经理。',
        pinyin: 'Nǐ hǎo, Imran! Hěn gāoxìng rènshi nǐ. Wǒ shì Guǎngzhōu fúzhuāng gōngchǎng de Chén jīnglǐ.',
        pronunciationBn: 'নি হাও, ইমরান! হেন কাওশিং রেনশি নি। ও শি কুয়াংচৌ ফুচুয়াং কুংছাং দ্য ছেন চিংলি।',
        meaningBn: 'হ্যালো, ইমরান! আপনার সাথে পরিচিত হয়ে খুব ভালো লাগল। আমি গুয়াংচৌ পোশাক কারখানার ম্যানেজার ছেন।'
      }
    ],
    businessTipBn: 'চীনা ব্যবসায়ীরা সরাসরি ব্যক্তি পরিচয়ের চেয়ে প্রতিষ্ঠানের নাম ও কোন দেশ থেকে অর্ডার দিচ্ছেন ("我是Depend Sourcing的...") তা বেশি গুরুত্ব দিয়ে নোট রাখেন।',
    quiz: [
      {
        id: 'c-q2-1',
        question: 'How do you say "My name is Imran" in Chinese?',
        questionBn: '"আমার নাম ইমরান" চীনা ভাষায় কীভাবে বলবেন?',
        pinyinPrompt: 'Wǒ jiào Imran',
        options: ['我叫Imran (Wǒ jiào Imran)', '我是买家 (Wǒ shì mǎijiā)', '你好Imran (Nǐ hǎo Imran)', '谢谢Imran (Xièxie Imran)'],
        correctAnswer: '我叫Imran (Wǒ jiào Imran)',
        explanationBn: '我叫 (Wǒ jiào) অর্থ "আমার নাম..."।'
      }
    ]
  },

  // DAY 3
  {
    day: 3,
    title: 'Asking Product Price & Quotations',
    titleBn: 'পণ্যের দাম ও কোটেশন জিজ্ঞাসা করা',
    stage: 'Product & Pricing',
    objectiveBn: 'কাপড় বা পোশাকের দাম, প্রতি মিটারের খরচ এবং কোটেশন জানতে চাওয়া।',
    xpReward: 40,
    coreWords: [
      {
        character: '多少钱',
        pinyin: 'Duōshao qián',
        pronunciationBn: 'তুওশাও ছিয়ান',
        meaningBn: 'দাম কত? (How much money?)',
        audioText: '多少钱',
        contextNoteBn: 'যেকোনো জিনিসের দাম জানতে চাওয়ার প্রধান বাক্য।'
      },
      {
        character: '价格',
        pinyin: 'Jiàgé',
        pronunciationBn: 'চিয়াগে',
        meaningBn: 'মূল্য / রেট (Price)',
        audioText: '价格',
        contextNoteBn: 'অফিশিয়াল বা বাণিজ্যিক মূল্য।'
      },
      {
        character: '单价',
        pinyin: 'Dānjià',
        pronunciationBn: 'তানচিয়া',
        meaningBn: 'প্রতি পিস বা প্রতি এককের দাম (Unit price)',
        audioText: '单价',
        contextNoteBn: 'পোশাকের প্রতিটি পিসের দাম।'
      },
      {
        character: '美元',
        pinyin: 'Měiyuán',
        pronunciationBn: 'মেইইউয়ান',
        meaningBn: 'মার্কিন ডলার (US Dollar - USD)',
        audioText: '美元',
        contextNoteBn: 'আন্তর্জাতিক রপ্তানি কোটেশনে ব্যবহৃত মুদ্রা।'
      },
      {
        character: '报价',
        pinyin: 'Bàojià',
        pronunciationBn: 'পাওচিয়া',
        meaningBn: 'কোটেশন দেওয়া (To quote a price)',
        audioText: '报价',
        contextNoteBn: 'সাপ্লায়ারের আনুষ্ঠানিক দরপত্র।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '陈经理，请问这款纯棉面料多少钱？',
        pinyin: 'Chén jīnglǐ, qǐngwèn zhè kuǎn chúnmián miànliào duōshao qián?',
        pronunciationBn: 'ছেন চিংলি, ছিংওয়েন চ্য খুয়ান ছুনমিয়ান মিয়ানলিয়াও তুওশাও ছিয়ান?',
        meaningBn: 'ম্যানেজার ছেন, এই ১০০% সুতি কাপড়ের দাম কত?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '这款面料的单价是每米 3.50 美元。',
        pinyin: 'Zhè kuǎn miànliào de dānjià shì měi mǐ 3.50 Měiyuán.',
        pronunciationBn: 'চ্য খুয়ান মিয়ানলিয়াও দ্য তানচিয়া শি মেই মি ৩.৫০ মেইইউয়ান।',
        meaningBn: 'এই কাপড়ের প্রতি মিটারের একক মূল্য ৩.৫০ ডলার।'
      }
    ],
    businessTipBn: 'সবসময় পরিষ্কার করে জেনে নেবেন দামটি আরএমবি (RMB / Yuan) নাকি মার্কিন ডলার (美元 / USD), কারণ দেশীয় চীনা সাপ্লায়াররা অনেক সময় আরএমবিতে হিসাব পাঠায়।',
    quiz: [
      {
        id: 'c-q3-1',
        question: 'Which phrase means "How much is it?"',
        questionBn: '"এটির দাম কত?" চীনা ভাষায় কোনটি?',
        pinyinPrompt: 'Duōshao qián?',
        options: ['多少钱？(Duōshao qián?)', '买家 (Mǎijiā)', '孟加拉国 (Mèngjiālāguó)', '谢谢 (Xièxie)'],
        correctAnswer: '多少钱？(Duōshao qián?)',
        explanationBn: '多少钱 (Duōshao qián) অর্থ কত টাকা বা দাম কত।'
      }
    ]
  },

  // DAY 4
  {
    day: 4,
    title: 'Quantity & Minimum Order Quantity (MOQ)',
    titleBn: 'অর্ডারের পরিমাণ ও সর্বনিম্ন অর্ডার (MOQ)',
    stage: 'Product & Pricing',
    objectiveBn: 'সাপ্লায়ারের কাছে মিনিমাম অর্ডার কোয়ান্টিটি (起订量) ও মোট সংখ্যা নিয়ে কথা বলা।',
    xpReward: 40,
    coreWords: [
      {
        character: '数量',
        pinyin: 'Shùliàng',
        pronunciationBn: 'শুলিয়াং',
        meaningBn: 'পরিমাণ (Quantity)',
        audioText: '数量',
        contextNoteBn: 'অর্ডারের মোট সংখ্যা নির্দেশ করে।'
      },
      {
        character: '起订量',
        pinyin: 'Qǐdìngliàng',
        pronunciationBn: 'ছিদিংলিয়াং',
        meaningBn: 'সর্বনিম্ন অর্ডারের পরিমাণ (MOQ)',
        audioText: '起订量',
        contextNoteBn: 'ফ্যাক্টরির সর্বনিম্ন অর্ডার সীমা।'
      },
      {
        character: '件',
        pinyin: 'Jiàn',
        pronunciationBn: 'চিয়ান',
        meaningBn: 'পিস / খানা (Pieces / items)',
        audioText: '件',
        contextNoteBn: 'পোশাকের ক্ষেত্রে গণনার একক।'
      },
      {
        character: '米',
        pinyin: 'Mǐ',
        pronunciationBn: 'মি',
        meaningBn: 'মিটার (Meters)',
        audioText: '米',
        contextNoteBn: 'কাপড়ের দৈর্ঘ্য পরিমাপের একক।'
      },
      {
        character: '一千',
        pinyin: 'Yì qiān',
        pronunciationBn: 'ই ছিয়ান',
        meaningBn: 'এক হাজার (1,000)',
        audioText: '一千',
        contextNoteBn: 'সংখ্যা প্রকাশের ক্ষেত্রে।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '请问这款T恤的起订量（MOQ）是多少？',
        pinyin: 'Qǐngwèn zhè kuǎn T-xù de qǐdìngliàng (MOQ) shì duōshao?',
        pronunciationBn: 'ছিংওয়েন চ্য খুয়ান টি-শার্ট দ্য ছিদিংলিয়াং শি তুওশাও?',
        meaningBn: 'এই টি-শার্টটির সর্বনিম্ন অর্ডারের পরিমাণ (MOQ) কত?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '我们的起订量是每个颜色 500 件，总数量至少 1000 件。',
        pinyin: 'Wǒmen de qǐdìngliàng shì měi gè yánsè 500 jiàn, zǒng shùliàng zhìshǎo 1000 jiàn.',
        pronunciationBn: 'ওমেন দ্য ছিদিংলিয়াং শি মেই ক্য ইয়ানস ৫০০ চিয়ান, চং শুলিয়াং চিশাও ১০০০ চিয়ান।',
        meaningBn: 'আমাদের এমওকিউ হলো প্রতি রঙে ৫০০ পিস, মোট সংখ্যা অন্তত ১,০০০ পিস।'
      }
    ],
    businessTipBn: 'চীনা ভাষায় MOQ-কে বলা হয় "起订量" (Qǐdìngliàng)। তবে আন্তর্জাতিক বাণিজ্য হওয়ায় উইচ্যাটে "MOQ" লিখলেও চীনা সাপ্লায়াররা পুরোপুরি বুঝতে পারে।',
    quiz: [
      {
        id: 'c-q4-1',
        question: 'What is the Chinese term for MOQ (Minimum Order Quantity)?',
        questionBn: 'সর্বনিম্ন অর্ডারের পরিমাণ (MOQ)-কে চীনা ভাষায় কী বলে?',
        pinyinPrompt: 'Qǐdìngliàng',
        options: ['起订量 (Qǐdìngliàng)', '单价 (Dānjià)', '谢谢 (Xièxie)', '美元 (Měiyuán)'],
        correctAnswer: '起订量 (Qǐdìngliàng)',
        explanationBn: '起订量 (Qǐdìngliàng) হলো Minimum Order Quantity বা MOQ।'
      }
    ]
  },

  // DAY 5
  {
    day: 5,
    title: 'Product Specifications (Size, Color, Material)',
    titleBn: 'পণ্যের বিবরণ (সাইজ, রঙ ও ফেব্রিক মেটেরিয়াল)',
    stage: 'Sampling & Quality',
    objectiveBn: 'পোশাকের মাপ, কাপড়ের কম্পোজিশন ও রঙের স্পেসিফিকেশন চাওয়া।',
    xpReward: 40,
    coreWords: [
      {
        character: '尺码',
        pinyin: 'Chǐmǎ',
        pronunciationBn: 'ছিমা',
        meaningBn: 'সাইজ বা মাপ (Size)',
        audioText: '尺码',
        contextNoteBn: 'পোশাকের S, M, L, XL সাইজ বোঝাতে।'
      },
      {
        character: '颜色',
        pinyin: 'Yánsè',
        pronunciationBn: 'ইয়ানস',
        meaningBn: 'রঙ (Color)',
        audioText: '颜色',
        contextNoteBn: 'ফ্যাব্রিকের কালার।'
      },
      {
        character: '面料',
        pinyin: 'Miànliào',
        pronunciationBn: 'মিয়ানলিয়াও',
        meaningBn: 'কাপড় / ফেব্রিক (Fabric / Material)',
        audioText: '面料',
        contextNoteBn: 'গার্মেন্টস সোর্সিংয়ের অত্যন্ত গুরুত্বপূর্ণ শব্দ।'
      },
      {
        character: '纯棉',
        pinyin: 'Chúnmián',
        pronunciationBn: 'ছুনমিয়ান',
        meaningBn: '১০০% সুতি (100% Cotton)',
        audioText: '纯棉',
        contextNoteBn: 'পোশাকের ফেব্রিক কম্পোজিশন।'
      },
      {
        character: '涤纶',
        pinyin: 'Dílún',
        pronunciationBn: 'তিলুন',
        meaningBn: 'পলিয়েস্টার (Polyester)',
        audioText: '涤纶',
        contextNoteBn: 'সিন্থেটিক সুতা বা পলিয়েস্টার।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Imran)',
        speakerRoleBn: 'বায়ার (ইমরান)',
        chinese: '我们需要纯棉面料，有黑色和白色吗？',
        pinyin: 'Wǒmen xūyào chúnmián miànliào, yǒu hēisè hé báisè ma?',
        pronunciationBn: 'ওমেন শুইয়াও ছুনমিয়ান মিয়ানলিয়াও, ইউ হেইস হ্য বাইস মা?',
        meaningBn: 'আমাদের ১০০% কটন ফেব্রিক প্রয়োজন, কালো এবং সাদা রঙ কি আছে?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '有的，我们各种颜色和尺码都可以定制。',
        pinyin: 'Yǒu de, wǒmen gè zhǒng yánsè hé chǐmǎ dōu kěyǐ dìngzhì.',
        pronunciationBn: 'ইউ দ্য, ওমেন ক্য চং ইয়ানস হ্য ছিমা তৌ খ্যই তিংশি।',
        meaningBn: 'আছে, আমরা যেকোনো রঙ ও সাইজ কাস্টমাইজ করে তৈরি করতে পারি।'
      }
    ],
    businessTipBn: 'রঙের প্যান্টোন নম্বর (Pantone Code) চীনা সাপ্লায়ারকে দিয়ে দিলে ল্যাব ডিপ (Lab dip) দ্রুত ও নির্ভুল হয়।',
    quiz: [
      {
        id: 'c-q5-1',
        question: 'Which word means "Fabric" or "Material"?',
        questionBn: '"ফেব্রিক" বা "কাপড়"-এর চীনা প্রতিশব্দ কোনটি?',
        pinyinPrompt: 'Miànliào',
        options: ['面料 (Miànliào)', '尺码 (Chǐmǎ)', '买家 (Mǎijiā)', '再见 (Zàijiàn)'],
        correctAnswer: '面料 (Miànliào)',
        explanationBn: '面料 (Miànliào) অর্থ ফেব্রিক বা পোশাক তৈরির কাপড়।'
      }
    ]
  },

  // DAY 6
  {
    day: 6,
    title: 'Requesting Samples & Courier',
    titleBn: 'স্যাম্পল চাওয়া ও কুরিয়ারে পাঠানো',
    stage: 'Sampling & Quality',
    objectiveBn: 'বাল্ক অর্ডারের পূর্বে প্রোটোটাইপ বা সাইজ সেট স্যাম্পল কুরিয়ারে পাঠানোর অনুরোধ করা।',
    xpReward: 40,
    coreWords: [
      {
        character: '样品',
        pinyin: 'Yàngpǐn',
        pronunciationBn: 'ইয়াংফিন',
        meaningBn: 'স্যাম্পল / নমুনা (Sample)',
        audioText: '样品',
        contextNoteBn: 'গুণমান পরীক্ষার জন্য নেওয়া স্যাম্পল।'
      },
      {
        character: '寄',
        pinyin: 'Jì',
        pronunciationBn: 'চি',
        meaningBn: 'ডাকযোগে পাঠানো (To send / post)',
        audioText: '寄',
        contextNoteBn: 'কুরিয়ারে কিছু পাঠানো।'
      },
      {
        character: '快递',
        pinyin: 'Kuàidì',
        pronunciationBn: 'খুয়াইতি',
        meaningBn: 'এক্সপ্রেস কুরিয়ার সার্ভিস যেমন DHL/FedEx',
        audioText: '快递',
        contextNoteBn: 'আন্তর্জাতিক এক্সপ্রেস পার্সেল।'
      },
      {
        character: '单号',
        pinyin: 'Dānhào',
        pronunciationBn: 'তানহাও',
        meaningBn: 'ট্র্যাকিং নম্বর (Tracking number)',
        audioText: '单号',
        contextNoteBn: 'কুরিয়ার পার্সেল ট্র্যাকিং কোড।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '陈经理，可以先给我们寄两个样品吗？',
        pinyin: 'Chén jīnglǐ, kěyǐ xiān gěi wǒmen jì liǎng gè yàngpǐn ma?',
        pronunciationBn: 'ছেন চিংলি, খ্যই শিয়ান কেই ওমেন চি লিয়াং ক্য ইয়াংফিন মা?',
        meaningBn: 'ম্যানেজার ছেন, প্রথমে কি আমাদের দুটি স্যাম্পল পাঠাতে পারবেন?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '没问题，明天安排DHL快递寄出，随后把快递单号发给您。',
        pinyin: 'Méi wèntí, míngtiān ānpái DHL kuàidì jì chū, suíhòu bǎ kuàidì dānhào fā gěi nín.',
        pronunciationBn: 'মেই ওয়েনথি, মিংথিয়ান আনফাই ডিএইচএল খুয়াইতি চি ছু, সুইহৌ পা খুয়াইতি তানহাও ফা কেই নিন।',
        meaningBn: 'কোনো সমস্যা নেই, আগামীকাল DHL কুরিয়ারে পাঠিয়ে দেব এবং পরে ট্র্যাকিং নম্বরটি আপনাকে পাঠিয়ে দেব।'
      }
    ],
    businessTipBn: 'চীনে স্যাম্পল পাঠানোর পর সবসময় "快递单号" (Kuàidì dānhào - কুরিয়ার ট্র্যাকিং নম্বর) চেয়ে নেবেন যেন অনলাইনে পার্সেল মনিটর করা যায়।',
    quiz: [
      {
        id: 'c-q6-1',
        question: 'What is the Chinese word for "Sample"?',
        questionBn: '"স্যাম্পল"-কে চীনা ভাষায় কী বলে?',
        pinyinPrompt: 'Yàngpǐn',
        options: ['样品 (Yàngpǐn)', '起订量 (Qǐdìngliàng)', '纯棉 (Chúnmián)', '价格 (Jiàgé)'],
        correctAnswer: '样品 (Yàngpǐn)',
        explanationBn: '样品 (Yàngpǐn) অর্থ স্যাম্পল বা নমুনা।'
      }
    ]
  },

  // DAY 7
  {
    day: 7,
    title: 'Quality Discussion & Defect Inspection',
    titleBn: 'গুণগত মান (Quality) ও ত্রুটি নিয়ে আলোচনা',
    stage: 'Sampling & Quality',
    objectiveBn: 'পণ্যের কোয়ালিটি নিশ্চিত করা এবং কোনো ত্রুটি বা রিজেকশন থাকলে তা জানানো।',
    xpReward: 45,
    coreWords: [
      {
        character: '质量',
        pinyin: 'Zhìliàng',
        pronunciationBn: 'চিলিয়াং',
        meaningBn: 'গুণগত মান (Quality)',
        audioText: '质量',
        contextNoteBn: 'পণ্যের কোয়ালিটি।'
      },
      {
        character: '检查',
        pinyin: 'Jiǎnchá',
        pronunciationBn: 'চিয়ানছা',
        meaningBn: 'পরিদর্শন / চেক করা (Inspection)',
        audioText: '检查',
        contextNoteBn: 'কিউসি বা কোয়ালিটি কন্ট্রোল চেক।'
      },
      {
        character: '瑕疵',
        pinyin: 'Xiácī',
        pronunciationBn: 'শিয়াছি',
        meaningBn: 'ত্রুটি বা খুঁত (Defect / flaw)',
        audioText: '瑕疵',
        contextNoteBn: 'কাপড়ের ছেঁড়া, রঙের দাগ বা সেলাই ত্রুটি।'
      },
      {
        character: '标准',
        pinyin: 'Biāozhǔn',
        pronunciationBn: 'পিয়াওচুন',
        meaningBn: 'মানদণ্ড (Standard)',
        audioText: '标准',
        contextNoteBn: 'আন্তর্জাতিক রপ্তানি স্ট্যান্ডার্ড।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Imran)',
        speakerRoleBn: 'বায়ার (ইমরান)',
        chinese: '样品的质量很好，但缝纫边缘不能有瑕疵。',
        pinyin: 'Yàngpǐn de zhìliàng hěn hǎo, dàn féngrèn biānyuán bù néng yǒu xiácī.',
        pronunciationBn: 'ইয়াংফিন দ্য চিলিয়াং হেন হাও, তান ফাংরেন পিয়ানইউয়ান পু নাং ইউ শিয়াছি।',
        meaningBn: 'স্যাম্পলের মান চমৎকার, কিন্তু সেলাইয়ের প্রান্তে কোনো ত্রুটি থাকা চলবে না।'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '请放心，大货出厂前我们会进行严格的质量检查。',
        pinyin: 'Qǐng fàngxīn, dàhuò chūchǎng qián wǒmen huì jìnxíng yángé de zhìliàng jiǎnchá.',
        pronunciationBn: 'ছিং ফাংশিন, তাহুও ছুছাং ছিয়ান ওমেন হুই চিনশিং ইয়ানক দ্য চিলিয়াং চিয়ানছা।',
        meaningBn: 'নিশ্চিন্ত থাকুন, মূল শিপমেন্ট কারখানা ছাড়ার আগে আমরা কঠোর মান পরীক্ষা করব।'
      }
    ],
    businessTipBn: '"大货" (Dàhuò) অর্থ বাল্ক উৎপাদন বা মূল বাণিজ্যিক শিপমেন্ট। স্যাম্পল অনুমোদনের পরেই কেবল 大货 শুরু হয়।',
    quiz: [
      {
        id: 'c-q7-1',
        question: 'Which word means "Quality"?',
        questionBn: '"গুণগত মান"-এর চীনা শব্দ কোনটি?',
        pinyinPrompt: 'Zhìliàng',
        options: ['质量 (Zhìliàng)', '快递 (Kuàidì)', '多少钱 (Duōshao qián)', '数量 (Shùliàng)'],
        correctAnswer: '质量 (Zhìliàng)',
        explanationBn: '质量 (Zhìliàng) অর্থ কোয়ালিটি বা গুণগত মান।'
      }
    ]
  },

  // DAY 8
  {
    day: 8,
    title: 'Price Negotiation & Discounting',
    titleBn: 'দর কষাকষি ও ডিসকাউন্ট চাওয়া',
    stage: 'Orders & Negotiations',
    objectiveBn: 'সাপ্লায়ারকে বিনীতভাবে দাম কমাতে বলা এবং বড় অর্ডারের জন্য ছাড়ের প্রস্তাব দেওয়া।',
    xpReward: 45,
    coreWords: [
      {
        character: '太贵了',
        pinyin: 'Tài guì le',
        pronunciationBn: 'থাই কুই ল',
        meaningBn: 'খুব বেশি দাম / অতিরিক্ত দামি (Too expensive)',
        audioText: '太贵了',
        contextNoteBn: 'দাম কমাতে চাওয়ার প্রাথমিক কৌশল।'
      },
      {
        character: '便宜一点',
        pinyin: 'Piányi yìdiǎn',
        pronunciationBn: 'ফিয়ানই ইদিয়ান',
        meaningBn: 'আরেকটু কম করুন (A little cheaper)',
        audioText: '便宜一点',
        contextNoteBn: 'ছাড় দেওয়ার বিনীত অনুরোধ।'
      },
      {
        character: '打折',
        pinyin: 'Dǎzhé',
        pronunciationBn: 'তাচে',
        meaningBn: 'ডিসকাউন্ট বা ছাড় দেওয়া (Discount)',
        audioText: '打折',
        contextNoteBn: 'মূল্যের ওপর ছাড়।'
      },
      {
        character: '最好价格',
        pinyin: 'Zuì hǎo jiàgé',
        pronunciationBn: 'চুই হাও চিয়াগে',
        meaningBn: 'সেরা বা চূড়ান্ত মূল্য (Best price)',
        audioText: '最好价格',
        contextNoteBn: 'সর্বশেষ রফা মূল্য।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '陈经理，3.50美元太贵了，如果订五千件，能便宜一点吗？',
        pinyin: 'Chén jīnglǐ, 3.50 Měiyuán tài guì le, rúguǒ dìng wǔ qiān jiàn, néng piányi yìdiǎn ma?',
        pronunciationBn: 'ছেন চিংলি, ৩.৫০ মেইইউয়ান থাই কুই ল, রুকুও তিং উ ছিয়ান চিয়ান, নাং ফিয়ানই ইদিয়ান মা?',
        meaningBn: 'ম্যানেজার ছেন, ৩.৫০ ডলার বড্ড বেশি। যদি ৫ হাজার পিস অর্ডার দিই, কিছুটা ছাড় দেওয়া যাবে?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '如果数量达到五千件，我们可以给您最低 3.10 美元。',
        pinyin: 'Rúguǒ shùliàng dádào wǔ qiān jiàn, wǒmen kěyǐ gěi nín zuìdī 3.10 Měiyuán.',
        pronunciationBn: 'রুকুও শুলিয়াং তাতাও উ ছিয়ান চিয়ান, ওমেন খ্যই কেই নিন চুইতি ৩.১০ মেইইউয়ান।',
        meaningBn: 'অর্ডারের পরিমাণ ৫ হাজার পিস হলে আমরা আপনাকে সর্বনিম্ন ৩.১০ ডলার রেট দিতে পারব।'
      }
    ],
    businessTipBn: 'চীনে কোনো অবস্থাতেই অযৌক্তিক নিম্ন দর বলবেন না। বড় অর্ডারের আশ্বাস দিয়ে "能便宜一点吗？" (Néng piányi yìdiǎn ma?) বলা পেশাদারিত্বের প্রমাণ।',
    quiz: [
      {
        id: 'c-q8-1',
        question: 'How do you say "A little cheaper, please" in Chinese?',
        questionBn: '"আরেকটু কম করুন" চীনা ভাষায় কী?',
        pinyinPrompt: 'Piányi yìdiǎn',
        options: ['便宜一点 (Piányi yìdiǎn)', '太贵了 (Tài guì le)', '谢谢 (Xièxie)', '面料 (Miànliào)'],
        correctAnswer: '便宜一点 (Piányi yìdiǎn)',
        explanationBn: '便宜一点 (Piányi yìdiǎn) অর্থ আরেকটু কম বা সস্তা।'
      }
    ]
  },

  // DAY 9
  {
    day: 9,
    title: 'Order Confirmation & Purchase Contract',
    titleBn: 'অর্ডার নিশ্চিতকরণ ও চুক্তি স্বাক্ষর',
    stage: 'Orders & Negotiations',
    objectiveBn: 'অর্ডার কনফার্ম করা, সেলস কন্ট্রাক্ট বা প্রফর্মা ইনভয়েস (PI) গ্রহণ করা।',
    xpReward: 45,
    coreWords: [
      {
        character: '确认订单',
        pinyin: 'Quèrèn dìngdān',
        pronunciationBn: 'ছুয়েরেন দিংদান',
        meaningBn: 'অর্ডার নিশ্চিত করা (Confirm order)',
        audioText: '确认订单',
        contextNoteBn: 'অর্ডার চূড়ান্তকরণ।'
      },
      {
        character: '合同',
        pinyin: 'Hétong',
        pronunciationBn: 'হ্যথং',
        meaningBn: 'চুক্তিপত্র (Contract)',
        audioText: '合同',
        contextNoteBn: 'বাণিজ্যিক চুক্তি।'
      },
      {
        character: '发票',
        pinyin: 'Fāpiào',
        pronunciationBn: 'ফাফিয়াও',
        meaningBn: 'ইনভয়েস বা চালান (Invoice / PI)',
        audioText: '发票',
        contextNoteBn: 'কমার্শিয়াল ইনভয়েস।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '我们确认这个订单，请发形式发票（PI）和合同。',
        pinyin: 'Wǒmen quèrèn zhè gè dìngdān, qǐng fā xíngshì fāpiào (PI) hé hétong.',
        pronunciationBn: 'ওমেন ছুয়েরেন চ্য ক্য দিংদান, ছিং ফা শিংশি ফাফিয়াও হ্য হ্যথং।',
        meaningBn: 'আমরা অর্ডারটি নিশ্চিত করছি, অনুগ্রহ করে প্রোফরমা ইনভয়েস (PI) এবং চুক্তিপত্র পাঠান।'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '好的，我们今天就做好发票发到您的邮箱。',
        pinyin: 'Hǎo de, wǒmen jīntiān jiù zuò hǎo fāpiào fā dào nín de yóuxiāng.',
        pronunciationBn: 'হাও দ্য, ওমেন চিনথিয়ান চিউ চুও হাও ফাফিয়াও ফা তাও নিন দ্য ইউশিয়াং।',
        meaningBn: 'ঠিক আছে, আমরা আজই ইনভয়েস তৈরি করে আপনার ইমেইলে পাঠিয়ে দেব।'
      }
    ],
    businessTipBn: 'চীনা ফ্যাক্টরির সাথে চুক্তিতে স্ট্যাম্প বা সিলমোহর (公章 - Gōngzhāng) থাকা অত্যন্ত গুরুত্বপূর্ণ, এটি তাদের আইনি বাধ্যবাধকতা নিশ্চিত করে।',
    quiz: [
      {
        id: 'c-q9-1',
        question: 'Which phrase means "Confirm Order"?',
        questionBn: '"অর্ডার নিশ্চিত করা"-র সঠিক রূপ কোনটি?',
        pinyinPrompt: 'Quèrèn dìngdān',
        options: ['确认订单 (Quèrèn dìngdān)', '太贵了 (Tài guì le)', '便宜一点 (Piányi yìdiǎn)', '起订量 (Qǐdìngliàng)'],
        correctAnswer: '确认订单 (Quèrèn dìngdān)',
        explanationBn: '确认 (Quèrèn) অর্থ নিশ্চিত করা, 订单 (Dìngdān) অর্থ অর্ডার।'
      }
    ]
  },

  // DAY 10
  {
    day: 10,
    title: 'Payment Terms (Deposit & TT Transfer)',
    titleBn: 'পেমেন্ট শর্ত (অগ্রিম ডিপোজিট ও টিটি ব্যাংক ট্রান্সফার)',
    stage: 'Orders & Negotiations',
    objectiveBn: '৩০% অগ্রিম ডিপোজিট প্রদান ও অবশিষ্ট টাকা পরিশোধের শর্ত নির্ধারণ।',
    xpReward: 45,
    coreWords: [
      {
        character: '付款',
        pinyin: 'Fùkuǎn',
        pronunciationBn: 'ফুখুয়ান',
        meaningBn: 'টাকা পরিশোধ করা (Payment)',
        audioText: '付款',
        contextNoteBn: 'পেমেন্ট সম্পন্ন করা।'
      },
      {
        character: '定金',
        pinyin: 'Dìngjīn',
        pronunciationBn: 'তিংচিন',
        meaningBn: 'অগ্রিম বায়না বা ডিপোজিট (Deposit)',
        audioText: '定金',
        contextNoteBn: 'উৎপাদন শুরুর পূর্বে ৩০% অগ্রিম।'
      },
      {
        character: '余款',
        pinyin: 'Yúkuǎn',
        pronunciationBn: 'ইউখুয়ান',
        meaningBn: 'অবশিষ্ট বকেয়া টাকা (Balance payment)',
        audioText: '余款',
        contextNoteBn: 'শিপমেন্টের পূর্বে প্রদেয় টাকা।'
      },
      {
        character: '电汇',
        pinyin: 'Diànhuì',
        pronunciationBn: 'তিয়ানহুই',
        meaningBn: 'টিটি ব্যাংক ওয়্যার ট্রান্সফার (T/T transfer)',
        audioText: '电汇',
        contextNoteBn: 'ব্যাংকের মাধ্যমে আন্তর্জাতিক অর্থ প্রেরণ।'
      }
    ],
    dialogue: [
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '付款方式是 30% 定金，发货前付清 70% 余款。',
        pinyin: 'Fùkuǎn fāngshì shì 30% dìngjīn, fāhuò qián fù qīng 70% yúkuǎn.',
        pronunciationBn: 'ফুখুয়ান ফাংশি শি ৩০% তিংচিন, ফাহুও ছিয়ান ফু ছিং ৭০% ইউখুয়ান।',
        meaningBn: 'পেমেন্টের শর্ত হলো ৩০% অগ্রিম ডিপোজিট, আর পণ্য ছাড়ার পূর্বে অবশিষ্ট ৭০% বকেয়া পরিশোধ।'
      },
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '没问题，我们明天通过电汇（TT）支付定金。',
        pinyin: 'Méi wèntí, wǒmen míngtiān tōngguò diànhuì (TT) zhīfù dìngjīn.',
        pronunciationBn: 'মেই ওয়েনথি, ওমেন মিংথিয়ান থুংকুও তিয়ানহুই চিফু তিংচিন।',
        meaningBn: 'কোনো সমস্যা নেই, আমরা আগামীকাল টিটি ব্যাংক ট্রান্সফারের মাধ্যমে ডিপোজিট পরিশোধ করব।'
      }
    ],
    businessTipBn: 'চীনা সাপ্লায়ারদের সাথে বিশ্বজুড়ে সবচেয়ে প্রচলিত পেমেন্ট টার্ম হলো: "30% T/T deposit, 70% balance before shipment"।',
    quiz: [
      {
        id: 'c-q10-1',
        question: 'What is the Chinese word for "Deposit"?',
        questionBn: '"ডিপোজিট বা অগ্রিম বায়না"-কে চীনা ভাষায় কী বলে?',
        pinyinPrompt: 'Dìngjīn',
        options: ['定金 (Dìngjīn)', '余款 (Yúkuǎn)', '单价 (Dānjià)', '样品 (Yàngpǐn)'],
        correctAnswer: '定金 (Dìngjīn)',
        explanationBn: '定金 (Dìngjīn) অর্থ ডিপোজিট বা অগ্রিম টাকা।'
      }
    ]
  },

  // DAY 11
  {
    day: 11,
    title: 'Shipping, Freight & FOB Terms',
    titleBn: 'শিপিং, সমুদ্র পরিবহন ও এফওবি (FOB) বন্দর',
    stage: 'Shipping & Factory',
    objectiveBn: 'কনটেইনার বুকিং, সমুদ্র বা বিমান পরিবহন এবং বন্দর ডেলিভারি নিয়ে আলোচনা।',
    xpReward: 45,
    coreWords: [
      {
        character: '运输',
        pinyin: 'Yùnshū',
        pronunciationBn: 'ইয়ুনশু',
        meaningBn: 'পরিবহন / শিপিং (Transportation / shipping)',
        audioText: '运输',
        contextNoteBn: 'পণ্য পাঠানো।'
      },
      {
        character: '海运',
        pinyin: 'Hǎiyùn',
        pronunciationBn: 'হাইইউন',
        meaningBn: 'সমুদ্রপথে পরিবহন (Sea freight)',
        audioText: '海运',
        contextNoteBn: 'জাহাজে কনটেইনার পরিবহন।'
      },
      {
        character: '空运',
        pinyin: 'Kōngyùn',
        pronunciationBn: 'খুংইউন',
        meaningBn: 'বিমানপথে পরিবহন (Air freight)',
        audioText: '空运',
        contextNoteBn: 'জরুরি মালামাল বিমানে পাঠানো।'
      },
      {
        character: '离岸价',
        pinyin: 'Lí\'ànjià',
        pronunciationBn: 'লিআনচিয়া',
        meaningBn: 'এফওবি মূল্য (FOB price)',
        audioText: '离岸价',
        contextNoteBn: 'চীনা বন্দর পর্যন্ত পণ্য পৌঁছানোর খরচ।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '报价包含广州港口的离岸价（FOB）吗？',
        pinyin: 'Bàojià bāohán Guǎngzhōu gǎngkǒu de lí\'ànjià (FOB) ma?',
        pronunciationBn: 'পাওচিয়া পাওহান কুয়াংচৌ কাংকৌ দ্য লিআনচিয়া মা?',
        meaningBn: 'কোটেশনে কি গুয়াংচৌ বন্দরের FOB মূল্য অন্তর্ভুক্ত আছে?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '是的，属于FOB广州价格，海运集装箱非常方便。',
        pinyin: 'Shì de, shǔyú FOB Guǎngzhōu jiàgé, hǎiyùn jízhuāngxiāng fēicháng fāngbiàn.',
        pronunciationBn: 'শি দ্য, শুইউ এফওবি কুয়াংচৌ চিয়াগে, হাইইউন চিচুয়াংসিয়াং ফেইছাং ফাংপিয়ান।',
        meaningBn: 'হ্যাঁ, এটি এফওবি গুয়াংচৌ দর, সমুদ্রপথে কনটেইনার পাঠানো খুবই সুবিধাজনক।'
      }
    ],
    businessTipBn: 'পোশাক শিল্পের বড় চালানের ক্ষেত্রে সমুদ্র পরিবহন (海运 - Hǎiyùn) সবচেয়ে লাভজনক। চট্টগ্রাম বন্দরে পৌঁছাতে প্রায় ১২ থেকে ১৮ দিন সময় লাগে।',
    quiz: [
      {
        id: 'c-q11-1',
        question: 'Which Chinese term means "Sea Freight"?',
        questionBn: '"সমুদ্রপথে শিপিং"-এর চীনা শব্দ কোনটি?',
        pinyinPrompt: 'Hǎiyùn',
        options: ['海运 (Hǎiyùn)', '空运 (Kōngyùn)', '快递 (Kuàidì)', '发票 (Fāpiào)'],
        correctAnswer: '海运 (Hǎiyùn)',
        explanationBn: '海运 (Hǎiyùn) অর্থ সি ফ্রেইট বা সমুদ্র পরিবহন।'
      }
    ]
  },

  // DAY 12
  {
    day: 12,
    title: 'Delivery Date & Production Lead Time',
    titleBn: 'ডেলিভারির তারিখ ও উৎপাদনের সময়সীমা',
    stage: 'Shipping & Factory',
    objectiveBn: 'কবে মালামাল তৈরি হবে এবং ডেলিভারির সঠিক দিনক্ষণ নিশ্চিত করা।',
    xpReward: 45,
    coreWords: [
      {
        character: '交货期',
        pinyin: 'Jiāohuòqī',
        pronunciationBn: 'চিয়াওহুওছি',
        meaningBn: 'ডেলিভারির সময়সীমা / লিড টাইম (Delivery date / Lead time)',
        audioText: '交货期',
        contextNoteBn: 'পণ্য হস্তান্তরের নির্ধারিত সময়।'
      },
      {
        character: '发货',
        pinyin: 'Fāhuò',
        pronunciationBn: 'ফাহুও',
        meaningBn: 'পণ্য পাঠানো / ডিসপ্যাচ করা (To ship goods)',
        audioText: '发货',
        contextNoteBn: 'কারখানা থেকে পণ্য বের হওয়া।'
      },
      {
        character: '天',
        pinyin: 'Tiān',
        pronunciationBn: 'থিয়ান',
        meaningBn: 'দিন (Days)',
        audioText: '天',
        contextNoteBn: 'সময় গণনার একক।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '收到定金后，生产交货期需要多少天？',
        pinyin: 'Shōudào dìngjīn hòu, shēngchǎn jiāohuòqī xūyào duōshao tiān?',
        pronunciationBn: 'শৌতাও তিংচিন হৌ, শাংছান চিয়াওহুওছি শুইয়াও তুওশাও থিয়ান?',
        meaningBn: 'ডিপোজিট পাওয়ার পর উৎপাদন শেষে ডেলিভারি দিতে কত দিন লাগবে?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '通常需要 25 到 30 天，我们会准时发货。',
        pinyin: 'Tōngcháng xūyào 25 dào 30 tiān, wǒmen huì zhǔnshí fāhuò.',
        pronunciationBn: 'থুংছাং শুইয়াও ২৫ তাও ৩০ থিয়ান, ওমেন হুই চুনশি ফাহুও।',
        meaningBn: 'সাধারণত ২৫ থেকে ৩০ দিন প্রয়োজন, আমরা যথাসময়ে পণ্য পাঠাব।'
      }
    ],
    businessTipBn: 'চীনে "春运" (Chūnyùn - চাইনিজ নিউ ইয়ার) এর সময় প্রায় ৩ সপ্তাহ কারখানা বন্ধ থাকে। সে সময় ডেলিভারি ডেট নির্ধারণে বাড়তি সতর্কতা প্রয়োজন।',
    quiz: [
      {
        id: 'c-q12-1',
        question: 'Which term refers to "Delivery Lead Time"?',
        questionBn: '"ডেলিভারির সময়সীমা" বোঝাতে কোনটি ব্যবহার করবেন?',
        pinyinPrompt: 'Jiāohuòqī',
        options: ['交货期 (Jiāohuòqī)', '定金 (Dìngjīn)', '海运 (Hǎiyùn)', '合同 (Hétong)'],
        correctAnswer: '交货期 (Jiāohuòqī)',
        explanationBn: '交货期 (Jiāohuòqī) হলো Delivery lead time।'
      }
    ]
  },

  // DAY 13
  {
    day: 13,
    title: 'Factory Communication & Production Status',
    titleBn: 'ফ্যাক্টরির সাথে যোগাযোগ ও কাজের অগ্রগতি মনিটর করা',
    stage: 'Shipping & Factory',
    objectiveBn: 'উৎপাদন কতদূর এগুলো তা সরাসরি ফ্যাক্টরির কাছে জানতে চাওয়া।',
    xpReward: 50,
    coreWords: [
      {
        character: '工厂',
        pinyin: 'Gōngchǎng',
        pronunciationBn: 'কুংছাং',
        meaningBn: 'কারখানা / ফ্যাক্টরি (Factory)',
        audioText: '工厂',
        contextNoteBn: 'উৎপাদন কেন্দ্র।'
      },
      {
        character: '生产进度',
        pinyin: 'Shēngchǎn jìndù',
        pronunciationBn: 'শাংছান চিনতু',
        meaningBn: 'উৎপাদনের অগ্রগতি (Production status / progress)',
        audioText: '生产进度',
        contextNoteBn: 'কাজ কতটুকু সম্পন্ন হয়েছে।'
      },
      {
        character: '照片',
        pinyin: 'Zhàopiàn',
        pronunciationBn: 'চাওফিয়ান',
        meaningBn: 'ছবি (Photos)',
        audioText: '照片',
        contextNoteBn: 'চলমান কাজের ছবি চেয়ে নেওয়া।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Imran)',
        speakerRoleBn: 'বায়ার (ইমরান)',
        chinese: '陈经理，请问目前的生产进度怎么样？可以发几张工厂的照片吗？',
        pinyin: 'Chén jīnglǐ, qǐngwèn mùqián de shēngchǎn jìndù zěnmeyàng? Kěyǐ fā jǐ zhāng gōngchǎng de zhàopiàn ma?',
        pronunciationBn: 'ছেন চিংলি, ছিংওয়েন মুছিয়ান দ্য শাংছান চিনতু চ্যনমইয়াং? খ্যই ফা চি চাং কুংছাং দ্য চাওফিয়ান মা?',
        meaningBn: 'ম্যানেজার ছেন, বর্তমান উৎপাদনের অগ্রগতি কেমন? ফ্যাক্টরির কিছু ছবি কি পাঠাতে পারবেন?'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '裁剪和缝纫已经完成了80%，我马上在微信上发车间视频给您！',
        pinyin: 'Cǎijiǎn hé féngrèn yǐjīng wánchéng le 80%, wǒ mǎshàng zài Wēixìn shàng fā chējiān shìpín gěi nín!',
        pronunciationBn: 'ছাইচিয়ান হ্য ফাংরেন ইচিং ওয়ানছাং ল ৮০%, ও মাশাং চাই ওয়েইশিন শাং ফা ছ্যচিয়ান শিপিন কেই নিন!',
        meaningBn: 'কাটিং ও সেলাইয়ের ৮০% ইতিমধ্যে সম্পন্ন হয়েছে, আমি এখনই উইচ্যাটে কারখানার ভিডিও পাঠিয়ে দিচ্ছি!'
      }
    ],
    businessTipBn: 'উৎপাদন চলাকালীন নিয়মিত উইচ্যাটে "照片" (Zhàopiàn - ছবি) বা "视频" (Shìpín - ভিডিও) চাইলে সরবরাহকারী সবসময় আপনার অর্ডারে সজাগ থাকে।',
    quiz: [
      {
        id: 'c-q13-1',
        question: 'What is the Chinese word for "Factory"?',
        questionBn: '"কারখানা বা ফ্যাক্টরি"-র চীনা শব্দ কোনটি?',
        pinyinPrompt: 'Gōngchǎng',
        options: ['工厂 (Gōngchǎng)', '照片 (Zhàopiàn)', '发货 (Fāhuò)', '买家 (Mǎijiā)'],
        correctAnswer: '工厂 (Gōngchǎng)',
        explanationBn: '工厂 (Gōngchǎng) অর্থ কারখানা বা ফ্যাক্টরি।'
      }
    ]
  },

  // DAY 14
  {
    day: 14,
    title: 'Complete Supplier Conversation & Deal Closing',
    titleBn: 'পূর্ণাঙ্গ সাপ্লায়ার ডিল ফাইনাল ও দীর্ঘমেয়াদী বন্ধুত্ব',
    stage: 'Shipping & Factory',
    objectiveBn: 'শুরু থেকে শেষ পর্যন্ত সফল ডিল ক্লোজিং এবং পারস্পরিক সফল অংশীদারিত্ব উদযাপন।',
    xpReward: 50,
    coreWords: [
      {
        character: '合作愉快',
        pinyin: 'Hézuò yúkuài',
        pronunciationBn: 'হ্যচুও ইউখুয়াই',
        meaningBn: 'আমাদের যৌথ অংশীদারিত্ব ফলপ্রসূ হোক! (Happy cooperation!)',
        audioText: '合作愉快',
        contextNoteBn: 'চুক্তি সফলভাবে সম্পন্ন করার পর প্রথাগত শুভকামনা।'
      },
      {
        character: '长期合作',
        pinyin: 'Chángqī hézuò',
        pronunciationBn: 'ছাংছি হ্যচুও',
        meaningBn: 'দীর্ঘমেয়াদী অংশীদারিত্ব (Long-term cooperation)',
        audioText: '长期合作',
        contextNoteBn: 'স্থায়ী ব্যবসায়িক সম্পর্ক।'
      },
      {
        character: '朋友',
        pinyin: 'Péngyou',
        pronunciationBn: 'ফাংইউ',
        meaningBn: 'বন্ধু (Friend)',
        audioText: '朋友',
        contextNoteBn: 'চীনে ভালো ব্যবসায়ীকে বন্ধু বিবেচনা করা হয়।'
      }
    ],
    dialogue: [
      {
        speaker: 'Buyer (Shariful)',
        speakerRoleBn: 'বায়ার (শরিফুল)',
        chinese: '非常感谢陈经理的专业配合，祝我们合作愉快，建立长期合作！',
        pinyin: 'Fēicháng gǎnxiè Chén jīnglǐ de zhuānyè pèihé, zhù wǒmen hézuò yúkuài, jiànlì chángqī hézuò!',
        pronunciationBn: 'ফেইছাং কানশিয়ে ছেন চিংলি দ্য চুয়ানইয়ে ফেইহ্য, চু ওমেন হ্যচুও ইউখুয়াই, চিয়ানলি ছাংছি হ্যচুও!',
        meaningBn: 'ম্যানেজার ছেন-এর পেশাদার সহযোগিতার জন্য অনেক ধন্যবাদ, আমাদের যৌথ অংশীদারিত্ব সফল হোক এবং দীর্ঘস্থায়ী হোক!'
      },
      {
        speaker: 'Supplier (Mr. Chen)',
        speakerRoleBn: 'চীনা সাপ্লায়ার (মিস্টার ছেন)',
        chinese: '谢谢Depend Sourcing团队的信任！合作愉快，下次来广州请一定来工厂做客！',
        pinyin: 'Xièxie Depend Sourcing tuánduì de xìnrèn! Hézuò yúkuài, xià cì lái Guǎngzhōu qǐng yídìng lái gōngchǎng zuòkè!',
        pronunciationBn: 'শিয়ে শিয়ে ডিপেন্ড সোর্সিং থুয়ানতুই দ্য শিনরেন! হ্যচুও ইউখুয়াই, শিয়া ছি লাই কুয়াংচৌ ছিং ইদিং লাই কুংছাং চুওখ্য!',
        meaningBn: 'ডিপেন্ড সোর্সিং দলের আস্থার জন্য ধন্যবাদ! পার্টনারশিপ সফল হোক, পরবর্তী সময়ে গুয়াংচৌ আসলে অবশ্যই কারখানায় অতিথি হিসেবে আসবেন!'
      }
    ],
    businessTipBn: 'চীনা সংস্কৃতিতে "关系" (Guānxì - সুসম্পর্ক ও বিশ্বাস) বাণিজ্যের ভিত্তি। একবার ভালো সম্পর্ক তৈরি হলে তারা পেমেন্টে ছাড় ও সর্বোচ্চ প্রায়োরিটি দেয়।',
    quiz: [
      {
        id: 'c-q14-1',
        question: 'What is the auspicious closing phrase for successful business deals in China?',
        questionBn: 'চুক্তি সফল হলে ঐতিহ্যবাহী শুভকামনার চীনা বাক্য কোনটি?',
        pinyinPrompt: 'Hézuò yúkuài',
        options: ['合作愉快 (Hézuò yúkuài)', '多少钱 (Duōshao qián)', '太贵了 (Tài guì le)', '我不买 (Wǒ bù mǎi)'],
        correctAnswer: '合作愉快 (Hézuò yúkuài)',
        explanationBn: '合作愉快 (Hézuò yúkuài) অর্থ Happy Cooperation বা আমাদের পার্টনারশিপ সফল হোক।'
      }
    ]
  }
];

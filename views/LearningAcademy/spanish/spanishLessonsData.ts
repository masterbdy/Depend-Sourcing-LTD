import { UniversalDailyLesson } from './types';

export const SPANISH_LESSONS_DATA: UniversalDailyLesson[] = [
  {
    day: 1,
    level: 'beginner',
    title: 'Spanish Basics & Greetings',
    titleBn: 'বেসিক গ্রিটিংস ও পরিচিতি',
    objectiveBn: 'স্প্যানিশে কাউকে হ্যালো বলা, ধন্যবাদ দেওয়া ও বিদায় জানানোর মূল শব্দ ও উচ্চারণ শিখুন।',
    xpReward: 35,
    vocabulary: [
      {
        id: 'es-1',
        targetWord: 'Hola',
        bengaliPronunciation: 'ওলা (H উচ্চারিত হয় না)',
        bengaliMeaning: '= হ্যালো / হাই',
        category: 'greetings',
        exampleTarget: 'Hola, buenos días.',
        exampleBengali: 'হ্যালো, শুভ সকাল।',
        audioText: 'Hola, buenos días',
        difficulty: 'beginner'
      },
      {
        id: 'es-2',
        targetWord: 'Buenos días',
        bengaliPronunciation: 'বুয়েনোস দিয়াস',
        bengaliMeaning: '= শুভ সকাল (Good morning)',
        category: 'greetings',
        exampleTarget: 'Buenos días, señor.',
        exampleBengali: 'শুভ সকাল, স্যার।',
        audioText: 'Buenos días, señor',
        difficulty: 'beginner'
      },
      {
        id: 'es-3',
        targetWord: 'Buenas tardes',
        bengaliPronunciation: 'বুয়েনাস তার্দেস',
        bengaliMeaning: '= শুভ অপরাহ্ন (Good afternoon)',
        category: 'greetings',
        exampleTarget: 'Buenas tardes a todos.',
        exampleBengali: 'সবাইকে শুভ অপরাহ্ন।',
        audioText: 'Buenas tardes a todos',
        difficulty: 'beginner'
      },
      {
        id: 'es-4',
        targetWord: 'Gracias',
        bengaliPronunciation: 'গ্রাসিয়াস',
        bengaliMeaning: '= ধন্যবাদ (Thank you)',
        category: 'polite',
        exampleTarget: 'Muchas gracias por su ayuda.',
        exampleBengali: 'আপনার সাহায্যের জন্য অনেক ধন্যবাদ।',
        audioText: 'Muchas gracias por su ayuda',
        difficulty: 'beginner'
      },
      {
        id: 'es-5',
        targetWord: 'Por favor',
        bengaliPronunciation: 'পোর ফাভোর',
        bengaliMeaning: '= অনুগ্রহ করে / দয়া করে (Please)',
        category: 'polite',
        exampleTarget: 'Un café, por favor.',
        exampleBengali: 'দয়া করে এক কাপ কফি দিন।',
        audioText: 'Un café, por favor',
        difficulty: 'beginner'
      },
      {
        id: 'es-6',
        targetWord: 'Adiós',
        bengaliPronunciation: 'আদিওস',
        bengaliMeaning: '= বিদায় (Goodbye)',
        category: 'greetings',
        exampleTarget: 'Adiós, hasta luego.',
        exampleBengali: 'বিদায়, পরে দেখা হবে।',
        audioText: 'Adiós, hasta luego',
        difficulty: 'beginner'
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'এইচ (H) অক্ষরের অনুচ্চারিত নিয়ম (Silent H)',
        explanationBn: 'স্প্যানিশ ভাষায় ইংরেজি "H" অক্ষরটির কোনো নিজস্ব উচ্চারণ নেই। "Hola" উচ্চারিত হয় "ওলা", কোনো অবস্থাতেই "হোলা" নয়।',
        correctExample: 'Hola [ওলা]',
        incorrectExample: 'Hola [হোলা]',
        exampleBn: 'Hola, amigo = হ্যালো বন্ধু।'
      },
      {
        ruleTitleBn: 'উল্টো প্রশ্নবোধক চিহ্ন (¿)',
        explanationBn: 'স্প্যানিশে যেকোনো প্রশ্নবোধক বাক্যের শুরুতে উল্টো প্রশ্নচিহ্ন (¿) এবং শেষে স্বাভাবিক (?) বসে।',
        correctExample: '¿Cómo estás?',
        exampleBn: 'তুমি কেমন আছো?'
      }
    ],
    conversation: [
      {
        speaker: 'Carlos',
        speakerRoleBn: 'স্প্যানিশ সহযোগী',
        targetText: '¡Hola! Buenos días. ¿Cómo estás?',
        bengaliPronunciation: 'ওলা! বুয়েনোস দিয়াস। কোমো এস্তাস?',
        bengaliMeaning: 'হ্যালো! শুভ সকাল। তুমি কেমন আছো?'
      },
      {
        speaker: 'Mehedi',
        speakerRoleBn: 'বায়ার / শিক্ষার্থী',
        targetText: 'Muy bien, gracias. ¿Y usted?',
        bengaliPronunciation: 'মুই বিয়েন, গ্রাসিয়াস। ই উস্তেদ?',
        bengaliMeaning: 'খুব ভালো, ধন্যবাদ। আর আপনি?'
      },
      {
        speaker: 'Carlos',
        speakerRoleBn: 'স্প্যানিশ সহযোগী',
        targetText: 'Excelente. Mucho gusto.',
        bengaliPronunciation: 'এক্সেলেল্তে। মুচো গুস্তো।',
        bengaliMeaning: 'চমৎকার। আপনার সাথে পরিচিত হয়ে আনন্দিত হলাম।'
      }
    ],
    practiceSentences: [
      {
        target: 'Hola, ¿cómo estás?',
        pronunciationBn: 'ওলা, কোমো এস্তাস?',
        meaningBn: 'হ্যালো, তুমি কেমন আছো?'
      },
      {
        target: 'Muchas gracias, amigo.',
        pronunciationBn: 'মুচাস গ্রাসিয়াস, আমিগো।',
        meaningBn: 'অনেক ধন্যবাদ, বন্ধু।'
      },
      {
        target: 'Hasta mañana, por favor.',
        pronunciationBn: 'আস্তা মানিয়ানা, পোর ফাভোর।',
        meaningBn: 'কাল দেখা হবে, দয়া করে মনে রাখবেন।'
      }
    ],
    quiz: [
      {
        id: 'es-q1',
        question: 'What is the correct Bengali meaning and pronunciation of "Hola"?',
        questionBn: '"Hola" শব্দের সঠিক বাংলা উচ্চারণ ও অর্থ কোনটি?',
        options: [
          'হোলা = কেমন আছো',
          'ওলা = হ্যালো / হাই',
          'আদিওস = বিদায়',
          'গ্রাসিয়াস = ধন্যবাদ'
        ],
        correctAnswer: 'ওলা = হ্যালো / হাই',
        explanationBn: 'স্প্যানিশে H এর কোনো শব্দ নেই, তাই "Hola" উচ্চারিত হয় "ওলা" যার অর্থ হ্যালো।'
      },
      {
        id: 'es-q2',
        question: 'How do you say "Thank you" in Spanish?',
        questionBn: 'স্প্যানিশে "ধন্যবাদ" কিভাবে বলে?',
        options: ['Por favor', 'Buenos días', 'Gracias', 'Adiós'],
        correctAnswer: 'Gracias',
        explanationBn: '"Gracias" (গ্রাসিয়াস) অর্থ ধন্যবাদ।'
      },
      {
        id: 'es-q3',
        question: 'Translate "Please" into Spanish:',
        questionBn: '"দয়া করে / অনুগ্রহ করে"-এর স্প্যানিশ কোনটি?',
        options: ['Por favor', 'Hasta luego', 'Mucho gusto', 'De nada'],
        correctAnswer: 'Por favor',
        explanationBn: '"Por favor" (পোর ফাভোর) অর্থ দয়া করে।'
      }
    ],
    businessTipBn: 'ল্যাটিন আমেরিকা ও স্পেনের ব্যবসায়ীদের সাথে যোগাযোগের সময় প্রথমে আনুষ্ঠানিক শুভেচ্ছা ও সৌজন্য বিনিময় ব্যবসায়িক সম্পর্ক মজবুত করে।'
  },
  {
    day: 2,
    level: 'beginner',
    title: 'Essential Numbers & Price Inquiries',
    titleBn: 'সংখ্যা ও দাম যাচাই (Numbers & Pricing)',
    objectiveBn: 'পণ্যের দাম জানা, এক থেকে দশ পর্যন্ত সংখ্যা ও কোটেশন জানতে চাওয়ার উপায় শিখুন।',
    xpReward: 40,
    vocabulary: [
      {
        id: 'es-7',
        targetWord: '¿Cuánto cuesta?',
        bengaliPronunciation: 'কুয়ান্তো কুয়েস্তা?',
        bengaliMeaning: '= কত দাম? (How much does it cost?)',
        category: 'pricing',
        exampleTarget: '¿Cuánto cuesta este producto?',
        exampleBengali: 'এই পণ্যের দাম কত?',
        audioText: '¿Cuánto cuesta este producto?',
        difficulty: 'beginner'
      },
      {
        id: 'es-8',
        targetWord: 'El precio',
        bengaliPronunciation: 'এল প্রেসিয়ো',
        bengaliMeaning: '= দাম / মূল্য (The price)',
        category: 'pricing',
        exampleTarget: 'El precio es muy competitivo.',
        exampleBengali: 'দামটি অত্যন্ত প্রতিযোগিতামূলক।',
        audioText: 'El precio es muy competitivo',
        difficulty: 'beginner'
      },
      {
        id: 'es-9',
        targetWord: 'Uno, Dos, Tres',
        bengaliPronunciation: 'উনো, দোস, ত্রেস',
        bengaliMeaning: '= ১, ২, ৩',
        category: 'numbers',
        exampleTarget: 'Uno, dos, tres muestras.',
        exampleBengali: 'এক, দুই, তিনটি স্যাম্পল।',
        audioText: 'Uno, dos, tres muestras',
        difficulty: 'beginner'
      },
      {
        id: 'es-10',
        targetWord: 'Cuatro, Cinco, Diez',
        bengaliPronunciation: 'কুয়াত্রো, সিঙ্কো, দিয়েস',
        bengaliMeaning: '= ৪, ৫, ১০',
        category: 'numbers',
        exampleTarget: 'Diez piezas por caja.',
        exampleBengali: 'বক্স প্রতি দশটি পিস।',
        audioText: 'Diez piezas por caja',
        difficulty: 'beginner'
      },
      {
        id: 'es-11',
        targetWord: 'Cien, Mil',
        bengaliPronunciation: 'সিয়েন, মিল',
        bengaliMeaning: '= ১০০, ১০০০',
        category: 'numbers',
        exampleTarget: 'Mil unidades como mínimo.',
        exampleBengali: 'সর্বনিম্ন এক হাজার ইউনিট।',
        audioText: 'Mil unidades como mínimo',
        difficulty: 'beginner'
      },
      {
        id: 'es-12',
        targetWord: 'Caro / Barato',
        bengaliPronunciation: 'কারো / বারাতো',
        bengaliMeaning: '= দামি / সস্তা (Expensive / Cheap)',
        category: 'pricing',
        exampleTarget: 'Es un poco caro para nuestro mercado.',
        exampleBengali: 'আমাদের বাজারের জন্য এটি একটু দামি।',
        audioText: 'Es un poco caro para nuestro mercado',
        difficulty: 'beginner'
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: '¿Cuánto cuesta? বনাম ¿Cuánto cuestan?',
        explanationBn: 'একটিমাত্র জিনিসের দাম জানতে "¿Cuánto cuesta?" ব্যবহৃত হয়। কিন্তু বহুবচন বা একাধিক জিনিসের জন্য "¿Cuánto cuestan?" বলতে হবে।',
        correctExample: '¿Cuánto cuesta esta camisa? (একবচন) / ¿Cuánto cuestan estas telas? (বহুবচন)',
        exampleBn: 'এই শার্টটির দাম কত? / এই কাপড়গুলোর দাম কত?'
      }
    ],
    conversation: [
      {
        speaker: 'Comprador',
        speakerRoleBn: 'বায়ার / আমদানিকারক',
        targetText: 'Buenos días. ¿Cuánto cuesta este modelo?',
        bengaliPronunciation: 'বুয়েনোস দিয়াস। কুয়ান্তো কুয়েস্তা এস্তে মোদেলো?',
        bengaliMeaning: 'শুভ সকাল। এই মডেলটির দাম কত?'
      },
      {
        speaker: 'Vendedor',
        speakerRoleBn: 'বিক্রেতা / সাপ্লায়ার',
        targetText: 'El precio es cinco dólares por unidad.',
        bengaliPronunciation: 'এল প্রেসিয়ো এস সিঙ্কো দোলোরেস পোর উনিদাদ।',
        bengaliMeaning: 'ইউনিট প্রতি মূল্য পাঁচ ডলার।'
      },
      {
        speaker: 'Comprador',
        speakerRoleBn: 'বায়ার / আমদানিকারক',
        targetText: '¿Hay descuento por mil unidades?',
        bengaliPronunciation: 'আই দেসকুয়েন্তো পোর মিল উনিদাদেস?',
        bengaliMeaning: 'এক হাজার ইউনিটের জন্য কি কোনো ডিসকাউন্ট আছে?'
      }
    ],
    practiceSentences: [
      {
        target: '¿Cuánto cuesta el envío?',
        pronunciationBn: 'কুয়ান্তো কুয়েস্তা এল এনবিয়ো?',
        meaningBn: 'শিপিং / ডেলিভারি খরচ কত?'
      },
      {
        target: 'Necesitamos quinientas unidades.',
        pronunciationBn: 'নেসেসিতামোস কিনিয়েন্তাস উনিদাদেস।',
        meaningBn: 'আমাদের ৫০০ ইউনিট প্রয়োজন।'
      }
    ],
    quiz: [
      {
        id: 'es-q4',
        question: 'What does "¿Cuánto cuesta?" mean?',
        questionBn: '"¿Cuánto cuesta?" এর অর্থ কি?',
        options: ['কত দাম?', 'কোথায় যাবেন?', 'কখন আসবেন?', 'কেমন আছেন?'],
        correctAnswer: 'কত দাম?',
        explanationBn: '"¿Cuánto cuesta?" অর্থ কত দাম?'
      },
      {
        id: 'es-q5',
        question: 'Which Spanish word means 1000?',
        questionBn: 'স্প্যানিশে ১০০০ কে কি বলে?',
        options: ['Cien', 'Diez', 'Mil', 'Uno'],
        correctAnswer: 'Mil',
        explanationBn: 'Mil (মিল) অর্থ ১০০০।'
      }
    ],
    businessTipBn: 'স্প্যানিশভাষী ক্লায়েন্টদের সাথে আলোচনার সময় ইউনিট প্রাইস ও কারেন্সি (ডলার বা ইউরো) শুরুতেই স্পষ্ট করে নেওয়া ভালো।'
  },
  {
    day: 3,
    level: 'elementary',
    title: 'Orders, MOQ & Quality Discussion',
    titleBn: 'অর্ডার, সর্বনিম্ন পরিমাণ (MOQ) ও কোয়ালিটি',
    objectiveBn: 'অর্ডারের পরিমাণ, স্যাম্পল টেস্ট এবং পণ্যের মান যাচাইয়ের প্রাথমিক বাক্যসমূহ শিখুন।',
    xpReward: 45,
    vocabulary: [
      {
        id: 'es-13',
        targetWord: 'El pedido',
        bengaliPronunciation: 'এল পেদিদো',
        bengaliMeaning: '= অর্ডার (The order)',
        category: 'orders',
        exampleTarget: 'Queremos confirmar el pedido hoy.',
        exampleBengali: 'আমরা আজই অর্ডার কনফার্ম করতে চাই।',
        audioText: 'Queremos confirmar el pedido hoy',
        difficulty: 'elementary'
      },
      {
        id: 'es-14',
        targetWord: 'La cantidad mínima (MOQ)',
        bengaliPronunciation: 'লা কান্তিদান মিনিমা',
        bengaliMeaning: '= সর্বনিম্ন অর্ডারের পরিমাণ (Minimum order quantity)',
        category: 'orders',
        exampleTarget: '¿Cuál es la cantidad mínima?',
        exampleBengali: 'সর্বনিম্ন অর্ডারের পরিমাণ কত?',
        audioText: '¿Cuál es la cantidad mínima?',
        difficulty: 'elementary'
      },
      {
        id: 'es-15',
        targetWord: 'La muestra',
        bengaliPronunciation: 'লা মুয়েস্ত্রা',
        bengaliMeaning: '= স্যাম্পল / নমুনা (The sample)',
        category: 'samples',
        exampleTarget: 'Por favor envíen una muestra.',
        exampleBengali: 'দয়া করে একটি স্যাম্পল পাঠান।',
        audioText: 'Por favor envíen una muestra',
        difficulty: 'elementary'
      },
      {
        id: 'es-16',
        targetWord: 'La calidad',
        bengaliPronunciation: 'লা কালিদাদ',
        bengaliMeaning: '= মান / গুণমান (The quality)',
        category: 'quality',
        exampleTarget: 'Garantizamos alta calidad.',
        exampleBengali: 'আমরা সর্বোচ্চ মানের নিশ্চয়তা দিচ্ছি।',
        audioText: 'Garantizamos alta calidad',
        difficulty: 'elementary'
      },
      {
        id: 'es-17',
        targetWord: 'El plazo de entrega',
        bengaliPronunciation: 'এল প্লাসো দে এনত্রেগা',
        bengaliMeaning: '= ডেলিভারির সময়সীমা (Delivery lead time)',
        category: 'shipping',
        exampleTarget: 'El plazo de entrega es treinta días.',
        exampleBengali: 'ডেলিভারির সময়সীমা ৩০ দিন।',
        audioText: 'El plazo de entrega es treinta días',
        difficulty: 'elementary'
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'Queremos + ক্রিয়াপদ (We want to...)',
        explanationBn: '"Queremos" এর পর যেকোনো মূল ভার্ব বসিয়ে সহজেই ইচ্ছা বা চাহিদা প্রকাশ করা যায়। যেমন: Queremos comprar (আমরা কিনতে চাই)।',
        correctExample: 'Queremos hacer un pedido.',
        exampleBn: 'আমরা একটি অর্ডার করতে চাই।'
      }
    ],
    conversation: [
      {
        speaker: 'Cliente',
        speakerRoleBn: 'ক্লায়েন্ট / ক্রেতা',
        targetText: '¿Pueden enviarnos una muestra primero?',
        bengaliPronunciation: 'পুয়েদেন এনবিয়ারনোস উনা মুয়েস্ত্রা প্রিমেরো?',
        bengaliMeaning: 'আপনারা কি প্রথমে আমাদের একটি স্যাম্পল পাঠাতে পারবেন?'
      },
      {
        speaker: 'Fabricante',
        speakerRoleBn: 'প্রস্তুতকারক',
        targetText: 'Sí, podemos enviar la muestra en tres días.',
        bengaliPronunciation: 'সি, পোদেমোস এনবিয়ার লা মুয়েস্ত্রা এন ত্রেস দিয়াস।',
        bengaliMeaning: 'হ্যাঁ, আমরা তিন দিনের মধ্যে স্যাম্পল পাঠাতে পারব।'
      }
    ],
    practiceSentences: [
      {
        target: 'La calidad de la tela es excelente.',
        pronunciationBn: 'লা কালিদাদ দে লা তেলা এস এক্সেলেল্তে।',
        meaningBn: 'কাপড়ের কোয়ালিটি অত্যন্ত চমৎকার।'
      }
    ],
    quiz: [
      {
        id: 'es-q6',
        question: 'Which Spanish word means "The sample"?',
        questionBn: '"স্যাম্পল / নমুনা"-এর স্প্যানিশ কোনটি?',
        options: ['La muestra', 'El pedido', 'El precio', 'La calidad'],
        correctAnswer: 'La muestra',
        explanationBn: 'La muestra (লা মুয়েস্ত্রা) অর্থ স্যাম্পল বা নমুনা।'
      }
    ],
    businessTipBn: 'আন্তর্জাতিক বাণিজ্যে "Muestra" (স্যাম্পল) অনুমোদন ছাড়া বড় অর্ডারে প্রবেশ না করাই প্রফেশনাল মান বজায় রাখার নিয়ম।'
  },
  {
    day: 4,
    level: 'intermediate',
    title: 'Payment Terms & Contract Negotiation',
    titleBn: 'পেমেন্ট শর্তাবলি ও চুক্তি নেগোশিয়েশন',
    objectiveBn: 'ডিপোজিট, এলসি (LC), ব্যাংক ট্রান্সফার ও চূড়ান্ত পেমেন্ট টার্মস নির্ধারণ করার প্রফেশনাল ভাষা শিখুন।',
    xpReward: 50,
    vocabulary: [
      {
        id: 'es-18',
        targetWord: 'El pago',
        bengaliPronunciation: 'এল পাগো',
        bengaliMeaning: '= পেমেন্ট / মূল্য পরিশোধ (The payment)',
        category: 'finance',
        exampleTarget: 'Recibimos el pago bancario.',
        exampleBengali: 'আমরা ব্যাংক পেমেন্ট পেয়েছি।',
        audioText: 'Recibimos el pago bancario',
        difficulty: 'intermediate'
      },
      {
        id: 'es-19',
        targetWord: 'El depósito / Adelanto',
        bengaliPronunciation: 'এল দেপোশিতো / আদেলাল্তো',
        bengaliMeaning: '= অগ্রিম / ডিপোজিট (Deposit / Advance)',
        category: 'finance',
        exampleTarget: 'Treinta por ciento de depósito.',
        exampleBengali: 'তিরিশ শতাংশ অগ্রিম ডিপোজিট।',
        audioText: 'Treinta por ciento de depósito',
        difficulty: 'intermediate'
      },
      {
        id: 'es-20',
        targetWord: 'La transferencia bancaria',
        bengaliPronunciation: 'লা ত্রান্সফেরেনসিয়া বাঙ্কারিয়া',
        bengaliMeaning: '= ব্যাংক ট্রান্সফার / টিটি (Bank transfer)',
        category: 'finance',
        exampleTarget: 'Pagamos por transferencia bancaria.',
        exampleBengali: 'আমরা ব্যাংক ট্রান্সফারের মাধ্যমে পেমেন্ট করব।',
        audioText: 'Pagamos por transferencia bancaria',
        difficulty: 'intermediate'
      },
      {
        id: 'es-21',
        targetWord: 'El contrato',
        bengaliPronunciation: 'এল কোনত্রাতো',
        bengaliMeaning: '= চুক্তিপত্র (The contract)',
        category: 'legal',
        exampleTarget: 'Vamos a firmar el contrato.',
        exampleBengali: 'আমরা চুক্তিতে স্বাক্ষর করব।',
        audioText: 'Vamos a firmar el contrato',
        difficulty: 'intermediate'
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'শতকরা হিসাব (Por ciento)',
        explanationBn: 'স্প্যানিশে শতাংশ প্রকাশ করতে সংখ্যার সাথে "por ciento" যুক্ত হয়। যেমন: 30% = Treinta por ciento.',
        correctExample: '30% de adelanto y 70% antes del embarque.',
        exampleBn: '৩০% অগ্রিম এবং শিপমেন্টের পূর্বে ৭০%।'
      }
    ],
    conversation: [
      {
        speaker: 'Director',
        speakerRoleBn: 'ম্যানেজিং ডিরেক্টর',
        targetText: '¿Cuáles son las condiciones de pago?',
        bengaliPronunciation: 'কুয়ালেস সন লাস কোনদিসিওনেস দে পাগো?',
        bengaliMeaning: 'পেমেন্টের শর্তাবলি কী?'
      },
      {
        speaker: 'Proveedor',
        speakerRoleBn: 'সাপ্লায়ার',
        targetText: 'Treinta por ciento de depósito y el resto contra entrega.',
        bengaliPronunciation: 'ত্রেয়েন্তা পোর সিয়েন্তো দে দেপোশিতো ই এল রেস্তো কোনত্রা এনত্রেগা।',
        bengaliMeaning: '৩০% অগ্রিম এবং অবশিষ্ট টাকা ডেলিভারির বিপরীতে।'
      }
    ],
    practiceSentences: [
      {
        target: 'Enviaremos la factura proforma hoy.',
        pronunciationBn: 'এনবিয়ারেমোস লা ফাকতুরা প্রফোরমা ওই।',
        meaningBn: 'আমরা আজই প্রফর্মা ইনভয়েস পাঠিয়ে দেব।'
      }
    ],
    quiz: [
      {
        id: 'es-q7',
        question: 'What does "El depósito" mean?',
        questionBn: '"El depósito" এর অর্থ কি?',
        options: ['ডিপোজিট / অগ্রিম', 'ডেলিভারি', 'স্যাম্পল', 'চুক্তিপত্র'],
        correctAnswer: 'ডিপোজিট / অগ্রিম',
        explanationBn: 'El depósito অর্থ ডিপোজিট বা অগ্রিম জামানত।'
      }
    ],
    businessTipBn: 'লাতিন আমেরিকার ক্রেতাদের জন্য ইনভয়েসে ট্যাক্স আইডি (RUT / CIF) উল্লেখ করা জরুরি।'
  }
];

export const SPANISH_VOCABULARY_LIST = [
  ...SPANISH_LESSONS_DATA.flatMap((d) => d.vocabulary)
];

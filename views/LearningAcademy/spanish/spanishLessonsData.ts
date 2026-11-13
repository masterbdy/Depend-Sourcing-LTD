import { UniversalDailyLesson } from '../core/types';

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
  },
  {
    day: 5,
    level: 'elementary',
    cefrLevel: 'A2',
    title: 'Numbers, Time & Scheduling',
    titleBn: 'সংখ্যা, সময় ও কাজের শিডিউল',
    objectiveBn: 'স্প্যানিশে সময় নির্ধারণ, তারিখ ও জরুরি মিটিং শিডিউল করার নিয়ম শিখুন।',
    xpReward: 35,
    vocabulary: [
      {
        id: 'es-501',
        targetWord: 'La fecha',
        bengaliPronunciation: 'লা ফেচা',
        bengaliMeaning: '= তারিখ (Date)',
        category: 'calendar',
        exampleTarget: '¿Cuál es la fecha de entrega?',
        exampleBengali: 'ডেলিভারির তারিখ কোনটি?',
        audioText: 'Cuál es la fecha de entrega',
      },
      {
        id: 'es-502',
        targetWord: 'Mañana',
        bengaliPronunciation: 'মানিয়ানা',
        bengaliMeaning: '= আগামীকাল / সকাল (Tomorrow)',
        category: 'time',
        exampleTarget: 'Tenemos reunión mañana a las diez.',
        exampleBengali: 'আগামীকাল সকাল দশটায় আমাদের মিটিং আছে।',
        audioText: 'Tenemos reunión mañana a las diez',
      },
      {
        id: 'es-503',
        targetWord: 'La semana',
        bengaliPronunciation: 'লা সেমানা',
        bengaliMeaning: '= সপ্তাহ (Week)',
        category: 'time',
        exampleTarget: 'La próxima semana enviaremos el reporte.',
        exampleBengali: 'পরের সপ্তাহে আমরা রিপোর্ট পাঠাব।',
        audioText: 'La próxima semana enviaremos el reporte',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'সময় বলার নিয়ম (Decir la hora)',
        explanationBn: 'একটার সময় "Es la una", আর দুইটা থেকে বারোটা পর্যন্ত "Son las dos, tres, diez" ব্যবহৃত হয়।',
        correctExample: 'Son las tres de la tarde.',
        exampleBn: 'এখন বিকেল তিনটা বাজে।',
      }
    ],
    conversation: [
      {
        speaker: 'Gerente',
        speakerRoleBn: 'ম্যানেজার',
        targetText: '¿A qué hora comienza la reunión?',
        bengaliPronunciation: 'আ কে ওরা কমিয়েনসা লা রেউনিওন?',
        bengaliMeaning: 'মিটিং কখন শুরু হবে?'
      },
      {
        speaker: 'Coordinador',
        speakerRoleBn: 'সমন্বয়ক',
        targetText: 'A las diez y media de la mañana.',
        bengaliPronunciation: 'আ লাস দিয়েস ই মেদিয়া দে লা মানিয়ানা।',
        bengaliMeaning: 'সকাল সাড়ে দশটায়।'
      }
    ],
    practiceSentences: [
      {
        target: 'El plazo vence el viernes.',
        pronunciationBn: 'এল প্লাসো ভেনসে এল ভিয়েরনেস।',
        meaningBn: 'সময়সীমা শুক্রবার শেষ হবে।'
      }
    ],
    quiz: [
      {
        id: 'es-q501',
        question: 'What does "La fecha" mean?',
        questionBn: '"La fecha" শব্দের অর্থ কী?',
        options: ['তারিখ (Date)', 'ঘণ্টা', 'বছর', 'মাস'],
        correctAnswer: 'তারিখ (Date)',
        explanationBn: 'La fecha অর্থ তারিখ।'
      }
    ],
    businessTipBn: 'স্প্যানিশ বায়ারদের সাথে মিটিংয়ে সময়সীমা পরিষ্কারভাবে লিখিত রাখা উত্তম।'
  },
  {
    day: 6,
    level: 'elementary',
    cefrLevel: 'A2',
    title: 'Garments & Textile Sourcing',
    titleBn: 'তৈরি পোশাক ও টেক্সটাইল সোর্সিং',
    objectiveBn: 'গার্মেন্টস, সুতা, ফ্যাব্রিক ও কাঁচামাল নিয়ে স্প্যানিশে কথা বলার দক্ষতা অর্জন।',
    xpReward: 35,
    vocabulary: [
      {
        id: 'es-601',
        targetWord: 'El algodón',
        bengaliPronunciation: 'এল আলগোদোন',
        bengaliMeaning: '= তুলা বা কটন (Cotton)',
        category: 'textile',
        exampleTarget: 'Camiseta cien por ciento algodón.',
        exampleBengali: '১০০% সুতি টি-শার্ট।',
        audioText: 'Camiseta cien por ciento algodón',
      },
      {
        id: 'es-602',
        targetWord: 'El tejido',
        bengaliPronunciation: 'এল তেহিদো',
        bengaliMeaning: '= ফ্যাব্রিক বা কাপড় (Fabric)',
        category: 'textile',
        exampleTarget: 'Este tejido tiene excelente elasticidad.',
        exampleBengali: 'এই কাপড়ের ইলাস্টিসিটি চমৎকার।',
        audioText: 'Este tejido tiene excelente elasticidad',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'বিশেষ্যের পূর্বে বা পরে বিশেষণ (Adjetivos)',
        explanationBn: 'স্প্যানিশে বেশিরভাগ বিশেষণ বিশেষ্যের পরে বসে (যেমন: algodón orgánico)।',
        correctExample: 'Camisa azul de algodón.',
        exampleBn: 'নীল সুতি শার্ট।',
      }
    ],
    conversation: [
      {
        speaker: 'Comprador',
        speakerRoleBn: 'বায়ার',
        targetText: '¿Tienen tela denim con lavado suave?',
        bengaliPronunciation: 'তিয়েনেন তেলা দেনিম কোন লাভাদো সুয়াভে?',
        bengaliMeaning: 'আপনাদের কি সফট ওয়াশের ডেনিম কাপড় আছে?'
      },
      {
        speaker: 'Vendedor',
        speakerRoleBn: 'বিক্রেতা',
        targetText: 'Sí, disponemos de muestras en el almacén.',
        bengaliPronunciation: 'সি, দিসপোনেমোস দে মুয়েস্ত্রাস এন এল আলমাসেন।',
        bengaliMeaning: 'হ্যাঁ, গুদামে আমাদের কাছে নমুনা রয়েছে।'
      }
    ],
    practiceSentences: [
      {
        target: 'La muestra cumple con los estándares.',
        pronunciationBn: 'লা মুয়েস্ত্রা কুম্পলে কোন লস এসতান্দারেস।',
        meaningBn: 'নমুনাটি মানদণ্ড পূরণ করেছে।'
      }
    ],
    quiz: [
      {
        id: 'es-q601',
        question: 'What is "El algodón"?',
        questionBn: '"El algodón" বলতে কী বোঝায়?',
        options: ['তুলা / কটন', 'সিল্ক', 'পলেস্টার', 'উল'],
        correctAnswer: 'তুলা / কটন',
        explanationBn: 'Algodón অর্থ কটন বা তুলা।'
      }
    ],
    businessTipBn: 'বায়ারদের সাথে সুতার জিএসএম (GSM) ও কাউন্ট পরিষ্কার করে নেওয়া জরুরি।'
  },
  {
    day: 7,
    level: 'intermediate',
    cefrLevel: 'B1',
    title: 'Quality Inspection & Lab Dips',
    titleBn: 'গুণগত মান পরিদর্শন ও ল্যাব ডিপস',
    objectiveBn: 'পোশাকের কোয়ালিটি কন্ট্রোল, সেলাই ও ল্যাব টেস্ট রিপোর্ট নিয়ে আলোচনা।',
    xpReward: 40,
    vocabulary: [
      {
        id: 'es-701',
        targetWord: 'El defecto',
        bengaliPronunciation: 'এল দেফেক্তো',
        bengaliMeaning: '= ত্রুটি (Defect)',
        category: 'quality',
        exampleTarget: 'Cero defectos en la inspección final.',
        exampleBengali: 'চূড়ান্ত পরিদর্শনে কোনো ত্রুটি নেই।',
        audioText: 'Cero defectos en la inspección final',
      },
      {
        id: 'es-702',
        targetWord: 'Aprobado',
        bengaliPronunciation: 'আপ্রোবাদো',
        bengaliMeaning: '= অনুমোদিত (Approved)',
        category: 'quality',
        exampleTarget: 'El lote ha sido aprobado por el cliente.',
        exampleBengali: 'লটটি ক্লায়েন্ট কর্তৃক অনুমোদিত হয়েছে।',
        audioText: 'El lote ha sido aprobado por el cliente',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'Pretérito Perfecto (সম্পন্ন অতীত কাল)',
        explanationBn: 'হালনাগাদ কাজ সম্পন্ন হওয়া বোঝাতে Haber + Participio (Ha sido, Hemos enviado) ব্যবহৃত হয়।',
        correctExample: 'Hemos revisado la costura.',
        exampleBn: 'আমরা সেলাই পরীক্ষা করেছি।',
      }
    ],
    conversation: [
      {
        speaker: 'Auditor',
        speakerRoleBn: 'অডিটর',
        targetText: '¿Cuándo realizan la prueba de lavado?',
        bengaliPronunciation: 'কুয়ানদো রেয়ালিসান লা প্রুয়েবা দে লাভাদো?',
        bengaliMeaning: 'ওয়াশ টেস্ট কখন সম্পন্ন করবেন?'
      },
      {
        speaker: 'Gerente',
        speakerRoleBn: 'ম্যানেজার',
        targetText: 'La prueba de lavado se realiza mañana.',
        bengaliPronunciation: 'লা প্রুয়েবা দে লাভাদো সে রেয়ালিসা মানিয়ানা।',
        bengaliMeaning: 'ওয়াশ টেস্ট আগামীকাল করা হবে।'
      }
    ],
    practiceSentences: [
      {
        target: 'La solidez del color es perfecta.',
        pronunciationBn: 'লা সোলিদেস দেল কলোর এস পেরফেকতা।',
        meaningBn: 'রঙের স্থায়িত্ব নিখুঁত।'
      }
    ],
    quiz: [
      {
        id: 'es-q701',
        question: 'What does "Aprobado" mean?',
        questionBn: '"Aprobado" শব্দের অর্থ কী?',
        options: ['অনুমোদিত (Approved)', 'বাতিল', 'বিলম্বিত', 'অসম্পূর্ণ'],
        correctAnswer: 'অনুমোদিত (Approved)',
        explanationBn: 'Aprobado অর্থ পাস বা অনুমোদিত।'
      }
    ],
    businessTipBn: 'পরিদর্শন রিপোর্ট স্প্যানিশ ক্রেতাকে সাথে সাথে ইমেইল করে পাঠানো উচিত।'
  },
  {
    day: 8,
    level: 'intermediate',
    cefrLevel: 'B1',
    title: 'Packaging & Cartons',
    titleBn: 'প্যাকিং ও কার্টনিং স্পেসিফিকেশন',
    objectiveBn: 'প্যাকিং লিস্ট, হ্যাংট্যাগ ও কার্টন লেবেলিং সম্পর্কে স্প্যানিশে যোগাযোগ।',
    xpReward: 40,
    vocabulary: [
      {
        id: 'es-801',
        targetWord: 'La caja',
        bengaliPronunciation: 'লা কাহা',
        bengaliMeaning: '= কার্টন বা বাক্স (Box / Carton)',
        category: 'packaging',
        exampleTarget: 'Cincuenta piezas por caja.',
        exampleBengali: 'প্রতি কার্টনে ৫০ পিস।',
        audioText: 'Cincuenta piezas por caja',
      },
      {
        id: 'es-802',
        targetWord: 'La etiqueta',
        bengaliPronunciation: 'লা এতিকেতা',
        bengaliMeaning: '= লেবেল বা হ্যাংট্যাগ (Label)',
        category: 'packaging',
        exampleTarget: 'Coloque la etiqueta en el cuello.',
        exampleBengali: 'কলারে লেবেল সংযুক্ত করুন।',
        audioText: 'Coloque la etiqueta en el cuello',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'Imperativo Formal (সম্মানজনক নির্দেশ)',
        explanationBn: 'সম্মানজনক নির্দেশে Usted রূপ ব্যবহৃত হয় (যেমন: Coloque, Envíe, Confirme)।',
        correctExample: 'Envíe las especificaciones por favor.',
        exampleBn: 'দয়া করে স্পেসিফিকেশন পাঠান।',
      }
    ],
    conversation: [
      {
        speaker: 'Cliente',
        speakerRoleBn: 'ক্রেতা',
        targetText: '¿Pueden poner el código de barras en la caja?',
        bengaliPronunciation: 'পুয়েদেন পনের এল কোদিগো দে বার্রাস এন লা কাহা?',
        bengaliMeaning: 'কার্টনে কি বারকোড লাগাতে পারবেন?'
      },
      {
        speaker: 'Fábrica',
        speakerRoleBn: 'ফ্যাক্টরি',
        targetText: 'Sí, etiquetamos cada caja según sus normas.',
        bengaliPronunciation: 'সি, এতিকেতামোস কাদা কাহা সেগুন সুস নোরমাস।',
        bengaliMeaning: 'হ্যাঁ, আপনার নির্দেশনানুসারে প্রতিটি কার্টনে লেবেল লাগানো হবে।'
      }
    ],
    practiceSentences: [
      {
        target: 'El peso neto está indicado en el bulto.',
        pronunciationBn: 'এল পেসো নেতো এস্তা ইন্দিকাদো এন এল বুলতো।',
        meaningBn: 'প্যাকেজে নিট ওজন উল্লেখ করা আছে।'
      }
    ],
    quiz: [
      {
        id: 'es-q801',
        question: 'What does "La caja" mean?',
        questionBn: '"La caja" অর্থ কী?',
        options: ['কার্টন / বাক্স', 'সুতা', 'বোতাম', 'কাপড়'],
        correctAnswer: 'কার্টন / বাক্স',
        explanationBn: 'La caja অর্থ বাক্স বা কার্টন।'
      }
    ],
    businessTipBn: 'কার্টনে বারকোড যেন স্ক্যানারে সহজে রিড করা যায় তা নিশ্চিত করুন।'
  },
  {
    day: 9,
    level: 'intermediate',
    cefrLevel: 'B1',
    title: 'Shipping & Freight Logistics',
    titleBn: 'শিপিং ও কার্গো লজিস্টিকস',
    objectiveBn: 'জাহাজীকরণ, কনটেইনার লোডিং ও বিল অব লেডিং (B/L) সংক্রান্ত পরিভাষা।',
    xpReward: 40,
    vocabulary: [
      {
        id: 'es-901',
        targetWord: 'El puerto',
        bengaliPronunciation: 'এল পুয়ের্তো',
        bengaliMeaning: '= বন্দর (Port)',
        category: 'logistics',
        exampleTarget: 'El contenedor llegará al puerto de Barcelona.',
        exampleBengali: 'কনটেইনারটি বার্সেলোনা বন্দরে পৌঁছাবে।',
        audioText: 'El contenedor llegará al puerto de Barcelona',
      },
      {
        id: 'es-902',
        targetWord: 'El embarque',
        bengaliPronunciation: 'এল এমবার্কে',
        bengaliMeaning: '= শিপমেন্ট / জাহাজীকরণ (Shipment)',
        category: 'logistics',
        exampleTarget: 'Fecha estimada de embarque: quince de mayo.',
        exampleBengali: 'আনুমানিক শিপমেন্টের তারিখ: ১৫ মে।',
        audioText: 'Fecha estimada de embarque quince de mayo',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'Futuro Simple (ভবিষ্যৎ কাল)',
        explanationBn: 'ভবিষ্যতে ঘটবে এমন কাজের জন্য Llegará, Enviaremos রূপ ব্যবহৃত হয়।',
        correctExample: 'El barco saldrá mañana.',
        exampleBn: 'জাহাজটি আগামীকাল রওনা হবে।',
      }
    ],
    conversation: [
      {
        speaker: 'Agente',
        speakerRoleBn: 'শিপিং এজেন্ট',
        targetText: '¿Cuándo entregan el contenedor en la terminal?',
        bengaliPronunciation: 'কুয়ানদো এনত্রেগান এল কোনতেনেদোর এন লা তেরমিনাল?',
        bengaliMeaning: 'টার্মিনালে কনটেইনার কখন হস্তান্তর করবেন?'
      },
      {
        speaker: 'Exportador',
        speakerRoleBn: 'রপ্তানিকারক',
        targetText: 'El contenedor entrará al puerto el jueves.',
        bengaliPronunciation: 'এল কোনতেনেদোর এনত্রারা আল পুয়ের্তো এল হুয়েভেস।',
        bengaliMeaning: 'কনটেইনারটি বৃহস্পতিবার বন্দরে প্রবেশ করবে।'
      }
    ],
    practiceSentences: [
      {
        target: 'Los documentos de embarque están listos.',
        pronunciationBn: 'লস দোকুমেনতোস দে এমবার্কে এস্তান লিস্তোস।',
        meaningBn: 'শিপিং ডকুমেন্ট প্রস্তুত রয়েছে।'
      }
    ],
    quiz: [
      {
        id: 'es-q901',
        question: 'What does "El puerto" mean?',
        questionBn: '"El puerto" অর্থ কী?',
        options: ['বন্দর (Port)', 'রাস্তা', 'বিমান', 'কারখানা'],
        correctAnswer: 'বন্দর (Port)',
        explanationBn: 'Puerto অর্থ বন্দর।'
      }
    ],
    businessTipBn: 'বি/এল ড্রাফটে বায়ারের নাম ও ঠিকানা পুঙ্খানুপুঙ্খ মেলানো প্রয়োজন।'
  },
  {
    day: 10,
    level: 'advanced',
    cefrLevel: 'B2',
    title: 'Trade Contracts & FOB Terms',
    titleBn: 'বাণিজ্যিক চুক্তি ও ইনকোটার্মস',
    objectiveBn: 'FOB, CIF, এলসি শর্ত ও ডিসকাউন্ট নিয়ে ব্যবসায়িক দর কষাকষি।',
    xpReward: 45,
    vocabulary: [
      {
        id: 'es-1001',
        targetWord: 'El contrato',
        bengaliPronunciation: 'এল কোনত্রাতো',
        bengaliMeaning: '= চুক্তিপত্র (Contract)',
        category: 'legal',
        exampleTarget: 'Firmaremos el contrato la próxima semana.',
        exampleBengali: 'আমরা আগামী সপ্তাহে চুক্তি সই করব।',
        audioText: 'Firmaremos el contrato la próxima semana',
      },
      {
        id: 'es-1002',
        targetWord: 'El descuento',
        bengaliPronunciation: 'এল দেসকুয়েনতো',
        bengaliMeaning: '= মূল্যছাড় / ডিসকাউন্ট (Discount)',
        category: 'finance',
        exampleTarget: 'Ofrecemos un cinco por ciento de descuento.',
        exampleBengali: 'আমরা পাঁচ শতাংশ মূল্যছাড় প্রস্তাব করছি।',
        audioText: 'Ofrecemos un cinco por ciento de descuento',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'শর্তসূচক বাক্য (Condicional)',
        explanationBn: 'বিনম্র প্রস্তাব দিতে Podríamos (আমরা পারতাম) বা Sería (হতো) ব্যবহৃত হয়।',
        correctExample: 'Podríamos ofrecer un mejor precio.',
        exampleBn: 'আমরা আরও ভালো মূল্য দিতে পারতাম।',
      }
    ],
    conversation: [
      {
        speaker: 'Comprador',
        speakerRoleBn: 'ক্রেতা',
        targetText: 'Si duplicamos el pedido, ¿nos darían un descuento?',
        bengaliPronunciation: 'সি দুপ্লিকামোস এল পেদিদো, নস দারিয়ান উন দেসকুয়েনতো?',
        bengaliMeaning: 'অর্ডারের পরিমাণ দ্বিগুণ করলে কি আমাদের ডিসকাউন্ট দেবেন?'
      },
      {
        speaker: 'Vendedor',
        speakerRoleBn: 'বিক্রেতা',
        targetText: 'Con mucho gusto, un siete por ciento adicional.',
        bengaliPronunciation: 'কোন মুচো গুস্তো, উন সিয়েতে পোর সিয়েন্তো আদিসিওনাল।',
        bengaliMeaning: 'আনন্দের সাথে, অতিরিক্ত ৭ শতাংশ ছাড় দেওয়া হবে।'
      }
    ],
    practiceSentences: [
      {
        target: 'Aceptamos las condiciones comerciales.',
        pronunciationBn: 'আসেপতামোস লাস কোনদিসিওনেস কোমেরসিয়ালেস।',
        meaningBn: 'আমরা বাণিজ্যিক শর্তাবলি গ্রহণ করছি।'
      }
    ],
    quiz: [
      {
        id: 'es-q1001',
        question: 'What is "El descuento"?',
        questionBn: '"El descuento" অর্থ কী?',
        options: ['মূল্যছাড় (Discount)', 'চুক্তি', 'পেমেন্ট', 'জরিমানা'],
        correctAnswer: 'মূল্যছাড় (Discount)',
        explanationBn: 'Descuento অর্থ মূল্যছাড়।'
      }
    ],
    businessTipBn: 'ডিসকাউন্টের ক্ষেত্রে অর্ডারের ভলিউম ও পেমেন্টের তারিখ পরিষ্কার রাখুন।'
  },
  {
    day: 11,
    level: 'advanced',
    cefrLevel: 'B2',
    title: 'Dispute Handling & Problem Solving',
    titleBn: 'সমস্যা সমাধান ও জরুরি আলোচনা',
    objectiveBn: 'শিপমেন্টে বিলম্ব বা ত্রুটি হলে সমাধান ও বিনম্র কূটনৈতিক যোগাযোগ।',
    xpReward: 45,
    vocabulary: [
      {
        id: 'es-1101',
        targetWord: 'El retraso',
        bengaliPronunciation: 'এল রেত্রাসো',
        bengaliMeaning: '= বিলম্ব বা দেরি (Delay)',
        category: 'management',
        exampleTarget: 'Lamentamos el retraso por fuerza mayor.',
        exampleBengali: 'অনিবার্য কারণে বিলম্ব হওয়ায় আমরা দুঃখিত।',
        audioText: 'Lamentamos el retraso por fuerza mayor',
      },
      {
        id: 'es-1102',
        targetWord: 'La solución',
        bengaliPronunciation: 'লা সোলুসিওন',
        bengaliMeaning: '= সমাধান (Solution)',
        category: 'management',
        exampleTarget: 'Proponemos una solución inmediata.',
        exampleBengali: 'আমরা তাৎক্ষণিক সমাধানের প্রস্তাব করছি।',
        audioText: 'Proponemos una solución inmediata',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'Subjuntivo de Cortesía (বিনম্র আকুতি)',
        explanationBn: 'দুঃখ প্রকাশ ও অনুরোধে "Esperamos que entienda" জাতীয় গঠন ব্যবহৃত হয়।',
        correctExample: 'Esperamos que puedan comprender la situación.',
        exampleBn: 'আশা করি পরিস্থিতিটি বুঝতে পারবেন।',
      }
    ],
    conversation: [
      {
        speaker: 'Cliente',
        speakerRoleBn: 'ক্লায়েন্ট',
        targetText: 'El barco tiene tres días de retraso.',
        bengaliPronunciation: 'এল বার্কো তিয়েনে ত্রেস দিয়াস দে রেত্রাসো।',
        bengaliMeaning: 'জাহাজটিতে তিন দিন বিলম্ব হয়েছে।'
      },
      {
        speaker: 'Logística',
        speakerRoleBn: 'লজিস্টিকস',
        targetText: 'Asumimos los gastos del flete adicional.',
        bengaliPronunciation: 'আসুমিমোস লস গাস্তোস দেল ফ্লেতে আদিসিওনাল।',
        bengaliMeaning: 'আমরা অতিরিক্ত ফ্রেইটের খরচ বহন করব।'
      }
    ],
    practiceSentences: [
      {
        target: 'Solucionaremos el problema hoy mismo.',
        pronunciationBn: 'সোলুসিওনারেমোস এল প্রবলেমা ওই মিসমো।',
        meaningBn: 'আমরা আজই সমস্যার সমাধান করব।'
      }
    ],
    quiz: [
      {
        id: 'es-q1101',
        question: 'What does "El retraso" mean?',
        questionBn: '"El retraso" অর্থ কী?',
        options: ['বিলম্ব / দেরি', 'আগমন', 'মুনাফা', 'ডেলিভারি'],
        correctAnswer: 'বিলম্ব / দেরি',
        explanationBn: 'Retraso অর্থ বিলম্ব বা দেরি।'
      }
    ],
    businessTipBn: 'সমস্যা দ্রুত স্বীকার করে বাস্তবসম্মত ক্ষতিপূরণ বা বিকল্প উপস্থাপন করুন।'
  },
  {
    day: 12,
    level: 'advanced',
    cefrLevel: 'C1',
    title: 'International Business Presentation',
    titleBn: 'আন্তর্জাতিক ব্যবসায়িক উপস্থাপন ও লিডারশিপ',
    objectiveBn: 'স্প্যানিশ বায়ারদের সামনে কোম্পানির সক্ষমতা ও দীর্ঘমেয়াদী পার্টনারশিপ তুলে ধরা।',
    xpReward: 50,
    vocabulary: [
      {
        id: 'es-1201',
        targetWord: 'La capacidad',
        bengaliPronunciation: 'লা কাপাসিদাদ',
        bengaliMeaning: '= উৎপাদন সক্ষমতা (Capacity)',
        category: 'corporate',
        exampleTarget: 'Nuestra capacidad mensual es de un millón de prendas.',
        exampleBengali: 'আমাদের মাসিক সক্ষমতা দশ লাখ পোশাক।',
        audioText: 'Nuestra capacidad mensual es de un millón de prendas',
      },
      {
        id: 'es-1202',
        targetWord: 'La sostenibilidad',
        bengaliPronunciation: 'লা সোস্তেনিবেলিদাদ',
        bengaliMeaning: '= টেকসই উন্নয়ন (Sustainability)',
        category: 'corporate',
        exampleTarget: 'Compromiso firme con la sostenibilidad ambiental.',
        exampleBengali: 'পরিবেশবান্ধব টেকসই উন্নয়নে আমাদের দৃঢ় অঙ্গীকার।',
        audioText: 'Compromiso firme con la sostenibilidad ambiental',
      }
    ],
    grammarNotes: [
      {
        ruleTitleBn: 'উচ্চমানের কর্পোরেট ভাষা ও অলঙ্কার',
        explanationBn: 'উপস্থাপনায় Es un honor (সম্মানের বিষয়), Destacamos (আমরা তুলে ধরছি) ব্যবহৃত হয়।',
        correctExample: 'Es un honor presentarles a Depend Sourcing Ltd.',
        exampleBn: 'ডিপেন্ড সোর্সিং লিমিটেডকে উপস্থাপন করা আমাদের জন্য অত্যন্ত সম্মানের।',
      }
    ],
    conversation: [
      {
        speaker: 'Director',
        speakerRoleBn: 'পরিচালক',
        targetText: 'Sean bienvenidos a nuestra sede corporativa.',
        bengaliPronunciation: 'সেয়ান বিয়েনভেনিদ্দোস আ নুয়েস্ত্রা সেদে কোরপোরাতিভা।',
        bengaliMeaning: 'আমাদের করপোরেট হেডকোয়ার্টারে আপনাদের স্বাগতম।'
      },
      {
        speaker: 'Delegación',
        speakerRoleBn: 'প্রতিনিধিদল',
        targetText: 'Gracias por su cálida bienvenida y profesionalismo.',
        bengaliPronunciation: 'গ্রাসিয়াস পোর সু কালিদা বিয়েনভেনিদা ই প্রফেসিওনালিসমো।',
        bengaliMeaning: 'আপনাদের উষ্ণ অভ্যর্থনা ও পেশাদারিত্বের জন্য ধন্যবাদ।'
      }
    ],
    practiceSentences: [
      {
        target: 'Esperamos forjar una alianza duradera.',
        pronunciationBn: 'এসপেরামোস ফোরহার উনা আলিয়ানসা দুরাদেরা।',
        meaningBn: 'আমরা একটি দীর্ঘমেয়াদী অংশীদারিত্ব গড়ে তোলার আশা করছি।'
      }
    ],
    quiz: [
      {
        id: 'es-q1201',
        question: 'What does "La sostenibilidad" mean?',
        questionBn: '"La sostenibilidad" শব্দের অর্থ কী?',
        options: ['টেকসই উন্নয়ন (Sustainability)', 'দাম বৃদ্ধি', 'দ্রুত শিপমেন্ট', 'লাভ্যাংশ'],
        correctAnswer: 'টেকসই উন্নয়ন (Sustainability)',
        explanationBn: 'Sostenibilidad অর্থ টেকসই বা পরিবেশবান্ধব উন্নয়ন।'
      }
    ],
    businessTipBn: 'আন্তর্জাতিক মিটিংয়ে পরিবেশবান্ধব সার্টিফিকেশন (OEKO-TEX, GOTS) তুলে ধরুন।'
  }
];

export const SPANISH_VOCABULARY_LIST = [
  ...SPANISH_LESSONS_DATA.flatMap((d) => d.vocabulary)
];

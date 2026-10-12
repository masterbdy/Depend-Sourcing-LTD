import { LessonContent } from './types';

export const COURSES_DATA: LessonContent[] = [
  // DAY 1 - ZERO LEVEL: ALPHABET & SOUNDS
  {
    id: 'day-1',
    day: 1,
    courseLevel: 'beginner',
    title: 'English Alphabet & Basic Sounds',
    titleBn: 'ইংরেজি বর্ণমালা ও প্রাথমিক উচ্চারণ',
    category: 'Zero Level Basics',
    descriptionBn: 'ইংরেজি ২৬টি বর্ণমালা, স্বরবর্ণ (Vowels - A, E, I, O, U) এবং ব্যঞ্জনবর্ণের সঠিক বাংলা উচ্চারণ।',
    order: 1,
    xpReward: 30,
    keyPhrases: [
      {
        english: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
        bengali: 'এ বি সি ডি ই এফ জি এইচ আই জে কে এল এম এন ও পি কিউ আর এস টি ইউ ভি ডব্লিউ এক্স ওয়াই জেড',
        explanationBn: 'ইংরেজিতে ৫টি Vowel (A, E, I, O, U) রয়েছে যা বাংলা স্বরবর্ণের মতো কাজ করে এবং ২১টি Consonant রয়েছে।',
        example: 'A for Apple, B for Book, C for Computer, D for Desk.',
        exampleBn: 'এ দিয়ে আপেল, বি দিয়ে বই, সি দিয়ে কম্পিউটার, ডি দিয়ে ডেস্ক।'
      },
      {
        english: 'Phonics: /b/ as in Book, /p/ as in Pen, /t/ as in Table, /d/ as in Desk.',
        bengali: 'উচ্চারণ: ব (Book), প (Pen), ট (Table), ড (Desk)।',
        explanationBn: 'ইংরেজি P এবং T উচ্চারণ করার সময় মুখ থেকে সামান্য বাতাস বের করতে হয় (Pen = পেন, Table = টেবিল)।',
        example: 'Please take this pen and write on the paper.',
        exampleBn: 'দয়া করে এই কলমটি নিন এবং কাগজে লিখুন।'
      },
      {
        english: 'Vowel Sounds: Cat (অ্যা), Bed (এ), Pin (ই), Pot (অ), Cup (আ)।',
        bengali: 'ভাওয়েল সাউন্ড: ক্যাট (Cat), বেড (Bed), পিন (Pin), পট (Pot), কাপ (Cup)।',
        explanationBn: 'ভাওয়েল ছাড়া কোনো ইংরেজি শব্দ উচ্চারণ করা প্রায় অসম্ভব। শব্দের মাঝে ভাওয়েল বসলে তার উচ্চারণ সংক্ষিপ্ত ও স্পষ্ট হয়।',
        example: 'The file is on the big desk.',
        exampleBn: 'ফাইলটি বড় টেবিলের উপর আছে।'
      }
    ],
    questions: [
      {
        id: 'q-d1-1',
        type: 'mcq',
        question: 'How many vowels are there in the English alphabet?',
        questionBn: 'ইংরেজি বর্ণমালায় কয়টি Vowel (স্বরবর্ণ) আছে?',
        options: ['5 (A, E, I, O, U)', '7', '3', '21'],
        correctAnswer: '5 (A, E, I, O, U)',
        explanationBn: 'ইংরেজিতে ৫টি Vowel হলো: A, E, I, O, U।'
      },
      {
        id: 'q-d1-2',
        type: 'fill-blank',
        question: 'Complete the word for office desk: D ___ S K',
        questionBn: 'ডেস্ক শব্দের শূন্যস্থানে কোন Vowel বসবে?',
        options: ['E', 'A', 'O', 'U'],
        correctAnswer: 'E',
        explanationBn: 'D-E-S-K = Desk (ডেস্ক বা অফিস টেবিল)।'
      }
    ]
  },

  // DAY 2 - BASIC EVERYDAY WORDS & OBJECTS
  {
    id: 'day-2',
    day: 2,
    courseLevel: 'beginner',
    title: 'Basic Words & Everyday Office Objects',
    titleBn: 'মৌলিক শব্দভাণ্ডার ও অফিসের জিনিসপত্র',
    category: 'Zero Level Basics',
    descriptionBn: 'প্রতিদিনের অফিস ও কর্মক্ষেত্রের সাধারণ জিনিসপত্র, ব্যক্তি ও উপকরণের নাম ইংরেজি ও বাংলায়।',
    order: 2,
    xpReward: 30,
    keyPhrases: [
      {
        english: 'Office, Desk, Chair, Computer, Laptop, File, Document, Pen, Paper, Phone.',
        bengali: 'অফিস, টেবিল, চেয়ার, কম্পিউটার, ল্যাপটপ, ফাইল, দলিল/কাগজপত্র, কলম, কাগজ, ফোন।',
        explanationBn: 'অফিসে সারাদিন চোখের সামনে থাকা মূল উপকরণগুলোর সঠিক ইংরেজি নাম জানা প্রথম ধাপ।',
        example: 'My laptop and notebook are on the office desk.',
        exampleBn: 'আমার ল্যাপটপ এবং খাতাটি অফিসের টেবিলের উপর আছে।'
      },
      {
        english: 'Colleague, Manager, Boss, Staff, Customer, Supplier, Visitor.',
        bengali: 'সহকর্মী, ম্যানেজার, প্রধান কর্মকর্তা, স্টাফ, গ্রাহক/কাস্টমার, সাপ্লায়ার, দর্শনার্থী।',
        explanationBn: 'অফিসের বিভিন্ন পদমর্যাদা ও যোগাযোগকারীদের পরিচয় দিতে এই শব্দগুলো ব্যবহৃত হয়।',
        example: 'Mr. Shariful is our Managing Director, and Imran is my colleague.',
        exampleBn: 'জনাব শরিফুল আমাদের ম্যানেজিং ডিরেক্টর এবং ইমরান আমার সহকর্মী।'
      }
    ],
    questions: [
      {
        id: 'q-d2-1',
        type: 'mcq',
        question: 'What is the English word for "সহকর্মী"?',
        questionBn: '"সহকর্মী" শব্দের ইংরেজি কোনটি?',
        options: ['Colleague', 'Customer', 'Competitor', 'Calendar'],
        correctAnswer: 'Colleague',
        explanationBn: 'একসাথে কাজ করা ব্যক্তিকে Colleague (সহকর্মী) বলা হয়।'
      },
      {
        id: 'q-d2-2',
        type: 'translation',
        question: 'Translate: "ফাইলটি টেবিলের উপর রাখুন।"',
        questionBn: '"ফাইলটি টেবিলের উপর রাখুন"-এর সঠিক ইংরেজি কোনটি?',
        options: ['Keep the file on the table.', 'The file is gone.', 'Take the pen away.', 'Read the file now.'],
        correctAnswer: 'Keep the file on the table.',
        explanationBn: 'Keep the file on the table = ফাইলটি টেবিলের উপর রাখুন।'
      }
    ]
  },

  // DAY 3 - GREETINGS & INTRODUCTIONS
  {
    id: 'day-3',
    day: 3,
    courseLevel: 'beginner',
    title: 'Daily Greetings & Introduction',
    titleBn: 'দৈনন্দিন অভিবাদন ও নিজের পরিচয়',
    category: 'Daily Basics',
    descriptionBn: 'অফিসে বা দৈনন্দিন জীবনে সুন্দরভাবে শুভেচ্ছা বিনিময় ও নিজের পরিচয় দেওয়ার মার্জিত নিয়ম।',
    order: 3,
    xpReward: 35,
    keyPhrases: [
      {
        english: 'Good morning, everyone! Hope you all are having a productive day.',
        bengali: 'সবাইকে শুভ সকাল! আশা করি আপনাদের দিনটি ফলপ্রসূ কাটছে।',
        explanationBn: 'অফিসে সহকর্মীদের সাথে দিনের শুরুতে অভিবাদন জানাতে এটি খুবই প্রচলিত ও মার্জিত বাক্য।',
        example: 'Good morning, Mr. Shariful! Ready for today\'s shipment update?',
        exampleBn: 'শুভ সকাল, জনাব শরিফুল! আজকের শিপমেন্ট আপডেটের জন্য প্রস্তুত?'
      },
      {
        english: 'My name is [Name], and I work as an Executive at Depend Sourcing.',
        bengali: 'আমার নাম [নাম], এবং আমি ডিপেন্ড সোর্সিং-এ এক্সিকিউটিভ হিসেবে কাজ করি।',
        explanationBn: 'নিজের নাম ও পদবি বলতে "I work as a/an [পদবি] at [কোম্পানি]" স্ট্রাকচার ব্যবহার করা হয়।',
        example: 'My name is Imran, and I work as an Accounts Officer at Depend Sourcing.',
        exampleBn: 'আমার নাম ইমরান, এবং আমি ডিপেন্ড সোর্সিং-এ অ্যাকাউন্টস অফিসার হিসেবে কাজ করি।'
      },
      {
        english: 'It is a pleasure to meet you.',
        bengali: 'আপনার সাথে পরিচিত হয়ে আনন্দিত হলাম।',
        explanationBn: 'প্রথম কারও সাথে পরিচিত হওয়ার পর "Nice to meet you"-এর চেয়েও প্রফেশনাল ও ভদ্র প্রকাশ।',
        example: 'Welcome to our Dhaka office. It is a pleasure to meet you, sir.',
        exampleBn: 'আমাদের ঢাকা অফিসে স্বাগতম। আপনার সাথে সাক্ষাৎ হয়ে অনেক ভালো লাগলো, স্যার।'
      }
    ],
    questions: [
      {
        id: 'q-d3-1',
        type: 'mcq',
        question: 'Which is the most professional response when someone says "Pleased to meet you"?',
        questionBn: 'কেউ "Pleased to meet you" বললে সবচেয়ে মার্জিত উত্তর কোনটি?',
        options: ['Pleased to meet you too.', 'No problem.', 'I am fine.', 'Who are you?'],
        correctAnswer: 'Pleased to meet you too.',
        explanationBn: '"Pleased to meet you" এর মার্জিত উত্তর হলো "Pleased to meet you too"।'
      },
      {
        id: 'q-d3-2',
        type: 'fill-blank',
        question: 'I work ____ an Accounts Officer in our Dhaka office.',
        questionBn: 'পদবির পূর্বে কোন preposition-টি বসবে?',
        options: ['as', 'for', 'to', 'at'],
        correctAnswer: 'as',
        explanationBn: 'কোনো নির্দিষ্ট পদে কাজ করা বোঝাতে "work as [পদবি]" ব্যবহৃত হয়।'
      }
    ]
  },

  // DAY 4 - NUMBERS, QUANTITIES & MONEY
  {
    id: 'day-4',
    day: 4,
    courseLevel: 'beginner',
    title: 'Numbers, Quantities & Financial Figures',
    titleBn: 'সংখ্যা, গণনা ও আর্থিক হিসাব',
    category: 'Workplace Essentials',
    descriptionBn: 'পণ্য সংখ্যা, পিস (Pieces), ডজন (Dozen), হাজার, লাখ এবং টাকার হিসাব ইংরেজিতে বলা।',
    order: 4,
    xpReward: 35,
    keyPhrases: [
      {
        english: 'One, Ten, Hundred, Thousand, Lakh, Million.',
        bengali: 'এক, দশ, একশত, এক হাজার, এক লাখ, দশ লাখ (এক মিলিয়ন)।',
        explanationBn: 'আন্তর্জাতিক বাণিজ্যে লাখের চেয়ে Thousand (হাজার) এবং Million (১০ লাখ) বেশি ব্যবহৃত হয়।',
        example: 'We received an order of 5,000 pieces of polo shirts.',
        exampleBn: 'আমরা ৫,০০০ পিস পোলো শার্টের একটি অর্ডার পেয়েছি।'
      },
      {
        english: 'The unit price is $4.50, and the total invoice amount is 45,000 Taka.',
        bengali: 'পিস প্রতি মূল্য ৪.৫০ ডলার, এবং মোট ইনভয়েসের পরিমাণ ৪৫,০০০ টাকা।',
        explanationBn: 'Unit Price = একক মূল্য / পিস প্রতি দর; Total Amount = মোট টাকার পরিমাণ।',
        example: 'Please verify the quantity and total bill before signing.',
        exampleBn: 'স্বাক্ষর করার পূর্বে পরিমাণ এবং মোট বিল যাচাই করে নিন।'
      }
    ],
    questions: [
      {
        id: 'q-d4-1',
        type: 'mcq',
        question: 'How do you say "৫,০০০ পিস" in English?',
        questionBn: '"৫,০০০ পিস" ইংরেজিতে কীভাবে বলবেন?',
        options: ['Five thousand pieces', 'Fifty pieces', 'Five hundred pieces', 'Five million pieces'],
        correctAnswer: 'Five thousand pieces',
        explanationBn: '৫,০০০ = Five thousand, পিস = pieces।'
      },
      {
        id: 'q-d4-2',
        type: 'mcq',
        question: 'What does "Unit Price" mean?',
        questionBn: '"Unit Price" বলতে কী বোঝায়?',
        options: ['Price per single piece/item', 'Total factory cost', 'Shipping charge', 'Discount rate'],
        correctAnswer: 'Price per single piece/item',
        explanationBn: 'Unit Price অর্থ প্রতিটি একক পণ্যের মূল্য বা পিস প্রতি দর।'
      }
    ]
  },

  // DAY 5 - DAYS, DATES, TIME & CALENDAR
  {
    id: 'day-5',
    day: 5,
    courseLevel: 'beginner',
    title: 'Days, Dates, Time & Office Schedule',
    titleBn: 'দিন, তারিখ, সময় ও অফিসের সময়সূচি',
    category: 'Daily Basics',
    descriptionBn: 'সাত দিনের নাম, মাসের নাম, মিটিংয়ের সময় (AM/PM) এবং ডেডলাইন নির্ধারণের ইংরেজি।',
    order: 5,
    xpReward: 35,
    keyPhrases: [
      {
        english: 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.',
        bengali: 'রবিবার, সোমবার, মঙ্গলবার, বুধবার, বৃহস্পতিবার, শুক্রবার, শনিবার।',
        explanationBn: 'বাংলাদেশে কাজের সপ্তাহ সাধারণত রবিবার (Sunday) থেকে শুরু হয় এবং বৃহস্পতিবার (Thursday) শেষ হয়।',
        example: 'Our management meeting is scheduled for next Monday at 10:30 AM.',
        exampleBn: 'আমাদের ম্যানেজমেন্ট মিটিং আগামী সোমবার সকাল ১০:৩০ টায় নির্ধারিত হয়েছে।'
      },
      {
        english: 'Today, Tomorrow, Yesterday, This morning, Next week, Deadline.',
        bengali: 'আজ, আগামীকাল, গতকাল, আজ সকালে, আগামী সপ্তাহে, কাজের শেষ সময় (ডেডলাইন)।',
        explanationBn: 'কাজের সময় বোঝাতে: "by 5 PM today" (আজ বিকেল ৫টার মধ্যে), "before next Friday" (আগামী শুক্রবারের পূর্বে)।',
        example: 'Please submit the monthly billing report by tomorrow afternoon.',
        exampleBn: 'অনুগ্রহ করে মাসিক বিলিং রিপোর্টটি আগামীকাল দুপুরের মধ্যে জমা দিন।'
      }
    ],
    questions: [
      {
        id: 'q-d5-1',
        type: 'fill-blank',
        question: 'Our factory shipment will depart ____ Tuesday morning.',
        questionBn: 'বারের নামের পূর্বে কোন preposition বসে?',
        options: ['on', 'at', 'in', 'by'],
        correctAnswer: 'on',
        explanationBn: 'সপ্তাহের যেকোনো দিনের পূর্বে সর্বদা "on" বসে (e.g., on Sunday, on Tuesday)।'
      },
      {
        id: 'q-d5-2',
        type: 'mcq',
        question: 'What does "Deadline" mean?',
        questionBn: '"Deadline" শব্দের অর্থ কী?',
        options: ['Final time by which a task must be finished', 'Lunch break time', 'Beginning of the day', 'Holiday list'],
        correctAnswer: 'Final time by which a task must be finished',
        explanationBn: 'Deadline অর্থ কোনো কাজ সম্পন্ন করার সর্বশেষ নির্দিষ্ট সময়।'
      }
    ]
  },

  // DAY 6 - COMMON DAILY SENTENCES
  {
    id: 'day-6',
    day: 6,
    courseLevel: 'beginner',
    title: 'Common Daily Workplace Sentences',
    titleBn: 'দৈনন্দিন প্রয়োজনীয় অফিসিয়াল বাক্য',
    category: 'Daily Basics',
    descriptionBn: 'অফিসে সবচেয়ে বেশি ব্যবহৃত ২০টি ছোট ছোট বাক্য যা জানা থাকলে জড়তা কেটে যায়।',
    order: 6,
    xpReward: 35,
    keyPhrases: [
      {
        english: 'How can I help you today?',
        bengali: 'আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
        explanationBn: 'অফিসে ক্লায়েন্ট, ভিজিটর বা সহকর্মীকে আপ্যায়ন করার সেরা মার্জিত বাক্য।',
        example: 'Good morning! How can I help you today, sir?',
        exampleBn: 'শুভ সকাল! আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি, স্যার?'
      },
      {
        english: 'Please give me a few moments, I am checking the file.',
        bengali: 'দয়া করে আমাকে কিছুক্ষণ সময় দিন, আমি ফাইলটি দেখছি।',
        explanationBn: 'তাড়াহুড়ো না করে ভদ্রভাবে সময় চাওয়ার জন্য এটি ব্যবহার করুন।',
        example: 'Please give me a few moments; I will download the attachment right away.',
        exampleBn: 'আমাকে কিছুক্ষণ সময় দিন; আমি এখনই এটাচমেন্টটি ডাউনলোড করছি।'
      },
      {
        english: 'Thank you for your patience and cooperation.',
        bengali: 'আপনার ধৈর্য এবং সহযোগিতার জন্য ধন্যবাদ।',
        explanationBn: 'কথোপকথন শেষে কৃতজ্ঞতা প্রকাশের আন্তর্জাতিক করপোরেট বাক্য।',
        example: 'We apologize for the brief delay. Thank you for your patience and cooperation.',
        exampleBn: 'সাময়িক দেরির জন্য আমরা দুঃখিত। আপনার ধৈর্য ও সহযোগিতার জন্য ধন্যবাদ।'
      }
    ],
    questions: [
      {
        id: 'q-d6-1',
        type: 'mcq',
        question: 'What is the polite phrase when you need someone to wait 2 minutes?',
        questionBn: 'কাউকে ভদ্রভাবে ২ মিনিট অপেক্ষা করতে বলার সঠিক বাক্য কোনটি?',
        options: ['Please give me a moment.', 'Wait there.', 'Stop talking.', 'Go away for now.'],
        correctAnswer: 'Please give me a moment.',
        explanationBn: '"Please give me a moment" হলো ভদ্রভাবে সময় নেওয়ার সর্বোত্তম উপায়।'
      }
    ]
  },

  // DAY 7 - BASIC SENTENCE FORMATION
  {
    id: 'day-7',
    day: 7,
    courseLevel: 'beginner',
    title: 'Basic Sentence Formation (S + V + O)',
    titleBn: 'সহজ বাক্য গঠনের নিয়ম (কর্তা + ক্রিয়া + কর্ম)',
    category: 'Grammar Foundation',
    descriptionBn: 'Subject (কর্তা), Verb (কাজ) এবং Object (কর্ম) দিয়ে কীভাবে নিজে বাক্য তৈরি করতে হয়।',
    order: 7,
    xpReward: 40,
    keyPhrases: [
      {
        english: 'I (Subject) + check (Verb) + the invoice (Object).',
        bengali: 'আমি (Subject) + ইনভয়েসটি (Object) + যাচাই করি (Verb)।',
        explanationBn: 'বাংলায় ক্রিয়া শেষে বসে (যেমন: আমি ভাত খাই), কিন্তু ইংরেজিতে ক্রিয়া মাঝে বসে (I eat rice / I check the invoice)।',
        example: 'We send the sample report to the buyer every Thursday.',
        exampleBn: 'আমরা প্রতি বৃহস্পতিবার বায়ারকে স্যাম্পল রিপোর্ট পাঠাই।'
      },
      {
        english: 'He / She + sends (Verb + s/es) + the document.',
        bengali: 'সে ডকুমেন্টটি পাঠায়।',
        explanationBn: 'Subject যদি Third Person Singular (He, She, It, Mr. Shariful, Imran) হয়, তবে Present Indefinite টেন্সে Verb-এর সাথে s বা es যুক্ত হয়।',
        example: 'Mr. Shariful signs all official purchase vouchers.',
        exampleBn: 'জনাব শরিফুল সকল অফিশিয়াল ক্রয় ভাউচারে স্বাক্ষর করেন।'
      }
    ],
    questions: [
      {
        id: 'q-d7-1',
        type: 'fill-blank',
        question: 'Imran ____ the fabric invoice daily.',
        questionBn: 'Imran (Third person singular)-এর পর সঠিক Verb রূপ কোনটি?',
        options: ['checks', 'check', 'checking', 'are checking'],
        correctAnswer: 'checks',
        explanationBn: 'Third person singular subject-এর পর Verb-এ s/es বসে: Imran checks।'
      }
    ]
  },

  // DAY 8 - ASKING FOR HELP & CLARIFICATION
  {
    id: 'day-8',
    day: 8,
    courseLevel: 'elementary',
    title: 'Asking for Help & Clarification',
    titleBn: 'সাহায্য চাওয়া ও কোনো বিষয় বুঝে নেওয়া',
    category: 'Workplace Communication',
    descriptionBn: 'অফিসে না বুঝলে ভয় না পেয়ে পেশাদারভাবে পুনরাবৃত্তি চাওয়া বা সহযোগিতা চাওয়ার কৌশল।',
    order: 8,
    xpReward: 40,
    keyPhrases: [
      {
        english: 'Could you please clarify that point once again?',
        bengali: 'দয়া করে এই বিষয়টি কি আরেকবার স্পষ্ট করে বলবেন?',
        explanationBn: '"I don\'t understand" সরাসরি না বলে "Could you clarify..." বললে অনেক মার্জিত শোনায়।',
        example: 'Could you please clarify the payment terms mentioned in the supplier contract?',
        exampleBn: 'সাপ্লায়ার চুক্তিতে উল্লিখিত পেমেন্টের শর্তগুলো কি আরেকবার স্পষ্ট করে ব্যাখ্যা করবেন?'
      },
      {
        english: 'Would you mind sharing the updated Excel sheet with me?',
        bengali: 'আপনি কি অনুগ্রহ করে আপডেট করা এক্সেল শিটটি আমার সাথে শেয়ার করবেন?',
        explanationBn: '"Would you mind + verb-ing" অনুরোধ জানানোর সবচেয়ে বিনম্র রূপ।',
        example: 'Would you mind sharing the factory packing list via email?',
        exampleBn: 'আপনি কি অনুগ্রহ করে ফ্যাক্টরির প্যাকিং লিস্টটি ইমেইলে পাঠিয়ে দেবেন?'
      }
    ],
    questions: [
      {
        id: 'q-d8-1',
        type: 'mcq',
        question: 'Which is the most professional way to say "আমি বুঝতে পারিনি, আবার বলুন"?',
        questionBn: '"আমি বুঝতে পারিনি, আবার বলুন"-এর প্রফেশনাল ইংরেজি কোনটি?',
        options: [
          'Could you please repeat that? I want to make sure I noted it correctly.',
          'What did you say?',
          'Speak louder, I cannot hear.',
          'Say it again.'
        ],
        correctAnswer: 'Could you please repeat that? I want to make sure I noted it correctly.',
        explanationBn: 'বিনয়ের সাথে স্পষ্টতা নিশ্চিত করতে এটি সবচেয়ে উপযুক্ত বাক্য।'
      }
    ]
  },

  // DAY 9 - DAILY TASKS & DEADLINES
  {
    id: 'day-9',
    day: 9,
    courseLevel: 'elementary',
    title: 'Talking About Daily Tasks & Deadlines',
    titleBn: 'প্রতিদিনের কাজ ও ডেডলাইন সম্পর্কে কথা বলা',
    category: 'Workplace Operations',
    descriptionBn: 'ম্যানেজার বা সহকর্মীকে কাজের অগ্রগতি, অগ্রাধিকার ও ডেডলাইন আপডেট দেওয়ার ইংরেজি।',
    order: 9,
    xpReward: 40,
    keyPhrases: [
      {
        english: 'I am currently working on the monthly expenditure statement and will finish by 3 PM.',
        bengali: 'আমি বর্তমানে মাসিক খরচের খতিয়ানের কাজ করছি এবং দুপুর ৩টার মধ্যে শেষ করব।',
        explanationBn: 'কাজের অগ্রগতির সাথে সম্ভাব্য সময়সীমা উল্লেখ করলে কাজের স্বচ্ছতা প্রকাশ পায়।',
        example: 'I am currently reviewing the supplier invoice and will update you shortly.',
        exampleBn: 'আমি বর্তমানে সাপ্লায়ারের ইনভয়েসটি নিরীক্ষা করছি এবং শীঘ্রই আপনাকে আপডেট জানাব।'
      }
    ],
    questions: [
      {
        id: 'q-d9-1',
        type: 'mcq',
        question: 'What does "prioritize" mean in task management?',
        questionBn: '"Prioritize" শব্দের অর্থ কী?',
        options: ['Treat something as more important than other things', 'Cancel the work', 'Postpone indefinitely', 'Hand over to someone else'],
        correctAnswer: 'Treat something as more important than other things',
        explanationBn: 'Prioritize অর্থ কোনো কাজকে গুরুত্বের শীর্ষে রেখে অগ্রাধিকার দেওয়া।'
      }
    ]
  },

  // DAY 10 - PHONE CALLS & MESSAGE HANDLING
  {
    id: 'day-10',
    day: 10,
    courseLevel: 'elementary',
    title: 'Phone Calls & Message Handling',
    titleBn: 'অফিসিয়াল ফোন কল ও বার্তা আদান-প্রদান',
    category: 'Telephone Skills',
    descriptionBn: 'পেশাদারভাবে ফোন রিসিভ করা, কলারের পরিচয় নেওয়া এবং মেসেজ নোট করার আন্তর্জাতিক নিয়ম।',
    order: 10,
    xpReward: 40,
    keyPhrases: [
      {
        english: 'Hello, Depend Sourcing. Imran speaking. How may I direct your call?',
        bengali: 'হ্যালো, ডিপেন্ড সোর্সিং। ইমরান বলছি। আপনাকে কার সাথে সংযুক্ত করে দেব?',
        explanationBn: 'অফিস ফোন ধরার প্রমিত নিয়ম: প্রতিষ্ঠানের নাম + নিজের নাম + সহযোগিতার প্রস্তাব।',
        example: 'Good afternoon, Depend Sourcing office. May I know who is calling, please?',
        exampleBn: 'শুভ অপরাহ্ন, ডিপেন্ড সোর্সিং অফিস। অনুগ্রহ করে জানতে পারি কে বলছেন?'
      },
      {
        english: 'Mr. Shariful is currently in a conference. May I take a message for him?',
        bengali: 'জনাব শরিফুল বর্তমানে একটি মিটিংয়ে আছেন। আমি কি তাঁর জন্য কোনো বার্তা লিখে রাখব?',
        explanationBn: 'অফিসের উর্ধ্বতন কর্মকর্তা ব্যস্ত থাকলে কলারকে বিনীতভাবে জানানো ও বার্তা গ্রহণ করা।',
        example: 'He is away from his desk. I will ensure he receives your message as soon as he returns.',
        exampleBn: 'তিনি বর্তমানে সিটে নেই। তিনি ফিরে আসামাত্রই আপনার মেসেজটি পাওয়ার ব্যবস্থা করব।'
      }
    ],
    questions: [
      {
        id: 'q-d10-1',
        type: 'fill-blank',
        question: 'Hello, this is Imran ____ from Depend Sourcing.',
        questionBn: 'ফোনে নিজের পরিচয় দেওয়ার সময় শূন্যস্থানে কোন শব্দটি বসবে?',
        options: ['speaking', 'talking', 'shouting', 'saying'],
        correctAnswer: 'speaking',
        explanationBn: 'ফোনে নিজের পরিচয় দিতে "This is [Name] speaking" হলো সঠিক করপোরেট প্রমিত ভাষা।'
      }
    ]
  },

  // DAY 11 - OFFICE MEETINGS & DISCUSSIONS
  {
    id: 'day-11',
    day: 11,
    courseLevel: 'intermediate',
    title: 'Formal Meeting Participation',
    titleBn: 'অফিস মিটিংয়ে কার্যকর অংশগ্রহণ',
    category: 'Meeting Communication',
    descriptionBn: 'মিটিংয়ে নিজের বক্তব্য পেশ করা, গঠনমূলক দ্বিমত প্রকাশ এবং একমত হওয়ার করপোরেট স্টাইল।',
    order: 11,
    xpReward: 45,
    keyPhrases: [
      {
        english: 'From our department\'s perspective, maintaining consistent quality is our top priority.',
        bengali: 'আমাদের বিভাগের দৃষ্টিকোণ থেকে, গুণগত মান ধারাবাহিকভাবে বজায় রাখাই আমাদের প্রধান অগ্রাধিকার।',
        explanationBn: '"From our perspective" ব্যবহার করলে বক্তব্য অত্যন্ত যুক্তিযুক্ত ও পেশাদার শোনায়।',
        example: 'From the accounts perspective, we need to balance cash flow before approving new advances.',
        exampleBn: 'হিসাব বিভাগের দৃষ্টিকোণ থেকে, নতুন অগ্রিম অনুমোদনের পূর্বে নগদ অর্থপ্রবাহ ভারসাম্যপূর্ণ রাখা প্রয়োজন।'
      },
      {
        english: 'I see your point, however, we should also consider the shipment delivery timeline.',
        bengali: 'আমি আপনার যুক্তি বুঝতে পারছি, তবে শিপমেন্ট ডেলিভারির সময়সীমাটিও আমাদের বিবেচনায় রাখা উচিত।',
        explanationBn: 'কারও বক্তব্যের সাথে বিনয়ের সাথে ভিন্নমত প্রকাশ করতে "I see your point, however..." সবচেয়ে সমাদৃত।',
        example: 'I understand the cost concern, but compromising on fabric GSM may impact buyer trust.',
        exampleBn: 'আমি ব্যয়ের বিষয়টি বুঝতে পারছি, কিন্তু কাপড়ের জিএসএমে আপস করলে বায়ারের বিশ্বাসে প্রভাব পড়তে পারে।'
      }
    ],
    questions: [
      {
        id: 'q-d11-1',
        type: 'mcq',
        question: 'What is the most polite corporate phrase to disagree during a meeting?',
        questionBn: 'মিটিংয়ে মার্জিতভাবে দ্বিমত প্রকাশের সর্বোত্তম বাক্য কোনটি?',
        options: [
          'I see your point, however, we should also examine the alternative.',
          'You are completely wrong.',
          'I disagree and I will not listen.',
          'That makes no sense at all.'
        ],
        correctAnswer: 'I see your point, however, we should also examine the alternative.',
        explanationBn: 'করপোরেট মিটিংয়ে সরাসরি ভুল না বলে প্রথমে অপর পক্ষের যুক্তি মেনে নিয়ে তারপর ভিন্নমত তুলে ধরতে হয়।'
      }
    ]
  },

  // DAY 12 - BUSINESS EMAIL WRITING
  {
    id: 'day-12',
    day: 12,
    courseLevel: 'intermediate',
    title: 'Writing Business Emails & Follow-ups',
    titleBn: 'পেশাদার ইমেইল ও ফলো-আপ ড্রাফটিং',
    category: 'Written Communication',
    descriptionBn: 'আন্তর্জাতিক বায়ার, সাপ্লায়ার ও ম্যানেজমেন্টের কাছে সুস্পষ্ট, মার্জিত ও নির্ভুল ইমেইল পাঠানো।',
    order: 12,
    xpReward: 45,
    keyPhrases: [
      {
        english: 'Please find attached the signed bill voucher and bank transaction receipt for your records.',
        bengali: 'আপনার অবগতি ও নথির জন্য স্বাক্ষরিত বিল ভাউচার এবং ব্যাংক লেনদেনের রসিদটি সংযুক্ত করা হলো।',
        explanationBn: 'ইমেইলে কোনো ফাইল সংযুক্ত করলে "Please find attached..." লেখা বাধ্যতামূলক শিষ্টাচার।',
        example: 'Please find attached the updated staff movement register for March 2026.',
        exampleBn: 'মার্চ ২০২৬-এর আপডেট করা স্টাফ মুভমেন্ট রেজিস্টারটি সংযুক্ত করা হলো।'
      },
      {
        english: 'We would appreciate your prompt confirmation regarding this matter.',
        bengali: 'এই বিষয়ে আপনার দ্রুত নিশ্চিতকরণ পেলে আমরা অত্যন্ত বাধিত হবো।',
        explanationBn: 'জরুরি উত্তরের তাগিদ ভদ্রভাবে দিতে "prompt confirmation" বা "early response" শব্দগুচ্ছ ব্যবহার করুন।',
        example: 'Kindly review the proforma invoice and share your prompt confirmation.',
        exampleBn: 'অনুগ্রহ করে প্রফর্মা ইনভয়েসটি পর্যালোচনা করে দ্রুত আপনার নিশ্চিতকরণ জানান।'
      }
    ],
    questions: [
      {
        id: 'q-d12-1',
        type: 'mcq',
        question: 'When attaching a PDF to an email, which phrase should you use?',
        questionBn: 'ইমেইলে পিডিএফ ফাইল সংযুক্ত করলে কোন বাক্যটি লিখবেন?',
        options: [
          'Please find attached the document for your reference.',
          'Look at the file down here.',
          'I took a file and threw it in.',
          'See attachment now.'
        ],
        correctAnswer: 'Please find attached the document for your reference.',
        explanationBn: '"Please find attached..." হলো ইমেইলে ফাইল সংযুক্তির আন্তর্জাতিক করপোরেট প্রমিত রূপ।'
      }
    ]
  },

  // DAY 13 - ACCOUNTS, INVOICES & PAYMENTS
  {
    id: 'day-13',
    day: 13,
    courseLevel: 'intermediate',
    title: 'Accounts, Invoices & Bill Discussions',
    titleBn: 'অ্যাকাউন্টস, ইনভয়েস ও বিলিং সংক্রান্ত ইংরেজি',
    category: 'Finance & Office Accounts',
    descriptionBn: 'ভাউচার, ক্যাশ পেমেন্ট, অগ্রিম সমন্বয়, বকেয়া আদায় ও অডিট সংক্রান্ত প্রফেশনাল টার্মিনোলজি।',
    order: 13,
    xpReward: 50,
    keyPhrases: [
      {
        english: 'The bill has been verified against the physical delivery challan and approved for disbursement.',
        bengali: 'বিলটি পণ্য ডেলিভারি চালানের সাথে মিলিয়ে যাচাই করা হয়েছে এবং অর্থ পরিশোধের জন্য অনুমোদন দেওয়া হয়েছে।',
        explanationBn: '"Disbursement" অর্থ তহবিল বা ব্যাংক থেকে অর্থ পরিশোধ করা; "Challan" হলো পণ্য প্রাপ্তির প্রমাণপত্র।',
        example: 'Accounts has scheduled the cheque disbursement for Thursday morning.',
        exampleBn: 'হিসাব বিভাগ বৃহস্পতিবার সকালে চেক পরিশোধের সময়সূচি নির্ধারণ করেছে।'
      },
      {
        english: 'An advance adjustment of 15,000 Taka will be reflected in this month\'s payroll voucher.',
        bengali: 'এই মাসের বেতন ভাউচারে ১৫,০০০ টাকার অগ্রিম সমন্বয় দেখানো হবে।',
        explanationBn: 'বেতন বা খরচের সাথে পূর্বে নেওয়া অগ্রিম কর্তন করাকে "Advance Adjustment" বলে।',
        example: 'Please submit original transport receipts to complete the travel advance adjustment.',
        exampleBn: 'ভ্রমণ অগ্রিম সমন্বয় সম্পন্ন করতে অনুগ্রহ করে মূল পরিবহন রসিদ জমা দিন।'
      }
    ],
    questions: [
      {
        id: 'q-d13-1',
        type: 'mcq',
        question: 'What does "Disbursement" mean in office accounts?',
        questionBn: 'অফিস অ্যাকাউন্টসে "Disbursement" শব্দের অর্থ কী?',
        options: ['Payment of funds / cash release', 'Taking a loan', 'Staff penalty', 'Annual tax return'],
        correctAnswer: 'Payment of funds / cash release',
        explanationBn: 'Disbursement অর্থ অনুমোদন সাপেক্ষে অর্থ তহবিল থেকে টাকা বা চেক প্রদান করা।'
      }
    ]
  },

  // DAY 14 - NEGOTIATION & SUPPLIER COMMUNICATION
  {
    id: 'day-14',
    day: 14,
    courseLevel: 'advanced',
    title: 'Negotiation & Supplier Deal Finalization',
    titleBn: 'দরকষাকষি, সাপ্লায়ার চুক্তি ও ডিল ফাইনাল করা',
    category: 'Strategic Business English',
    descriptionBn: 'চীনা বা আন্তর্জাতিক সাপ্লায়ারদের সাথে মূল্য কমানো, পেমেন্ট টার্মস নির্ধারণ ও উইন-উইন চুক্তি।',
    order: 14,
    xpReward: 50,
    keyPhrases: [
      {
        english: 'If you can adjust the unit price to $3.80, we are ready to double our initial order quantity.',
        bengali: 'যদি আপনি একক মূল্য ৩.৮০ ডলারে নামিয়ে আনতে পারেন, তবে আমরা আমাদের প্রাথমিক অর্ডারের পরিমাণ দ্বিগুণ করতে প্রস্তুত।',
        explanationBn: 'মূল্য ছাড়ের বিনিময়ে অর্ডারের ভলিউম বৃদ্ধি করে দরকষাকষির সবচেয়ে শক্তিশালী করপোরেট টেকনিক।',
        example: 'We are willing to sign an exclusive annual contract if the factory guarantees the delivery date.',
        exampleBn: 'ফ্যাক্টরি ডেলিভারি তারিখ নিশ্চিত করলে আমরা এক বছরের এক্সক্লুসিভ চুক্তি স্বাক্ষর করতে আগ্রহী।'
      },
      {
        english: 'Let us structure this agreement to ensure a mutually beneficial win-win outcome.',
        bengali: 'আসুন আমরা এই চুক্তিটি এমনভাবে সাজাই যাতে উভয় পক্ষই পারস্পরিকভাবে লাভবান হতে পারে।',
        explanationBn: '"Win-win outcome" হলো দীর্ঘমেয়াদী ব্যবসায়িক অংশীদারিত্বের মূল দর্শন।',
        example: 'By optimizing fabric consumption, we achieve a win-win scenario on margins.',
        exampleBn: 'কাপড়ের অপচয় কমিয়ে আমরা উভয়ের লভ্যাংশের ক্ষেত্রে পারস্পরিক লাভজনক অবস্থায় পৌঁছাই।'
      }
    ],
    questions: [
      {
        id: 'q-d14-1',
        type: 'mcq',
        question: 'What does a "win-win outcome" mean in international trade?',
        questionBn: 'আন্তর্জাতিক বাণিজ্যে "Win-win outcome" বলতে কী বোঝায়?',
        options: [
          'An outcome where both buyer and supplier receive fair benefits',
          'One party wins everything and the other suffers loss',
          'A deal where neither party makes any profit',
          'A competitive dispute in court'
        ],
        correctAnswer: 'An outcome where both buyer and supplier receive fair benefits',
        explanationBn: 'Win-win outcome অর্থ এমন একটি ব্যবসায়িক সমাধান যেখানে ক্রেতা ও বিক্রেতা উভয় পক্ষই লাভবান হয়।'
      }
    ]
  }
];

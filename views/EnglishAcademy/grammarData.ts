import { GrammarTopic } from './types';

export const GRAMMAR_DATA: GrammarTopic[] = [
  {
    id: 'g-tenses',
    title: 'Tenses in Office Communication',
    titleBn: 'অফিস যোগাযোগের ক্ষেত্রে টেন্সের সঠিক ব্যবহার',
    category: 'tenses',
    summaryBn: 'অফিসিয়াল কথাবার্তা এবং ইমেইলে মূলত Present Simple, Present Continuous, Present Perfect এবং Past Simple এর সবচেয়ে বেশি প্রয়োজন হয়।',
    rules: [
      {
        ruleTitleBn: '১. রুটিন কাজ বনাম বর্তমানে চলমান কাজ (Simple vs Continuous)',
        explanationBn: 'প্রতিদিন যা সাধারণত ঘটে তার জন্য Simple Present (I check the bills daily), আর এই মুহূর্তে যা চলছে তার জন্য Present Continuous (I am checking the bill now)।',
        correctExample: 'I verify the attendance records every morning.',
        incorrectExample: 'I am verifying the attendance records every morning.',
        exampleBn: 'আমি প্রতিদিন সকালে হাজিরা রেকর্ড যাচাই করি।'
      },
      {
        ruleTitleBn: '২. কাজ শেষ হয়েছে কিন্তু প্রভাব বিদ্যমান (Present Perfect)',
        explanationBn: 'কোনো কাজ সম্প্রতি শেষ হয়েছে এবং তার প্রমাণ বা ফলাফল এখনই বিদ্যমান থাকলে "have/has + Verb 3" ব্যবহার করুন।',
        correctExample: 'I have already submitted the revised expense voucher.',
        incorrectExample: 'I already submit the revised expense voucher.',
        exampleBn: 'আমি ইতিমধ্যে সংশোধিত ব্যয়ের ভাউচারটি জমা দিয়েছি।'
      },
      {
        ruleTitleBn: '৩. অতীতের নির্দিষ্ট সময় (Past Simple)',
        explanationBn: 'অতীতের নির্দিষ্ট সময় উল্লেখ থাকলে (yesterday, last month, in 2024) সবসময় Past Simple (Verb 2) হবে, কখনো have/has বসবে না।',
        correctExample: 'The MD approved the fund disbursement yesterday.',
        incorrectExample: 'The MD has approved the fund disbursement yesterday.',
        exampleBn: 'ম্যানেজিং ডিরেক্টর মহোদয় গতকাল ফান্ডের টাকা অনুমোদন করেছেন।'
      }
    ],
    quizzes: [
      {
        id: 'q-tense-1',
        type: 'mcq',
        question: 'Which sentence is grammatically correct for a completed task yesterday?',
        questionBn: 'গতকাল সম্পন্ন হওয়া কাজের ক্ষেত্রে নিচের কোনটি শুদ্ধ?',
        options: [
          'We sent the quotation yesterday.',
          'We have sent the quotation yesterday.',
          'We are sending the quotation yesterday.',
          'We will send the quotation yesterday.'
        ],
        correctAnswer: 'We sent the quotation yesterday.',
        explanationBn: 'নির্দিষ্ট অতীত সময়সূচক শব্দ "yesterday" থাকলে Present Perfect নয়, Past Simple ("sent") বসে।'
      },
      {
        id: 'q-tense-2',
        type: 'fill-blank',
        question: 'He ____ (work) on the monthly financial audit right now.',
        questionBn: 'বর্তমানে চলমান কাজের জন্য সঠিক রূপ বসান:',
        options: ['is working', 'worked', 'works', 'has worked'],
        correctAnswer: 'is working',
        explanationBn: '"Right now" থাকায় Present Continuous টেন্স "is working" হবে।'
      },
      {
        id: 'q-tense-3',
        type: 'translation',
        question: 'Translate: "আমি ইতিমধ্যে ইমেইলটি পাঠিয়ে দিয়েছি।"',
        questionBn: '"আমি ইতিমধ্যে ইমেইলটি পাঠিয়ে দিয়েছি" এর সঠিক ইংরেজি কোনটি?',
        options: [
          'I have already sent the email.',
          'I am already sending email.',
          'I already send the email.',
          'I was sent email.'
        ],
        correctAnswer: 'I have already sent the email.',
        explanationBn: '"ইতিমধ্যে সম্পন্ন হওয়া" অর্থে Present Perfect ("have already sent") ব্যবহৃত হয়।'
      }
    ]
  },
  {
    id: 'g-prepositions',
    title: 'Prepositions: At, On, In, For, By',
    titleBn: 'অফিসে সবচেয়ে বেশি ব্যবহৃত প্রিপজিশন',
    category: 'prepositions',
    summaryBn: 'সময়, স্থান ও ডেডলাইনের ক্ষেত্রে সঠিক প্রিপজিশন নির্বাচন অফিসিয়াল ইংরেজিতে পেশাদারিত্বের ছাপ রাখে।',
    rules: [
      {
        ruleTitleBn: '১. সময়সূচক প্রিপজিশন (At vs On vs In)',
        explanationBn: 'নির্দিষ্ট ঘণ্টার জন্য "At" (at 10:00 AM), দিন ও তারিখের জন্য "On" (on Monday, on 15th October), আর মাস ও বছরের জন্য "In" (in September, in 2026)।',
        correctExample: 'The meeting is scheduled on Sunday at 11:00 AM in the conference room.',
        incorrectExample: 'The meeting is scheduled in Sunday on 11:00 AM at conference room.',
        exampleBn: 'মিটিংটি রবিবারে সকাল ১১:০০ টায় কনফারেন্স রুমে অনুষ্ঠিত হবে।'
      },
      {
        ruleTitleBn: '২. ডেডলাইন নির্দেশ করতে "By"',
        explanationBn: '"By" অর্থ সেই নির্দিষ্ট সময়ের মধ্যে বা তার আগে (Latest by that time)।',
        correctExample: 'Please finish the voucher entry by 5:00 PM today.',
        exampleBn: 'দয়া করে আজকের বিকাল ৫টার মধ্যে ভাউচার এন্ট্রি সম্পন্ন করুন।'
      },
      {
        ruleTitleBn: '৩. দায়িত্ব বা দায়িত্বশীল ব্যক্তি নির্দেশ করতে "In charge of / Responsible for"',
        explanationBn: 'কোনো কাজের দায়িত্বে থাকা বোঝাতে "responsible for" বা "in charge of" বসে।',
        correctExample: 'Imran is responsible for monitoring staff movements.',
        incorrectExample: 'Imran is responsible about monitoring staff movements.',
        exampleBn: 'স্টাফদের চলাচলের বিষয়টি তদারকি করার দায়িত্বে ইমরান রয়েছেন।'
      }
    ],
    quizzes: [
      {
        id: 'q-prep-1',
        type: 'fill-blank',
        question: 'We need the final stock report submitted ____ Thursday.',
        questionBn: 'বৃহস্পতিবারের মধ্যে জমা দেওয়া নির্দেশ করতে কোন প্রিপজিশন বসবে?',
        options: ['by', 'in', 'to', 'for'],
        correctAnswer: 'by',
        explanationBn: 'কোনো নির্দিষ্ট সময়ের মধ্যে ডেডলাইন বোঝাতে "by [day/time]" বসে।'
      },
      {
        id: 'q-prep-2',
        type: 'mcq',
        question: 'Select the correct sentence regarding office timing:',
        questionBn: 'সঠিক প্রিপজিশনযুক্ত বাক্যটি চিহ্নিত করুন:',
        options: [
          'The management committee will meet on Monday at 3 PM.',
          'The management committee will meet in Monday on 3 PM.',
          'The management committee will meet at Monday by 3 PM.',
          'The management committee will meet on Monday in 3 PM.'
        ],
        correctAnswer: 'The management committee will meet on Monday at 3 PM.',
        explanationBn: 'বারের আগে "on" এবং ঘড়ির সময়ের আগে "at" বসে।'
      }
    ]
  },
  {
    id: 'g-common-mistakes',
    title: 'Common Mistakes Made by Bengali Speakers',
    titleBn: 'বাঙালিদের বহুল প্রচলিত ভুল ও তার সংশোধন',
    category: 'common-mistakes',
    summaryBn: 'বাংলা থেকে সরাসরি অনুবাদ করতে গিয়ে আমরা অফিসে যেসব মারাত্মক ব্যাকরণিক ও ভাবার্থের ভুল করি।',
    rules: [
      {
        ruleTitleBn: '১. "Discuss about" নয়, শুধু "Discuss"',
        explanationBn: 'বাংলায় আমরা বলি "এই বিষয়ে আলোচনা করব"। কিন্তু ইংরেজিতে Discuss ট্রানজিটিভ ভার্ব, এর পর কখনোই about বসবে না।',
        correctExample: 'Let us discuss the marketing strategy tomorrow.',
        incorrectExample: 'Let us discuss about the marketing strategy tomorrow.',
        exampleBn: 'আসুন আগামীকাল বিপণন কৌশল নিয়ে আলোচনা করি।'
      },
      {
        ruleTitleBn: '২. "Do a mistake" নয়, "Make a mistake"',
        explanationBn: 'ভুল করার ক্ষেত্রে সবসময় Make ভার্ব ব্যবহৃত হয়, কখনো Do নয়।',
        correctExample: 'I apologize, I made a mistake in calculating the total transport bill.',
        incorrectExample: 'I apologize, I did a mistake in calculating the total transport bill.',
        exampleBn: 'আমি ক্ষমাপ্রার্থী, যাতায়াত বিলের মোট হিসাব করতে আমি একটি ভুল করে ফেলেছিলাম।'
      },
      {
        ruleTitleBn: '৩. "Explain me" নয়, "Explain to me"',
        explanationBn: 'কাউকে কিছু বুঝিয়ে দিতে Explain এর পর যাকে বোঝানো হচ্ছে তার আগে "to" বসাতে হবে।',
        correctExample: 'Could you please explain this policy to me?',
        incorrectExample: 'Could you please explain me this policy?',
        exampleBn: 'আপনি কি দয়া করে এই পলিসিটি আমাকে একটু বুঝিয়ে দেবেন?'
      },
      {
        ruleTitleBn: '৪. "Preponed" কর্পোরেট অপশব্দ',
        explanationBn: 'মিটিংয়ের সময় এগিয়ে আনার ক্ষেত্রে আন্তর্জাতিক স্ট্যান্ডার্ডে "brought forward" বা "rescheduled to an earlier time" বলা উচিত।',
        correctExample: 'The meeting has been brought forward to 2:00 PM.',
        incorrectExample: 'The meeting is preponed to 2:00 PM.',
        exampleBn: 'মিটিংটি এগিয়ে দুপুর ২:০০ টায় আনা হয়েছে।'
      }
    ],
    quizzes: [
      {
        id: 'q-mis-1',
        type: 'mcq',
        question: 'Identify the sentence with correct word usage:',
        questionBn: 'কোন বাক্যটি ব্যাকরণগতভাবে সম্পূর্ণরূপে শুদ্ধ?',
        options: [
          'We need to discuss the budget during the meeting.',
          'We need to discuss about the budget during the meeting.',
          'We need to do a discussion about budget during meeting.',
          'We will discussion the budget during meeting.'
        ],
        correctAnswer: 'We need to discuss the budget during the meeting.',
        explanationBn: '"Discuss" এর পর কোনো "about" বসবে না। সরাসরি অবজেক্ট বসবে।'
      },
      {
        id: 'q-mis-2',
        type: 'fill-blank',
        question: 'I am sorry, I ____ an error while keying in the invoice amount.',
        questionBn: 'ভুল করা বোঝাতে কোন শব্দটি বসবে?',
        options: ['made', 'did', 'took', 'put'],
        correctAnswer: 'made',
        explanationBn: 'Error বা Mistake এর সাথে কোলোকেশন হিসেবে "make" (অতীতকালে "made") বসে।'
      }
    ]
  },
  {
    id: 'g-spoken-formulas',
    title: 'Polite Spoken English Formulas',
    titleBn: 'অফিসে ভদ্র ও পেশাদার অভিব্যক্তির ফর্মুলা',
    category: 'spoken-formulas',
    summaryBn: 'অফিসে সহকর্মী বা ঊর্ধ্বতন কর্মকর্তাদের কাছে অনুরোধ, অনুমতি চাওয়া ও ধন্যবাদ জানানোর স্ট্যান্ডার্ড ফর্মুলা।',
    rules: [
      {
        ruleTitleBn: '১. Would you mind + Verb-ing?',
        explanationBn: 'কারও কোনো আপত্তি আছে কি না জানতে এই ভদ্র কাঠামো ব্যবহৃত হয়। মনে রাখবেন এর পর Verb-এর সাথে -ing যোগ হয়।',
        correctExample: 'Would you mind sending me the ledger copy?',
        incorrectExample: 'Would you mind send me the ledger copy?',
        exampleBn: 'আপনি কি আমাকে লেজারের কপিটি পাঠাতে অনুগ্রহ করবেন?'
      },
      {
        ruleTitleBn: '২. Could you possibly...?',
        explanationBn: 'খুব বিনম্র অনুরোধের জন্য "Could you possibly help me check this entry?"',
        correctExample: 'Could you possibly verify this voucher before lunch?',
        exampleBn: 'আপনি কি দুপুরের খাবারের আগেই এই ভাউচারটি যাচাই করে দিতে পারেন?'
      },
      {
        ruleTitleBn: '৩. I would appreciate it if you could...',
        explanationBn: 'ইমেইল বা চিঠিতে বিনয়ের চূড়ান্ত রূপ প্রকাশে এই ফর্মুলা ব্যবহৃত হয়।',
        correctExample: 'I would appreciate it if you could release the payment by tomorrow.',
        exampleBn: 'আপনি যদি আগামীকালের মধ্যে পেমেন্টটি ছাড় করেন তবে আমি অত্যন্ত উপকৃত হব।'
      }
    ],
    quizzes: [
      {
        id: 'q-form-1',
        type: 'fill-blank',
        question: 'Would you mind ____ (share) the attendance file with me?',
        questionBn: '"Would you mind" এর পর ভার্বের কোন রূপ বসবে?',
        options: ['sharing', 'share', 'shared', 'to share'],
        correctAnswer: 'sharing',
        explanationBn: '"Would you mind" এর পর সর্বদা Verb+ing রূপ বসে।'
      },
      {
        id: 'q-form-2',
        type: 'listening',
        question: 'Listen to the audio and select the meaning of the spoken phrase:',
        questionBn: 'অডিও শুনুন এবং মার্জিত অনুরোধের সঠিক ভাবার্থ চিহ্নিত করুন:',
        audioPrompt: 'I would really appreciate it if you could look into this delayed shipment as soon as possible.',
        options: [
          'A polite request to urgently investigate a delayed shipment.',
          'An angry complaint refusing to accept the shipment.',
          'A notice that the shipment has already arrived at the warehouse.',
          'An invitation to attend a shipment celebration.'
        ],
        correctAnswer: 'A polite request to urgently investigate a delayed shipment.',
        explanationBn: 'বাক্যটিতে ভদ্রভাবে বিলম্বিত শিপমেন্টটি দ্রুত তদন্ত করে দেখার জন্য অনুরোধ জানানো হয়েছে।'
      }
    ]
  }
];

import { VocabularyWord } from './types';

export const VOCABULARY_DATA: VocabularyWord[] = [
  // OFFICE & FINANCE
  {
    id: 'v-1',
    word: 'Disbursement',
    phonetic: '/dɪsˈbɜːrsmənt/',
    partOfSpeech: 'noun',
    meaningBn: 'অর্থ বিতরণ বা অর্থ প্রদান',
    explanationBn: 'কোম্পানি বা ফান্ড থেকে কোনো অনুমোদিত খাতে আনুষ্ঠানিকভাবে টাকা পরিশোধ বা বিতরণ করা।',
    exampleSentence: 'The disbursement of the factory workers\' overtime allowance will be processed tomorrow.',
    exampleSentenceBn: 'ফ্যাক্টরি শ্রমিকদের ওভারটাইম ভাতার অর্থ প্রদান আগামীকাল সম্পন্ন করা হবে।',
    category: 'finance',
    difficulty: 'medium'
  },
  {
    id: 'v-2',
    word: 'Reimbursement',
    phonetic: '/ˌriːɪmˈbɜːrsmənt/',
    partOfSpeech: 'noun',
    meaningBn: 'খরচের ক্ষতিপূরণ বা ব্যয়িত অর্থ ফেরত পাওয়া',
    explanationBn: 'অফিসের কাজে কোনো কর্মকর্তা নিজের পকেট থেকে খরচ করার পর সেই টাকা বিল জমা দিয়ে অফিস থেকে ফেরত নেওয়া।',
    exampleSentence: 'Please submit your original bus tickets to claim your transport reimbursement.',
    exampleSentenceBn: 'যাতায়াত ভাতার টাকা ফেরত পাওয়ার জন্য অনুগ্রহ করে আপনার মূল বাসের টিকিট জমা দিন।',
    category: 'finance',
    difficulty: 'easy'
  },
  {
    id: 'v-3',
    word: 'Reconciliation',
    phonetic: '/ˌrekənsɪliˈeɪʃn/',
    partOfSpeech: 'noun',
    meaningBn: 'হিসাব মেলানো বা সমন্বয়করণ',
    explanationBn: 'লেজার খতিয়ান এবং ব্যাংকের স্টেটমেন্ট বা ক্যাশ বক্সের প্রকৃত টাকার মধ্যে হিসাব মিলিয়ে কোনো গরমিল দূর করা।',
    exampleSentence: 'The accounts team completed the bank reconciliation without identifying any discrepancies.',
    exampleSentenceBn: 'অ্যাকাউন্টস টিম কোনো গরমিল ছাড়াই ব্যাংকের হিসাব সমন্বয়ের কাজটি সম্পন্ন করেছে।',
    category: 'finance',
    difficulty: 'hard'
  },
  {
    id: 'v-4',
    word: 'Discrepancy',
    phonetic: '/dɪˈskrepənsi/',
    partOfSpeech: 'noun',
    meaningBn: 'অসঙ্গতি, গরমিল বা অমিল',
    explanationBn: 'দুটি রেকর্ড বা হিসাবের তথ্যে গরমিল বা অমিল পরিলক্ষিত হওয়া।',
    exampleSentence: 'We found a small discrepancy between the invoice amount and the actual bill voucher.',
    exampleSentenceBn: 'ইনভয়েসের টাকার পরিমাণ এবং প্রকৃত বিল ভাউচারের মধ্যে আমরা সামান্য গরমিল পেয়েছি।',
    category: 'finance',
    difficulty: 'medium'
  },
  {
    id: 'v-5',
    word: 'Petty Cash',
    phonetic: '/ˈpeti kæʃ/',
    partOfSpeech: 'noun',
    meaningBn: 'খুচরা নগদ তহবিল',
    explanationBn: 'অফিসের ছোটখাটো প্রতিদিনের নগদ খরচ (যেমন চা-নাস্তা, ডাকটিকিট, রিকশাভাড়া) মেটানোর তহবিল।',
    exampleSentence: 'Keep ten thousand taka in the petty cash drawer for emergency office purchases.',
    exampleSentenceBn: 'জরুরি অফিসের খরচের জন্য পেটি ক্যাশের ড্রয়ারে দশ হাজার টাকা রাখুন।',
    category: 'finance',
    difficulty: 'easy'
  },
  {
    id: 'v-6',
    word: 'Deficit',
    phonetic: '/ˈdefɪsɪt/',
    partOfSpeech: 'noun',
    meaningBn: 'ঘাটতি বা ঘাটতিমূলক ব্যালেন্স',
    explanationBn: 'আয়ের তুলনায় ব্যয়ের পরিমাণ বেশি হলে যে অর্থের ঘাটতি তৈরি হয়।',
    exampleSentence: 'The project budget ran into a deficit due to unprecedented fabric price hikes.',
    exampleSentenceBn: 'কাপড়ের অস্বাভাবিক মূল্যবৃদ্ধির কারণে প্রজেক্টের বাজেটে ঘাটতি দেখা দিয়েছে।',
    category: 'finance',
    difficulty: 'medium'
  },
  {
    id: 'v-7',
    word: 'Invoice',
    phonetic: '/ˈɪnvɔɪs/',
    partOfSpeech: 'noun',
    meaningBn: 'পণ্যের চালানি বিল বা মূল্যপত্র',
    explanationBn: 'সরবরাহকৃত পণ্য বা সেবার বিবরণ ও মোট প্রদেয় অর্থ উল্লেখ করে প্রস্তুতকৃত বাণিজ্যিক বিল।',
    exampleSentence: 'Please cross-check the supplier invoice against our purchase order before approval.',
    exampleSentenceBn: 'অনুমোদনের পূর্বে সাপ্লায়ার ইনভয়েসের সাথে আমাদের পারচেজ অর্ডার মিলিয়ে দেখুন।',
    category: 'finance',
    difficulty: 'easy'
  },
  {
    id: 'v-8',
    word: 'Accounts Payable',
    phonetic: '/əˈkaʊnts ˈpeɪəbl/',
    partOfSpeech: 'noun',
    meaningBn: 'প্রদেয় হিসাব (কোম্পানির দেনা)',
    explanationBn: 'সরবরাহকারী বা ভেন্ডরের কাছ থেকে বাকিতে নেওয়া মালামালের বিপরীতে যে টাকা কোম্পানি পরিশোধ করতে বাধ্য।',
    exampleSentence: 'Our accounts payable balance has been minimized through timely vendor clearances.',
    exampleSentenceBn: 'ভেন্ডরদের সময়মতো পাওনা পরিশোধের মাধ্যমে আমাদের প্রদেয় হিসাবের ব্যালেন্স নিয়ন্ত্রণে রাখা হয়েছে।',
    category: 'finance',
    difficulty: 'medium'
  },

  // OFFICE & GENERAL
  {
    id: 'v-9',
    word: 'Punctuality',
    phonetic: '/ˌpʌŋktʃuˈæləti/',
    partOfSpeech: 'noun',
    meaningBn: 'সময়ানুবর্তিতা বা সঠিক সময়ে কাজ করার অভ্যাস',
    explanationBn: 'অফিসে নির্ধারিত সময়ের মধ্যে উপস্থিত হওয়া এবং সময়নিষ্ঠ থাকা।',
    exampleSentence: 'The management highly values punctuality and strict adherence to office hours.',
    exampleSentenceBn: 'ম্যানেজমেন্ট সময়ানুবর্তিতা এবং অফিসের নির্ধারিত সময় মেনে চলাকে অত্যন্ত গুরুত্ব দেয়।',
    category: 'office',
    difficulty: 'easy'
  },
  {
    id: 'v-10',
    word: 'Collaboration',
    phonetic: '/kəˌlæbəˈreɪʃn/',
    partOfSpeech: 'noun',
    meaningBn: 'পারস্পরিক সহযোগিতা ও যৌথ প্রচেষ্টা',
    explanationBn: 'একই লক্ষ্য অর্জনের জন্য দলের সদস্যরা মিলেমিশে কাজ করা।',
    exampleSentence: 'Effective collaboration between merchandising and accounts ensures smooth shipments.',
    exampleSentenceBn: 'মার্চেন্ডাইজিং ও অ্যাকাউন্টস বিভাগের কার্যকর সমন্বয় সময়মতো শিপমেন্ট নিশ্চিত করে।',
    category: 'office',
    difficulty: 'easy'
  },
  {
    id: 'v-11',
    word: 'Confidentiality',
    phonetic: '/ˌkɑːnfɪˌdenʃiˈæləti/',
    partOfSpeech: 'noun',
    meaningBn: 'গোপনীয়তা রক্ষা করা',
    explanationBn: 'কোম্পানি বা ক্লায়েন্টের তথ্য কঠোরভাবে গোপন রাখা।',
    exampleSentence: 'All staff members are expected to maintain strict confidentiality regarding client quotations.',
    exampleSentenceBn: 'সকল স্টাফ সদস্য ক্লায়েন্টদের কোটেশনের ব্যাপারে কঠোর গোপনীয়তা বজায় রাখবেন বলে প্রত্যাশিত।',
    category: 'office',
    difficulty: 'medium'
  },
  {
    id: 'v-12',
    word: 'Prioritize',
    phonetic: '/praɪˈɔːrətaɪz/',
    partOfSpeech: 'verb',
    meaningBn: 'অগ্রাধিকার দেওয়া',
    explanationBn: 'কোন কাজটি আগে করা সবচেয়ে জরুরি তা বিবেচনা করে গুরুত্ব দেওয়া।',
    exampleSentence: 'We must prioritize urgent factory deliveries before taking up new sample developments.',
    exampleSentenceBn: 'নতুন স্যাম্পল তৈরির কাজ নেওয়ার আগে আমাদের জরুরি ফ্যাক্টরি ডেলিভারিগুলোকে অগ্রাধিকার দিতে হবে।',
    category: 'office',
    difficulty: 'easy'
  },
  {
    id: 'v-13',
    word: 'Bottleneck',
    phonetic: '/ˈbɑːtlnek/',
    partOfSpeech: 'noun',
    meaningBn: 'কাজের গতিতে বাধা বা প্রতিবন্ধকতা',
    explanationBn: 'কাজের কোনো একটি ধাপ ধীরগতির হওয়ার কারণে পুরো প্রক্রিয়ার গতি থেমে যাওয়া।',
    exampleSentence: 'Delayed fabric testing has become a bottleneck in our production schedule.',
    exampleSentenceBn: 'দেরিতে কাপড় পরীক্ষা করার বিষয়টি আমাদের উৎপাদন শিডিউলের একটি বড় বাধা হয়ে দাঁড়িয়েছে।',
    category: 'business',
    difficulty: 'medium'
  },
  {
    id: 'v-14',
    word: 'Deliverable',
    phonetic: '/dɪˈlɪvərəbl/',
    partOfSpeech: 'noun',
    meaningBn: 'প্রতিশ্রুত কাজ বা ফলাফল',
    explanationBn: 'চুক্তি বা দায়িত্ব অনুযায়ী ক্লায়েন্ট বা ম্যানেজমেন্টের কাছে যে চূড়ান্ত পণ্য বা রিপোর্ট তুলে দিতে হবে।',
    exampleSentence: 'Our primary deliverable this week is the completed garment inspection report.',
    exampleSentenceBn: 'এই সপ্তাহে আমাদের প্রধান অর্পিত কাজ হলো সম্পূর্ণ পোশাক পরিদর্শন রিপোর্ট প্রস্তুত করা।',
    category: 'business',
    difficulty: 'medium'
  },

  // BUSINESS & IDIOMS
  {
    id: 'v-15',
    word: 'Touch base',
    phonetic: '/tʌtʃ beɪs/',
    partOfSpeech: 'idiom',
    meaningBn: 'যোগাযোগ করা বা হালনাগাদ খোঁজখবর নেওয়া',
    explanationBn: 'কারও সাথে সংক্ষিপ্ত আলোচনা বা আপডেট নেওয়ার জন্য যোগাযোগ করা।',
    exampleSentence: 'Let\'s touch base tomorrow morning regarding the upcoming fabric shipment.',
    exampleSentenceBn: 'আসুন আসন্ন কাপড়ের শিপমেন্টের ব্যাপারে কাল সকালে একটু কথা বলে আপডেট জেনে নিই।',
    category: 'idiom',
    difficulty: 'medium'
  },
  {
    id: 'v-16',
    word: 'Back to the drawing board',
    phonetic: '/bæk tuː ðə ˈdrɔːɪŋ bɔːrd/',
    partOfSpeech: 'idiom',
    meaningBn: 'নতুন করে গোড়া থেকে শুরু করা',
    explanationBn: 'একটি পরিকল্পনা ব্যর্থ হওয়ার পর প্রথম থেকে পুনরায় নতুন পরিকল্পনা গ্রহণ করা।',
    exampleSentence: 'The buyer rejected our initial design sample, so it\'s back to the drawing board.',
    exampleSentenceBn: 'বায়ার আমাদের প্রাথমিক ডিজাইনের স্যাম্পলটি বাতিল করেছে, তাই আমাদের আবার গোড়া থেকে পরিকল্পনা করতে হবে।',
    category: 'idiom',
    difficulty: 'hard'
  },
  {
    id: 'v-17',
    word: 'Keep in the loop',
    phonetic: '/kiːp ɪn ðə luːp/',
    partOfSpeech: 'idiom',
    meaningBn: 'সব খবর বা আপডেটের সাথে অবগত রাখা',
    explanationBn: 'একটি চলমান বিষয় সম্পর্কে কাউকে সবসময় অবগত রাখা ও ইমেইলে সিসি রাখা।',
    exampleSentence: 'Please CC me on all client correspondence so I am kept in the loop.',
    exampleSentenceBn: 'ক্লায়েন্টের সাথে সকল চিঠিপত্রে আমাকে সিসিতে রাখুন যেন আমি সব বিষয়ে অবগত থাকতে পারি।',
    category: 'idiom',
    difficulty: 'medium'
  },
  {
    id: 'v-18',
    word: 'Proactive',
    phonetic: '/proʊˈæktɪv/',
    partOfSpeech: 'adjective',
    meaningBn: 'সমস্যা ঘটার আগেই সচেতন ও সক্রিয় ভূমিকা নেওয়া',
    explanationBn: 'বিপদ বা সমস্যা আসার জন্য অপেক্ষা না করে আগে থেকেই সমাধান প্রস্তুত রাখা।',
    exampleSentence: 'Taking a proactive approach prevents last-minute production delays.',
    exampleSentenceBn: 'আগে থেকেই সতর্ক পদক্ষেপ নিলে শেষ মুহূর্তে উৎপাদনের দেরি রোধ করা যায়।',
    category: 'business',
    difficulty: 'medium'
  },
  {
    id: 'v-19',
    word: 'Adjourn',
    phonetic: '/əˈdʒɜːrn/',
    partOfSpeech: 'verb',
    meaningBn: 'মিটিং বা অধিবেশন মুলতবি ঘোষণা করা',
    explanationBn: 'চলমান আলোচনা বা মিটিং সাময়িকভাবে স্থগিত বা শেষ করা।',
    exampleSentence: 'Having covered all agenda items, the Chairman adjourned the meeting at 4 PM.',
    exampleSentenceBn: 'আলোচ্যসূচির সকল বিষয় শেষ হওয়ায় চেয়ারম্যান বিকাল ৪টায় মিটিং মুলতবি ঘোষণা করলেন।',
    category: 'office',
    difficulty: 'hard'
  },
  {
    id: 'v-20',
    word: 'Consensus',
    phonetic: '/kənˈsensəs/',
    partOfSpeech: 'noun',
    meaningBn: 'সকলের সর্বসম্মত সিদ্ধান্ত বা ঐক্যমত',
    explanationBn: 'একটি বিষয়ে দলের সকলের যৌথ সম্মতি প্রকাশ করা।',
    exampleSentence: 'After extensive discussion, the management reached a consensus on the new holiday calendar.',
    exampleSentenceBn: 'সুদীর্ঘ আলোচনার পর ম্যানেজমেন্ট নতুন ছুটির ক্যালেন্ডারের ব্যাপারে একটি ঐক্যমতে পৌঁছাল।',
    category: 'business',
    difficulty: 'hard'
  }
];

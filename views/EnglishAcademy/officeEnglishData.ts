import { EmailTemplate, FinanceTerm, OfficeDialogue, SpeakingScenario } from './types';

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'email-leave',
    title: 'Formal Leave Application',
    titleBn: 'ছুটির আনুষ্ঠানিক আবেদন',
    category: 'leave',
    subject: 'Application for Casual Leave: [Your Name] - [Staff ID]',
    body: `Dear Sir/Madam,

I am writing to formally request [Number] days of casual leave starting from [Start Date] to [End Date], as I have urgent personal matters to attend to at my hometown.

During my absence, my colleague [Colleague Name] has kindly agreed to oversee my daily routine responsibilities to ensure uninterrupted workflow. I will also remain reachable via mobile and email for any urgent operational inquiries.

I would be most grateful if you could kindly approve my leave request.

Thanking you,

Sincerely,
[Your Name]
[Your Designation]
Depend Sourcing Ltd.`,
    bodyBn: `মহোদয়,
আমি বিনীতভাবে জানাচ্ছি যে, আমার গ্রামের বাড়িতে জরুরি পারিবারিক কাজের কারণে আগামী [শুরুর তারিখ] হতে [শেষের তারিখ] পর্যন্ত মোট [দিন সংখ্যা] দিনের নৈমিত্তিক ছুটির আবেদন করছি।

আমার অনুপস্থিতিতে নিয়মিত কার্যক্রম সচল রাখার সুবিধার্থে আমার সহকর্মী [সহকর্মীর নাম] আমার প্রতিদিনের দায়িত্বসমূহ তদারকি করতে সদয় সম্মতি দিয়েছেন। জরুরি প্রয়োজনে আমি মোবাইল ও ইমেইলে সহজলভ্য থাকব।

অতএব, আমার ছুটির আবেদনটি মঞ্জুর করতে আপনার সদয় মর্জি কামনা করছি।

বিনীত,
[আপনার নাম]
[আপনার পদবি]
ডিপেন্ড সোর্সিং লিমিটেড`,
    tipsBn: [
      'ছুটির সুনির্দিষ্ট কারণ ও তারিখ পরিষ্কারভাবে উল্লেখ করুন।',
      'আপনার অনুপস্থিতিতে কে ব্যাকআপ দায়িত্ব পালন করবেন তা উল্লেখ করলে দ্রুত অনুমোদন মেলে।',
      'ছুটি অনুমোদিত হওয়ার পরেই অফিসে অনুপস্থিত থাকুন।'
    ]
  },
  {
    id: 'email-bill-submit',
    title: 'Conveyance & Expense Voucher Submission',
    titleBn: 'যাতায়াত ও খরচের ভাউচার জমা দেওয়ার ইমেইল',
    category: 'bills',
    subject: 'Submission of Expense Vouchers for [Month Year] - [Staff Name]',
    body: `Dear Accounts Department,

Please find attached my detailed expense statement along with scanned receipts and transport vouchers for the month of [Month Year], totaling BDT [Total Amount] ([Amount in Words] Taka only).

All expenses have been duly verified in accordance with the company\'s official billing policy. Below is a quick summary of the expenditures:

1. Factory Visit Conveyance: BDT [Amount]
2. Office Stationery & Supplies: BDT [Amount]
3. Client Meeting Refreshments: BDT [Amount]

Kindly review the attached documents and arrange for the reimbursement disbursement at your earliest convenience.

Best regards,
[Your Name]
[Designation], Depend Sourcing Ltd.`,
    bodyBn: `প্রিয় অ্যাকাউন্টস বিভাগ,
[মাস বছর] মাসের মোট [মোট টাকা] টাকার বিস্তারিত ব্যয়ের হিসাব বিবরণী এবং স্ক্যান করা রসিদ ও যাতায়াত ভাউচারসমূহ সংযুক্ত অবস্থায় পেশ করছি।

কোম্পানির অফিশিয়াল বিলিং নীতিমালা অনুসারে সকল খরচ যথাযথভাবে যাচাই করা হয়েছে। ব্যয়ের সারসংক্ষেপ নিচে দেওয়া হলো:
১. ফ্যাক্টরি ভিজিট যাতায়াত: [টাকা]
২. অফিস স্টেশনারি ও মালামাল: [টাকা]
৩. ক্লায়েন্ট মিটিং আপ্যায়ন: [টাকা]

সংযুক্ত ফাইলগুলো পর্যালোচনা করে সুবিধাজনক দ্রুত সময়ে রিইমবার্সমেন্ট সম্পন্ন করার জন্য অনুরোধ করছি।`,
    tipsBn: [
      'মোট টাকার পরিমাণ অংকে ও কথায় উভয়ভাবেই উল্লেখ করুন।',
      'প্রয়োজনীয় সকল রসিদ ও ভাউচার আগেই অ্যাটাচ করেছেন কি না চেক করে নিন।'
    ]
  },
  {
    id: 'email-client-followup',
    title: 'Client Order & Sample Follow-Up',
    titleBn: 'ক্লায়েন্টের অর্ডারের অগ্রগতি ও স্যাম্পল ফলো-আপ',
    category: 'client',
    subject: 'Update & Follow-up: Garment Sample Approval for Order #[PO Number]',
    body: `Dear [Client Name],

I hope this email finds you well.

I am writing to provide you with a brief update regarding the production status of your recent sample order #[PO Number]. Our merchandising and quality control teams have finalized the fabric lab dips and initial garment stitching.

The finished prototype sample was dispatched today via express courier under tracking number [Courier Tracking Number]. We anticipate it will arrive at your inspection desk within two business days.

Could you kindly review the sample upon receipt and share your valuable feedback so that we can proceed with bulk manufacturing on schedule?

Looking forward to your kind response.

Warm regards,
[Your Name]
Merchandising Department, Depend Sourcing Ltd.`,
    bodyBn: `প্রিয় [ক্লায়েন্টের নাম],
আশা করি আপনি ভালো আছেন।
আপনার সাম্প্রতিক স্যাম্পল অর্ডার #[পিও নম্বর]-এর উৎপাদন অগ্রগতির একটি সংক্ষিপ্ত আপডেট জানানোর জন্য লিখছি। আমাদের মার্চেন্ডাইজিং এবং কিউসি টিম কাপড়ের ল্যাব ডিপ এবং প্রাথমিক সেলাইয়ের কাজ সম্পন্ন করেছে।

তৈরিকৃত স্যাম্পলটি এক্সপ্রেস কুরিয়ারে পাঠানো হয়েছে (ট্র্যাকিং নম্বর: [ট্র্যাকিং নম্বর])। আমরা আশা করছি দুই কার্যদিবসের মধ্যে তা আপনার হাতে পৌঁছাবে।

স্যাম্পলটি পৌঁছানোর পর পর্যালোচনা করে আপনার মতামত জানালে আমরা নির্ধারিত সময়ে বাল্ক উৎপাদনে যেতে পারব।`,
    tipsBn: [
      'ক্লায়েন্টকে সবসময় নম্র ভাষায় কুশল জানান।',
      'কুরিয়ারের ট্র্যাকিং নম্বর দিয়ে দিলে ক্লায়েন্ট আশ্বস্ত থাকে।'
    ]
  },
  {
    id: 'email-advance-request',
    title: 'Salary Advance Application',
    titleBn: 'বেতন অগ্রিম (Advance) উত্তোলনের আবেদন',
    category: 'reporting',
    subject: 'Request for Salary Advance: [Your Name] - [Staff ID]',
    body: `Dear Management,

I am writing to respectfully request a salary advance of BDT [Amount in figures] ([Amount in words] Taka only) for the current month due to an unanticipated family emergency.

I propose that this advance amount be deducted from my upcoming monthly salary [or in equal installments across two months], as per company guidelines.

I would be extremely thankful if you could kindly consider my request and approve the disbursement from the fund ledger.

Thank you for your continued understanding and support.

Yours faithfully,
[Your Name]
[Designation]`,
    bodyBn: `শ্রদ্ধেয় ম্যানেজমেন্ট,
জরুরি পারিবারিক কারণে আমি চলতি মাসের বেতনের বিপরীতে [টাকার পরিমাণ] টাকা অগ্রিম গ্রহণের আবেদন জানাচ্ছি।

কোম্পানির নীতিমালা অনুসারে এই অগ্রিমের টাকা আমার আগামী মাসের বেতন হতে সমন্বয় করার প্রস্তাব করছি।

অনুরোধটি সদয় বিবেচনাপূর্বক ফান্ড লেজার হতে অর্থ ছাড়ের অনুমোদন দিলে চিরকৃতজ্ঞ থাকব।`,
    tipsBn: [
      'টাকা কীভাবে অ্যাডজাস্ট করা হবে তা স্পষ্টভাবে উল্লেখ করুন।',
      'কৃতজ্ঞতা প্রকাশ করুন।'
    ]
  }
];

export const FINANCE_TERMS: FinanceTerm[] = [
  {
    id: 'ft-1',
    term: 'Ledger',
    meaningBn: 'খতিয়ান বা প্রধান হিসাবের খাতা',
    contextBn: 'প্রতিষ্ঠানের সকল আর্থিক লেনদেনের চূড়ান্ত ও পূর্ণাঙ্গ হিসাবের সংকলন।',
    example: 'The managing director reviewed the fund ledger to verify yesterday\'s cash balance.',
    exampleBn: 'ম্যানেজিং ডিরেক্টর গতকালের নগদ উদ্বৃত্ত যাচাই করতে ফান্ড লেজার খতিয়ানটি পর্যালোচনা করেন।'
  },
  {
    id: 'ft-2',
    term: 'Voucher',
    meaningBn: 'রসিদপত্র বা খরচের প্রমাণ দলিল',
    contextBn: 'কোনো আর্থিক লেনদেন বা খরচের সত্যতা প্রমাণে প্রস্তুতকৃত অফিশিয়াল স্লিপ বা ভাউচার।',
    example: 'No cash payment can be disbursed without a signed voucher from the authorized signatory.',
    exampleBn: 'অনুমোদনকারী স্বাক্ষরকারীর স্বাক্ষরযুক্ত ভাউচার ছাড়া কোনো নগদ অর্থ ছাড় করা যাবে না।'
  },
  {
    id: 'ft-3',
    term: 'Petty Cash',
    meaningBn: 'খুচরা নগদ টাকা বা হাতখরচের তহবিল',
    contextBn: 'প্রতিদিনের তাৎক্ষণিক ছোট ছোট ব্যয়ের জন্য সংরক্ষিত নগদ অর্থ।',
    example: 'Keep sufficient funds in petty cash for emergency stationery and refreshments.',
    exampleBn: 'জরুরি স্টেশনারি ও আপ্যায়নের জন্য পেটি ক্যাশে পর্যাপ্ত অর্থ রাখুন।'
  },
  {
    id: 'ft-4',
    term: 'Reimbursement',
    meaningBn: 'ব্যয়িত অর্থ পরিশোধ বা ফেরত দেওয়া',
    contextBn: 'অফিসের কাজে কোনো কর্মকর্তা নিজস্ব অর্থ ব্যয়ের পর তা কোম্পানি থেকে বুঝে নেওয়া।',
    example: 'Staff must submit their movement slips to claim local conveyance reimbursement.',
    exampleBn: 'যাতায়াত খরচের টাকা ফেরত পেতে কর্মীদের অবশ্যই মুভমেন্ট স্লিপ জমা দিতে হবে।'
  },
  {
    id: 'ft-5',
    term: 'Overdue',
    meaningBn: 'পরিশোধের মেয়াদোত্তীর্ণ',
    contextBn: 'বিল বা ইনভয়েস পরিশোধের নির্ধারিত তারিখ পার হয়ে যাওয়া।',
    example: 'The mobile bill payment is overdue; please clear it immediately to avoid service disruption.',
    exampleBn: 'মোবাইল বিল পরিশোধের মেয়াদ পেরিয়ে গেছে; লাইন বিচ্ছিন্ন হওয়া এড়াতে অবিলম্বে পরিশোধ করুন।'
  },
  {
    id: 'ft-6',
    term: 'Discrepancy',
    meaningBn: 'হিসাবের গরমিল বা অমিল',
    contextBn: 'আসল টাকা ও খাতার হিসাবের মাঝে অসামঞ্জস্য বা পার্থক্য।',
    example: 'An audit was initiated following a fifty thousand taka discrepancy in the fund balance.',
    exampleBn: 'ফান্ড ব্যালেন্সে পঞ্চাশ হাজার টাকার গরমিল ধরা পড়ার পর একটি অডিট শুরু করা হয়েছে।'
  },
  {
    id: 'ft-7',
    term: 'Authorized Signatory',
    meaningBn: 'অনুমোদিত স্বাক্ষরকারী',
    contextBn: 'অফিসের চেক, বিল বা ভাউচারে চূড়ান্ত অনুমোদনের ক্ষমতাপ্রাপ্ত ব্যক্তি (যেমন চেয়ারম্যান বা এমডি)।',
    example: 'The cheque is valid only when endorsed by the authorized signatory, either the Chairman or MD.',
    exampleBn: 'অনুমোদিত স্বাক্ষরকারী অর্থাৎ চেয়ারম্যান অথবা এমডির স্বাক্ষর থাকলেই কেবল চেকটি কার্যকর হবে।'
  },
  {
    id: 'ft-8',
    term: 'Incur',
    meaningBn: 'খরচ বা দায় হওয়া',
    contextBn: 'কোনো কাজ সম্পাদন করতে গিয়ে ব্যয় সংঘটিত হওয়া।',
    example: 'We incurred additional freight costs because of the urgent flight booking.',
    exampleBn: 'জরুরি বিমান বুকিংয়ের কারণে আমাদের অতিরিক্ত পরিবহন খরচ বহন করতে হয়েছিল।'
  }
];

export const OFFICE_DIALOGUES: OfficeDialogue[] = [
  {
    id: 'd-1',
    title: 'Requesting Leave to the Managing Director',
    titleBn: 'ম্যানেজিং ডিরেক্টর স্যারের কাছে ছুটি চাওয়া',
    category: 'manager',
    descriptionBn: 'অফিসের ম্যানেজারের সাথে সরাসরি দেখা করে ছুটির আবেদন ও কাজের দায়িত্ব বুঝিয়ে দেওয়ার কথপোকথন।',
    turns: [
      {
        speaker: 'Employee (Imran)',
        speakerRoleBn: 'কর্মী (ইমরান)',
        text: 'Excuse me, Sir. May I come in for a quick moment?',
        textBn: 'মাফ করবেন স্যার। আমি কি একটু ভেতরে আসতে পারি?'
      },
      {
        speaker: 'Managing Director (Shariful Islam)',
        speakerRoleBn: 'ম্যানেজিং ডিরেক্টর (শরিফুল ইসলাম)',
        text: 'Yes, Imran. Come in. What is on your mind?',
        textBn: 'হ্যাঁ, ইমরান। ভেতরে এসো। কী বিষয়?'
      },
      {
        speaker: 'Employee (Imran)',
        speakerRoleBn: 'কর্মী (ইমরান)',
        text: 'Sir, I need to visit my hometown next Monday for an urgent family matter. I would like to request two days of casual leave.',
        textBn: 'স্যার, একটি জরুরি পারিবারিক কাজে আগামী সোমবার আমার গ্রামের বাড়ি যাওয়া প্রয়োজন। আমি দুই দিনের নৈমিত্তিক ছুটির আবেদন করতে চাচ্ছিলাম।'
      },
      {
        speaker: 'Managing Director (Shariful Islam)',
        speakerRoleBn: 'ম্যানেজিং ডিরেক্টর (শরিফুল ইসলাম)',
        text: 'Have you completed the monthly mobile bill reconciliation and assigned your desk duties?',
        textBn: 'তুমি কি মাসিক মোবাইল বিলের হিসাব সমন্বয় করেছো এবং তোমার ডেস্কের দায়িত্ব কাউকে বুঝিয়ে দিয়েছ?'
      },
      {
        speaker: 'Employee (Imran)',
        speakerRoleBn: 'কর্মী (ইমরান)',
        text: 'Yes, Sir. I have already finalized the billing ledger, and Kabir will look after urgent vouchers while I am away.',
        textBn: 'জি স্যার। আমি বিলিং লেজার চূড়ান্ত করে রেখেছি, এবং আমার অনুপস্থিতিতে জরুরি ভাউচারগুলো কবির দেখভাল করবে।'
      },
      {
        speaker: 'Managing Director (Shariful Islam)',
        speakerRoleBn: 'ম্যানেজিং ডিরেক্টর (শরিফুল ইসলাম)',
        text: 'Very good. Submit the formal application in the system, and I will approve it. Safe travels.',
        textBn: 'খুব ভালো। সিস্টেমে অফিশিয়াল আবেদনটি সাবমিট করে দাও, আমি অনুমোদন করে দিচ্ছি। নিরাপদে ভ্রমণ করো।'
      }
    ]
  },
  {
    id: 'd-2',
    title: 'Inquiring About an Overdue Supplier Bill',
    titleBn: 'বকেয়া সাপ্লায়ার বিল সংক্রান্ত জিজ্ঞাসাবাদ',
    category: 'accounts',
    descriptionBn: 'ভেন্ডর বা সাপ্লায়ার ফোন করে বকেয়া বিলের খোঁজ নিলে পেশাদারিত্বের সাথে কথা বলার কথোপকথন।',
    turns: [
      {
        speaker: 'Supplier (Rahman Fabrics)',
        speakerRoleBn: 'সাপ্লায়ার (রহমান ফেব্রিক্স)',
        text: 'Hello, this is Mr. Rahman from Rahman Fabrics. We submitted Invoice #450 ten days ago. When can we expect payment?',
        textBn: 'হ্যালো, আমি রহমান ফেব্রিক্স থেকে রহমান বলছি। আমরা দশ দিন আগে ইনভয়েস #৪৫০ জমা দিয়েছিলাম। পেমেন্টটি কবে নাগাদ পাব?'
      },
      {
        speaker: 'Accounts Officer',
        speakerRoleBn: 'অ্যাকাউন্টস অফিসার',
        text: 'Good afternoon, Mr. Rahman. Thank you for following up. Let me pull up your account in our ledger right away.',
        textBn: 'শুভ অপরাহ্ন, জনাব রহমান। খোঁজ নেওয়ার জন্য ধন্যবাদ। আমি এখনই আমাদের লেজারে আপনার অ্যাকাউন্টটি দেখছি।'
      },
      {
        speaker: 'Accounts Officer',
        speakerRoleBn: 'অ্যাকাউন্টস অফিসার',
        text: 'I see that the quality inspection was verified yesterday, and the voucher has been forwarded to the Managing Director for final authorization.',
        textBn: 'আমি দেখতে পাচ্ছি যে গতকাল পণ্যের গুণগত মান যাচাই সম্পন্ন হয়েছে এবং চূড়ান্ত অনুমোদনের জন্য ভাউচারটি ম্যানেজিং ডিরেক্টর মহোদয়ের কাছে পাঠানো হয়েছে।'
      },
      {
        speaker: 'Supplier (Rahman Fabrics)',
        speakerRoleBn: 'সাপ্লায়ার (রহমান ফেব্রিক্স)',
        text: 'That is reassuring. Will the fund be transferred via bank transfer or cheque?',
        textBn: 'শুনে আশ্বস্ত হলাম। টাকাটি কি ব্যাংক ট্রান্সফার হবে নাকি চেকের মাধ্যমে দেওয়া হবে?'
      },
      {
        speaker: 'Accounts Officer',
        speakerRoleBn: 'অ্যাকাউন্টস অফিসার',
        text: 'It will be disbursed via BEFTN bank transfer by this Thursday afternoon. We will email you the deposit slip immediately.',
        textBn: 'আগামী বৃহস্পতিবার বিকালের মধ্যে BEFTN ব্যাংক ট্রান্সফারের মাধ্যমে পাঠিয়ে দেওয়া হবে। সাথে সাথেই আমরা আপনাকে জমার স্লিপটি ইমেইল করে দেব।'
      }
    ]
  }
];

export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  {
    id: 'sc-1',
    title: 'Daily Office Conversation & Greetings',
    titleBn: 'দৈনন্দিন অফিসের আড্ডা ও কুশল বিনিময়',
    descriptionBn: 'সকালে অফিসে এসে সহকর্মীর সাথে কুশল বিনিময় ও দিনের কাজের পরিকল্পনা নিয়ে কথা বলুন।',
    initialPrompt: "Good morning! How was your weekend? Are you working on anything exciting today?",
    initialPromptBn: "শুভ সকাল! আপনার ছুটির দিন কেমন কাটল? আজ কি কোনো বিশেষ কাজে ব্যস্ত আছেন?",
    systemPrompt: "You are a friendly, encouraging colleague in an apparel sourcing office in Dhaka. Converse naturally, ask casual questions about work, transport, or tea break, and provide gentle grammar corrections when needed.",
    tags: ['Daily', 'Casual', 'Colleagues']
  },
  {
    id: 'sc-2',
    title: 'Reporting to Manager or Director',
    titleBn: 'ম্যানেজার বা এমডি স্যারের কাছে রিপোর্ট প্রদান',
    descriptionBn: 'আজকের কাজ শেষ করে বা কাজের অগ্রগতি জানাতে ম্যানেজারের রুমে গিয়ে রিপোর্ট পেশ করুন।',
    initialPrompt: "Hello! Come in and take a seat. What is the status of the monthly expense report and factory visits?",
    initialPromptBn: "হ্যালো! এসো, বসো। মাসিক খরচের রিপোর্ট এবং ফ্যাক্টরি ভিজিটের কী অবস্থা?",
    systemPrompt: "You are the Managing Director (Shariful Islam) or Manager of Depend Sourcing. You are professional, focused on numbers, punctuality, vouchers, and accountability. Respond politely, ask for details, and help the user express business thoughts clearly.",
    tags: ['Manager', 'Reporting', 'Formal']
  },
  {
    id: 'sc-3',
    title: 'Handling a Buyer / Client Phone Call',
    titleBn: 'বিদেশি বায়ার বা ক্লায়েন্টের সাথে ফোন কল',
    descriptionBn: 'আন্তর্জাতিক বায়ার কল করে স্যাম্পল শিপমেন্ট এবং পোশাকের কোয়ালিটি নিয়ে জানতে চাইছেন।',
    initialPrompt: "Hello, this is David calling from London Retailers. I wanted to follow up on the cotton polo shirt samples we discussed last week. Are they ready?",
    initialPromptBn: "হ্যালো, লন্ডন রিটেইলার্স থেকে ডেভিড বলছি। গত সপ্তাহে যে সুতি পোলো শার্ট স্যাম্পল নিয়ে কথা বলেছিলাম সেটির ফলো-আপ নিতে কল করলাম। ওগুলো কি রেডি হয়েছে?",
    systemPrompt: "You are David, an international apparel buyer calling from the UK. You are polite, punctual, and care about sample delivery dates, fabric quality, and price. Simulate an authentic client phone call.",
    tags: ['Client', 'Telephone', 'Merchandising']
  },
  {
    id: 'sc-4',
    title: 'Job Interview & Career Discussion',
    titleBn: 'চাকরির ইন্টারভিউ ও নিজের যোগ্যতা প্রকাশ',
    descriptionBn: 'অফিস ম্যানেজমেন্ট, মার্চেন্ডাইজিং বা অ্যাকাউন্টস রোলের জন্য ইন্টারভিউয়ারের প্রশ্নের উত্তর দিন।',
    initialPrompt: "Welcome to Depend Sourcing. To start off, could you please introduce yourself and tell me why you are interested in this position?",
    initialPromptBn: "ডিপেন্ড সোর্সিং-এ স্বাগতম। শুরুতেই অনুগ্রহ করে নিজের একটু পরিচয় দিন এবং এই পদের জন্য কেন আগ্রহী তা বলুন।",
    systemPrompt: "You are a senior HR and executive interviewer. Ask professional interview questions (strengths, handling pressure, why join us, career goals), assess their English answers, and give constructive feedback.",
    tags: ['Interview', 'Career', 'Formal']
  },
  {
    id: 'sc-5',
    title: 'Business Negotiation & Price Discussion',
    titleBn: 'দরদাম ও ব্যবসায়িক সমঝোতা বৈঠক',
    descriptionBn: 'সাপ্লায়ার বা বায়ারের সাথে কাপড়ের দাম এবং পেমেন্ট টার্মস নিয়ে দর কষাকষি করুন।',
    initialPrompt: "Thank you for joining this meeting. Regarding your quotation of $5.50 per piece, our management finds it slightly above our target margin. Can we discuss a discount for a 50,000 piece volume?",
    initialPromptBn: "মিটিংয়ে যোগ দেওয়ার জন্য ধন্যবাদ। পিস প্রতি ৫.৫০ ডলারের কোটেশন আমাদের টার্গেট মার্জিনের চেয়ে কিছুটা বেশি। ৫০ হাজার পিস অর্ডারের জন্য কি কোনো ছাড় বিবেচনা করা যায়?",
    systemPrompt: "You are an experienced business partner negotiating bulk purchase orders. Challenge the user to offer win-win trade-offs (faster payment, higher volume, flexible delivery) in professional English.",
    tags: ['Negotiation', 'Business', 'Deals']
  }
];

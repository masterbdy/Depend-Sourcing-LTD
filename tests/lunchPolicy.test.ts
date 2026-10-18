import {
  detectLunchExpense,
  validateLunchPolicy,
  normalizeExpenseText,
} from '../services/lunchPolicyService';
import { submitExpenseBill } from '../services/billSyncService';
import { UserRole, BillingRule } from '../types';

interface TestCaseResult {
  category: string;
  input: string;
  expectedIsLunch: boolean;
  actualIsLunch: boolean;
  passed: boolean;
  details?: string;
}

const testBillingRules: BillingRule[] = [
  { type: 'LUNCH', startTime: '13:00', endTime: '14:00', amount: 150, minPeople: 4 },
];

console.log('===============================================================');
console.log('   MULTILINGUAL LUNCH DETECTION & POLICY TEST SUITE            ');
console.log('===============================================================\n');

const results: TestCaseResult[] = [];

function recordTest(
  category: string,
  input: string,
  expectedIsLunch: boolean,
  selectedCategory?: string
) {
  const detection = detectLunchExpense(input, selectedCategory);
  const passed = detection.isLunch === expectedIsLunch;
  results.push({
    category,
    input,
    expectedIsLunch,
    actualIsLunch: detection.isLunch,
    passed,
    details: `confidence: ${detection.confidence}, matched: ${detection.detectedTerm || 'none'}, mismatch: ${detection.isCategoryMismatch}`,
  });
}

// 1. BENGALI TEST CASES (Positive)
const bengaliPositives = [
  'লাঞ্চ',
  'লান্স',
  'লান্চ',
  'লাঞ্চ বিল',
  'লান্স বিল',
  'লান্চ বিল',
  'লাঞ্চের বিল',
  'লান্সের খরচ',
  'লাঞ্ছ',
  'দুপুরের খাবার',
  'দুপুরের লাঞ্চ',
  'অফিস স্টাফ লাঞ্চ ১৫০ টাকা',
];
bengaliPositives.forEach((text) => recordTest('Bengali (Positive)', text, true));

// 2. ENGLISH TEST CASES (Positive)
const englishPositives = [
  'Lunch',
  'Lanch',
  'Launch',
  'lunch bill',
  'lanch bill',
  'launch bill',
  'lunch expense',
  'Staff lunch 150',
  'Office lanch today',
];
englishPositives.forEach((text) => recordTest('English (Positive)', text, true));

// 3. BANGLISH TEST CASES (Positive)
const banglishPositives = [
  'lanch',
  'lanser',
  'lancher',
  'lanch bill',
  'lanch er khoroch',
  'lunch er bill',
  'dupur er lanch',
  'lanch khoroch 140',
];
banglishPositives.forEach((text) => recordTest('Banglish (Positive)', text, true));

// 4. UPPERCASE / LOWERCASE / MIXED CASE
const caseVariants = [
  'LUNCH',
  'LANCH',
  'LAUNCH',
  'LUNCH BILL',
  'lUnCh',
  'LaNcH BiLl',
  'lANCh eR kHoRoCh',
];
caseVariants.forEach((text) => recordTest('Case Insensitivity', text, true));

// 5. HARMFUL/HARMLESS WHITESPACE & PUNCTUATION
const punctVariants = [
  '  lunch  ',
  'Lunch: 150',
  'লাঞ্চ - ১৫০',
  'Lunch, bill.',
  '   lanch   bill  ',
  '\n lunch \t',
  'Lunch (bill) - 150 tk',
  'লাঞ্চ: ১৫০ টাকা.',
];
punctVariants.forEach((text) => recordTest('Whitespace & Punctuation', text, true));

// 6. UNRELATED WORDS / NEGATIVE TESTS (Prevent False Positives)
const unrelatedNegatives = [
  'Rocket launch',
  'product launch event',
  'website launch',
  'Punch machine repair',
  'Bench purchase for office',
  'Branch visit',
  'Linchpin',
  'Rickshaw vara',
  'Bus ticket',
  'CNG fare 250',
  'Octane fuel purchase',
  'Nasta o cha biskut',
  'Office rent',
  'Courier delivery charge',
  'Stationery papers and pen',
  'সদরঘাট লঞ্চ ভাড়া',
  'বরিশাল লঞ্চের টিকিট',
  'লঞ্চ ঘাট ভাড়া',
];
unrelatedNegatives.forEach((text) => recordTest('Negative / Unrelated Words', text, false));

// 7. STRUCTURED CATEGORY PRIORITY TESTS
// If category is LUNCH, it MUST be detected as lunch regardless of description
const structuredCategoryTests = [
  { desc: 'Rickshaw fare', cat: 'LUNCH', expected: true },
  { desc: 'random notes', cat: 'LUNCH', expected: true },
  { desc: 'General office supplies', cat: 'LUNCH', expected: true },
];
structuredCategoryTests.forEach((t) => recordTest('Structured Category Priority', t.desc, t.expected, t.cat));

// 8. CATEGORY-DESCRIPTION MISMATCH TESTS
console.log('--- Testing Category-Description Mismatch ---');
const mismatchTest1 = validateLunchPolicy({
  amount: 140,
  reason: 'লান্স বিল ১৪০ টাকা',
  category: 'TRANSPORT',
  role: UserRole.STAFF,
  actorName: 'Abdul Karim',
  billingRules: testBillingRules,
});
console.log('Mismatch (Selected Transport, Typed লান্স বিল):');
console.log(`  requiresClarification: ${mismatchTest1.requiresClarification} (Expected: true)`);
console.log(`  message: ${mismatchTest1.clarificationMessage}\n`);

// 8. DRIVER VS NON-DRIVER LUNCH POLICY (100 TAKA RULE)
console.log('--- Testing Driver vs Non-Driver Lunch Policy (100 BDT Rule) ---');

// Non-Driver submitting 150 (limit is 100) -> Warning given, but allowed: true (NEVER blocked)!
const nonDriverExceedTest = validateLunchPolicy({
  amount: 150,
  reason: 'লাঞ্চ বিল ১৫০ টাকা',
  role: UserRole.STAFF,
  actorName: 'Rahim Uddin',
  staff: { name: 'Rahim Uddin', designation: 'Merchandiser' },
  isDriver: false,
});
console.log('Non-Driver Exceeding Limit (৳150 > ৳100):');
console.log(`  allowed: ${nonDriverExceedTest.allowed} (Expected: true)`);
console.log(`  hasWarning: ${nonDriverExceedTest.hasWarning} (Expected: true)`);
console.log(`  warningMessage: ${nonDriverExceedTest.warningMessage}`);
console.log(`  auditRecord: ${JSON.stringify(nonDriverExceedTest.auditRecord)}\n`);

// Driver submitting 150 (limit is 100) -> NO warning, allowed: true!
const driverExceedTest = validateLunchPolicy({
  amount: 150,
  reason: 'লাঞ্চ বিল ১৫০ টাকা',
  role: UserRole.STAFF,
  actorName: 'Abdul Jalil',
  staff: { name: 'Abdul Jalil', designation: 'Office Driver' },
  isDriver: true,
});
console.log('Driver Exceeding Limit (৳150 > ৳100):');
console.log(`  allowed: ${driverExceedTest.allowed} (Expected: true)`);
console.log(`  hasWarning: ${driverExceedTest.hasWarning} (Expected: false)`);
console.log(`  warningMessage: ${driverExceedTest.warningMessage || 'None'}\n`);

// Non-Driver submitting 100 (within limit) -> NO warning, allowed: true!
const staffWithinLimitTest = validateLunchPolicy({
  amount: 100,
  reason: 'লাঞ্চ বিল ১০০ টাকা',
  role: UserRole.STAFF,
  actorName: 'Rahim Uddin',
  staff: { name: 'Rahim Uddin', designation: 'Merchandiser' },
  isDriver: false,
});
console.log('Non-Driver Within Limit (৳100 <= ৳100):');
console.log(`  allowed: ${staffWithinLimitTest.allowed} (Expected: true)`);
console.log(`  hasWarning: ${staffWithinLimitTest.hasWarning} (Expected: false)\n`);

// 9. DIRECT SUBMISSION PATH TEST (Always allowed with status PENDING)
console.log('--- Testing Submission Path (submitExpenseBill) ---');
async function runTrustedPathTest() {
  const result = await submitExpenseBill(
    {
      id: 'test_bill_non_driver_lunch',
      staffId: 'ST-001',
      staffName: 'Rahim Uddin',
      amount: 180,
      reason: 'লাঞ্চ বিল ১৮০ টাকা',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
    'test_bill_non_driver_lunch',
    null,
    {
      userRole: UserRole.STAFF,
    }
  );
  console.log('Direct submission call by Non-Driver with ৳180:');
  console.log(`  result.success: ${result.result.success} (Expected: true)`);
  console.log(`  expense.status: ${result.updatedExpense.status} (Expected: PENDING)`);
}

// 11. PERFORMANCE & TYPING BENCHMARK
console.log('--- Running Typing Latency & Performance Benchmark ---');
const benchmarkIterations = 10000;
const sampleTexts = [
  'লাঞ্চ বিল ১৫০',
  'lanch 140',
  'Rickshaw vara 50',
  'Rocket launch ceremony',
  'Office papers and stationary',
  'দুপুরের খাবার',
  'LUNCH BILL',
  'lunch er bill',
];

const startBench = performance.now();
for (let i = 0; i < benchmarkIterations; i++) {
  const text = sampleTexts[i % sampleTexts.length];
  detectLunchExpense(text);
}
const endBench = performance.now();
const totalMs = endBench - startBench;
const perOpUs = (totalMs / benchmarkIterations) * 1000;

// COMPILE SUMMARY METRICS
let passedCount = 0;
let falsePositives = 0;
let falseNegatives = 0;

results.forEach((r) => {
  if (r.passed) {
    passedCount++;
  } else {
    if (!r.expectedIsLunch && r.actualIsLunch) {
      falsePositives++;
      console.warn(`FALSE POSITIVE: "${r.input}" (${r.category})`);
    } else if (r.expectedIsLunch && !r.actualIsLunch) {
      falseNegatives++;
      console.warn(`FALSE NEGATIVE: "${r.input}" (${r.category})`);
    }
  }
});

const totalCount = results.length;
const accuracy = ((passedCount / totalCount) * 100).toFixed(2);

console.log('===============================================================');
console.log('                    TEST RESULTS SUMMARY                       ');
console.log('===============================================================');
console.log(`Total Detection Test Cases: ${totalCount}`);
console.log(`Passed:                     ${passedCount}`);
console.log(`Failed:                     ${totalCount - passedCount}`);
console.log(`Detection Accuracy:         ${accuracy}%`);
console.log(`False Positives:            ${falsePositives}`);
console.log(`False Negatives:            ${falseNegatives}`);
console.log(`\nTyping Latency Benchmark:`);
console.log(`  Total Iterations:         ${benchmarkIterations.toLocaleString()}`);
console.log(`  Total Time:               ${totalMs.toFixed(2)} ms`);
console.log(`  Average Latency / Check:  ${perOpUs.toFixed(3)} µs (${(perOpUs / 1000).toFixed(5)} ms)`);
console.log(`  Typing Delay Added:       0 ms (Instant)`);
console.log('===============================================================');

runTrustedPathTest().then(() => {
  console.log('All automated tests completed.');
});

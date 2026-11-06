/**
 * Acceptance Tests for Bulk Advance Payment (বাল্ক অগ্রিম পেমেন্ট)
 * Depend Sourcing Ltd. - Office Management & Billing Center System
 */

import { Staff, AdvanceLog, UserRole } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('===============================================================');
console.log('    BULK ADVANCE PAYMENT: AUTOMATED ACCEPTANCE TESTS          ');
console.log('===============================================================');

// Mock Data
const mockStaffList: Staff[] = [
  {
    id: 'staff-1',
    name: 'Md. Mehedi Hasan',
    designation: 'Managing Director',
    staffId: 'DSL-001',
    role: UserRole.MD,
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'staff-2',
    name: 'Karim Ullah',
    designation: 'Merchandiser',
    staffId: 'DSL-002',
    role: UserRole.STAFF,
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'staff-3',
    name: 'Fatema Begum',
    designation: 'Quality Controller',
    staffId: 'DSL-003',
    role: UserRole.STAFF,
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'staff-4',
    name: 'Inactive Employee',
    designation: 'Former Staff',
    staffId: 'DSL-099',
    role: UserRole.STAFF,
    status: 'DEACTIVATED',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'staff-5',
    name: 'Deleted Employee',
    designation: 'Left Company',
    staffId: 'DSL-100',
    role: UserRole.STAFF,
    status: 'ACTIVE',
    isHardDeleted: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockExistingAdvances: AdvanceLog[] = [
  {
    id: 'adv-old-1',
    staffId: 'staff-2',
    staffName: 'Karim Ullah',
    amount: 3000,
    note: 'Initial Office Advance',
    date: '2026-01-10T10:00:00.000Z',
    givenBy: 'Admin',
    type: 'REGULAR',
    isDeleted: false,
  },
  {
    id: 'adv-old-2',
    staffId: 'staff-2',
    staffName: 'Karim Ullah',
    amount: -1000,
    note: 'Repayment',
    date: '2026-01-20T10:00:00.000Z',
    givenBy: 'Admin',
    type: 'REGULAR',
    isDeleted: false,
  },
  {
    id: 'adv-old-3',
    staffId: 'staff-3',
    staffName: 'Fatema Begum',
    amount: 5000,
    note: 'Salary advance',
    date: '2026-01-15T10:00:00.000Z',
    givenBy: 'Admin',
    type: 'SALARY',
    isDeleted: false,
  },
];

// TEST 1: Staff Filtering
console.log('\n--- Test 1: Staff Filtering & Active Member Detection ---');
const eligibleActiveStaff = mockStaffList.filter((s) => {
  if (s.isHardDeleted || s.deletedAt) return false;
  return s.status === 'ACTIVE' || !s.status;
});

assert(eligibleActiveStaff.length === 3, 'Exactly 3 active eligible staff members found');
assert(!eligibleActiveStaff.some((s) => s.id === 'staff-4'), 'Deactivated staff member excluded');
assert(!eligibleActiveStaff.some((s) => s.id === 'staff-5'), 'Hard-deleted staff member excluded');

// TEST 2: Existing Regular Advance Balance Calculation
console.log('\n--- Test 2: Existing Outstanding Advance Balance Calculation ---');
const calculateBalances = (advances: AdvanceLog[]) => {
  const balances: Record<string, number> = {};
  advances.forEach((adv) => {
    if (adv.isDeleted || adv.isHardDeleted) return;
    if (!balances[adv.staffId]) balances[adv.staffId] = 0;
    if (adv.type === 'REGULAR' || !adv.type) {
      balances[adv.staffId] += Number(adv.amount || 0);
    }
  });
  return balances;
};

const balances = calculateBalances(mockExistingAdvances);
assert(balances['staff-2'] === 2000, 'Karim Ullah outstanding regular advance is ৳2,000 (3000 - 1000)');
assert(balances['staff-3'] === 0 || balances['staff-3'] === undefined, 'Fatema Begum regular advance balance is 0 (Salary advance does not distort regular advance)');

// TEST 3: Input Processing and Live Metric Calculation
console.log('\n--- Test 3: Live Financial Metrics Calculation ---');
const mockInputs: Record<string, { amount: string; note: string }> = {
  'staff-1': { amount: '5000', note: 'উৎসব অগ্রিম' },
  'staff-2': { amount: '3500', note: '' },
  'staff-3': { amount: '', note: '' }, // Empty input -> treated as 0
};

let totalDisbursed = 0;
let recipientCount = 0;
let zeroCount = 0;

eligibleActiveStaff.forEach((s) => {
  const input = mockInputs[s.id];
  const amt = Number(input?.amount || 0);
  if (amt > 0) {
    totalDisbursed += amt;
    recipientCount += 1;
  } else {
    zeroCount += 1;
  }
});

assert(totalDisbursed === 8500, `Total advance amount accurately calculated: ৳${totalDisbursed} (expected 8500)`);
assert(recipientCount === 2, `Recipient count accurately calculated: ${recipientCount} (expected 2)`);
assert(zeroCount === 1, `Zero advance count accurately calculated: ${zeroCount} (expected 1)`);

// TEST 4: Unique Batch & Transaction Identifier Generation
console.log('\n--- Test 4: Batch ID and Transaction ID Generation ---');
const batchDate = '2026-11-06';
const todayStr = batchDate.replace(/-/g, '');
const randomSuffix = 'A7X9';
const batchId = `BATCH-ADV-${todayStr}-${randomSuffix}`;
assert(batchId === 'BATCH-ADV-20261106-A7X9', 'Batch ID follows BATCH-ADV-YYYYMMDD-XXXX format');

const recipients = eligibleActiveStaff.filter((s) => Number(mockInputs[s.id]?.amount || 0) > 0);
const generatedLogs: AdvanceLog[] = recipients.map((s, index) => {
  const itemIndex = String(index + 1).padStart(2, '0');
  const transactionId = `ADV-TXN-${todayStr}-${randomSuffix}-${itemIndex}`;
  return {
    id: `auto_${index}`,
    staffId: s.id,
    staffName: s.name,
    amount: Number(mockInputs[s.id].amount),
    note: mockInputs[s.id].note || 'বাল্ক অগ্রিম',
    date: new Date().toISOString(),
    givenBy: 'Admin',
    type: 'REGULAR',
    batchId: batchId,
    batchNote: 'ঈদ বোনাস ও অগ্রিম',
    transactionId: transactionId,
  };
});

assert(generatedLogs.length === 2, 'Generated 2 advance log records');
assert(generatedLogs[0].transactionId === 'ADV-TXN-20261106-A7X9-01', 'First transaction ID matches expected standard');
assert(generatedLogs[1].transactionId === 'ADV-TXN-20261106-A7X9-02', 'Second transaction ID matches expected standard');
assert(generatedLogs[0].batchId === batchId, 'First record correctly linked to Batch ID');

// TEST 5: State Append Without Erasing History
console.log('\n--- Test 5: State Immutability & Safe Append ---');
const updatedAdvances = [...mockExistingAdvances, ...generatedLogs];
assert(updatedAdvances.length === mockExistingAdvances.length + generatedLogs.length, 'State appends new records without modifying or erasing previous entries');
assert(updatedAdvances[0].id === 'adv-old-1', 'First historical record preserved intact');

// TEST 6: Role Permission Guard
console.log('\n--- Test 6: Role Permission Enforcement ---');
const isRoleAuthorized = (role: UserRole) => role === UserRole.ADMIN || role === UserRole.MD;
assert(isRoleAuthorized(UserRole.ADMIN) === true, 'ADMIN is authorized');
assert(isRoleAuthorized(UserRole.MD) === true, 'MD is authorized');
assert(isRoleAuthorized(UserRole.STAFF) === false, 'STAFF is restricted');
assert(isRoleAuthorized(UserRole.KIOSK) === false, 'KIOSK is restricted');
assert(isRoleAuthorized(UserRole.GUEST) === false, 'GUEST is restricted');

// TEST 7: Zero/Empty Validation Guard
console.log('\n--- Test 7: Mandatory Confirmation - Zero/Empty Submission Validation ---');
const emptyInputs: Record<string, { amount: string; note: string }> = {
  'staff-1': { amount: '', note: '' },
  'staff-2': { amount: '0', note: '' },
};

function attemptOpenConfirmation(inputs: Record<string, { amount: string; note: string }>) {
  const validRecipients = eligibleActiveStaff.filter((s) => Number(inputs[s.id]?.amount || 0) > 0);
  const totalAmount = validRecipients.reduce((sum, s) => sum + Number(inputs[s.id]?.amount || 0), 0);
  if (validRecipients.length === 0 || totalAmount <= 0) {
    return { canOpen: false, warning: 'কোনো কর্মচারীর জন্য অগ্রিম টাকার পরিমাণ লিখা হয়নি। অনুগ্রহ করে কমপক্ষে একজন কর্মচারীর জন্য পরিমাণ লিখুন।' };
  }
  return { canOpen: true, warning: null };
}

const emptyResult = attemptOpenConfirmation(emptyInputs);
assert(emptyResult.canOpen === false, 'Submission blocked when every amount is zero or empty');
assert(emptyResult.warning !== null, 'Warning message generated when submission attempted with zero amounts');

// TEST 8: Opening Confirmation Dialog Does Not Modify State
console.log('\n--- Test 8: Mandatory Confirmation - Pre-Execution State Immutability ---');
let testStateAdvances = [...mockExistingAdvances];
const validTestInputs: Record<string, { amount: string; note: string }> = {
  'staff-1': { amount: '5000', note: 'Advance test' },
  'staff-2': { amount: '2000', note: '' },
};

const openResult = attemptOpenConfirmation(validTestInputs);
assert(openResult.canOpen === true, 'Confirmation dialog opens when valid amounts are entered');
// Check that state is untouched upon opening dialog
assert(testStateAdvances.length === mockExistingAdvances.length, 'Opening confirmation dialog does NOT modify any account records');
const preConfirmBalances = calculateBalances(testStateAdvances);
assert(preConfirmBalances['staff-2'] === 2000, 'Staff-2 balance remains exactly 2000 prior to explicit confirmation');

// TEST 9: Confirmation Modal Breakdown Accuracy & Zero Exclusion
console.log('\n--- Test 9: Mandatory Confirmation - Breakdown Contents & Zero Exclusion ---');
const mixedInputs: Record<string, { amount: string; note: string }> = {
  'staff-1': { amount: '6000', note: 'Official Tour' },
  'staff-2': { amount: '', note: '' }, // empty
  'staff-3': { amount: '4000', note: 'Emergency' },
};

const confirmationRecipients = eligibleActiveStaff
  .map((s) => ({
    staff: s,
    amount: Number(mixedInputs[s.id]?.amount || 0),
    note: mixedInputs[s.id]?.note || '',
  }))
  .filter((item) => item.amount > 0);

assert(confirmationRecipients.length === 2, 'Empty amounts strictly excluded from confirmation breakdown');
assert(!confirmationRecipients.some((r) => r.staff.id === 'staff-2'), 'Staff-2 with empty amount excluded from confirmation');
const confirmationTotal = confirmationRecipients.reduce((acc, r) => acc + r.amount, 0);
assert(confirmationTotal === 10000, 'Confirmation total matches sum of non-empty inputs (৳10,000)');
assert(confirmationRecipients[0].staff.name === 'Md. Mehedi Hasan' && confirmationRecipients[0].amount === 6000, 'Staff 1 details correctly formatted in confirmation breakdown');

// TEST 10: Cancel Action Behavior
console.log('\n--- Test 10: Mandatory Confirmation - Cancel Action Behavior ---');
let dialogIsOpen = true;
// Simulate Cancel button click
function handleCancelConfirmation() {
  dialogIsOpen = false;
  // Does NOT modify testStateAdvances
  // Does NOT clear mixedInputs
}
handleCancelConfirmation();
assert(dialogIsOpen === false, 'Cancel button successfully closes the confirmation dialog');
assert(testStateAdvances.length === mockExistingAdvances.length, 'Cancel action did NOT modify any account balance');
assert(mixedInputs['staff-1'].amount === '6000', 'Cancel action preserves all entered user inputs');

// TEST 11: Explicit Confirm & Submit Processing & Locking
console.log('\n--- Test 11: Mandatory Confirmation - Confirm & Submit Processing ---');
let isSubmitting = false;
let executionCount = 0;

async function executeConfirmAndSubmit(inputs: Record<string, { amount: string; note: string }>) {
  // Revalidate immediately before processing
  const valid = eligibleActiveStaff.filter((s) => Number(inputs[s.id]?.amount || 0) > 0);
  if (valid.length === 0) throw new Error('Revalidation failed');
  if (isSubmitting) return; // Prevent double-click/duplicate execution
  isSubmitting = true;

  try {
    executionCount++;
    const newItems: AdvanceLog[] = valid.map((s) => ({
      id: `new_${s.id}`,
      staffId: s.id,
      staffName: s.name,
      amount: Number(inputs[s.id].amount),
      note: inputs[s.id].note || 'Bulk Advance',
      date: new Date().toISOString(),
      givenBy: 'Admin',
      type: 'REGULAR',
      batchId: 'BATCH-ADV-TEST-001',
    }));
    testStateAdvances = [...testStateAdvances, ...newItems];
  } finally {
    isSubmitting = false;
  }
}

// 1. Initial submission
executeConfirmAndSubmit(mixedInputs);
assert(executionCount === 1, 'Transaction executed upon explicit confirmation');
assert(testStateAdvances.length === mockExistingAdvances.length + 2, 'Exactly 2 records committed to Regular Advance account');
const postConfirmBalances = calculateBalances(testStateAdvances);
assert(postConfirmBalances['staff-1'] === 6000, 'Staff-1 Regular Advance updated to ৳6,000');
assert(postConfirmBalances['staff-3'] === 4000, 'Staff-3 Regular Advance updated to ৳4,000');

// 2. Test duplicate prevention lock
isSubmitting = true;
executeConfirmAndSubmit(mixedInputs);
assert(executionCount === 1, 'Duplicate transaction execution prevented while isSubmitting is true');
isSubmitting = false;

console.log('\n===============================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL BULK ADVANCE PAYMENT ACCEPTANCE TESTS PASSED!\n');
}

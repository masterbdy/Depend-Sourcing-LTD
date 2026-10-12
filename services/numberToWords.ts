/**
 * Number to Words converter for Bangladeshi Taka (BDT)
 * Supports both English and Bengali translations with accurate financial formatting.
 */

const ONES_EN = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS_EN = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const ONES_BN = [
  '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টআশি', 'ঊননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

function convertBelowThousandEn(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES_EN[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS_EN[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES_EN[n % 10] : '');
  } else if (n > 0) {
    str += ONES_EN[n];
  }
  return str.trim();
}

/**
 * Converts a numeric amount to English words using the Subcontinent format (Crore, Lac, Thousand, Hundred).
 */
export function numberToWordsEnglish(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Taka Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'Zero Taka Only';

  let n = integerPart;
  const parts: string[] = [];

  // Crores (1,00,00,000)
  if (n >= 10000000) {
    const crore = Math.floor(n / 10000000);
    parts.push(numberToWordsEnglish(crore).replace(' Taka Only', '') + ' Crore');
    n %= 10000000;
  }

  // Lacs (1,00,000)
  if (n >= 100000) {
    const lac = Math.floor(n / 100000);
    parts.push(convertBelowThousandEn(lac) + ' Lac');
    n %= 100000;
  }

  // Thousands (1,000)
  if (n >= 1000) {
    const thousand = Math.floor(n / 1000);
    parts.push(convertBelowThousandEn(thousand) + ' Thousand');
    n %= 1000;
  }

  // Hundreds and remainder
  if (n > 0) {
    parts.push(convertBelowThousandEn(n));
  }

  let result = (isNegative ? 'Minus ' : '') + parts.join(' ').trim() + ' Taka';

  if (decimalPart > 0) {
    result += ' and ' + convertBelowThousandEn(decimalPart) + ' Paisa';
  }

  return result + ' Only';
}

function convertBelowThousandBn(n: number): string {
  let str = '';
  if (n >= 100) {
    const hundred = Math.floor(n / 100);
    str += (ONES_BN[hundred] || '') + ' শত ';
    n %= 100;
  }
  if (n > 0) {
    str += ONES_BN[n] || '';
  }
  return str.trim();
}

/**
 * Converts a numeric amount to Bengali words (কোটি, লক্ষ, হাজার, শত, টাকা মাত্র).
 */
export function numberToWordsBengali(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'শূন্য টাকা মাত্র';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'শূন্য টাকা মাত্র';

  let n = integerPart;
  const parts: string[] = [];

  // কোটি (১,০০,০০,০০০)
  if (n >= 10000000) {
    const crore = Math.floor(n / 10000000);
    parts.push(numberToWordsBengali(crore).replace(' টাকা মাত্র', '') + ' কোটি');
    n %= 10000000;
  }

  // লক্ষ (১,০০,০০০)
  if (n >= 100000) {
    const lac = Math.floor(n / 100000);
    parts.push((ONES_BN[lac] || convertBelowThousandBn(lac)) + ' লক্ষ');
    n %= 100000;
  }

  // হাজার (১,০০০)
  if (n >= 1000) {
    const thousand = Math.floor(n / 1000);
    parts.push((ONES_BN[thousand] || convertBelowThousandBn(thousand)) + ' হাজার');
    n %= 1000;
  }

  // শত ও বাকি
  if (n > 0) {
    parts.push(convertBelowThousandBn(n));
  }

  let result = (isNegative ? 'ঋণাত্মক ' : '') + parts.join(' ').trim() + ' টাকা';

  if (decimalPart > 0) {
    const paisaText = ONES_BN[decimalPart] || String(decimalPart);
    result += ' ' + paisaText + ' পয়সা';
  }

  return result + ' মাত্র';
}

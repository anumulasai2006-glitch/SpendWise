/**
 * SMS & Financial Transaction Parsing Engine
 * Detects financial transactions and extracts amount, merchant, date, type, and payment mode.
 */

class ParserService {
  /**
   * Check if the message is likely a financial transaction notification
   */
  static isFinancialMessage(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();

    // Financial keywords
    const indicators = [
      'debited', 'credited', 'spent', 'paid', 'sent', 'transferred',
      'received', 'withdrawn', 'txn', 'transaction', 'vpa', 'upi',
      'inr', 'rs.', 'rs ', '₹', 'usd', '$', 'a/c', 'acct', 'card'
    ];

    const matchCount = indicators.reduce((acc, curr) => (lower.includes(curr) ? acc + 1 : acc), 0);
    return matchCount >= 2;
  }

  /**
   * Extract transaction details from raw text
   */
  static parseMessage(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Message text is required');
    }

    const cleanText = rawText.trim();
    const isFinancial = this.isFinancialMessage(cleanText);

    // 1. Transaction Type (debit vs credit)
    const lower = cleanText.toLowerCase();
    let txnType = 'debit';
    if (
      lower.includes('credited') ||
      lower.includes('received') ||
      lower.includes('refund') ||
      lower.includes('cashback') ||
      lower.includes('deposited')
    ) {
      txnType = 'credit';
    } else if (
      lower.includes('debited') ||
      lower.includes('spent') ||
      lower.includes('paid') ||
      lower.includes('sent') ||
      lower.includes('purchase') ||
      lower.includes('withdrawn')
    ) {
      txnType = 'debit';
    }

    // 2. Extract Amount
    // Handles: Rs. 1,234.50, INR 500, ₹2,500.00, $45.99, Rs 300, 450.00 debited
    const amountRegexes = [
      /(?:(?:inr|rs\.?|₹|\$)\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:debited|credited|spent|paid|transferred|amount)\s*(?:by|of)?\s*(?:(?:inr|rs\.?|₹|\$)\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:inr|rs\.?|₹)/i
    ];

    let amount = null;
    for (const regex of amountRegexes) {
      const match = cleanText.match(regex);
      if (match && match[1]) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          amount = parsed;
          break;
        }
      }
    }

    // 3. Extract Merchant / Payee
    let merchant = this.extractMerchant(cleanText);

    // 4. Extract Date
    let date = this.extractDate(cleanText) || new Date();

    // 5. Detect Payment Mode & Source
    let paymentMode = 'UPI';
    if (/card|credit card|debit card|visa|mastercard|rupay/i.test(cleanText)) {
      paymentMode = 'Card';
    } else if (/netbanking|neft|imps|rtgs/i.test(cleanText)) {
      paymentMode = 'NetBanking';
    } else if (/cash/i.test(cleanText)) {
      paymentMode = 'Cash';
    } else if (/upi|vpa|phonepe|gpay|google pay|paytm|bhim/i.test(cleanText)) {
      paymentMode = 'UPI';
    } else {
      paymentMode = 'Other';
    }

    // Calculate confidence score
    let confidence = 0;
    if (isFinancial) confidence += 30;
    if (amount !== null) confidence += 35;
    if (merchant && merchant !== 'Unknown Merchant') confidence += 25;
    if (date) confidence += 10;

    return {
      isFinancial,
      amount: amount || 0,
      merchant: merchant || 'Unknown Merchant',
      date: date.toISOString(),
      txnType,
      paymentMode,
      source: 'detected',
      confidence,
      rawMessage: cleanText
    };
  }

  /**
   * Helper to extract merchant name from patterns
   */
  static extractMerchant(text) {
    const patterns = [
      // "at ZOMATO on", "at SWIGGY Ref", "at Starbucks"
      /(?:at|to|towards|vpa|info\/)\s+([A-Za-z0-9&.\-_'\s]{2,30}?)(?=\s+(?:on|using|via|ref|upi|avl|bal|avail|dated|from|card|\.|\,|$))/i,
      // "trf to [MERCHANT]"
      /(?:trf to|paid to|transferred to)\s+([A-Za-z0-9&.\-_'\s]{2,30}?)(?=\s+(?:on|using|via|ref|upi|avl|bal|dated|\.|\,|$))/i,
      // "spent on your ... at [MERCHANT]"
      /spent on your [A-Za-z0-9\s]+ at\s+([A-Za-z0-9&.\-_'\s]{2,30}?)(?=\s+(?:on|dated|\.|\,|$))/i,
      // UPI VPA pattern: merchant@okaxis
      /to\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // remove unwanted punctuation or common trailing words
        name = name.replace(/^(the|a)\s+/i, '');
        name = name.replace(/\s+(a\/c|acct|ending|bank)$/i, '');
        if (name.length > 1 && !/^(inr|rs|debited|credited|your|account)$/i.test(name)) {
          return this.formatMerchantName(name);
        }
      }
    }

    // Common Indian & Global popular merchants detection
    const commonMerchants = [
      'Swiggy', 'Zomato', 'Uber', 'Ola', 'Amazon', 'Flipkart', 'Blinkit',
      'Zepto', 'Instamart', 'BigBasket', 'Myntra', 'Netflix', 'Spotify',
      'BookMyShow', 'Apollo', 'PharmEasy', 'Airtel', 'Jio', 'Bescom',
      'Starbucks', 'McDonalds', 'Dominos', 'KFC', 'Cult.fit', 'IRCTC', 'MakeMyTrip'
    ];

    for (const cm of commonMerchants) {
      const regex = new RegExp(`\\b${cm}\\b`, 'i');
      if (regex.test(text)) {
        return cm;
      }
    }

    return 'Unknown Merchant';
  }

  /**
   * Helper to format merchant name nicely (Title Case)
   */
  static formatMerchantName(name) {
    if (!name) return 'Unknown Merchant';
    // If it's a UPI ID, extract the name portion
    if (name.includes('@')) {
      name = name.split('@')[0];
    }

    const clean = name
      .replace(/[\._\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const lower = clean.toLowerCase();
    if (lower.includes('amzn') || lower.includes('amazon')) return 'Amazon';
    if (lower.includes('flipkart')) return 'Flipkart';
    if (lower.includes('swiggy')) return 'Swiggy';
    if (lower.includes('zomato')) return 'Zomato';
    if (lower.includes('uber')) return 'Uber';
    if (lower.includes('ola')) return 'Ola';
    if (lower.includes('blinkit')) return 'Blinkit';
    if (lower.includes('zepto')) return 'Zepto';
    if (lower.includes('starbucks')) return 'Starbucks';
    if (lower.includes('mcdonald')) return 'McDonalds';

    return clean
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Helper to parse dates from message
   */
  static extractDate(text) {
    // Patterns: 24-Oct-24, 24/10/2024, 2024-10-24, 24-10-2024, 24 Oct 2024
    const dateRegexes = [
      /(\d{1,2})[-\/]([a-zA-Z]{3}|\d{1,2})[-\/](\d{2,4})/,
      /(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{2,4})/,
      /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
    ];

    for (const regex of dateRegexes) {
      const match = text.match(regex);
      if (match) {
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return null;
  }
}

module.exports = ParserService;

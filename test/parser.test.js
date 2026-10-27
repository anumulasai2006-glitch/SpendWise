const assert = require('assert');
const ParserService = require('../services/parserService');
const CategorizationService = require('../services/categorizationService');

console.log('🧪 Testing SpendWise Parser & Categorization Engines...\n');

const testCases = [
  {
    sms: "A/c *4021 debited by Rs. 450.00 on 24-Oct-24 to Swiggy. UPI Ref: 429381928394. Avl Bal: Rs 14,230.00",
    expectedAmount: 450,
    expectedType: 'debit',
    expectedMerchant: 'Swiggy',
    expectedCategory: 'Food',
    expectedMode: 'UPI'
  },
  {
    sms: "INR 1,299.00 spent on your HDFC Bank Card ending 5678 at ZOMATO on 2024-10-25. Avail Limit: INR 84,000.",
    expectedAmount: 1299,
    expectedType: 'debit',
    expectedMerchant: 'Zomato',
    expectedCategory: 'Food',
    expectedMode: 'Card'
  },
  {
    sms: "Paid Rs. 350 to Uber via PhonePe on 26 Oct 2024. Transaction ID: T241026110294.",
    expectedAmount: 350,
    expectedType: 'debit',
    expectedMerchant: 'Uber',
    expectedCategory: 'Transport',
    expectedMode: 'UPI'
  },
  {
    sms: "Dear SBI User, your A/c ending 9012 debited by Rs 1850.00 on 23/10/24 trf to Blinkit. UPI: 30192841.",
    expectedAmount: 1850,
    expectedType: 'debit',
    expectedMerchant: 'Blinkit',
    expectedCategory: 'Groceries',
    expectedMode: 'UPI'
  },
  {
    sms: "Sent Rs. 2,499.00 to AMZN Mktp using Google Pay on 22 Oct 2024. Ref: 42918392.",
    expectedAmount: 2499,
    expectedType: 'debit',
    expectedMerchant: 'Amazon',
    expectedCategory: 'Shopping',
    expectedMode: 'UPI'
  },
  {
    sms: "Txn of INR 999.00 done on ICICI Bank NetBanking at Airtel Broadband on 20-Oct-2024.",
    expectedAmount: 999,
    expectedType: 'debit',
    expectedMerchant: 'Airtel Broadband',
    expectedCategory: 'Bills',
    expectedMode: 'NetBanking'
  },
  {
    sms: "Credited INR 75,000.00 to A/c *4021 on 01-Oct-2024 by Tech Corp Salary. Avl Bal: INR 94,500.",
    expectedAmount: 75000,
    expectedType: 'credit'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((tc, idx) => {
  try {
    const parsed = ParserService.parseMessage(tc.sms);
    const categoryResult = CategorizationService.predictCategory(parsed.merchant, parsed.rawMessage);

    assert.strictEqual(parsed.amount, tc.expectedAmount, `Amount mismatch: expected ${tc.expectedAmount}, got ${parsed.amount}`);
    assert.strictEqual(parsed.txnType, tc.expectedType, `Type mismatch: expected ${tc.expectedType}, got ${parsed.txnType}`);
    
    if (tc.expectedMerchant) {
      assert.ok(
        parsed.merchant.toLowerCase().includes(tc.expectedMerchant.toLowerCase()) ||
        tc.expectedMerchant.toLowerCase().includes(parsed.merchant.toLowerCase()),
        `Merchant mismatch: expected '${tc.expectedMerchant}', got '${parsed.merchant}'`
      );
    }

    if (tc.expectedCategory) {
      assert.strictEqual(categoryResult.categoryName, tc.expectedCategory, `Category mismatch: expected ${tc.expectedCategory}, got ${categoryResult.categoryName}`);
    }

    if (tc.expectedMode) {
      assert.strictEqual(parsed.paymentMode, tc.expectedMode, `Mode mismatch: expected ${tc.expectedMode}, got ${parsed.paymentMode}`);
    }

    console.log(`✅ Test Case #${idx + 1} Passed: [${parsed.txnType.toUpperCase()}] ₹${parsed.amount} | ${parsed.merchant} | ${categoryResult.categoryName} (${parsed.paymentMode})`);
    passed++;
  } catch (err) {
    console.error(`❌ Test Case #${idx + 1} Failed: ${err.message}`);
    failed++;
  }
});

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const Trip = require('../models/Trip');

const defaultCategories = [
  { name: 'Food', icon: 'fa-utensils', color: '#F97316' },
  { name: 'Groceries', icon: 'fa-basket-shopping', color: '#10B981' },
  { name: 'Transport', icon: 'fa-car', color: '#3B82F6' },
  { name: 'Shopping', icon: 'fa-bag-shopping', color: '#EC4899' },
  { name: 'Bills', icon: 'fa-file-invoice-dollar', color: '#8B5CF6' },
  { name: 'Entertainment', icon: 'fa-film', color: '#EF4444' },
  { name: 'Travel', icon: 'fa-plane', color: '#06B6D4' },
  { name: 'Health', icon: 'fa-heart-pulse', color: '#14B8A6' },
  { name: 'Others', icon: 'fa-ellipsis', color: '#64748B' }
];

async function seedCategories() {
  try {
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        { ...cat },
        { upsert: true, new: true }
      );
    }
    console.log(' Default categories ensured.');

    // If no expenses exist, seed initial sample data for an immediate interactive demo
    const expenseCount = await Expense.countDocuments();
    if (expenseCount === 0) {
      console.log(' Seeding sample financial data for demo...');
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Sample budget
      await Budget.findOneAndUpdate(
        { month: currentMonth, year: currentYear },
        { amount: 35000, notes: 'Monthly personal budget' },
        { upsert: true }
      );

      // Sample trip
      const sampleTrip = await Trip.create({
        name: 'Goa Weekend Getaway',
        destination: 'Goa, India',
        startDate: new Date(currentYear, currentMonth - 1, 5),
        endDate: new Date(currentYear, currentMonth - 1, 9),
        budget: 15000,
        notes: 'Beach resort, scooty rental & seafood'
      });

      // Categories map
      const cats = await Category.find();
      const catMap = {};
      cats.forEach(c => { catMap[c.name] = c._id; });

      const sampleExpenses = [
        {
          amount: 450,
          userShare: 450,
          merchant: 'Swiggy',
          date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 2)),
          txnType: 'debit',
          source: 'detected',
          paymentMode: 'UPI',
          category: catMap['Food'],
          note: 'Dinner biryani order',
          rawMessage: 'A/c *4021 debited by Rs. 450.00 on 24-Oct-24 to Swiggy. UPI Ref: 429381928'
        },
        {
          amount: 1850,
          userShare: 1850,
          merchant: 'Blinkit',
          date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 3)),
          txnType: 'debit',
          source: 'detected',
          paymentMode: 'UPI',
          category: catMap['Groceries'],
          note: 'Weekly essentials and milk',
          rawMessage: 'Rs. 1850 paid to Blinkit on 23 Oct 2024 via PhonePe'
        },
        {
          amount: 320,
          userShare: 320,
          merchant: 'Uber',
          date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 1)),
          txnType: 'debit',
          source: 'detected',
          paymentMode: 'UPI',
          category: catMap['Transport'],
          note: 'Office commute',
          rawMessage: 'INR 320.00 spent on HDFC card at UBER on 25-Oct-2024'
        },
        {
          amount: 2400,
          userShare: 800, // Group split!
          merchant: 'Social Pub & Cafe',
          date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 4)),
          txnType: 'debit',
          source: 'manual',
          paymentMode: 'Card',
          isGroup: true,
          groupPeople: ['Rahul', 'Priya', 'Sai'],
          category: catMap['Food'],
          note: 'Team celebration - split 3 ways'
        },
        {
          amount: 1299,
          userShare: 1299,
          merchant: 'Amazon',
          date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 5)),
          txnType: 'debit',
          source: 'detected',
          paymentMode: 'Card',
          category: catMap['Shopping'],
          note: 'Ergonomic mouse',
          rawMessage: 'Sent Rs. 1,299.00 to AMZN Mktp using Google Pay'
        },
        {
          amount: 1999,
          userShare: 1999,
          merchant: 'Airtel Broadband',
          date: new Date(currentYear, currentMonth - 1, 2),
          txnType: 'debit',
          source: 'detected',
          paymentMode: 'NetBanking',
          category: catMap['Bills'],
          note: 'Home Fiber bill'
        },
        {
          amount: 4500,
          userShare: 4500,
          merchant: 'Taj Holiday Village',
          date: new Date(currentYear, currentMonth - 1, 6),
          txnType: 'debit',
          source: 'manual',
          paymentMode: 'Card',
          trip: sampleTrip._id,
          category: catMap['Travel'],
          note: 'Resort advance booking'
        }
      ];

      await Expense.insertMany(sampleExpenses);
      console.log(' Sample demo data seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding categories/sample data:', err);
  }
}

module.exports = seedCategories;

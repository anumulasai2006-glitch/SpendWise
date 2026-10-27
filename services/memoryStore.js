/**
 * In-Memory Database Fallback Store
 * Enables SpendWise to run instantaneously for testing and evaluation
 * even when a live MongoDB instance is not connected.
 */

class MemoryStore {
  constructor() {
    this.categories = [
      { _id: 'cat_food', name: 'Food', icon: 'fa-utensils', color: '#F97316' },
      { _id: 'cat_groceries', name: 'Groceries', icon: 'fa-basket-shopping', color: '#10B981' },
      { _id: 'cat_transport', name: 'Transport', icon: 'fa-car', color: '#3B82F6' },
      { _id: 'cat_shopping', name: 'Shopping', icon: 'fa-bag-shopping', color: '#EC4899' },
      { _id: 'cat_bills', name: 'Bills', icon: 'fa-file-invoice-dollar', color: '#8B5CF6' },
      { _id: 'cat_entertainment', name: 'Entertainment', icon: 'fa-film', color: '#EF4444' },
      { _id: 'cat_travel', name: 'Travel', icon: 'fa-plane', color: '#06B6D4' },
      { _id: 'cat_health', name: 'Health', icon: 'fa-heart-pulse', color: '#14B8A6' },
      { _id: 'cat_others', name: 'Others', icon: 'fa-ellipsis', color: '#64748B' }
    ];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    this.budgets = [
      {
        _id: 'b_current',
        month: currentMonth,
        year: currentYear,
        amount: 35000,
        notes: 'Monthly personal budget'
      }
    ];

    this.trips = [
      {
        _id: 'trip_goa',
        name: 'Goa Weekend Getaway',
        destination: 'Goa, India',
        startDate: new Date(currentYear, currentMonth - 1, 5),
        endDate: new Date(currentYear, currentMonth - 1, 9),
        budget: 15000,
        notes: 'Beach resort, scooty rental & seafood',
        createdAt: new Date()
      }
    ];

    this.expenses = [
      {
        _id: 'exp_1',
        amount: 450,
        userShare: 450,
        merchant: 'Swiggy',
        date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 2)),
        txnType: 'debit',
        source: 'detected',
        paymentMode: 'UPI',
        isGroup: false,
        groupPeople: [],
        category: this.categories[0], // Food
        trip: null,
        note: 'Dinner biryani order',
        rawMessage: 'A/c *4021 debited by Rs. 450.00 on 24-Oct-24 to Swiggy. UPI Ref: 429381928'
      },
      {
        _id: 'exp_2',
        amount: 1850,
        userShare: 1850,
        merchant: 'Blinkit',
        date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 3)),
        txnType: 'debit',
        source: 'detected',
        paymentMode: 'UPI',
        isGroup: false,
        groupPeople: [],
        category: this.categories[1], // Groceries
        trip: null,
        note: 'Weekly essentials and milk'
      },
      {
        _id: 'exp_3',
        amount: 320,
        userShare: 320,
        merchant: 'Uber',
        date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 1)),
        txnType: 'debit',
        source: 'detected',
        paymentMode: 'UPI',
        isGroup: false,
        groupPeople: [],
        category: this.categories[2], // Transport
        trip: null,
        note: 'Office commute'
      },
      {
        _id: 'exp_4',
        amount: 2400,
        userShare: 800,
        merchant: 'Social Pub & Cafe',
        date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 4)),
        txnType: 'debit',
        source: 'manual',
        paymentMode: 'Card',
        isGroup: true,
        groupPeople: ['Rahul', 'Priya', 'Sai'],
        category: this.categories[0], // Food
        trip: null,
        note: 'Team celebration - split 3 ways'
      },
      {
        _id: 'exp_5',
        amount: 1299,
        userShare: 1299,
        merchant: 'Amazon',
        date: new Date(currentYear, currentMonth - 1, Math.max(1, now.getDate() - 5)),
        txnType: 'debit',
        source: 'detected',
        paymentMode: 'Card',
        isGroup: false,
        groupPeople: [],
        category: this.categories[3], // Shopping
        trip: null,
        note: 'Ergonomic mouse'
      },
      {
        _id: 'exp_6',
        amount: 1999,
        userShare: 1999,
        merchant: 'Airtel Broadband',
        date: new Date(currentYear, currentMonth - 1, 2),
        txnType: 'debit',
        source: 'detected',
        paymentMode: 'NetBanking',
        isGroup: false,
        groupPeople: [],
        category: this.categories[4], // Bills
        trip: null,
        note: 'Home Fiber bill'
      },
      {
        _id: 'exp_7',
        amount: 4500,
        userShare: 4500,
        merchant: 'Taj Holiday Village',
        date: new Date(currentYear, currentMonth - 1, 6),
        txnType: 'debit',
        source: 'manual',
        paymentMode: 'Card',
        isGroup: false,
        groupPeople: [],
        category: this.categories[6], // Travel
        trip: this.trips[0],
        note: 'Resort advance booking'
      }
    ];
  }

  // Categories
  getCategories() {
    return [...this.categories];
  }

  getCategoryByName(name) {
    return this.categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || this.categories[this.categories.length - 1];
  }

  getCategoryById(id) {
    return this.categories.find(c => c._id === id) || this.categories[0];
  }

  // Expenses
  getExpenses(filter = {}) {
    let list = [...this.expenses];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(e => e.merchant.toLowerCase().includes(q) || (e.note && e.note.toLowerCase().includes(q)));
    }
    if (filter.category) {
      list = list.filter(e => (e.category?._id || e.category) === filter.category);
    }
    if (filter.txnType) {
      list = list.filter(e => e.txnType === filter.txnType);
    }
    if (filter.trip) {
      list = list.filter(e => (e.trip?._id || e.trip) === filter.trip);
    }

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addExpense(data) {
    const categoryDoc = this.getCategoryById(data.category) || this.getCategoryByName('Food');
    const tripDoc = data.trip ? this.trips.find(t => t._id === data.trip) : null;

    const newExpense = {
      _id: 'exp_' + Date.now(),
      amount: Number(data.amount),
      userShare: Number(data.userShare || data.amount),
      merchant: data.merchant,
      date: data.date ? new Date(data.date) : new Date(),
      txnType: data.txnType || 'debit',
      source: data.source || 'manual',
      paymentMode: data.paymentMode || 'UPI',
      isGroup: Boolean(data.isGroup),
      groupPeople: data.groupPeople || [],
      note: data.note || '',
      category: categoryDoc,
      trip: tripDoc,
      rawMessage: data.rawMessage || null,
      createdAt: new Date()
    };

    this.expenses.unshift(newExpense);
    return newExpense;
  }

  updateExpense(id, data) {
    const idx = this.expenses.findIndex(e => e._id === id);
    if (idx === -1) return null;

    if (data.category) {
      data.category = this.getCategoryById(data.category);
    }
    if (data.trip) {
      data.trip = this.trips.find(t => t._id === data.trip);
    }

    this.expenses[idx] = { ...this.expenses[idx], ...data };
    return this.expenses[idx];
  }

  deleteExpense(id) {
    const idx = this.expenses.findIndex(e => e._id === id);
    if (idx === -1) return false;
    this.expenses.splice(idx, 1);
    return true;
  }

  checkDuplicate({ amount, merchant, date }) {
    const txnDate = date ? new Date(date) : new Date();
    const dateStr = txnDate.toDateString();

    const match = this.expenses.find(e => {
      const matchAmt = Number(e.amount) === Number(amount);
      const matchMerch = e.merchant.toLowerCase() === merchant.trim().toLowerCase();
      const matchDate = new Date(e.date).toDateString() === dateStr;
      return matchAmt && matchMerch && matchDate;
    });

    if (match) {
      return {
        isDuplicate: true,
        reason: `Exact match found for ${merchant} of ₹${amount} on ${txnDate.toLocaleDateString()}`,
        existingExpense: match
      };
    }

    return { isDuplicate: false };
  }

  // Budgets
  getBudget(month, year) {
    return this.budgets.find(b => b.month === month && b.year === year) || null;
  }

  setBudget(month, year, amount, notes = '') {
    let b = this.budgets.find(item => item.month === month && item.year === year);
    if (b) {
      b.amount = amount;
      b.notes = notes;
    } else {
      b = { _id: 'b_' + Date.now(), month, year, amount, notes };
      this.budgets.push(b);
    }
    return b;
  }

  // Trips
  getTrips() {
    return [...this.trips];
  }

  getTripById(id) {
    return this.trips.find(t => t._id === id) || null;
  }

  addTrip(data) {
    const newTrip = {
      _id: 'trip_' + Date.now(),
      name: data.name,
      destination: data.destination || '',
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : null,
      budget: Number(data.budget) || 0,
      notes: data.notes || '',
      createdAt: new Date()
    };
    this.trips.unshift(newTrip);
    return newTrip;
  }

  deleteTrip(id) {
    const idx = this.trips.findIndex(t => t._id === id);
    if (idx === -1) return false;
    this.trips.splice(idx, 1);
    // Unassign expenses
    this.expenses.forEach(e => {
      if (e.trip && e.trip._id === id) e.trip = null;
    });
    return true;
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;

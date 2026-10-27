const Category = require('../models/Category');

/**
 * Smart Categorization Service
 * Classifies transactions into Food, Transport, Shopping, Bills, Travel, etc.
 * using keyword mapping, merchant analysis, and heuristic rules.
 */
class CategorizationService {
  static categoryRules = {
    'Food': {
      keywords: [
        'swiggy', 'zomato', 'mcdonalds', 'kfc', 'burger king', 'starbucks',
        'pizza hut', 'dominos', 'subway', 'cafe', 'restaurant', 'dine',
        'biryani', 'food', 'chaayos', 'chai', 'tea', 'bakery', 'bar',
        'pub', 'bistro', 'eat', 'eats', 'dhaba', 'kitchen', 'hotel'
      ],
      icon: 'fa-utensils',
      color: '#F97316'
    },
    'Groceries': {
      keywords: [
        'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'nature basket',
        'supermarket', 'grocery', 'groceries', 'vegetables', 'fruits',
        'milk', 'dairy', 'provision', 'spencers', 'more retail', 'kirana'
      ],
      icon: 'fa-basket-shopping',
      color: '#10B981'
    },
    'Transport': {
      keywords: [
        'uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'petrol',
        'diesel', 'fuel', 'shell', 'hpcl', 'bpcl', 'iocl', 'cng', 'parking',
        'toll', 'fastag', 'auto', 'cab', 'taxi', 'bus', 'redbus', 'chalo'
      ],
      icon: 'fa-car',
      color: '#3B82F6'
    },
    'Shopping': {
      keywords: [
        'amazon', 'amzn', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m',
        'meesho', 'nykaa', 'tata cliq', 'decathlon', 'croma', 'reliance digital',
        'uniqlo', 'shoppers stop', 'mall', 'clothing', 'apparel', 'electronics'
      ],
      icon: 'fa-bag-shopping',
      color: '#EC4899'
    },
    'Bills': {
      keywords: [
        'bescom', 'electricity', 'water bill', 'gas', 'indane', 'hp gas',
        'airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'broadband', 'wifi',
        'fiber', 'recharge', 'dth', 'tata play', 'dish tv', 'rent', 'society',
        'maintenance', 'piped gas', 'utility'
      ],
      icon: 'fa-file-invoice-dollar',
      color: '#8B5CF6'
    },
    'Entertainment': {
      keywords: [
        'netflix', 'hotstar', 'prime video', 'primevideo', 'spotify',
        'bookmyshow', 'cinema', 'pvr', 'inox', 'movie', 'steam', 'playstation',
        'youtube', 'gaming', 'apple.com/bill', 'itunes', 'disney', 'event'
      ],
      icon: 'fa-film',
      color: '#EF4444'
    },
    'Travel': {
      keywords: [
        'makemytrip', 'make my trip', 'goibibo', 'agoda', 'booking.com',
        'airbnb', 'indigo', 'air india', 'vistara', 'spicejet', 'flight',
        'hotel booking', 'resort', 'homestay', 'travels', 'trip'
      ],
      icon: 'fa-plane',
      color: '#06B6D4'
    },
    'Health': {
      keywords: [
        'apollo', 'pharmeasy', '1mg', 'tata 1mg', 'netmeds', 'clinic',
        'hospital', 'doctor', 'pharmacy', 'medicine', 'medplus', 'gym',
        'cult.fit', 'fitness', 'diagnostics', 'pathology', 'dentist'
      ],
      icon: 'fa-heart-pulse',
      color: '#14B8A6'
    },
    'Others': {
      keywords: [],
      icon: 'fa-ellipsis',
      color: '#64748B'
    }
  };

  /**
   * Predict category based on merchant name and raw text
   */
  static predictCategory(merchant = '', rawText = '') {
    const combined = `${merchant} ${rawText}`.toLowerCase();

    for (const [categoryName, data] of Object.entries(this.categoryRules)) {
      if (categoryName === 'Others') continue;

      for (const kw of data.keywords) {
        // Word boundary match or exact substring match
        const regex = new RegExp(`(?:^|\\W)${kw}(?:$|\\W)`, 'i');
        if (regex.test(combined)) {
          return {
            categoryName,
            matchedKeyword: kw,
            confidence: 0.9,
            icon: data.icon,
            color: data.color
          };
        }
      }
    }

    return {
      categoryName: 'Others',
      matchedKeyword: null,
      confidence: 0.5,
      icon: this.categoryRules['Others'].icon,
      color: this.categoryRules['Others'].color
    };
  }

  /**
   * Resolve category ObjectId from database matching predicted category name
   */
  static async resolveCategoryId(categoryName) {
    try {
      let category = await Category.findOne({ name: categoryName });
      if (!category) {
        // Fallback to Others or first available
        category = await Category.findOne({ name: 'Others' });
        if (!category) {
          category = await Category.findOne();
        }
      }
      return category ? category._id : null;
    } catch (err) {
      console.error('Error resolving category:', err);
      return null;
    }
  }
}

module.exports = CategorizationService;

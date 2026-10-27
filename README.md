# SpendWise 💳✨
> **Intelligent Personal Finance & Automated Expense Tracking**  
> *Stack: Node.js · Express.js · MongoDB (Mongoose) · Vanilla CSS / JS · Chart.js*

---

## 🌟 1. Project Vision

**SpendWise** goes beyond basic manual expense trackers. Its core mission is to automatically detect financial transaction notifications (from Banks, UPI, Credit Cards, NetBanking), intelligently extract crucial transaction details, categorize expenditures, prevent duplicates, and update user budgets, analytics, and trip logs with minimal friction.

### 🔄 Core Processing Flow
```text
Bank / UPI SMS Notification
           │
           ▼
Detection & Heuristics Layer
           │
           ▼
Entity Parser (Amount, Merchant, Date, Type, Mode)
           │
           ▼
Smart Categorization Engine (Rules + Keyword NLP)
           │
           ▼
Duplicate Transaction Detection (Amount, Merchant, Date Compound Check)
           │
           ▼
User Review / Instant Confirmation
           │
           ▼
Mongoose ODM ➔ MongoDB Collection Storage
           │
           ▼
Dashboard, Monthly Budget, Analytics & Trip Mode Aggregations
```

---

## 🚀 2. Main Features

| Feature | Description |
| :--- | :--- |
| 🤖 **Automatic Expense Detection** | Analyzes bank & UPI messages (HDFC, SBI, ICICI, PhonePe, GPay, Paytm, etc.) to detect real financial movements. |
| 🔍 **Transaction Extraction** | Accurately extracts transaction amount (₹, INR, $), merchant / payee, timestamp, transaction type (debit/credit), and payment channel (UPI, Card, NetBanking, Cash). |
| 🏷️ **Smart Categorization** | Automatically tags transactions into *Food, Groceries, Transport, Shopping, Bills, Entertainment, Travel, Health, and Others*. |
| ✍️ **Manual Expense Entry** | Allows logging cash transactions or non-SMS expenses with custom categories, dates, and notes. |
| 👥 **Group Payment Support** | Record only your personal share when splitting bills (e.g. Total ₹1,200 split among 3 people ➔ User Share ₹400). |
| 🛡️ **Duplicate Detection** | Compound checking on `(amount, merchant, date)` prevents identical transactions from being recorded twice. |
| 🎯 **Budget Management** | Set monthly spending limits, monitor percentage consumed, and track remaining allowances with daily burn rate indicators. |
| 📊 **Visual Analytics** | Interactive 6-month spending trends, category expenditure breakdown, and payment mode distributions powered by **Chart.js**. |
| ✈️ **Trip Mode** | Plan vacations and trips, assign expenses directly to specific trips, and track trip-specific budgets independently. |
| 💡 **AI Spending Insights** | Generates intelligent observations, alerts on unusual spending surges, category concentration warnings, and actionable saving tips. |

---

## 🏗️ 3. Architecture & Folder Structure

SpendWise follows a modular MVC + Service architecture:

```text
SpendWise/
├── config/
│   └── db.js                    # Resilient MongoDB connection & memory fallback
├── controllers/
│   ├── analyticsController.js   # MongoDB aggregation pipelines for trends & categories
│   ├── budgetController.js      # Monthly budget CRUD and pacing
│   ├── categoryController.js    # Category listing & metadata
│   ├── dashboardController.js   # Unified dashboard metrics and recent activity
│   ├── detectController.js      # SMS parsing & transaction confirmation
│   ├── expenseController.js     # Expense listing, filters, CRUD
│   └── tripController.js        # Trip Mode CRUD & linked expense metrics
├── models/
│   ├── Budget.js                # Budget schema with compound index on (month, year)
│   ├── Category.js              # Categories with icons and custom theme colors
│   ├── Expense.js               # Expense schema with duplicate index (amount, merchant, date)
│   └── Trip.js                  # Trip schema with start/end dates and allocated budgets
├── public/
│   ├── css/
│   │   └── style.css            # Dark glassmorphic design system with Poppins font
│   ├── js/
│   │   └── app.js               # Frontend interactive controller & Chart.js rendering
│   └── index.html               # Responsive Single Page Web Application
├── routes/
│   ├── analyticsRoutes.js       # /api/analytics
│   ├── budgetRoutes.js          # /api/budget
│   ├── categoryRoutes.js        # /api/categories
│   ├── dashboardRoutes.js       # /api/dashboard
│   ├── detectRoutes.js          # /api/detect
│   ├── expenseRoutes.js         # /api/expenses
│   └── tripRoutes.js            # /api/trips
├── seeds/
│   ├── runSeed.js               # Standalone runner for database seeding
│   └── seedCategories.js        # Default categories and sample demonstration data
├── services/
│   ├── categorizationService.js # Keyword dictionary & rule-based classifier
│   ├── duplicateService.js      # Duplicate transaction matcher
│   ├── insightsService.js       # AI insights, burn rate, and pacing engine
│   └── parserService.js         # Financial message regex & NLP parsing engine
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore file
├── package.json                 # Node.js project manifest & dependencies
└── server.js                    # Express application entry point
```

---

## 📡 4. REST API Specification

### Dashboard & Analytics
- `GET /api/dashboard?month=10&year=2026`: Fetch monthly totals, budget pacing, recent transactions, category breakdown, and AI insights.
- `GET /api/analytics`: Six-month spending trend, category breakdown, and payment mode distribution via MongoDB aggregation pipelines.

### SMS Detection & Extraction
- `POST /api/detect/parse`:
  - Request: `{ "message": "A/c *4021 debited by Rs. 450.00 on 24-Oct-24 to Swiggy. UPI Ref: 429381..." }`
  - Response: Extracted amount, merchant, date, type, payment mode, predicted category, confidence score, and duplicate check flag.
- `POST /api/detect/confirm`:
  - Request: Confirmed transaction payload with optional group split and trip linking.

### Expenses & Budget
- `GET /api/expenses`: List expenses with search query, category, trip, type, date filters, and pagination.
- `POST /api/expenses`: Create a new manual expense with express-validator validation and duplicate checking.
- `PUT /api/expenses/:id`: Update an existing expense.
- `DELETE /api/expenses/:id`: Delete an expense.
- `GET /api/budget?month=10&year=2026`: Read monthly budget, total spent, and remaining balance.
- `PUT /api/budget`: Set or update monthly budget target and strategy notes.

### Trip Mode & Categories
- `GET /api/trips`: List all trips with aggregated spending and remaining budgets.
- `POST /api/trips`: Create a new trip.
- `GET /api/trips/:id`: Retrieve trip details with all linked expenses.
- `DELETE /api/trips/:id`: Delete a trip and unassign linked expenses.
- `GET /api/categories`: Retrieve all standard categories with icons and theme colors.

---

## 🛠️ 5. Setup & Installation

### Prerequisites
- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **MongoDB** (Local instance or MongoDB Atlas URI)

### Quick Start
1. **Clone the repository**:
   ```bash
   git clone https://github.com/anumulasai2006-glitch/SpendWise.git
   cd SpendWise
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to set your desired port and MongoDB URI (e.g. MongoDB Atlas connection string):
   ```ini
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/spendwise
   NODE_ENV=development
   ```

4. **Seed Categories & Demo Data (Optional)**:
   ```bash
   npm run seed
   ```

5. **Run the Application**:
   - For development with auto-reload:
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

6. **Open in Browser**:
   Navigate to [http://localhost:5001](http://localhost:5001).

---

## 🧪 6. Sample SMS Messages for Testing

You can paste any of the following sample bank messages into the **SMS Detector** tab to test automatic parsing:

- **Swiggy UPI**:
  > `A/c *4021 debited by Rs. 450.00 on 24-Oct-24 to Swiggy. UPI Ref: 429381928394. Avl Bal: Rs 14,230.00`
- **HDFC Card at Zomato**:
  > `INR 1,299.00 spent on your HDFC Bank Card ending 5678 at ZOMATO on 2024-10-25. Avail Limit: INR 84,000.`
- **PhonePe Uber Ride**:
  > `Paid Rs. 350 to Uber via PhonePe on 26 Oct 2024. Transaction ID: T241026110294.`
- **SBI Blinkit Grocery**:
  > `Dear SBI User, your A/c ending 9012 debited by Rs 1850.00 on 23/10/24 trf to Blinkit. UPI: 30192841.`
- **GPay Amazon Shopping**:
  > `Sent Rs. 2,499.00 to AMZN Mktp using Google Pay on 22 Oct 2024. Ref: 42918392.`
- **Airtel Broadband Bill**:
  > `Txn of INR 999.00 done on ICICI Bank NetBanking at Airtel Broadband on 20-Oct-2024.`
- **Salary Credit**:
  > `Credited INR 75,000.00 to A/c *4021 on 01-Oct-2024 by Tech Corp Salary. Avl Bal: INR 94,500.`

---

## 📄 License
This project is licensed under the ISC License.
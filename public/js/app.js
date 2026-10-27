/**
 * SpendWise — Intelligent Personal Finance & Automated Expense Tracking
 * Frontend Application Controller
 */

// Application State
const state = {
  currentView: 'dashboard',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  categories: [],
  trips: [],
  expenses: [],
  detectedTxn: null,
  charts: {}
};

// Sample Financial Messages for Testing Detection
const sampleMessages = {
  swiggy: "A/c *4021 debited by Rs. 450.00 on 24-Oct-24 to Swiggy. UPI Ref: 429381928394. Avl Bal: Rs 14,230.00",
  zomato: "INR 1,299.00 spent on your HDFC Bank Card ending 5678 at ZOMATO on 2024-10-25. Avail Limit: INR 84,000.",
  uber: "Paid Rs. 350 to Uber via PhonePe on 26 Oct 2024. Transaction ID: T241026110294.",
  blinkit: "Dear SBI User, your A/c ending 9012 debited by Rs 1850.00 on 23/10/24 trf to Blinkit. UPI: 30192841.",
  amazon: "Sent Rs. 2,499.00 to AMZN Mktp using Google Pay on 22 Oct 2024. Ref: 42918392.",
  airtel: "Txn of INR 999.00 done on ICICI Bank NetBanking at Airtel Broadband on 20-Oct-2024.",
  salary: "Credited INR 75,000.00 to A/c *4021 on 01-Oct-2024 by Tech Corp Salary. Avl Bal: INR 94,500."
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initPeriodPickers();
  initNavListeners();
  checkHealth();
  await loadCategories();
  await loadTrips();
  await loadDashboard();
});

// Period change handler
function initPeriodPickers() {
  const monthSelect = document.getElementById('period-month');
  const yearSelect = document.getElementById('period-year');

  if (monthSelect) monthSelect.value = state.month;
  if (yearSelect) yearSelect.value = state.year;
}

function handlePeriodChange() {
  state.month = parseInt(document.getElementById('period-month').value);
  state.year = parseInt(document.getElementById('period-year').value);

  if (state.currentView === 'dashboard') loadDashboard();
  else if (state.currentView === 'expenses') loadExpenses();
  else if (state.currentView === 'budget') loadBudget();
  else if (state.currentView === 'analytics') loadAnalytics();
  else if (state.currentView === 'insights') loadInsights();
}

// Navigation View Switching
function initNavListeners() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });
}

function switchView(viewName) {
  state.currentView = viewName;

  // Update nav link active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-view') === viewName);
  });

  // Update view visibility
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.toggle('active', section.id === `view-${viewName}`);
  });

  // Update Page Title
  const titles = {
    dashboard: 'Dashboard Overview',
    detector: 'SMS Transaction Detector',
    expenses: 'Expenses & Transactions',
    budget: 'Monthly Budget Management',
    analytics: 'Spending Analytics & Trends',
    trips: 'Trip Mode & Vacation Budgets',
    insights: 'AI Financial Insights'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[viewName] || 'SpendWise';

  // Load view-specific data
  if (viewName === 'dashboard') loadDashboard();
  else if (viewName === 'expenses') loadExpenses();
  else if (viewName === 'budget') loadBudget();
  else if (viewName === 'analytics') loadAnalytics();
  else if (viewName === 'trips') loadTrips();
  else if (viewName === 'insights') loadInsights();
}

// Check Backend Health & Database status
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');

    if (data.database === 'connected') {
      if (dot) dot.style.background = '#10B981';
      if (text) text.textContent = 'MongoDB Connected';
    } else {
      if (dot) dot.style.background = '#F59E0B';
      if (text) text.textContent = 'DB Standby / Connecting';
    }
  } catch (err) {
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    if (dot) dot.style.background = '#EF4444';
    if (text) text.textContent = 'Offline Mode';
  }
}

// Load Categories
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      state.categories = data.data;
      populateCategoryDropdowns();
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function populateCategoryDropdowns() {
  const formSelect = document.getElementById('form-category');
  const filterSelect = document.getElementById('filter-category');
  const detectSelect = document.getElementById('detect-category-select');

  const optionsHtml = state.categories.map(c => 
    `<option value="${c._id}">${c.name}</option>`
  ).join('');

  if (formSelect) formSelect.innerHTML = optionsHtml;
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All Categories</option>' + optionsHtml;
  }
  if (detectSelect) detectSelect.innerHTML = optionsHtml;
}

// Load Trips
async function loadTrips() {
  try {
    const res = await fetch('/api/trips');
    const data = await res.json();
    if (data.success) {
      state.trips = data.data;
      populateTripDropdowns();
      if (state.currentView === 'trips') renderTripsGrid(data.data);
    }
  } catch (err) {
    console.error('Failed to load trips:', err);
  }
}

function populateTripDropdowns() {
  const formTrip = document.getElementById('form-trip');
  const filterTrip = document.getElementById('filter-trip');
  const detectTrip = document.getElementById('detect-trip-select');

  const optionsHtml = state.trips.map(t => 
    `<option value="${t._id}">${t.name} (${t.destination || 'Trip'})</option>`
  ).join('');

  if (formTrip) formTrip.innerHTML = '<option value="">-- None --</option>' + optionsHtml;
  if (filterTrip) filterTrip.innerHTML = '<option value="">All Trips</option>' + optionsHtml;
  if (detectTrip) detectTrip.innerHTML = '<option value="">-- No Trip / Personal Daily --</option>' + optionsHtml;
}

// ==========================================
// VIEW: DASHBOARD
// ==========================================
async function loadDashboard() {
  try {
    const res = await fetch(`/api/dashboard?month=${state.month}&year=${state.year}`);
    const result = await res.json();

    if (!result.success) return;
    const d = result.data;

    // Stat Cards
    document.getElementById('stat-total-spent').textContent = formatINR(d.totals.spending);
    document.getElementById('stat-tx-count').textContent = `${d.totals.transactionCount} transactions`;

    document.getElementById('stat-budget-target').textContent = formatINR(d.budget.target);
    const progressEl = document.getElementById('stat-budget-progress');
    const pct = Math.min(d.budget.usagePercentage, 100);
    if (progressEl) {
      progressEl.style.width = `${pct}%`;
      if (d.budget.usagePercentage >= 100) progressEl.style.background = '#EF4444';
      else if (d.budget.usagePercentage >= 80) progressEl.style.background = '#F59E0B';
      else progressEl.style.background = 'linear-gradient(90deg, var(--primary), var(--accent-cyan))';
    }
    document.getElementById('stat-budget-used-text').textContent = 
      d.budget.target > 0 ? `${d.budget.usagePercentage}% utilized` : 'No budget set';

    document.getElementById('stat-remaining-budget').textContent = formatINR(d.budget.remaining);
    
    // Daily burn allowance
    const daysInMonth = new Date(state.year, state.month, 0).getDate();
    const today = new Date().getDate();
    const daysLeft = Math.max(1, daysInMonth - today);
    const dailyAllowance = d.budget.remaining > 0 ? (d.budget.remaining / daysLeft) : 0;
    document.getElementById('stat-daily-allowance').textContent = `₹${Math.round(dailyAllowance)} / day available`;

    document.getElementById('stat-total-income').textContent = formatINR(d.totals.income);
    document.getElementById('stat-net-balance').textContent = `Net: ${formatINR(d.totals.netBalance)}`;

    // AI Insights Carousel / Cards
    renderDashboardInsights(d.insights);

    // Recent Transactions
    renderRecentTransactions(d.recentTransactions);

    // Render Charts
    await loadDashboardCharts();

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderDashboardInsights(insights) {
  const container = document.getElementById('dashboard-insights-container');
  if (!container) return;

  if (!insights || insights.length === 0) {
    container.innerHTML = `
      <div class="insight-item">
        <span class="insight-title">💡 Start Adding Expenses</span>
        <span class="insight-msg">Paste a bank transaction SMS or add manual entries to unlock spending observations.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = insights.slice(0, 3).map(i => `
    <div class="insight-item">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="insight-title">${i.title}</span>
        <span class="tag-badge" style="text-transform: capitalize;">${i.type}</span>
      </div>
      <p class="insight-msg">${i.message}</p>
      ${i.action ? `<span class="insight-action">👉 ${i.action}</span>` : ''}
    </div>
  `).join('');
}

function renderRecentTransactions(transactions) {
  const tbody = document.getElementById('recent-transactions-tbody');
  if (!tbody) return;

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-dim);">
          No transactions found for this period. Click "+ New Expense" or "Parse SMS" to log one!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions.map(tx => {
    const cat = tx.category || { name: 'Others', icon: 'fa-tag', color: '#6366F1' };
    const isDebit = tx.txnType === 'debit';
    const amountClass = isDebit ? 'amount-debit' : 'amount-credit';
    const sign = isDebit ? '-' : '+';
    const userAmount = tx.userShare || tx.amount;

    return `
      <tr>
        <td>
          <div class="merchant-cell">
            <div class="cat-circle" style="background: ${cat.color};">
              <i class="fa-solid ${cat.icon}"></i>
            </div>
            <div>
              <div class="merchant-name">${tx.merchant}</div>
              <div class="merchant-note">${tx.note || (tx.source === 'detected' ? 'Auto-detected via SMS' : 'Manual entry')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="tag-badge" style="background: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">
            <i class="fa-solid ${cat.icon}"></i> ${cat.name}
          </span>
        </td>
        <td>${formatDate(tx.date)}</td>
        <td>
          <span class="tag-badge">${tx.paymentMode || 'UPI'}</span>
          ${tx.isGroup ? `<span class="tag-badge badge-group"><i class="fa-solid fa-users"></i> Split</span>` : ''}
        </td>
        <td class="amount-cell ${amountClass}">
          ${sign}₹${userAmount.toLocaleString('en-IN')}
          ${tx.isGroup ? `<div style="font-size: 0.72rem; color: var(--text-dim);">Total: ₹${tx.amount}</div>` : ''}
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-icon btn-sm" onclick="editExpense('${tx._id}')" title="Edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-icon btn-sm" onclick="deleteExpense('${tx._id}')" title="Delete">
              <i class="fa-solid fa-trash" style="color: #f87171;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadDashboardCharts() {
  try {
    const res = await fetch('/api/analytics');
    const result = await res.json();
    if (!result.success) return;

    const data = result.data;

    // 1. Trend Chart
    const trendCtx = document.getElementById('dashboardTrendChart');
    if (trendCtx) {
      if (state.charts.dashTrend) state.charts.dashTrend.destroy();

      const labels = data.sixMonthTrend.map(t => t.label);
      const amounts = data.sixMonthTrend.map(t => t.total);

      state.charts.dashTrend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Monthly Spend (₹)',
            data: amounts,
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#818CF8',
            pointRadius: 4,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#9CA3AF' }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#9CA3AF',
                callback: (val) => `₹${val.toLocaleString('en-IN')}`
              }
            }
          }
        }
      });
    }

    // 2. Category Doughnut Chart
    const catCtx = document.getElementById('dashboardCategoryChart');
    if (catCtx) {
      if (state.charts.dashCat) state.charts.dashCat.destroy();

      const categories = data.categoryBreakdown;
      const catLabels = categories.map(c => c.name);
      const catAmounts = categories.map(c => c.totalSpent);
      const catColors = categories.map(c => c.color || '#6366F1');

      state.charts.dashCat = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: catLabels.length > 0 ? catLabels : ['No Data'],
          datasets: [{
            data: catAmounts.length > 0 ? catAmounts : [1],
            backgroundColor: catColors.length > 0 ? catColors : ['#374151'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#9CA3AF', boxWidth: 12, padding: 12 }
            }
          },
          cutout: '70%'
        }
      });
    }

  } catch (err) {
    console.error('Failed to render dashboard charts:', err);
  }
}

// ==========================================
// VIEW: SMS DETECTOR SANDBOX
// ==========================================
function loadSampleSms(key) {
  const text = sampleMessages[key] || '';
  const input = document.getElementById('sms-input-text');
  if (input) {
    input.value = text;
    parseSmsInput();
  }
}

async function parseSmsInput() {
  const text = document.getElementById('sms-input-text').value.trim();
  if (!text) {
    showToast('Please paste a transaction SMS text first', 'error');
    return;
  }

  const btn = document.getElementById('btn-parse-sms');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Message...';

  try {
    const res = await fetch('/api/detect/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const result = await res.json();
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze & Detect Transaction';

    if (!result.success) {
      showToast(result.error || 'Failed to parse message', 'error');
      return;
    }

    state.detectedTxn = result.data;
    renderDetectionResult(result.data);

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze & Detect Transaction';
    showToast('Failed to connect to parser engine', 'error');
  }
}

function renderDetectionResult(data) {
  document.getElementById('detection-empty-state').style.display = 'none';
  const container = document.getElementById('detection-result-container');
  container.style.display = 'flex';

  // Confidence & Duplicate
  document.getElementById('detection-confidence-badge').textContent = `Confidence: ${data.confidence}%`;

  const dupAlert = document.getElementById('detection-duplicate-alert');
  if (data.isDuplicate) {
    dupAlert.style.display = 'flex';
    document.getElementById('detection-duplicate-text').textContent = data.duplicateInfo || 'Duplicate transaction flagged!';
  } else {
    dupAlert.style.display = 'none';
  }

  // Fields
  document.getElementById('detect-merchant').textContent = data.merchant;
  const amtEl = document.getElementById('detect-amount');
  amtEl.textContent = `₹${data.amount.toLocaleString('en-IN')}`;
  amtEl.style.color = data.txnType === 'debit' ? '#F87171' : '#34D399';

  document.getElementById('detect-date').textContent = formatDate(data.date);
  document.getElementById('detect-mode').textContent = `${data.txnType.toUpperCase()} via ${data.paymentMode}`;

  // Category
  const catBadge = document.getElementById('detect-category-badge');
  catBadge.innerHTML = `<i class="fa-solid ${data.category.icon}"></i> ${data.category.name}`;
  catBadge.style.background = `${data.category.color}20`;
  catBadge.style.color = data.category.color;
  catBadge.style.border = `1px solid ${data.category.color}40`;

  // Select dropdown match
  const catSelect = document.getElementById('detect-category-select');
  if (data.category._id) {
    catSelect.value = data.category._id;
  }

  // Reset group fields
  document.getElementById('detect-is-group').checked = false;
  document.getElementById('detect-group-fields').style.display = 'none';
  document.getElementById('detect-user-share').value = data.amount;
}

function toggleDetectGroupSplit(checked) {
  document.getElementById('detect-group-fields').style.display = checked ? 'flex' : 'none';
  if (checked) calculateDetectUserShare();
  else if (state.detectedTxn) {
    document.getElementById('detect-user-share').value = state.detectedTxn.amount;
  }
}

function calculateDetectUserShare() {
  if (!state.detectedTxn) return;
  const count = parseInt(document.getElementById('detect-people-count').value) || 2;
  const share = parseFloat((state.detectedTxn.amount / count).toFixed(2));
  document.getElementById('detect-user-share').value = share;
}

async function confirmDetectedExpense() {
  if (!state.detectedTxn) return;

  const btn = document.getElementById('btn-confirm-detected');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const categoryId = document.getElementById('detect-category-select').value;
  const tripId = document.getElementById('detect-trip-select').value || null;
  const isGroup = document.getElementById('detect-is-group').checked;
  const userShare = isGroup 
    ? parseFloat(document.getElementById('detect-user-share').value) 
    : state.detectedTxn.amount;
  const notes = document.getElementById('detect-notes').value.trim();

  const payload = {
    amount: state.detectedTxn.amount,
    userShare,
    merchant: state.detectedTxn.merchant,
    date: state.detectedTxn.date,
    txnType: state.detectedTxn.txnType,
    paymentMode: state.detectedTxn.paymentMode,
    category: categoryId,
    trip: tripId,
    isGroup,
    groupPeople: isGroup ? [`Group (${document.getElementById('detect-people-count').value} people)`] : [],
    note: notes,
    rawMessage: state.detectedTxn.rawMessage,
    allowDuplicate: true // User confirmed
  };

  try {
    const res = await fetch('/api/detect/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Confirm & Add to Expenses';

    if (result.success) {
      showToast('Detected expense confirmed & added successfully!', 'success');
      document.getElementById('sms-input-text').value = '';
      document.getElementById('detection-result-container').style.display = 'none';
      document.getElementById('detection-empty-state').style.display = 'flex';
      state.detectedTxn = null;
      loadDashboard();
    } else {
      showToast(result.error || 'Failed to save expense', 'error');
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Confirm & Add to Expenses';
    showToast('Network error while saving expense', 'error');
  }
}

// ==========================================
// VIEW: EXPENSES
// ==========================================
let expenseSearchTimeout = null;
function debounceExpenseSearch() {
  clearTimeout(expenseSearchTimeout);
  expenseSearchTimeout = setTimeout(() => {
    loadExpenses();
  }, 300);
}

async function loadExpenses() {
  const search = document.getElementById('expense-search')?.value.trim() || '';
  const category = document.getElementById('filter-category')?.value || '';
  const txnType = document.getElementById('filter-type')?.value || '';
  const trip = document.getElementById('filter-trip')?.value || '';

  let url = `/api/expenses?limit=100`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (category) url += `&category=${category}`;
  if (txnType) url += `&txnType=${txnType}`;
  if (trip) url += `&trip=${trip}`;

  try {
    const res = await fetch(url);
    const result = await res.json();

    if (!result.success) return;
    state.expenses = result.data;

    // Update summary counts
    document.getElementById('filter-total-count').textContent = result.count;
    const totalSpent = result.data
      .filter(e => e.txnType === 'debit')
      .reduce((sum, e) => sum + (e.userShare || e.amount), 0);
    document.getElementById('filter-total-amount').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;

    renderExpensesTable(result.data);
  } catch (err) {
    console.error('Failed to load expenses:', err);
  }
}

function renderExpensesTable(expenses) {
  const tbody = document.getElementById('expenses-table-tbody');
  if (!tbody) return;

  if (expenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-dim);">
          No matching transactions found. Try adjusting your search or filters!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = expenses.map(tx => {
    const cat = tx.category || { name: 'Others', icon: 'fa-tag', color: '#6366F1' };
    const trip = tx.trip ? tx.trip.name : '-';
    const isDebit = tx.txnType === 'debit';
    const amountClass = isDebit ? 'amount-debit' : 'amount-credit';
    const sign = isDebit ? '-' : '+';
    const userAmount = tx.userShare || tx.amount;

    return `
      <tr>
        <td>
          <div class="merchant-cell">
            <div class="cat-circle" style="background: ${cat.color};">
              <i class="fa-solid ${cat.icon}"></i>
            </div>
            <div>
              <div class="merchant-name">${tx.merchant}</div>
              <div class="merchant-note">${tx.note || (tx.source === 'detected' ? 'Auto-detected' : 'Manual')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="tag-badge" style="background: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">
            <i class="fa-solid ${cat.icon}"></i> ${cat.name}
          </span>
        </td>
        <td>${formatDate(tx.date)}</td>
        <td><span class="tag-badge">${tx.paymentMode || 'UPI'}</span></td>
        <td>
          <span class="tag-badge ${isDebit ? 'badge-detected' : 'badge-group'}" style="text-transform: capitalize;">
            ${tx.txnType}
          </span>
        </td>
        <td class="amount-cell ${amountClass}">
          ${sign}₹${userAmount.toLocaleString('en-IN')}
          ${tx.isGroup ? `<div style="font-size: 0.72rem; color: #FBBF24;">Split from ₹${tx.amount}</div>` : ''}
        </td>
        <td>${trip !== '-' ? `<span class="tag-badge" style="color: #06B6D4;"><i class="fa-solid fa-plane"></i> ${trip}</span>` : '<span style="color: var(--text-dim);">-</span>'}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-icon btn-sm" onclick="editExpense('${tx._id}')" title="Edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-icon btn-sm" onclick="deleteExpense('${tx._id}')" title="Delete">
              <i class="fa-solid fa-trash" style="color: #f87171;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal Form handling
function openExpenseModal(expenseData = null) {
  const modal = document.getElementById('modal-expense');
  const form = document.getElementById('expense-form');
  const title = document.getElementById('modal-expense-title');

  form.reset();
  document.getElementById('form-expense-id').value = '';
  document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('form-group-fields').style.display = 'none';

  if (expenseData) {
    title.textContent = 'Edit Expense';
    document.getElementById('form-expense-id').value = expenseData._id;
    document.getElementById('form-amount').value = expenseData.amount;
    document.getElementById('form-txntype').value = expenseData.txnType;
    document.getElementById('form-merchant').value = expenseData.merchant;
    document.getElementById('form-category').value = expenseData.category?._id || expenseData.category;
    document.getElementById('form-date').value = new Date(expenseData.date).toISOString().split('T')[0];
    document.getElementById('form-paymentmode').value = expenseData.paymentMode || 'UPI';
    document.getElementById('form-trip').value = expenseData.trip?._id || expenseData.trip || '';
    document.getElementById('form-notes').value = expenseData.note || '';

    if (expenseData.isGroup) {
      document.getElementById('form-is-group').checked = true;
      document.getElementById('form-group-fields').style.display = 'flex';
      document.getElementById('form-user-share').value = expenseData.userShare || expenseData.amount;
    }
  } else {
    title.textContent = 'Add New Expense';
  }

  modal.classList.add('active');
}

function closeExpenseModal() {
  document.getElementById('modal-expense').classList.remove('active');
}

function toggleFormGroupSplit(checked) {
  document.getElementById('form-group-fields').style.display = checked ? 'flex' : 'none';
  if (checked) calculateFormUserShare();
}

function calculateFormUserShare() {
  const total = parseFloat(document.getElementById('form-amount').value) || 0;
  const count = parseInt(document.getElementById('form-people-count').value) || 2;
  const isGroup = document.getElementById('form-is-group').checked;

  if (isGroup && total > 0) {
    document.getElementById('form-user-share').value = parseFloat((total / count).toFixed(2));
  }
}

async function handleSaveExpense(e) {
  e.preventDefault();
  const id = document.getElementById('form-expense-id').value;
  const isEdit = Boolean(id);

  const amount = parseFloat(document.getElementById('form-amount').value);
  const isGroup = document.getElementById('form-is-group').checked;
  const userShare = isGroup ? parseFloat(document.getElementById('form-user-share').value) : amount;

  const payload = {
    amount,
    userShare,
    txnType: document.getElementById('form-txntype').value,
    merchant: document.getElementById('form-merchant').value.trim(),
    category: document.getElementById('form-category').value,
    date: document.getElementById('form-date').value,
    paymentMode: document.getElementById('form-paymentmode').value,
    trip: document.getElementById('form-trip').value || null,
    isGroup,
    groupPeople: isGroup ? [document.getElementById('form-group-names').value.trim()] : [],
    note: document.getElementById('form-notes').value.trim(),
    allowDuplicate: true
  };

  try {
    const url = isEdit ? `/api/expenses/${id}` : '/api/expenses';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Expense ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
      closeExpenseModal();
      loadExpenses();
      loadDashboard();
    } else {
      showToast(result.error || result.message || 'Error saving expense', 'error');
    }
  } catch (err) {
    showToast('Network error while saving expense', 'error');
  }
}

async function editExpense(id) {
  const expense = state.expenses.find(e => e._id === id);
  if (expense) {
    openExpenseModal(expense);
  } else {
    try {
      const res = await fetch(`/api/expenses`);
      const result = await res.json();
      const match = result.data.find(e => e._id === id);
      if (match) openExpenseModal(match);
    } catch (err) {
      showToast('Could not fetch expense details', 'error');
    }
  }
}

async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Expense deleted successfully', 'success');
      loadExpenses();
      loadDashboard();
    } else {
      showToast(result.error || 'Failed to delete expense', 'error');
    }
  } catch (err) {
    showToast('Network error deleting expense', 'error');
  }
}

function exportExpensesCSV() {
  if (state.expenses.length === 0) {
    showToast('No expenses to export', 'error');
    return;
  }

  const headers = ['Merchant', 'Category', 'Date', 'Amount', 'User Share', 'Type', 'Payment Mode', 'Trip', 'Notes'];
  const rows = state.expenses.map(e => [
    `"${e.merchant.replace(/"/g, '""')}"`,
    `"${(e.category?.name || 'Others').replace(/"/g, '""')}"`,
    new Date(e.date).toISOString().split('T')[0],
    e.amount,
    e.userShare || e.amount,
    e.txnType,
    e.paymentMode,
    `"${(e.trip?.name || '').replace(/"/g, '""')}"`,
    `"${(e.note || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SpendWise_Expenses_${state.year}_${state.month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported expenses to CSV!', 'success');
}

// ==========================================
// VIEW: BUDGET
// ==========================================
async function loadBudget() {
  try {
    const res = await fetch(`/api/budget?month=${state.month}&year=${state.year}`);
    const result = await res.json();
    if (!result.success) return;

    const b = result.data;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('budget-period-badge').textContent = `${monthNames[b.month - 1]} ${b.year}`;
    document.getElementById('budget-view-amount').textContent = formatINR(b.amount);
    document.getElementById('budget-view-spent').textContent = formatINR(b.totalSpent);
    document.getElementById('budget-percentage-label').textContent = `${b.percentage}% Consumed`;
    document.getElementById('budget-remaining-label').textContent = `${formatINR(b.remaining)} Remaining`;

    const progressFill = document.getElementById('budget-view-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${Math.min(b.percentage, 100)}%`;
      if (b.status === 'exceeded') progressFill.style.background = '#EF4444';
      else if (b.status === 'warning') progressFill.style.background = '#F59E0B';
      else progressFill.style.background = 'linear-gradient(90deg, var(--primary), var(--accent-cyan))';
    }

    // Pacing forecast
    const daysInMonth = new Date(b.year, b.month, 0).getDate();
    const today = new Date().getDate();
    const daysPassed = Math.min(today, daysInMonth);
    const dailyRate = daysPassed > 0 ? (b.totalSpent / daysPassed) : 0;
    const projected = dailyRate * daysInMonth;

    const forecastEl = document.getElementById('budget-forecast-text');
    if (b.amount > 0) {
      forecastEl.innerHTML = `
        Current velocity: <strong>₹${dailyRate.toFixed(0)}/day</strong>. Projected month-end spend: 
        <strong style="color: ${projected > b.amount ? '#F87171' : '#34D399'};">₹${projected.toFixed(0)}</strong>
        (${projected > b.amount ? '₹' + (projected - b.amount).toFixed(0) + ' over budget' : 'within budget'}).
      `;
    } else {
      forecastEl.textContent = 'Set a monthly budget to calculate burn rate and velocity projections.';
    }

    if (b.amount > 0) {
      document.getElementById('budget-input-amount').value = b.amount;
      document.getElementById('budget-input-notes').value = b.notes || '';
    }

    // Load category spend distribution in budget view
    await renderBudgetCategoryList();

  } catch (err) {
    console.error('Failed to load budget:', err);
  }
}

async function renderBudgetCategoryList() {
  const container = document.getElementById('budget-category-list');
  if (!container) return;

  try {
    const res = await fetch('/api/analytics');
    const result = await res.json();
    if (!result.success) return;

    const categories = result.data.categoryBreakdown;
    if (categories.length === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); font-size: 0.85rem;">No category expenses logged yet this month.</div>';
      return;
    }

    container.innerHTML = categories.map(c => `
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
          <span><i class="fa-solid ${c.icon}" style="color: ${c.color};"></i> ${c.name}</span>
          <span><strong>₹${c.totalSpent.toLocaleString('en-IN')}</strong> (${c.percentage}%)</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${c.percentage}%; background: ${c.color};"></div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function handleSetBudget(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('budget-input-amount').value);
  const notes = document.getElementById('budget-input-notes').value.trim();

  try {
    const res = await fetch('/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: state.month,
        year: state.year,
        amount,
        notes
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Budget saved successfully!', 'success');
      loadBudget();
      loadDashboard();
    } else {
      showToast(result.error || 'Failed to update budget', 'error');
    }
  } catch (err) {
    showToast('Network error saving budget', 'error');
  }
}

// ==========================================
// VIEW: ANALYTICS
// ==========================================
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const result = await res.json();
    if (!result.success) return;

    const data = result.data;

    // 1. Trend Area Chart
    const trendCtx = document.getElementById('analyticsTrendChart');
    if (trendCtx) {
      if (state.charts.analyticsTrend) state.charts.analyticsTrend.destroy();
      state.charts.analyticsTrend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: data.sixMonthTrend.map(t => t.label),
          datasets: [{
            label: 'Monthly Spend (₹)',
            data: data.sixMonthTrend.map(t => t.total),
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#818CF8',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9CA3AF' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9CA3AF' } }
          }
        }
      });
    }

    // 2. Category Donut Chart
    const catCtx = document.getElementById('analyticsCategoryChart');
    if (catCtx) {
      if (state.charts.analyticsCat) state.charts.analyticsCat.destroy();
      state.charts.analyticsCat = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: data.categoryBreakdown.map(c => c.name),
          datasets: [{
            data: data.categoryBreakdown.map(c => c.totalSpent),
            backgroundColor: data.categoryBreakdown.map(c => c.color || '#6366F1'),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#9CA3AF' } }
          }
        }
      });
    }

    // 3. Payment Mode Bar Chart
    const payCtx = document.getElementById('analyticsPaymentChart');
    if (payCtx) {
      if (state.charts.analyticsPay) state.charts.analyticsPay.destroy();
      state.charts.analyticsPay = new Chart(payCtx, {
        type: 'bar',
        data: {
          labels: data.paymentModes.map(p => p._id || 'Other'),
          datasets: [{
            label: 'Total Spent (₹)',
            data: data.paymentModes.map(p => p.total),
            backgroundColor: ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#9CA3AF' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9CA3AF' } }
          }
        }
      });
    }

    // 4. Source Breakdown (Detected vs Manual)
    const srcCtx = document.getElementById('analyticsSourceChart');
    if (srcCtx) {
      if (state.charts.analyticsSrc) state.charts.analyticsSrc.destroy();
      state.charts.analyticsSrc = new Chart(srcCtx, {
        type: 'doughnut',
        data: {
          labels: data.sourceBreakdown.map(s => s._id === 'detected' ? 'SMS Detected' : 'Manual Entry'),
          datasets: [{
            data: data.sourceBreakdown.map(s => s.count),
            backgroundColor: ['#6366F1', '#06B6D4'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#9CA3AF' } } },
          cutout: '65%'
        }
      });
    }

  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

// ==========================================
// VIEW: TRIP MODE
// ==========================================
function renderTripsGrid(trips) {
  const container = document.getElementById('trips-grid-container');
  if (!container) return;

  if (trips.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">
        <i class="fa-solid fa-plane" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.3;"></i>
        <p>No trips planned yet. Click "Plan New Trip" to start tracking travel expenses!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = trips.map(t => {
    const pct = Math.min(t.percentage, 100);
    return `
      <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 1.1rem; font-weight: 600; color: var(--text-main);">${t.name}</h4>
              <span style="font-size: 0.8rem; color: #06B6D4;"><i class="fa-solid fa-location-dot"></i> ${t.destination || 'Vacation'}</span>
            </div>
            <button class="btn btn-icon btn-sm" onclick="deleteTrip('${t._id}')" title="Delete Trip">
              <i class="fa-solid fa-trash" style="color: #f87171;"></i>
            </button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0;">
            <div class="parsed-field" style="padding: 8px 10px;">
              <div class="field-label" style="font-size: 0.68rem;">Budget</div>
              <div class="field-value" style="font-size: 0.95rem;">₹${t.budget.toLocaleString('en-IN')}</div>
            </div>
            <div class="parsed-field" style="padding: 8px 10px;">
              <div class="field-label" style="font-size: 0.68rem;">Spent</div>
              <div class="field-value" style="font-size: 0.95rem; color: #F87171;">₹${t.totalSpent.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted); margin-bottom: 4px;">
              <span>${t.percentage}% Used</span>
              <span>₹${t.remaining.toLocaleString('en-IN')} left</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary btn-sm" onclick="viewTripDetails('${t._id}')" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-list-check"></i> View Linked Expenses (${t.expenseCount})
        </button>
      </div>
    `;
  }).join('');
}

async function viewTripDetails(tripId) {
  try {
    const res = await fetch(`/api/trips/${tripId}`);
    const result = await res.json();
    if (!result.success) return;

    const data = result.data;
    const section = document.getElementById('trip-detail-section');
    section.style.display = 'block';

    document.getElementById('selected-trip-title').innerHTML = `
      <i class="fa-solid fa-plane"></i> ${data.trip.name} 
      <span style="font-size: 0.85rem; font-weight: normal; color: #06B6D4;">(${data.trip.destination})</span>
    `;
    document.getElementById('selected-trip-dates').textContent = 
      `${formatDate(data.trip.startDate)} - ${data.trip.endDate ? formatDate(data.trip.endDate) : 'Ongoing'}`;

    document.getElementById('trip-detail-budget').textContent = formatINR(data.trip.budget);
    document.getElementById('trip-detail-spent').textContent = formatINR(data.totalSpent);
    document.getElementById('trip-detail-remaining').textContent = formatINR(data.remaining);

    const tbody = document.getElementById('trip-expenses-tbody');
    if (data.expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-dim);">No expenses tagged to this trip yet.</td></tr>`;
    } else {
      tbody.innerHTML = data.expenses.map(e => `
        <tr>
          <td><strong>${e.merchant}</strong></td>
          <td><span class="tag-badge"><i class="fa-solid ${e.category?.icon || 'fa-tag'}"></i> ${e.category?.name || 'Others'}</span></td>
          <td>${formatDate(e.date)}</td>
          <td style="color: #F87171; font-weight: 600;">₹${(e.userShare || e.amount).toLocaleString('en-IN')}</td>
          <td>${e.note || '-'}</td>
        </tr>
      `).join('');
    }

    section.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Failed to load trip details', 'error');
  }
}

function closeTripDetails() {
  document.getElementById('trip-detail-section').style.display = 'none';
}

function openTripModal() {
  document.getElementById('trip-form').reset();
  document.getElementById('trip-start-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-trip').classList.add('active');
}

function closeTripModal() {
  document.getElementById('modal-trip').classList.remove('active');
}

async function handleSaveTrip(e) {
  e.preventDefault();
  const name = document.getElementById('trip-name').value.trim();
  const destination = document.getElementById('trip-destination').value.trim();
  const startDate = document.getElementById('trip-start-date').value;
  const endDate = document.getElementById('trip-end-date').value || null;
  const budget = parseFloat(document.getElementById('trip-budget').value) || 0;
  const notes = document.getElementById('trip-notes').value.trim();

  try {
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, destination, startDate, endDate, budget, notes })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Trip created successfully!', 'success');
      closeTripModal();
      await loadTrips();
    } else {
      showToast(result.error || 'Failed to create trip', 'error');
    }
  } catch (err) {
    showToast('Network error creating trip', 'error');
  }
}

async function deleteTrip(id) {
  if (!confirm('Are you sure you want to delete this trip? Tagged expenses will remain in your general log.')) return;

  try {
    const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Trip deleted successfully', 'success');
      closeTripDetails();
      await loadTrips();
    } else {
      showToast(result.error || 'Failed to delete trip', 'error');
    }
  } catch (err) {
    showToast('Network error deleting trip', 'error');
  }
}

// ==========================================
// VIEW: AI INSIGHTS
// ==========================================
async function loadInsights() {
  const container = document.getElementById('full-insights-grid');
  if (!container) return;

  try {
    const res = await fetch(`/api/dashboard?month=${state.month}&year=${state.year}`);
    const result = await res.json();
    if (!result.success) return;

    const insights = result.data.insights;
    if (!insights || insights.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">
          No insights generated for this period yet. Add expenses to receive personalized suggestions.
        </div>
      `;
      return;
    }

    container.innerHTML = insights.map(i => {
      const typeIcons = {
        danger: 'fa-triangle-exclamation',
        warning: 'fa-circle-exclamation',
        success: 'fa-circle-check',
        trend: 'fa-arrow-trend-up',
        info: 'fa-circle-info'
      };
      const icon = typeIcons[i.type] || 'fa-lightbulb';

      return `
        <div class="insight-item" style="padding: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span class="insight-title" style="font-size: 1rem;"><i class="fa-solid ${icon}"></i> ${i.title}</span>
            <span class="tag-badge" style="text-transform: uppercase; font-size: 0.7rem;">${i.type}</span>
          </div>
          <p class="insight-msg" style="font-size: 0.88rem; line-height: 1.6;">${i.message}</p>
          ${i.action ? `
            <div style="margin-top: 12px; padding: 8px 12px; background: rgba(99, 102, 241, 0.1); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
              <span class="insight-action" style="font-size: 0.82rem;"><strong>Recommendation:</strong> ${i.action}</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load insights:', err);
  }
}

// ==========================================
// UTILITIES
// ==========================================
function formatINR(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info'
  };

  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || 'fa-bell'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

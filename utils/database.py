import sqlite3
from pathlib import Path
from datetime import datetime


# Location of our SQLite database
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "database" / "spendwise.db"


def get_connection():
    """Create and return a connection to the SpendWise database."""

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():
    """Create the required database tables."""

    connection = get_connection()
    cursor = connection.cursor()

    # Transactions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            transaction_date TEXT NOT NULL,
            payment_method TEXT DEFAULT 'UPI',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Budget table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budget (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            monthly_budget REAL NOT NULL DEFAULT 12000
        )
    """)

    # Insert default budget if it doesn't exist
    cursor.execute("""
        INSERT OR IGNORE INTO budget (id, monthly_budget)
        VALUES (1, 12000)
    """)

    connection.commit()
    connection.close()


def add_transaction(
    merchant,
    amount,
    category,
    transaction_date,
    payment_method="UPI",
    notes=""
):
    """Add a new transaction to the database."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO transactions
        (merchant, amount, category, transaction_date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        merchant,
        amount,
        category,
        transaction_date,
        payment_method,
        notes
    ))

    connection.commit()

    transaction_id = cursor.lastrowid

    connection.close()

    return transaction_id


def get_transactions():
    """Return all transactions, newest first."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM transactions
        ORDER BY transaction_date DESC, id DESC
    """)

    transactions = cursor.fetchall()

    connection.close()

    return transactions

def get_transaction(transaction_id):
    """Return one transaction by ID."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM transactions
        WHERE id = ?
    """, (transaction_id,))

    transaction = cursor.fetchone()

    connection.close()

    return transaction


def get_monthly_budget():
    """Return the current monthly budget."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT monthly_budget
        FROM budget
        WHERE id = 1
    """)

    result = cursor.fetchone()

    connection.close()

    if result:
        return result["monthly_budget"]

    return 12000


def get_current_month_expenses():
    """Calculate total expenses for the current month."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT amount, transaction_date
        FROM transactions
    """)

    transactions = cursor.fetchall()

    connection.close()

    current_month = datetime.now().month
    current_year = datetime.now().year

    total = 0

    for transaction in transactions:

        date_string = transaction["transaction_date"]

        parsed_date = None

        # Date format from our form: DD/MM/YYYY
        try:
            parsed_date = datetime.strptime(
                date_string,
                "%d/%m/%Y"
            )

        except ValueError:

            # Also support YYYY-MM-DD
            try:
                parsed_date = datetime.strptime(
                    date_string,
                    "%Y-%m-%d"
                )

            except ValueError:
                continue

        if (
            parsed_date.month == current_month
            and parsed_date.year == current_year
        ):
            total += transaction["amount"]

    return total


def get_budget_details():
    """Return budget, spending, remaining amount and percentage."""

    monthly_budget = get_monthly_budget()
    current_expenses = get_current_month_expenses()

    budget_left = monthly_budget - current_expenses

    # Don't allow the percentage to go below 0
    percentage_remaining = (
        (budget_left / monthly_budget) * 100
        if monthly_budget > 0
        else 0
    )

    percentage_remaining = max(0, percentage_remaining)

    return {
        "monthly_budget": monthly_budget,
        "current_expenses": current_expenses,
        "budget_left": budget_left,
        "percentage_remaining": percentage_remaining
    }

def get_category_totals():
    """Return current month's spending grouped by category."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT category, amount, transaction_date
        FROM transactions
    """)

    transactions = cursor.fetchall()

    connection.close()

    current_month = datetime.now().month
    current_year = datetime.now().year

    category_totals = {}

    for transaction in transactions:

        date_string = transaction["transaction_date"]
        parsed_date = None

        # DD/MM/YYYY
        try:
            parsed_date = datetime.strptime(
                date_string,
                "%d/%m/%Y"
            )

        except ValueError:

            # YYYY-MM-DD
            try:
                parsed_date = datetime.strptime(
                    date_string,
                    "%Y-%m-%d"
                )

            except ValueError:
                continue

        # Only include current month's expenses
        if (
            parsed_date.month == current_month
            and parsed_date.year == current_year
        ):

            category = transaction["category"]
            amount = transaction["amount"]

            if category not in category_totals:
                category_totals[category] = 0

            category_totals[category] += amount

    return category_totals

def delete_transaction(transaction_id):
    """Delete a transaction by ID."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        DELETE FROM transactions
        WHERE id = ?
    """, (transaction_id,))

    connection.commit()
    connection.close()

def update_transaction(
    transaction_id,
    merchant,
    amount,
    category,
    transaction_date,
    payment_method="UPI",
    notes=""
):
    """Update an existing transaction."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE transactions
        SET merchant = ?,
            amount = ?,
            category = ?,
            transaction_date = ?,
            payment_method = ?,
            notes = ?
        WHERE id = ?
    """, (
        merchant,
        amount,
        category,
        transaction_date,
        payment_method,
        notes,
        transaction_id
    ))

    connection.commit()
    connection.close()
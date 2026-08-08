import sqlite3
from pathlib import Path


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
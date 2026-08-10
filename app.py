from flask import Flask, render_template, request, jsonify

from utils.database import (
    initialize_database,
    add_transaction,
    get_transactions,
    get_budget_details,
    get_category_totals
)


app = Flask(__name__)


# Initialize database when the application starts
initialize_database()


@app.route("/")
def dashboard():

    transactions = get_transactions()

    total_expense = sum(
        transaction["amount"]
        for transaction in transactions
    )

    budget_details = get_budget_details()

    category_totals = get_category_totals()

    return render_template(
        "dashboard.html",
        transactions=transactions,
        total_expense=total_expense,
        budget_details=budget_details,
        category_totals=category_totals
    )


@app.route("/add-expense", methods=["POST"])
def add_expense():

    data = request.get_json()

    merchant = data.get("merchant")
    amount = data.get("amount")
    category = data.get("category")
    transaction_date = data.get("transaction_date")
    payment_method = data.get("payment_method", "UPI")
    notes = data.get("notes", "")

    # Check required fields
    if not merchant or not amount or not category or not transaction_date:

        return jsonify({
            "success": False,
            "message": "Please fill in all required fields."
        }), 400

    try:

        transaction_id = add_transaction(
            merchant=merchant,
            amount=float(amount),
            category=category,
            transaction_date=transaction_date,
            payment_method=payment_method,
            notes=notes
        )

        return jsonify({
            "success": True,
            "message": "Expense added successfully!",
            "transaction_id": transaction_id
        })

    except Exception as e:

        print("Database error:", e)

        return jsonify({
            "success": False,
            "message": "Could not save the expense."
        }), 500


# Transactions page
@app.route("/transactions")
def transactions():

    transactions = get_transactions()

    return render_template(
        "transactions.html",
        transactions=transactions
    )


if __name__ == "__main__":
    app.run(debug=True)
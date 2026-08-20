let editingTransactionId = null;


const expenseModal = document.getElementById("expenseModal");
const expenseForm = document.getElementById("expenseForm");

const openExpenseModalButton =
    document.getElementById("openExpenseModal");

const closeExpenseModalButton =
    document.getElementById("closeExpenseModal");

const cancelExpenseButton =
    document.getElementById("cancelExpense");

const modalTitle =
    document.getElementById("expenseModalTitle");

const modalDescription =
    document.getElementById("expenseModalDescription");

const saveExpenseButton =
    document.getElementById("saveExpenseButton");


// ==========================================
// OPEN MODAL — ADD MODE
// ==========================================

if (openExpenseModalButton) {

    openExpenseModalButton.addEventListener("click", () => {

        editingTransactionId = null;

        expenseForm.reset();

        modalTitle.textContent = "Add Expense";

        modalDescription.textContent =
            "Record your spending and keep your finances organized.";

        saveExpenseButton.innerHTML =
            '<i class="fa-solid fa-check"></i> Save Expense';

        expenseModal.classList.add("active");

    });

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeExpenseModal() {

    expenseModal.classList.remove("active");

    editingTransactionId = null;

    expenseForm.reset();

}


if (closeExpenseModalButton) {

    closeExpenseModalButton.addEventListener(
        "click",
        closeExpenseModal
    );

}


if (cancelExpenseButton) {

    cancelExpenseButton.addEventListener(
        "click",
        closeExpenseModal
    );

}


// ==========================================
// CLOSE WHEN CLICKING OUTSIDE
// ==========================================

if (expenseModal) {

    expenseModal.addEventListener("click", (event) => {

        if (event.target === expenseModal) {

            closeExpenseModal();

        }

    });

}


// ==========================================
// EDIT TRANSACTION
// ==========================================

async function editTransaction(id) {

    try {

        const response = await fetch(
            `/get-transaction/${id}`
        );

        const result = await response.json();

        if (!result.success) {

            alert(result.message);

            return;

        }


        const transaction = result.transaction;


        editingTransactionId = id;


        // Fill form

        document.getElementById("merchant").value =
            transaction.merchant;

        document.getElementById("amount").value =
            transaction.amount;

        document.getElementById("transaction_date").value =
            transaction.transaction_date;

        document.getElementById("category").value =
            transaction.category;

        document.getElementById("payment_method").value =
            transaction.payment_method;

        document.getElementById("notes").value =
            transaction.notes || "";


        // Change modal appearance

        modalTitle.textContent = "Edit Expense";

        modalDescription.textContent =
            "Update your transaction details.";

        saveExpenseButton.innerHTML =
            '<i class="fa-solid fa-pen"></i> Update Expense';


        // Open modal

        expenseModal.classList.add("active");

    }

    catch (error) {

        console.error("Edit error:", error);

        alert(
            "Something went wrong while loading the transaction."
        );

    }

}


// ==========================================
// SUBMIT FORM
// ==========================================

if (expenseForm) {

    expenseForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const formData = {

                merchant:
                    document.getElementById("merchant").value,

                amount:
                    document.getElementById("amount").value,

                transaction_date:
                    document.getElementById("transaction_date").value,

                category:
                    document.getElementById("category").value,

                payment_method:
                    document.getElementById("payment_method").value,

                notes:
                    document.getElementById("notes").value

            };


            try {

                let url = "/add-expense";
                let method = "POST";


                // EDIT MODE

                if (editingTransactionId !== null) {

                    url =
                        `/update-transaction/${editingTransactionId}`;

                    method = "PUT";

                }


                const response = await fetch(
                    url,
                    {
                        method: method,

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(formData)

                    }
                );


                const result =
                    await response.json();


                if (result.success) {

                    alert(
                        editingTransactionId !== null
                            ? "Transaction updated successfully!"
                            : "Expense added successfully!"
                    );


                    // Reload so dashboard/table
                    // gets fresh SQLite data

                    window.location.reload();

                }

                else {

                    alert(result.message);

                }

            }

            catch (error) {

                console.error(
                    "Transaction error:",
                    error
                );

                alert(
                    "Something went wrong while saving the transaction."
                );

            }

        }
    );

}
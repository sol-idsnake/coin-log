"""Budget service: monthly budget management, categories, items, and summary."""

from db import Budget, BudgetCategory, BudgetItem, Session, Transaction
from utils import get_by_model_id, validate_month

from services.budget_defaults import DEFAULTS, CategoryName


def get_budget(month: str) -> Budget | None:
    """Fetch the budget for `month`; return None if it doesn't exist."""
    validate_month(month)
    return Session.query(Budget).filter_by(month=month).first()


def _previous_month_key(month: str) -> str:
    year, month_num = int(month[:4]), int(month[5:])
    if month_num == 1:
        return f"{year - 1}-12"
    return f"{year}-{month_num - 1:02d}"


def create_budget(month: str) -> Budget:
    """Create a budget for `month`, copying planned amounts from the previous month.

    Falls back to DEFAULTS if the previous month has no budget.
    Raises ValueError if month format is invalid.
    """
    validate_month(month)
    previous_month = _previous_month_key(month)
    previous_budget = Session.query(Budget).filter_by(month=previous_month).first()
    budget = Budget(month=month)
    categories_data = (
        [
            {
                "name": cat.name,
                "items": [
                    {"name": item.name, "planned_amount": item.planned_amount}
                    for item in cat.items
                ],
            }
            for cat in previous_budget.categories
        ]
        if previous_budget
        else DEFAULTS
    )
    for category_data in categories_data:
        category = BudgetCategory(name=category_data["name"])
        category.items.extend(
            BudgetItem(
                name=item_data["name"],
                planned_amount=item_data["planned_amount"],
            )
            for item_data in category_data["items"]
        )
        budget.categories.append(category)
    Session.add(budget)

    return budget


def compute_budget(budget: Budget) -> dict:
    """Return planned/spent/remaining summary for one budget month.

    Only transactions explicitly assigned to a budget item via
    Transaction.budget_item_id are counted. Cross-month assigned transactions
    are included. All amounts use abs(amount).
    """
    # Get all line item IDs for this budget
    budget_item_ids = [
        budget_item.id
        for category in budget.categories
        for budget_item in category.items
    ]

    # Fetch all non-deleted transactions assigned to this budget
    assigned_transactions: list[Transaction] = []
    if budget_item_ids:
        assigned_transactions = (
            Session.query(Transaction)
            .filter(
                Transaction.budget_item_id.in_(budget_item_ids),
                Transaction.is_deleted.is_(False),
            )
            .all()
        )

    # Sum abs(amount) per budget item — O(assigned)
    assigned_spent_by_item_id: dict[int, float] = {}
    for transaction in assigned_transactions:
        if transaction.budget_item_id is not None and transaction.amount is not None:
            assigned_spent_by_item_id[transaction.budget_item_id] = (
                assigned_spent_by_item_id.get(transaction.budget_item_id, 0.0)
                + abs(transaction.amount)
            )

    # Build serialized category and item summaries with planned/spent/remaining
    category_summaries = []

    for category in budget.categories:
        category_planned = 0.0
        category_spent = 0.0
        item_summaries = []

        for item in category.items:
            actual = assigned_spent_by_item_id.get(item.id, 0.0)

            actual = round(actual, 2)
            item_summaries.append(
                {
                    "actual": actual,
                    "id": item.id,
                    "name": item.name,
                    "planned_amount": item.planned_amount,
                    "remaining": round(item.planned_amount - actual, 2),
                }
            )
            category_planned += item.planned_amount
            category_spent += actual

        category_summaries.append(
            {
                "id": category.id,
                "items": item_summaries,
                "name": category.name,
                "planned": round(category_planned, 2),
                "remaining": round(category_planned - category_spent, 2),
                "spent": round(category_spent, 2),
                "type": "income" if category.name == CategoryName.INCOME else "expense",
            }
        )

    return {
        "categories": category_summaries,
        "month": budget.month,
    }


def create_item(
    category_id: int,
    name: str,
    planned_amount: float,
) -> BudgetItem:
    """Add a new line item to a budget category.

    Raises LookupError if category_id does not exist.
    """
    get_by_model_id(BudgetCategory, category_id)
    item = BudgetItem(
        budget_category_id=category_id,
        name=name,
        planned_amount=planned_amount,
    )
    Session.add(item)

    return item


def update_item(
    item_id: int,
    name: str | None = None,
    planned_amount: float | None = None,
) -> BudgetItem:
    """Update a budget item's name and/or planned amount.

    Raises LookupError if not found.
    """
    item = get_by_model_id(BudgetItem, item_id)
    if name is not None:
        item.name = name
    if planned_amount is not None:
        item.planned_amount = planned_amount

    return item


def delete_item(item_id: int) -> None:
    """Delete a budget line item.

    Raises LookupError if not found.
    """
    item = get_by_model_id(BudgetItem, item_id)
    Session.delete(item)


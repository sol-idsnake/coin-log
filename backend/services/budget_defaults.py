"""Default budget categories and items seeded when a new budget month is created."""

from enum import Enum


class CategoryName(str, Enum):
    """Canonical names for the default budget categories."""

    FOOD = "Food"
    HEALTH = "Health"
    HOUSING = "Housing"
    INCOME = "Income"
    PERSONAL = "Personal"
    SAVINGS = "Savings"
    TRANSPORTATION = "Transportation"


# Income is listed first; expense categories follow in display order.
DEFAULTS = [
    {
        "name": CategoryName.INCOME,
        "items": [
            {"name": "Paycheck", "planned_amount": 0.0},
        ],
    },
    {
        "name": CategoryName.SAVINGS,
        "items": [
            {"name": "Emergency Fund", "planned_amount": 0.0},
            {"name": "Investments", "planned_amount": 0.0},
        ],
    },
    {
        "name": CategoryName.HOUSING,
        "items": [
            {"name": "Home Maintenance", "planned_amount": 0.0},
            {"name": "Mortgage/Rent", "planned_amount": 0.0},
            {"name": "Utilities", "planned_amount": 0.0},
        ],
    },
    {
        "name": CategoryName.TRANSPORTATION,
        "items": [
            {"name": "Car Insurance", "planned_amount": 0.0},
            {"name": "Gas", "planned_amount": 0.0},
        ],
    },
    {
        "name": CategoryName.FOOD,
        "items": [
            {"name": "Groceries", "planned_amount": 0.0},
            {"name": "Restaurants", "planned_amount": 0.0},
        ],
    },
    {
        "name": CategoryName.PERSONAL,
        "items": [
            {"name": "Entertainment", "planned_amount": 0.0},
            {"name": "Shopping", "planned_amount": 0.0},
            {"name": "Subscriptions", "planned_amount": 0.0},
        ],
    },
    {
        "name": CategoryName.HEALTH,
        "items": [
            {"name": "Gym", "planned_amount": 0.0},
            {"name": "Medical", "planned_amount": 0.0},
        ],
    },
]

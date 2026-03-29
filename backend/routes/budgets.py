"""Budget routes: monthly budget summary and budget item CRUD."""

from flask import Blueprint, jsonify, request
from services import budgets as budget_service

bp = Blueprint("budgets", __name__)


@bp.get("/api/budgets/<month>")
def get_budget(month):
    """Return computed planned/spent/remaining totals for the month."""
    budget = budget_service.get_budget(month)
    if budget is None:
        raise LookupError(f"Budget {month} not found")
    return jsonify(budget_service.compute_budget(budget))


@bp.post("/api/budgets/<month>")
def create_budget(month):
    """Create the budget for a month, copying from the previous month if it exists."""
    budget = budget_service.create_budget(month)
    return jsonify(budget_service.compute_budget(budget)), 201


@bp.post("/api/budget-items")
def create_item():
    """Add a new line item to a budget category."""
    data = request.get_json(force=True) or {}
    category_id = data.get("category_id")
    name = data.get("name")
    if category_id is None or not name:
        return jsonify({"error": "category_id and name are required"}), 400
    item = budget_service.create_item(
        category_id=category_id,
        name=name,
        planned_amount=data.get("planned_amount", 0.0),
    )
    return jsonify(item.to_dict()), 201


@bp.patch("/api/budget-items/<int:item_id>")
def update_item(item_id):
    """Update a budget item."""
    data = request.get_json(force=True) or {}
    name = data.get("name")
    planned_amount = data.get("planned_amount")
    if name is None and planned_amount is None:
        return jsonify(
            {"error": "At least one of name or planned_amount must be provided"}
        ), 400
    item = budget_service.update_item(
        item_id,
        name=name,
        planned_amount=planned_amount,
    )
    return jsonify(item.to_dict())


@bp.delete("/api/budget-items/<int:item_id>")
def delete_item(item_id):
    """Delete a budget line item."""
    budget_service.delete_item(item_id)
    return "", 204

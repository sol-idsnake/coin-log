"""Transaction routes: sync, list with filters, manual CRUD, and budget assignment."""

from flask import Blueprint, jsonify, request
from services import transactions as transaction_service

bp = Blueprint("transactions", __name__)


@bp.post("/api/sync")
def sync_all():
    """Fetch new/modified/removed transactions from Plaid for all institutions."""
    summary = transaction_service.sync_all()
    return jsonify({"synced": summary})


@bp.get("/api/transactions")
def list_transactions():
    """Return transactions with optional filters.

    Query params: month (YYYY-MM), account_id, deleted (bool), uncategorized (bool).
    """
    transactions = transaction_service.get_all(
        month=request.args.get("month"),
        account_id=request.args.get("account_id", type=int),
        deleted=request.args.get("deleted", "false").lower() == "true",
        uncategorized=request.args.get("uncategorized", "false").lower() == "true",
    )
    return jsonify([transaction.to_dict() for transaction in transactions])


@bp.post("/api/transactions")
def create_transaction():
    """Create a manual transaction."""
    data = request.get_json(force=True)
    date = data.get("date")
    amount = data.get("amount")
    account_id = data.get("account_id")
    if date is None or amount is None or account_id is None:
        return jsonify({"error": "date, amount, and account_id are required"}), 400
    transaction = transaction_service.create_manual(
        date=date,
        amount=amount,
        note=data.get("note"),
        account_id=account_id,
        check_number=data.get("check_number"),
        merchant_name=data.get("merchant_name"),
    )
    return jsonify(transaction.to_dict()), 201


@bp.patch("/api/transactions/<int:transaction_id>")
def update_transaction(transaction_id):
    """Edit a transaction's fields."""
    data = request.get_json(force=True)
    transaction = transaction_service.update(
        transaction_id,
        date=data.get("date"),
        note=data.get("note"),
        amount=data.get("amount"),
        is_deleted=data.get("is_deleted"),
        check_number=data.get("check_number"),
        merchant_name=data.get("merchant_name"),
    )
    return jsonify(transaction.to_dict())


@bp.delete("/api/transactions/<int:transaction_id>")
def delete_transaction(transaction_id):
    """Hard-delete a transaction."""
    transaction_service.delete(transaction_id)
    return "", 204


@bp.post("/api/transactions/<int:transaction_id>/assignment")
def assign_transaction(transaction_id):
    """Assign (or reassign) a transaction to a budget item."""
    data = request.get_json(force=True)
    budget_item_id = data.get("budget_item_id")
    if budget_item_id is None:
        return jsonify({"error": "budget_item_id is required"}), 400
    transaction_service.set_assignment(transaction_id, budget_item_id)
    return jsonify({}), 201


@bp.delete("/api/transactions/<int:transaction_id>/assignment")
def unassign_transaction(transaction_id):
    """Remove a transaction's explicit budget item assignment."""
    transaction_service.remove_assignment(transaction_id)
    return "", 204

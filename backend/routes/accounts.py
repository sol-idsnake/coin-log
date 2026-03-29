"""Account routes: list all accounts and manual account CRUD."""

from flask import Blueprint, jsonify, request
from services import accounts as account_service

bp = Blueprint("accounts", __name__)


@bp.get("/api/accounts")
def list_accounts():
    """Return all accounts from the database."""
    return jsonify([account.to_dict() for account in account_service.get_all()])


@bp.post("/api/accounts")
def create_account():
    """Add a manual account."""
    data = request.get_json(force=True)
    name = data.get("name")
    type_ = data.get("type")
    if not name or not type_:
        return jsonify({"error": "name and type are required"}), 400
    account = account_service.create_manual(
        current_balance=data.get("current_balance", 0.0),
        name=name,
        subtype=data.get("subtype"),
        type=type_,
    )
    return jsonify(account.to_dict()), 201


@bp.patch("/api/accounts/<int:account_id>")
def update_account(account_id):
    """Update a manual account's name and/or balance."""
    data = request.get_json(force=True)
    account = account_service.update(
        account_id,
        current_balance=data.get("current_balance"),
        name=data.get("name"),
    )
    return jsonify(account.to_dict())


@bp.delete("/api/accounts/<int:account_id>")
def delete_account(account_id):
    """Remove an account and all its transactions."""
    account_service.delete(account_id)
    return "", 204

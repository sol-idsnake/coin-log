"""Account routes: list all accounts and manual account CRUD."""

from db import with_session
from flask import Blueprint, jsonify, request
from services import accounts as account_service

bp = Blueprint("accounts", __name__)


@bp.get("/api/accounts")
@with_session
def list_accounts(session):
    """Return all accounts from the database."""
    return jsonify([account.to_dict() for account in account_service.get_all(session)])


@bp.post("/api/accounts")
@with_session
def create_account(session):
    """Add a manual account."""
    data = request.get_json(force=True)
    name = data.get("name")
    type_ = data.get("type")
    if not name or not type_:
        return jsonify({"error": "name and type are required"}), 400
    account = account_service.create_manual(
        session,
        current_balance=data.get("current_balance", 0.0),
        name=name,
        subtype=data.get("subtype"),
        type=type_,
    )
    return jsonify(account.to_dict()), 201


@bp.patch("/api/accounts/<int:account_id>")
@with_session
def update_account(session, account_id):
    """Update a manual account's name and/or balance."""
    data = request.get_json(force=True)
    account = account_service.update(
        session,
        account_id,
        current_balance=data.get("current_balance"),
        name=data.get("name"),
    )
    return jsonify(account.to_dict())


@bp.delete("/api/accounts/<int:account_id>")
@with_session
def delete_account(session, account_id):
    """Remove an account and all its transactions."""
    account_service.delete(session, account_id)
    return "", 204

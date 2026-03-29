"""Plaid Link routes: create_link_token and set_access_token."""

from flask import Blueprint, jsonify, request
from services import plaid as plaid_service

bp = Blueprint("plaid", __name__)


@bp.post("/api/create_link_token")
def create_link_token():
    """Create a Plaid Link token for the frontend to initialize the Link flow."""
    return jsonify({"link_token": plaid_service.create_link_token()})


@bp.post("/api/set_access_token")
def set_access_token():
    """Exchange a public_token and persist Institution + Accounts."""
    body = request.get_json(silent=True) or {}
    public_token = body.get("public_token")
    if not public_token:
        return jsonify({"error": "public_token is required"}), 400
    result = plaid_service.exchange_public_token(public_token)
    return jsonify(result)

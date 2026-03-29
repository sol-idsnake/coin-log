"""Institution routes: list, disconnect, and per-institution sync."""

from flask import Blueprint, jsonify
from services import institutions as institution_service
from services import transactions as transaction_service

bp = Blueprint("institutions", __name__)


@bp.get("/api/institutions")
def list_institutions():
    """Return all connected institutions."""
    institutions = institution_service.get_all()
    return jsonify([institution.to_dict() for institution in institutions])


@bp.delete("/api/institutions/<int:institution_id>")
def disconnect_institution(institution_id):
    """Disconnect an institution and cascade-delete its accounts and transactions."""
    institution_service.disconnect(institution_id)
    return "", 204


@bp.post("/api/institutions/<int:institution_id>/sync")
def sync_institution(institution_id):
    """Trigger a Plaid transaction sync for a single institution."""
    summary = transaction_service.sync_institution(institution_id)
    return jsonify({"synced": summary})

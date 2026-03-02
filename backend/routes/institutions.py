"""Institution routes: list, disconnect, and per-institution sync."""

from db import with_session
from flask import Blueprint, jsonify
from services import institutions as institution_service
from services import transactions as transaction_service

bp = Blueprint("institutions", __name__)


@bp.get("/api/institutions")
@with_session
def list_institutions(session):
    """Return all connected institutions."""
    institutions = institution_service.get_all(session)
    return jsonify([institution.to_dict() for institution in institutions])


@bp.delete("/api/institutions/<int:institution_id>")
@with_session
def disconnect_institution(session, institution_id):
    """Disconnect an institution and cascade-delete its accounts and transactions."""
    institution_service.disconnect(session, institution_id)
    return "", 204


@bp.post("/api/institutions/<int:institution_id>/sync")
@with_session
def sync_institution(session, institution_id):
    """Trigger a Plaid transaction sync for a single institution."""
    summary = transaction_service.sync_institution(session, institution_id)
    session.commit()
    return jsonify({"synced": summary})

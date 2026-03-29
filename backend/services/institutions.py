"""Institution service: list connected institutions and disconnect."""

from db import Institution, Session
from utils import get_by_model_id


def get_all() -> list[Institution]:
    """Return all institutions ordered by name."""
    return Session.query(Institution).order_by(Institution.name).all()


def disconnect(institution_id: int) -> None:
    """Delete an institution and cascade to its accounts and transactions.

    Raises LookupError if not found.
    """
    institution = get_by_model_id(Institution, institution_id)
    Session.delete(institution)


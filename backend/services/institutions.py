"""Institution service: list connected institutions and disconnect."""

from db import Institution
from utils import get_by_model_id


def get_all(session) -> list[Institution]:
    """Return all institutions ordered by name."""
    return session.query(Institution).order_by(Institution.name).all()


def disconnect(session, institution_id: int) -> None:
    """Delete an institution and cascade to its accounts and transactions.

    Raises LookupError if not found.
    """
    institution = get_by_model_id(session, Institution, institution_id)
    session.delete(institution)
    session.commit()

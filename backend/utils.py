"""Shared utility helpers used across the backend."""

import re

_MONTH_RE = re.compile(r"^\d{4}-\d{2}$")


def get_by_model_id(session, model_class, record_id: int):
    """Fetch a record by primary key; raise LookupError if absent."""
    record = session.get(model_class, record_id)
    if record is None:
        raise LookupError(f"{model_class.__name__} {record_id} not found")
    return record


def validate_month(month: str) -> None:
    """Raise ValueError if month is not YYYY-MM."""
    if not _MONTH_RE.match(month):
        raise ValueError(f"Invalid month format '{month}'. Expected YYYY-MM.")

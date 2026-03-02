"""Account service: list all accounts, and manual account CRUD."""

from db import Account
from utils import get_by_model_id


def get_all(session) -> list[Account]:
    """Return all accounts (Plaid and manual) ordered by name."""
    return session.query(Account).order_by(Account.name).all()


def create_manual(
    session,
    name: str,
    type: str,
    current_balance: float,
    subtype: str | None = None,
) -> Account:
    """Create a new manually-added account."""
    account = Account(
        type=type,
        name=name,
        is_manual=True,
        subtype=subtype,
        institution_id=None,
        plaid_account_id=None,
        current_balance=current_balance,
    )
    session.add(account)
    session.commit()
    return account


def update(
    session,
    account_id: int,
    name: str | None = None,
    current_balance: float | None = None,
) -> Account:
    """Update a manual account's name and/or balance.

    Raises LookupError if not found.
    """
    account = get_by_model_id(session, Account, account_id)
    if current_balance is not None:
        account.current_balance = current_balance
    if name is not None:
        account.name = name
    session.commit()
    return account


def delete(session, account_id: int) -> None:
    """Delete an account and cascade to its transactions.

    Raises LookupError if not found.
    """
    account = get_by_model_id(session, Account, account_id)
    session.delete(account)
    session.commit()

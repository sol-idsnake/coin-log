"""Transaction service: Plaid sync, filtering, manual CRUD, and budget assignment."""

from datetime import date, datetime

from config import plaid_client
from db import Account, BudgetItem, Institution, Session, Transaction
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from utils import get_by_model_id

# Transactions older than this date are ignored on first sync to limit data volume.
LOOKBACK_START = date(2026, 1, 1)


def _category_string(category_list: list[str] | None) -> str | None:
    """Join Plaid's category list (e.g. ['Food', 'Restaurants']) into a string."""
    if category_list:
        return " > ".join(category_list)
    return None


def _upsert_transaction(account_id: int, transaction) -> None:
    """Insert or update a single Plaid transaction in the database."""
    existing = (
        Session.query(Transaction)
        .filter_by(plaid_transaction_id=transaction.transaction_id)
        .first()
    )
    if existing:
        existing.amount = transaction.amount
        existing.category = _category_string(transaction.category)
        existing.date = transaction.date.isoformat() if transaction.date else None
        existing.merchant_name = transaction.merchant_name
        existing.name = transaction.name
        existing.pending = transaction.pending
    else:
        Session.add(
            Transaction(
                account_id=account_id,
                amount=transaction.amount,
                category=_category_string(transaction.category),
                date=transaction.date.isoformat() if transaction.date else None,
                is_deleted=False,
                merchant_name=transaction.merchant_name,
                name=transaction.name,
                pending=transaction.pending,
                plaid_transaction_id=transaction.transaction_id,
            )
        )


def _sync_one(institution: Institution) -> dict:
    """Sync transactions for a single institution from Plaid.

    Updates the institution's cursor and last_synced_at in-place.
    Returns a summary dict with added/modified/removed counts.
    """
    account_map = {a.plaid_account_id: a.id for a in institution.accounts}
    added_count = modified_count = removed_count = 0
    cursor = institution.sync_cursor or ""
    has_more = True
    lookback = (
        institution.last_synced_at.date()
        if institution.last_synced_at
        else LOOKBACK_START
    )

    while has_more:
        response = plaid_client.transactions_sync(
            TransactionsSyncRequest(
                access_token=institution.access_token, cursor=cursor
            )
        )

        for transaction in response.added + response.modified:
            if transaction.date and transaction.date < lookback:
                continue
            db_account_id = account_map.get(transaction.account_id)
            if db_account_id is None:
                continue
            _upsert_transaction(db_account_id, transaction)
        added_count += len(response.added)
        modified_count += len(response.modified)

        for removed in response.removed:
            if removed.transaction_id is None:
                continue
            transaction = (
                Session.query(Transaction)
                .filter_by(plaid_transaction_id=removed.transaction_id)
                .first()
            )
            if transaction:
                Session.delete(transaction)
        removed_count += len(response.removed)

        cursor = response.next_cursor
        has_more = response.has_more

    institution.sync_cursor = cursor
    institution.last_synced_at = datetime.now()

    return {
        "added": added_count,
        "institution": institution.name,
        "modified": modified_count,
        "removed": removed_count,
    }


def sync_all() -> dict:
    """Sync transactions for all institutions.

    Raises ValueError if no institutions are linked.
    Returns a summary dict keyed by institution id.
    """
    institutions = Session.query(Institution).all()
    if not institutions:
        raise ValueError("No linked accounts found. Connect a bank first.")
    result = {inst.id: _sync_one(inst) for inst in institutions}

    return result


def sync_institution(institution_id: int) -> dict:
    """Sync transactions for a single institution by id.

    Raises LookupError if not found.
    """
    institution = get_by_model_id(Institution, institution_id)
    result = _sync_one(institution)

    return result


def get_all(
    account_id: int | None = None,
    deleted: bool = False,
    month: str | None = None,
    uncategorized: bool = False,
) -> list[Transaction]:
    """Return transactions with optional filters, newest-first.

    - month: filter to YYYY-MM
    - account_id: filter to a specific account
    - deleted: when True return only soft-deleted rows; otherwise exclude them
    - uncategorized: expense transactions with no budget assignment only

    """
    query = Session.query(Transaction)

    if month:
        query = query.filter(Transaction.date.like(f"{month}-%"))
    if account_id is not None:
        query = query.filter(Transaction.account_id == account_id)

    query = query.filter(Transaction.is_deleted == deleted)

    if uncategorized:
        query = query.filter(
            Transaction.amount > 0,
            Transaction.budget_item_id.is_(None),
        )

    return query.order_by(Transaction.date.desc()).all()


def create_manual(
    account_id: int,
    amount: float,
    date: str,
    check_number: str | None = None,
    merchant_name: str | None = None,
    note: str | None = None,
) -> Transaction:
    """Create a manually-entered transaction.

    Raises LookupError if account_id does not exist.
    """
    get_by_model_id(Account, account_id)
    transaction = Transaction(
        account_id=account_id,
        amount=amount,
        check_number=check_number,
        date=date,
        is_deleted=False,
        merchant_name=merchant_name,
        note=note,
        plaid_transaction_id=None,
    )
    Session.add(transaction)

    return transaction


def update(
    transaction_id: int,
    amount: float | None = None,
    check_number: str | None = None,
    date: str | None = None,
    is_deleted: bool | None = None,
    merchant_name: str | None = None,
    note: str | None = None,
) -> Transaction:
    """Edit a transaction's fields.

    Raises LookupError if not found.
    """
    transaction = get_by_model_id(Transaction, transaction_id)
    if amount is not None:
        transaction.amount = amount
    if check_number is not None:
        transaction.check_number = check_number
    if date is not None:
        transaction.date = date
    if is_deleted is not None:
        transaction.is_deleted = is_deleted
    if merchant_name is not None:
        transaction.merchant_name = merchant_name
    if note is not None:
        transaction.note = note

    return transaction


def delete(transaction_id: int) -> None:
    """Permanently delete a transaction.

    Raises LookupError if not found.
    """
    transaction = get_by_model_id(Transaction, transaction_id)
    Session.delete(transaction)



def set_assignment(transaction_id: int, budget_item_id: int) -> None:
    """Assign (or reassign) a transaction to a budget item.

    Raises LookupError if transaction or budget_item not found.
    """
    transaction = get_by_model_id(Transaction, transaction_id)
    get_by_model_id(BudgetItem, budget_item_id)
    transaction.budget_item_id = budget_item_id



def remove_assignment(transaction_id: int) -> None:
    """Remove a transaction's explicit budget item assignment.

    Raises LookupError if transaction not found.
    """
    transaction = get_by_model_id(Transaction, transaction_id)
    transaction.budget_item_id = None


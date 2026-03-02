"""SQLAlchemy setup: engine, session factory, ORM models, and init_db helper."""

import functools
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)

DATABASE_URL = "sqlite:///coin_log.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


class Institution(Base):
    """Represents a connected bank (a Plaid Item)."""

    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    access_token: Mapped[str | None]
    connection_type: Mapped[str | None]
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    logo_url: Mapped[str | None]
    name: Mapped[str | None]
    plaid_item_id: Mapped[str | None] = mapped_column(unique=True)
    sync_cursor: Mapped[str] = mapped_column(default="")
    accounts: Mapped[list["Account"]] = relationship(
        back_populates="institution", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Serialize to a JSON-safe dict for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "logo_url": self.logo_url,
            "plaid_item_id": self.plaid_item_id,
            "connection_type": self.connection_type,
            "last_synced_at": self.last_synced_at.isoformat()
            if self.last_synced_at
            else None,
        }


class Account(Base):
    """A bank account within an Institution, or a manually-added account."""

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    current_balance: Mapped[float | None]
    institution_id: Mapped[int | None] = mapped_column(ForeignKey("institutions.id"))
    institution: Mapped["Institution | None"] = relationship(back_populates="accounts")
    is_manual: Mapped[bool] = mapped_column(default=False)
    mask: Mapped[str | None]
    name: Mapped[str | None]
    plaid_account_id: Mapped[str | None] = mapped_column(unique=True)
    subtype: Mapped[str | None]
    type: Mapped[str | None]
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Serialize to a JSON-safe dict for API responses."""
        return {
            "id": self.id,
            "mask": self.mask,
            "name": self.name,
            "type": self.type,
            "subtype": self.subtype,
            "is_manual": self.is_manual,
            "institution_id": self.institution_id,
            "current_balance": self.current_balance,
            "plaid_account_id": self.plaid_account_id,
            "institution_name": self.institution.name if self.institution else None,
        }


class Transaction(Base):
    """A single financial event from Plaid or entered manually."""

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    account: Mapped["Account"] = relationship(back_populates="transactions")
    amount: Mapped[float | None]
    budget_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("budget_items.id"), nullable=True
    )
    category: Mapped[str | None]
    check_number: Mapped[str | None]
    date: Mapped[str | None]
    is_deleted: Mapped[bool] = mapped_column(default=False)
    merchant_name: Mapped[str | None]
    name: Mapped[str | None]
    note: Mapped[str | None]
    pending: Mapped[bool | None]
    plaid_transaction_id: Mapped[str | None] = mapped_column(unique=True)
    type_override: Mapped[str | None]

    def to_dict(self) -> dict:
        """Serialize to a JSON-safe dict; derives `type` from amount sign."""
        if self.type_override:
            transaction_type = self.type_override
        elif self.amount is not None:
            transaction_type = "income" if self.amount < 0 else "expense"
        else:
            transaction_type = None
        return {
            "id": self.id,
            "type": transaction_type,
            "date": self.date,
            "name": self.name,
            "amount": self.amount,
            "pending": self.pending,
            "category": self.category,
            "account_id": self.account_id,
            "is_deleted": self.is_deleted,
            "check_number": self.check_number,
            "merchant_name": self.merchant_name,
            "plaid_transaction_id": self.plaid_transaction_id,
            "budget_item_id": self.budget_item_id,
            "note": self.note,
        }



class Budget(Base):
    """Monthly budget envelope, uniquely identified by YYYY-MM."""

    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    month: Mapped[str] = mapped_column(unique=True)
    categories: Mapped[list["BudgetCategory"]] = relationship(
        back_populates="budget",
        cascade="all, delete-orphan",
        order_by="BudgetCategory.id",
    )

    def to_dict(self) -> dict:
        """Serialize to a JSON-safe dict for API responses."""
        return {
            "id": self.id,
            "month": self.month,
            "categories": [c.to_dict() for c in self.categories],
        }


class BudgetCategory(Base):
    """Named group of budget items within a Budget (e.g. Income, Housing)."""

    __tablename__ = "budget_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"))
    budget: Mapped["Budget"] = relationship(back_populates="categories")
    name: Mapped[str]
    items: Mapped[list["BudgetItem"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="BudgetItem.id",
    )

    def to_dict(self) -> dict:
        """Serialize to a JSON-safe dict for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "items": [i.to_dict() for i in self.items],
        }


class BudgetItem(Base):
    """Individual line item within a BudgetCategory (e.g. Mortgage, Groceries)."""

    __tablename__ = "budget_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    budget_category_id: Mapped[int] = mapped_column(ForeignKey("budget_categories.id"))
    category: Mapped["BudgetCategory"] = relationship(back_populates="items")
    name: Mapped[str]
    planned_amount: Mapped[float] = mapped_column(default=0.0)

    def to_dict(self) -> dict:
        """Serialize to a JSON-safe dict for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "planned_amount": self.planned_amount,
        }


def with_session(f):
    """Inject an open session as first arg; roll back on exception, always close."""

    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        session = Session()
        try:
            return f(session, *args, **kwargs)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    return wrapper


def init_db() -> None:
    """Create all tables if they don't already exist."""
    Base.metadata.create_all(engine)

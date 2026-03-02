"""Plaid Link service: link token creation and public token exchange."""

from config import plaid_client
from db import Account, Institution
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products

_COUNTRY_CODES = [CountryCode("US")]


def create_link_token() -> str:
    """Create and return a Plaid Link token for the frontend Link flow."""
    response = plaid_client.link_token_create(
        LinkTokenCreateRequest(
            client_name="coin-log",
            country_codes=_COUNTRY_CODES,
            language="en",
            products=[Products("transactions")],
            user=LinkTokenCreateRequestUser(client_user_id="coin-log-user"),
        )
    )
    return response.link_token


def exchange_public_token(public_token: str, session) -> dict:
    """Exchange a public_token for an access_token and persist Institution + Accounts.

    Creates or updates the Institution row, then upserts all linked accounts.
    Returns a dict with institution_id and institution_name.
    Propagates plaid.ApiException on Plaid API errors.
    """
    exchange_response = plaid_client.item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token=public_token)
    )
    access_token = exchange_response.access_token
    plaid_item_id = exchange_response.item_id

    item_response = plaid_client.item_get(ItemGetRequest(access_token=access_token))
    plaid_institution_id = item_response.item.institution_id
    institution_name = None
    if plaid_institution_id:
        inst_response = plaid_client.institutions_get_by_id(
            InstitutionsGetByIdRequest(
                country_codes=_COUNTRY_CODES,
                institution_id=plaid_institution_id,
            )
        )
        institution_name = inst_response.institution.name

    institution = (
        session.query(Institution).filter_by(plaid_item_id=plaid_item_id).first()
    )
    if institution:
        institution.access_token = access_token
        institution.name = institution_name
    else:
        institution = Institution(
            access_token=access_token,
            name=institution_name,
            plaid_item_id=plaid_item_id,
            sync_cursor="",
        )
        session.add(institution)
        # Flush so institution.id is populated before inserting accounts
        session.flush()

    accounts_response = plaid_client.accounts_get(
        AccountsGetRequest(access_token=access_token)
    )
    for acct in accounts_response.accounts:
        existing = (
            session.query(Account).filter_by(plaid_account_id=acct.account_id).first()
        )
        balance = acct.balances.current if acct.balances else None
        subtype = acct.subtype.value if acct.subtype else None
        type_ = acct.type.value if acct.type else None
        if existing:
            existing.current_balance = balance
            existing.mask = acct.mask
            existing.name = acct.name
            existing.subtype = subtype
            existing.type = type_
        else:
            session.add(
                Account(
                    current_balance=balance,
                    institution_id=institution.id,
                    is_manual=False,
                    mask=acct.mask,
                    name=acct.name,
                    plaid_account_id=acct.account_id,
                    subtype=subtype,
                    type=type_,
                )
            )

    return {"institution_id": institution.id, "institution_name": institution_name}

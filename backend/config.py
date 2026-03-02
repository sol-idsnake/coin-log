"""Loads environment variables and constructs a configured Plaid API client."""

import os

import plaid
from dotenv import load_dotenv
from plaid.api import plaid_api

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")
PLAID_SECRET = os.getenv("PLAID_SECRET")


def _build_plaid_client() -> plaid_api.PlaidApi:
    """Build and return a configured PlaidApi instance."""
    host = getattr(plaid.Environment, PLAID_ENV.capitalize(), plaid.Environment.Sandbox)
    configuration = plaid.Configuration(
        host=host,
        api_key={"clientId": PLAID_CLIENT_ID, "secret": PLAID_SECRET},
    )
    return plaid_api.PlaidApi(plaid.ApiClient(configuration))


plaid_client: plaid_api.PlaidApi = _build_plaid_client()

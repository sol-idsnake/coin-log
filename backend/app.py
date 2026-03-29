"""Flask application factory and entry point for the coin-log backend."""

import os

import plaid
from db import Session, init_db
from flask import Flask, jsonify
from flask.wrappers import Response
from flask_cors import CORS
from routes.accounts import bp as accounts_bp
from routes.budgets import bp as budgets_bp
from routes.institutions import bp as institutions_bp
from routes.plaid import bp as plaid_bp
from routes.transactions import bp as transactions_bp


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)

    CORS(
        app,
        resources={
            r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}
        },
    )

    init_db()

    @app.after_request
    def commit_db_session(response: Response) -> Response:
        """Commit pending writes before the response is sent.

        Committing here (rather than in teardown) ensures the client is informed
        of write failures.
        """
        if response.status_code < 400:
            try:
                Session.commit()
            except Exception:
                Session.rollback()
                return jsonify({"error": "An unexpected error occurred"}), 500
        return response

    @app.teardown_appcontext
    def close_db_session(exception: BaseException | None) -> None:
        """Clean up the scoped session at the end of every request.

        Without explicit removal, the session instance would persist
        indefinitely and accumulate stale state across requests.
        """
        if exception:
            Session.rollback()
        Session.remove()

    app.register_blueprint(accounts_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(institutions_bp)
    app.register_blueprint(plaid_bp)
    app.register_blueprint(transactions_bp)

    @app.errorhandler(plaid.ApiException)
    def handle_plaid_error(e):
        """Map any unhandled Plaid API exception to a 500 JSON response."""
        return jsonify({"error": e.body}), 500

    @app.errorhandler(LookupError)
    def handle_lookup_error(error):
        """Map any unhandled LookupError to a 404 JSON response."""
        return jsonify({"error": str(error)}), 404

    @app.errorhandler(ValueError)
    def handle_value_error(error):
        """Map any unhandled ValueError to a 400 JSON response."""
        return jsonify({"error": str(error)}), 400

    return app


app = create_app()

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug)

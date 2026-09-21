import time

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError

db = SQLAlchemy()


def init_db(app) -> None:
    """Create tables, waiting for the database to accept connections."""
    retries = app.config["DB_CONNECT_RETRIES"]
    delay = app.config["DB_CONNECT_DELAY"]

    with app.app_context():
        import models  # noqa: F401  (registers all tables on db.metadata)

        for attempt in range(1, retries + 1):
            try:
                db.create_all()
                return
            except OperationalError:
                if attempt == retries:
                    raise
                app.logger.warning("Database not ready (%d/%d), retrying in %ss", attempt, retries, delay)
                time.sleep(delay)

import os

from sqlalchemy.engine import URL


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _database_uri() -> str:
    # DATABASE_URL wins (handy for local runs / tests); otherwise build from DB_* vars.
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit
    return URL.create(
        "postgresql+psycopg2",
        username=os.getenv("DB_USER", "fms"),
        password=os.getenv("DB_PASSWORD", "fms123"),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "fms"),
    ).render_as_string(hide_password=False)


class Config:
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flask-RESTX
    RESTX_MASK_SWAGGER = False
    ERROR_404_HELP = False

    # Business settings
    APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")  # defines "today" on the dashboard
    DEFAULT_CASE_ASSIGNEE = os.getenv("DEFAULT_CASE_ASSIGNEE", "Fraud Analyst")
    SEED_DEMO_DATA = _bool("SEED_DEMO_DATA", True)

    # Startup
    DB_CONNECT_RETRIES = int(os.getenv("DB_CONNECT_RETRIES", "15"))
    DB_CONNECT_DELAY = float(os.getenv("DB_CONNECT_DELAY", "2"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")  # comma-separated; empty = CORS disabled

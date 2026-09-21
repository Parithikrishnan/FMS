import uuid
from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """Naive UTC timestamp (all DB timestamps are stored as UTC)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


def num(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def money(value: Decimal) -> str:
    return f"₹{value:,.2f}"


def start_of_today_utc(tz_name: str) -> datetime:
    """Start of the current day in `tz_name`, expressed as naive UTC."""
    tz = ZoneInfo(tz_name)
    local_midnight = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    return local_midnight.astimezone(timezone.utc).replace(tzinfo=None)


def list_parser(*filters: str):
    """Query-string parser: limit/offset paging plus the given string filters."""
    from flask_restx import reqparse

    parser = reqparse.RequestParser()
    parser.add_argument("limit", type=int, default=50, help="Page size (1-200)", location="args")
    parser.add_argument("offset", type=int, default=0, help="Rows to skip", location="args")
    for name in filters:
        parser.add_argument(name, type=str, location="args")
    return parser


def page(items: list, total: int, args: dict) -> dict:
    return {
        "items": [i.to_dict() for i in items],
        "total": total,
        "limit": args["limit"],
        "offset": args["offset"],
    }


def clamp_paging(args: dict) -> dict:
    args["limit"] = max(1, min(args["limit"], 200))
    args["offset"] = max(0, args["offset"])
    return args


def assign_public_id(session, obj, attr: str, prefix: str, base: int = 1000) -> None:
    """Persist `obj` and give it a human-friendly ID such as ALERT-1001.

    The number comes from the row's primary key, so it is unique and race-free
    without a separate counter table.
    """
    setattr(obj, attr, f"TMP-{uuid.uuid4().hex}")
    session.add(obj)
    session.flush()
    setattr(obj, attr, f"{prefix}-{base + obj.id}")
    session.flush()

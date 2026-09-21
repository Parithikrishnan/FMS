from decimal import Decimal

from database.db import db
from models.alert import ALERT_OPEN, SEVERITY_CRITICAL, Alert
from models.transaction import Transaction
from utils.helper import assign_public_id, money

ALERT_TYPE_INTEGRITY = "Transaction Integrity Violation"


def is_amount_modified(old_amount: Decimal, new_amount: Decimal) -> bool:
    """Demo Rule 1: any change to a transaction amount is a violation."""
    return old_amount != new_amount


def create_integrity_alert(
    txn: Transaction, old_amount: Decimal, new_amount: Decimal, modified_by: str, source_ip: str | None
) -> Alert:
    change = ""
    if old_amount > 0:
        change = f" ({(new_amount - old_amount) / old_amount * 100:+.1f}%)"

    description = (
        f"Amount of {txn.transaction_id} was modified from {money(old_amount)} to {money(new_amount)}"
        f"{change} by '{modified_by}'" + (f" from {source_ip}." if source_ip else ".")
    )

    alert = Alert(
        transaction_id=txn.transaction_id,
        alert_type=ALERT_TYPE_INTEGRITY,
        severity=SEVERITY_CRITICAL,
        status=ALERT_OPEN,
        description=description,
    )
    assign_public_id(db.session, alert, "alert_id", "ALERT")
    return alert


def list_alerts(status=None, severity=None, transaction_id=None, limit=50, offset=0) -> tuple[list[Alert], int]:
    query = Alert.query
    if status:
        query = query.filter(Alert.status.ilike(status))
    if severity:
        query = query.filter(Alert.severity.ilike(severity))
    if transaction_id:
        query = query.filter(Alert.transaction_id == transaction_id.upper())
    total = query.count()
    return query.order_by(Alert.id.desc()).limit(limit).offset(offset).all(), total


def get_alert(alert_id: str) -> Alert | None:
    return Alert.query.filter_by(alert_id=alert_id.upper()).first()

import ipaddress
from decimal import Decimal, InvalidOperation

from database.db import db
from models.transaction import (
    STATUS_SUSPICIOUS,
    Transaction,
    TransactionModification,
)
from services import alert_service, case_service


class EventValidationError(ValueError):
    """Raised when an incoming banking event is malformed."""


def _amount(payload: dict, field: str) -> Decimal:
    try:
        value = Decimal(str(payload[field])).quantize(Decimal("0.01"))
    except (KeyError, InvalidOperation, ValueError):
        raise EventValidationError(f"'{field}' must be a valid number")
    if not value.is_finite() or value < 0:
        raise EventValidationError(f"'{field}' must be a non-negative number")
    return value


def _parse(payload: dict) -> dict:
    transaction_id = str(payload.get("transaction_id", "")).strip().upper()
    modified_by = str(payload.get("modified_by", "")).strip()
    source_ip = (payload.get("source_ip") or "").strip() or None

    if not transaction_id:
        raise EventValidationError("'transaction_id' is required")
    if not modified_by:
        raise EventValidationError("'modified_by' is required")
    if source_ip:
        try:
            ipaddress.ip_address(source_ip)
        except ValueError:
            raise EventValidationError("'source_ip' is not a valid IP address")

    return {
        "transaction_id": transaction_id,
        "old_amount": _amount(payload, "old_amount"),
        "new_amount": _amount(payload, "new_amount"),
        "modified_by": modified_by,
        "source_ip": source_ip,
    }


def process_event(payload: dict) -> dict:
    """Banking event -> fraud rule check -> alert -> case, in one DB transaction."""
    event = _parse(payload)

    try:
        # Lock the row so concurrent events for one transaction are applied in order.
        txn = (
            Transaction.query.filter_by(transaction_id=event["transaction_id"]).with_for_update().first()
        )
        if txn is None:
            # First time we hear about this transaction: it starts at the reported old amount.
            txn = Transaction(
                transaction_id=event["transaction_id"],
                amount=event["old_amount"],
                original_amount=event["old_amount"],
            )
            db.session.add(txn)
            db.session.flush()

        if not alert_service.is_amount_modified(event["old_amount"], event["new_amount"]):
            db.session.commit()
            return {
                "message": "No modification detected; no alert raised",
                "transaction": txn.to_dict(),
                "alert": None,
                "case": None,
            }

        db.session.add(
            TransactionModification(
                transaction_id=txn.transaction_id,
                old_amount=event["old_amount"],
                new_amount=event["new_amount"],
                modified_by=event["modified_by"],
                source_ip=event["source_ip"],
            )
        )
        txn.amount = event["new_amount"]
        txn.modified_by = event["modified_by"]
        txn.source_ip = event["source_ip"]
        txn.status = STATUS_SUSPICIOUS
        # Insert the modification first so its timestamp precedes the alert's and case's (audit-trail order).
        db.session.flush()

        alert = alert_service.create_integrity_alert(
            txn, event["old_amount"], event["new_amount"], event["modified_by"], event["source_ip"]
        )
        case = case_service.create_case_for_alert(alert)

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        "message": "Modification recorded; alert raised and case created",
        "transaction": txn.to_dict(),
        "alert": alert.to_dict(),
        "case": case.to_dict(),
    }

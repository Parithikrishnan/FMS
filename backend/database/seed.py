"""Demo data: 10 transactions, of which TXN-10045 is tampered with.

TXN-10045 goes through the real event pipeline, so the alert (ALERT-1001) and
case (CASE-1001) are produced exactly as they would be in production.
"""
from datetime import timedelta
from decimal import Decimal

from database.db import db
from models.finding import Finding
from models.transaction import Transaction
from services import case_service, event_service
from utils.helper import utcnow

_DEMO = [
    ("TXN-10041", 2500),
    ("TXN-10042", 18000),
    ("TXN-10043", 750),
    ("TXN-10044", 42000),
    ("TXN-10045", 10000),  # the suspicious one
    ("TXN-10046", 5600),
    ("TXN-10047", 12500),
    ("TXN-10048", 900),
    ("TXN-10049", 31000),
    ("TXN-10050", 6400),
]


def seed_demo_data() -> bool:
    """Insert demo data into an empty database. Returns True if anything was seeded."""
    if Transaction.query.first() is not None:
        return False

    now = utcnow()
    for i, (txn_id, amount) in enumerate(_DEMO):
        db.session.add(
            Transaction(
                transaction_id=txn_id,
                amount=Decimal(amount),
                original_amount=Decimal(amount),
                status="Completed",
                created_at=now - timedelta(minutes=(len(_DEMO) - i) * 3),
            )
        )
    db.session.commit()

    result = event_service.process_event(
        {
            "transaction_id": "TXN-10045",
            "old_amount": 10000,
            "new_amount": 50000,
            "modified_by": "banktest",
            "source_ip": "192.168.25.20",
        }
    )

    case = case_service.get_case(result["case"]["case_id"])
    db.session.add(
        Finding(
            case_id=case.case_id,
            title="Unauthorised amount change on settled transaction",
            description=(
                "TXN-10045 was raised from ₹10,000 to ₹50,000 by user 'banktest' from 192.168.25.20 "
                "after settlement, with no matching approval record."
            ),
            status="Open",
        )
    )
    db.session.commit()
    return True

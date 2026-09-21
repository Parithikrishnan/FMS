from flask import current_app

from models.alert import ALERT_OPEN, SEVERITY_CRITICAL, Alert
from models.case import CASE_CLOSED_STATUSES, Case
from models.transaction import STATUS_SUSPICIOUS, Transaction
from utils.helper import iso, start_of_today_utc, utcnow


def get_dashboard() -> dict:
    today_start = start_of_today_utc(current_app.config["APP_TIMEZONE"])

    return {
        "critical_alerts": Alert.query.filter_by(severity=SEVERITY_CRITICAL, status=ALERT_OPEN).count(),
        "open_cases": Case.query.filter(Case.status.notin_(CASE_CLOSED_STATUSES)).count(),
        "transactions_today": Transaction.query.filter(Transaction.created_at >= today_start).count(),
        "suspicious_transactions": Transaction.query.filter_by(status=STATUS_SUSPICIOUS).count(),
        "generated_at": iso(utcnow()),
    }

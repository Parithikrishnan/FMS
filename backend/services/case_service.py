from flask import current_app

from database.db import db
from models.alert import Alert
from models.case import CASE_INVESTIGATING, Case
from models.finding import Finding
from utils.helper import assign_public_id

FINDING_STATUSES = ("Open", "Under Review", "Confirmed", "Dismissed")


def create_case_for_alert(alert: Alert) -> Case:
    case = Case(
        alert_id=alert.alert_id,
        transaction_id=alert.transaction_id,
        status=CASE_INVESTIGATING,
        assigned_to=current_app.config["DEFAULT_CASE_ASSIGNEE"],
    )
    assign_public_id(db.session, case, "case_id", "CASE")
    return case


def list_cases(status=None, transaction_id=None, limit=50, offset=0) -> tuple[list[Case], int]:
    query = Case.query
    if status:
        query = query.filter(Case.status.ilike(status))
    if transaction_id:
        query = query.filter(Case.transaction_id == transaction_id.upper())
    total = query.count()
    return query.order_by(Case.id.desc()).limit(limit).offset(offset).all(), total


def get_case(case_id: str) -> Case | None:
    return Case.query.filter_by(case_id=case_id.upper()).first()


def add_finding(case: Case, title: str, description: str | None, status: str) -> Finding:
    """Record an investigator's finding against a case."""
    finding = Finding(
        case_id=case.case_id,
        title=title.strip(),
        description=(description or "").strip() or None,
        status=status,
    )
    db.session.add(finding)
    db.session.commit()
    return finding

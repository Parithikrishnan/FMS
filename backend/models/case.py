from database.db import db
from utils.helper import iso, utcnow

CASE_INVESTIGATING = "Investigating"
CASE_CLOSED_STATUSES = ("Closed", "Resolved")


class Case(db.Model):
    __tablename__ = "cases"

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.String(50), unique=True, nullable=False)
    alert_id = db.Column(db.String(50), db.ForeignKey("alerts.alert_id"), nullable=False, index=True)
    transaction_id = db.Column(
        db.String(50), db.ForeignKey("transactions.transaction_id"), nullable=False, index=True
    )
    status = db.Column(db.String(50), nullable=False, default=CASE_INVESTIGATING, index=True)
    assigned_to = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    alert = db.relationship("Alert", back_populates="case")
    transaction = db.relationship("Transaction", back_populates="cases")
    findings = db.relationship(
        "Finding", back_populates="case", order_by="Finding.id", cascade="all, delete-orphan"
    )

    def to_dict(self, detail: bool = False) -> dict:
        data = {
            "case_id": self.case_id,
            "alert_id": self.alert_id,
            "transaction_id": self.transaction_id,
            "status": self.status,
            "assigned_to": self.assigned_to,
            "created_at": iso(self.created_at),
        }
        if detail:
            data["alert"] = self.alert.to_dict()
            data["transaction"] = self.transaction.to_dict(detail=True)
            data["findings"] = [f.to_dict() for f in self.findings]
        return data

from database.db import db
from utils.helper import iso, utcnow

SEVERITY_CRITICAL = "Critical"
ALERT_OPEN = "Open"


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.String(50), unique=True, nullable=False)
    transaction_id = db.Column(
        db.String(50), db.ForeignKey("transactions.transaction_id"), nullable=False, index=True
    )
    alert_type = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(20), nullable=False, index=True)
    status = db.Column(db.String(50), nullable=False, default=ALERT_OPEN, index=True)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    transaction = db.relationship("Transaction", back_populates="alerts")
    case = db.relationship("Case", back_populates="alert", uselist=False)

    def to_dict(self, detail: bool = False) -> dict:
        data = {
            "alert_id": self.alert_id,
            "transaction_id": self.transaction_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "status": self.status,
            "description": self.description,
            "case_id": self.case.case_id if self.case else None,
            "created_at": iso(self.created_at),
        }
        if detail:
            data["transaction"] = self.transaction.to_dict()
            data["case"] = self.case.to_dict() if self.case else None
        return data

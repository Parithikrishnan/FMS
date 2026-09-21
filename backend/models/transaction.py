from database.db import db
from utils.helper import iso, num, utcnow

STATUS_COMPLETED = "Completed"
STATUS_SUSPICIOUS = "Suspicious"


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    original_amount = db.Column(db.Numeric(15, 2), nullable=False)
    modified_by = db.Column(db.String(100))
    source_ip = db.Column(db.String(50))
    status = db.Column(db.String(50), nullable=False, default=STATUS_COMPLETED, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    modifications = db.relationship(
        "TransactionModification",
        back_populates="transaction",
        order_by="TransactionModification.id.desc()",
        cascade="all, delete-orphan",
    )
    alerts = db.relationship("Alert", back_populates="transaction", order_by="Alert.id.desc()")
    cases = db.relationship("Case", back_populates="transaction", order_by="Case.id.desc()")

    def to_dict(self, detail: bool = False) -> dict:
        data = {
            "transaction_id": self.transaction_id,
            "amount": num(self.amount),
            "original_amount": num(self.original_amount),
            "modified_by": self.modified_by,
            "source_ip": self.source_ip,
            "status": self.status,
            "created_at": iso(self.created_at),
        }
        if detail:
            data["modifications"] = [m.to_dict() for m in self.modifications]
            data["alerts"] = [a.to_dict() for a in self.alerts]
            data["cases"] = [c.to_dict() for c in self.cases]
        return data


class TransactionModification(db.Model):
    """One row per amount change - the transaction's audit trail."""

    __tablename__ = "transaction_modifications"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(
        db.String(50), db.ForeignKey("transactions.transaction_id"), nullable=False, index=True
    )
    old_amount = db.Column(db.Numeric(15, 2), nullable=False)
    new_amount = db.Column(db.Numeric(15, 2), nullable=False)
    modified_by = db.Column(db.String(100))
    source_ip = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    transaction = db.relationship("Transaction", back_populates="modifications")

    def to_dict(self) -> dict:
        return {
            "old_amount": num(self.old_amount),
            "new_amount": num(self.new_amount),
            "modified_by": self.modified_by,
            "source_ip": self.source_ip,
            "created_at": iso(self.created_at),
        }

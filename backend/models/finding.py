from database.db import db
from utils.helper import iso, utcnow


class Finding(db.Model):
    __tablename__ = "findings"

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.String(50), db.ForeignKey("cases.case_id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), nullable=False, default="Open")
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    case = db.relationship("Case", back_populates="findings")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "case_id": self.case_id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "created_at": iso(self.created_at),
        }

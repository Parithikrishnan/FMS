from models.transaction import Transaction


def list_transactions(status=None, limit=50, offset=0) -> tuple[list[Transaction], int]:
    query = Transaction.query
    if status:
        query = query.filter(Transaction.status.ilike(status))
    total = query.count()
    return query.order_by(Transaction.created_at.desc(), Transaction.id.desc()).limit(limit).offset(offset).all(), total


def get_transaction(transaction_id: str) -> Transaction | None:
    return Transaction.query.filter_by(transaction_id=transaction_id.upper()).first()

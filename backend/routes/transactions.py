from flask_restx import Namespace, Resource

from services import transaction_service
from utils.helper import clamp_paging, list_parser, page

ns = Namespace("transactions", description="Transactions and their modification history")
parser = list_parser("status")


@ns.route("")
class TransactionList(Resource):
    @ns.doc("list_transactions")
    @ns.expect(parser)
    def get(self):
        """List transactions, newest first. Filter with ?status=Suspicious."""
        args = clamp_paging(parser.parse_args())
        items, total = transaction_service.list_transactions(args["status"], args["limit"], args["offset"])
        return page(items, total, args)


@ns.route("/<string:transaction_id>")
@ns.param("transaction_id", "Business ID, e.g. TXN-10045")
class TransactionDetail(Resource):
    @ns.doc("get_transaction")
    @ns.response(404, "Transaction not found")
    def get(self, transaction_id):
        """Transaction with its modification history, alerts and cases."""
        txn = transaction_service.get_transaction(transaction_id)
        if txn is None:
            ns.abort(404, f"Transaction '{transaction_id}' not found")
        return txn.to_dict(detail=True)

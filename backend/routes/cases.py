from flask_restx import Namespace, Resource

from services import case_service
from utils.helper import clamp_paging, list_parser, page

ns = Namespace("cases", description="Fraud investigation cases")
parser = list_parser("status", "transaction_id")


@ns.route("")
class CaseList(Resource):
    @ns.doc("list_cases")
    @ns.expect(parser)
    def get(self):
        """List cases, newest first. Filter by status or transaction_id."""
        args = clamp_paging(parser.parse_args())
        items, total = case_service.list_cases(args["status"], args["transaction_id"], args["limit"], args["offset"])
        return page(items, total, args)


@ns.route("/<string:case_id>")
@ns.param("case_id", "Business ID, e.g. CASE-1001")
class CaseDetail(Resource):
    @ns.doc("get_case")
    @ns.response(404, "Case not found")
    def get(self, case_id):
        """Case with its alert, transaction (incl. history) and findings."""
        case = case_service.get_case(case_id)
        if case is None:
            ns.abort(404, f"Case '{case_id}' not found")
        return case.to_dict(detail=True)

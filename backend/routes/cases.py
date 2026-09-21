from flask_restx import Namespace, Resource, fields

from services import case_service
from utils.helper import clamp_paging, list_parser, page

ns = Namespace("cases", description="Fraud investigation cases")
parser = list_parser("status", "transaction_id")

finding_input = ns.model(
    "FindingInput",
    {
        "title": fields.String(required=True, min_length=1, max_length=255, example="Unauthorized Transaction Modification"),
        "description": fields.String(example="TXN-10045 modified from ₹10,000 to ₹50,000"),
        "status": fields.String(enum=list(case_service.FINDING_STATUSES), default="Open"),
    },
)


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


@ns.route("/<string:case_id>/findings")
@ns.param("case_id", "Business ID, e.g. CASE-1001")
class CaseFindings(Resource):
    @ns.doc("add_finding")
    @ns.expect(finding_input, validate=True)
    @ns.response(201, "Finding recorded")
    @ns.response(400, "Invalid finding")
    @ns.response(404, "Case not found")
    def post(self, case_id):
        """Record a finding against a case."""
        case = case_service.get_case(case_id)
        if case is None:
            ns.abort(404, f"Case '{case_id}' not found")
        payload = ns.payload
        if not payload["title"].strip():
            ns.abort(400, "'title' must not be blank")
        finding = case_service.add_finding(
            case, payload["title"], payload.get("description"), payload.get("status") or "Open"
        )
        return finding.to_dict(), 201

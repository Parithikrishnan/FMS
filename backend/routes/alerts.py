from flask_restx import Namespace, Resource

from services import alert_service
from utils.helper import clamp_paging, list_parser, page

ns = Namespace("alerts", description="Fraud alerts")
parser = list_parser("status", "severity", "transaction_id")


@ns.route("")
class AlertList(Resource):
    @ns.doc("list_alerts")
    @ns.expect(parser)
    def get(self):
        """List alerts, newest first. Filter by status, severity or transaction_id."""
        args = clamp_paging(parser.parse_args())
        items, total = alert_service.list_alerts(
            args["status"], args["severity"], args["transaction_id"], args["limit"], args["offset"]
        )
        return page(items, total, args)


@ns.route("/<string:alert_id>")
@ns.param("alert_id", "Business ID, e.g. ALERT-1001")
class AlertDetail(Resource):
    @ns.doc("get_alert")
    @ns.response(404, "Alert not found")
    def get(self, alert_id):
        """Alert with its transaction and linked case."""
        alert = alert_service.get_alert(alert_id)
        if alert is None:
            ns.abort(404, f"Alert '{alert_id}' not found")
        return alert.to_dict(detail=True)

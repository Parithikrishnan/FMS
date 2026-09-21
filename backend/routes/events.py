from flask_restx import Namespace, Resource, fields

from services import event_service

ns = Namespace("events", description="Banking event receiver")

banking_event = ns.model(
    "BankingEvent",
    {
        "transaction_id": fields.String(required=True, min_length=1, max_length=50, example="TXN-10045"),
        "old_amount": fields.Float(required=True, min=0, example=10000),
        "new_amount": fields.Float(required=True, min=0, example=50000),
        "modified_by": fields.String(required=True, min_length=1, max_length=100, example="banktest"),
        "source_ip": fields.String(max_length=50, example="192.168.25.20"),
    },
)


@ns.route("")
class Events(Resource):
    @ns.doc("receive_event")
    @ns.expect(banking_event, validate=True)
    @ns.response(201, "Modification recorded; alert raised and case created")
    @ns.response(200, "Event accepted; amount unchanged so no alert was raised")
    @ns.response(400, "Malformed event")
    def post(self):
        """Receive a transaction-modified event from the banking application."""
        try:
            result = event_service.process_event(ns.payload)
        except event_service.EventValidationError as exc:
            ns.abort(400, str(exc))
        return result, (201 if result["alert"] else 200)

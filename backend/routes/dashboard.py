from flask_restx import Namespace, Resource

from services import dashboard_service

ns = Namespace("dashboard", description="Dashboard summary counters")


@ns.route("")
class Dashboard(Resource):
    @ns.doc("get_dashboard")
    def get(self):
        """Critical alerts, open cases, transactions today, suspicious transactions."""
        return dashboard_service.get_dashboard()

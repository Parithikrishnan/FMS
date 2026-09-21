from flask import Blueprint, Flask, jsonify
from flask_cors import CORS
from flask_restx import Api
from sqlalchemy.exc import SQLAlchemyError

from config.settings import Config
from database.db import db, init_db


def create_app(config: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config)

    db.init_app(app)

    if app.config["CORS_ORIGINS"]:
        origins = [o.strip() for o in app.config["CORS_ORIGINS"].split(",")]
        CORS(app, resources={r"/api/*": {"origins": origins}})

    # All REST resources live under /api; Swagger UI is served at /api/docs.
    from routes.alerts import ns as alerts_ns
    from routes.cases import ns as cases_ns
    from routes.dashboard import ns as dashboard_ns
    from routes.events import ns as events_ns
    from routes.transactions import ns as transactions_ns

    blueprint = Blueprint("api", __name__, url_prefix="/api")
    api = Api(blueprint, title="FMS Backend API", version="1.0", doc="/docs")
    for ns in (dashboard_ns, transactions_ns, alerts_ns, cases_ns, events_ns):
        api.add_namespace(ns, path=f"/{ns.name}")
    app.register_blueprint(blueprint)

    @api.errorhandler(SQLAlchemyError)
    def handle_db_error(error):
        app.logger.exception("Database error")
        db.session.rollback()
        return {"message": "Database error"}, 500

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    init_db(app)
    if app.config["SEED_DEMO_DATA"]:
        from database.seed import seed_demo_data

        with app.app_context():
            if seed_demo_data():
                app.logger.info("Demo data seeded")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

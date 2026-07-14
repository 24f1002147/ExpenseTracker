from flask import Flask, jsonify
from flask_cors import CORS
from flask_security import Security, SQLAlchemyUserDatastore, hash_password

from config import Config
from models import Role, User, db
from routes import expenses_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

   
    CORS(
        app,
        supports_credentials=True,
        expose_headers=["Authentication-Token"],
    )

    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    app.security = Security(app, user_datastore)

    app.register_blueprint(expenses_bp)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    with app.app_context():
        db.create_all()
        _create_default_role(user_datastore)

    return app


def _create_default_role(user_datastore):
    if not user_datastore.find_role("user"):
        user_datastore.create_role(name="user", description="Standard user")
        db.session.commit()


app = create_app()


@app.cli.command("create-user")
def create_user_cli():
    """Convenience CLI command: flask create-user"""
    import getpass

    email = input("Email: ").strip()
    password = getpass.getpass("Password: ")

    with app.app_context():
        ds = app.security.datastore
        if ds.find_user(email=email):
            print("A user with that email already exists.")
            return
        user = ds.create_user(email=email, password=hash_password(password))
        role = ds.find_role("user")
        if role:
            ds.add_role_to_user(user, role)
        db.session.commit()
        print(f"Created user {email}")


if __name__ == "__main__":
    app.run(debug=True, port=5000)

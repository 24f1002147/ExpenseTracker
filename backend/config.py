import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")


    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'expense_tracker.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

 
    SECURITY_PASSWORD_SALT = os.environ.get(
        "SECURITY_PASSWORD_SALT", "dev-password-salt-change-me"
    )
    SECURITY_PASSWORD_HASH = "bcrypt"


    SECURITY_TOKEN_AUTHENTICATION_HEADER = "Authentication-Token"
    SECURITY_TOKEN_MAX_AGE = None 


    SECURITY_REGISTERABLE = True
    SECURITY_RECOVERABLE = False
    SECURITY_CHANGEABLE = True
    SECURITY_CONFIRMABLE = False
    SECURITY_TRACKABLE = True


    SECURITY_CSRF_PROTECT_MECHANISMS = ["session"]
    SECURITY_CSRF_COOKIE_NAME = None
    WTF_CSRF_ENABLED = False


    SECURITY_RETURN_GENERIC_RESPONSES = False

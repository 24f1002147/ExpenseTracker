from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_security import auth_token_required, current_user

from models import Expense, db

expenses_bp = Blueprint("expenses", __name__, url_prefix="/api/expenses")


def _parse_date(value):
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def _serialize_errors(message):
    return jsonify({"error": message}), 400


@expenses_bp.route("", methods=["GET"])
@auth_token_required
def list_expenses():
  
    query = Expense.query.filter_by(user_id=current_user.id)

    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category)

    start = request.args.get("start")
    end = request.args.get("end")
    if start:
        query = query.filter(Expense.date >= _parse_date(start))
    if end:
        query = query.filter(Expense.date <= _parse_date(end))

    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()
    total = sum(e.amount for e in expenses)

    return jsonify(
        {
            "expenses": [e.to_dict() for e in expenses],
            "total": total,
            "count": len(expenses),
        }
    )


@expenses_bp.route("/<int:expense_id>", methods=["GET"])
@auth_token_required
def get_expense(expense_id):
    expense = Expense.query.filter_by(id=expense_id, user_id=current_user.id).first()
    if not expense:
        return jsonify({"error": "Expense not found"}), 404
    return jsonify(expense.to_dict())


@expenses_bp.route("", methods=["POST"])
@auth_token_required
def create_expense():
    data = request.get_json(silent=True) or {}

    title = data.get("title")
    amount = data.get("amount")
    if not title:
        return _serialize_errors("title is required")
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return _serialize_errors("amount must be a number")

    expense = Expense(
        title=title,
        amount=amount,
        category=data.get("category", "Other"),
        date=_parse_date(data.get("date")) or datetime.utcnow().date(),
        notes=data.get("notes"),
        user_id=current_user.id,
    )
    db.session.add(expense)
    db.session.commit()
    return jsonify(expense.to_dict()), 201


@expenses_bp.route("/<int:expense_id>", methods=["PUT", "PATCH"])
@auth_token_required
def update_expense(expense_id):
    expense = Expense.query.filter_by(id=expense_id, user_id=current_user.id).first()
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    data = request.get_json(silent=True) or {}

    if "title" in data:
        if not data["title"]:
            return _serialize_errors("title cannot be empty")
        expense.title = data["title"]

    if "amount" in data:
        try:
            expense.amount = float(data["amount"])
        except (TypeError, ValueError):
            return _serialize_errors("amount must be a number")

    if "category" in data:
        expense.category = data["category"] or "Other"

    if "date" in data:
        expense.date = _parse_date(data["date"]) or expense.date

    if "notes" in data:
        expense.notes = data["notes"]

    db.session.commit()
    return jsonify(expense.to_dict())


@expenses_bp.route("/<int:expense_id>", methods=["DELETE"])
@auth_token_required
def delete_expense(expense_id):
    expense = Expense.query.filter_by(id=expense_id, user_id=current_user.id).first()
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted"}), 200


@expenses_bp.route("/summary", methods=["GET"])
@auth_token_required
def summary():
    """Total spend grouped by category, useful for a dashboard chart."""
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    totals = {}
    for e in expenses:
        totals[e.category] = totals.get(e.category, 0) + e.amount
    return jsonify({"by_category": totals, "total": sum(totals.values())})

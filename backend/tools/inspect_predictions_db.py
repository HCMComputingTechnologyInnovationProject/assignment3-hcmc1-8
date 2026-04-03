from __future__ import annotations

import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "backend" / "data" / "predictions.db"


def main() -> None:
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        return

    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        total_rows = connection.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        columns = connection.execute("PRAGMA table_info(predictions)").fetchall()
        recent_rows = connection.execute(
            """
            SELECT id, created_at, amount, product_code, is_fraud, fraud_probability, risk_score, status
            FROM predictions
            ORDER BY created_at DESC, id DESC
            LIMIT 10
            """
        ).fetchall()

    print(f"SQLite database: {DB_PATH}")
    print("Table: predictions")
    print(f"Total persisted predictions: {total_rows}")
    print("\nColumns:")
    for column in columns:
        print(f"- {column['name']} ({column['type']})")

    print("\nRecent rows:")
    if not recent_rows:
        print("- No persisted predictions yet.")
        return

    for row in recent_rows:
        print(
            f"- id={row['id']} created_at={row['created_at']} amount={row['amount']:.2f} "
            f"product_code={row['product_code']} is_fraud={row['is_fraud']} "
            f"prob={row['fraud_probability']:.4f} risk={row['risk_score']} status={row['status']}"
        )


if __name__ == "__main__":
    main()

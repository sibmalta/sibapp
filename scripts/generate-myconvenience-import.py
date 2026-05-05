import csv
import hashlib
import os
import re
import sys

import pandas as pd


PUBLIC_COLUMNS = [
    "store_code",
    "name",
    "address",
    "locality",
    "pickup_zone",
    "active",
    "phone",
    "opening_hours",
    "notes",
]
PRIVATE_COLUMNS = [*PUBLIC_COLUMNS, "store_pin"]


def clean(value):
    return str(value or "").strip()


def normalize_active(value):
    return "true" if clean(value).lower() in {"true", "1", "yes", "y"} else "false"


def generate_pin(store_code, used_pins):
    nonce = 0
    while True:
        digest = hashlib.sha256(f"{store_code}:{nonce}".encode("utf-8")).hexdigest()
        pin = str(100000 + (int(digest[:10], 16) % 900000))
        if pin not in used_pins:
            return pin
        nonce += 1


def sql_literal(value):
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: generate-myconvenience-import.py <source.xlsx> <repo-root>")

    source_path = sys.argv[1]
    repo_root = sys.argv[2]
    df = pd.read_excel(source_path).fillna("")

    rows = []
    used_pins = set()
    for _, source in df.iterrows():
        row = {column: clean(source.get(column, "")) for column in PUBLIC_COLUMNS}
        row["active"] = normalize_active(source.get("active", ""))
        raw_pin = clean(source.get("store_pin", ""))

        if not re.fullmatch(r"\d{4,6}", raw_pin) or raw_pin in used_pins:
            raw_pin = generate_pin(row["store_code"], used_pins)

        used_pins.add(raw_pin)
        row["store_pin"] = raw_pin
        rows.append(row)

    store_codes = [row["store_code"] for row in rows]
    if len(set(store_codes)) != len(store_codes):
        raise SystemExit("Duplicate store_code found in workbook")

    active_pins = [row["store_pin"] for row in rows if row["active"] == "true"]
    if len(set(active_pins)) != len(active_pins):
        raise SystemExit("Duplicate active store PIN generated")

    public_path = os.path.join(repo_root, "supabase", "seed", "myconvenience_stores_import.csv")
    private_path = os.path.join(repo_root, "private", "myconvenience_stores_import_private.csv")
    private_sql_path = os.path.join(repo_root, "private", "import_myconvenience_stores.sql")
    os.makedirs(os.path.dirname(public_path), exist_ok=True)
    os.makedirs(os.path.dirname(private_path), exist_ok=True)

    with open(public_path, "w", newline="", encoding="utf-8") as public_file:
        writer = csv.DictWriter(public_file, fieldnames=PUBLIC_COLUMNS)
        writer.writeheader()
        writer.writerows([{column: row[column] for column in PUBLIC_COLUMNS} for row in rows])

    with open(private_path, "w", newline="", encoding="utf-8") as private_file:
        writer = csv.DictWriter(private_file, fieldnames=PRIVATE_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    with open(private_sql_path, "w", newline="", encoding="utf-8") as private_sql:
        private_sql.write("BEGIN;\n")
        for row in rows:
            private_sql.write(
                "SELECT public.upsert_myconvenience_store("
                f"{sql_literal(row['store_code'])}, "
                f"{sql_literal(row['name'])}, "
                f"{sql_literal(row['address'])}, "
                f"{sql_literal(row['locality'])}, "
                f"{sql_literal(row['pickup_zone'])}, "
                f"{row['active']}, "
                f"{sql_literal(row['phone'])}, "
                f"{sql_literal(row['opening_hours'])}, "
                f"{sql_literal(row['notes'])}, "
                f"{sql_literal(row['store_pin'])}"
                ");\n"
            )
        private_sql.write("COMMIT;\n")

    print(f"Generated {len(rows)} stores")
    print(f"Unique active PINs: {len(active_pins)}")
    print(f"Public CSV: {public_path}")
    print(f"Private PIN CSV: {private_path}")
    print(f"Private import SQL: {private_sql_path}")


if __name__ == "__main__":
    main()

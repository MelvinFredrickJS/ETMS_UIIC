import pandas as pd
import re
from pathlib import Path

xlsx_path = Path(r"C:\Users\melvi\OneDrive\Documents\GitHub\ETMS-2\UIIC_DATA.xlsx")
seed_path = Path(r"C:\Users\melvi\OneDrive\Documents\GitHub\ETMS-2\etms-mvp\database\seed.sql")

sheet = pd.read_excel(xlsx_path)
sheet.columns = [str(c).strip() for c in sheet.columns]

dept_col = "DEPARTEMENT" if "DEPARTEMENT" in sheet.columns else "DEPARTMENT"
serial_col = "Machine  S.NO" if "Machine  S.NO" in sheet.columns else "Machine S.NO"

required_cols = ["USER NAME", "Emp ID", dept_col, "Model", serial_col]
for col in required_cols:
    if col not in sheet.columns:
        raise SystemExit(f"Missing column: {col}")

# Mapping: Team -> ticket type key
dept_to_type = {
    "HEALTH": "complaint",
    "R&D": "data",
    "RTI": "request",
    "CUSTOMER CARE": "complaint",
}


def norm_dept(val: str) -> str:
    return re.sub(r"\s+", " ", str(val or "").strip()).upper()


def slug(val: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", val.strip().lower())
    return s.strip("_") or "unknown"


rows = []
for idx, row in sheet.iterrows():
    emp_id = str(row.get("Emp ID", "")).strip()
    if not emp_id or emp_id.upper() in {"NA", "N/A", "NONE"}:
        continue

    user_name = str(row.get("USER NAME", "")).strip() or f"Employee {emp_id}"
    dept_raw = norm_dept(row.get(dept_col, ""))
    if not dept_raw:
        continue

    dept_type = dept_to_type.get(dept_raw)
    if not dept_type:
        continue

    model = str(row.get("Model", "")).strip() or "Unknown Model"
    serial = str(row.get(serial_col, "")).strip()
    if not serial or serial.upper() in {"NA", "N/A", "NONE"}:
        serial = f"AUTO-{emp_id}-{idx+1}"

    rows.append({
        "emp_id": emp_id,
        "name": user_name,
        "team": dept_raw.title(),
        "dept_key": slug(dept_raw),
        "ticket_type_key": dept_type,
        "model": model,
        "serial": serial,
    })

if not rows:
    raise SystemExit("No valid rows found after filtering.")

categories = {}
for r in rows:
    categories[r["dept_key"]] = {
        "name": r["team"],
        "key": r["dept_key"],
        "ticket_type_key": r["ticket_type_key"],
    }

cat_list = sorted(categories.values(), key=lambda x: x["key"])

managers = []
for cat in cat_list:
    mgr_emp_id = f"MGR_{cat['key'].upper()}"
    mgr_name = f"{cat['name']} Manager"
    mgr_email = f"mgr.{cat['key']}@uiic.co.in"
    managers.append({
        "emp_id": mgr_emp_id,
        "name": mgr_name,
        "email": mgr_email,
        "team": cat["name"],
        "category_key": cat["key"],
    })

employees = []
seen_emp = set()
for r in rows:
    if r["emp_id"] in seen_emp:
        continue
    seen_emp.add(r["emp_id"])
    email = f"emp{r['emp_id']}@uiic.co.in"
    employees.append({
        "emp_id": r["emp_id"],
        "name": r["name"],
        "email": email,
        "team": r["team"],
        "category_key": r["dept_key"],
    })

assets = []
for r in rows:
    assets.append({
        "name": r["model"],
        "serial": r["serial"],
        "category_key": r["dept_key"],
        "emp_id": r["emp_id"],
    })

password_hash = "$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi"


def sql_str(val: str) -> str:
    return val.replace("'", "''")


lines = []
lines.append("-- Auto-generated seed from UIIC_DATA.xlsx")
lines.append("-- Hash for Password@123: " + password_hash)
lines.append("-- Admin gets password_changed_at = NOW(); all others NULL")
lines.append("")

lines.append("-- ── Ticket Types ──────────────────────────────────────")
lines.append("INSERT INTO ticket_types (name, type_key) VALUES")
lines.append("  ('Complaint', 'complaint'),\n  ('Request', 'request'),\n  ('Data', 'data');")
lines.append("")

lines.append("-- ── Users ─────────────────────────────────────────────")
lines.append("INSERT INTO users (emp_id, name, email, password_hash, role, team, password_changed_at) VALUES")

user_rows = []
user_rows.append("('EMP001', 'Admin User', 'admin@uiic.co.in', '{h}', 'admin', 'IT', NOW())".format(h=password_hash))
for m in managers:
    user_rows.append("('{emp_id}', '{name}', '{email}', '{h}', 'manager', '{dept}', NULL)".format(
        emp_id=sql_str(m["emp_id"]),
        name=sql_str(m["name"]),
        email=sql_str(m["email"]),
        h=password_hash,
        dept=sql_str(m["team"]),
    ))
for e in employees:
    user_rows.append("('{emp_id}', '{name}', '{email}', '{h}', 'employee', '{dept}', NULL)".format(
        emp_id=sql_str(e["emp_id"]),
        name=sql_str(e["name"]),
        email=sql_str(e["email"]),
        h=password_hash,
        dept=sql_str(e["team"]),
    ))

lines.append("  " + ",\n  ".join(user_rows) + ";")
lines.append("")

lines.append("-- ── Ticket Categories (one per Team) ────────────")
lines.append("INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)")
lines.append("VALUES")
cat_rows = []
for c in cat_list:
    type_key = c["ticket_type_key"]
    type_id = {"complaint": 1, "request": 2, "data": 3}[type_key]
    cat_rows.append("  ({type_id}, '{name}', '{key}', 'medium', (SELECT id FROM users WHERE emp_id='MGR_{key_uc}'), TRUE)".format(
        type_id=type_id,
        name=sql_str(c["name"]),
        key=sql_str(c["key"]),
        key_uc=c["key"].upper(),
    ))
lines.append(",\n".join(cat_rows) + ";")
lines.append("")

lines.append("-- ── Populate users.category_id ─────────────────────────")
for m in managers:
    lines.append("UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = '{key}') WHERE emp_id = '{emp_id}';".format(
        key=sql_str(m["category_key"]),
        emp_id=sql_str(m["emp_id"]),
    ))
for e in employees:
    lines.append("UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = '{key}') WHERE emp_id = '{emp_id}';".format(
        key=sql_str(e["category_key"]),
        emp_id=sql_str(e["emp_id"]),
    ))
lines.append("")

lines.append("-- ── Assets assigned to employees ───────────────────────")
lines.append("INSERT INTO assets (name, serial_number, category_id, assigned_to, status) VALUES")
asset_rows = []
for a in assets:
    asset_rows.append("  ('{name}', '{serial}', (SELECT id FROM ticket_categories WHERE category_key='{key}'), (SELECT id FROM users WHERE emp_id='{emp_id}'), 'active')".format(
        name=sql_str(a["name"]),
        serial=sql_str(a["serial"]),
        key=sql_str(a["category_key"]),
        emp_id=sql_str(a["emp_id"]),
    ))
lines.append(",\n".join(asset_rows) + ";")
lines.append("")

lines.append("-- Initialize ownership history for current assignments")
lines.append("INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)")
lines.append("SELECT a.id, NULL, a.assigned_to, NULL, NOW(), 'Seed initial assignment' FROM assets a;")
lines.append("")

seed_path.write_text("\n".join(lines), encoding="utf-8")

print("Generated seed.sql with:")
print(f"- Categories: {len(cat_list)}")
print(f"- Managers:   {len(managers)}")
print(f"- Employees:  {len(employees)}")
print(f"- Assets:     {len(assets)}")

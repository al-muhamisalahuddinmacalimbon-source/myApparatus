# myApparatus API Endpoints

The backend lives inside the Next.js app as route handlers under `app/api/`. Update the Status column as you build each one.

| Endpoint | Method | Purpose | User story | Sprint | Status |
|---|---|---|---|---|---|
| `/api/health` | GET | Check the server and database connection | Setup | 1 | Planned |
| `/api/apparatus/list` | GET | Catalog with optional `category` and `search` filters | US-02, US-12 | 1 | Planned |
| `/api/students/[id]` | GET | Look up a student, 404 with Student ID Not Found | US-01 | 1 | Planned |
| `/api/students` | POST | Register a first-time student | US-11 | 2 | Planned |
| `/api/borrow/submit` | POST | Save a borrower slip in one transaction | US-03 | 1 | Planned |
| `/api/admin/active-loans` | GET | Active loans with Overdue flag, filter by student or status | US-06, US-09, US-18 | 1 | Planned |
| `/api/admin/active-loans/[id]` | PATCH | Save or clear a remark on an active loan | Staff remarks | — | Available |
| `/api/admin/login` | POST | Technician login | US-06 | 2 | Planned |
| `/api/returns/[loanId]` | POST | Confirm return of a whole loan | US-07 | 2 | Planned |
| `/api/returns/[loanId]/partial` | POST | Confirm return of selected items | US-17 | 2 | Planned |
| `/api/loans/by-student/[id]` | GET | Active loans of a scanned student ID | US-16 | 2 | Planned |
| `/api/admin/apparatus` | POST, PUT | Add, edit or archive apparatus | US-08 | 3 | Planned |
| `/api/notices` | GET | List published lab notices for students and staff | Notices | — | Available |
| `/api/admin/notices` | POST, PUT, DELETE | Publish, edit, pin or delete student-facing lab notices | Notices | — | Available |
| `/api/machines` | GET | List shared machines | US-04 | 3 | Planned |
| `/api/reservations` | GET, POST | Calendar slots and booking (with a transaction lock) | US-04, US-05 | 3 | Planned |
| `/api/reservations/[id]` | DELETE | Cancel a reservation | US-14 | 3 | Planned |
| `/api/reservations/by-student/[id]` | GET | My Bookings | US-15 | 3 | Planned |
| `/api/admin/report/liability` | GET | Unreturned items as a CSV download | US-10 | 4 | Planned |

## Lab notices

Apply `database/migrations/003_lab_notices.sql` to add persistent notices before using the notice board:

```bash
psql -U postgres -d myapparatus -f database/migrations/003_lab_notices.sql
```

Staff can publish, edit, pin, and delete notices from `/staff/notices`. Published notices are listed at `/notices` and can be opened individually.

## Active loan remarks

Apply `database/migrations/004_add_loan_remarks.sql` after the existing migrations to add the nullable `loans.remarks` column:

```bash
psql -U postgres -d myapparatus -f database/migrations/004_add_loan_remarks.sql
```

Send `PATCH /api/admin/active-loans/[id]` with `{ "remarks": "Brand new beaker issued" }`. Send `{ "remarks": null }` (or an empty string) to clear the remark. Only active loans can be updated. No seed changes are needed because the new column is nullable.

## Apparatus variants

Apply `database/migrations/007_add_apparatus_variants.sql`, then
`database/seeds/005_apparatus_variants_seed.sql`. Catalog endpoints return each
parent apparatus with a `variants` array; every variant has its own `id`,
`total_stock`, and `available_stock`.
The existing reservation endpoints book shared machines only and do not alter
apparatus inventory.

`POST /api/borrow/submit` accepts either a legacy parent `id` or a variant ID:

```json
{ "student_id": "2023-0001", "items": [{ "variant_id": 1, "quantity": 2 }] }
```

Variant borrowing stores `loan_items.variant_id` and decrements only that
variant's available stock. Existing active-loan return endpoints restore stock
to the stored variant. To switch an unreturned loan item to another variant,
send `PATCH /api/admin/active-loans/[id]` with
`{ "items": [{ "loan_item_id": 1, "variant_id": 2 }] }`; the old variant stock
is restored and the selected variant stock is decremented in the same
transaction. The variant must belong to the same parent apparatus.

Staff can edit one variant through
`PATCH /api/admin/apparatus/[id]/variants/[variantId]` with `name`,
`total_stock`, `available_stock`, and `status`. The API rejects stock changes
that would put available stock plus active loans above that variant's total.

## Error format

Every error returns JSON in this shape:

```
{ "error": "Student ID Not Found" }
```

## Example: GET /api/apparatus/list?category=Glassware

```
[
  { "id": 1, "name": "Beaker 250 mL", "category": "Glassware", "icon": "flask-conical", "total_stock": 20, "available_stock": 18 }
]
```

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
| `/api/admin/login` | POST | Technician login | US-06 | 2 | Planned |
| `/api/returns/[loanId]` | POST | Confirm return of a whole loan | US-07 | 2 | Planned |
| `/api/returns/[loanId]/partial` | POST | Confirm return of selected items | US-17 | 2 | Planned |
| `/api/loans/by-student/[id]` | GET | Active loans of a scanned student ID | US-16 | 2 | Planned |
| `/api/admin/apparatus` | POST, PUT | Add, edit or archive apparatus | US-08 | 3 | Planned |
| `/api/machines` | GET | List shared machines | US-04 | 3 | Planned |
| `/api/reservations` | GET, POST | Calendar slots and booking (with a transaction lock) | US-04, US-05 | 3 | Planned |
| `/api/reservations/[id]` | DELETE | Cancel a reservation | US-14 | 3 | Planned |
| `/api/reservations/by-student/[id]` | GET | My Bookings | US-15 | 3 | Planned |
| `/api/admin/report/liability` | GET | Unreturned items as a CSV download | US-10 | 4 | Planned |

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

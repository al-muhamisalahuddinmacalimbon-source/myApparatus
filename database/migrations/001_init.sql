-- myApparatus database schema (PostgreSQL)
-- File: database/migrations/001_init.sql
-- Run this once on an empty database named myapparatus.
-- To start over while developing (DELETES EVERYTHING):
--   DROP SCHEMA public CASCADE; CREATE SCHEMA public;

-- Students (US-01, US-11)
CREATE TABLE students (
  student_id  VARCHAR(20)  PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  course      VARCHAR(100) NOT NULL,
  year_level  SMALLINT     NOT NULL CHECK (year_level BETWEEN 1 AND 6),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Apparatus catalog (US-02, US-08, US-12)
CREATE TABLE apparatus (
  id               SERIAL       PRIMARY KEY,
  name             VARCHAR(120) NOT NULL,
  category         VARCHAR(50)  NOT NULL,
  icon             VARCHAR(50)  NOT NULL DEFAULT 'flask-conical',
  total_stock      INTEGER      NOT NULL CHECK (total_stock >= 0),
  available_stock  INTEGER      NOT NULL CHECK (available_stock >= 0),
  status           VARCHAR(10)  NOT NULL DEFAULT 'Active'
                   CHECK (status IN ('Active', 'Inactive')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (available_stock <= total_stock)
);

-- Loans: one row per borrower slip (US-03, US-06, US-07, US-09)
CREATE TABLE loans (
  id           SERIAL       PRIMARY KEY,
  student_id   VARCHAR(20)  NOT NULL REFERENCES students(student_id),
  borrowed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  due_at       TIMESTAMPTZ  NOT NULL,
  returned_at  TIMESTAMPTZ,
  status       VARCHAR(10)  NOT NULL DEFAULT 'Active'
               CHECK (status IN ('Active', 'Returned'))
);

-- Loan items: the equipment on each slip (supports partial returns, US-17)
CREATE TABLE loan_items (
  id                 SERIAL   PRIMARY KEY,
  loan_id            INTEGER  NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  apparatus_id       INTEGER  NOT NULL REFERENCES apparatus(id),
  quantity           INTEGER  NOT NULL CHECK (quantity > 0),
  returned_quantity  INTEGER  NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
  CHECK (returned_quantity <= quantity)
);

-- Shared machines and reservations (US-04, US-05, US-14, US-15)
CREATE TABLE machines (
  id      SERIAL       PRIMARY KEY,
  name    VARCHAR(100) NOT NULL UNIQUE,
  status  VARCHAR(10)  NOT NULL DEFAULT 'Active'
          CHECK (status IN ('Active', 'Inactive'))
);

CREATE TABLE reservations (
  id          SERIAL      PRIMARY KEY,
  machine_id  INTEGER     NOT NULL REFERENCES machines(id),
  student_id  VARCHAR(20) NOT NULL REFERENCES students(student_id),
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'Booked'
              CHECK (status IN ('Booked', 'Cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Prevents double-booking the same machine and start time (US-05).
-- Cancelled reservations do not block the slot.
CREATE UNIQUE INDEX uq_active_reservation
  ON reservations (machine_id, start_time)
  WHERE status = 'Booked';

-- Technician accounts (admin panel login)
CREATE TABLE admins (
  id             SERIAL       PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX idx_loans_student   ON loans (student_id);
CREATE INDEX idx_loans_status    ON loans (status);
CREATE INDEX idx_items_loan      ON loan_items (loan_id);
CREATE INDEX idx_res_student     ON reservations (student_id);

-- Dashboard view (US-06, US-09, US-18):
-- one row per active loan, with its unreturned items and an Overdue flag.
CREATE VIEW active_loans_view AS
SELECT
  l.id          AS loan_id,
  s.student_id,
  s.full_name,
  string_agg(
    a.name || ' x' || (li.quantity - li.returned_quantity)::text,
    ', ' ORDER BY a.name
  )             AS items,
  l.borrowed_at,
  l.due_at,
  CASE WHEN l.due_at < NOW() THEN 'Overdue' ELSE 'Active' END AS status
FROM loans l
JOIN students   s  ON s.student_id = l.student_id
JOIN loan_items li ON li.loan_id   = l.id
JOIN apparatus  a  ON a.id         = li.apparatus_id
WHERE l.status = 'Active'
  AND li.quantity > li.returned_quantity
GROUP BY l.id, s.student_id, s.full_name, l.borrowed_at, l.due_at;

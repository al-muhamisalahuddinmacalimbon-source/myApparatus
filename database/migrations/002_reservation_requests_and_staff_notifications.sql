-- Reservation cancellation requests and persistent staff event notifications.
-- Safe to apply to an existing myApparatus database.

CREATE TABLE IF NOT EXISTS reservation_cancellation_requests (
  id              SERIAL PRIMARY KEY,
  reservation_id  INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  student_id      VARCHAR(20) NOT NULL REFERENCES students(student_id),
  reason          TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  status          VARCHAR(10) NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Approved', 'Declined')),
  staff_note      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     INTEGER REFERENCES admins(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_reservation_cancellation
  ON reservation_cancellation_requests (reservation_id)
  WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS idx_reservation_cancellation_student
  ON reservation_cancellation_requests (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_notifications (
  id          SERIAL PRIMARY KEY,
  event_type  VARCHAR(30) NOT NULL
              CHECK (event_type IN ('Borrow', 'Reservation', 'Cancellation Request')),
  student_id  VARCHAR(20) NOT NULL REFERENCES students(student_id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_created
  ON staff_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_unread
  ON staff_notifications (id) WHERE read_at IS NULL;

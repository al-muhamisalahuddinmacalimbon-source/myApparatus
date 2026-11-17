CREATE TABLE IF NOT EXISTS student_notifications (
  id          SERIAL PRIMARY KEY,
  student_id  VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  event_type  VARCHAR(30) NOT NULL
              CHECK (event_type IN (
                'Reservation',
                'Reservation Update',
                'Cancellation Request',
                'Borrow',
                'Return',
                'Lab Notice'
              )),
  message     TEXT NOT NULL,
  href        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_notifications_created
  ON student_notifications (student_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_student_notifications_unread
  ON student_notifications (student_id, id)
  WHERE read_at IS NULL;

INSERT INTO student_notifications (student_id, event_type, message, created_at)
SELECT n.student_id, n.event_type, n.message, n.created_at
FROM staff_notifications n
WHERE n.event_type IN ('Borrow', 'Reservation', 'Cancellation Request')
  AND NOT EXISTS (
    SELECT 1
    FROM student_notifications sn
    WHERE sn.student_id = n.student_id
      AND sn.event_type = n.event_type
      AND sn.message = n.message
      AND sn.created_at = n.created_at
  );

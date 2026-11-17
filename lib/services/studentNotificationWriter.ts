import type { PoolClient } from "pg";
import type { StudentNotificationEvent } from "@/types/notification";

type StudentNotificationInput = {
  studentId: string;
  eventType: StudentNotificationEvent;
  message: string;
  href?: string | null;
};

export async function addStudentNotification(
  client: PoolClient,
  notification: StudentNotificationInput,
) {
  await client.query(
    `INSERT INTO student_notifications (student_id, event_type, message, href)
     VALUES ($1, $2, $3, $4)`,
    [
      notification.studentId,
      notification.eventType,
      notification.message,
      notification.href ?? null,
    ],
  );
}

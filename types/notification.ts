export type StudentNotificationEvent =
  | "Reservation"
  | "Reservation Update"
  | "Cancellation Request"
  | "Borrow"
  | "Return"
  | "Lab Notice";

export type StudentNotification = {
  id: number;
  event_type: StudentNotificationEvent;
  message: string;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

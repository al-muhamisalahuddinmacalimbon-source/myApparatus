import { requireStaffSession } from "@/lib/auth/staffSession";
import {
  GET as getNotifications,
  POST as postNotifications,
} from "@/lib/services/notificationsService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getNotifications();
}

export async function POST(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return postNotifications(request);
}

import { requireStaffSession } from "@/lib/auth/staffSession";
import { GET as getReservations } from "@/lib/services/adminReservationsService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getReservations(request);
}

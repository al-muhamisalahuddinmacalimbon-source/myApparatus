import { requireStaffSession } from "@/lib/auth/staffSession";
import { DELETE as cancelReservation } from "@/lib/services/staffReservationService";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return cancelReservation(request, context);
}

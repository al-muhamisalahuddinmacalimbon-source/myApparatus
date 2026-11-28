import { requireStaffSession } from "@/lib/auth/staffSession";
import { GET as getCancellationRequests } from "@/lib/services/cancellationRequestsService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getCancellationRequests();
}

import { requireStaffSession } from "@/lib/auth/staffSession";
import { GET as getActiveLoans } from "@/lib/services/activeLoansService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getActiveLoans();
}

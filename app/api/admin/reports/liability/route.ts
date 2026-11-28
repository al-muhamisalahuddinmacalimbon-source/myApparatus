import { requireStaffSession } from "@/lib/auth/staffSession";
import { GET as getLiabilityReport } from "@/lib/services/liabilityReportService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getLiabilityReport(request);
}

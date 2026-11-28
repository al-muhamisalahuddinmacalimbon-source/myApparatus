import { requireStaffSession } from "@/lib/auth/staffSession";
import { POST as returnLoan } from "@/lib/services/loanReturnService";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return returnLoan(request, context);
}

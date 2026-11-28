import { requireStaffSession } from "@/lib/auth/staffSession";
import { POST as reviewCancellation } from "@/lib/services/cancellationReviewService";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return reviewCancellation(request, context);
}

import { requireStaffSession } from "@/lib/auth/staffSession";
import { PATCH as patchApparatus } from "@/lib/services/apparatusItemService";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return patchApparatus(request, context);
}

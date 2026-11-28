import { requireStaffSession } from "@/lib/auth/staffSession";
import { PATCH as patchMachine } from "@/lib/services/adminMachinesService";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return patchMachine(request, context);
}

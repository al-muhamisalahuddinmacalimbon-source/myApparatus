import { requireStaffSession } from "@/lib/auth/staffSession";
import {
  GET as getMachines,
  POST as postMachine,
} from "@/lib/services/adminMachinesService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getMachines();
}

export async function POST(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return postMachine(request);
}

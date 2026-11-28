import { requireStaffSession } from "@/lib/auth/staffSession";
import {
  GET as getApparatus,
  POST as postApparatus,
} from "@/lib/services/adminApparatusService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getApparatus();
}

export async function POST(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return postApparatus(request);
}

import { requireStaffSession } from "@/lib/auth/staffSession";
import {
  GET as getReturns,
  POST as postReturns,
} from "@/lib/services/returnsService";

export async function GET(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return getReturns(request);
}

export async function POST(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return postReturns(request);
}

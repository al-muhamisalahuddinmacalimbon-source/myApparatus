import { requireStaffSession } from "@/lib/auth/staffSession";
import {
  POST as postNotice,
  PUT as putNotice,
  DELETE as deleteNotice,
} from "@/lib/services/adminNoticesService";

export async function POST(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return postNotice(request);
}

export async function PUT(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return putNotice(request);
}

export async function DELETE(request: Request) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;
  return deleteNotice(request);
}

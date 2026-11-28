import { randomUUID } from "node:crypto";

export type MockBorrowRequest = {
  loan_id: number;
  student_id: string;
  student_name: string;
  subject_name: string | null;
  instructor_name: string | null;
  endorsement_token: string;
  instructor_endorsed: boolean;
  instructor_signature_data: string | null;
  endorsed_at: string | null;
  status: "pending" | "Active" | "Rejected";
  borrowed_at: string;
  due_at: string;
  remarks: string | null;
  items: Array<{
    id: number;
    variant_id: number | null;
    name: string;
    quantity: number;
  }>;
};

const mockBorrowRequests = new Map<string, MockBorrowRequest>();
let nextMockLoanId = 100000;

export function isDatabaseUnavailable(error: unknown) {
  if (!process.env.DATABASE_URL) return true;
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  if (typeof error.code !== "string") return false;
  return (
    error.code.startsWith("08") ||
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
    ].includes(error.code)
  );
}

export function addMockBorrowRequest(input: {
  student_id: string;
  student_name: string;
  subject_name: string | null;
  instructor_name: string | null;
  items: MockBorrowRequest["items"];
  due_days: number;
}) {
  const borrowedAt = new Date();
  const request: MockBorrowRequest = {
    loan_id: nextMockLoanId++,
    student_id: input.student_id,
    student_name: input.student_name,
    subject_name: input.subject_name,
    instructor_name: input.instructor_name,
    endorsement_token: randomUUID(),
    instructor_endorsed: false,
    instructor_signature_data: null,
    endorsed_at: null,
    status: "pending",
    borrowed_at: borrowedAt.toISOString(),
    due_at: new Date(
      borrowedAt.getTime() + input.due_days * 24 * 60 * 60 * 1000,
    ).toISOString(),
    remarks: null,
    items: input.items,
  };
  mockBorrowRequests.set(request.endorsement_token, request);
  return {
    loan_id: request.loan_id,
    borrowed_at: request.borrowed_at,
    due_at: request.due_at,
    remarks: request.remarks,
    endorsement_token: request.endorsement_token,
    subject_name: request.subject_name,
    instructor_name: request.instructor_name,
    instructor_endorsed: false,
    items: request.items,
    mock_fallback: true,
  };
}

export function getMockBorrowRequest(token: string) {
  return mockBorrowRequests.get(token) ?? null;
}

export function endorseMockBorrowRequest(
  token: string,
  instructorName: string,
  signatureData: string,
) {
  const request = mockBorrowRequests.get(token);
  if (!request || request.instructor_endorsed || request.status !== "pending") {
    return null;
  }
  request.instructor_name = instructorName;
  request.instructor_endorsed = true;
  request.instructor_signature_data = signatureData;
  request.endorsed_at = new Date().toISOString();
  return request;
}

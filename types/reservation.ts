export type ApparatusCategory =
  | "Glassware"
  | "Electronics"
  | "Tools"
  | "Machines"
  | "Safety";

export type Apparatus = {
  id: string;
  name: string;
  category: ApparatusCategory;
  availableStock: number;
};

export type Machine = {
  id: string;
  name: string;
};

export type StaffLoanStatus = "Active" | "Overdue";

export type StaffLoanItem = {
  name: string;
  quantity: number;
  variant_id?: number | null;
  loanItemId?: number;
};

export type ReturnItemSplit = {
  loan_item_id: number;
  good_qty: number;
  damaged_qty: number;
  lost_qty: number;
  damage_notes: string | null;
};

export type ReturnLoanItem = StaffLoanItem & {
  loanItemId: number;
  dueAt: string;
};

export type StudentActiveLoans = {
  studentId: string;
  studentName: string;
  loans: Array<{
    loanId: number;
    borrowedAt: string;
    dueAt: string;
    items: ReturnLoanItem[];
    subject_name: string | null;
    instructor_name: string | null;
    endorsement_token: string | null;
    instructor_endorsed: boolean;
    endorsement_method: string | null;
    instructor_signature_data: string | null;
    endorsed_at: string | null;
  }>;
};

export type BorrowingHistoryItem = {
  loanItemId: number;
  name: string;
  quantity: number;
  returnedQuantity: number;
  activeQuantity: number;
  variantId: number | null;
  returnCondition: "good" | "damaged" | "lost";
  damagedQty: number;
  lostQty: number;
  damageNotes: string | null;
};

export type InstructorEndorsement = {
  subject_name?: string | null;
  instructor_name?: string | null;
  endorsement_token?: string | null;
  instructor_endorsed?: boolean;
  endorsement_method?: string | null;
  instructor_signature_data?: string | null;
  endorsed_at?: string | null;
};

export type BorrowRequestItem = {
  id?: number;
  variant_id?: number;
  quantity: number;
};

export type BorrowRequest = InstructorEndorsement & {
  student_id: string;
  items: BorrowRequestItem[];
  due_days?: number;
};

export type LoanReturnCondition = {
  returnCondition: "good" | "damaged" | "lost";
  damagedQty: number;
  lostQty: number;
  damageNotes: string | null;
};

export type ReservationRequest = InstructorEndorsement & {
  machine: string;
  student_id: string;
  start_time: string;
  end_time: string;
};

export type StudentBorrowingHistory = {
  studentId: string;
  studentName: string;
  loans: Array<{
    loanId: number;
    borrowedAt: string;
    dueAt: string;
    returnedAt: string | null;
    status: StaffLoanStatus | "Returned";
    items: BorrowingHistoryItem[];
    subject_name: string | null;
    instructor_name: string | null;
    endorsement_token: string | null;
    instructor_endorsed: boolean;
    endorsement_method: string | null;
    instructor_signature_data: string | null;
    endorsed_at: string | null;
  }>;
};

export type StaffLoan = InstructorEndorsement & {
  loanId: number;
  studentId: string;
  studentName: string;
  items: StaffLoanItem[];
  borrowedAt: string;
  dueAt: string;
  status: StaffLoanStatus;
  remarks: string | null;
  released_at?: string | null;
};

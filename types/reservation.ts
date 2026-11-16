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
  }>;
};

export type BorrowingHistoryItem = {
  loanItemId: number;
  name: string;
  quantity: number;
  returnedQuantity: number;
  activeQuantity: number;
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
  }>;
};

export type StaffLoan = {
  loanId: number;
  studentId: string;
  studentName: string;
  items: StaffLoanItem[];
  borrowedAt: string;
  dueAt: string;
  status: StaffLoanStatus;
  remarks: string | null;
};

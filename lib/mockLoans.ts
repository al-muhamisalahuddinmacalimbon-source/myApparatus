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
};

export const mockLoans: StaffLoan[] = [
  {
    loanId: 1,
    studentId: "2023-0001",
    studentName: "Juan Dela Cruz",
    items: [
      { name: "Beaker 250 mL", quantity: 2 },
      { name: "Safety goggles", quantity: 1 },
    ],
    borrowedAt: "2026-10-30T09:00:00+08:00",
    dueAt: "2026-11-02T09:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 2,
    studentId: "2023-0002",
    studentName: "Maria Santos",
    items: [
      { name: "Multimeter", quantity: 1 },
      { name: "Soldering iron", quantity: 1 },
    ],
    borrowedAt: "2026-10-24T09:00:00+08:00",
    dueAt: "2026-10-29T09:00:00+08:00",
    status: "Overdue",
  },
  {
    loanId: 3,
    studentId: "2023-0003",
    studentName: "Ana Reyes",
    items: [{ name: "Beaker 500 mL", quantity: 1 }],
    borrowedAt: "2026-10-25T08:00:00+08:00",
    dueAt: "2026-10-30T08:00:00+08:00",
    status: "Overdue",
  },
  {
    loanId: 4,
    studentId: "2023-0004",
    studentName: "Carlo Mendoza",
    items: [{ name: "Erlenmeyer flask", quantity: 1 }],
    borrowedAt: "2026-10-26T08:00:00+08:00",
    dueAt: "2026-11-02T08:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 5,
    studentId: "2023-0005",
    studentName: "Liza Fernandez",
    items: [{ name: "Test tube set", quantity: 1 }],
    borrowedAt: "2026-10-27T08:00:00+08:00",
    dueAt: "2026-10-31T08:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 6,
    studentId: "2024-0053",
    studentName: "Al-Muhami M. Macalimbon",
    items: [{ name: "Graduated cylinder", quantity: 1 }],
    borrowedAt: "2026-10-28T08:00:00+08:00",
    dueAt: "2026-11-03T08:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 7,
    studentId: "2023-0006",
    studentName: "Lance Sacay",
    items: [{ name: "Petri dish set", quantity: 1 }],
    borrowedAt: "2026-10-29T08:00:00+08:00",
    dueAt: "2026-11-05T08:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 8,
    studentId: "2023-0007",
    studentName: "Sai Malubay",
    items: [{ name: "Breadboard", quantity: 1 }],
    borrowedAt: "2026-10-30T08:00:00+08:00",
    dueAt: "2026-11-06T08:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 9,
    studentId: "2023-0008",
    studentName: "Cosain Saleh",
    items: [{ name: "Oscilloscope probe", quantity: 1 }],
    borrowedAt: "2026-10-30T09:00:00+08:00",
    dueAt: "2026-11-07T09:00:00+08:00",
    status: "Active",
  },
  {
    loanId: 10,
    studentId: "2023-0009",
    studentName: "Demos Maglasang",
    items: [{ name: "DC power supply", quantity: 1 }],
    borrowedAt: "2026-10-30T10:00:00+08:00",
    dueAt: "2026-11-08T10:00:00+08:00",
    status: "Active",
  },
];

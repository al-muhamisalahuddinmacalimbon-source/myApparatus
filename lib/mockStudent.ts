export type Student = {
  studentId: string;
  name: string;
  course: string;
  yearLevel: string;
};

export const mockStudents: Student[] = [
  {
    studentId: "2024-0053",
    name: "Alex Student",
    course: "BS Computer Science",
    yearLevel: "2nd Year",
  },
  {
    studentId: "2024-0054",
    name: "Jamie Student",
    course: "BS Information Technology",
    yearLevel: "1st Year",
  },
];

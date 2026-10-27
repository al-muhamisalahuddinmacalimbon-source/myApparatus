"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { mockStudents, Student } from "../lib/mockStudent";

type StudentContextValue = {
  students: Student[];
  addStudent: (student: Student) => void;
};

const StudentContext = createContext<StudentContextValue | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(mockStudents);

  function addStudent(student: Student) {
    setStudents((currentStudents) => [...currentStudents, student]);
  }

  return (
    <StudentContext.Provider value={{ students, addStudent }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudents() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error("useStudents must be used within a StudentProvider");
  }
  return context;
}

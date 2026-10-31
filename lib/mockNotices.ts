export type NoticeCategory = "Schedule" | "Safety" | "Announcements";

export type LabNotice = {
  id: string;
  title: string;
  category: NoticeCategory;
  date: string;
  pinned: boolean;
  body: string[];
};

export function getOrderedNotices(notices: LabNotice[]) {
  return [...notices].sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    return second.date.localeCompare(first.date);
  });
}

export const mockNotices: LabNotice[] = [
  {
    id: "safety-induction",
    title: "Safety induction required for shared machines",
    category: "Safety",
    date: "2026-10-28",
    pinned: true,
    body: [
      "Complete the lab safety induction before using shared machines. The induction introduces machine-area rules, emergency procedures and the limits of student access. Only students who have completed the required induction and have been cleared for the specific machine may use it; a booking alone does not establish eligibility.",
      "Bring your Student ID to the lab counter and ask the technician to confirm your training record before your first session. The technician will check that your induction and any machine-specific training are recorded against your ID. Allow time for this confirmation before requesting access to a shared machine.",
      "Operate equipment only as demonstrated during training and follow the instructions displayed at each machine. Wear approved eye protection in all machine areas, secure loose clothing and keep the work area clear. Do not bypass guards or use damaged equipment. If a machine behaves unexpectedly, stop safely and notify the technician.",
      "If your training record is missing, incomplete or does not include the machine you need, do not operate the equipment. Contact the technician before booking so your record can be checked and any required induction or refresher training can be arranged. Wait for confirmation of your eligibility before reserving or using the machine.",
    ],
  },
  {
    id: "assessment-hours",
    title: "Lab hours for assessment week",
    category: "Schedule",
    date: "2026-10-27",
    pinned: false,
    body: [
      "Extended lab hours are available from 8:00 AM to 10:00 PM during assessment week. The extended schedule is intended to give students additional supervised time to complete approved practical work.",
      "Shared machine bookings remain capped at two hours per session. Reserve an open slot before arriving and check the machine schedule for updates. Please arrive on time so the next student can begin their session as planned.",
      "The lab counter is staffed during the posted service periods. Students who need machine access must check in with the technician before starting, even when they have an existing reservation.",
      "Normal operating hours resume after assessment week. Check this notice board for any changes caused by maintenance or staffing availability.",
    ],
  },
  {
    id: "return-counter",
    title: "Equipment return counter reminder",
    category: "Announcements",
    date: "2026-10-26",
    pinned: false,
    body: [
      "Please return borrowed equipment to the designated lab return counter before closing time. Do not leave equipment on benches, outside the laboratory or with another student.",
      "A technician will inspect the returned items and record the return against your borrower slip. Keep the equipment together with any accessories supplied at checkout so the return can be processed correctly.",
      "If you cannot return an item before the lab closes, contact the technician as soon as possible. Items left without a recorded return may continue to appear as borrowed in your account.",
      "Late returns may delay your next borrowing request. Check My Bookings for due dates and contact the lab counter if you believe a return has not been recorded.",
    ],
  },
  {
    id: "eye-protection",
    title: "Wear eye protection in machine areas",
    category: "Safety",
    date: "2026-10-25",
    pinned: false,
    body: [
      "Approved safety glasses are required in all machine zones. Put on eye protection before entering a marked machine area and keep it on while equipment is operating.",
      "Students without approved eye protection must not operate machinery. Ask the technician if you are unsure whether your protective equipment meets the lab requirements.",
      "Keep safety glasses clean and in good condition. Replace damaged or heavily scratched glasses before beginning work, and do not share personal protective equipment unless it has been cleaned appropriately.",
      "Follow all machine-specific signs and technician instructions. Additional protective equipment may be required for particular tasks or equipment.",
    ],
  },
  {
    id: "furnace-maintenance",
    title: "Furnace maintenance on Friday",
    category: "Schedule",
    date: "2026-10-24",
    pinned: false,
    body: [
      "The furnace will be offline for scheduled maintenance this Friday from 9:00 AM to 1:00 PM. Reservations during this period will not be available.",
      "Alternative equipment is available in Lab B. Check its availability before arriving and speak with the technician if you need help identifying suitable equipment for your approved procedure.",
      "Please do not attempt to start, adjust or access the furnace while maintenance is in progress. The area may be restricted until the technician confirms that work is complete.",
      "The furnace schedule will be updated when it is cleared for use. Check the Shared Machines calendar before planning a session.",
    ],
  },
  {
    id: "borrowing-guidelines",
    title: "New borrowing guidelines available",
    category: "Announcements",
    date: "2026-10-23",
    pinned: false,
    body: [
      "Updated borrowing rules and late-return guidance are now available through the laboratory. Please review the current requirements before submitting your next borrower slip.",
      "Borrowers are responsible for checking that equipment and accessories are in suitable condition at checkout. Report missing or damaged items to the technician before leaving the counter.",
      "Return all borrowed items to the designated counter by the due date shown on your borrower slip. The technician records returns after inspection, so allow time for the return process before closing.",
      "If you have questions about a specific item or your borrowing record, contact the technician or visit the lab counter during staffed hours.",
    ],
  },
];

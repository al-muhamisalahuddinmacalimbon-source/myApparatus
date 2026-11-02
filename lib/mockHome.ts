export type HomeCard = {
  title: string;
  description?: string;
  actionLabel: string;
  href: string;
};

export const mockHomeCards: HomeCard[] = [
  {
    title: "My Bookings",
    description: "See your active equipment borrowings and due dates.",
    actionLabel: "View bookings",
    href: "/my-bookings",
  },
  {
    title: "Lab notices",
    description: "Laboratory is under maintenance until October 28, 2026.",
    actionLabel: "Read notices",
    href: "/notices",
  },
  {
    title: "Machines free today",
    actionLabel: "Browse machines",
    href: "/reserve",
  },
];

export type HomeCard = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

export const mockHomeCards: HomeCard[] = [
  {
    title: "My Bookings",
    description: "3 items currently borrowed across 2 labs.",
    actionLabel: "View bookings",
    href: "/my-bookings",
  },
  {
    title: "Lab notices",
    description: "Laboratory is under maintenance until October 28, 2026.",
    actionLabel: "Read notices",
    href: "/home#lab-notices",
  },
  {
    title: "Machines free today",
    description: "4 devices are available now.",
    actionLabel: "Browse machines",
    href: "/reserve",
  },
];

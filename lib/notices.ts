export const noticeCategories = ["Schedule", "Safety", "Announcements"] as const;

export type NoticeCategory = (typeof noticeCategories)[number];

export type LabNotice = {
  id: number;
  title: string;
  category: NoticeCategory;
  body: string;
  pinned: boolean;
  created_at: string;
};

export function isLabNotice(value: unknown): value is LabNotice {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    noticeCategories.some((category) => category === value.category) &&
    "body" in value &&
    typeof value.body === "string" &&
    "pinned" in value &&
    typeof value.pinned === "boolean" &&
    "created_at" in value &&
    typeof value.created_at === "string"
  );
}

export function getOrderedNotices(notices: LabNotice[]) {
  return [...notices].sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    return second.created_at.localeCompare(first.created_at);
  });
}

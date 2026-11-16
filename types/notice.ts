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

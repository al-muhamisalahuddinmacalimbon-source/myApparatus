import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "../../../components/TopBar";
import { getOrderedNotices, mockNotices } from "../../../lib/mockNotices";

function formatNoticeDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default async function NoticeDetailPage({
  params,
}: PageProps<"/notices/[id]">) {
  const { id } = await params;
  const notices = getOrderedNotices(mockNotices);
  const noticeIndex = notices.findIndex((notice) => notice.id === id);
  if (noticeIndex < 0) notFound();

  const notice = notices[noticeIndex];
  const previousNotice = notices[noticeIndex - 1];
  const nextNotice = notices[noticeIndex + 1];

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Link
          className="mb-4 inline-flex text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href="/notices"
        >
          &lt; Back to Lab Notices
        </Link>
        <article className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {notice.pinned && (
                <span className="rounded bg-success px-2 py-1 text-xs font-semibold text-surface">
                  Pinned
                </span>
              )}
              <span className="rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text">
                {notice.category}
              </span>
            </div>
            <time className="shrink-0 text-xs font-semibold text-ink">
              {formatNoticeDate(notice.date)}
            </time>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-ink">{notice.title}</h1>
          <p className="border-b border-ink/20 pb-4 text-sm text-ink/70">
            Posted by Lab Technician
          </p>
          <div className="space-y-4 py-4 text-sm leading-6 text-ink">
            {notice.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <nav
            aria-label="Notice navigation"
            className="flex justify-between gap-4 border-t border-ink/20 pt-4 text-sm"
          >
            {previousNotice ? (
              <Link
                className="font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href={`/notices/${previousNotice.id}`}
              >
                &lt; Previous notice
              </Link>
            ) : (
              <span />
            )}
            {nextNotice && (
              <Link
                className="font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href={`/notices/${nextNotice.id}`}
              >
                Next notice &gt;
              </Link>
            )}
          </nav>
        </article>
      </main>
    </>
  );
}

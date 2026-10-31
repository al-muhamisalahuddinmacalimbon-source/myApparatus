import Link from "next/link";
import TopBar from "../../components/TopBar";

const faqs = [
  {
    question: "How do I scan my Student ID?",
    answer:
      "The USB barcode scanner acts like a keyboard. Focus the Student ID field, then scan your card. The scanner enters your ID and presses Enter automatically. You can also type your Student ID and press Enter.",
  },
  {
    question: "What if my Student ID is not found?",
    answer:
      "Check that the ID was entered correctly. If it is still not found, visit the lab counter and ask the technician to confirm your student record before borrowing equipment.",
  },
  {
    question: "How do I choose equipment quantities?",
    answer:
      "In the catalog, add an available item to your cart. Use the quantity controls in the cart to select how many units you need, up to the available stock.",
  },
  {
    question: "How do I reserve a shared machine?",
    answer:
      "Open Shared Machines, choose a machine and an open future time slot, review the booking window, then confirm your reservation.",
  },
  {
    question: "Where do I return borrowed items?",
    answer:
      "Return equipment to the designated lab counter and hand it directly to the technician so the return can be inspected and recorded.",
  },
  {
    question: "How do I cancel a reservation?",
    answer:
      "Open My Bookings and contact the lab technician with the machine and time of the reservation you need to cancel.",
  },
];

const quickSteps = [
  "Scan or type your Student ID",
  "Choose equipment",
  "Submit Borrower Slip",
  "Return items to the technician",
];

export default function HelpPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-xl font-semibold text-ink">Help</h1>

        <section className="mb-4 rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4">
          <h2 className="mb-3 font-semibold text-ink">Quick start</h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickSteps.map((step, index) => (
              <li className="flex items-center gap-2 text-sm text-ink" key={step}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-maroon text-xs font-bold text-surface">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(15rem,0.9fr)]">
          <section className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4">
            <h2 className="mb-3 font-semibold text-ink">
              Frequently asked questions
            </h2>
            <div className="divide-y divide-ink/15">
              {faqs.map((faq, index) => (
                <details className="group py-3" key={faq.question} open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-lg font-normal text-maroon group-open:rotate-180"
                    >
                      ⌄
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-5 text-ink">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="grid gap-4">
            <section className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4">
              <h2 className="mb-3 font-semibold text-ink">Lab hours and location</h2>
              <p className="text-sm leading-5 text-ink">
                Monday–Saturday
                <br />
                8:00 AM–5:00 PM
              </p>
              <p className="mt-3 text-sm text-ink">
                Science Building, ground-floor lab counter
              </p>
              <p className="mt-3 border-t border-ink/15 pt-3 text-sm text-ink">
                Check Lab Notices for temporary assessment-week hours.
              </p>
              <Link
                className="mt-2 inline-flex text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href="/notices"
              >
                View Lab Notices
              </Link>
            </section>

            <section className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4">
              <h2 className="mb-3 font-semibold text-ink">
                Contact the technician
              </h2>
              <p className="text-sm text-ink">Technician name</p>
              <a
                className="mt-2 inline-flex text-sm text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href="mailto:technician@example.edu"
              >
                technician@example.edu
              </a>
              <p className="mt-3 text-sm text-ink">
                Visit the lab counter for urgent concerns.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

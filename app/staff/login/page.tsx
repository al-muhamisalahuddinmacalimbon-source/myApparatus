"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { mockStaff } from "../../../lib/mockStaff";

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredUsername = username.trim();

    if (!enteredUsername || !password) {
      setError("Invalid username or password");
      return;
    }

    const matchingStaff = mockStaff.find(
      (staff) => staff.username.toLowerCase() === enteredUsername.toLowerCase(),
    );
    localStorage.setItem(
      "staff",
      JSON.stringify({
        username: enteredUsername,
        name: matchingStaff?.name ?? enteredUsername,
      }),
    );
    setError("");
    router.push("/staff/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between bg-maroon px-6 text-surface">
        <Link className="font-bold" href="/">
          myApparatus
        </Link>
        <Link className="text-sm text-surface hover:underline" href="/">
          Student screen
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-sm rounded-lg border border-ink/20 border-t-[3px] border-t-accent bg-surface p-6">
          <h1 className="mb-5 text-xl font-semibold text-ink">
            Technician login
          </h1>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <label
              className="text-sm font-semibold text-ink"
              htmlFor="staff-username"
            >
              Username
            </label>
            <input
              autoComplete="username"
              className="h-11 rounded border border-ink/50 bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="staff-username"
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              placeholder="e.g. Marilou Legaspi"
              type="text"
              value={username}
            />

            <label
              className="text-sm font-semibold text-ink"
              htmlFor="staff-password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="h-11 rounded border border-ink/50 bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="staff-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              type="password"
              value={password}
            />

            <div aria-live="polite" className="min-h-5">
              {error && (
                <p className="text-xs text-alert-text" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              className="h-11 rounded bg-maroon font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              type="submit"
            >
              Sign in
            </button>
          </form>

          <Link
            className="mt-4 inline-flex text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href="/"
          >
            Back to student screen
          </Link>
        </section>
      </main>
    </div>
  );
}

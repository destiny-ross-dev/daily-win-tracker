"use client";

import Link from "next/link";
import { Fraunces, Space_Grotesk } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-alt",
});

export default function Home() {
  return (
    <div
      className={`${space.variable} ${fraunces.variable} min-h-screen bg-[#f7f4ef] text-slate-900`}
      style={{
        ["--ink" as string]: "#101012",
        ["--accent" as string]: "#0f6b5f",
        ["--accent-soft" as string]: "#c7efe6",
        ["--sun" as string]: "#f3c969",
        ["--paper" as string]: "#f7f4ef",
      }}
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(243,201,105,0.55),rgba(243,201,105,0))]" />
        <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(15,107,95,0.35),rgba(15,107,95,0))]" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-[120%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(247,244,239,0),rgba(247,244,239,1))]" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent)] text-white font-semibold">
              DW
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide uppercase text-slate-600">
                Daily Win
              </div>
              <div className="text-sm text-slate-500">Sales Execution OS</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#workflow" className="hover:text-slate-900">
              Workflow
            </a>
            <a href="#insight" className="hover:text-slate-900">
              Insight
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5d53]"
            >
              Start today
            </Link>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10 md:pt-16">
          <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">
                Built for agents who win daily
              </p>
              <h1
                className="text-4xl font-semibold leading-tight md:text-6xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                A deliberate rhythm for quoting, writing, and issuing.
              </h1>
              <p className="text-lg text-slate-700 md:text-xl">
                Daily Win gives agencies a shared operational cadence: live goals,
                activity logging, and team visibility with agency-aware guardrails.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/50 hover:bg-[#0d5d53]"
                >
                  Start a free workspace
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  View demo
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1">
                  Agency-scoped visibility
                </span>
                <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1">
                  Live activity feed
                </span>
                <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1">
                  Daily scorecards
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="animate-fade-in rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Today&apos;s cadence
                    </p>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      Tuesday Focus
                    </h2>
                  </div>
                  <div className="rounded-full bg-[var(--sun)] px-3 py-1 text-xs font-semibold text-slate-900">
                    8:03 AM
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    { label: "Quotes", value: "12 / 18", tone: "bg-white" },
                    { label: "Sales", value: "4 / 7", tone: "bg-white" },
                    { label: "Callbacks", value: "5 scheduled", tone: "bg-white" },
                  ].map((item, idx) => (
                    <div
                      key={item.label}
                      className={`animate-rise-in ${item.tone} rounded-2xl border border-slate-200 px-4 py-3`}
                      style={{ animationDelay: `${idx * 120}ms` }}
                    >
                      <div className="text-xs uppercase tracking-widest text-slate-500">
                        {item.label}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-slate-800">
                  <span>Win the Hour</span>
                  <span className="font-semibold">2 of 4 achieved</span>
                </div>
              </div>
            </div>
          </section>

          <section
            id="features"
            className="mt-20 grid gap-6 md:grid-cols-3"
          >
            {[
              {
                title: "Daily goals",
                body: "Set measurable targets by line of business. Keep every agent aligned on the same scoreboard.",
              },
              {
                title: "Live activity",
                body: "Track dials, quotes, and appointments with contextual detail, not just counts.",
              },
              {
                title: "Agency oversight",
                body: "Admins see agency-wide performance. Producers see their own momentum.",
              },
            ].map((card, idx) => (
              <div
                key={card.title}
                className="animate-rise-in rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                style={{ animationDelay: `${idx * 140}ms` }}
              >
                <h3
                  className="text-xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {card.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">{card.body}</p>
              </div>
            ))}
          </section>

          <section
            id="workflow"
            className="mt-20 grid gap-10 lg:grid-cols-[1fr_1fr]"
          >
            <div className="space-y-4">
              <h2
                className="text-3xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                The daily rhythm, mapped.
              </h2>
              <p className="text-slate-700">
                From first dial to issued policy, your team moves through a
                shared flow that keeps managers and producers in sync.
              </p>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="grid gap-4">
                  {[
                    "Set your win-the-hour targets",
                    "Log quotes and callbacks in real time",
                    "Review daily outcomes before close",
                  ].map((step, idx) => (
                    <div
                      key={step}
                      className="flex items-start gap-3"
                      style={{ animationDelay: `${idx * 120}ms` }}
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                      <span className="text-sm text-slate-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Live snapshots
              </h3>
              <div className="mt-6 grid gap-4">
                {[
                  { label: "Agency quotes", value: "42", sub: "Today" },
                  { label: "Written premium", value: "$12,430", sub: "This week" },
                  { label: "Callbacks", value: "18", sub: "Open" },
                ].map((metric, idx) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                    style={{ animationDelay: `${idx * 120}ms` }}
                  >
                    <div>
                      <div className="text-xs uppercase tracking-widest text-slate-500">
                        {metric.label}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {metric.value}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {metric.sub}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="insight"
            className="mt-20 rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm md:p-12"
          >
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <h2
                  className="text-3xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Protect your focus.
                </h2>
                <p className="text-slate-700">
                  DNC days, agency guardrails, and role-aware access keep your
                  team in compliance while staying fast.
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    "Admin-only settings",
                    "Agency-scoped visibility",
                    "Daily compliance checks",
                  ].map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-[var(--accent)] p-6 text-white">
                <div className="text-xs uppercase tracking-widest text-white/70">
                  Outcome
                </div>
                <div className="mt-4 text-3xl font-semibold">
                  1 dashboard. 1 rhythm. 1 team.
                </div>
                <div className="mt-6 text-sm text-white/80">
                  Stay aligned with daily goals, real-time activity, and a
                  performance story everyone can read.
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16 rounded-[36px] border border-slate-200 bg-[var(--ink)] px-8 py-10 text-white md:flex md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2
                className="text-3xl font-semibold"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Ready to build daily wins?
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Start with your first agency, invite a few producers, and watch
                the day take shape.
              </p>
            </div>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 md:mt-0"
            >
              Launch your workspace
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

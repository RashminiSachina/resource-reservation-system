import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const features = [
  {
    id: "feature-easy-booking",
    icon: (
      <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    title: "Easy Booking",
    description:
      "Reserve any resource in seconds. Pick a date, choose a time slot, and you're done — no paperwork required.",
  },
  {
    id: "feature-availability",
    icon: (
      <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Real-Time Availability",
    description:
      "See which resources are free at a glance. Live availability updates prevent double-bookings and scheduling conflicts.",
  },
  {
    id: "feature-manage",
    icon: (
      <svg className="h-7 w-7 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
    title: "Manage Reservations",
    description:
      "View, track, and cancel your reservations from one dashboard. Stay on top of every booking with instant notifications.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 py-24 sm:py-32">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-100">
              Resource Reservation Management
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Reserve Your Resources,{" "}
              <span className="text-indigo-200">Simplify Your Schedule.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-indigo-100">
              Browse available resources, book time slots in seconds, and manage
              all your reservations from a single, intuitive dashboard.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                id="hero-get-started"
                href="/register"
                className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700"
              >
                Get Started
              </Link>
              <Link
                id="hero-sign-in"
                href="/login"
                className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-xl border-2 border-white/40 bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Everything you need to manage resources
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                A streamlined experience for teams and individuals alike.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.id}
                  id={f.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 group-hover:bg-indigo-50 transition">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="text-sm leading-7 text-slate-600">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="bg-indigo-600 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to get organised?
            </h2>
            <p className="mt-3 text-base text-indigo-100">
              Create your free account and start reserving resources today.
            </p>
            <Link
              id="cta-create-account"
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-white px-10 text-sm font-semibold text-indigo-700 shadow transition hover:bg-indigo-50"
            >
              Create an Account
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const features = [
  {
    id: "feature-easy-booking",
    icon: (
      <svg className="h-6 w-6 text-[#0052CC]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
      <svg className="h-6 w-6 text-[#84CC16]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
      <svg className="h-6 w-6 text-[#0052CC]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative border-b border-[#E5E7EB] bg-gradient-to-br from-[#0052CC] via-[#0047B3] to-[#003399] py-24 sm:py-32 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 opacity-20 animate-float-slow">
              <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div className="absolute top-40 right-20 opacity-20 animate-float-medium">
              <svg className="h-12 w-12 text-[#84CC16]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="absolute bottom-20 left-1/4 opacity-20 animate-float-slow">
              <svg className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div className="absolute top-32 right-1/3 opacity-20 animate-float-fast">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.007v.008H6.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM6.75 12h.007v.008H6.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H6.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div className="absolute bottom-32 right-10 opacity-20 animate-float-medium">
              <svg className="h-12 w-12 text-[#84CC16]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Reserve Your Resources,{" "}
              <span className="text-[#84CC16]">Simplify Your Schedule.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90">
              Browse available resources, book time slots in seconds, and manage
              all your reservations from a single, intuitive dashboard.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                id="hero-get-started"
                href="/register"
                className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-md bg-[#84CC16] px-8 text-sm font-medium text-white hover:bg-[#6DB30F] transition-colors"
              >
                Get Started
              </Link>
              <Link
                id="hero-sign-in"
                href="/login"
                className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-md border border-white/30 px-8 text-sm font-medium text-white hover:bg-white/10 transition-colors"
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
              <h2 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] sm:text-4xl">
                Everything you need to manage resources
              </h2>
              <p className="mt-4 text-base leading-7 text-[#6B7280]">
                A streamlined experience for teams and individuals alike.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.id}
                  id={f.id}
                  className="group rounded-lg border border-[#E5E7EB] bg-white p-8 transition-colors hover:border-[#0052CC]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#F3F4F6] text-[#0052CC]">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[#1A1A1A]">{f.title}</h3>
                  <p className="text-sm leading-7 text-[#6B7280]">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="bg-[#1A1A1A] py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Ready to get organised?
            </h2>
            <p className="mt-3 text-base text-[#9CA3AF]">
              Create your free account and start reserving resources today.
            </p>
            <Link
              id="cta-create-account"
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-[#0052CC] px-10 text-sm font-medium text-white hover:bg-[#0047B3] transition-colors"
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

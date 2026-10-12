"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

interface Resource {
  id: string;
  name: string;
  location: string | null;
  category: { name: string };
}

interface ReservationRow {
  id: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
  resource: Resource;
}

interface DashboardStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel reservation
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch("/api/user/dashboard");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?callbackUrl=/dashboard");
          return;
        }
        throw new Error("Failed to load dashboard.");
      }
      const data = await res.json();
      setUser(data.user);
      setStats(data.stats);
      setReservations(data.recentReservations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(reservationId: string) {
    setCancelling(reservationId);
    try {
      const res = await fetch("/api/user/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed to cancel.");
        return;
      }
      await loadData();
    } finally {
      setCancelling(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-base font-medium text-red-800">{error}</p>
          <button onClick={() => void loadData()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">R</span>
            ReserveIt
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">{user?.name}</span>
            <button
              onClick={() => void handleLogout()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, <span className="text-indigo-600">{user?.name}</span>!
          </h1>
          <p className="mt-1 text-sm text-slate-500">{user?.email} · {user?.role === "ADMIN" ? "Administrator" : "Member"}</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total", value: stats.total, color: "text-slate-800", bg: "bg-slate-100" },
              { label: "Pending", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Confirmed", value: stats.confirmed, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Cancelled", value: stats.cancelled, color: "text-red-700", bg: "bg-red-50" },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border border-slate-200 ${card.bg} p-5`}>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                <p className={`mt-1 text-3xl font-extrabold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mb-8 flex flex-wrap gap-3">
          <BookingModal onSuccess={() => void loadData()} />
          <Link
            href="/dashboard/reservations"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            View all reservations
          </Link>
        </div>

        {/* Recent Reservations Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Reservations</h2>
          </div>

          {reservations.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <svg className="mb-3 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <p className="text-sm font-medium text-slate-600">No reservations yet</p>
              <p className="mt-1 text-xs text-slate-400">Book a resource to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Resource", "Purpose", "Start Time", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {r.resource.name}
                        {r.resource.location && <span className="ml-1 text-xs text-slate-400">· {r.resource.location}</span>}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">{r.purpose}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {new Date(r.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "PENDING" && (
                          <button
                            onClick={() => void handleCancel(r.id)}
                            disabled={cancelling === r.id}
                            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            {cancelling === r.id ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ---- Inline Booking Modal ----
function BookingModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState<{ id: string; name: string; location: string | null; category: { name: string } }[]>([]);
  const [form, setForm] = useState({ resourceId: "", purpose: "", startTime: "", endTime: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/user/resources")
      .then((r) => r.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]));
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error ?? "Failed to book."); return; }
      setOpen(false);
      setForm({ resourceId: "", purpose: "", startTime: "", endTime: "" });
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Book a Resource
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New Reservation</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            {err && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{err}</div>}
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Resource</label>
                <select
                  required
                  value={form.resourceId}
                  onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a resource…</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.location ? ` — ${r.location}` : ""} ({r.category.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Purpose</label>
                <input
                  required
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  placeholder="e.g. Team meeting, training session"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                  {loading ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

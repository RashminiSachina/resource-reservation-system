"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

interface ReservationRow {
  id: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
  resource: {
    id: string;
    name: string;
    location: string | null;
    category: { name: string };
  };
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function UserReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async (filter: string) => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/user/reservations?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?callbackUrl=/dashboard/reservations");
          return;
        }
        throw new Error("Failed to load reservations.");
      }
      const data = await res.json();
      setReservations(data.reservations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading reservations.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReservations(statusFilter);
  }, [fetchReservations, statusFilter]);

  async function handleCancel(id: string) {
    if (!confirm("Are you sure you want to cancel this pending reservation?")) return;
    setCancellingId(id);
    try {
      const res = await fetch("/api/user/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error ?? "Failed to cancel reservation.");
        return;
      }
      void fetchReservations(statusFilter);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">R</span>
            ReserveIt
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Reservations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage your pending and past resource bookings.
            </p>
          </div>

          {/* Filter dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <svg className="mb-3 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <p className="text-sm font-semibold text-slate-700">No reservations found</p>
              <p className="mt-1 text-xs text-slate-400">
                {statusFilter ? `No ${statusFilter.toLowerCase()} reservations recorded.` : "You have not made any bookings yet."}
              </p>
              <Link
                href="/dashboard"
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {r.resource.name}
                        {r.resource.location && (
                          <span className="block text-xs font-normal text-slate-400">{r.resource.location}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {r.resource.category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                        {r.purpose}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        <p>{new Date(r.startTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        <p className="text-slate-400">to {new Date(r.endTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {r.status === "PENDING" && (
                          <button
                            onClick={() => void handleCancel(r.id)}
                            disabled={cancellingId === r.id}
                            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            {cancellingId === r.id ? "Cancelling…" : "Cancel"}
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

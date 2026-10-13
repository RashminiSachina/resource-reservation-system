"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import AvailabilityTimetable from "@/components/AvailabilityTimetable";
import NotificationBell from "@/components/NotificationBell";

// ---- Types ----
type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
type Availability = "available" | "booked" | "unknown";

interface ResourceCard {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  requiresApproval?: boolean;
  category: { id: string; name: string };
  availability: Availability;
  conflictStart: string | null;
  conflictEnd: string | null;
}

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

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ---- Helpers ----
const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 border-rose-200",
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0052CC] border-t-transparent" />
  );
}

// ---- Main Page ----
export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<"resources" | "bookings">("resources");
  const [authLoading, setAuthLoading] = useState(true);

  // Resources tab state
  const [resources, setResources] = useState<ResourceCard[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [windowChecked, setWindowChecked] = useState(false);

  // Category filter state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(""); // empty = All Categories

  // Bookings tab state
  const [bookings, setBookings] = useState<ReservationRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Booking modal state
  const [bookingModal, setBookingModal] = useState<{
    resource: ResourceCard;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Timetable modal state
  const [timetableModal, setTimetableModal] = useState<{
    resource: ResourceCard;
  } | null>(null);

  // Global success/error banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!successBanner) return;
    const t = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(t);
  }, [successBanner]);

  // Load authenticated user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/login?callbackUrl=/dashboard");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.user) setUser(d.user as CurrentUser);
      })
      .catch(() => router.push("/login?callbackUrl=/dashboard"))
      .finally(() => setAuthLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load resources (with optional time window and category)
  const loadResources = useCallback(async (start?: string, end?: string, categoryId?: string) => {
    setResourcesLoading(true);
    setResourcesError(null);
    try {
      const params = new URLSearchParams();
      if (start && end) {
        params.set("startTime", new Date(start).toISOString());
        params.set("endTime", new Date(end).toISOString());
      }
      if (categoryId) params.set("categoryId", categoryId);
      const qs = params.toString();
      const url = qs ? `/api/user/resources?${qs}` : "/api/user/resources";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load resources.");
      const d = await res.json();
      setResources((d.resources as ResourceCard[]) ?? []);
    } catch {
      setResourcesError("Unable to load resources. Please try again.");
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  // Load categories once (for the dropdown)
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/user/categories");
      if (!res.ok) throw new Error("Failed to load categories.");
      const d = await res.json();
      setCategories((d.categories as { id: string; name: string }[]) ?? []);
    } catch {
      // Non-critical – dropdown will still show "All Categories"
    } finally {
      setCategoriesLoading(false);
    }
  }, []);


  // Load bookings
  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const res = await fetch("/api/user/reservations?page=1");
      if (!res.ok) throw new Error("Failed to load bookings.");
      const d = await res.json();
      setBookings((d.reservations as ReservationRow[]) ?? []);
    } catch {
      setBookingsError("Unable to load your bookings. Please try again.");
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // Load categories once after auth succeeds
  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);


  // Load initial data based on active tab
  useEffect(() => {
    if (authLoading) return;
    if (activeTab === "resources") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadResources();
    } else {
      void loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authLoading]);

  function handleCheckAvailability() {
    // Require at least a category or a time window
    if (!selectedCategory && !windowStart && !windowEnd) {
      setErrorBanner("Please select a category or a time window to search.");
      return;
    }
    // If either date is provided, both must be valid
    if (windowStart || windowEnd) {
      if (!windowStart || !windowEnd) {
        setErrorBanner("Please provide both a start and end time.");
        return;
      }
      const s = new Date(windowStart);
      const e = new Date(windowEnd);
      if (e <= s) {
        setErrorBanner("End time must be after start time.");
        return;
      }
      if (s.getTime() - Date.now() < 60 * 1000) {
        setErrorBanner("Start time must be at least 1 minute in the future.");
        return;
      }
    }
    setErrorBanner(null);
    setWindowChecked(true);
    void loadResources(
      windowStart || undefined,
      windowEnd || undefined,
      selectedCategory || undefined
    );
  }

  function clearTimeWindow() {
    setWindowStart("");
    setWindowEnd("");
    setWindowChecked(false);
    setSelectedCategory("");
    void loadResources();
  }


  async function handleCancel(reservationId: string) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setCancellingId(reservationId);
    try {
      const res = await fetch("/api/user/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErrorBanner(d.error ?? "Failed to cancel reservation.");
        return;
      }
      setSuccessBanner("Reservation cancelled successfully.");
      await loadBookings();
      // Refresh resource cards preserving active filters
      if (windowChecked) {
        await loadResources(
          windowStart || undefined,
          windowEnd || undefined,
          selectedCategory || undefined
        );
      } else {
        await loadResources(undefined, undefined, selectedCategory || undefined);
      }
    } catch {
      setErrorBanner("Network error. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }


  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Separate upcoming vs past/cancelled bookings
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && new Date(b.startTime) > now
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "CANCELLED" || new Date(b.startTime) <= now
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0052CC] text-white text-sm font-bold">
              R
            </span>
            ReserveIt
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-[#1A1A1A]">{user?.name}</span>
              <span className="text-xs text-[#6B7280]">{user?.email}</span>
            </div>
            {user && <NotificationBell userId={user.id} />}
            <Link
              href="/profile"
              className="text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
            >
              Profile
            </Link>
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => void handleLogout()}
              className="text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Welcome Banner */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-[#0052CC] via-[#0047B3] to-[#003399] p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="text-[#84CC16]">{user?.name}</span>!
          </h1>
          <p className="mt-2 text-white/90">
            Browse available resources and manage your reservations.
          </p>
        </div>

        {/* Global Alerts */}
        {errorBanner && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 8.25h.008v.008H12v-.008z" />
              </svg>
              <span className="font-medium">{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-rose-600 hover:text-rose-800 transition-colors">✕</button>
          </div>
        )}
        {successBanner && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-[#84CC16]/30 bg-gradient-to-r from-[#84CC16]/10 to-[#6DB30F]/10 px-4 py-3 text-sm text-[#6DB30F] shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-[#6DB30F] hover:text-[#84CC16] transition-colors">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex border-b border-[#E5E7EB] bg-white rounded-t-lg px-4">
          {(["resources", "bookings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-[#0052CC] text-[#0052CC]"
                  : "border-transparent text-[#6B7280] hover:text-[#1A1A1A]"
              }`}
            >
              {tab === "resources" ? "Available Resources" : "My Bookings"}
            </button>
          ))}
        </div>

        {/* ===== TAB 1: AVAILABLE RESOURCES ===== */}
        {activeTab === "resources" && (
          <div className="space-y-5">
            {/* Search / Filter Panel */}
            <div className="rounded-xl border border-[#E5E7EB] bg-gradient-to-r from-white to-[#F8FAFC] p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">
                Filter resources by category and availability:
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
                {/* Category dropdown */}
                <div className="w-full sm:w-auto sm:min-w-[180px] sm:flex-1">
                  <label
                    htmlFor="resource-category"
                    className="mb-1 block text-xs font-medium text-[#6B7280]"
                  >
                    Resource Category
                  </label>
                  <select
                    id="resource-category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={categoriesLoading}
                    className="w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] disabled:opacity-60 transition-colors"
                    aria-label="Filter by resource category"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start date */}
                <div className="w-full sm:w-auto sm:flex-1">
                  <label
                    htmlFor="window-start"
                    className="mb-1 block text-xs font-medium text-[#6B7280]"
                  >
                    Start Date &amp; Time
                  </label>
                  <input
                    id="window-start"
                    type="datetime-local"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                    aria-label="Start date and time"
                  />
                </div>

                {/* End date */}
                <div className="w-full sm:w-auto sm:flex-1">
                  <label
                    htmlFor="window-end"
                    className="mb-1 block text-xs font-medium text-[#6B7280]"
                  >
                    End Date &amp; Time
                  </label>
                  <input
                    id="window-end"
                    type="datetime-local"
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                    aria-label="End date and time"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-0 sm:pb-0">
                  <button
                    onClick={handleCheckAvailability}
                    className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#0052CC] to-[#0047B3] px-4 py-2 text-sm font-medium text-white hover:from-[#0047B3] hover:to-[#003399] transition-all shadow-sm whitespace-nowrap"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    Find Available Resources
                  </button>
                  {windowChecked && (
                    <button
                      onClick={clearTimeWindow}
                      className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#F3F4F6] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Active filter status indicator */}
              {windowChecked && (
                <p className="mt-2 text-xs text-[#6DB30F] font-semibold">
                  {selectedCategory
                    ? `✓ Category: "${categories.find((c) => c.id === selectedCategory)?.name ?? ""}"`
                    : "✓ All categories"}
                  {windowStart && windowEnd
                    ? ` · ${new Date(windowStart).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} → ${new Date(windowEnd).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </p>
              )}
            </div>

            {/* Resource Cards */}
            {resourcesLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-lg bg-[#F3F4F6]" />
                ))}
              </div>
            ) : resourcesError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center">
                <p className="text-sm font-medium text-rose-800">{resourcesError}</p>
                <button
                  onClick={() =>
                    void loadResources(
                      windowChecked && windowStart ? windowStart : undefined,
                      windowChecked && windowEnd ? windowEnd : undefined,
                      selectedCategory || undefined
                    )
                  }
                  className="mt-3 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
                >
                  Try Again
                </button>
              </div>

            ) : resources.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <svg className="mb-4 h-14 w-14 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
                <p className="text-base font-medium text-[#6B7280]">No resources available</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">Check back later or contact an administrator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resources.map((resource, index) => {
                  const isBooked = resource.availability === "booked";
                  const noWindow = resource.availability === "unknown";

                  // Generate gradient colors based on index for variety
                  const gradients = [
                    "from-blue-50/50 to-indigo-50/50",
                    "from-cyan-50/50 to-teal-50/50",
                    "from-violet-50/50 to-purple-50/50",
                    "from-rose-50/50 to-pink-50/50",
                    "from-amber-50/50 to-orange-50/50",
                    "from-emerald-50/50 to-green-50/50",
                  ];
                  const gradientClass = gradients[index % gradients.length];

                  return (
                    <div
                      key={resource.id}
                      className={`group relative flex flex-col rounded-lg border bg-gradient-to-br ${gradientClass} transition-all hover:shadow-md ${
                        isBooked
                          ? "border-rose-200"
                          : "border-[#E5E7EB] hover:border-[#0052CC]"
                      }`}
                    >
                      {/* Availability Badge */}
                      <div className="absolute right-3 top-3">
                        {noWindow ? (
                          <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#6B7280] border border-[#E5E7EB]">
                            Select time to check
                          </span>
                        ) : isBooked ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 border border-rose-200">
                            ⊗ Booked
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#84CC16]/10 px-2.5 py-1 text-xs font-medium text-[#6DB30F] border border-[#84CC16]/30">
                            ✓ Available
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        {/* Category */}
                        <div className="mb-2 flex flex-wrap items-center gap-1.5 pr-24">
                          <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            index % 6 === 0
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : index % 6 === 1
                              ? "bg-cyan-100 text-cyan-800 border-cyan-200"
                              : index % 6 === 2
                              ? "bg-violet-100 text-violet-800 border-violet-200"
                              : index % 6 === 3
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : index % 6 === 4
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}>
                            {resource.category.name}
                          </span>
                          <span
                            className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                              resource.requiresApproval !== false
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-[#84CC16]/10 text-[#6DB30F] border-[#84CC16]/30"
                            }`}
                          >
                            {resource.requiresApproval !== false ? "Needs approval" : "Instant confirm"}
                          </span>
                        </div>

                        {/* Name */}
                        <h3 className="mb-1 text-base font-medium text-[#1A1A1A] pr-20">
                          {resource.name}
                        </h3>

                        {/* Meta */}
                        <div className="mt-1 space-y-1">
                          {resource.location && (
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                              </svg>
                              {resource.location}
                            </div>
                          )}
                          {resource.capacity && (
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                              </svg>
                              Capacity {resource.capacity}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {resource.description && (
                          <p className="mt-2 text-xs text-[#9CA3AF] line-clamp-2">
                            {resource.description}
                          </p>
                        )}

                        {/* Conflict notice */}
                        {isBooked && resource.conflictStart && resource.conflictEnd && (
                          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                            Already booked from{" "}
                            <span className="font-medium">{fmtTime(resource.conflictStart)}</span>
                            {" "}to{" "}
                            <span className="font-medium">{fmtTime(resource.conflictEnd)}</span>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="mt-4 pt-2 border-t border-[#E5E7EB] space-y-2">
                          <button
                            onClick={() =>
                              setTimetableModal({ resource })
                            }
                            className="w-full rounded-md bg-gradient-to-r from-[#84CC16] to-[#6DB30F] py-2 text-sm font-medium text-white hover:from-[#6DB30F] hover:to-[#5FA30E] transition-all shadow-sm"
                          >
                            View Availability & Book
                          </button>
                          {noWindow ? (
                            <p className="text-xs text-[#9CA3AF] italic text-center">
                              Or select a time window above for quick booking
                            </p>
                          ) : isBooked ? (
                            <p className="text-xs text-rose-600 text-center font-medium">
                              Not available for selected time window
                            </p>
                          ) : (
                            <button
                              onClick={() =>
                                setBookingModal({
                                  resource,
                                  startTime: windowStart,
                                  endTime: windowEnd,
                                })
                              }
                              className="w-full rounded-md border border-[#E5E7EB] py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#F3F4F6] transition-colors"
                            >
                              Book Selected Time Window
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 2: MY BOOKINGS ===== */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            {bookingsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner />
              </div>
            ) : bookingsError ? (
              <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-8 text-center shadow-sm">
                <p className="text-sm font-medium text-rose-800">{bookingsError}</p>
                <button
                  onClick={() => void loadBookings()}
                  className="mt-3 rounded-md bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-medium text-white hover:from-rose-600 hover:to-rose-700 transition-all shadow-sm"
                >
                  Try Again
                </button>
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <svg className="mb-4 h-14 w-14 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <p className="text-base font-semibold text-[#6B7280]">No reservations yet</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Switch to the{" "}
                  <button
                    onClick={() => setActiveTab("resources")}
                    className="font-semibold text-[#0052CC] hover:text-[#0047B3] transition-colors"
                  >
                    Available Resources
                  </button>{" "}
                  tab to book a resource.
                </p>
              </div>
            ) : (
              <>
                {/* Upcoming */}
                {upcomingBookings.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#6B7280]">
                      Upcoming Reservations ({upcomingBookings.length})
                    </h2>
                    <div className="space-y-3">
                      {upcomingBookings.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          cancellingId={cancellingId}
                          onCancel={handleCancel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past/Cancelled */}
                {pastBookings.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9CA3AF]">
                      Past & Cancelled ({pastBookings.length})
                    </h2>
                    <div className="space-y-3 opacity-75">
                      {pastBookings.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          cancellingId={cancellingId}
                          onCancel={handleCancel}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingModal && (
        <BookingModal
          resource={bookingModal.resource}
          initialStart={bookingModal.startTime}
          onClose={() => setBookingModal(null)}
          onSuccess={(msg) => {
            setBookingModal(null);
            setSuccessBanner(msg);
            // Refresh both tabs
            void loadBookings();
            if (windowChecked) {
              void loadResources(
                windowStart || undefined,
                windowEnd || undefined,
                selectedCategory || undefined
              );
            } else {
              void loadResources(undefined, undefined, selectedCategory || undefined);
            }
          }}
          onError={(msg) => setErrorBanner(msg)}
        />
      )}

      {/* Availability Timetable Modal */}
      {timetableModal && (
        <AvailabilityTimetable
          resourceId={timetableModal.resource.id}
          resourceName={timetableModal.resource.name}
          categoryName={timetableModal.resource.category.name}
          onSlotSelect={(startTime) => {
            setTimetableModal(null);
            setBookingModal({
              resource: timetableModal.resource,
              startTime,
              endTime: "", // Will be set by user in booking modal
            });
          }}
          onClose={() => setTimetableModal(null)}
        />
      )}

      <Footer />
    </div>
  );
}

// ---- Booking Card ----
function BookingCard({
  booking: b,
  cancellingId,
  onCancel,
}: {
  booking: ReservationRow;
  cancellingId: string | null;
  onCancel: (id: string) => Promise<void>;
}) {
  const canCancel = b.status === "PENDING" || b.status === "CONFIRMED";
  const isCancelling = cancellingId === b.id;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-gradient-to-r from-white to-[#F8FAFC] p-4 flex gap-4 items-start transition-all hover:shadow-md">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-[#1A1A1A] text-sm">{b.resource.name}</span>
          <span className="rounded-full bg-gradient-to-r from-cyan-100 to-teal-100 px-2 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
            {b.resource.category.name}
          </span>
          <StatusBadge status={b.status} />
        </div>
        <p className="text-xs text-[#6B7280] mb-1.5">
          {b.resource.location && (
            <span className="mr-3">📍 {b.resource.location}</span>
          )}
          {fmt(b.startTime)} → {fmt(b.endTime)}
        </p>
        {b.purpose && (
          <p className="text-xs text-[#6B7280] truncate">Purpose: {b.purpose}</p>
        )}
      </div>
      {canCancel && (
        <button
          onClick={() => void onCancel(b.id)}
          disabled={isCancelling}
          className="shrink-0 rounded-md bg-gradient-to-r from-rose-100 to-pink-100 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:from-rose-200 hover:to-pink-200 disabled:opacity-50 transition-all"
        >
          {isCancelling ? "Cancelling…" : "Cancel"}
        </button>
      )}
    </div>
  );
}

// ---- Booking Modal ----
function BookingModal({
  resource,
  initialStart,
  onClose,
  onSuccess,
  onError,
}: {
  resource: ResourceCard;
  initialStart: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [purpose, setPurpose] = useState("");
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Generate end-time options (1-8 hours after start time)
  const generateEndTimeOptions = () => {
    const options = [];
    const start = new Date(startTime);

    for (let hours = 1; hours <= 8; hours++) {
      const end = new Date(start);
      end.setHours(start.getHours() + hours);

      // Format for datetime-local input
      const formatForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
      };

      options.push({
        value: formatForInput(end),
        label: `${hours} hour${hours > 1 ? 's' : ''}`,
        isoString: end.toISOString(),
      });
    }
    return options;
  };

  const endTimeOptions = generateEndTimeOptions();

  // Auto-select first end time option when start time changes
  useEffect(() => {
    if (startTime && !endTime && endTimeOptions.length > 0) {
      setEndTime(endTimeOptions[0].value);
    }
  }, [startTime]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    // Client-side sanity checks
    const s = new Date(startTime);
    const en = new Date(endTime);
    if (en <= s) {
      setErr("End time must be after start time.");
      return;
    }
    if (s.getTime() - Date.now() < 60 * 1000) {
      setErr("Start time must be at least 1 minute in the future.");
      return;
    }
    if (!purpose.trim()) {
      setErr("Please describe the purpose of your reservation.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          purpose: purpose.trim(),
          startTime: s.toISOString(),
          endTime: en.toISOString(),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErr(
            d.error ??
              "This resource is already booked for the selected time. Please choose another time or resource."
          );
        } else {
          setErr(d.error ?? "Failed to submit booking. Please try again.");
        }
        return;
      }
      const confirmed = d.reservation?.status === "CONFIRMED";
      onSuccess(
        d.message ??
          (confirmed
            ? "Reservation confirmed. The resource is booked for your selected time."
            : "Reservation submitted and is pending admin approval.")
      );
    } catch {
      onError("Network error. Please check your connection and try again.");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-[#1A1A1A]">Book Resource</h3>
            <p className="text-sm text-[#6B7280] font-medium">{resource.name}</p>
            <p className="text-xs text-[#9CA3AF]">{resource.category.name}{resource.location ? ` · ${resource.location}` : ""}</p>
            <p className="mt-1 text-xs font-medium text-[#6B7280]">
              {resource.requiresApproval !== false
                ? "This booking will be sent for admin approval."
                : "If the slot is available, this booking will be confirmed immediately."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#9CA3AF] hover:text-[#6B7280] disabled:opacity-50 transition-colors"
          >
            ✕
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 8.25h.008v.008H12v-.008z" />
            </svg>
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                Start <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="datetime-local"
                value={startTime}
                disabled
                className="w-full rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-2 text-sm text-[#9CA3AF] outline-none disabled:opacity-75 transition-colors"
              />
              <p className="mt-1 text-xs text-[#9CA3AF]">Start time is pre-selected from timetable</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                End <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={endTime}
                disabled={loading}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] disabled:opacity-75 transition-colors"
              >
                {endTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">
              Purpose <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              value={purpose}
              disabled={loading}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Team meeting, training session, workshop"
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] disabled:opacity-75 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-md border border-[#E5E7EB] py-2.5 text-sm font-medium text-[#1A1A1A] hover:bg-[#F3F4F6] disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-[#0052CC] py-2.5 text-sm font-medium text-white hover:bg-[#0047B3] disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                resource.requiresApproval !== false ? "Submit for Approval" : "Confirm Booking"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

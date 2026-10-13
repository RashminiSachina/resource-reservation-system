"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import NotificationBell from "@/components/NotificationBell";

type Tab = "overview" | "users" | "resources" | "categories" | "reservations";
type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

interface Stats {
  totalUsers: number;
  totalResources: number;
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
}

interface RecentActivity {
  id: string;
  purpose: string;
  status: ReservationStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  resource: { id: string; name: string; location: string | null };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  _count: { reservations: number };
}

interface AdminResource {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
  requiresApproval: boolean;
  createdAt: string;
  category: { id: string; name: string };
  _count: { reservations: number };
}

interface AdminReservation {
  id: string;
  purpose: string;
  requesterName: string;
  requesterEmail: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
  user: { id: string; name: string; email: string };
  resource: { id: string; name: string; location: string | null };
}

interface CategoryOption {
  id: string;
  name: string;
}

interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { resources: number };
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; name: string; email: string } | null>(null);

  // Overview state
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionId, setUserActionId] = useState<string | null>(null);

  // Resources state
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCatFilter, setResourceCatFilter] = useState("");
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<AdminResource | null>(null);

  // Categories state
  const [adminCategories, setAdminCategories] = useState<AdminCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Reservations state
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationStatusFilter, setReservationStatusFilter] = useState("");
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationActionId, setReservationActionId] = useState<string | null>(null);

  // Common error & success alerts
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  // Load current admin info on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/login?callbackUrl=/admin");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.user) {
          if (d.user.role !== "ADMIN") {
            router.push("/dashboard");
            return;
          }
          setCurrentAdmin(d.user);
        }
      })
      .catch(() => {
        router.push("/login?callbackUrl=/admin");
      });
  }, [router]);

  // Fetch overview
  async function loadOverview(showSpinner = true) {
    if (showSpinner) setOverviewLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login?callbackUrl=/admin");
          return;
        }
        throw new Error("Failed to load admin stats.");
      }
      const data = await res.json();
      setStats(data.stats);
      setRecentActivity(data.recentActivity ?? []);
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : "Error loading overview.");
    } finally {
      setOverviewLoading(false);
    }
  }

  // Fetch users
  async function loadUsers(showSpinner = true) {
    if (showSpinner) setUsersLoading(true);
    setErrorBanner(null);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      if (userRoleFilter) params.set("role", userRoleFilter);
      if (userStatusFilter) params.set("status", userStatusFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load users.");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : "Error loading users.");
    } finally {
      setUsersLoading(false);
    }
  }

  // Fetch resources
  async function loadResources(showSpinner = true) {
    if (showSpinner) setResourcesLoading(true);
    setErrorBanner(null);
    try {
      const params = new URLSearchParams();
      if (resourceSearch) params.set("search", resourceSearch);
      if (resourceCatFilter) params.set("categoryId", resourceCatFilter);
      const res = await fetch(`/api/admin/resources?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load resources.");
      const data = await res.json();
      setResources(data.resources ?? []);
      setCategories(data.categories ?? []);
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : "Error loading resources.");
    } finally {
      setResourcesLoading(false);
    }
  }

  // Fetch reservations
  async function loadReservations(showSpinner = true) {
    if (showSpinner) setReservationsLoading(true);
    setErrorBanner(null);
    try {
      const params = new URLSearchParams();
      if (reservationSearch) params.set("search", reservationSearch);
      if (reservationStatusFilter) params.set("status", reservationStatusFilter);
      const res = await fetch(`/api/admin/reservations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load reservations.");
      const data = await res.json();
      setReservations(data.reservations ?? []);
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : "Error loading reservations.");
    } finally {
      setReservationsLoading(false);
    }
  }

  // Fetch categories
  async function loadAdminCategories(showSpinner = true) {
    if (showSpinner) setCategoriesLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login?callbackUrl=/admin");
          return;
        }
        throw new Error("Failed to load categories.");
      }
      const data = await res.json();
      const list: AdminCategory[] = data.categories ?? [];
      setAdminCategories(list);
      // Synchronize category options used in ResourceModal & filter dropdowns
      setCategories(list.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : "Error loading categories.");
    } finally {
      setCategoriesLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeTab === "overview") void loadOverview(false);
    else if (activeTab === "users") void loadUsers(false);
    else if (activeTab === "resources") void loadResources(false);
    else if (activeTab === "categories") void loadAdminCategories(false);
    else if (activeTab === "reservations") void loadReservations(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // User toggle active/deactivate
  async function toggleUserStatus(u: AdminUser) {
    if (u.id === currentAdmin?.id && u.isActive) {
      alert("Administrators cannot deactivate their own account.");
      return;
    }
    const confirmMsg = u.isActive
      ? `Are you sure you want to deactivate ${u.name}'s account? They will no longer be able to log in.`
      : `Reactivate account for ${u.name}?`;
    if (!confirm(confirmMsg)) return;

    setUserActionId(u.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, isActive: !u.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to update user status.");
        return;
      }
      void loadUsers();
    } finally {
      setUserActionId(null);
    }
  }

  // Resource toggle active
  async function toggleResourceActive(r: AdminResource) {
    try {
      const res = await fetch("/api/admin/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: r.id, isActive: !r.isActive }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed to update resource.");
        return;
      }
      void loadResources();
    } catch {
      alert("Error updating resource.");
    }
  }

  // Reservation update status
  async function handleReservationStatusUpdate(id: string, newStatus: ReservationStatus) {
    setReservationActionId(id);
    try {
      const res = await fetch("/api/admin/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to update reservation status.");
        return;
      }
      setSuccessBanner(
        data.message ??
          (newStatus === "CONFIRMED"
            ? "Reservation approved."
            : newStatus === "CANCELLED"
            ? "Reservation updated."
            : "Reservation updated.")
      );
      void loadReservations();
      if (activeTab === "overview") void loadOverview();
    } finally {
      setReservationActionId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">R</span>
              ReserveIt
            </Link>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              Admin Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition"
            >
              User Dashboard
            </Link>
            {currentAdmin && <NotificationBell userId={currentAdmin.id} />}
            <span className="text-sm text-slate-700 font-medium hidden sm:inline">{currentAdmin?.name}</span>
            <button
              onClick={() => void handleLogout()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorBanner}
          </div>
        )}

        {/* Success Banner */}
        {successBanner && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Title & Tabs Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage system users, resources, categories, and reservation statuses.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-slate-200/80 p-1 text-sm font-medium">
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "users", label: "Users" },
                { id: "resources", label: "Resources" },
                { id: "categories", label: "Categories" },
                { id: "reservations", label: "Reservations" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-4 py-1.5 transition ${
                  activeTab === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {overviewLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
            ) : stats ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "Total Users", val: stats.totalUsers, bg: "bg-blue-50", text: "text-blue-700" },
                    { label: "Active Resources", val: stats.totalResources, bg: "bg-indigo-50", text: "text-indigo-700" },
                    { label: "Total Bookings", val: stats.totalReservations, bg: "bg-slate-100", text: "text-slate-800" },
                    { label: "Pending", val: stats.pendingReservations, bg: "bg-amber-50", text: "text-amber-700" },
                    { label: "Approved", val: stats.confirmedReservations, bg: "bg-emerald-50", text: "text-emerald-700" },
                    { label: "Cancelled", val: stats.cancelledReservations, bg: "bg-red-50", text: "text-red-700" },
                  ].map((c) => (
                    <div key={c.label} className={`rounded-2xl border border-slate-200 ${c.bg} p-5`}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
                      <p className={`mt-2 text-3xl font-extrabold ${c.text}`}>{c.val}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Activity Table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Recent Reservation Activity</h2>
                    <button
                      onClick={() => setActiveTab("reservations")}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View all reservations →
                    </button>
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">No reservations recorded yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Resource</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentActivity.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3.5 font-medium text-slate-900">
                                {r.resource.name}
                                {r.resource.location && <span className="ml-1 text-xs text-slate-400">({r.resource.location})</span>}
                              </td>
                              <td className="px-6 py-3.5 text-slate-600">
                                {r.user.name} <span className="text-xs text-slate-400">&lt;{r.user.email}&gt;</span>
                              </td>
                              <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                                {new Date(r.startTime).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Search name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadUsers()}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option value="">All Roles</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
              <button
                onClick={() => void loadUsers()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Filter
              </button>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {usersLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No users found matching criteria.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Account Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reservations</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => {
                        const isSelf = u.id === currentAdmin?.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3.5">
                              <p className="font-semibold text-slate-900">{u.name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                u.role === "ADMIN" ? "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20" : "bg-slate-100 text-slate-700"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              }`}>
                                {u.isActive ? "Active" : "Deactivated"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600 font-medium">
                              {u._count.reservations}
                            </td>
                            <td className="px-6 py-3.5 text-slate-400 text-xs">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              {isSelf ? (
                                <span className="text-xs text-slate-400 italic">Current User</span>
                              ) : (
                                <button
                                  onClick={() => void toggleUserStatus(u)}
                                  disabled={userActionId === u.id}
                                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                                    u.isActive
                                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  } disabled:opacity-50`}
                                >
                                  {userActionId === u.id
                                    ? "Updating…"
                                    : u.isActive
                                    ? "Deactivate"
                                    : "Reactivate"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RESOURCES */}
        {activeTab === "resources" && (
          <div className="space-y-4">
            {/* Resource Toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Search resources…"
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadResources()}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={resourceCatFilter}
                onChange={(e) => setResourceCatFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => void loadResources()}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Filter
              </button>
              <button
                onClick={() => {
                  setEditingResource(null);
                  setResourceModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Resource
              </button>
            </div>

            {/* Resources Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {resourcesLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : resources.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No resources found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Resource</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location & Capacity</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Approval</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Bookings</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resources.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3.5">
                            <p className="font-semibold text-slate-900">{r.name}</p>
                            {r.description && <p className="max-w-xs truncate text-xs text-slate-500">{r.description}</p>}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              {r.category.name}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-600 text-xs">
                            {r.location ?? "—"} {r.capacity ? `· Capacity: ${r.capacity}` : ""}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>
                              {r.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r.requiresApproval !== false
                                ? "bg-amber-50 text-amber-800"
                                : "bg-sky-50 text-sky-800"
                            }`}>
                              {r.requiresApproval !== false ? "Admin approval" : "Instant confirm"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-600 font-medium">
                            {r._count.reservations}
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingResource(r);
                                setResourceModalOpen(true);
                              }}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void toggleResourceActive(r)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                r.isActive
                                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {r.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resource Categories</h2>
                <p className="text-xs text-slate-500">
                  Manage categorization for bookable rooms, equipment, and facilities.
                </p>
              </div>
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Category
              </button>
            </div>

            {/* Table or Loading */}
            {categoriesLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
            ) : adminCategories.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-slate-700">No categories found</p>
                <p className="mt-1 text-xs text-slate-500">Create your first category to start organizing resources.</p>
                <button
                  onClick={() => setCategoryModalOpen(true)}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  + Create Category
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Category Name", "Description", "Associated Resources", "Created Date"].map((h) => (
                          <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminCategories.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-semibold text-slate-900">{c.name}</span>
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-slate-600">
                            {c.description ? c.description : <span className="text-slate-400 italic">No description</span>}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                              {c._count.resources} {c._count.resources === 1 ? "resource" : "resources"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                            {new Date(c.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RESERVATIONS */}
        {activeTab === "reservations" && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Search requester or purpose…"
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadReservations()}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={reservationStatusFilter}
                onChange={(e) => setReservationStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED (Approved)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button
                onClick={() => void loadReservations()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Filter
              </button>
            </div>

            {/* Reservations Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {reservationsLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No reservations found matching filter.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Resource</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Requester</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Purpose</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Manage Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3.5 font-medium text-slate-900">
                            {r.resource.name}
                            {r.resource.location && <span className="ml-1 text-xs text-slate-400">· {r.resource.location}</span>}
                          </td>
                          <td className="px-6 py-3.5">
                            <p className="font-semibold text-slate-900">{r.requesterName}</p>
                            <p className="text-xs text-slate-500">{r.requesterEmail}</p>
                          </td>
                          <td className="px-6 py-3.5 max-w-xs truncate text-slate-600">
                            {r.purpose}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500">
                            <p>{new Date(r.startTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            <p className="text-slate-400">to {new Date(r.endTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => void handleReservationStatusUpdate(r.id, "CONFIRMED")}
                                  disabled={reservationActionId === r.id}
                                  className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => void handleReservationStatusUpdate(r.id, "CANCELLED")}
                                  disabled={reservationActionId === r.id}
                                  className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {r.status === "CONFIRMED" && (
                              <button
                                onClick={() => void handleReservationStatusUpdate(r.id, "CANCELLED")}
                                disabled={reservationActionId === r.id}
                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition"
                              >
                                Cancel
                              </button>
                            )}
                            {r.status === "CANCELLED" && (
                              <button
                                onClick={() => void handleReservationStatusUpdate(r.id, "CONFIRMED")}
                                disabled={reservationActionId === r.id}
                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition"
                              >
                                Re-approve
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
        )}
      </div>

      {/* Resource Create/Edit Modal */}
      {resourceModalOpen && (
        <ResourceModal
          categories={categories}
          resource={editingResource}
          onClose={() => {
            setResourceModalOpen(false);
            setEditingResource(null);
          }}
          onSuccess={(msg) => {
            setResourceModalOpen(false);
            setEditingResource(null);
            setSuccessBanner(msg);
            void loadResources();
          }}
        />
      )}

      {/* Category Create Modal */}
      {categoryModalOpen && (
        <CategoryModal
          onClose={() => setCategoryModalOpen(false)}
          onSuccess={(msg) => {
            setCategoryModalOpen(false);
            setSuccessBanner(msg);
            void loadAdminCategories(false);
            void loadResources(false);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

// ---- Resource Create / Edit Modal ----
function ResourceModal({
  categories,
  resource,
  onClose,
  onSuccess,
}: {
  categories: CategoryOption[];
  resource: AdminResource | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [name, setName] = useState(resource?.name ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [location, setLocation] = useState(resource?.location ?? "");
  const [capacity, setCapacity] = useState(resource?.capacity ? String(resource.capacity) : "");
  const [categoryId, setCategoryId] = useState(
    resource?.category.id ?? (categories[0]?.id ?? "")
  );
  const [requiresApproval, setRequiresApproval] = useState(
    resource?.requiresApproval !== false
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    // Client-side validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErr("Resource name is required.");
      return;
    }
    if (trimmedName.length > 100) {
      setErr("Resource name cannot exceed 100 characters.");
      return;
    }

    const trimmedCategoryId = categoryId.trim();
    if (!trimmedCategoryId) {
      setErr("Please select a resource category.");
      return;
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      setErr("Location is required.");
      return;
    }
    if (trimmedLocation.length > 150) {
      setErr("Location cannot exceed 150 characters.");
      return;
    }

    const parsedCapacity = parseInt(capacity.trim(), 10);
    if (!capacity.trim() || isNaN(parsedCapacity) || parsedCapacity <= 0) {
      setErr("Capacity is required and must be a positive integer.");
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 1000) {
      setErr("Description cannot exceed 1000 characters.");
      return;
    }

    setLoading(true);

    const payload = {
      name: trimmedName,
      description: trimmedDescription || undefined,
      location: trimmedLocation,
      capacity: parsedCapacity,
      categoryId: trimmedCategoryId,
      requiresApproval,
    };

    try {
      const url = "/api/admin/resources";
      const method = resource ? "PATCH" : "POST";
      const body = resource ? { ...payload, resourceId: resource.id } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed to save resource.");
        return;
      }
      onSuccess(
        d.message ??
          (resource ? "Resource updated successfully." : "Resource created successfully.")
      );
    } catch {
      setErr("Network error saving resource. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {resource ? "Edit Resource" : "Create New Resource"}
            </h3>
            <p className="text-xs text-slate-500">
              {resource
                ? "Update the details and availability of this resource."
                : "Add a new bookable resource to the ReserveIt catalog."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 8.25h.008v.008H12v-.008z" />
            </svg>
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Conference Room A, Projector 1, Science Lab"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={categoryId}
              disabled={loading}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No categories available in database. Please ensure categories exist first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={location}
                disabled={loading}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Building 2, Floor 3"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Capacity (seats) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min={1}
                step={1}
                value={capacity}
                disabled={loading}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              disabled={loading}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about equipment, AV support, guidelines, or amenities…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApproval}
                disabled={loading}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Bookings require admin approval
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  When unchecked, available slots are confirmed immediately. When checked, new
                  bookings stay pending until an admin approves them.
                </span>
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {resource ? "Updating…" : "Creating…"}
                </span>
              ) : resource ? (
                "Update Resource"
              ) : (
                "Create Resource"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Category Create Modal ----
function CategoryModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErr("Category name is required.");
      return;
    }
    if (trimmedName.length > 100) {
      setErr("Category name cannot exceed 100 characters.");
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 500) {
      setErr("Description cannot exceed 500 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDesc || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed to create category.");
        return;
      }
      onSuccess(d.message ?? "Category created successfully.");
    } catch {
      setErr("Network error creating category. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Create New Category</h3>
            <p className="text-xs text-slate-500">
              Add a new classification category for catalog resources.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 8.25h.008v.008H12v-.008z" />
            </svg>
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Laboratories, Equipment, Study Pods"
              maxLength={100}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              disabled={loading}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what belongs in this category…"
              maxLength={500}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-75"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating…
                </span>
              ) : (
                "Create Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

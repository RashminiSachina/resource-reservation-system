"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Unauthenticated or network error — remain in guest view
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">
            R
          </span>
          ReserveIt
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Home
          </Link>

          {user ? (
            <>
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20 hover:bg-purple-100 transition-colors"
                >
                  Admin Console
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Dashboard
              </Link>
              <NotificationBell userId={user.id} />
              <span className="text-xs text-slate-500">
                Hi, <strong className="text-slate-800">{user.name}</strong>
              </span>
              <button
                onClick={() => void handleLogout()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          id="navbar-menu-button"
          className="flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>

            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="rounded-md px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Console
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void handleLogout();
                  }}
                  className="mt-1 block text-left rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Log out ({user.name})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="mt-1 block rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

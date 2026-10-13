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
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A] hover:text-[#0052CC] transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0052CC] text-white text-sm font-bold">
            R
          </span>
          ReserveIt
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
          >
            Home
          </Link>

          {user ? (
            <>
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="px-3 py-2 text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="px-3 py-2 text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
              >
                Profile
              </Link>
              <NotificationBell userId={user.id} />
              <div className="h-6 w-px bg-[#E5E7EB] mx-2" />
              <span className="text-sm text-[#6B7280]">
                {user.name}
              </span>
              <button
                onClick={() => void handleLogout()}
                className="px-3 py-2 text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-[#374151] hover:text-[#0052CC] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="ml-2 px-4 py-2 text-sm font-medium text-white bg-[#0052CC] hover:bg-[#0047B3] transition-colors rounded-md"
              >
                Get started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          id="navbar-menu-button"
          className="flex items-center justify-center rounded-md p-2 text-[#374151] hover:bg-[#F3F4F6] md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[#E5E7EB] bg-white px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <Link
              href="/"
              className="px-3 py-3 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#0052CC] transition-colors rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>

            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="px-3 py-3 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#0052CC] transition-colors rounded-md"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="px-3 py-3 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#0052CC] transition-colors rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="px-3 py-3 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#0052CC] transition-colors rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <div className="flex items-center gap-2 px-3 py-3">
                  <NotificationBell userId={user.id} />
                  <span className="text-sm text-[#6B7280]">{user.name}</span>
                </div>
                <div className="h-px bg-[#E5E7EB] my-2" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void handleLogout();
                  }}
                  className="px-3 py-3 text-left text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#0052CC] transition-colors rounded-md"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-3 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#0052CC] transition-colors rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="mt-2 px-3 py-3 text-center text-sm font-medium text-white bg-[#0052CC] hover:bg-[#0047B3] transition-colors rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

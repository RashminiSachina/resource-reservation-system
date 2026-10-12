"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

interface SuccessData {
  name: string;
  email: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!password) {
    errors.password = "Password is required.";
  }
  return errors;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data: { user?: SuccessData; error?: string; redirectUrl?: string } = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error ?? "Login failed. Please try again." });
      } else if (data.user) {
        setSuccess(data.user);
        const searchParams = new URLSearchParams(window.location.search);
        const callbackUrl = searchParams.get("callbackUrl");
        const destination = callbackUrl || data.redirectUrl || "/dashboard";
        setTimeout(() => {
          window.location.href = destination;
        }, 500);
      }
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
            <div className="mb-8 text-center">
              <Link href="/" className="inline-block" aria-label="ReserveIt Home">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white text-lg font-bold shadow hover:bg-indigo-700 transition">
                  R
                </div>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
                  Register
                </Link>
              </p>
            </div>

            {success ? (
              <div
                id="login-success"
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"
              >
                <svg
                  className="mx-auto mb-3 h-10 w-10 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h2 className="text-base font-semibold text-emerald-800">
                  Login successful
                </h2>
                <p className="mt-1 text-sm text-emerald-700">
                  Welcome back, <strong>{success.name}</strong>!
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Redirecting to your dashboard…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate id="login-form" className="space-y-5">
                {/* Form-level error */}
                {errors.form && (
                  <div
                    id="login-form-error"
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {errors.form}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    aria-describedby={errors.email ? "login-email-error" : undefined}
                    aria-invalid={!!errors.email}
                    className={`block w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.email ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
                    }`}
                    placeholder="jane@example.com"
                    disabled={loading}
                  />
                  {errors.email && (
                    <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={handlePasswordChange}
                      aria-describedby={errors.password ? "login-password-error" : undefined}
                      aria-invalid={!!errors.password}
                      className={`block w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.password ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                      placeholder="Your password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      id="login-toggle-password"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-700">
              ← Back to homepage
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

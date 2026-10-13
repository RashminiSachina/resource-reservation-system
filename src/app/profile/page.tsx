"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProfileErrors {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile update form state
  const [name, setName] = useState("");
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<ProfileErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setUser(data.user);
      setName(data.user.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileUpdate(e: FormEvent) {
    e.preventDefault();
    const errors: ProfileErrors = {};
    if (!name.trim()) {
      errors.name = "Name is required.";
    } else if (name.trim().length > 100) {
      errors.name = "Name cannot exceed 100 characters.";
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setProfileLoading(true);
    setProfileSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErrors({ form: data.error ?? "Failed to update profile" });
      } else {
        setProfileSuccess(true);
        setUser(data.user);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch {
      setProfileErrors({ form: "Network error. Please try again." });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    const errors: ProfileErrors = {};
    if (!currentPassword) {
      errors.currentPassword = "Current password is required.";
    }
    if (!newPassword || newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (currentPassword === newPassword) {
      errors.newPassword = "New password must be different from current password.";
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});
    setPasswordLoading(true);
    setPasswordSuccess(false);

    try {
      const res = await fetch("/api/user/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordErrors({ form: data.error ?? "Failed to change password" });
      } else {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch {
      setPasswordErrors({ form: "Network error. Please try again." });
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0052CC] border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800">{error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Navbar />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#1A1A1A]">Profile</h1>
            <p className="mt-2 text-sm text-[#6B7280]">Manage your account information and security settings.</p>
          </div>

          <div className="space-y-6">
            {/* Profile Information Section */}
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
              <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">Profile Information</h2>
              
              {profileSuccess && (
                <div className="mb-4 rounded-md border border-[#84CC16]/30 bg-[#84CC16]/10 px-4 py-3 text-sm text-[#6DB30F]">
                  Profile updated successfully.
                </div>
              )}

              {profileErrors.form && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {profileErrors.form}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setProfileErrors((prev) => ({ ...prev, name: undefined, form: undefined }));
                      }}
                      className={`block w-full rounded-md border px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] ${
                        profileErrors.name ? "border-rose-400 bg-rose-50" : "border-[#E5E7EB] bg-white"
                      }`}
                      disabled={profileLoading}
                    />
                    {profileErrors.name && (
                      <p className="mt-1.5 text-xs text-rose-600">{profileErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="block w-full rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2.5 text-sm text-[#9CA3AF]"
                    />
                    <p className="mt-1.5 text-xs text-[#9CA3AF]">Email cannot be changed</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">Role</label>
                    <input
                      type="text"
                      value={user.role}
                      disabled
                      className="block w-full rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2.5 text-sm text-[#9CA3AF] capitalize"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">Account Created</label>
                    <input
                      type="text"
                      value={formatDate(user.createdAt)}
                      disabled
                      className="block w-full rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2.5 text-sm text-[#9CA3AF]"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="rounded-md bg-[#0052CC] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#0047B3] focus:outline-none focus:ring-1 focus:ring-[#0052CC] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  >
                    {profileLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Section - Only for password-based users */}
            {user.hasPassword && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">Change Password</h2>
                
                {passwordSuccess && (
                  <div className="mb-4 rounded-md border border-[#84CC16]/30 bg-[#84CC16]/10 px-4 py-3 text-sm text-[#6DB30F]">
                    Password changed successfully.
                  </div>
                )}

                {passwordErrors.form && (
                  <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {passwordErrors.form}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined, form: undefined }));
                        }}
                        className={`block w-full rounded-md border px-4 py-2.5 pr-11 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] ${
                          passwordErrors.currentPassword ? "border-rose-400 bg-rose-50" : "border-[#E5E7EB] bg-white"
                        }`}
                        disabled={passwordLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors"
                      >
                        {showCurrent ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1.5 text-xs text-rose-600">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordErrors((prev) => ({ ...prev, newPassword: undefined, form: undefined }));
                        }}
                        className={`block w-full rounded-md border px-4 py-2.5 pr-11 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] ${
                          passwordErrors.newPassword ? "border-rose-400 bg-rose-50" : "border-[#E5E7EB] bg-white"
                        }`}
                        placeholder="Min. 8 characters"
                        disabled={passwordLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors"
                      >
                        {showNew ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1.5 text-xs text-rose-600">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#6B7280]">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined, form: undefined }));
                        }}
                        className={`block w-full rounded-md border px-4 py-2.5 pr-11 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] ${
                          passwordErrors.confirmPassword ? "border-rose-400 bg-rose-50" : "border-[#E5E7EB] bg-white"
                        }`}
                        placeholder="Re-enter your new password"
                        disabled={passwordLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors"
                      >
                        {showConfirm ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1.5 text-xs text-rose-600">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="rounded-md bg-[#0052CC] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#0047B3] focus:outline-none focus:ring-1 focus:ring-[#0052CC] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      {passwordLoading ? "Changing Password..." : "Change Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!user.hasPassword && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">Change Password</h2>
                <p className="text-sm text-[#6B7280]">
                  Your account uses OAuth authentication (e.g., Google). Password-based authentication is not enabled for your account.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

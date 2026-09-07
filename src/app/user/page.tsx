"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import { getLocalHistory, getAppSettings, updateAppSettings } from "@/lib/storage/localHistory";
import { AppSettings, LocalHistoryRecord, GpuCapabilities } from "@/lib/types";
import { detectGpuCapabilities } from "@/lib/ffmpeg/detector";
import {
  User,
  Mail,
  Shield,
  Zap,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Sliders,
  History,
  ArrowRight,
  ExternalLink,
  Edit2,
  Save,
  X,
  Loader2,
  Crown,
  Laptop,
  ChevronDown,
} from "lucide-react";

export default function UserProfilePage() {
  const { user, loading, isPro, isAdmin, logout, sendPasswordReset, resendVerificationEmail } = useAuth();
  const router = useRouter();

  // Settings & Local Stats
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());
  const [historyRecords, setHistoryRecords] = useState<LocalHistoryRecord[]>([]);
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);

  // UI States
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResendingVerify, setIsResendingVerify] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  useEffect(() => {
    setHistoryRecords(getLocalHistory(user?.uid));
    setAppSettings(getAppSettings());
    detectGpuCapabilities().then(setGpuCaps).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (user?.displayName) {
      setNewDisplayName(user.displayName);
    }
  }, [user]);

  // Handle display name edit
  const handleSaveDisplayName = () => {
    if (!newDisplayName.trim() || !user) return;
    try {
      const raw = localStorage.getItem("vimora_session");
      if (raw) {
        const session = JSON.parse(raw);
        session.profile.displayName = newDisplayName.trim();
        localStorage.setItem("vimora_session", JSON.stringify(session));
        window.location.reload();
      }
    } catch {}
    setIsEditingName(false);
  };

  // Password reset request
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    setActionMessage(null);
    try {
      await sendPasswordReset(user.email);
      setActionMessage({
        type: 'success',
        text: `Password reset instructions have been sent to ${user.email}.`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to send password reset email.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  // Resend email verification
  const handleResendVerification = async () => {
    setIsResendingVerify(true);
    setActionMessage(null);
    try {
      await resendVerificationEmail();
      setActionMessage({
        type: 'success',
        text: 'Verification link sent! Check your email inbox.',
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to send verification email.',
      });
    } finally {
      setIsResendingVerify(false);
    }
  };

  // Settings toggle
  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const updated = updateAppSettings({ [key]: value });
    setAppSettings(updated);
  };

  // Confirmed logout
  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.push("/login");
  };

  // Calculate local user stats
  const totalConversions = historyRecords.length;
  const totalBytesSaved = historyRecords.reduce((acc, curr) => acc + (curr.bytesSaved || 0), 0);
  const formatSaved = (bytes: number) => {
    if (bytes <= 0) return "0 MB";
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0B6FFB] animate-spin" />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col items-center justify-center p-6">
        <main className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0B6FFB] flex items-center justify-center mb-4 border border-blue-200">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Required</h1>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Please log in or create an account to view your user profile, subscription plan, and workspace preferences.
          </p>
          <div className="flex gap-3 w-full">
            <Link
              href="/login?redirect=/user"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B6FFB] hover:bg-blue-600 text-white text-sm font-bold text-center transition-all shadow-xs"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-bold text-center transition-all"
            >
              Create Account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Recent";

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Breadcrumb & Quick Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <User className="w-6 h-6 text-[#0B6FFB]" />
              User Profile & Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal account, subscription plan, and conversion preferences.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/converter"
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>Converter</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Global Toast / Feedback Alert */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* User Identity & Subscription Plan Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left Side: Avatar & User Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
            {/* User Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#0B6FFB] to-blue-400 text-white flex items-center justify-center font-black text-2xl uppercase shadow-md shadow-[#0B6FFB]/20">
                {user.displayName?.substring(0, 2) || user.email.substring(0, 2)}
              </div>
              <div
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white"
                title="Account active"
              />
            </div>

            {/* Name & Basic Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="px-2.5 py-1 text-sm font-bold border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0B6FFB]"
                      placeholder="Display Name"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveDisplayName}
                      className="p-1.5 rounded-lg bg-[#0B6FFB] text-white hover:bg-blue-600 cursor-pointer"
                      title="Save name"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 truncate">
                      {user.displayName || "User"}
                    </h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title="Edit display name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Role Badge */}
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200 shrink-0">
                    Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Member
                  </span>
                )}
              </div>

              {/* Email with status */}
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </span>
                <span>•</span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Unverified
                    </span>
                    <button
                      type="button"
                      disabled={isResendingVerify}
                      onClick={handleResendVerification}
                      className="text-[10px] font-bold text-[#0B6FFB] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {isResendingVerify ? "Sending..." : "Resend Link"}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mt-1">
                Member since {joinDate} • UID: <span className="font-mono text-slate-500">{user.uid.substring(0, 10)}...</span>
              </p>
            </div>
          </div>

          {/* Right Side: Subscription Plan & Upgrade CTA */}
          <div className="flex flex-col items-start md:items-end justify-center gap-2 shrink-0 self-stretch md:self-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {isPro ? "Pro Plan" : "Free Plan"}
            </span>

            {!isPro ? (
              <Link
                href="/pricing"
                className="px-3.5 py-1.5 rounded-md bg-[#0B6FFB] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>Manage Plan</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}
          </div>
        </div>

        {/* Middle Section: Workspace & Conversion Preferences Dropdown */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0B6FFB] flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Workspace Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize default conversion rules and hardware acceleration behavior.
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                isWorkspaceOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isWorkspaceOpen && (
            <div className="p-6 pt-0 border-t border-slate-100 animate-in fade-in-0 duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Preference 1: GPU Acceleration */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Hardware Acceleration
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Use dedicated GPU (NVENC/QSV/AMF) for 5x faster video rendering.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                    <input
                      type="checkbox"
                      checked={appSettings.gpuAccelerationEnabled}
                      onChange={(e) => handleSettingChange("gpuAccelerationEnabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B6FFB]" />
                  </label>
                </div>

                {/* Preference 2: Auto Overwrite */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Auto-Overwrite Existing Files
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Replace files with identical names automatically in destination folder.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                    <input
                      type="checkbox"
                      checked={appSettings.autoOverwrite}
                      onChange={(e) => handleSettingChange("autoOverwrite", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B6FFB]" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security & Account Management Dropdown */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsSecurityOpen(!isSecurityOpen)}
            className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0B6FFB] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Security & Authentication
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                isSecurityOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isSecurityOpen && (
            <div className="p-6 pt-0 border-t border-slate-100 animate-in fade-in-0 duration-150">
              <div className="pt-4 flex items-center justify-between gap-3">
                {/* Reset Password Button in Blue Box */}
                <button
                  type="button"
                  disabled={isSendingReset}
                  onClick={handlePasswordReset}
                  className="px-5 py-2.5 rounded-xl bg-[#0B6FFB] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isSendingReset ? "Sending Reset Email..." : "Reset Password"}</span>
                </button>

                {/* Sign Out Button in Red Box */}
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Are you sure you want to log out?</h3>
              <p className="text-xs text-slate-500 mt-1">
                You will be signed out of your account on this device. Any unqueued files will remain safe in your local browser storage.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

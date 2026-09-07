"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import Navbar from "@/components/Navbar";
import { getLocalHistory, getAppSettings, updateAppSettings } from "@/lib/storage/localHistory";
import { AppSettings, LocalHistoryRecord, GpuCapabilities } from "@/lib/types";
import { detectGpuCapabilities } from "@/lib/ffmpeg/detector";
import {
  User,
  Mail,
  Shield,
  Sparkles,
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

  useEffect(() => {
    setHistoryRecords(getLocalHistory());
    setAppSettings(getAppSettings());
    detectGpuCapabilities().then(setGpuCaps).catch(() => {});
  }, []);

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
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0B6FFB] animate-spin" />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex flex-col">
      <Navbar />

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

        {/* Top Grid: Profile Card & Plan Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: User Identity (2 cols on large) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* User Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#0B6FFB] to-blue-400 text-white flex items-center justify-center font-black text-2xl uppercase shadow-md shadow-[#0B6FFB]/20">
                  {user.displayName?.substring(0, 2) || user.email.substring(0, 2)}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white"
                  title="Account active"
                />
              </div>

              {/* Name & Basic Info */}
              <div className="flex-1 min-w-0">
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
                        className="p-1.5 rounded-lg bg-[#0B6FFB] text-white hover:bg-blue-600"
                        title="Save name"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                        className="text-slate-400 hover:text-slate-600 p-1"
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
                        className="text-[10px] font-bold text-[#0B6FFB] hover:underline disabled:opacity-50"
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

            {/* Quick Conversion Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Conversions
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {totalConversions}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Disk Space Saved
                </span>
                <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                  {formatSaved(totalBytesSaved)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  GPU Acceleration
                </span>
                <span className="text-xs font-bold text-[#0B6FFB] mt-1.5 block truncate">
                  {gpuCaps?.hasGpu ? gpuCaps.type.toUpperCase() : "CPU Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Current Subscription & Upgrade */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#0B6FFB]" />
                  Subscription Plan
                </h3>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isPro
                      ? "bg-blue-50 text-[#0B6FFB] border border-blue-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {user.plan.toUpperCase()}
                </span>
              </div>

              {/* Plan Details Display */}
              <div className="mt-4">
                {isPro ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-[#0B6FFB]">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Vimora Pro Active</h4>
                        <p className="text-[11px] text-slate-500">Full unlocked workstation power</p>
                      </div>
                    </div>

                    <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6FFB]" />
                        <span>Unlimited 4K UHD resolution</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6FFB]" />
                        <span>GPU Hardware Acceleration (NVENC)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6FFB]" />
                        <span>No file size or batch queue limits</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Free Tier</h4>
                        <p className="text-[11px] text-slate-500">Standard CPU conversion</p>
                      </div>
                    </div>

                    <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Up to 1080p resolution</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Standard CPU encoding speed</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>4K & NVENC acceleration locked</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Action CTA */}
            <div>
              {!isPro ? (
                <Link
                  href="/pricing"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0B6FFB] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Upgrade to Pro (₦4,500/mo)</span>
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Manage Billing & Plans</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Workspace & Conversion Preferences */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0B6FFB]" />
              Workspace Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize default conversion rules and hardware acceleration behavior.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Security & Account Management Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0B6FFB]" />
              Security & Authentication
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your password, login security, and active session.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Password Management</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Send a secure password reset link to your registered email ({user.email}).
              </span>
            </div>
            <button
              type="button"
              disabled={isSendingReset}
              onClick={handlePasswordReset}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 transition-all shrink-0 shadow-2xs hover:border-[#0B6FFB] disabled:opacity-50"
            >
              {isSendingReset ? "Sending Reset Email..." : "Send Password Reset"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-50/50 border border-red-200/60">
            <div>
              <span className="text-xs font-bold text-red-900 block">Sign Out of Vimora</span>
              <span className="text-[11px] text-red-600/80 block mt-0.5">
                End your active workstation session on this device.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shrink-0 shadow-2xs cursor-pointer"
            >
              Log Out
            </button>
          </div>
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

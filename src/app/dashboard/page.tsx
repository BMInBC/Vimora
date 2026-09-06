"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import { Logo } from "@/components/Logo";
import {
  Video, HardDrive, ShieldCheck, CreditCard, Key,
  ExternalLink, LogOut, Download, CheckCircle, ArrowRight
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading, logout, isPro, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={32} priority />
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/converter" className="text-slate-900 font-semibold hover:text-black">Converter Workspace</Link>
              <Link href="/download" className="hover:text-slate-900">Desktop App</Link>
              {isAdmin && (
                <Link href="/admin" className="text-[#0B6FFB] font-bold hover:text-[#0958cc] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Admin Portal
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-tight">{user.displayName || user.email.split("@")[0]}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-white/10 text-[#0BB3FA] border border-white/10">
              {isPro ? "â˜… Pro Plan Active" : "Free Plan"}
            </div>
            <h1 className="text-3xl font-extrabold font-nunito">Welcome back, {user.displayName || "Creator"}!</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              All conversions run directly on your hardware via FFmpeg. Zero uploads, maximum privacy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/converter"
              className="inline-flex items-center gap-2 bg-[#0B6FFB] hover:bg-[#0958cc] text-white shadow-md shadow-[#0B6FFB]/20 font-bold px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Video className="w-5 h-5" />
              Open Converter
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3.5 rounded-xl transition-all border border-white/15"
            >
              <Download className="w-5 h-5" />
              Desktop App
            </Link>
          </div>
        </div>

        {/* Quick Stats & Subscription Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Subscription */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subscription</span>
                <CreditCard className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{isPro ? "Vimora Pro" : "Free Tier"}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {isPro
                  ? "Unlimited GPU conversions, 4K/8K presets & batch queues."
                  : "Up to 5 conversions/day, 720p output, CPU encoding."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              {isPro ? (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" /> Lifetime Pro Active
                </div>
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-[#0B6FFB] transition-colors"
                >
                  Upgrade via Paystack <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: Privacy Status */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Security</span>
                <HardDrive className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Local Processing</h3>
              <p className="text-sm text-slate-500 mt-1">
                Zero file uploads. Media stays on your hard drive, processed by your local FFmpeg installation.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-600 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Zero cloud footprint
            </div>
          </div>

          {/* Card 3: License Key */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Desktop License</span>
                <Key className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{isPro ? "VIM-PRO-78X2" : "Community Key"}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Use this key in the Tauri Windows application to unlock all native features.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                {isPro ? "VIM-PRO-78X2-ACTIVATED" : "VIM-COMMUNITY-FREE"}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Overview Checklist */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-4 font-nunito">Your Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-900 mb-1">Hardware Acceleration</p>
              <p className="text-slate-500 text-xs">NVIDIA NVENC, Intel QSV, AMD AMF detection & auto-routing.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-900 mb-1">Bulk Queue</p>
              <p className="text-slate-500 text-xs">Process multiple high-bitrate video clips consecutively or in batch.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-900 mb-1">Audio Transcoding</p>
              <p className="text-slate-500 text-xs">Extract WAV/MP3, re-encode FLAC, normalize broadcast LUFS audio.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-900 mb-1">Direct Folder Access</p>
              <p className="text-slate-500 text-xs">One-click reveal converted output files directly in Windows Explorer.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
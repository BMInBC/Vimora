"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import { Logo } from "@/components/Logo";
import {
  Video, ExternalLink, LogOut, Download, ArrowRight
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans text-slate-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {!loading && !user && (
              <Link href="/" className="flex items-center gap-2 group">
                <Logo size={32} priority />
              </Link>
            )}
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
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Welcome Banner with Plan & Upgrade Option */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold font-nunito">Welcome back, {user.displayName || "Creator"}!</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              All conversions run directly on your hardware via FFmpeg. Zero uploads, maximum privacy.
            </p>
          </div>

          {/* Right Side: Subscription Plan & Upgrade CTA */}
          <div className="flex flex-col items-start md:items-end justify-center gap-2 shrink-0 self-stretch md:self-auto border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
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
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-white/15"
              >
                <span>Manage Plan</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
              </Link>
            )}
          </div>
        </div>

        {/* Middle of the page: Open Converter and Desktop App options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/converter"
            className="group p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 hover:border-[#0B6FFB] shadow-xs hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B6FFB] group-hover:bg-[#0B6FFB] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                <Video className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 font-nunito group-hover:text-[#0B6FFB] transition-colors">
                  Open Converter
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Launch the web workstation to batch convert video and audio files privately.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#0B6FFB] group-hover:translate-x-1 transition-all shrink-0 ml-3" />
          </Link>

          <Link
            href="/download"
            className="group p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 hover:border-slate-400 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                <Download className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 font-nunito">
                  Desktop App
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Download the native offline desktop application for Windows hardware speed.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
          </Link>
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
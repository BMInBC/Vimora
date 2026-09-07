"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import { Logo } from "@/components/Logo";
import {
  Download, CheckCircle2, Shield, Cpu, Monitor,
  HardDrive, FileCode, ArrowLeft, Terminal, AlertTriangle
} from "lucide-react";

export default function DownloadPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {!loading && !user ? (
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={32} priority />
            </Link>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <Link
              href="/converter"
              className="bg-slate-950 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              Web Converter
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#0B6FFB]/10 text-[#0B6FFB] text-xs font-bold px-3.5 py-1.5 rounded-full mb-6">
            <Monitor className="w-3.5 h-3.5" /> Official Windows Desktop Release (Tauri 2)
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-nunito tracking-tight text-slate-950 mb-4">
            Download Vimora for Windows
          </h1>
          <p className="text-slate-600 text-base md:text-lg">
            Harness full local hardware power. Native FFmpeg integration with direct NVENC, AMF, and QSV GPU acceleration.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#download-options"
              className="inline-flex items-center gap-3 bg-slate-950 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95 text-base"
            >
              <Download className="w-5 h-5 text-[#0BB3FA]" />
              Download .msi Installer (64-bit)
            </a>
            <a
              href="#portable"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold px-6 py-4 rounded-2xl border border-slate-200 shadow-sm transition-all"
            >
              <HardDrive className="w-4 h-4" />
              Download Portable (.zip)
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-3">Version 1.0.0 &bull; Windows 10 / 11 (x64) &bull; SHA-256 Verified</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-900">
              <Cpu className="w-5 h-5 text-[#0B6FFB]" />
            </div>
            <h3 className="font-bold text-lg font-nunito mb-1">Direct Hardware Access</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Bypasses browser sandbox limits to saturate your NVIDIA, AMD, or Intel GPU encoder chips for peak FPS.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-900">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-bold text-lg font-nunito mb-1">Air-Gapped Privacy</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Convert sensitive commercial footage, proprietary client video, and personal audio with 100% offline security.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-900">
              <FileCode className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-bold text-lg font-nunito mb-1">Batch Explorer Drag & Drop</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Drag hundreds of gigabytes directly from Windows File Explorer without memory throttling or page limits.
            </p>
          </div>
        </div>

        {/* System Requirements & Verification */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold font-nunito">System Requirements & Prerequisites</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700">Minimum Requirements</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Windows 10 (Build 19041+) or Windows 11</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 4 GB RAM (8 GB+ recommended for 4K)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 200 MB free storage for application</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-700">GPU Acceleration Support</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <strong>NVIDIA</strong>: GTX 900 series or newer (NVENC)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <strong>AMD</strong>: Radeon RX 400 or newer (AMF)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <strong>Intel</strong>: Skylake 6th Gen Core or newer (QuickSync)</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200/60">
            <Terminal className="w-5 h-5 text-[#0B6FFB] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong>FFmpeg Engine:</strong> Vimora communicates directly with FFmpeg. On Windows systems where FFmpeg is installed in PATH, Vimora instantly auto-detects hardware acceleration profiles.
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Vimora Desktop. Built with Tauri 2 and Next.js.
      </footer>
    </div>
  );
}
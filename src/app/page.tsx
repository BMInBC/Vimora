"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import {
  Zap, ChevronRight, Shield, Cpu, Download, Film,
  Sliders, Lock, Globe, HardDrive, Check,
  ArrowRight, FileVideo, Layers, Play
} from "lucide-react";

const NAV_LINKS = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Architecture", href: "#architecture" },
  { label: "Pricing", href: "#pricing" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

const CAPABILITIES = [
  {
    title: "Hardware Transcoding Pipelines",
    tag: "NVIDIA / AMD / Intel",
    desc: "Direct integration with NVENC, AMF, and Intel QSV encoder chips. Offload transcoding from CPU cores for up to 18x throughput saturation.",
    specs: ["H.264 (AVC) & H.265 (HEVC)", "AV1 hardware encoding", "Zero CPU throttling"],
  },
  {
    title: "Zero-Knowledge Local Execution",
    tag: "100% On-Device",
    desc: "All processing happens strictly within your local OS environment. No telemetry, no remote servers, no file uploads, and full offline capability.",
    specs: ["Offline native binary", "Zero cloud upload footprint", "Memory-safe local buffers"],
  },
  {
    title: "High-Throughput Batch Engine",
    tag: "Massive Queues",
    desc: "Queue hundreds of files simultaneously. Automatically route video and audio streams into unified presets without sequential bottlenecking.",
    specs: ["1,000+ files per batch", "Preserve directory structures", "Configurable thread pools"],
  },
  {
    title: "Broadcast Loudness Normalization",
    tag: "EBU R128 / LUFS",
    desc: "Standardize podcast and video audio directly during transcoding. Apply two-pass loudness filters targeting platform broadcast criteria.",
    specs: ["Integrated LUFS targeting (-14 to -23)", "True Peak limiting", "WAV, FLAC, AAC, MP3"],
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Import Media Sources",
    desc: "Select single media files or entire folder trees. Vimora parses containers, tracks, audio bitrates, and video codecs instantly.",
  },
  {
    step: "02",
    title: "Configure Pipeline",
    desc: "Choose delivery targets (YouTube, Reels, WebM, Archival HEVC) or adjust CRF, bitrate, resolution, and hardware encoder.",
  },
  {
    step: "03",
    title: "Execute Transcode",
    desc: "Local hardware encodes all queued items directly to your target directory. Completed files are ready immediately with zero network latency.",
  },
];

const PLANS = [
  {
    name: "Community",
    price: "₦0",
    period: "forever",
    description: "Standard offline converter for occasional single files.",
    specs: [
      { label: "Daily Conversion Cap", val: "5 files per day" },
      { label: "Maximum Resolution", val: "720p HD" },
      { label: "Encoding Engine", val: "CPU (libx264, libmp3lame)" },
      { label: "Container Formats", val: "MP4, MP3" },
      { label: "Batch Queue", val: "Sequential single-file" },
      { label: "Cloud Uploads", val: "Zero (Local execution)" },
    ],
    cta: "Start Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro License",
    price: "₦4,500",
    period: "per month",
    description: "Full hardware-accelerated batch workstation for video editors.",
    specs: [
      { label: "Daily Conversion Cap", val: "Unlimited" },
      { label: "Maximum Resolution", val: "8K UHD / 4K 60FPS" },
      { label: "Encoding Engine", val: "GPU Hardware (NVENC, AMF, QSV)" },
      { label: "Container Formats", val: "All Video & Audio Codecs" },
      { label: "Batch Queue", val: "1,000+ files multi-threaded" },
      { label: "Desktop License", val: "Tauri Windows Desktop App Key" },
    ],
    cta: "Get Pro License",
    href: "/pricing",
    highlight: true,
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<"queue" | "terminal">("queue");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#FAF9F6] text-slate-900 font-sans">
      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          scrolled
            ? "bg-[#FAF9F6] border-b border-slate-200"
            : "bg-[#FAF9F6]/90 border-b border-slate-200/60"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} priority />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-slate-950 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-md hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-1.5 bg-slate-950 text-white text-xs font-bold px-4 py-2 rounded-md hover:bg-slate-800 transition-colors"
            >
              Download
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-md mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Offline Architecture: Zero Cloud Uploads, 100% Local Hardware Processing
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-950 tracking-tight leading-[1.08] mb-6">
          Convert media at GPU speed.
          <br />
          <span className="text-[#0B6FFB]">Privately on your machine.</span>
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          Vimora is a desktop-class media transcoder for video editors, agencies, and creators.
          Bulk-convert video and audio locally using hardware encoders without file uploads,
          cloud limits, or data exposure.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/download"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-950 text-white text-xs font-bold px-6 py-3.5 rounded-md hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-[#0B6FFB]" />
            Download for Windows (64-bit)
          </Link>
          <Link
            href="/converter"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-900 text-xs font-bold px-6 py-3.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Launch Web Converter
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="font-mono text-slate-800 font-bold">FFmpeg 7.0</span> embedded engine
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="font-mono text-slate-800 font-bold">NVENC / AMF / QSV</span> auto-routed
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="font-mono text-slate-800 font-bold">Windows 10 / 11</span> native
          </span>
        </div>

        {/* Live Product Demo Preview Mockup */}
        <div className="mt-16 text-left border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
          {/* Mock Window Top Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="ml-2 font-mono text-[11px] text-slate-600 font-medium">
                Vimora Workstation v1.0 — Local Hardware Pipeline
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                NVENC Active
              </span>
              <span className="font-mono text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                Localhost Only
              </span>
            </div>
          </div>

          {/* Mock App Body */}
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <p className="text-xs font-bold text-slate-900">Active Transcoding Queue</p>
                <p className="text-[11px] text-slate-500">3 jobs in progress • Hardware acceleration enabled</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDemoTab("queue")}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${
                    activeDemoTab === "queue"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Job Queue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDemoTab("terminal")}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${
                    activeDemoTab === "terminal"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  FFmpeg Flags
                </button>
              </div>
            </div>

            {activeDemoTab === "queue" ? (
              <div className="space-y-3 font-mono text-xs">
                {/* Job 1 */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 text-[#0B6FFB] flex items-center justify-center font-bold text-[10px]">
                      MOV
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold font-sans">A-Roll_Interview_4K.mov</p>
                      <p className="text-[10px] text-slate-500">3840x2160 • ProRes 422 • 4.2 GB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      H.265 NVENC
                    </span>
                    <div className="w-32">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Done</span>
                        <span className="text-emerald-600 font-bold">100%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-full" />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600">842 MB (-80%)</span>
                  </div>
                </div>

                {/* Job 2 */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-[10px]">
                      MP4
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold font-sans">Podcast_Episode_108_Master.wav</p>
                      <p className="text-[10px] text-slate-500">48 kHz • 24-bit PCM • 820 MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      AAC 320k + LUFS -14
                    </span>
                    <div className="w-32">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Encoding</span>
                        <span className="text-[#0B6FFB] font-bold">78%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0B6FFB] rounded-full w-[78%]" />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600">142 FPS</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-lg overflow-x-auto leading-relaxed">
                <p className="text-slate-400"># Direct local FFmpeg command generated by Vimora:</p>
                <p className="text-emerald-400 mt-1">
                  ffmpeg -hwaccel cuda -hwaccel_output_format cuda -i &quot;A-Roll_Interview_4K.mov&quot; \
                </p>
                <p className="text-blue-300 pl-4">
                  -c:v hevc_nvenc -preset p5 -tune hq -cq 22 -b:v 0 \
                </p>
                <p className="text-yellow-300 pl-4">
                  -c:a aac -b:a 320k -af &quot;loudnorm=I=-14:LRA=11:TP=-1.5&quot; \
                </p>
                <p className="text-slate-300 pl-4">&quot;A-Roll_Interview_4K_NVENC.mp4&quot;</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="py-20 px-6 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B6FFB] mb-2 font-mono">
              Core Architecture
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Designed for local throughput, not cloud upsells.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-[#FAF9F6] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-slate-950 font-sans">{cap.title}</h3>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {cap.tag}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {cap.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/80 space-y-2">
                  {cap.specs.map((spec) => (
                    <div key={spec} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B6FFB]" />
                      {spec}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Execution Workflow */}
      <section id="architecture" className="py-20 px-6 border-t border-slate-200 bg-[#FAF9F6]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B6FFB] mb-2 font-mono">
              Operational Sequence
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              How the local pipeline functions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.step} className="border border-slate-200 rounded-xl p-6 bg-white shadow-xs">
                <div className="font-mono text-sm font-bold text-white bg-slate-950 w-7 h-7 rounded flex items-center justify-center mb-4">
                  {s.step}
                </div>
                <h3 className="text-base font-bold text-slate-950 mb-2 font-sans">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B6FFB] mb-2 font-mono">
              Transparent Licensing
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mb-2">
              Community Free & Pro Workstation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Zero hidden fees. Pro subscriptions unlock unlimited bulk queues and hardware acceleration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-xl p-6 sm:p-8 flex flex-col justify-between ${
                  plan.highlight
                    ? "bg-slate-950 text-white border-slate-800"
                    : "bg-[#FAF9F6] text-slate-900 border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider font-mono ${
                        plan.highlight ? "text-[#0B6FFB]" : "text-slate-500"
                      }`}
                    >
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0B6FFB] text-white">
                        RECOMMENDED
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl sm:text-4xl font-extrabold font-sans">{plan.price}</span>
                    <span className={`text-xs ${plan.highlight ? "text-slate-400" : "text-slate-500"}`}>
                      {plan.period}
                    </span>
                  </div>

                  <p className={`text-xs mb-6 ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>
                    {plan.description}
                  </p>

                  <div className="space-y-3 text-xs mb-8 pt-4 border-t border-slate-200/20">
                    {plan.specs.map((item) => (
                      <div key={item.label} className="flex justify-between gap-4">
                        <span className={plan.highlight ? "text-slate-400" : "text-slate-500"}>
                          {item.label}
                        </span>
                        <span className={`font-semibold font-mono text-right ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={plan.href}
                  className={`w-full py-3 rounded-md text-xs font-bold text-center transition-colors ${
                    plan.highlight
                      ? "bg-[#0B6FFB] hover:bg-[#0958cc] text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 min-h-[400px] flex flex-col items-center justify-between px-6 bg-[#FAF9F6] py-16">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-between flex-1 gap-10 text-center">
          {/* Top: Logo and Name */}
          <div className="flex flex-col items-center justify-center pt-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <Logo size={32} textClassName="font-extrabold text-slate-950 font-sans text-xl tracking-tight" />
            </Link>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Local-First FFmpeg Transcoding Architecture
            </p>
          </div>

          {/* Centre: Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold text-slate-600">
            <Link href="/converter" className="hover:text-slate-950 transition-colors">
              Converter
            </Link>
            <Link href="/download" className="hover:text-slate-950 transition-colors">
              Desktop Download
            </Link>
            <Link href="/pricing" className="hover:text-slate-950 transition-colors">
              Pricing
            </Link>
            <Link href="/terms" className="hover:text-slate-950 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-950 transition-colors">
              Privacy Policy
            </Link>
          </div>

          {/* Bottom: All Rights Reserved */}
          <div className="text-center text-xs text-slate-400 font-medium pb-2">
            <p>&copy; {new Date().getFullYear()} Vimora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
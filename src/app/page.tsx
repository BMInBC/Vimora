"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import {
  Zap, ChevronRight, Shield, Cpu, Download, Film,
  Music, Clock, Users, CheckCircle2,
  ArrowRight, Star, Lock, Globe, Layers, RefreshCw,
  Sparkles, UploadCloud, Sliders
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "mailto:fawazadekanmbi19@gmail.com" },
];

const FEATURES = [
  {
    image: "/features/private_3d.png",
    title: "100% Private",
    desc: "Your files never leave your computer. All conversion happens locally on-device with zero uploads, zero cloud storage.",
    badge: "Zero Uploads",
  },
  {
    image: "/features/gpu_3d_icon.png",
    title: "GPU Accelerated",
    desc: "Harness NVIDIA NVENC, AMD AMF, and Intel QSV hardware encoders for blazing-fast conversions that saturate your GPU.",
    badge: "Hardware Encoded",
  },
  {
    image: "/features/bulk_3d_icon.png",
    title: "Bulk Processing",
    desc: "Queue hundreds of files at once. Set output formats, quality presets, and let Vimora process them overnight automatically.",
    badge: "Massive Batches",
  },
  {
    image: "/features/video_3d_icon.png",
    title: "Video Formats",
    desc: "Convert between MP4, MOV, AVI, MKV, WebM, H.264, H.265/HEVC, AV1, and dozens more with lossless or compressed output.",
    badge: "Any Container",
  },
  {
    image: "/features/audio_3d_icon.png",
    title: "Audio Conversion",
    desc: "Extract audio, transcode between MP3, AAC, FLAC, OGG, WAV, and normalize loudness to broadcast standards (LUFS).",
    badge: "LUFS Normalized",
  },
  {
    image: "/features/presets_3d_icon.png",
    title: "Smart Presets",
    desc: "One-click presets for YouTube upload, Instagram Reels, Twitter, Discord, archival HEVC, and audiophile FLAC exports.",
    badge: "One-Click Ready",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Drop your files",
    desc: "Drag and drop any video or audio files — single files, folders, or hundreds at once.",
    icon: UploadCloud,
  },
  {
    num: "02",
    title: "Choose a preset",
    desc: "Pick a format, quality, codec, or resolution. Use smart presets for popular platforms instantly.",
    icon: Sliders,
  },
  {
    num: "03",
    title: "Convert at GPU speed",
    desc: "Vimora leverages your hardware encoder. Files process 10 to 50 times faster than CPU-only converters.",
    icon: Zap,
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    description: "For individuals trying Vimora out.",
    features: [
      "Up to 5 conversions/day",
      "720p output resolution",
      "CPU encoding",
      "MP4, MP3 output",
      "Conversion history (7 days)",
    ],
    cta: "Start Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₦4,500",
    period: "/month",
    description: "For creators and small agencies.",
    features: [
      "Unlimited conversions",
      "4K / 8K output",
      "GPU acceleration (NVENC, AMF, QSV)",
      "All formats & codecs",
      "Bulk queue (1,000+ files)",
      "Custom preset library",
      "Priority support",
      "Lifetime history",
    ],
    cta: "Upgrade to Pro",
    href: "/pricing",
    highlight: true,
  },
];

const TESTIMONIALS = [
  { name: "Adaeze O.", role: "Video Editor, Lagos", body: "Vimora cut my batch export time from 4 hours to 20 minutes. The GPU acceleration is insane.", rating: 5 },
  { name: "Chidi M.", role: "Podcast Producer", body: "Finally a converter that works offline, respects my privacy, and handles 300-episode batch jobs without breaking a sweat.", rating: 5 },
  { name: "Temi A.", role: "Content Agency Owner", body: "Our team converts client deliverables daily. Vimora Pro pays for itself every single week.", rating: 5 },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden font-sans">
      {/* Background Layer: Smooth Mesh Gradients & Soft Glows (100% Local & Reliable) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e8f2fa] via-[#f0f6fc]/80 to-[#F7F5F2]" />
        <div className="absolute top-[10%] -left-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-blue-200/40 to-cyan-100/30 blur-3xl" />
        <div className="absolute top-[25%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-purple-200/30 to-pink-100/20 blur-3xl" />
        <div className="absolute bottom-[10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-blue-100/40 to-sky-100/30 blur-3xl" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <nav
          className={`sticky top-0 z-50 w-full transition-all duration-300 ${
            scrolled ? "bg-white/85 backdrop-blur-xl shadow-sm border-b border-slate-900/5" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={32} priority />
            </Link>

            <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate-700">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} className="hover:text-black transition-colors">
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-black/5 transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 bg-slate-950 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 shadow transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-5xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md text-slate-700 text-xs font-bold px-4 py-2 rounded-full border border-slate-900/10 shadow-sm mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Free to start &bull; No upload &bull; 100% local processing
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.08] tracking-tight font-nunito mb-6 animate-slide-up">
            Convert media at{" "}
            <span className="relative inline-block">
              <span className="relative z-10">GPU speed.</span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 bg-[#0B6FFB]/25 rounded -z-0" />
            </span>
            <br />
            Privately.
          </h1>

          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Vimora is a desktop media converter for content creators. Bulk-convert video and audio files locally using your GPU &mdash; no uploads, no subscriptions to start, no privacy tradeoffs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 bg-slate-950 text-white text-[15px] font-bold px-7 py-4 rounded-2xl hover:bg-slate-800 shadow-lg transition-all active:scale-95"
            >
              <Download className="w-5 h-5 text-[#0BB3FA]" />
              Download for Windows
              <span className="text-[11px] font-normal opacity-70 ml-0.5">v1.0 &bull; Free</span>
            </Link>
            <Link
              href="/converter"
              className="inline-flex items-center gap-2 bg-white/80 backdrop-blur text-slate-800 text-[15px] font-bold px-7 py-4 rounded-2xl border border-slate-900/10 hover:bg-white shadow transition-all active:scale-95"
            >
              Use in Browser
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 flex-wrap">
            {["FFmpeg-powered", "NVENC &bull; AMF &bull; QSV", "Windows 10+"].map((t, idx) => (
              <span key={idx} className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span dangerouslySetInnerHTML={{ __html: t }} />
              </span>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-10 px-6">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-slate-600 text-sm">
            <span className="font-bold text-slate-800">Loved by creators across Africa & beyond</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-500" /> 2,400+ users</span>
            <span className="flex items-center gap-1.5"><Film className="w-4 h-4 text-slate-500" /> 1.2M files converted</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> Avg. 18x faster than browser tools</span>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/60 text-purple-900 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Next-Gen Local Engine
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-nunito mb-4">
                Everything you need.<br />Nothing you don&apos;t.
              </h2>
              <p className="text-slate-600 text-lg max-w-xl mx-auto">
                Vimora is built for speed, privacy, and bulk workflows &mdash; not for cloud upsells.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {FEATURES.map(({ image, title, desc, badge }) => (
                <div
                  key={title}
                  className="group relative bg-white/80 backdrop-blur-md border border-slate-900/10 rounded-3xl p-7 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

                  <div>
                    {/* 3D Icon Container */}
                    <div className="relative w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/90 p-2 border border-slate-200/80 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-contain drop-shadow-md rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold text-slate-900 font-nunito group-hover:text-purple-950 transition-colors">
                        {title}
                      </h3>
                      {badge && (
                        <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {badge}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed mt-2.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Horizontal Layout */}
        <section id="how-it-works" className="py-24 px-6 bg-slate-950/[0.03] border-y border-slate-900/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B6FFB]/10 border border-[#0B6FFB]/20 text-[#0B6FFB] text-xs font-bold uppercase tracking-wider mb-4">
                <Clock className="w-3.5 h-3.5 text-[#0B6FFB]" />
                Simple 3-Step Process
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-nunito mb-4">
                Convert in three steps
              </h2>
              <p className="text-slate-600 text-lg max-w-lg mx-auto">
                No guides needed. Vimora is as fast to learn as it is to run.
              </p>
            </div>

            {/* Horizontal steps pipeline */}
            <div className="relative">
              {/* Horizontal connecting track across cards on desktop */}
              <div className="hidden md:block absolute top-1/2 left-16 right-16 h-1 bg-gradient-to-r from-purple-300 via-cyan-300 to-blue-400 -translate-y-1/2 z-0 rounded-full opacity-60" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {STEPS.map(({ num, title, desc, icon: StepIcon }, idx) => (
                  <div
                    key={num}
                    className="relative bg-white/90 backdrop-blur-md border border-slate-900/10 rounded-3xl p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Arrow badge connecting horizontally between cards */}
                    {idx < STEPS.length - 1 && (
                      <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 items-center justify-center shadow-md text-slate-500">
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                    )}

                    {/* Step Card Header: Horizontal alignment with number pill and icon */}
                    <div>
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-2xl bg-black text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                            {num}
                          </span>
                          <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-400">
                            Step {num}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <StepIcon className="w-5 h-5 text-slate-800" />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 font-nunito mb-2">
                        {title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#0B6FFB]">
                      <span className="w-2 h-2 rounded-full bg-[#0B6FFB] animate-pulse" />
                      Instant Workflow
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-nunito mb-4">
                Simple, honest pricing
              </h2>
              <p className="text-slate-600 text-lg max-w-lg mx-auto">
                Pay only when you need more power. Instant activation via Paystack.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-3xl p-8 border transition-all duration-300 ${
                    plan.highlight
                      ? "bg-slate-950 text-white border-transparent shadow-2xl scale-[1.02]"
                      : "bg-white/80 backdrop-blur border-slate-900/10 hover:shadow-lg"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0B6FFB] text-white shadow-md shadow-[#0B6FFB]/25 text-xs font-black px-4 py-1.5 rounded-full shadow">
                      MOST POPULAR
                    </div>
                  )}
                  <div
                    className={`text-sm font-bold uppercase tracking-widest mb-1 ${
                      plan.highlight ? "text-[#0BB3FA]" : "text-slate-500"
                    }`}
                  >
                    {plan.name}
                  </div>
                  <div
                    className={`text-4xl font-extrabold font-nunito ${
                      plan.highlight ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {plan.price}
                    <span className={`text-base font-medium ${plan.highlight ? "text-white/60" : "text-slate-400"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 mb-6 ${plan.highlight ? "text-white/60" : "text-slate-500"}`}>
                    {plan.description}
                  </p>
                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.highlight ? "text-[#0B6FFB]" : "text-emerald-500"
                          }`}
                        />
                        <span className={plan.highlight ? "text-white/85" : "text-slate-600"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`w-full text-center py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      plan.highlight
                        ? "bg-[#0B6FFB] text-white shadow-md shadow-[#0B6FFB]/25 hover:bg-[#0958cc] shadow-lg"
                        : "bg-slate-950 text-white hover:bg-slate-800 shadow"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Trust Bar */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto bg-slate-950 rounded-3xl px-10 py-12 text-center text-white shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-[#0BB3FA]" />
              <h2 className="text-3xl font-extrabold font-nunito">Your files. Your machine. Always.</h2>
            </div>
            <p className="text-white/70 max-w-2xl mx-auto text-base leading-relaxed mb-8">
              Vimora processes everything locally using FFmpeg. We have no CDN, no file servers, no sneaky background uploads. Your media is as private as your hard drive.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0BB3FA]" /> Works fully offline
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0BB3FA]" /> Zero file uploads
              </span>
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0BB3FA]" /> No cloud storage required
              </span>
            </div>
          </div>
        </section>

        {/* Download Call to Action */}
        <section className="py-24 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-5xl font-extrabold text-slate-900 font-nunito mb-4">
              Ready to convert faster?
            </h2>
            <p className="text-slate-600 text-lg mb-10">
              Download Vimora for Windows and start converting in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/download"
                className="inline-flex items-center gap-2 bg-slate-950 text-white text-[15px] font-bold px-8 py-4 rounded-2xl hover:bg-slate-800 shadow-xl transition-all active:scale-95"
              >
                <Download className="w-5 h-5 text-[#0BB3FA]" />
                Download for Windows &bull; Free
              </Link>
              <Link
                href="/converter"
                className="inline-flex items-center gap-1.5 text-slate-700 font-semibold px-6 py-4 rounded-2xl hover:bg-black/5 transition-all text-sm"
              >
                Or use in browser <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-slate-400 text-xs mt-5">Windows 10 / 11 &bull; 64-bit &bull; Hardware Accelerated</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-900/10 py-10 px-6 bg-white/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={24} textClassName="font-extrabold text-slate-900 font-nunito text-base" />
            </Link>
            <div className="flex flex-wrap gap-6 text-sm text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
              <a href="mailto:fawazadekanmbi19@gmail.com" className="hover:text-slate-900 transition-colors">Contact</a>
              <Link href="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            </div>
            <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Vimora. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
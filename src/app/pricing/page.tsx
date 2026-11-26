"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import { Logo } from "@/components/Logo";
import {
  CheckCircle2, Shield, ArrowLeft, Loader2
} from "lucide-react";

export default function PricingPage() {
  const { user, isPro, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount: 4500,
          planCode: "pro_monthly",
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.status === 404
            ? "Payment API endpoint not found on this server."
            : `Server returned unexpected response (${res.status}).`
        );
      }

      const data = await res.json();
      if (data.status && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        setError(data.message || data.error || "Failed to initialize Paystack checkout");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {!authLoading && !user ? (
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={32} priority />
            </Link>
          ) : (
            <div />
          )}
          <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold font-nunito text-slate-950 mb-4">
            Fair, Creator-First Pricing
          </h1>
          <p className="text-slate-600 text-base md:text-lg">
            Free includes unlimited 1080p local exports, GPU acceleration, and zero watermarks. Upgrade to Pro for 4K/8K, unlimited batch queues, and power workflows.
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Community</span>
              <h2 className="text-2xl font-bold font-sans mt-1 text-slate-950">Free Tier</h2>
              <p className="text-3xl font-extrabold mt-4 font-sans text-slate-950">
                ₦0 <span className="text-xs font-normal text-slate-500">forever</span>
              </p>
              <p className="text-slate-500 text-xs mt-2 mb-6">Genuinely useful local workstation for everyday creator exports.</p>

              <div className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">MP4 & MP3 Exports</span>
                  <span className="font-semibold text-slate-900 font-mono">Unlimited (No watermark)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Max Resolution</span>
                  <span className="font-semibold text-slate-900 font-mono">1080p Full HD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">GPU Acceleration</span>
                  <span className="font-semibold text-emerald-600 font-mono">Included (Auto)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Batch Queue</span>
                  <span className="font-semibold text-slate-900 font-mono">Up to 3 files / batch</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Custom Presets & History</span>
                  <span className="font-semibold text-slate-900 font-mono">1 preset • Last 20</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Target-Size Compression</span>
                  <span className="font-semibold text-emerald-600 font-mono">Included (Local)</span>
                </div>
              </div>
            </div>

            <Link
              href="/converter"
              className="mt-8 block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-md transition-colors text-xs"
            >
              Continue with Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-slate-950 text-white rounded-xl p-8 border border-slate-800 shadow-lg flex flex-col justify-between relative">
            <div className="absolute -top-3 left-6 bg-[#0B6FFB] text-white text-[10px] font-bold font-mono px-2.5 py-0.5 rounded">
              {isPro ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B6FFB] font-mono">Workstation</span>
              <h2 className="text-2xl font-bold font-sans mt-1">Vimora Pro</h2>
              <p className="text-3xl font-extrabold mt-4 font-sans">
                ₦4,500 <span className="text-xs font-normal text-slate-400">per month</span>
              </p>
              <p className="text-slate-400 text-xs mt-2 mb-6">Designed for video editors, agencies, and heavy creators.</p>

              <div className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Batch Queue</span>
                  <span className="font-semibold text-white font-mono">Unlimited + Parallel</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Resolution</span>
                  <span className="font-semibold text-white font-mono">4K / 5K / 8K UHD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Archival & Codecs</span>
                  <span className="font-semibold text-[#0B6FFB] font-mono">All Codecs & Masters</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Custom Presets & History</span>
                  <span className="font-semibold text-white font-mono">Unlimited</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Power Workflows</span>
                  <span className="font-semibold text-emerald-400 font-mono">Watch Folders & Multi-Output</span>
                </div>
              </div>
            </div>

            <div>
              {isPro ? (
                <Link
                  href="/converter"
                  className="mt-8 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-md transition-colors text-xs"
                >
                  Pro Active — Open Converter
                </Link>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="mt-8 w-full flex items-center justify-center gap-2 bg-[#0B6FFB] hover:bg-[#0958cc] text-white font-bold py-3 rounded-md transition-colors text-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Initializing Paystack...
                    </>
                  ) : (
                    <>
                      Subscribe with Paystack (₦4,500/mo)
                    </>
                  )}
                </button>
              )}

              <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3 text-slate-400" />
                Secured by Paystack • Cards, Bank Transfer, USSD
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
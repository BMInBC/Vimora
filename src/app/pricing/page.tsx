"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import { Logo } from "@/components/Logo";
import {
  CheckCircle2, Shield, ArrowLeft, Loader2, Sparkles
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

      const data = await res.json();
      if (data.status && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        setError(data.message || "Failed to initialize Paystack checkout");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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
            Unlock Full GPU Acceleration
          </h1>
          <p className="text-slate-600 text-base md:text-lg">
            Pay securely in Naira with Paystack. Instant activation for desktop and web.
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
              <h2 className="text-3xl font-bold font-nunito mt-1">Free Tier</h2>
              <p className="text-3xl font-extrabold mt-4 font-nunito">₦0 <span className="text-sm font-normal text-slate-400">forever</span></p>
              <p className="text-slate-500 text-xs mt-2 mb-6">Perfect for occasional single-file conversions.</p>

              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Up to 5 conversions / day</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 720p output resolution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> CPU encoding (libx264)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> MP4 & MP3 standard exports</li>
              </ul>
            </div>

            <Link
              href="/converter"
              className="mt-8 block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl transition-all text-sm"
            >
              Continue with Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-slate-950 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0B6FFB] text-white shadow-md shadow-[#0B6FFB]/25 text-xs font-black px-4 py-1 rounded-full">
              {isPro ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0BB3FA]">Unlimited Power</span>
              <h2 className="text-3xl font-bold font-nunito mt-1">Vimora Pro</h2>
              <p className="text-4xl font-extrabold mt-4 font-nunito">
                ₦4,500 <span className="text-sm font-normal text-slate-400">/ month</span>
              </p>
              <p className="text-slate-300 text-xs mt-2 mb-6">Designed for editors, agencies, and video producers.</p>

              <ul className="space-y-3 text-sm text-slate-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0B6FFB]" /> Unlimited daily conversions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0B6FFB]" /> GPU acceleration (NVENC, AMF, QSV)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0B6FFB]" /> 4K & 8K ultra-HD presets</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0B6FFB]" /> Bulk queue: 1,000+ files</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0B6FFB]" /> Desktop application license key</li>
              </ul>
            </div>

            <div>
              {isPro ? (
                <Link
                  href="/converter"
                  className="mt-8 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Pro Active — Launch Converter
                </Link>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="mt-8 w-full flex items-center justify-center gap-2 bg-[#0B6FFB] hover:bg-[#0958cc] text-white shadow-lg shadow-[#0B6FFB]/25 font-bold py-3.5 rounded-xl transition-all active:scale-95 text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Initializing Paystack...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Upgrade with Paystack
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
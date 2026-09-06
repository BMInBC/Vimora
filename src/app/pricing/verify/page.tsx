"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const reference = searchParams.get("reference");

  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<"success" | "failed">("failed");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setVerifying(false);
      setMessage("No transaction reference detected");
      return;
    }

    const checkTransaction = async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();

        if (data.status && data.data?.status === "success") {
          setStatus("success");
          setMessage("Payment confirmed! Your Vimora Pro license is now active.");

          // Update active session locally
          try {
            const raw = localStorage.getItem("vimora_session");
            if (raw) {
              const session = JSON.parse(raw);
              session.profile.plan = "pro";
              session.profile.licenceStatus = "active";
              localStorage.setItem("vimora_session", JSON.stringify(session));
            }
          } catch {}
        } else {
          setStatus("failed");
          setMessage(data.message || "Payment verification could not be completed.");
        }
      } catch (err: any) {
        setStatus("failed");
        setMessage(err.message || "Verification request encountered an error.");
      } finally {
        setVerifying(false);
      }
    };

    checkTransaction();
  }, [reference]);

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md w-full text-center">
      {verifying ? (
        <div className="py-8">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold font-nunito">Verifying with Paystack...</h2>
          <p className="text-slate-500 text-xs mt-2">Connecting to gateway to confirm your payment</p>
        </div>
      ) : status === "success" ? (
        <div className="py-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold font-nunito text-slate-900">Welcome to Pro!</h2>
          <p className="text-slate-600 text-sm mt-2">{message}</p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md text-sm"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold font-nunito text-slate-900">Payment Failed</h2>
          <p className="text-slate-600 text-sm mt-2">{message}</p>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md text-sm"
            >
              Try Again
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
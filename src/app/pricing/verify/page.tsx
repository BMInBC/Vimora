"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, updateUserProfile } = useAuth();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<"success" | "failed">("failed");
  const [message, setMessage] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (!reference) {
      setVerifying(false);
      setMessage("No transaction reference detected");
      return;
    }

    const checkTransaction = async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();

        if (data.status && data.data?.status === "success") {
          setStatus("success");
          setMessage("Payment confirmed! Your Vimora Pro license is now active.");
          setPaymentDetails(data.data);

          // Update user state immediately via AuthContext
          updateUserProfile({
            plan: "pro",
            licenceStatus: "active",
          });

          // Backup direct localStorage persistence
          try {
            const raw = localStorage.getItem("vimora_session");
            if (raw) {
              const session = JSON.parse(raw);
              if (session.profile) {
                session.profile.plan = "pro";
                session.profile.licenceStatus = "active";
                localStorage.setItem("vimora_session", JSON.stringify(session));
              }
            }

            const rawUsers = localStorage.getItem("vimora_all_users");
            if (rawUsers) {
              const users = JSON.parse(rawUsers);
              const targetEmail = data.data?.customer?.email || user?.email;
              if (targetEmail) {
                const idx = users.findIndex((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase());
                if (idx >= 0) {
                  users[idx].plan = "pro";
                  users[idx].licenceStatus = "active";
                  localStorage.setItem("vimora_all_users", JSON.stringify(users));
                }
              }
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
  }, [reference, updateUserProfile, user?.email]);

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md w-full text-center">
      {verifying ? (
        <div className="py-8">
          <Loader2 className="w-12 h-12 text-[#0B6FFB] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold font-nunito text-slate-900">Verifying with Paystack...</h2>
          <p className="text-slate-500 text-xs mt-2">Connecting to gateway to confirm your payment</p>
        </div>
      ) : status === "success" ? (
        <div className="py-4 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B6FFB] border border-blue-200 text-[11px] font-black uppercase tracking-wider mb-2">
              ★ Pro Activated
            </span>
            <h2 className="text-2xl font-black font-nunito text-slate-950">Welcome to Vimora Pro!</h2>
            <p className="text-slate-600 text-xs mt-1">{message}</p>
          </div>

          {/* Receipt Card */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-left text-xs space-y-1.5 font-medium">
            <div className="flex justify-between text-slate-500">
              <span>Amount Paid:</span>
              <span className="font-bold text-slate-900">
                ₦{paymentDetails?.amount ? (paymentDetails.amount / 100).toLocaleString() : "4,500"} NGN
              </span>
            </div>
            {paymentDetails?.reference && (
              <div className="flex justify-between text-slate-500">
                <span>Reference:</span>
                <span className="font-mono text-[11px] text-slate-700 truncate max-w-[170px]" title={paymentDetails.reference}>
                  {paymentDetails.reference}
                </span>
              </div>
            )}
            {paymentDetails?.channel && (
              <div className="flex justify-between text-slate-500">
                <span>Payment Channel:</span>
                <span className="font-bold uppercase text-slate-700">{paymentDetails.channel}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Status:</span>
              <span className="font-bold text-emerald-600 uppercase">Confirmed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href="/converter"
              className="inline-flex items-center justify-center gap-1.5 bg-[#0B6FFB] hover:bg-[#0958cc] text-white font-bold py-3 rounded-xl transition-all shadow-md text-xs shadow-blue-500/25"
            >
              Start Converting <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all text-xs"
            >
              Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
            <XCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-extrabold font-nunito text-slate-900">Payment Unsuccessful</h2>
          <p className="text-slate-600 text-xs mt-2">{message}</p>
          <div className="mt-8 flex gap-2 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-[#0B6FFB] hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md text-xs"
            >
              Try Again
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl transition-all text-xs"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
      <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
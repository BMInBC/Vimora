"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Shield } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={28} priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 shadow-xs">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-6">
            <Shield className="w-3.5 h-3.5 text-[#0B6FFB]" /> Legal & Governance
          </div>

          <h1 className="text-3xl font-extrabold text-slate-950 mb-2">Terms of Service</h1>
          <p className="text-xs text-slate-500 mb-8 pb-4 border-b border-slate-200">
            Last updated: September 7, 2026
          </p>

          <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">1. Overview and Acceptance</h2>
              <p>
                Welcome to Vimora. By using our website, web application, or Tauri desktop client, you agree to comply with and be bound by these Terms of Service. If you disagree with any part of these terms, please do not use our software or services.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">2. Local Software Execution & Processing</h2>
              <p>
                Vimora operates on a local-first architecture. Video and audio transcoding, compression, and format conversions are executed locally on your device via FFmpeg and your hardware encoders (NVENC, AMF, QSV). Vimora does not store, upload, or transmit your media files to any remote server or third-party cloud.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">3. User Responsibility & Content Rights</h2>
              <p>
                You retain full ownership and intellectual property rights in all media files you process. You are solely responsible for ensuring you have the necessary licenses and legal authorization to convert, modify, and store the content you process through Vimora.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">4. Subscriptions, Payments & Billing</h2>
              <p>
                Vimora provides a Free Community tier and an optional Pro tier unlocking hardware acceleration, batch queuing, and 4K/8K presets. Payments are securely processed through Paystack. Subscriptions renew automatically unless canceled before the billing period ends. All fees are non-refundable except where required by applicable consumer law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">5. Disclaimer of Warranties & Limitation of Liability</h2>
              <p>
                Vimora is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. Under no circumstances shall Vimora or its contributors be liable for any indirect, incidental, or consequential damages resulting from data loss, conversion corruption, or hardware malfunction.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">6. Contact Information</h2>
              <p>
                For questions regarding these Terms of Service, please reach out to our team at{" "}
                <a href="mailto:support@vimora.app" className="text-[#0B6FFB] underline font-medium">
                  support@vimora.app
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

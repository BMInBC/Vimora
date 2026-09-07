"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPage() {
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
            <Lock className="w-3.5 h-3.5 text-emerald-600" /> Privacy Commitment
          </div>

          <h1 className="text-3xl font-extrabold text-slate-950 mb-2">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mb-8 pb-4 border-b border-slate-200">
            Last updated: September 7, 2026
          </p>

          <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">1. Core Principle: Zero Cloud Uploads</h2>
              <p>
                At Vimora, your privacy is protected by system architecture, not merely promises. All video and audio transcoding operations execute locally on your physical hardware via embedded FFmpeg and GPU drivers. We do not maintain ingestion CDNs, cloud transcoding farms, or file storage buckets.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">2. Information We Collect</h2>
              <p>
                We only collect minimal data necessary to maintain your account and manage subscriptions:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                <li><strong>Account Credentials:</strong> Email address and authentication tokens via Google Firebase Authentication.</li>
                <li><strong>Payment Metadata:</strong> Transaction reference IDs and customer codes via Paystack. We never store credit card numbers.</li>
                <li><strong>Local Settings:</strong> Conversion preferences and presets saved locally in your browser storage or local desktop configuration file.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">3. Information We Never Collect</h2>
              <p>
                We never inspect, log, or transmit:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                <li>Your media filenames, metadata, audio waveforms, or video frames.</li>
                <li>Content hashes or file fingerprints.</li>
                <li>Network packet captures or tracking pixels.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">4. Third-Party Services</h2>
              <p>
                We partner with trusted infrastructure providers solely for user identity and payment processing:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                <li><strong>Firebase Authentication:</strong> Manages secure user session authentication.</li>
                <li><strong>Paystack:</strong> PCI-DSS certified payment gateway processing credit card and bank transfers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">5. Data Retention & Deletion</h2>
              <p>
                You can delete your account and all associated profile records at any time from your Account Settings page. Upon deletion, your user record is permanently removed from Firebase.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">6. Contact Us</h2>
              <p>
                If you have any questions or data privacy inquiries, contact our data protection team at{" "}
                <a href="mailto:privacy@vimora.app" className="text-[#0B6FFB] underline font-medium">
                  privacy@vimora.app
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

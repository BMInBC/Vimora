"use client";
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/authContext';
import { Logo } from '@/components/Logo';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-100 to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <Logo size={40} textClassName="text-2xl font-extrabold text-slate-900 font-nunito" priority />
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 font-nunito">Reset your password</h1>
          <p className="text-slate-500 mt-2 text-sm">We will send a reset link to your email.</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-900/5 p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 text-lg">Reset email sent!</h3>
              <p className="text-slate-500 text-sm mt-2">Check your inbox at <strong>{email}</strong> for a link to reset your password.</p>
              <Link href="/login" className="mt-6 inline-block text-sm font-bold text-slate-900 hover:underline">Back to Sign In</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 text-slate-900 placeholder:text-slate-400" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-slate-950 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-md disabled:opacity-60 text-sm">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-xs text-slate-500 mt-6">
                Remembered it? <Link href="/login" className="font-bold text-slate-900 hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
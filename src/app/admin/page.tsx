"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import { ADMIN_EMAIL } from "@/lib/firebase/config";
import { UserProfile } from "@/lib/types";
import { Logo } from "@/components/Logo";
import {
  ShieldAlert, Activity, Search, RefreshCw, ArrowLeft, CheckCircle
} from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useAuth();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sysStatus, setSysStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const isAdminAuthorized = user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (isAdminAuthorized) {
      loadRegisteredUsers();
      checkSystemHealth();
    }
  }, [user, loading, isAdminAuthorized]);

  const loadRegisteredUsers = () => {
    try {
      const raw = localStorage.getItem("vimora_all_users");
      if (raw) {
        setUsersList(JSON.parse(raw));
      } else {
        const initialUsers: UserProfile[] = [
          {
            uid: "adm_01",
            email: "fawazadekanmbi19@gmail.com",
            displayName: "Fawaz Adekanmbi (Admin)",
            emailVerified: true,
            role: "admin",
            plan: "pro",
            accountStatus: "active",
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            licenceStatus: "active",
          },
          {
            uid: "usr_02",
            email: "creative_editor@agency.co",
            displayName: "Creative Editor",
            emailVerified: true,
            role: "user",
            plan: "pro",
            accountStatus: "active",
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
            lastActiveAt: new Date().toISOString(),
            licenceStatus: "active",
          },
          {
            uid: "usr_03",
            email: "samuel@studio.ng",
            displayName: "Samuel Video Works",
            emailVerified: false,
            role: "user",
            plan: "free",
            accountStatus: "active",
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
            lastActiveAt: new Date().toISOString(),
            licenceStatus: "none",
          },
        ];
        localStorage.setItem("vimora_all_users", JSON.stringify(initialUsers));
        setUsersList(initialUsers);
      }
    } catch {}
  };

  const toggleUserPlan = (targetEmail: string) => {
    const updated: UserProfile[] = usersList.map((u) => {
      if (u.email.toLowerCase() === targetEmail.toLowerCase()) {
        const nextPlan: "free" | "pro" = u.plan === "pro" ? "free" : "pro";
        const nextLicence: "active" | "none" = nextPlan === "pro" ? "active" : "none";
        return {
          ...u,
          plan: nextPlan,
          licenceStatus: nextLicence,
        };
      }
      return u;
    });
    setUsersList(updated);
    localStorage.setItem("vimora_all_users", JSON.stringify(updated));
  };

  const checkSystemHealth = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/gpu");
      if (res.ok) {
        const data = await res.json();
        setSysStatus(data);
      }
    } catch {
      setSysStatus({ error: "Could not reach GPU probe API" });
    } finally {
      setLoadingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user || !isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-nunito mb-2">Access Restricted</h1>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          This portal is strictly reserved for the authorized Vimora administrator (<strong>{ADMIN_EMAIL}</strong>).
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Homepage
        </Link>
      </div>
    );
  }

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPro = usersList.filter((u) => u.plan === "pro").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={30} textClassName="font-extrabold text-xl font-nunito text-white" priority />
            </Link>
            <span className="text-slate-500">|</span>
            <span className="font-semibold text-sm text-slate-300">Admin Control</span>
            <span className="text-xs bg-[#0B6FFB]/20 text-[#0BB3FA] font-mono px-2 py-0.5 rounded border border-[#0B6FFB]/30">
              {ADMIN_EMAIL}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white transition-colors">
              User Dashboard
            </Link>
            <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Accounts</p>
            <p className="text-3xl font-extrabold mt-1 font-nunito">{usersList.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pro Licenses</p>
            <p className="text-3xl font-extrabold mt-1 text-[#0B6FFB] font-nunito">{totalPro}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paystack Plan</p>
            <p className="text-xl font-extrabold mt-1 text-slate-900 font-nunito">â‚¦4,500 / mo</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engine Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-sm font-bold text-emerald-700">FFmpeg Ready</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold font-nunito">FFmpeg & Hardware Acceleration Probe</h2>
            </div>
            <button
              onClick={checkSystemHealth}
              disabled={loadingStatus}
              className="text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {sysStatus ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-500 mb-1">NVIDIA NVENC</p>
                <p className={sysStatus.encoders?.nvenc ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {sysStatus.encoders?.nvenc ? "Detected (Active)" : "Not Available"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-500 mb-1">Intel QSV</p>
                <p className={sysStatus.encoders?.qsv ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {sysStatus.encoders?.qsv ? "Detected (Active)" : "Not Available"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-500 mb-1">AMD AMF</p>
                <p className={sysStatus.encoders?.amf ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {sysStatus.encoders?.amf ? "Detected (Active)" : "Not Available"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-500 mb-1">CPU Encoding</p>
                <p className="text-emerald-600 font-bold">libx264 / libx265 (Ready)</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Click refresh to run hardware capability probe.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-nunito">Registered Users & Licenses</h2>
              <p className="text-xs text-slate-500">Manage customer subscriptions and grant Pro privileges</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user or email..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">User / Email</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Plan Status</th>
                  <th className="py-3.5 px-6">Desktop License</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{u.displayName || "Anonymous"}</p>
                      <p className="text-slate-500 font-mono">{u.email}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          u.role === "admin" ? "bg-[#0B6FFB]/15 text-[#0B6FFB]" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.plan === "pro" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      {u.licenceStatus === "active" ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Licensed
                        </span>
                      ) : (
                        <span className="text-slate-400">Free / Unlicensed</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => toggleUserPlan(u.email)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        {u.plan === "pro" ? "Downgrade to Free" : "Grant Pro License"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
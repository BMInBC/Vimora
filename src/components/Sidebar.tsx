"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import { Logo } from "@/components/Logo";
import { detectGpuCapabilities } from "@/lib/ffmpeg/detector";
import { GpuCapabilities } from "@/lib/types";
import {
  Sliders,
  LayoutDashboard,
  Crown,
  User as UserIcon,
  LogOut,
  Sparkles,
  Zap,
  Menu,
  X,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  HardDrive,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isPro, isAdmin, logout } = useAuth();

  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    detectGpuCapabilities().then(setGpuCaps).catch(() => {});
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.push("/login");
  };

  const NAV_ITEMS = [
    {
      name: "Converter",
      href: "/converter",
      icon: Sliders,
      badge: "GPU",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "User Profile",
      href: "/user",
      icon: UserIcon,
    },
    {
      name: "Pricing & Plans",
      href: "/pricing",
      icon: Crown,
      badge: isPro ? "Active" : "Pro",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/converter" && (pathname === "/converter" || pathname.startsWith("/converter/"))) return true;
    if (href === "/user" && (pathname === "/user" || pathname === "/settings")) return true;
    return pathname === href;
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between bg-white select-none">
      {/* Top Header & Brand */}
      <div>
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={28} priority />
            <div className="flex flex-col">
              <span className="text-base font-black font-nunito tracking-tight text-slate-900 group-hover:text-[#0B6FFB] transition-colors leading-none">
                Vimora
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                Media Suite
              </span>
            </div>
          </Link>

          {/* Hardware Acceleration Indicator */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B6FFB] text-[10px] font-bold"
            title={gpuCaps?.displayName || "Hardware acceleration"}
          >
            <Zap className="w-3 h-3 fill-current shrink-0" />
            <span className="truncate max-w-[65px]">
              {gpuCaps?.hasGpu ? gpuCaps.type.toUpperCase() : "CPU"}
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <p className="px-3 pt-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Workstation
          </p>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-[#0B6FFB] text-white shadow-sm shadow-[#0B6FFB]/30"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-blue-50 text-[#0B6FFB] border border-blue-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pathname === "/admin"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-red-600 hover:bg-red-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Admin Portal</span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-red-100 text-red-700">
                  Staff
                </span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Plan Status, Upgrade Button, User Card & Log Out */}
      <div className="p-3 border-t border-slate-200/80 space-y-2.5 bg-slate-50/40">
        {/* Upgrade Button when applicable (Free Users) */}
        {!isPro && user && (
          <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#0B6FFB] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Vimora Pro
              </span>
              <span className="text-[10px] font-bold text-slate-500">₦4,500/mo</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              Unlock 4K UHD, NVENC GPU acceleration & unlimited batch queue.
            </p>
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1 w-full py-2 px-3 rounded-xl bg-[#0B6FFB] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Upgrade to Pro</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* User Card with Avatar, Email, Plan & Log Out */}
        {user ? (
          <div className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            {/* Clickable Profile Summary */}
            <Link
              href="/user"
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity group"
              title="Open User Profile & Settings"
            >
              {/* User Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B6FFB] to-blue-400 text-white flex items-center justify-center font-black text-xs uppercase shadow-xs">
                  {user.displayName?.substring(0, 2) || user.email.substring(0, 2)}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"
                  title="Online"
                />
              </div>

              {/* Display Name & Email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-extrabold text-slate-900 truncate group-hover:text-[#0B6FFB] transition-colors leading-tight">
                    {user.displayName || "User"}
                  </p>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                      isPro
                        ? "bg-blue-50 text-[#0B6FFB] border border-blue-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isPro ? "★ Pro" : "Free"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </Link>

            {/* User Action Row: Settings & Log Out */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <Link
                href="/user"
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-[#0B6FFB] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors p-1 -mr-1 rounded hover:bg-red-50 cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Guest / Logged out state */
          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 space-y-2">
            <p className="text-xs font-bold text-slate-800">Welcome to Vimora</p>
            <p className="text-[11px] text-slate-500">Sign in to save your history and manage Pro perks.</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/login"
                className="py-1.5 text-center text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="py-1.5 text-center text-xs font-bold rounded-lg bg-[#0B6FFB] text-white hover:bg-blue-600"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Navigation Bar */}
      <aside className="hidden md:block fixed top-0 left-0 h-screen w-64 z-40 border-r border-slate-200/90 shadow-2xs">
        {navContent}
      </aside>

      {/* Mobile Top Header (with hamburger button) */}
      <div className="md:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            title="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Logo size={26} priority />
            <span className="text-base font-black font-nunito tracking-tight text-slate-900">
              Vimora
            </span>
          </Link>
        </div>

        {user ? (
          <Link href="/user" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0B6FFB] text-white flex items-center justify-center font-bold text-xs uppercase">
              {user.displayName?.substring(0, 2) || user.email.substring(0, 2)}
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0B6FFB] text-white"
          >
            Sign In
          </Link>
        )}
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 z-50 bg-white border-r border-slate-200 shadow-2xl md:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {navContent}
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Are you sure you want to log out?</h3>
              <p className="text-xs text-slate-500 mt-1">
                You will be signed out on this device. Your conversion history in local storage remains saved.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

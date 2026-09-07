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
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
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

  const renderNavContent = (collapsed: boolean) => (
    <div className="h-full flex flex-col justify-between bg-white select-none">
      {/* Top Header & Brand */}
      <div>
        <div
          className={`border-b border-slate-200/80 flex items-center transition-all ${
            collapsed ? "p-3 justify-center flex-col gap-2.5" : "p-4 justify-between"
          }`}
        >
          {collapsed ? (
            /* Collapsed Header: Logo on top, 'Vimora' name centered just below, followed by expand button */
            <div className="flex flex-col items-center justify-center w-full gap-2">
              <Link
                href="/"
                className="flex flex-col items-center justify-center group cursor-pointer"
                title="Vimora Home"
              >
                <Logo size={26} priority iconOnly />
                <span className="text-[11px] font-black font-nunito tracking-tight text-slate-900 group-hover:text-[#0B6FFB] transition-colors mt-1.5 text-center leading-none">
                  Vimora
                </span>
              </Link>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer mt-0.5"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          ) : (
            /* Expanded Header: Logo alone with GPU badge and collapse toggle */
            <>
              <Link href="/" className="flex items-center group shrink-0" title="Vimora Home">
                <Logo size={30} priority />
              </Link>

              <div className="hidden md:flex items-center gap-1.5">
                {gpuCaps?.hasGpu && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B6FFB] text-[10px] font-bold"
                    title={gpuCaps.displayName}
                  >
                    <Zap className="w-3 h-3 fill-current shrink-0" />
                    <span className="truncate max-w-[55px]">{gpuCaps.type.toUpperCase()}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation Section */}
        <div className="p-2.5 space-y-1">
          {!collapsed && (
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Workstation
            </p>
          )}

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-xl text-xs font-bold transition-all ${
                      collapsed
                        ? "justify-center p-2.5"
                        : "justify-between px-3 py-2.5"
                    } ${
                      active
                        ? "bg-[#0B6FFB] text-white shadow-sm shadow-[#0B6FFB]/30"
                        : "text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`shrink-0 ${
                          active ? "text-white" : "text-slate-400"
                        } ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </div>

                    {!collapsed && item.badge && (
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

                  {/* Tooltip on hover when collapsed */}
                  {collapsed && (
                    <div className="fixed left-[76px] hidden group-hover:flex z-50 items-center px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-1.5 text-[9px] font-bold px-1 rounded bg-[#0B6FFB] text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isAdmin && (
              <div className="relative group">
                <Link
                  href="/admin"
                  className={`flex items-center rounded-xl text-xs font-bold transition-all ${
                    collapsed
                      ? "justify-center p-2.5"
                      : "justify-between px-3 py-2.5"
                  } ${
                    pathname === "/admin"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-red-600 hover:bg-red-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert
                      className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
                    />
                    {!collapsed && <span>Admin Portal</span>}
                  </div>
                  {!collapsed && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-red-100 text-red-700">
                      Staff
                    </span>
                  )}
                </Link>

                {collapsed && (
                  <div className="fixed left-[76px] hidden group-hover:flex z-50 items-center px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl">
                    <span>Admin Portal</span>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Plan Status, Upgrade Button, User Card & Log Out */}
      <div className="p-2.5 border-t border-slate-200/80 space-y-2 bg-slate-50/40">
        {/* Upgrade Banner for Free Users (Expanded mode) */}
        {!isPro && user && !collapsed && (
          <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#0B6FFB] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Vimora Pro
              </span>
              <span className="text-[10px] font-bold text-slate-500">₦4,500/mo</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              Unlock 4K UHD, NVENC GPU speed & unlimited batch queue.
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

        {/* Upgrade Quick Button (Collapsed mode) */}
        {!isPro && user && collapsed && (
          <div className="relative group flex justify-center">
            <Link
              href="/pricing"
              className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#0B6FFB] hover:bg-[#0B6FFB] hover:text-white flex items-center justify-center transition-all"
              title="Upgrade to Pro"
            >
              <Sparkles className="w-4 h-4" />
            </Link>
            <div className="fixed left-[76px] hidden group-hover:flex z-50 items-center px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl">
              <span>Upgrade to Pro (₦4,500/mo)</span>
            </div>
          </div>
        )}

        {/* User Card */}
        {user ? (
          <div
            className={`rounded-2xl bg-white border border-slate-200/90 shadow-2xs ${
              collapsed ? "p-2 flex flex-col items-center gap-2" : "p-2.5 space-y-2"
            }`}
          >
            {/* Clickable Profile Summary */}
            <div className="relative group w-full">
              <Link
                href="/user"
                className={`flex items-center gap-2.5 hover:opacity-85 transition-opacity ${
                  collapsed ? "justify-center" : ""
                }`}
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

                {!collapsed && (
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
                )}
              </Link>

              {/* Tooltip on hover when collapsed */}
              {collapsed && (
                <div className="fixed left-[76px] hidden group-hover:flex z-50 flex-col px-3 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-xl space-y-1 min-w-[160px]">
                  <p className="font-bold truncate">{user.displayName || user.email.split("@")[0]}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  <div className="pt-1 border-t border-slate-700 flex items-center justify-between text-[10px]">
                    <span className="text-[#0B6FFB] font-bold">{isPro ? "★ Pro Plan" : "Free Plan"}</span>
                    <span className="text-slate-400">View Profile →</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Row */}
            {!collapsed ? (
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
            ) : (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="fixed left-[76px] hidden group-hover:flex z-50 items-center px-2.5 py-1.5 rounded-lg bg-red-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl">
                  <span>Log Out</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Navigation Bar (Collapsible) */}
      <aside
        className={`hidden md:block fixed top-0 left-0 h-screen z-40 border-r border-slate-200/90 shadow-2xs transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile Top Header */}
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
            <Logo size={26} priority iconOnly />
            <span className="text-base font-black font-nunito tracking-tight text-slate-900">
              Vimora
            </span>
          </Link>
        </div>

        {user && (
          <Link href="/user" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0B6FFB] text-white flex items-center justify-center font-bold text-xs uppercase">
              {user.displayName?.substring(0, 2) || user.email.substring(0, 2)}
            </div>
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

      {/* Mobile Slide-Out Drawer (Always full width expanded) */}
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
        {renderNavContent(false)}
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

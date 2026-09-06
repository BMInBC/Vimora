"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/authContext';
import { Logo } from '@/components/Logo';
import { Shield, HardDrive, User, LogOut, LayoutDashboard, History, Settings, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, isPro, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-slate-900/5 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size={28} priority />
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#0B6FFB]/10 text-[#0B6FFB] border border-[#0B6FFB]/20 font-bold">
            GPU Active
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link
            href="/converter"
            className={`transition-colors hover:text-slate-950 ${pathname === '/converter' ? 'text-slate-950 font-semibold' : ''}`}
          >
            Converter
          </Link>
          <Link
            href="/history"
            className={`transition-colors hover:text-slate-950 ${pathname === '/history' ? 'text-slate-950 font-semibold' : ''}`}
          >
            History
          </Link>
          <Link
            href="/pricing"
            className={`transition-colors hover:text-slate-950 ${pathname === '/pricing' ? 'text-slate-950 font-semibold' : ''}`}
          >
            Pricing
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-slate-950 ${pathname === '/dashboard' ? 'text-slate-950 font-semibold' : ''}`}
            >
              Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs px-2.5 py-1 rounded-full bg-red-50 border border-red-200"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </nav>

        {/* Auth / Action CTA */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {user.displayName?.substring(0, 2) || user.email.substring(0, 2)}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium capitalize">
                    {user.plan} Plan
                  </span>
                </div>
              </div>
              <Link
                href="/settings"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-slate-950 text-white hover:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

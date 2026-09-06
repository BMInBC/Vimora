"use client";

import React, { useState } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Logo } from '@/components/Logo';
import { Menu, Zap } from 'lucide-react';
import Link from 'next/link';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#0B6FFB] selection:text-white relative">
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-30 h-14 bg-white/95 border-b border-slate-200 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Logo size={24} priority />
              <span className="font-extrabold text-sm text-slate-900 font-nunito">Vimora</span>
            </Link>
          </div>

          <Link
            href="/pricing"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B6FFB] text-white text-xs font-bold shadow-sm"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>Pro</span>
          </Link>
        </header>

        <div className="flex flex-1 relative">
          {/* Sidebar */}
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

          {/* Main Workspace Area (padded on desktop for fixed sidebar) */}
          <main className="flex-1 md:pl-[240px] transition-all duration-300 flex flex-col min-w-0 bg-white">
            <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/firebase/authContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  Repeat2,
  Minimize2,
  Sparkles,
  ListVideo,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  ArrowUpRight,
  User as UserIcon,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, isPro } = useAuth();
  const { jobs } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const queuedCount = jobs.filter((j) => j.status === 'queued' || j.status === 'converting').length;

  const MAIN_TOOLS = [
    {
      name: 'Convert',
      href: '/convert',
      icon: Repeat2,
      description: 'Change formats & codecs',
      badge: null,
    },
    {
      name: 'Compress',
      href: '/compress',
      icon: Minimize2,
      description: 'Reduce file size & bitrate',
      badge: null,
    },
    {
      name: 'Enhance',
      href: '/enhance',
      icon: Sparkles,
      description: 'Upscale, denoise & tune',
      badge: 'PRO',
    },
  ];

  const SECONDARY_NAV = [
    {
      name: 'Queue',
      href: '/queue',
      icon: ListVideo,
      badge: queuedCount > 0 ? queuedCount.toString() : null,
      badgeColor: 'bg-[#0B6FFB] text-white',
    },
    {
      name: 'History',
      href: '/history',
      icon: History,
      badge: null,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/convert' && (pathname === '/convert' || pathname === '/converter')) return true;
    return pathname === href;
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none bg-white">
      {/* Top Brand & Header */}
      <div>
        <div
          className={`h-16 flex items-center border-b border-slate-200 px-4 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden group focus:outline-none"
            title="Vimora Home"
          >
            <Logo size={28} priority />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-nunito leading-tight group-hover:text-[#0B6FFB] transition-colors">
                  Vimora
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Media Engine
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Tools Section */}
        <div className="px-3 pt-5 pb-2">
          {!isCollapsed && (
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Main Tools
            </p>
          )}

          <nav className="space-y-1">
            {MAIN_TOOLS.map((tool) => {
              const active = isActive(tool.href);
              const Icon = tool.icon;

              return (
                <div key={tool.name} className="relative group">
                  <Link
                    href={tool.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-[#0B6FFB] text-white shadow-md shadow-[#0B6FFB]/25 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`shrink-0 transition-transform ${
                        active ? 'text-white' : 'text-slate-400 group-hover:text-[#0B6FFB]'
                      } ${isCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5'}`}
                    />

                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{tool.name}</span>
                        {tool.badge && (
                          <span
                            className={`ml-2 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              active
                                ? 'bg-white/25 text-white'
                                : 'bg-blue-50 text-[#0B6FFB] border border-blue-200'
                            }`}
                          >
                            {tool.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>

                  {/* Tooltip for Collapsed Mode */}
                  {isCollapsed && (
                    <div className="fixed left-[76px] hidden group-hover:flex z-50 items-center px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl">
                      <span>{tool.name}</span>
                      {tool.badge && (
                        <span className="ml-1.5 text-[9px] font-bold px-1 rounded bg-[#0B6FFB] text-white">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Secondary Navigation Section */}
        <div className="px-3 pt-4">
          {!isCollapsed && (
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
          )}

          <nav className="space-y-1">
            {SECONDARY_NAV.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-[#0B6FFB] text-white shadow-md shadow-[#0B6FFB]/25 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`shrink-0 ${
                        active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                      } ${isCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5'}`}
                    />

                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span
                            className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              active
                                ? 'bg-white/20 text-white'
                                : item.badgeColor || 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>

                  {/* Tooltip for Collapsed Mode */}
                  {isCollapsed && (
                    <div className="fixed left-[76px] hidden group-hover:flex z-50 items-center px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0B6FFB] text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom User Profile, Plan & Upgrade */}
      <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
        {/* Upgrade Banner for Free Users */}
        {!isPro && !isCollapsed && (
          <div className="p-3 rounded-xl bg-blue-50/70 border border-[#0B6FFB]/20">
            <div className="flex items-center gap-1.5 mb-1 text-[#0B6FFB] text-xs font-bold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Unlock GPU Speed</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2 leading-tight">
              Unlimited conversions, 4K & AI enhancement filters.
            </p>
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1 w-full py-1.5 px-2 bg-[#0B6FFB] hover:bg-[#0958CC] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <span>Upgrade to Pro</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* User Card */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-[#0B6FFB] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-none mb-1">
                {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest User')}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                    isPro
                      ? 'bg-blue-50 text-[#0B6FFB] border border-blue-200'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isPro ? '★ Pro' : 'Free'}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                  {user?.email || 'Local mode'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 h-screen z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[260px] z-50 bg-white border-r border-slate-200 shadow-2xl md:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
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
    </>
  );
}

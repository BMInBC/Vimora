"use client";

import React from 'react';
import Link from 'next/link';
import { Crown, X, ArrowRight } from 'lucide-react';

interface UpgradePromptBannerProps {
  message: string;
  onDismiss: () => void;
}

export function UpgradePromptBanner({ message, onDismiss }: UpgradePromptBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-md text-xs"
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#0B6FFB] text-white flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4" />
        </div>
        <p className="text-slate-200 font-medium leading-snug">{message}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B6FFB] hover:bg-[#0958cc] text-white font-bold transition-colors"
        >
          <span>See Pro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss upgrade notice"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { QUICK_ACTIONS } from '@/lib/ffmpeg/presets';
import { QuickActionItem } from '@/lib/types';
import { PlatformIcon } from '@/components/PlatformIcon';

interface QuickActionGridProps {
  activeQuickActionId: string | null;
  activePresetId: string;
  sizeLimitMode: 'auto' | 'limit';
  onSelectQuickAction: (action: QuickActionItem) => void;
}

export function QuickActionGrid({
  activeQuickActionId,
  activePresetId,
  sizeLimitMode,
  onSelectQuickAction,
}: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {QUICK_ACTIONS.map((action) => {
        const isSelected =
          activeQuickActionId === action.id ||
          (activeQuickActionId === null &&
            ((action.id === 'compress_target' && sizeLimitMode === 'limit' && activePresetId === 'original_balanced') ||
              (action.id !== 'compress_target' && action.presetId === activePresetId)));

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelectQuickAction(action)}
            className={`group text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
              isSelected
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-[#0B6FFB]/30'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div
                className={`p-1 rounded-xl shrink-0 ${
                  isSelected ? 'bg-white/10' : 'bg-slate-50 border border-slate-100'
                }`}
              >
                <PlatformIcon id={action.iconId} size={24} />
              </div>
              {action.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold shrink-0 ${
                    isSelected
                      ? 'bg-[#0B6FFB] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {action.badge}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p
                className={`text-xs sm:text-sm font-extrabold truncate ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`}
              >
                {action.label}
              </p>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {action.subtitle}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

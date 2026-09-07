"use client";

import React from 'react';
import { MediaFileInfo, ConversionOptions, CreatorPreset, GpuCapabilities } from '@/lib/types';
import { getPlannedChanges } from '@/lib/ffmpeg/changes';
import { Check } from 'lucide-react';

interface ConversionChangesPreviewProps {
  file: MediaFileInfo;
  options: ConversionOptions;
  preset?: CreatorPreset;
  gpuCaps?: GpuCapabilities | null;
  isPro?: boolean;
  variant?: 'card' | 'inline' | 'modal';
  defaultExpanded?: boolean;
  onFormatChange?: (format: any) => void;
}

export function ConversionChangesPreview({
  file,
  options,
  preset,
  gpuCaps,
  isPro = false,
  variant = 'card',
}: ConversionChangesPreviewProps) {
  const changes = getPlannedChanges(file, options, preset, gpuCaps, isPro);

  if (changes.length === 0) {
    return null;
  }

  // Inline Variant (compact view inside individual job cards)
  if (variant === 'inline') {
    return (
      <div className="mt-2.5 pt-2.5 border-t border-slate-100/90 animate-in fade-in-0 duration-150">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
            Will Change:
          </span>
          {changes.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
              <span>{item.title}</span>
              {item.value && (
                <span className="font-mono text-[11px] font-bold text-emerald-700 ml-0.5">
                  ({item.value})
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Full Card Variant (if rendered as a card)
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs transition-all">
      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 font-nunito">
            What Will Change
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            for <span className="font-semibold text-slate-600">{file.name}</span>
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-600">
          {changes.length} Changes
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {changes.map((change) => (
          <div
            key={change.id}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
            <span className="truncate">{change.title}</span>
            {change.value && (
              <span className="text-xs font-mono font-bold text-emerald-700 ml-auto shrink-0">
                {change.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

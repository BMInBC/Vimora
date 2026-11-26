"use client";

import React from 'react';
import { GpuCapabilities } from '@/lib/types';
import { ShieldCheck, Cpu, Zap, RefreshCw } from 'lucide-react';

interface WorkstationStatusStripProps {
  gpuCaps: GpuCapabilities | null;
  onRecheckHardware?: () => void;
  isRechecking?: boolean;
}

export function getGpuBadgeLabel(gpuCaps: GpuCapabilities | null): string {
  if (!gpuCaps) {
    return 'Checking local hardware…';
  }
  if (!gpuCaps.hasGpu || gpuCaps.type === 'cpu') {
    return 'Using CPU encoding.';
  }
  switch (gpuCaps.type) {
    case 'nvenc':
      return 'GPU acceleration available: NVIDIA NVENC';
    case 'qsv':
      return 'GPU acceleration available: Intel Quick Sync';
    case 'amf':
      return 'GPU acceleration available: AMD AMF';
    case 'videotoolbox':
      return 'GPU acceleration available: Apple VideoToolbox';
    default:
      return 'Using CPU encoding.';
  }
}

export function WorkstationStatusStrip({
  gpuCaps,
  onRecheckHardware,
  isRechecking = false,
}: WorkstationStatusStripProps) {
  const hasGpu = Boolean(gpuCaps?.hasGpu && gpuCaps.type !== 'cpu');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200/90 text-xs">
      <div className="flex items-center gap-2 text-slate-700 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>Your files are processed on this device. No uploads, no watermarks.</span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border ${
            hasGpu
              ? 'bg-blue-50/70 text-[#0B6FFB] border-blue-200/80'
              : 'bg-slate-50 text-slate-600 border-slate-200/80'
          }`}
        >
          {hasGpu ? (
            <Zap className="w-3.5 h-3.5 text-[#0B6FFB] shrink-0" aria-hidden="true" />
          ) : (
            <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          )}
          <span>{getGpuBadgeLabel(gpuCaps)}</span>
        </div>

        {onRecheckHardware && (
          <button
            type="button"
            onClick={onRecheckHardware}
            disabled={isRechecking}
            title="Re-check local GPU encoders"
            aria-label="Re-check local hardware encoders"
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

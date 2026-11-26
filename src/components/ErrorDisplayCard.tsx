"use client";

import React, { useState } from 'react';
import { mapFfmpegError } from '@/lib/ffmpeg/errorMapper';
import { AlertCircle, ChevronDown, RotateCcw } from 'lucide-react';

interface ErrorDisplayCardProps {
  rawError?: string;
  onRetryWithDifferentSettings?: () => void;
}

export function ErrorDisplayCard({
  rawError,
  onRetryWithDifferentSettings,
}: ErrorDisplayCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const mapped = mapFfmpegError(rawError);

  return (
    <div
      role="alert"
      className="w-full mt-2 rounded-xl bg-red-50/85 border border-red-200 p-3.5 text-xs text-red-950 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <p className="font-extrabold text-red-900">{mapped.title}</p>
            <p className="text-red-800">{mapped.explanation}</p>
            <p className="text-[11px] text-red-700">
              <strong>Likely cause:</strong> {mapped.likelyCause}
            </p>
            <p className="text-[11px] text-red-900 font-semibold">
              <strong>Recommended fix:</strong> {mapped.recommendedAction}
            </p>
          </div>
        </div>

        {onRetryWithDifferentSettings && (
          <button
            type="button"
            onClick={onRetryWithDifferentSettings}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-red-200 text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry with different settings</span>
          </button>
        )}
      </div>

      {mapped.technicalDetails && (
        <div className="pt-1 border-t border-red-200/70">
          <button
            type="button"
            onClick={() => setShowTechnical((prev) => !prev)}
            aria-expanded={showTechnical}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-900 cursor-pointer"
          >
            <span>Technical details</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showTechnical ? 'rotate-180' : ''}`}
            />
          </button>
          {showTechnical && (
            <pre className="mt-1.5 p-2 rounded-lg bg-red-950/90 text-red-100 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
              {mapped.technicalDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

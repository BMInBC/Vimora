"use client";

import React from 'react';
import {
  MediaFileInfo,
  ConversionOptions,
  CreatorPreset,
  GpuCapabilities,
} from '@/lib/types';
import {
  getPlannedChanges,
  estimateConversionSeconds,
  formatEtaLabel,
} from '@/lib/ffmpeg/changes';
import { generateOutputFilename } from '@/lib/ffmpeg/filenamePattern';
import { Check, Clock, FileOutput, Sparkles } from 'lucide-react';

interface ConversionChangesPreviewProps {
  file: MediaFileInfo;
  options: ConversionOptions;
  preset?: CreatorPreset;
  gpuCaps?: GpuCapabilities | null;
  isPro?: boolean;
  filenamePattern?: string;
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
  filenamePattern,
  variant = 'card',
}: ConversionChangesPreviewProps) {
  const changes = getPlannedChanges(file, options, preset, gpuCaps, isPro);

  if (changes.length === 0) {
    return null;
  }

  const outputExt = (options.outputFormat || preset?.outputFormat || 'mp4').toLowerCase();
  const isAudioOnly = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(outputExt);
  const isGpu = Boolean(
    gpuCaps?.hasGpu && gpuCaps.type !== 'cpu' && !(options.targetSizeMb && options.strictTwoPass)
  );
  const isTwoPass = Boolean(
    options.targetSizeMb && (!isGpu || options.strictTwoPass) && !isAudioOnly
  );
  const etaSeconds = estimateConversionSeconds(
    file.durationSeconds,
    isGpu,
    isAudioOnly,
    isTwoPass
  );
  const predictedFilename = generateOutputFilename({
    originalFileName: file.name,
    outputFormat: outputExt,
    preset,
    resolution: options.resolution || preset?.resolution,
    pattern: filenamePattern,
  });

  if (variant === 'inline') {
    return (
      <div className="mt-2.5 pt-2.5 border-t border-slate-100/90 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 truncate">
            <FileOutput className="w-3.5 h-3.5 text-[#0B6FFB] shrink-0" />
            <span className="truncate">{predictedFilename}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600 shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Est. {formatEtaLabel(etaSeconds)}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            What will change:
          </span>
          {changes.map((item) => (
            <span
              key={item.id}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                item.isUnchanged ? 'text-slate-600' : 'text-emerald-700'
              }`}
            >
              <Check
                className={`w-3.5 h-3.5 stroke-[3] shrink-0 ${
                  item.isUnchanged ? 'text-slate-400' : 'text-emerald-600'
                }`}
              />
              <span>{item.title}:</span>
              <span className="font-mono text-[11px] font-bold">{item.value}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#0B6FFB] shrink-0" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            What Will Change
          </h3>
          <span className="text-[11px] text-slate-500 truncate">
            → <span className="font-mono font-semibold text-slate-700">{predictedFilename}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            Est. {formatEtaLabel(etaSeconds)}
          </span>
          {options.quality && (
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0B6FFB] capitalize">
              {options.quality === 'smaller'
                ? 'Smallest'
                : options.quality === 'high'
                ? 'Best quality'
                : 'Balanced'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {changes.map((change) => (
          <div
            key={change.id}
            className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col gap-0.5"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {change.title}
            </span>
            <span
              className={`text-xs font-mono font-bold truncate ${
                change.isUnchanged ? 'text-slate-700' : 'text-emerald-700'
              }`}
              title={change.value}
            >
              {change.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

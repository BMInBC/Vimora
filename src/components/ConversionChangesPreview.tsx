"use client";

import React, { useState } from 'react';
import { MediaFileInfo, ConversionOptions, CreatorPreset, GpuCapabilities } from '@/lib/types';
import { getPlannedChanges, ConversionChangeItem } from '@/lib/ffmpeg/changes';
import { PlatformIcon } from './PlatformIcon';
import {
  FileVideo,
  Maximize2,
  Cpu,
  Clock,
  Volume2,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

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
  defaultExpanded = true,
}: ConversionChangesPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const changes = getPlannedChanges(file, options, preset, gpuCaps, isPro);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'format':
        return <FileVideo className="w-4 h-4 text-[#0B6FFB]" />;
      case 'resolution':
        return <Maximize2 className="w-4 h-4 text-purple-600" />;
      case 'codec':
        return <Cpu className="w-4 h-4 text-emerald-600" />;
      case 'fps':
        return <Clock className="w-4 h-4 text-cyan-600" />;
      case 'bitrate':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'audio':
      case 'audio_norm':
        return <Volume2 className="w-4 h-4 text-blue-500" />;
      default:
        return <Sliders className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cyan':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'blue':
        return 'bg-blue-50 text-[#0B6FFB] border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (variant === 'inline') {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in-0 duration-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-[#0B6FFB]" />
            <span>Planned Changes ({changes.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>Hide breakdown <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Show details <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        </div>

        {/* Quick summary pill strip */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {changes.slice(0, 4).map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80"
            >
              <span className="text-slate-500">{c.title.split(' ')[0]}:</span>
              <strong className="text-slate-900">{c.after.split('(')[0].trim()}</strong>
            </span>
          ))}
          {changes.length > 4 && (
            <span className="text-[10px] font-medium text-slate-400 px-1 py-0.5">
              +{changes.length - 4} more
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70 mt-2">
            {changes.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 py-1.5 border-b border-slate-200/60 last:border-0 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0 p-1 rounded-md bg-white border border-slate-200 shadow-2xs">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{item.title}</span>
                    <p className="text-[11px] text-slate-500 leading-tight">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-right shrink-0 mt-1 sm:mt-0 font-mono text-[11px]">
                  <span className="text-slate-500">{item.before}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {item.after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full Card Variant (Featured above the queue list)
  return (
    <div className="bg-gradient-to-br from-white to-slate-50/90 rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B6FFB] shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold font-nunito text-slate-900 tracking-tight">
                What Will Change
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0B6FFB] border border-blue-200">
                {changes.length} Transformations Scheduled
              </span>
              {gpuCaps?.hasGpu && isPro && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Zap className="w-3 h-3 fill-current" />
                  GPU {gpuCaps.type.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Previewing planned encoding output for <strong className="text-slate-800">{file.name}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          {isExpanded ? (
            <>Collapse Details <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Expand All Changes <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>

      {/* Quick Summary Comparison Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Format Container
          </span>
          <div className="flex items-center gap-1 text-xs font-mono font-bold">
            <span className="text-slate-500 uppercase">.{file.format || 'src'}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-[#0B6FFB] uppercase">.{options.outputFormat}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Resolution
          </span>
          <div className="text-xs font-mono font-bold text-slate-900 truncate">
            {options.resolution || preset?.resolution || (file.width ? `${file.width}×${file.height}` : 'Original 1:1')}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Video Encoder
          </span>
          <div className="text-xs font-mono font-bold text-emerald-700 truncate">
            {gpuCaps?.hasGpu && isPro ? `${gpuCaps.type.toUpperCase()} GPU` : 'CPU (x264)'}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Audio Stream
          </span>
          <div className="text-xs font-mono font-bold text-slate-900 truncate">
            {(options.audioCodec || preset?.audioCodec || 'AAC').toUpperCase()} ({options.audioBitrate || preset?.audioBitrate || '320k'})
          </div>
        </div>
      </div>

      {/* Expanded Change Items Breakdown */}
      {isExpanded && (
        <div className="mt-1 divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-2xs">
          {changes.map((change) => (
            <div
              key={change.id}
              className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 mt-0.5 sm:mt-0">
                  {getCategoryIcon(change.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 font-nunito">
                      {change.title}
                    </span>
                    {change.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeClass(
                          change.badgeColor
                        )}`}
                      >
                        {change.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {change.description}
                  </p>
                </div>
              </div>

              {/* Before vs After Pill */}
              <div className="flex items-center gap-2 self-start md:self-center shrink-0 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-500">{change.before}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {change.after}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

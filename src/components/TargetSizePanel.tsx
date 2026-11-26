"use client";

import React, { useMemo, useState } from 'react';
import {
  MediaFileInfo,
  OutputFormat,
  QualityPreset,
  TargetSizeRecoveryAction,
  VideoCodec,
} from '@/lib/types';
import { calculateTargetSizeBudget } from '@/lib/ffmpeg/bitrateBudget';
import {
  HardDrive,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Clock,
} from 'lucide-react';

interface TargetSizePanelProps {
  mode: 'auto' | 'limit';
  targetSizeMb: number;
  targetSizeInput: string;
  selectedSizePreset: 'auto' | 'discord' | 'whatsapp' | 'email' | 'social' | 'custom';
  qualityPreference: QualityPreset;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSizeSettingChange: (
    mode: 'auto' | 'limit',
    presetKey: 'auto' | 'discord' | 'whatsapp' | 'email' | 'social' | 'custom',
    mbValue: number,
    syncInput?: boolean
  ) => void;
  onTargetSizeInputChange: (val: string) => void;
  onQualityPreferenceChange: (quality: QualityPreset) => void;
  strictTwoPass: boolean;
  onStrictTwoPassChange: (enabled: boolean) => void;
  hasGpu: boolean;
  onApplyRecoveryAction: (action: TargetSizeRecoveryAction) => void;
  sampleFile?: MediaFileInfo;
  outputFormat: OutputFormat;
  resolution?: string;
  fps?: number;
  videoCodec?: VideoCodec;
  keepAudio?: boolean;
}

const QUICK_SIZE_CHOICES: {
  id: 'email' | 'whatsapp' | 'discord' | 'social' | 'custom';
  label: string;
  hint: string;
  mb: number;
}[] = [
  { id: 'email', label: '10 MB', hint: 'Email', mb: 10 },
  { id: 'whatsapp', label: '16 MB', hint: 'WhatsApp', mb: 16 },
  { id: 'discord', label: '20 MB', hint: 'Discord', mb: 20 },
  { id: 'social', label: '50 MB', hint: 'Telegram', mb: 50 },
  { id: 'custom', label: '100 MB', hint: 'Large share', mb: 100 },
];

const QUALITY_PREFERENCES: { id: QualityPreset; label: string; desc: string }[] = [
  { id: 'smaller', label: 'Smallest file', desc: 'Extra safety margin under target' },
  { id: 'balanced', label: 'Balanced', desc: 'Recommended size & sharpness' },
  { id: 'high', label: 'Best quality', desc: 'Uses full MB budget' },
];

function formatBytesMb(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return 'Unknown';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function TargetSizePanel({
  mode,
  targetSizeMb,
  targetSizeInput,
  selectedSizePreset,
  qualityPreference,
  isExpanded,
  onToggleExpand,
  onSizeSettingChange,
  onTargetSizeInputChange,
  onQualityPreferenceChange,
  strictTwoPass,
  onStrictTwoPassChange,
  hasGpu,
  onApplyRecoveryAction,
  sampleFile,
  outputFormat,
  resolution,
  fps,
  videoCodec,
  keepAudio = true,
}: TargetSizePanelProps) {
  const [manualDurationSec, setManualDurationSec] = useState<string>('');

  const effectiveDuration = useMemo(() => {
    if (sampleFile?.durationSeconds && sampleFile.durationSeconds > 0) {
      return sampleFile.durationSeconds;
    }
    const parsed = parseFloat(manualDurationSec);
    return !isNaN(parsed) && parsed > 0 ? parsed : 0;
  }, [sampleFile?.durationSeconds, manualDurationSec]);

  const parsedDimensions = useMemo(() => {
    if (resolution) {
      const parts = resolution.split('x');
      if (parts.length === 2) {
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h)) return { width: w, height: h };
      }
    }
    return { width: sampleFile?.width, height: sampleFile?.height };
  }, [resolution, sampleFile?.width, sampleFile?.height]);

  const budget = useMemo(() => {
    if (mode !== 'limit') return null;
    return calculateTargetSizeBudget({
      targetSizeMb,
      durationSeconds: effectiveDuration,
      sourceSizeBytes: sampleFile?.sizeBytes,
      width: parsedDimensions.width,
      height: parsedDimensions.height,
      fps: fps || sampleFile?.fps,
      outputFormat,
      videoCodec,
      keepAudio,
      hasAudio: sampleFile?.hasAudio ?? true,
      qualityPreference,
    });
  }, [
    mode,
    targetSizeMb,
    effectiveDuration,
    sampleFile?.sizeBytes,
    sampleFile?.fps,
    sampleFile?.hasAudio,
    parsedDimensions.width,
    parsedDimensions.height,
    fps,
    outputFormat,
    videoCodec,
    keepAudio,
    qualityPreference,
  ]);

  const feasibilityBadge = useMemo(() => {
    if (!budget) return null;
    switch (budget.feasibility) {
      case 'optimal':
        return {
          label: 'Achievable • Optimal',
          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'moderate':
        return {
          label: 'Achievable • Balanced',
          cls: 'bg-blue-50 text-[#0B6FFB] border-blue-200',
          icon: CheckCircle2,
        };
      case 'tight':
        return {
          label: 'Tight Budget • Quality Warning',
          cls: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: AlertTriangle,
        };
      case 'impossible':
        return {
          label: 'Target Too Small',
          cls: 'bg-red-50 text-red-700 border-red-200',
          icon: AlertCircle,
        };
    }
  }, [budget]);

  return (
    <div className="pt-3.5 border-t border-slate-100">
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all">
        {/* Header */}
        <div
          onClick={onToggleExpand}
          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white hover:bg-slate-50 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0B6FFB]/10 text-[#0B6FFB] flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900">
                  Compress to target size
                </span>
                {mode === 'auto' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                    Auto (Off)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0B6FFB] border border-blue-200 inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#0B6FFB] stroke-[3]" />
                    Target ≤ {targetSizeMb} MB
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {mode === 'auto'
                  ? 'Export at preset quality. Turn on to hit an exact MB limit for WhatsApp, Discord, or email.'
                  : budget
                  ? `${budget.qualityImpactLabel} • Est. ~${budget.estimatedOutputMb} MB`
                  : `Automatically budgets video & audio bitrates under ${targetSizeMb} MB.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label={isExpanded ? 'Collapse compress to target size' : 'Expand compress to target size'}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Body */}
        {isExpanded && (
          <div className="p-4 pt-3 border-t border-slate-100 bg-white space-y-4">
            {/* Mode Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSizeSettingChange('auto', 'auto', targetSizeMb)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                  mode === 'auto'
                    ? 'border-[#0B6FFB] bg-blue-50/40 ring-1 ring-[#0B6FFB]'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    mode === 'auto' ? 'border-[#0B6FFB] bg-[#0B6FFB]' : 'border-slate-300 bg-white'
                  }`}
                >
                  {mode === 'auto' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">Standard preset quality</span>
                  <span className="text-[11px] text-slate-500 block truncate">No fixed MB ceiling</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSizeSettingChange(
                    'limit',
                    selectedSizePreset === 'auto' ? 'discord' : selectedSizePreset,
                    targetSizeMb || 25
                  )
                }
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                  mode === 'limit'
                    ? 'border-[#0B6FFB] bg-blue-50/40 ring-1 ring-[#0B6FFB]'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    mode === 'limit' ? 'border-[#0B6FFB] bg-[#0B6FFB]' : 'border-slate-300 bg-white'
                  }`}
                >
                  {mode === 'limit' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">Compress to target size</span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    Auto-calculate bitrates to fit your MB budget
                  </span>
                </div>
              </button>
            </div>

            {mode === 'limit' && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Quick Size Choices: 10, 16, 25, 50, 100, Custom */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Target size (MB)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Custom:</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={4000}
                          value={targetSizeInput}
                          aria-label="Custom target file size in megabytes"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value;
                            onTargetSizeInputChange(raw);
                            if (raw.trim() === '') return;
                            const val = parseInt(raw, 10);
                            if (!isNaN(val) && val > 0) {
                              onSizeSettingChange('limit', 'custom', val, false);
                            }
                          }}
                          onBlur={() => {
                            const val = parseInt(targetSizeInput, 10);
                            if (isNaN(val) || val <= 0) {
                              const fallback = targetSizeMb > 0 ? targetSizeMb : 25;
                              onTargetSizeInputChange(fallback.toString());
                              onSizeSettingChange('limit', 'custom', fallback, true);
                            } else {
                              onSizeSettingChange('limit', 'custom', val, true);
                            }
                          }}
                          className="w-20 pl-2.5 pr-7 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B6FFB]/20 focus:border-[#0B6FFB]"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 font-mono pointer-events-none">
                          MB
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {QUICK_SIZE_CHOICES.map((choice) => {
                      const active = targetSizeMb === choice.mb;
                      return (
                        <button
                          key={choice.mb}
                          type="button"
                          onClick={() => onSizeSettingChange('limit', choice.id, choice.mb, true)}
                          className={`px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <span className="block text-xs font-extrabold font-mono">{choice.label}</span>
                          <span
                            className={`block text-[10px] ${
                              active ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {choice.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quality Preference */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Quality preference</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {QUALITY_PREFERENCES.map((pref) => {
                      const active =
                        qualityPreference === pref.id ||
                        (pref.id === 'balanced' && qualityPreference === 'custom');
                      return (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={() => onQualityPreferenceChange(pref.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            active
                              ? 'border-[#0B6FFB] bg-blue-50/40 ring-1 ring-[#0B6FFB]'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-900 block">{pref.label}</span>
                          <span className="text-[11px] text-slate-500 block">{pref.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rate Control & Two-Pass Strategy */}
                {!budget?.isAudioOnly && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        Strict 2-pass size accuracy (CPU)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {strictTwoPass || !hasGpu
                          ? 'Active: Uses standard FFmpeg 2-pass CPU encoding for the tightest MB accuracy.'
                          : 'Off: Uses fast hardware-native GPU multipass VBR (NVENC / QSV / AMF / VideoToolbox). Enable for strictest size accuracy.'}
                      </span>
                    </div>
                    {hasGpu ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={strictTwoPass}
                        aria-label="Use strict 2-pass CPU encoding for target size accuracy"
                        onClick={() => onStrictTwoPassChange(!strictTwoPass)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          strictTwoPass ? 'bg-[#0B6FFB]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-xs transform transition-transform ${
                            strictTwoPass ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono text-[10px] font-bold shrink-0">
                        2-Pass CPU Auto
                      </span>
                    )}
                  </div>
                )}

                {/* Optional Duration Awareness (when no file duration is probed yet) */}
                {(!sampleFile || !sampleFile.durationSeconds) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Optional: enter clip length (seconds) to preview exact bitrate before importing</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={36000}
                      value={manualDurationSec}
                      onChange={(e) => setManualDurationSec(e.target.value)}
                      placeholder="e.g. 60"
                      aria-label="Optional duration in seconds for bitrate preview"
                      className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                )}

                {/* Live Pre-Conversion Budget Breakdown */}
                {budget && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                        <Sparkles className="w-3.5 h-3.5 text-[#0B6FFB]" />
                        <span>Bitrate Budget & Size Estimate</span>
                        {effectiveDuration > 0 && (
                          <span className="font-mono text-[11px] font-medium text-slate-500">
                            ({formatDuration(effectiveDuration)})
                          </span>
                        )}
                      </div>

                      {feasibilityBadge && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${feasibilityBadge.cls}`}
                        >
                          <feasibilityBadge.icon className="w-3 h-3 shrink-0" />
                          <span>{feasibilityBadge.label}</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Source size
                        </span>
                        <span className="font-mono font-extrabold text-slate-900 text-sm">
                          {formatBytesMb(sampleFile?.sizeBytes)}
                        </span>
                      </div>

                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Target limit
                        </span>
                        <span className="font-mono font-extrabold text-[#0B6FFB] text-sm">
                          ≤ {budget.targetSizeMb} MB
                        </span>
                      </div>

                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Estimated output
                        </span>
                        <span className="font-mono font-extrabold text-slate-900 text-sm">
                          ~{budget.estimatedOutputMb} MB
                        </span>
                      </div>

                      <div className="bg-white rounded-lg p-2.5 border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Auto bitrate
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">
                          {budget.isAudioOnly
                            ? `Audio: ${budget.audioBitrateKbps}k`
                            : `V: ${budget.videoBitrateKbps}k • A: ${budget.audioBitrateKbps}k`}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium">
                      <strong className="text-slate-800">Quality impact:</strong> {budget.qualityImpactLabel}
                    </p>

                    {/* Warning + Recovery Actions when tight or impossible */}
                    {budget.warning && (
                      <div
                        className={`p-3 rounded-xl border space-y-2.5 ${
                          budget.feasibility === 'impossible'
                            ? 'bg-red-50/80 border-red-200 text-red-800'
                            : 'bg-amber-50/80 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-start gap-2 text-xs font-semibold">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{budget.warning}</span>
                        </div>

                        {budget.recoveryActions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {budget.recoveryActions.map((action) => (
                              <button
                                key={action.type}
                                type="button"
                                onClick={() => onApplyRecoveryAction(action)}
                                title={action.description}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-300/80 text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

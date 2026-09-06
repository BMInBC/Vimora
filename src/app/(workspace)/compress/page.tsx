"use client";

import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { MediaImportArea } from '@/components/workspace/MediaImportArea';
import { BeforeAfterPreview } from '@/components/workspace/BeforeAfterPreview';
import { useRouter } from 'next/navigation';
import { PlatformIcon } from '@/components/PlatformIcon';
import {
  Minimize2,
  HardDrive,
  Sliders,
  CheckCircle2,
  Zap,
  Percent,
  ArrowRight,
  Mail,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  Info,
} from 'lucide-react';

export default function CompressPage() {
  const {
    selectedFile,
    mediaInfo,
    compressSettings,
    setCompressSettings,
    addJobFromCurrentTool,
    formatSize,
  } = useWorkspace();
  const router = useRouter();

  const originalSizeBytes = mediaInfo?.sizeBytes || 50 * 1024 * 1024; // fallback for calculation

  // Estimate output size based on current mode and quality goal
  const goal = compressSettings.qualityGoal || 'enhance';
  let estimatedSizeBytes = originalSizeBytes * 0.5;

  if (compressSettings.mode === 'target_size' && compressSettings.targetSizeMb) {
    estimatedSizeBytes = Math.min(originalSizeBytes, compressSettings.targetSizeMb * 1024 * 1024);
  } else if (compressSettings.mode === 'percentage' && compressSettings.reductionPercent) {
    const goalRatio = goal === 'enhance' ? 0.9 : goal === 'reduce' ? 1.1 : 1.0;
    const baseSavings = (compressSettings.reductionPercent / 100) * goalRatio;
    estimatedSizeBytes = Math.round(originalSizeBytes * Math.max(0.1, 1 - baseSavings));
  } else if (compressSettings.mode === 'quality') {
    const mult = compressSettings.qualityLevel === 'small' ? 0.3 : compressSettings.qualityLevel === 'ultra' ? 0.75 : 0.5;
    const goalMult = goal === 'enhance' ? 1.1 : goal === 'reduce' ? 0.8 : 1.0;
    estimatedSizeBytes = Math.round(originalSizeBytes * mult * goalMult);
  } else {
    const goalMult = goal === 'enhance' ? 0.6 : goal === 'reduce' ? 0.35 : 0.5;
    estimatedSizeBytes = Math.round(originalSizeBytes * goalMult);
  }

  const savingsPercent = Math.max(
    0,
    Math.round(((originalSizeBytes - estimatedSizeBytes) / originalSizeBytes) * 100)
  );

  const handleAddToQueue = () => {
    addJobFromCurrentTool('compress');
    router.push('/queue');
  };

  const handleProcessNow = () => {
    addJobFromCurrentTool('compress');
    router.push('/queue');
  };

  const QUICK_PRESETS = [
    { label: 'Discord Free (<25MB)', mb: 24, iconId: 'discord_compress' },
    { label: 'WhatsApp (<16MB)', mb: 15, iconId: 'whatsapp_compress' },
    { label: 'Email Attachment (<10MB)', mb: 9, isMail: true },
    { label: 'Ultra Compact (<5MB)', mb: 4.8, isCompact: true },
  ];

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200">
              <Minimize2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-nunito tracking-tight">
              Smart Media Compressor
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reduce file size drastically with customizable visual quality — enhance clarity, preserve source look, or maximize compression.
          </p>
        </div>

        {/* Live Savings Pill */}
        {selectedFile && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0B6FFB] text-xs font-bold self-start sm:self-auto">
            <span>Estimated Savings:</span>
            <span className="text-[#0B6FFB] font-extrabold text-sm">~{savingsPercent}%</span>
          </div>
        )}
      </div>

      {/* Shared Drag & Drop File Area */}
      <MediaImportArea toolLabel="compress" />

      {/* 1. Quality vs Size Preference Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 font-nunito tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0B6FFB]" />
              Video Quality & Visual Detail Preference
            </h3>
            <p className="text-xs text-slate-500">
              Decide whether to improve clarity, maintain source fidelity, or aggressively reduce quality for smaller size.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0B6FFB] border border-blue-200 self-start sm:self-auto">
            {compressSettings.qualityGoal === 'enhance'
              ? '✨ Smart Clarity Boost Active'
              : compressSettings.qualityGoal === 'reduce'
              ? '📉 Maximum Size Reduction Active'
              : '⚖️ Balanced Fidelity Active'}
          </span>
        </div>

        {/* 3 Quality Goal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Improve Quality */}
          <button
            type="button"
            onClick={() =>
              setCompressSettings((prev) => ({
                ...prev,
                qualityGoal: 'enhance',
                clarityBoost: prev.clarityBoost || 'crisp',
                colorPolish: prev.colorPolish ?? true,
                denoiseArtifacts: prev.denoiseArtifacts ?? true,
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              compressSettings.qualityGoal === 'enhance'
                ? 'bg-blue-50/70 border-[#0B6FFB] shadow-sm ring-1 ring-[#0B6FFB]/30'
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0B6FFB] text-white">
                  ✨ Recommended
                </span>
                <Sparkles className="w-4 h-4 text-[#0B6FFB]" />
              </div>
              <h4 className="text-xs font-black text-slate-900">
                Improve Quality & Clarity
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Applies adaptive edge sharpening, clears source noise, and enriches colors while shrinking file size with modern CRF encoding.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-[10px] font-bold text-[#0B6FFB]">
              <span>Sharper details</span>
              <span>~30-50% smaller</span>
            </div>
          </button>

          {/* Card 2: Preserve Quality */}
          <button
            type="button"
            onClick={() =>
              setCompressSettings((prev) => ({
                ...prev,
                qualityGoal: 'preserve',
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              compressSettings.qualityGoal === 'preserve'
                ? 'bg-blue-50/70 border-[#0B6FFB] shadow-sm ring-1 ring-[#0B6FFB]/30'
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  ⚖️ Standard
                </span>
                <ShieldCheck className="w-4 h-4 text-slate-600" />
              </div>
              <h4 className="text-xs font-black text-slate-900">
                Preserve Original Quality
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Keeps visual appearance virtually identical to the original source while removing bloated bitrate with efficient compression.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>Source fidelity</span>
              <span>~40-60% smaller</span>
            </div>
          </button>

          {/* Card 3: Reduce Quality */}
          <button
            type="button"
            onClick={() =>
              setCompressSettings((prev) => ({
                ...prev,
                qualityGoal: 'reduce',
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              compressSettings.qualityGoal === 'reduce'
                ? 'bg-blue-50/70 border-[#0B6FFB] shadow-sm ring-1 ring-[#0B6FFB]/30'
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  📉 Extreme Shrink
                </span>
                <TrendingDown className="w-4 h-4 text-slate-600" />
              </div>
              <h4 className="text-xs font-black text-slate-900">
                Reduce Quality (Max Compression)
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Aggressively compresses the video to achieve the absolute smallest MB count for Discord, WhatsApp or email attachment limits.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>Fastest sharing</span>
              <span>~70-85% smaller</span>
            </div>
          </button>
        </div>

        {/* Detail Controls when 'Improve Quality' is chosen */}
        {compressSettings.qualityGoal === 'enhance' && (
          <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#0B6FFB]" />
                Clarity & Detail Boost Strength:
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'subtle', label: 'Subtle' },
                  { id: 'crisp', label: 'Crisp (Recommended)' },
                  { id: 'ultra', label: 'Ultra Detail' },
                ].map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() =>
                      setCompressSettings((prev) => ({
                        ...prev,
                        clarityBoost: level.id as any,
                      }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (compressSettings.clarityBoost || 'crisp') === level.id
                        ? 'bg-[#0B6FFB] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-100/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={compressSettings.colorPolish !== false}
                  onChange={(e) =>
                    setCompressSettings((prev) => ({
                      ...prev,
                      colorPolish: e.target.checked,
                    }))
                  }
                  className="accent-[#0B6FFB] w-4 h-4 rounded cursor-pointer"
                />
                <span>Dynamic contrast & color vibrance polish</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={compressSettings.denoiseArtifacts !== false}
                  onChange={(e) =>
                    setCompressSettings((prev) => ({
                      ...prev,
                      denoiseArtifacts: e.target.checked,
                    }))
                  }
                  className="accent-[#0B6FFB] w-4 h-4 rounded cursor-pointer"
                />
                <span>Clean source compression noise & artifacts</span>
              </label>
            </div>
          </div>
        )}

        {/* Detail Controls when 'Reduce Quality' is chosen */}
        {compressSettings.qualityGoal === 'reduce' && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Prioritizing minimal file size. Lower bitrate CRF 29-32 applied.</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={compressSettings.downscaleIfLarge ?? false}
                onChange={(e) =>
                  setCompressSettings((prev) => ({
                    ...prev,
                    downscaleIfLarge: e.target.checked,
                  }))
                }
                className="accent-[#0B6FFB] w-4 h-4 rounded cursor-pointer"
              />
              <span>Smart 720p downscale if &gt;1080p</span>
            </label>
          </div>
        )}
      </div>

      {/* 2. Compression Strategy & Size Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mode Selector Tabs */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Compression Target
          </h3>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setCompressSettings((prev) => ({ ...prev, mode: 'target_size' }))}
              className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                compressSettings.mode === 'target_size'
                  ? 'bg-blue-50 border-[#0B6FFB] text-[#0B6FFB] font-bold shadow-xs'
                  : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Target File Size</span>
                <HardDrive className="w-4 h-4 text-[#0B6FFB]" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Compress precisely to fit under Discord, WhatsApp or Email limits.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCompressSettings((prev) => ({ ...prev, mode: 'percentage' }))}
              className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                compressSettings.mode === 'percentage'
                  ? 'bg-blue-50 border-[#0B6FFB] text-[#0B6FFB] font-bold shadow-xs'
                  : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Percentage Reduction</span>
                <Percent className="w-4 h-4 text-[#0B6FFB]" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Shrink overall file footprint by a custom percentage (e.g. 50% or 75%).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCompressSettings((prev) => ({ ...prev, mode: 'quality' }))}
              className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                compressSettings.mode === 'quality'
                  ? 'bg-blue-50 border-[#0B6FFB] text-[#0B6FFB] font-bold shadow-xs'
                  : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Quality Profile</span>
                <Sliders className="w-4 h-4 text-[#0B6FFB]" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Choose between Balanced, Extreme Compression, or High Fidelity.
              </p>
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on selected mode */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Parameters & Live Estimation
            </h3>
            <span className="text-xs font-bold text-[#0B6FFB]">
              Estimated Size: {formatSize(estimatedSizeBytes)}
            </span>
          </div>

          {/* Mode 1: Target Size in MB */}
          {compressSettings.mode === 'target_size' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Target File Size (MB)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={0.5}
                    value={compressSettings.targetSizeMb || 25}
                    onChange={(e) =>
                      setCompressSettings((prev) => ({
                        ...prev,
                        targetSizeMb: parseFloat(e.target.value) || 25,
                      }))
                    }
                    className="w-32 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-bold font-mono focus:border-[#0B6FFB] focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">MB (Megabytes)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Quick Size Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setCompressSettings((prev) => ({ ...prev, targetSizeMb: p.mb }))
                      }
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        compressSettings.targetSizeMb === p.mb
                          ? 'bg-[#0B6FFB] text-white border-[#0B6FFB] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.iconId ? (
                        <PlatformIcon id={p.iconId} size={16} className="shrink-0" />
                      ) : p.isMail ? (
                        <Mail className="w-3.5 h-3.5 shrink-0 text-[#0B6FFB]" />
                      ) : (
                        <Minimize2 className="w-3.5 h-3.5 shrink-0 text-[#0B6FFB]" />
                      )}
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Percentage Slider */}
          {compressSettings.mode === 'percentage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Target File Size Reduction:
                </label>
                <span className="text-sm font-extrabold text-[#0B6FFB] font-mono">
                  {compressSettings.reductionPercent || 50}% smaller
                </span>
              </div>

              <input
                type="range"
                min={15}
                max={85}
                step={5}
                value={compressSettings.reductionPercent || 50}
                onChange={(e) =>
                  setCompressSettings((prev) => ({
                    ...prev,
                    reductionPercent: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#0B6FFB] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>15% (Light)</span>
                <span>50% (Balanced)</span>
                <span>85% (Maximum)</span>
              </div>
            </div>
          )}

          {/* Mode 3: Quality Profile */}
          {compressSettings.mode === 'quality' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-700 block">
                Compression Level Profile
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'small', title: 'Smallest File', desc: 'Maximum compression' },
                  { id: 'balanced', title: 'Balanced', desc: 'Recommended ratio' },
                  { id: 'ultra', title: 'Near Lossless', desc: 'Preserve crisp detail' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setCompressSettings((prev) => ({
                        ...prev,
                        qualityLevel: item.id as any,
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      compressSettings.qualityLevel === item.id
                        ? 'bg-blue-50 border-[#0B6FFB] text-[#0B6FFB] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comparison summary line */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Original: </span>
              <span className="text-slate-900 font-bold">{formatSize(originalSizeBytes)}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-500">Estimated Output: </span>
              <span className="text-[#0B6FFB] font-extrabold">{formatSize(estimatedSizeBytes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Before / After Visual Comparison */}
      <BeforeAfterPreview
        tool="compress"
        onAddToQueue={handleAddToQueue}
        onProcessNow={handleProcessNow}
        estimatedOutputDetails={{
          format: 'mp4',
          resolution: mediaInfo?.width ? `${mediaInfo.width}×${mediaInfo.height}` : 'Original',
          codec: 'H.264 High Profile',
          estimatedSizeBytes,
        }}
      />
    </div>
  );
}

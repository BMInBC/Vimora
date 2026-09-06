"use client";

import React, { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { MediaImportArea } from '@/components/workspace/MediaImportArea';
import { BeforeAfterPreview } from '@/components/workspace/BeforeAfterPreview';
import { CREATOR_PRESETS } from '@/lib/ffmpeg/presets';
import { PlatformIcon } from '@/components/PlatformIcon';
import { OutputFormat, VideoCodec, QualityPreset, CreatorPreset } from '@/lib/types';
import { useAuth } from '@/lib/firebase/authContext';
import { useRouter } from 'next/navigation';
import {
  Repeat2,
  Sliders,
  Sparkles,
  Zap,
  Check,
  ChevronDown,
  Layers,
  Volume2,
  Tv,
  Film,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function ConvertPage() {
  const {
    selectedFile,
    mediaInfo,
    convertSettings,
    setConvertSettings,
    addJobFromCurrentTool,
    gpuCaps,
  } = useWorkspace();
  const { isPro } = useAuth();
  const router = useRouter();

  const [selectedPresetId, setSelectedPresetId] = useState<string>(convertSettings.presetId || CREATOR_PRESETS[0].id);

  const handlePresetSelect = (preset: CreatorPreset) => {
    if (preset.requiresPro && !isPro) {
      alert('This preset requires Vimora Pro for 4K / Archival encoding.');
      return;
    }
    setSelectedPresetId(preset.id);
    setConvertSettings((prev) => ({
      ...prev,
      presetId: preset.id,
      outputFormat: preset.outputFormat,
      videoCodec: preset.videoCodec,
      audioCodec: preset.audioCodec,
      resolution: preset.resolution,
      fps: preset.fps,
      videoBitrate: preset.videoBitrate,
      audioBitrate: preset.audioBitrate,
      audioSampleRate: preset.audioSampleRate,
      audioChannels: preset.audioChannels,
      normalizeAudio: preset.normalizeAudio,
      maintainAspect: preset.maintainAspect,
    }));
  };

  const handleFormatChange = (fmt: OutputFormat) => {
    setConvertSettings((prev) => ({
      ...prev,
      outputFormat: fmt,
    }));
  };

  const handleAddToQueue = () => {
    addJobFromCurrentTool('convert');
    router.push('/queue');
  };

  const handleProcessNow = () => {
    addJobFromCurrentTool('convert');
    router.push('/queue');
  };

  const FORMATS: OutputFormat[] = ['mp4', 'mov', 'webm', 'mkv', 'mp3', 'wav', 'aac', 'flac', 'ogg'];
  const RESOLUTIONS = [
    { label: 'Original', val: '' },
    { label: '720p HD', val: '1280x720' },
    { label: '1080p Full HD', val: '1920x1080' },
    { label: '2K QHD', val: '2560x1440' },
    { label: '4K UHD (Pro)', val: '3840x2160', pro: true },
  ];

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200">
              <Repeat2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-nunito tracking-tight">
              Format Converter
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transcode video and audio into any container with automatic quality enhancement and GPU hardware acceleration.
          </p>
        </div>

        {gpuCaps?.hasGpu && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-slate-700 self-start sm:self-auto">
            <Zap className="w-3.5 h-3.5 text-[#0B6FFB] fill-current" />
            <span>Hardware Encoder: <span className="text-[#0B6FFB] font-bold">{gpuCaps.displayName}</span></span>
          </div>
        )}
      </div>

      {/* Shared Drag & Drop File Component */}
      <MediaImportArea toolLabel="convert" />

      {/* Automatic Quality Improvement Callout */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#0B6FFB] text-white shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 tracking-tight">
                Automatic Video Quality Enhancement
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#0B6FFB] text-white">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Vimora automatically applies edge sharpening, artifact cleanup, and high-fidelity CRF 18 encoding so your converted video looks visibly crisper and cleaner than the original.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
            <input
              type="checkbox"
              checked={convertSettings.autoEnhanceQuality !== false}
              onChange={(e) =>
                setConvertSettings((prev) => ({
                  ...prev,
                  autoEnhanceQuality: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded accent-[#0B6FFB] cursor-pointer"
            />
            <span>Auto-Clarity Boost</span>
          </label>
        </div>
      </div>

      {/* Tool Settings & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presets List */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Smart Presets
            </h3>
            <span className="text-[10px] text-[#0B6FFB] font-bold">One-Click Ready</span>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {CREATOR_PRESETS.map((preset) => {
              const selected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                    selected
                      ? 'bg-blue-50 border-[#0B6FFB] text-[#0B6FFB] shadow-xs font-bold'
                      : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0 flex items-center justify-center">
                      <PlatformIcon id={preset.id} size={22} className="rounded-md shrink-0 shadow-2xs" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{preset.name}</span>
                        {preset.requiresPro && (
                          <span className="ml-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-[#0B6FFB] border border-blue-200 shrink-0">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="uppercase">{preset.outputFormat}</span>
                        {preset.resolution && <span>• {preset.resolution}</span>}
                        {preset.fps && <span>• {preset.fps}fps</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Settings Configurator */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Output Customization
          </h3>

          {/* Quality Mode Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Conversion Quality Profile
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'high', title: '✨ Enhanced Quality', desc: 'CRF 18 • Crisp edges & color polish' },
                { id: 'balanced', title: '⚖️ Balanced', desc: 'CRF 20 • Standard high quality' },
                { id: 'smaller', title: '📉 Smaller Size', desc: 'CRF 24 • Lightweight export' },
              ].map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setConvertSettings((prev) => ({ ...prev, quality: q.id as QualityPreset }))}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    (convertSettings.quality || 'high') === q.id
                      ? 'bg-blue-50 border-[#0B6FFB] text-[#0B6FFB] shadow-xs font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold">{q.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">{q.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Output Format Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Target Container Format
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                    convertSettings.outputFormat === fmt
                      ? 'bg-[#0B6FFB] text-white shadow-sm scale-105'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution & Codecs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Output Resolution
              </label>
              <select
                value={convertSettings.resolution || ''}
                onChange={(e) =>
                  setConvertSettings((prev) => ({ ...prev, resolution: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0B6FFB]"
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res.val} value={res.val}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Video Codec
              </label>
              <select
                value={convertSettings.videoCodec || 'h264'}
                onChange={(e) =>
                  setConvertSettings((prev) => ({
                    ...prev,
                    videoCodec: e.target.value as VideoCodec,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0B6FFB]"
              >
                <option value="h264">H.264 (Universal compatibility)</option>
                <option value="hevc">H.265 / HEVC (High efficiency)</option>
                <option value="vp9">VP9 (Web optimized)</option>
                <option value="copy">Passthrough / Stream Copy</option>
              </select>
            </div>
          </div>

          {/* Audio Normalization & Bitrate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Audio Codec & Bitrate
              </label>
              <select
                value={convertSettings.audioBitrate || '192k'}
                onChange={(e) =>
                  setConvertSettings((prev) => ({ ...prev, audioBitrate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0B6FFB]"
              >
                <option value="128k">128 kbps (Standard)</option>
                <option value="192k">192 kbps (High Quality)</option>
                <option value="320k">320 kbps (Maximum / Studio)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={convertSettings.normalizeAudio !== false}
                  onChange={(e) =>
                    setConvertSettings((prev) => ({ ...prev, normalizeAudio: e.target.checked }))
                  }
                  className="w-4 h-4 rounded bg-white border-slate-300 text-[#0B6FFB] accent-[#0B6FFB]"
                />
                <span className="text-xs font-medium text-slate-700">
                  Normalize Audio Loudness (LUFS Standard)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Before / After Preview Component */}
      <BeforeAfterPreview
        tool="convert"
        onAddToQueue={handleAddToQueue}
        onProcessNow={handleProcessNow}
        estimatedOutputDetails={{
          format: convertSettings.outputFormat,
          resolution: convertSettings.resolution || 'Native',
          codec: convertSettings.videoCodec || 'h264',
          estimatedSizeBytes: mediaInfo ? Math.round(mediaInfo.sizeBytes * 0.9) : undefined,
        }}
      />
    </div>
  );
}

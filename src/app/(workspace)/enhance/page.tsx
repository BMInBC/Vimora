"use client";

import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { MediaImportArea } from '@/components/workspace/MediaImportArea';
import { BeforeAfterPreview } from '@/components/workspace/BeforeAfterPreview';
import { useAuth } from '@/lib/firebase/authContext';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Sliders,
  Sun,
  Eye,
  Zap,
  Clock,
  Lock,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function EnhancePage() {
  const {
    selectedFile,
    mediaInfo,
    enhanceSettings,
    setEnhanceSettings,
    addJobFromCurrentTool,
  } = useWorkspace();
  const { isPro } = useAuth();
  const router = useRouter();

  const handleAddToQueue = () => {
    addJobFromCurrentTool('enhance');
    router.push('/queue');
  };

  const handleProcessNow = () => {
    addJobFromCurrentTool('enhance');
    router.push('/queue');
  };

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-nunito tracking-tight flex items-center gap-2">
              <span>Video & Audio Enhancer</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-[#0B6FFB] border border-blue-200">
                PRO ENGINE
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Apply hardware-accelerated video filtering: sharpening, noise reduction, color grading & audio normalization.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0B6FFB] text-xs font-semibold self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Real FFmpeg Video DSP Filters</span>
        </div>
      </div>

      {/* Shared Drag & Drop File Area */}
      <MediaImportArea toolLabel="enhance" />

      {/* Active Enhancement Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Controls Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0B6FFB]" />
              <span>Active Enhancement Filters</span>
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">100% Functional</span>
          </div>

          {/* Resolution Upscale Target */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Resolution Upscaling (Lanczos Filter)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: 'Original' },
                { id: '1080p', label: '1080p Full HD' },
                { id: '4k', label: '4K Ultra HD', pro: true },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() =>
                    setEnhanceSettings((prev) => ({ ...prev, upscaleTarget: res.id as any }))
                  }
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                    enhanceSettings.upscaleTarget === res.id
                      ? 'bg-[#0B6FFB] text-white border-[#0B6FFB] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{res.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sharpening Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700">Unsharp Mask (Detail Sharpening):</label>
              <span className="font-mono text-[#0B6FFB] font-bold">
                {enhanceSettings.sharpen || 0}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={enhanceSettings.sharpen || 0}
              onChange={(e) =>
                setEnhanceSettings((prev) => ({ ...prev, sharpen: parseInt(e.target.value, 10) }))
              }
              className="w-full accent-[#0B6FFB] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Denoising Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700">Spatial & Temporal Denoise (HQDN3D):</label>
              <span className="font-mono text-[#0B6FFB] font-bold">
                {enhanceSettings.denoise || 0}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={enhanceSettings.denoise || 0}
              onChange={(e) =>
                setEnhanceSettings((prev) => ({ ...prev, denoise: parseInt(e.target.value, 10) }))
              }
              className="w-full accent-[#0B6FFB] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Color & Contrast Tuning */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Color & Lighting Grading
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Contrast:</span>
                  <span className="font-mono text-[#0B6FFB] text-[11px] font-bold">
                    {(enhanceSettings.eqContrast ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  value={enhanceSettings.eqContrast ?? 1.0}
                  onChange={(e) =>
                    setEnhanceSettings((prev) => ({
                      ...prev,
                      eqContrast: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#0B6FFB] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Vibrance / Saturation:</span>
                  <span className="font-mono text-[#0B6FFB] text-[11px] font-bold">
                    {(enhanceSettings.eqSaturation ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.6}
                  step={0.05}
                  value={enhanceSettings.eqSaturation ?? 1.0}
                  onChange={(e) =>
                    setEnhanceSettings((prev) => ({
                      ...prev,
                      eqSaturation: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#0B6FFB] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Audio Normalization */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#0B6FFB]" />
              <span className="text-xs font-bold text-slate-700">
                Broadcast Audio Normalization (LUFS)
              </span>
            </div>
            <input
              type="checkbox"
              checked={enhanceSettings.normalizeAudio !== false}
              onChange={(e) =>
                setEnhanceSettings((prev) => ({ ...prev, normalizeAudio: e.target.checked }))
              }
              className="w-4 h-4 rounded bg-white border-slate-300 text-[#0B6FFB] accent-[#0B6FFB]"
            />
          </div>
        </div>

        {/* Planned / Coming Soon Deep Neural AI Features */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0B6FFB]" />
              <span>Upcoming Deep Learning Models</span>
            </h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-[#0B6FFB] border border-blue-200">
              ROADMAP
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            In adherence to strict transparency, Vimora does not simulate fake AI output. The following neural network models are currently in active development for desktop GPU acceleration:
          </p>

          <div className="space-y-3">
            {[
              {
                title: 'Real-ESRGAN / TensorRT Super-Resolution',
                desc: 'Deep learning 4x pixel hallucination trained on photo textures.',
                tag: 'Planned (Q3)',
              },
              {
                title: 'RIFE 60fps Temporal Smoothing',
                desc: 'AI frame interpolation to turn 24/30fps videos into silky smooth 60fps.',
                tag: 'In Development',
              },
              {
                title: 'CodeFormer Face Restoration',
                desc: 'Generative facial prior network for unblurring out-of-focus portraits.',
                tag: 'Research Stage',
              },
              {
                title: 'Neural Audio De-reverb & Voice Isolation',
                desc: 'Separate vocal tracks and strip room echo automatically.',
                tag: 'Beta Testing',
              },
            ].map((model) => (
              <div
                key={model.title}
                className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3 shadow-xs"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{model.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{model.desc}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {model.tag}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-slate-700 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#0B6FFB] shrink-0" />
            <span>Need these models now? Join the beta program from your account settings.</span>
          </div>
        </div>
      </div>

      {/* Before / After Visual Comparison */}
      <BeforeAfterPreview
        tool="enhance"
        onAddToQueue={handleAddToQueue}
        onProcessNow={handleProcessNow}
        estimatedOutputDetails={{
          format: 'mp4',
          resolution:
            enhanceSettings.upscaleTarget === '4k'
              ? '3840×2160'
              : enhanceSettings.upscaleTarget === '1080p'
              ? '1920×1080'
              : 'Original',
          codec: 'H.264 (Lanczos / Unsharp / HQDN3D)',
          estimatedSizeBytes: mediaInfo ? Math.round(mediaInfo.sizeBytes * 1.1) : undefined,
        }}
      />
    </div>
  );
}

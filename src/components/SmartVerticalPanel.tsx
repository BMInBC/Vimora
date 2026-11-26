"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AspectRatioMode,
  ConversionOptions,
  CreatorPreset,
  MediaFileInfo,
  SubjectFocus,
} from '@/lib/types';
import { validateForPlatform } from '@/lib/ffmpeg/platformValidator';
import { isDesktopApp } from '@/lib/desktop/tauriBridge';
import {
  Smartphone,
  AlertTriangle,
  Info,
  CheckCircle2,
  Crosshair,
  Crop,
  Sparkles,
  Square,
  Maximize2,
  Film,
} from 'lucide-react';

interface SmartVerticalPanelProps {
  file?: MediaFileInfo;
  rawFile?: File;
  options: ConversionOptions;
  preset: CreatorPreset;
  framingMode: AspectRatioMode;
  subjectFocus: SubjectFocus;
  cropPositionX: number;
  cropPositionY: number;
  onFramingModeChange: (mode: AspectRatioMode) => void;
  onSubjectFocusChange: (focus: SubjectFocus) => void;
  onCropPositionChange: (x: number, y: number) => void;
}

const FRAMING_OPTIONS: {
  id: AspectRatioMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'crop_fill',
    label: 'Crop to fill',
    desc: 'Full 9:16 screen, zero black bars',
    icon: Crop,
  },
  {
    id: 'blur_pad',
    label: 'Blurred background',
    desc: 'Keeps full width over blurred canvas',
    icon: Sparkles,
  },
  {
    id: 'pad_black',
    label: 'Black bars',
    desc: 'Classic letterbox, no cropping',
    icon: Square,
  },
  {
    id: 'keep_original',
    label: 'Keep original ratio',
    desc: 'Preserves landscape frame (no bars)',
    icon: Maximize2,
  },
];

const FOCUS_OPTIONS: { id: SubjectFocus; label: string }[] = [
  { id: 'center', label: 'Center' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'manual', label: 'Manual' },
];

function formatTimeSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SmartVerticalPanel({
  file,
  rawFile,
  options,
  preset,
  framingMode,
  subjectFocus,
  cropPositionX,
  cropPositionY,
  onFramingModeChange,
  onSubjectFocusChange,
  onCropPositionChange,
}: SmartVerticalPanelProps) {
  const [videoSrcUrl, setVideoSrcUrl] = useState<string | null>(null);
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [scrubPercent, setScrubPercent] = useState<number>(15);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  const validation = useMemo(
    () => validateForPlatform(file, options, preset),
    [file, options, preset]
  );

  // Build local preview URL from browser File or Tauri desktop file path
  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    setFrameDataUrl(null);
    setVideoSrcUrl(null);
    setVideoDuration(0);

    if (!file || !file.hasVideo) return;

    if (rawFile) {
      const objUrl = URL.createObjectURL(rawFile);
      revokedUrl = objUrl;
      setVideoSrcUrl(objUrl);
    } else if (isDesktopApp() && file.path) {
      (async () => {
        try {
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          if (!cancelled) {
            setVideoSrcUrl(convertFileSrc(file.path));
          }
        } catch {}
      })();
    }

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [file?.id, file?.path, file?.hasVideo, rawFile]);

  // Capture a real frame from the local video at the chosen scrub timestamp
  useEffect(() => {
    if (!videoSrcUrl || typeof document === 'undefined') return;
    let cancelled = false;

    const video = document.createElement('video');
    hiddenVideoRef.current = video;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = videoSrcUrl;

    const captureFrame = () => {
      if (cancelled || video.videoWidth <= 0 || video.videoHeight <= 0) return;
      try {
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setFrameDataUrl(canvas.toDataURL('image/jpeg', 0.82));
        }
      } catch {
        // Fallback cleanly if canvas capture is blocked
      }
    };

    const handleLoadedMetadata = () => {
      if (cancelled) return;
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      setVideoDuration(dur);
      const targetTime = dur > 0 ? Math.min(dur - 0.1, Math.max(0.1, (scrubPercent / 100) * dur)) : 0;
      if (targetTime > 0) {
        video.currentTime = targetTime;
      } else {
        captureFrame();
      }
    };

    const handleSeeked = () => {
      captureFrame();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      video.src = '';
    };
  }, [videoSrcUrl, scrubPercent]);

  const showSmartVertical = validation.isVerticalTarget;
  const isLandscapeSource = validation.sourceOrientation === 'landscape';

  // Exact CSS object-position matching FFmpeg's crop=(iw-ow)*pctX:(ih-oh)*pctY
  const previewObjectPosition = useMemo(() => {
    if (subjectFocus === 'top') return '50% 0%';
    if (subjectFocus === 'bottom') return '50% 100%';
    if (subjectFocus === 'manual') return `${cropPositionX}% ${cropPositionY}%`;
    return '50% 50%';
  }, [subjectFocus, cropPositionX, cropPositionY]);

  if (!showSmartVertical && validation.issues.length === 0) {
    return null;
  }

  return (
    <div className="pt-3.5 border-t border-slate-100 space-y-4">
      {/* Smart Repost Vertical Framing Section */}
      {showSmartVertical && (
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0B6FFB]/10 text-[#0B6FFB] flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Smart Repost • 9:16 Vertical Framing
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isLandscapeSource
                    ? `Landscape source (${file?.width}×${file?.height}) detected — choose how to frame it for ${validation.platformName}.`
                    : `Configure how your video fills the 9:16 frame for ${validation.platformName} (Lanczos + BT.709 colorimetry).`}
                </p>
              </div>
            </div>
            {file?.width && file?.height && (
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-600 self-start sm:self-auto">
                Source: {file.width}×{file.height} ({validation.sourceOrientation})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-5 items-start">
            {/* Left: Framing Options + Subject Focus */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FRAMING_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = framingMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onFramingModeChange(opt.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer space-y-1 ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${active ? 'text-[#38BDF8]' : 'text-slate-500'}`}
                      />
                      <span className="block text-xs font-bold leading-tight">{opt.label}</span>
                      <span
                        className={`block text-[10px] leading-snug ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Subject Focus Controls (when Crop to fill is active) */}
              {framingMode === 'crop_fill' && (
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Crosshair className="w-3.5 h-3.5 text-[#0B6FFB]" />
                      <span>Subject focus</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      {FOCUS_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onSubjectFocusChange(f.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                            subjectFocus === f.id
                              ? 'bg-white text-slate-950 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {subjectFocus === 'manual' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label className="space-y-1 block">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>Horizontal crop pan</span>
                          <span className="font-mono text-slate-900">{cropPositionX}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={cropPositionX}
                          onChange={(e) =>
                            onCropPositionChange(parseInt(e.target.value, 10), cropPositionY)
                          }
                          aria-label="Manual horizontal crop position"
                          className="w-full accent-[#0B6FFB] cursor-pointer"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>Vertical crop focus</span>
                          <span className="font-mono text-slate-900">{cropPositionY}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={cropPositionY}
                          onChange={(e) =>
                            onCropPositionChange(cropPositionX, parseInt(e.target.value, 10))
                          }
                          aria-label="Manual vertical crop position"
                          className="w-full accent-[#0B6FFB] cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Timestamp Scrubber (when real video frame is loaded) */}
              {frameDataUrl && videoDuration > 1 && (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 shrink-0">
                    <Film className="w-3.5 h-3.5 text-[#0B6FFB]" />
                    <span>Preview frame</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={95}
                    value={scrubPercent}
                    onChange={(e) => setScrubPercent(parseInt(e.target.value, 10))}
                    aria-label="Scrub video preview frame timestamp"
                    className="flex-1 accent-[#0B6FFB] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-bold text-slate-700 shrink-0">
                    {formatTimeSec((scrubPercent / 100) * videoDuration)}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Real Video Frame 9:16 Phone Preview */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-label={`9:16 phone framing preview showing ${framingMode}`}
                className="relative w-[148px] h-[263px] rounded-[26px] border-[4px] border-slate-900 bg-black overflow-hidden shadow-lg flex items-center justify-center"
              >
                {/* Phone Speaker Notch */}
                <div
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 w-11 h-2 rounded-full bg-slate-900/90 z-20"
                  aria-hidden="true"
                />

                {frameDataUrl ? (
                  <>
                    {/* Real Video Frame Preview */}
                    {framingMode === 'crop_fill' && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frameDataUrl}
                          alt="Cropped 9:16 video frame preview"
                          className="w-full h-full object-cover transition-[object-position] duration-75"
                          style={{ objectPosition: previewObjectPosition }}
                        />
                        {/* Subtle rule-of-thirds framing grid */}
                        <div
                          className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25"
                          aria-hidden="true"
                        >
                          <div className="border-r border-b border-white/60" />
                          <div className="border-r border-b border-white/60" />
                          <div className="border-b border-white/60" />
                          <div className="border-r border-b border-white/60" />
                          <div className="border-r border-b border-white/60" />
                          <div className="border-b border-white/60" />
                          <div className="border-r border-white/60" />
                          <div className="border-r border-white/60" />
                          <div />
                        </div>
                      </>
                    )}

                    {framingMode === 'blur_pad' && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frameDataUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-md scale-125 opacity-85"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frameDataUrl}
                          alt="Blurred background 9:16 video frame preview"
                          className="relative z-10 w-full h-full object-contain"
                        />
                      </>
                    )}

                    {framingMode === 'pad_black' && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={frameDataUrl}
                        alt="Letterboxed 9:16 video frame preview"
                        className="w-full h-full object-contain bg-black"
                      />
                    )}

                    {framingMode === 'keep_original' && (
                      <div className="w-[92%] rounded-lg overflow-hidden border border-white/30 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frameDataUrl}
                          alt="Original aspect ratio video frame preview"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  /* Clean placeholder when no video is imported yet */
                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-center gap-2">
                    <Smartphone className="w-6 h-6 text-slate-500" />
                    <p className="text-[10px] font-semibold text-slate-300 leading-snug">
                      {file
                        ? 'Loading video frame…'
                        : 'Import a video to preview your real 9:16 crop on a phone'}
                    </p>
                  </div>
                )}

                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[8px] font-mono font-bold text-white uppercase whitespace-nowrap">
                  {framingMode.replace('_', ' ')}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                {frameDataUrl ? 'Real Phone Frame Preview' : '9:16 Phone Preview'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Export Platform Validation Banner (Non-blocking) */}
      {file && (
        <div className="space-y-2">
          {validation.issues.length === 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Ready for {validation.platformName} — aspect ratio, resolution, codec, and limits look good.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {validation.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs ${
                    issue.severity === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-blue-50/60 border-blue-200/80 text-slate-700'
                  }`}
                >
                  {issue.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-[#0B6FFB] shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold">{issue.title}</p>
                    <p className="text-[11px] opacity-90">{issue.message}</p>
                    {issue.recommendation && (
                      <p className="text-[11px] font-semibold opacity-95">
                        Tip: {issue.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

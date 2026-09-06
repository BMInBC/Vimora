"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Columns,
  Sparkles,
  Zap,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

interface BeforeAfterPreviewProps {
  tool: 'convert' | 'compress' | 'enhance';
  onAddToQueue: () => void;
  onProcessNow: () => void;
  estimatedOutputDetails?: {
    format: string;
    resolution?: string;
    codec?: string;
    estimatedSizeBytes?: number;
  };
}

export function BeforeAfterPreview({
  tool,
  onAddToQueue,
  onProcessNow,
  estimatedOutputDetails,
}: BeforeAfterPreviewProps) {
  const {
    selectedFile,
    mediaInfo,
    objectUrl,
    previewState,
    generatePreview,
    compressSettings,
    convertSettings,
    formatSize,
  } = useWorkspace();

  const [compareMode, setCompareMode] = useState<'split' | 'side-by-side'>('split');
  const [splitPos, setSplitPos] = useState(50); // percentage (0 - 100)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewStartSec, setPreviewStartSec] = useState(0);
  const [previewDurationSec, setPreviewDurationSec] = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoBeforeRef = useRef<HTMLVideoElement>(null);
  const videoAfterRef = useRef<HTMLVideoElement>(null);
  const isDraggingSplit = useRef(false);

  // Synchronize playback between before and after videos
  const togglePlay = () => {
    if (isPlaying) {
      videoBeforeRef.current?.pause();
      videoAfterRef.current?.pause();
      setIsPlaying(false);
    } else {
      videoBeforeRef.current?.play().catch(() => {});
      videoAfterRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoBeforeRef.current) videoBeforeRef.current.currentTime = target;
    if (videoAfterRef.current) videoAfterRef.current.currentTime = target;
  };

  const handleTimeUpdate = () => {
    if (videoBeforeRef.current) {
      setCurrentTime(videoBeforeRef.current.currentTime);
      if (!duration && videoBeforeRef.current.duration) {
        setDuration(videoBeforeRef.current.duration);
      }
    }
  };

  // Draggable split divider handlers
  const handleMouseDown = () => {
    isDraggingSplit.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDraggingSplit.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = Math.round((x / rect.width) * 100);
    setSplitPos(pct);
  };

  const handleMouseUp = () => {
    isDraggingSplit.current = false;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMouseMove(e);
    const onUp = () => handleMouseUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!selectedFile || !mediaInfo?.hasVideo) {
    return null;
  }

  const effectiveAfterSrc = previewState.previewUrl || objectUrl;
  const originalSize = mediaInfo.sizeBytes;
  const estimatedSize =
    previewState.outputSizeBytes && mediaInfo.durationSeconds
      ? Math.round(
          (previewState.outputSizeBytes / previewState.durationSeconds) *
            mediaInfo.durationSeconds
        )
      : estimatedOutputDetails?.estimatedSizeBytes || Math.round(originalSize * 0.7);

  const savingsPct =
    originalSize > estimatedSize
      ? Math.round(((originalSize - estimatedSize) / originalSize) * 100)
      : 0;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Visual Before / After Comparison
            </h3>
            {previewState.previewUrl && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#0B6FFB] border border-blue-200">
                Processed 5s Sample
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Test and preview output quality on a 5–10s section before rendering the full file.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setCompareMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              compareMode === 'split'
                ? 'bg-[#0B6FFB] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('side-by-side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              compareMode === 'side-by-side'
                ? 'bg-[#0B6FFB] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side by Side</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewports */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden bg-black aspect-video select-none border border-slate-800"
      >
        {compareMode === 'split' ? (
          /* Split Slider View */
          <div className="relative w-full h-full">
            {/* Background Layer: Converted / After Video */}
            <video
              ref={videoAfterRef}
              src={effectiveAfterSrc || ''}
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
              muted
            />

            {/* Foreground Clipped Layer: Original / Before Video */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${splitPos}%` }}
            >
              <video
                ref={videoBeforeRef}
                src={objectUrl || ''}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="absolute top-0 left-0 max-w-none h-full object-contain"
                style={{
                  width: containerRef.current
                    ? `${containerRef.current.clientWidth}px`
                    : '100%',
                }}
                playsInline
                muted
              />
            </div>

            {/* Draggable Divider Line */}
            <div
              onMouseDown={handleMouseDown}
              style={{ left: `${splitPos}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize -ml-0.5 z-20 shadow-[0_0_10px_rgba(255,255,255,0.7)]"
            >
              <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg border border-slate-300 font-bold text-xs pointer-events-none">
                ↔
              </div>
            </div>

            {/* Badges on split */}
            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-black/70 text-[11px] font-bold text-white border border-white/20">
              Original (Before)
            </div>
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md bg-[#0B6FFB] text-[11px] font-bold text-white shadow-sm">
              {previewState.previewUrl ? 'Processed (After)' : 'Estimated Preview'}
            </div>
          </div>
        ) : (
          /* Side by Side Mode */
          <div className="grid grid-cols-2 w-full h-full divide-x divide-slate-800">
            <div className="relative h-full flex flex-col items-center justify-center bg-black">
              <video
                ref={videoBeforeRef}
                src={objectUrl || ''}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
                playsInline
                muted
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-slate-300 border border-white/20">
                Original
              </div>
            </div>

            <div className="relative h-full flex flex-col items-center justify-center bg-black">
              <video
                ref={videoAfterRef}
                src={effectiveAfterSrc || ''}
                className="w-full h-full object-contain"
                playsInline
                muted
              />
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-[#0B6FFB] text-[10px] font-bold text-white shadow-sm">
                {previewState.previewUrl ? 'Processed Sample' : 'Preview Output'}
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner during Generation */}
        {previewState.isGenerating && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#0B6FFB] animate-spin" />
            <p className="text-xs font-bold text-white">Rendering {previewDurationSec}s preview snippet...</p>
          </div>
        )}
      </div>

      {/* Synchronized Player Bar */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-lg bg-[#0B6FFB] hover:bg-[#0958CC] text-white flex items-center justify-center transition-colors shrink-0 shadow-xs"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Scrub Bar */}
        <input
          type="range"
          min={0}
          max={duration || 10}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-[#0B6FFB] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
        />

        <div className="text-[11px] font-mono text-slate-600 font-semibold shrink-0">
          {Math.floor(currentTime)}s / {Math.floor(duration || 0)}s
        </div>
      </div>

      {/* Metadata Comparison & Generation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Left: Original vs Output Stats */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-200 pb-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600">Stream Info</span>
            <span className="text-[10px] text-[#0B6FFB] font-bold">
              {tool === 'compress'
                ? compressSettings.qualityGoal === 'enhance'
                  ? '✨ Clarity Boost'
                  : compressSettings.qualityGoal === 'reduce'
                  ? '📉 Max Compression'
                  : '⚖️ Balanced Quality'
                : tool === 'convert'
                ? convertSettings.autoEnhanceQuality !== false
                  ? '✨ Auto-Enhanced Quality'
                  : 'High Fidelity'
                : 'Hardware Accelerated'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Original File</p>
              <p className="font-bold text-slate-900 mt-0.5">{formatSize(originalSize)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {mediaInfo.width && mediaInfo.height ? `${mediaInfo.width}×${mediaInfo.height}` : 'Native'} • {mediaInfo.format.toUpperCase()}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Estimated Output</p>
              <p className="font-bold text-emerald-600 mt-0.5">
                {formatSize(estimatedSize)}
                {savingsPct > 0 && <span className="text-xs ml-1.5 text-emerald-600 font-extrabold">(-{savingsPct}%)</span>}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {previewState.outputResolution || estimatedOutputDetails?.resolution || 'Original'} • {estimatedOutputDetails?.format?.toUpperCase() || 'MP4'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Snippet Selector & Action Trigger */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Preview Section Start
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, (mediaInfo.durationSeconds || 60) - 5)}
                  value={previewStartSec}
                  onChange={(e) => setPreviewStartSec(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:border-[#0B6FFB] focus:outline-none"
                />
                <span className="text-xs text-slate-500">sec (Length: 5s)</span>
              </div>
            </div>

            <button
              type="button"
              disabled={previewState.isGenerating}
              onClick={() => generatePreview(tool, previewStartSec, previewDurationSec)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 shrink-0 hover:border-[#0B6FFB] disabled:opacity-50 shadow-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#0B6FFB] ${previewState.isGenerating ? 'animate-spin' : ''}`} />
              <span>{previewState.previewUrl ? 'Regenerate' : 'Generate'} Preview</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onAddToQueue}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-[#0B6FFB]" />
              <span>Add to Queue</span>
            </button>

            <button
              type="button"
              onClick={onProcessNow}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#0B6FFB] hover:bg-[#0958CC] text-white text-xs font-bold shadow-md shadow-[#0B6FFB]/25 transition-all"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Process Full Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

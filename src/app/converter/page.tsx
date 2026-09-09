"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/authContext';
import { CREATOR_PRESETS } from '@/lib/ffmpeg/presets';
import { detectGpuCapabilities } from '@/lib/ffmpeg/detector';
import {
  getLocalHistory,
  addLocalHistoryRecord,
  deleteLocalHistoryRecord,
  clearLocalHistory,
  getAppSettings,
} from '@/lib/storage/localHistory';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Logo } from '@/components/Logo';
import { ConversionChangesPreview } from '@/components/ConversionChangesPreview';
import {
  ConversionJob,
  ConversionOptions,
  CreatorPreset,
  GpuCapabilities,
  MediaFileInfo,
  OutputFormat,
  LocalHistoryRecord,
  AspectRatioMode,
} from '@/lib/types';
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  Zap,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  Lock,
  ArrowRight,
  Download,
  ChevronDown,
  Check,
  History,
  Search,
  HardDrive,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';

function getProcessingEngineMessage(isPro: boolean, gpuCaps: GpuCapabilities | null): string {
  if (!isPro) {
    return 'Processed 100% locally using CPU.';
  }
  if (gpuCaps?.hasGpu) {
    switch (gpuCaps.type) {
      case 'nvenc':
        return 'Processed 100% locally using NVIDIA NVENC.';
      case 'qsv':
        return 'Processed 100% locally using Intel QuickSync.';
      case 'amf':
        return 'Processed 100% locally using AMD AMF.';
      case 'videotoolbox':
        return 'Processed 100% locally using Apple VideoToolbox.';
    }
  }
  return 'Processed 100% locally using CPU fallback.';
}

function getHardwareStatusText(gpuCaps: GpuCapabilities | null, isPro: boolean): string {
  if (!gpuCaps) {
    return 'Detecting available hardware…';
  }
  if (!gpuCaps.hasGpu || gpuCaps.type === 'cpu') {
    return 'Hardware acceleration not detected — CPU encoding available';
  }
  if (gpuCaps.type === 'videotoolbox') {
    return isPro ? 'Apple VideoToolbox active' : 'Apple VideoToolbox available';
  }
  if (gpuCaps.type === 'nvenc') {
    return isPro ? 'GPU detected: NVIDIA NVENC — NVENC active' : 'GPU detected: NVIDIA NVENC — NVENC available with Pro';
  }
  if (gpuCaps.type === 'qsv') {
    return isPro ? 'GPU detected: Intel QuickSync — QuickSync active' : 'GPU detected: Intel QuickSync — QuickSync available with Pro';
  }
  if (gpuCaps.type === 'amf') {
    return isPro ? 'GPU detected: AMD AMF — AMF active' : 'GPU detected: AMD AMF — AMF available with Pro';
  }
  return 'Hardware acceleration not detected — CPU encoding available';
}

export default function ConverterPage() {
  const { user, isPro, loading } = useAuth();
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<CreatorPreset>(CREATOR_PRESETS[0]);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('mp4');
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [outputDir, setOutputDir] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [framingMode, setFramingMode] = useState<AspectRatioMode>('crop_fill');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // History & Tab navigation state
  const [history, setHistory] = useState<LocalHistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFormatFilter, setHistoryFormatFilter] = useState('all');

  const handleFramingModeChange = (mode: AspectRatioMode) => {
    setFramingMode(mode);
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                aspectRatioMode: mode,
              },
            }
          : job
      )
    );
  };

  // Store raw browser File objects for local upload staging
  const rawFilesRef = useRef<Map<string, File>>(new Map());
  // Store active AbortControllers for pausible jobs
  const activeControllersRef = useRef<Map<string, AbortController>>(new Map());

  const refreshHistory = () => {
    setHistory(getLocalHistory(user?.uid));
  };

  useEffect(() => {
    refreshHistory();
  }, [user?.uid]);

  const pauseJob = (jobId: string) => {
    const controller = activeControllersRef.current.get(jobId);
    if (controller) {
      controller.abort();
      activeControllersRef.current.delete(jobId);
    }
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'paused',
              progress: { ...j.progress, percent: 0, speed: undefined },
            }
          : j
      )
    );
  };

  useEffect(() => {
    detectGpuCapabilities().then(setGpuCaps);
    refreshHistory();
    const settings = getAppSettings();
    if (settings.defaultOutputDirectory) {
      setOutputDir(settings.defaultOutputDirectory);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePresetSelect = (preset: CreatorPreset) => {
    if (preset.requiresPro && !isPro) {
      alert('This preset requires Vimora Pro for 4K / Archival encoding.');
      return;
    }
    setSelectedPreset(preset);
    setSelectedFormat(preset.outputFormat);
    setIsDropdownOpen(false);

    const isVertical = preset.resolution && (() => {
      const p = preset.resolution.split('x');
      return p.length === 2 && parseInt(p[1], 10) > parseInt(p[0], 10);
    })();
    const presetFraming = preset.aspectRatioMode || (isVertical ? 'crop_fill' : 'pad_black');
    setFramingMode(presetFraming);

    // Update all queued jobs to reflect newly selected preset
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                outputFormat: preset.outputFormat,
                presetId: preset.id,
                quality: preset.quality || 'high',
                videoCodec: preset.videoCodec,
                audioCodec: preset.audioCodec,
                resolution: preset.resolution,
                fps: preset.fps,
                videoBitrate: preset.videoBitrate,
                audioBitrate: preset.audioBitrate,
                audioSampleRate: preset.audioSampleRate,
                audioChannels: preset.audioChannels,
                normalizeAudio: false,
                maintainAspect: preset.maintainAspect,
                aspectRatioMode: presetFraming,
              },
            }
          : job
      )
    );
  };

  const handleFormatSelect = (format: OutputFormat) => {
    setSelectedFormat(format);
    const matchingPreset = CREATOR_PRESETS.find((p) => p.outputFormat === format);
    if (matchingPreset && (!matchingPreset.requiresPro || isPro)) {
      setSelectedPreset(matchingPreset);
    }

    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                outputFormat: format,
                normalizeAudio: false,
              },
            }
          : job
      )
    );
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Free plan restriction: max 5 files per batch
    const currentCount = jobs.length;
    const allowedNew = isPro ? files.length : Math.max(0, 5 - currentCount);

    if (!isPro && files.length > allowedNew) {
      alert(`Free Plan allows up to 5 files per batch. Adding ${allowedNew} files. Upgrade to Pro for unlimited batch processing!`);
    }

    const newJobs: ConversionJob[] = [];
    const countToAdd = Math.min(files.length, allowedNew);

    for (let i = 0; i < countToAdd; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|mkv|avi|webm)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|aac|flac|ogg|m4a)$/i.test(file.name);
      const fileId = 'file_' + Math.random().toString(36).substring(2, 9);

      // Keep raw file for local browser staging
      rawFilesRef.current.set(fileId, file);

      const fileInfo: MediaFileInfo = {
        id: fileId,
        name: file.name,
        path: (file as any).path || file.name,
        sizeBytes: file.size,
        format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        hasVideo: isVideo,
        hasAudio: isAudio || isVideo,
      };

      const isVertical = selectedPreset.resolution && (() => {
        const p = selectedPreset.resolution.split('x');
        return p.length === 2 && parseInt(p[1], 10) > parseInt(p[0], 10);
      })();
      const activeFraming = selectedPreset.aspectRatioMode || (isVertical ? framingMode : 'pad_black');

      const options: ConversionOptions = {
        outputFormat: selectedFormat,
        presetId: selectedPreset.id,
        quality: selectedPreset.quality || 'high',
        videoCodec: selectedPreset.videoCodec,
        audioCodec: selectedPreset.audioCodec,
        resolution: selectedPreset.resolution,
        fps: selectedPreset.fps,
        videoBitrate: selectedPreset.videoBitrate,
        audioBitrate: selectedPreset.audioBitrate,
        audioSampleRate: selectedPreset.audioSampleRate,
        audioChannels: selectedPreset.audioChannels,
        normalizeAudio: false,
        maintainAspect: selectedPreset.maintainAspect,
        aspectRatioMode: activeFraming,
        outputDirectory: outputDir,
      };

      newJobs.push({
        id: 'job_' + Math.random().toString(36).substring(2, 9),
        file: fileInfo,
        options,
        status: 'queued',
        progress: { percent: 0 },
      });

      // Asynchronously inspect actual video/audio dimensions and duration in browser
      if (typeof window !== 'undefined') {
        const objectUrl = URL.createObjectURL(file);
        if (isVideo) {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.src = objectUrl;
          v.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            setJobs((curr) =>
              curr.map((j) =>
                j.file.id === fileId
                  ? {
                      ...j,
                      file: {
                        ...j.file,
                        width: v.videoWidth,
                        height: v.videoHeight,
                        durationSeconds: v.duration,
                      },
                    }
                  : j
              )
            );
          };
          v.onerror = () => URL.revokeObjectURL(objectUrl);
        } else if (isAudio) {
          const a = document.createElement('audio');
          a.preload = 'metadata';
          a.src = objectUrl;
          a.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            setJobs((curr) =>
              curr.map((j) =>
                j.file.id === fileId
                  ? {
                      ...j,
                      file: {
                        ...j.file,
                        durationSeconds: a.duration,
                      },
                    }
                  : j
              )
            );
          };
          a.onerror = () => URL.revokeObjectURL(objectUrl);
        }

        // Try probing file metadata safely via /api/probe
        const filePath = (file as any).path || file.name;
        fetch('/api/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputPath: filePath }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setJobs((curr) =>
                curr.map((j) =>
                  j.file.id === fileId
                    ? {
                        ...j,
                        file: {
                          ...j.file,
                          width: data.width || j.file.width,
                          height: data.height || j.file.height,
                          fps: data.fps || j.file.fps,
                          videoCodec: data.videoCodec || j.file.videoCodec,
                          audioCodec: data.audioCodec || j.file.audioCodec,
                          durationSeconds: data.durationSeconds || j.file.durationSeconds,
                        },
                      }
                    : j
                )
              );
            }
          })
          .catch(() => {});
      }
    }

    setJobs((prev) => [...prev, ...newJobs]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (job) {
      rawFilesRef.current.delete(job.file.id);
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const clearAllJobs = () => {
    if (isConvertingAll) return;
    rawFilesRef.current.clear();
    setJobs([]);
  };

  const runSingleJob = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    // Register an active AbortController so user can pause this individual conversion
    const controller = new AbortController();
    activeControllersRef.current.set(jobId, controller);

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'converting', progress: { percent: 15, speed: '2.0x' }, startedAt: Date.now(), errorMessage: undefined }
          : j
      )
    );

    try {
      const rawFile = rawFilesRef.current.get(job.file.id);
      let res: Response;

      if (rawFile) {
        // Browser file mode: send file locally via FormData so FFmpeg receives real disk data
        const formData = new FormData();
        formData.append('file', rawFile);
        formData.append('options', JSON.stringify(job.options));
        if (job.options.outputDirectory) {
          formData.append('outputDirectory', job.options.outputDirectory);
        }
        res = await fetch('/api/convert', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } else {
        // Desktop / absolute path mode
        res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputPath: job.file.path,
            outputDirectory: job.options.outputDirectory || undefined,
            options: job.options,
          }),
          signal: controller.signal,
        });
      }

      let data: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 404
            ? 'Conversion server endpoint (/api/convert) was not found. Please ensure the server is running.'
            : `Conversion failed: Server returned HTTP ${res.status}`
        );
      }

      if (!res.ok || !data.success) {
        if (data.aborted || controller.signal.aborted) {
          return; // Handled by pauseJob
        }
        throw new Error(data.error || 'Conversion failed');
      }

      const completedJob: ConversionJob = {
        ...job,
        status: 'completed',
        progress: { percent: 100 },
        outputPath: data.outputPath,
        outputSizeBytes: data.outputSizeBytes || Math.round(job.file.sizeBytes * 0.75),
        bytesSaved: Math.max(0, job.file.sizeBytes - (data.outputSizeBytes || job.file.sizeBytes * 0.75)),
        downloadUrl: data.downloadUrl,
        completedAt: Date.now(),
        encoderUsed: gpuCaps?.hasGpu && isPro ? gpuCaps.supportedVideoEncoders[0] : 'libx264',
        isGpuAccelerated: Boolean(gpuCaps?.hasGpu && isPro),
      };

      setJobs((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));

      addLocalHistoryRecord({
        id: completedJob.id,
        userId: user?.uid,
        originalFileName: completedJob.file.name,
        originalSizeBytes: completedJob.file.sizeBytes,
        outputFormat: completedJob.options.outputFormat,
        outputSizeBytes: completedJob.outputSizeBytes || 0,
        bytesSaved: completedJob.bytesSaved || 0,
        outputPath: completedJob.outputPath || '',
        presetUsed: selectedPreset.name,
        encoderUsed: completedJob.encoderUsed || 'libx264',
        isGpuAccelerated: Boolean(completedJob.isGpuAccelerated),
        status: 'completed',
        durationSeconds: Math.round(data.durationSeconds || 5),
        timestamp: Date.now(),
      }, user?.uid);
      refreshHistory();
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        // Paused by user
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: 'paused', progress: { percent: 0, speed: undefined } } : j
          )
        );
        return;
      }
      console.error('Job error:', err);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'failed', errorMessage: err.message || 'Error occurred during FFmpeg process' }
            : j
        )
      );
    } finally {
      activeControllersRef.current.delete(jobId);
    }
  };

  const convertAll = async () => {
    if (isConvertingAll) return;
    setIsConvertingAll(true);
    const queued = jobs.filter((j) => j.status === 'queued' || j.status === 'failed' || j.status === 'paused');
    for (const job of queued) {
      await runSingleJob(job.id);
    }
    setIsConvertingAll(false);
  };

  const revealFolder = async (folderPath?: string) => {
    if (!folderPath) return;
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: folderPath, folderPath }),
      });
    } catch {}
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimestamp = (ts: number): string => {
    if (!ts) return 'Just now';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteLocalHistoryRecord(id, user?.uid);
    refreshHistory();
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire conversion and download history?')) {
      clearLocalHistory(user?.uid);
      refreshHistory();
    }
  };

  const totalBytesSaved = useMemo(() => {
    return history.reduce((acc, item) => acc + (item.bytesSaved || 0), 0);
  }, [history]);

  const gpuConversionsCount = useMemo(() => {
    return history.filter((item) => item.isGpuAccelerated).length;
  }, [history]);

  const availableFormats = useMemo(() => {
    return Array.from(new Set(history.map((h) => h.outputFormat.toLowerCase())));
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const searchLower = historySearch.toLowerCase();
      const matchesSearch =
        !historySearch ||
        item.originalFileName.toLowerCase().includes(searchLower) ||
        item.outputFormat.toLowerCase().includes(searchLower) ||
        (item.presetUsed && item.presetUsed.toLowerCase().includes(searchLower));

      const matchesFormat =
        historyFormatFilter === 'all' ||
        item.outputFormat.toLowerCase() === historyFormatFilter.toLowerCase();

      return matchesSearch && matchesFormat;
    });
  }, [history, historySearch, historyFormatFilter]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans pb-16">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 h-full">
            {!loading && !user && (
              <Link href="/" className="flex items-center gap-2 group shrink-0">
                <Logo size={30} priority />
              </Link>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 sm:gap-6 h-full">
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-1.5 sm:gap-2 h-full border-b-2 px-1 text-xs sm:text-sm font-bold transition-all cursor-pointer -mb-px ${
                  activeTab === 'workspace'
                    ? 'border-[#0B6FFB] text-[#0B6FFB]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 ${activeTab === 'workspace' ? 'text-[#0B6FFB]' : 'text-slate-400'}`} />
                <span>Converter</span>
                {jobs.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#0B6FFB] text-white text-[10px] flex items-center justify-center font-bold">
                    {jobs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 sm:gap-2 h-full border-b-2 px-1 text-xs sm:text-sm font-bold transition-all cursor-pointer -mb-px ${
                  activeTab === 'history'
                    ? 'border-[#0B6FFB] text-[#0B6FFB]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <History className={`w-3.5 h-3.5 ${activeTab === 'history' ? 'text-[#0B6FFB]' : 'text-slate-400'}`} />
                <span>Conversion History</span>
                {history.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {history.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {activeTab === 'workspace' ? (
          <>
            {/* Presets Selector Header */}
        <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold font-sans flex items-center gap-2 text-slate-900">
                <Sliders className="w-4 h-4 text-[#0B6FFB]" /> Platform & Creator Encoding Presets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose an optimized conversion preset for YouTube, TikTok, Instagram, X / Twitter, Discord, WhatsApp, or Studio Master.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              {!isPro && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0B6FFB] hover:bg-[#0958cc] text-white px-3.5 py-2 rounded-md transition-colors shadow-xs self-start sm:self-auto"
                >
                  <Lock className="w-3.5 h-3.5" /> Unlock 4K & GPU Presets
                </Link>
              )}
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                <Cpu className="w-3 h-3 text-[#0B6FFB] shrink-0" />
                {getHardwareStatusText(gpuCaps, isPro)}
              </span>
            </div>
          </div>

          {/* Preset Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="shrink-0 drop-shadow-sm p-1 bg-white rounded-xl border border-slate-100 shadow-xs">
                  <PlatformIcon id={selectedPreset.id} size={28} />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm sm:text-base font-nunito text-slate-900 truncate">
                      {selectedPreset.name}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] uppercase bg-slate-200 text-slate-700">
                      {selectedPreset.outputFormat}
                    </span>
                    {selectedPreset.resolution && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedPreset.resolution}
                      </span>
                    )}
                    {selectedPreset.fps && (
                      <span className="text-[11px] font-mono text-slate-500 hidden md:inline-block">
                        {selectedPreset.fps}fps
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">Change preset</span>
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-slate-900 shadow-2xs">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100 animate-in fade-in-0 duration-150">
                {CREATOR_PRESETS.map((p) => {
                  const isSelected = selectedPreset.id === p.id;
                  const locked = p.requiresPro && !isPro;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : locked
                          ? 'hover:bg-blue-50/40 text-slate-800'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 drop-shadow-sm">
                          <PlatformIcon id={p.id} size={24} />
                        </div>
                        <span className={`font-semibold text-sm truncate font-nunito ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {p.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#0B6FFB]/10 text-[#0B6FFB] px-2 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" /> PRO
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] uppercase ${
                            isSelected
                              ? 'bg-white/20 text-[#0BB3FA]'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.outputFormat}
                        </span>
                        {p.resolution && (
                          <span
                            className={`text-[11px] font-mono hidden sm:inline-block ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {p.resolution}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#0B6FFB] shrink-0 ml-1" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Quick Format Selector Pills (Grouped by Video & Audio Extraction) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 pt-3.5 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 shrink-0">Video:</span>
                {(['mp4', 'webm', 'mov'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatSelect(fmt)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase font-mono transition-all cursor-pointer ${
                      selectedFormat === fmt
                        ? 'bg-[#0B6FFB] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <div className="hidden sm:block text-slate-200">|</div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 shrink-0">Audio Extraction:</span>
                {(['mp3', 'wav', 'flac'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatSelect(fmt)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase font-mono transition-all cursor-pointer ${
                      selectedFormat === fmt
                        ? 'bg-[#0B6FFB] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* 9:16 Vertical Framing Controls */}
            {selectedPreset.resolution && (() => {
              const parts = selectedPreset.resolution.split('x');
              return parts.length === 2 && parseInt(parts[1], 10) > parseInt(parts[0], 10);
            })() && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    📱 9:16 Framing:
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Choose how horizontal footage fills vertical TikTok/Reels
                  </span>
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleFramingModeChange('crop_fill')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      framingMode === 'crop_fill'
                        ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Crops extra horizontal edges to fill the 9:16 screen completely with zero black bars"
                  >
                    Crop to Fill (0 Black Bars)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFramingModeChange('blur_pad')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      framingMode === 'blur_pad'
                        ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Preserves full horizontal width and fills top/bottom with stylish blurred video"
                  >
                    ✨ Blurred Background
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFramingModeChange('pad_black')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      framingMode === 'pad_black'
                        ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Maintains aspect ratio with classic black letterbox bars"
                  >
                    ⬛ Letterbox
                  </button>
                </div>
              </div>
            )}

            {/* Live Preset Capabilities & Changes Preview */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-start gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
              <div className="p-2 rounded-lg bg-[#0B6FFB]/10 text-[#0B6FFB] shrink-0 mt-0.5">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">Preset Settings:</span>
                  <span className="font-bold text-[#0B6FFB]">{selectedPreset.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold uppercase">
                    {selectedPreset.outputFormat} &bull; {selectedPreset.resolution || 'Native'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {['mp3', 'wav', 'flac'].includes(selectedFormat)
                    ? `Extracts high-quality ${selectedFormat.toUpperCase()} audio while preserving the original voice volume and vocal fidelity.`
                    : selectedPreset.id === 'tiktok_vertical' || selectedPreset.id === 'instagram_reel'
                    ? 'Reframes horizontal or standard videos into full 9:16 vertical video (1080×1920) without black bars, tailored for TikTok, Reels, and Shorts.'
                    : selectedPreset.id === 'instagram_feed'
                    ? 'Reframes videos into full-screen 1:1 square canvas (1080×1080) for Instagram Feed posts without black letterboxing.'
                    : `Encodes output as ${selectedPreset.outputFormat.toUpperCase()} at ${selectedPreset.resolution || 'source resolution'} with ${selectedPreset.videoCodec?.toUpperCase() || 'H264'} video while preserving original audio volume and vocal fidelity.`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Drag & Drop Zone */}
        <section
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-slate-950 bg-blue-50/50 scale-[0.99]'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,.mkv,.flac"
            onChange={(e) => handleFilesAdded(e.target.files)}
            className="hidden"
          />
          <div className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UploadCloud className="w-7 h-7 text-[#0BB3FA]" />
          </div>
          <h3 className="text-xl font-bold font-nunito text-slate-900">
            Drop your video or audio files here
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            Targeting: <strong className="text-slate-800">{selectedPreset.name}</strong> ({selectedFormat.toUpperCase()}). {getProcessingEngineMessage(isPro, gpuCaps)}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl">
            Click to Browse Files
          </div>
        </section>

        {/* Compact Read-Only Conversion Summary */}
        {jobs.length > 0 && (() => {
          const sampleJob = jobs[0];
          const file = sampleJob.file;
          const isAudioTarget = ['mp3', 'wav', 'flac'].includes(selectedFormat);

          const srcName = file.name || 'Unknown';
          const srcSize = file.sizeBytes ? formatSize(file.sizeBytes) : 'Unknown';
          const srcRes = file.width && file.height ? `${file.width}×${file.height}` : file.hasVideo ? 'Unknown' : 'N/A (Audio Only)';
          const srcFps = file.fps ? `${file.fps} FPS` : file.hasVideo ? 'Unknown' : 'N/A (Audio Only)';
          const srcVCodec = file.videoCodec ? file.videoCodec.toUpperCase() : file.hasVideo ? 'Unknown' : 'N/A (Audio Only)';
          const srcACodec = file.audioCodec ? file.audioCodec.toUpperCase() : file.hasAudio ? 'Unknown' : 'N/A (No Audio Track)';

          const targetFormat = `.${selectedFormat.toUpperCase()}`;
          const targetRes = isAudioTarget ? 'N/A (Audio Only)' : selectedPreset.resolution || (file.width && file.height ? `${file.width}×${file.height}` : 'Source Resolution');
          const targetFps = isAudioTarget ? 'N/A (Audio Only)' : selectedPreset.fps ? `${selectedPreset.fps} FPS` : (file.fps ? `${file.fps} FPS` : 'Source Frame Rate');

          let targetEncoder = 'H.264 (libx264)';
          if (isAudioTarget) {
            targetEncoder = selectedFormat === 'mp3' ? 'MP3 (libmp3lame)' : selectedFormat === 'wav' ? 'PCM (pcm_s16le)' : 'FLAC Lossless';
          } else if (gpuCaps?.hasGpu && isPro) {
            if (gpuCaps.type === 'nvenc') targetEncoder = selectedPreset.videoCodec === 'hevc' ? 'HEVC (NVENC)' : 'H.264 (NVENC)';
            else if (gpuCaps.type === 'qsv') targetEncoder = selectedPreset.videoCodec === 'hevc' ? 'HEVC (QuickSync)' : 'H.264 (QuickSync)';
            else if (gpuCaps.type === 'amf') targetEncoder = selectedPreset.videoCodec === 'hevc' ? 'HEVC (AMF)' : 'H.264 (AMF)';
            else if (gpuCaps.type === 'videotoolbox') targetEncoder = selectedPreset.videoCodec === 'hevc' ? 'HEVC (VideoToolbox)' : 'H.264 (VideoToolbox)';
          } else {
            targetEncoder = selectedPreset.videoCodec === 'hevc' ? 'HEVC (libx265)' : selectedPreset.videoCodec === 'vp9' ? 'VP9 (libvpx-vp9)' : 'H.264 (libx264)';
          }

          let framingMethod = 'N/A (Audio Only)';
          if (!isAudioTarget) {
            const activeFraming = selectedPreset.aspectRatioMode || framingMode;
            if (activeFraming === 'crop_fill') framingMethod = 'Crop to Fill (0 Black Bars)';
            else if (activeFraming === 'blur_pad') framingMethod = 'Blurred Background';
            else if (activeFraming === 'stretch') framingMethod = 'Stretch to Fit';
            else framingMethod = 'Letterbox (Black Bars)';
          }

          const audioSetting = 'Original Volume & Vocal Fidelity Preserved';

          return (
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold font-nunito text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#0B6FFB]" /> Conversion Summary
                </h3>
                <span className="text-[10px] font-mono uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold tracking-wider">
                  Source vs Target
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Source File Overview */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-mono text-slate-500 mb-1">
                    <span>📥 Source File ({srcName})</span>
                  </p>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between border-b border-slate-200/50 pb-1"><span className="text-slate-500">Source Filename:</span><span className="font-semibold text-slate-900 truncate max-w-[200px]" title={srcName}>{srcName}</span></div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1"><span className="text-slate-500">Source File Size:</span><span className="font-semibold">{srcSize}</span></div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1"><span className="text-slate-500">Source Resolution:</span><span className="font-semibold">{srcRes}</span></div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1"><span className="text-slate-500">Source Frame Rate:</span><span className="font-semibold">{srcFps}</span></div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1"><span className="text-slate-500">Source Video Codec:</span><span className="font-semibold">{srcVCodec}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Source Audio Codec:</span><span className="font-semibold">{srcACodec}</span></div>
                  </div>
                </div>

                {/* Target Planned Output */}
                <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100 space-y-2">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-mono text-[#0B6FFB] mb-1">
                    <span>🎯 Target Planned Output</span>
                  </p>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Selected Format:</span><span className="font-bold text-[#0B6FFB]">{targetFormat}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Target Resolution:</span><span className="font-semibold">{targetRes}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Target Frame Rate:</span><span className="font-semibold">{targetFps}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Selected Encoder:</span><span className="font-semibold">{targetEncoder}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Framing Method:</span><span className="font-semibold">{framingMethod}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Audio Preservation:</span><span className="font-semibold text-emerald-700">{audioSetting}</span></div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Queue List */}
        {jobs.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-nunito">Conversion Queue ({jobs.length})</h2>
                <p className="text-xs text-slate-500">
                  {jobs.filter((j) => j.status === 'completed').length} completed &bull; {jobs.filter((j) => j.status === 'queued').length} ready
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={clearAllJobs}
                  disabled={isConvertingAll}
                  className="text-xs font-semibold text-slate-600 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Clear Queue
                </button>
                <button
                  onClick={convertAll}
                  disabled={isConvertingAll}
                  className="flex items-center gap-2 bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-[#0BB3FA]" />
                  {isConvertingAll ? 'Converting Batch...' : 'Convert All Files'}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 flex flex-col hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="shrink-0 drop-shadow-sm">
                        <PlatformIcon id={job.options.presetId || selectedPreset.id} size={36} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-sm md:max-w-md">
                          {job.file.name}
                        </p>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{formatSize(job.file.sizeBytes)}</span>
                          <span>&bull;</span>
                          <span className="uppercase font-semibold text-slate-700">
                            {job.file.format} &rarr; {job.options.outputFormat}
                          </span>
                          {job.file.width && job.file.height && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-600">{job.file.width}×{job.file.height}</span>
                            </>
                          )}
                          {job.file.durationSeconds && (
                            <>
                              <span>&bull;</span>
                              <span>{Math.round(job.file.durationSeconds)}s</span>
                            </>
                          )}
                          {job.encoderUsed && (
                            <>
                              <span>&bull;</span>
                              <span className="text-emerald-700 font-medium">{job.encoderUsed}</span>
                            </>
                          )}
                        </div>

                        {/* What Will Change / Conversion Details Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold mt-2 py-0.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                            job.status === 'completed'
                              ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              : 'text-[#0B6FFB] bg-blue-50/80 hover:bg-blue-100/70 border-blue-200/60'
                          }`}
                        >
                          <span>
                            {expandedJobId === job.id
                              ? 'Hide Details'
                              : job.status === 'completed'
                              ? 'View Changes Made'
                              : 'What Will Change'}
                          </span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${
                              expandedJobId === job.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      {job.status === 'converting' && (
                        <div className="flex items-center gap-3">
                          <div className="w-28 sm:w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#0B6FFB] h-full rounded-full transition-all duration-300 animate-pulse"
                              style={{ width: `${job.progress.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-10 text-right">
                            {job.progress.percent}%
                          </span>
                          <button
                            type="button"
                            onClick={() => pauseJob(job.id)}
                            className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                            title="Pause Conversion"
                          >
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Pause</span>
                          </button>
                        </div>
                      )}

                      {job.status === 'paused' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            Paused
                          </span>
                          <button
                            onClick={() => runSingleJob(job.id)}
                            className="flex items-center gap-1 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                            title="Resume Conversion"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Resume</span>
                          </button>
                        </div>
                      )}

                      {job.status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            Saved {formatSize(job.bytesSaved || 0)}
                          </div>

                          {job.downloadUrl && (
                            <a
                              href={job.downloadUrl}
                              download
                              className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-[#0BB3FA]" />
                              Download
                            </a>
                          )}

                          {job.outputPath && (
                            <button
                              onClick={() => revealFolder(job.outputPath)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                              title="Reveal in Windows Explorer"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}

                      {job.status === 'failed' && (
                        <div
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 max-w-xs truncate"
                          title={job.errorMessage}
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Failed: {job.errorMessage}
                        </div>
                      )}

                      {job.status === 'queued' && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Ready
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {(job.status === 'queued' || job.status === 'failed' || job.status === 'paused') && (
                          <button
                            onClick={() => runSingleJob(job.id)}
                            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Start Conversion"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        )}
                        <button
                          onClick={() => removeJob(job.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Expanded What Will Change Preview */}
                  {expandedJobId === job.id && (
                    <div className="w-full mt-2">
                      <ConversionChangesPreview
                        file={job.file}
                        options={job.options}
                        preset={selectedPreset}
                        gpuCaps={gpuCaps}
                        isPro={isPro}
                        variant="inline"
                        defaultExpanded={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Downloads Preview in Workspace */}
        {history.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0B6FFB]/10 text-[#0B6FFB] flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-nunito text-slate-900">Recent Downloads</h3>
                  <p className="text-xs text-slate-500">Your latest converted media files ready for download</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0B6FFB] hover:text-[#0958cc] transition-colors cursor-pointer"
              >
                <span>View full history ({history.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {history.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-2xl px-3 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(item.outputFormat) ? (
                        <FileAudio className="w-4 h-4 text-[#0B6FFB]" />
                      ) : (
                        <FileVideo className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-sm sm:max-w-md">
                        {item.originalFileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                        <span className="font-mono uppercase font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.outputFormat}
                        </span>
                        <span>&bull;</span>
                        <span>{formatSize(item.outputSizeBytes)}</span>
                        {item.bytesSaved > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-600 font-medium">Saved {formatSize(item.bytesSaved)}</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {item.outputPath && (
                      <a
                        href={`/api/download?path=${encodeURIComponent(item.outputPath)}`}
                        download
                        className="inline-flex items-center gap-1.5 bg-[#0B6FFB] hover:bg-[#0958cc] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    )}
                    {item.outputPath && (
                      <button
                        type="button"
                        onClick={() => revealFolder(item.outputPath)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Reveal in Windows Explorer"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    ) : (
      /* Full Dedicated Download History View */
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-start gap-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors shadow-xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0B6FFB]" />
            Convert New Files
          </button>
        </div>

        {/* Unified Metrics Bar */}
        <div className="bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-xs">
          <div className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5 text-[#0B6FFB]" />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">Total Converted</p>
              <p className="text-2xl font-extrabold font-mono text-slate-950">{history.length}</p>
              <p className="text-[11px] text-slate-500">Ready for download</p>
            </div>
          </div>

          <div className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">Storage Saved</p>
              <p className="text-2xl font-extrabold font-mono text-slate-950">{formatSize(totalBytesSaved)}</p>
              <p className="text-[11px] text-slate-500">Disk space optimized</p>
            </div>
          </div>

          <div className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">GPU Accelerated</p>
              <p className="text-2xl font-extrabold font-mono text-slate-950">{gpuConversionsCount}</p>
              <p className="text-[11px] text-slate-500">Hardware-encoded files</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search history by file name, preset, or format..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6FFB]/20 focus:border-[#0B6FFB] transition-all"
            />
            {historySearch && (
              <button
                type="button"
                onClick={() => setHistorySearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Format Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setHistoryFormatFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                historyFormatFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({history.length})
            </button>
            {availableFormats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setHistoryFormatFilter(fmt)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase font-mono tracking-wider transition-all cursor-pointer shrink-0 ${
                  historyFormatFilter === fmt
                    ? 'bg-[#0B6FFB] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {fmt} ({history.filter((h) => h.outputFormat.toLowerCase() === fmt).length})
              </button>
            ))}
          </div>
        </div>

        {/* History Items List */}
        {filteredHistory.length > 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 shadow-xs">
                    {['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(item.outputFormat) ? (
                      <FileAudio className="w-6 h-6 text-[#0B6FFB]" />
                    ) : (
                      <FileVideo className="w-6 h-6 text-purple-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900 truncate max-w-sm md:max-w-md">
                        {item.originalFileName}
                      </p>
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {item.outputFormat}
                      </span>
                      {item.isGpuAccelerated && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                          <Zap className="w-2.5 h-2.5" /> GPU
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      {item.presetUsed && (
                        <>
                          <span className="font-medium text-slate-700">{item.presetUsed}</span>
                          <span>&bull;</span>
                        </>
                      )}
                      <span>{formatSize(item.outputSizeBytes)}</span>
                      {item.bytesSaved > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                            Saved {formatSize(item.bytesSaved)}
                          </span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span className="text-slate-400 font-mono text-[11px]">{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                  {item.outputPath && (
                    <a
                      href={`/api/download?path=${encodeURIComponent(item.outputPath)}`}
                      download
                      className="inline-flex items-center gap-2 bg-[#0B6FFB] hover:bg-[#0958cc] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  )}

                  {item.outputPath && (
                    <button
                      type="button"
                      onClick={() => revealFolder(item.outputPath)}
                      className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Reveal in Windows Explorer"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete from History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold font-nunito text-slate-900 mb-1">
              {historySearch || historyFormatFilter !== 'all'
                ? 'No matching files found'
                : 'Your conversion history is empty'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              {historySearch || historyFormatFilter !== 'all'
                ? 'Try adjusting your search terms or filter criteria.'
                : 'Files converted in Vimora will appear here with direct download links and space savings.'}
            </p>
            {historySearch || historyFormatFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setHistorySearch('');
                  setHistoryFormatFilter('all');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B6FFB] hover:text-[#0958cc] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className="inline-flex items-center gap-2 bg-[#0B6FFB] hover:bg-[#0958cc] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" /> Convert Files Now
              </button>
            )}
          </div>
        )}
      </div>
    )}
  </main>
    </div>
  );
}
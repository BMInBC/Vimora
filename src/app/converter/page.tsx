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
import {
  ConversionJob,
  ConversionOptions,
  CreatorPreset,
  GpuCapabilities,
  MediaFileInfo,
  OutputFormat,
  LocalHistoryRecord,
} from '@/lib/types';
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  Play,
  Trash2,
  FolderOpen,
  Zap,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
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

export default function ConverterPage() {
  const { user, isPro } = useAuth();
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<CreatorPreset>(CREATOR_PRESETS[0]);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('mp4');
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [outputDir, setOutputDir] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // History & Tab navigation state
  const [history, setHistory] = useState<LocalHistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFormatFilter, setHistoryFormatFilter] = useState('all');

  // Store raw browser File objects for local upload staging
  const rawFilesRef = useRef<Map<string, File>>(new Map());

  const refreshHistory = () => {
    setHistory(getLocalHistory());
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

      const options: ConversionOptions = {
        outputFormat: selectedFormat,
        presetId: selectedPreset.id,
        quality: 'balanced',
        videoCodec: selectedPreset.videoCodec,
        audioCodec: selectedPreset.audioCodec,
        resolution: selectedPreset.resolution,
        fps: selectedPreset.fps,
        videoBitrate: selectedPreset.videoBitrate,
        audioBitrate: selectedPreset.audioBitrate,
        audioSampleRate: selectedPreset.audioSampleRate,
        audioChannels: selectedPreset.audioChannels,
        normalizeAudio: selectedPreset.normalizeAudio ?? (['wav', 'mp3', 'flac', 'aac', 'ogg'].includes(selectedFormat)),
        maintainAspect: selectedPreset.maintainAspect,
        outputDirectory: outputDir,
      };

      newJobs.push({
        id: 'job_' + Math.random().toString(36).substring(2, 9),
        file: fileInfo,
        options,
        status: 'queued',
        progress: { percent: 0 },
      });
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

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'converting', progress: { percent: 15, speed: '2.0x' }, startedAt: Date.now() }
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
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
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
      });
      refreshHistory();
    } catch (err: any) {
      console.error('Job error:', err);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'failed', errorMessage: err.message || 'Error occurred during FFmpeg process' }
            : j
        )
      );
    }
  };

  const convertAll = async () => {
    if (isConvertingAll) return;
    setIsConvertingAll(true);
    const queued = jobs.filter((j) => j.status === 'queued' || j.status === 'failed');
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
        body: JSON.stringify({ folderPath }),
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
    deleteLocalHistoryRecord(id);
    refreshHistory();
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire conversion and download history?')) {
      clearLocalHistory();
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <Logo size={30} priority />
            </Link>

            {/* Segmented Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'workspace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-[#0B6FFB]" />
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
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-slate-700" />
                <span>Download History</span>
                {history.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                    {history.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* GPU Badge */}
            {gpuCaps && (
              <div className="hidden md:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200">
                <Cpu className={`w-3.5 h-3.5 ${gpuCaps.hasGpu ? 'text-[#0B6FFB]' : 'text-slate-400'}`} />
                <span className="truncate max-w-[160px]">{gpuCaps.displayName}</span>
              </div>
            )}

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
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold font-nunito flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B6FFB]" /> Platform & Creator Encoding Presets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose an optimized conversion preset for YouTube, TikTok, Instagram, X / Twitter, Discord, WhatsApp, or Studio Master.
              </p>
            </div>
            {!isPro && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0B6FFB] hover:bg-[#0958cc] text-white px-3.5 py-2 rounded-xl transition-all shadow-sm self-start sm:self-auto"
              >
                <Lock className="w-3.5 h-3.5" /> Unlock 4K & GPU Presets
              </Link>
            )}
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
            Targeting: <strong className="text-slate-800">{selectedPreset.name}</strong> ({selectedFormat.toUpperCase()}). Processed 100% locally via GPU.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl">
            Click to Browse Files
          </div>
        </section>

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
                  className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
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
                        {job.encoderUsed && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-700 font-medium">{job.encoderUsed}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    {job.status === 'converting' && (
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#0B6FFB] h-full rounded-full transition-all duration-300 animate-pulse"
                            style={{ width: `${job.progress.percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-12 text-right">
                          {job.progress.percent}%
                        </span>
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
                      {(job.status === 'queued' || job.status === 'failed') && (
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
        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-[#0B6FFB]/10 text-[#0B6FFB] border border-[#0B6FFB]/20">
              <History className="w-3.5 h-3.5" /> Conversion & Download Archive
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-nunito text-slate-900">
              Download History
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl">
              Access and re-download your previously converted files, open their local folders, and inspect storage savings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow active:scale-95 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0BB3FA]" />
              Convert New Files
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B6FFB] flex items-center justify-center shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Converted</p>
              <p className="text-2xl font-black font-nunito text-slate-900">{history.length}</p>
              <p className="text-[11px] text-slate-500">Ready for download</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Storage Saved</p>
              <p className="text-2xl font-black font-nunito text-slate-900">{formatSize(totalBytesSaved)}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Disk space optimized</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">GPU Accelerated</p>
              <p className="text-2xl font-black font-nunito text-slate-900">{gpuConversionsCount}</p>
              <p className="text-[11px] text-slate-500">Hardware-encoded files</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                : 'Your download history is empty'}
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
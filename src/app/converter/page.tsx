"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/authContext';
import { CREATOR_PRESETS } from '@/lib/ffmpeg/presets';
import { detectGpuCapabilities } from '@/lib/ffmpeg/detector';
import { addLocalHistoryRecord, getAppSettings } from '@/lib/storage/localHistory';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Logo } from '@/components/Logo';
import {
  ConversionJob,
  ConversionOptions,
  CreatorPreset,
  GpuCapabilities,
  MediaFileInfo,
  OutputFormat,
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
  
  // Store raw browser File objects for local upload staging
  const rawFilesRef = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    detectGpuCapabilities().then(setGpuCaps);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={30} priority />
            </Link>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* GPU Badge */}
            {gpuCaps && (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200">
                <Cpu className={`w-3.5 h-3.5 ${gpuCaps.hasGpu ? 'text-[#0B6FFB]' : 'text-slate-400'}`} />
                <span>{gpuCaps.displayName}</span>
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
      </main>
    </div>
  );
}
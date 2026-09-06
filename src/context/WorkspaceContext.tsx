"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import {
  ConversionJob,
  ConversionOptions,
  CompressOptions,
  EnhanceOptions,
  MediaFileInfo,
  OutputFormat,
  GpuCapabilities,
  LocalHistoryRecord,
} from '@/lib/types';
import { CREATOR_PRESETS } from '@/lib/ffmpeg/presets';
import { detectGpuCapabilities } from '@/lib/ffmpeg/detector';
import {
  getLocalHistory,
  addLocalHistoryRecord,
  deleteLocalHistoryRecord,
  clearLocalHistory,
  getAppSettings,
} from '@/lib/storage/localHistory';
import { useAuth } from '@/lib/firebase/authContext';

export interface PreviewState {
  previewUrl: string | null;
  isGenerating: boolean;
  durationSeconds: number;
  outputSizeBytes?: number;
  outputResolution?: string;
  error?: string | null;
}

interface WorkspaceContextType {
  // Shared File
  selectedFile: File | null;
  mediaInfo: MediaFileInfo | null;
  objectUrl: string | null;
  handleFileSelected: (file: File) => void;
  requestFileRemoval: (onConfirmed?: () => void) => void;
  confirmFileRemoval: () => void;
  cancelFileRemoval: () => void;
  isRemoveModalOpen: boolean;

  // Unfinished Settings
  convertSettings: ConversionOptions;
  setConvertSettings: React.Dispatch<React.SetStateAction<ConversionOptions>>;
  compressSettings: CompressOptions;
  setCompressSettings: React.Dispatch<React.SetStateAction<CompressOptions>>;
  enhanceSettings: EnhanceOptions;
  setEnhanceSettings: React.Dispatch<React.SetStateAction<EnhanceOptions>>;

  // Shared Queue
  jobs: ConversionJob[];
  addJobFromCurrentTool: (tool: 'convert' | 'compress' | 'enhance') => void;
  removeJob: (id: string) => void;
  runSingleJob: (jobId: string) => Promise<void>;
  convertAll: () => Promise<void>;
  clearAllJobs: () => void;
  isConvertingAll: boolean;

  // GPU & Storage
  gpuCaps: GpuCapabilities | null;
  outputDir: string;
  setOutputDir: (dir: string) => void;

  // History
  history: LocalHistoryRecord[];
  refreshHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;

  // Preview
  previewState: PreviewState;
  generatePreview: (tool: 'convert' | 'compress' | 'enhance', startSec?: number, durationSec?: number) => Promise<void>;

  // Utility
  formatSize: (bytes: number) => string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isPro } = useAuth();

  // Shared File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaFileInfo | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const rawFilesRef = useRef<Map<string, File>>(new Map());

  // Removal Confirmation Modal
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [pendingRemovalAction, setPendingRemovalAction] = useState<(() => void) | null>(null);

  // Settings State across tools
  const [convertSettings, setConvertSettings] = useState<ConversionOptions>({
    outputFormat: 'mp4',
    presetId: CREATOR_PRESETS[0].id,
    quality: 'high',
    autoEnhanceQuality: true,
    videoCodec: 'h264',
    audioCodec: 'aac',
    resolution: '1920x1080',
    maintainAspect: true,
    normalizeAudio: true,
  });

  const [compressSettings, setCompressSettings] = useState<CompressOptions>({
    mode: 'target_size',
    targetSizeMb: 25,
    reductionPercent: 50,
    qualityLevel: 'balanced',
    qualityGoal: 'enhance',
    clarityBoost: 'crisp',
    colorPolish: true,
    denoiseArtifacts: true,
    downscaleIfLarge: false,
    outputFormat: 'mp4',
  });

  const [enhanceSettings, setEnhanceSettings] = useState<EnhanceOptions>({
    upscaleTarget: 'none',
    denoise: 0,
    sharpen: 25,
    eqContrast: 1.05,
    eqBrightness: 0.0,
    eqSaturation: 1.1,
    normalizeAudio: true,
  });

  // Global Queue
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  // GPU & Storage
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [outputDir, setOutputDir] = useState<string>('');
  const [history, setHistory] = useState<LocalHistoryRecord[]>([]);

  // Preview State
  const [previewState, setPreviewState] = useState<PreviewState>({
    previewUrl: null,
    isGenerating: false,
    durationSeconds: 5,
  });

  useEffect(() => {
    detectGpuCapabilities().then(setGpuCaps);
    setHistory(getLocalHistory());
    const settings = getAppSettings();
    if (settings.defaultOutputDirectory) {
      setOutputDir(settings.defaultOutputDirectory);
    }
  }, []);

  const refreshHistory = () => {
    setHistory(getLocalHistory());
  };

  const deleteHistoryItem = (id: string) => {
    deleteLocalHistoryRecord(id);
    refreshHistory();
  };

  const clearHistory = () => {
    clearLocalHistory();
    refreshHistory();
  };

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelected = (file: File) => {
    // Revoke previous URL if any
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setSelectedFile(file);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|mkv|avi|webm)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|aac|flac|ogg|m4a)$/i.test(file.name);
    const fileId = 'file_' + Math.random().toString(36).substring(2, 9);

    rawFilesRef.current.set(fileId, file);

    const info: MediaFileInfo = {
      id: fileId,
      name: file.name,
      path: (file as any).path || file.name,
      sizeBytes: file.size,
      format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      hasVideo: isVideo,
      hasAudio: isAudio || isVideo,
      lastModified: file.lastModified,
    };

    // Attempt to inspect video dimensions
    if (isVideo && typeof window !== 'undefined') {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setMediaInfo((prev) =>
          prev
            ? {
                ...prev,
                durationSeconds: Math.round(tempVideo.duration) || undefined,
                width: tempVideo.videoWidth || undefined,
                height: tempVideo.videoHeight || undefined,
              }
            : prev
        );
      };
    }

    setMediaInfo(info);
    setPreviewState({ previewUrl: null, isGenerating: false, durationSeconds: 5 });
  };

  const requestFileRemoval = (onConfirmed?: () => void) => {
    setPendingRemovalAction(() => onConfirmed || null);
    setIsRemoveModalOpen(true);
  };

  const confirmFileRemoval = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    setObjectUrl(null);
    setSelectedFile(null);
    setMediaInfo(null);
    setPreviewState({ previewUrl: null, isGenerating: false, durationSeconds: 5 });
    setIsRemoveModalOpen(false);

    if (pendingRemovalAction) {
      pendingRemovalAction();
      setPendingRemovalAction(null);
    }
  };

  const cancelFileRemoval = () => {
    setIsRemoveModalOpen(false);
    setPendingRemovalAction(null);
  };

  const buildCurrentOptions = (tool: 'convert' | 'compress' | 'enhance'): ConversionOptions => {
    if (tool === 'convert') {
      return {
        ...convertSettings,
        toolType: 'convert',
        outputDirectory: outputDir,
      };
    }

    if (tool === 'compress') {
      return {
        toolType: 'compress',
        outputFormat: compressSettings.outputFormat || 'mp4',
        quality:
          compressSettings.qualityLevel === 'small'
            ? 'smaller'
            : compressSettings.qualityLevel === 'ultra'
            ? 'high'
            : 'balanced',
        compress: compressSettings,
        outputDirectory: outputDir,
        keepAudio: true,
      };
    }

    // Enhance tool
    return {
      toolType: 'enhance',
      outputFormat: 'mp4',
      quality: 'high',
      enhance: enhanceSettings,
      outputDirectory: outputDir,
      keepAudio: true,
      normalizeAudio: enhanceSettings.normalizeAudio,
    };
  };

  const addJobFromCurrentTool = (tool: 'convert' | 'compress' | 'enhance') => {
    if (!selectedFile || !mediaInfo) {
      alert('Please upload or select a media file first.');
      return;
    }

    // Free tier limitation check
    if (!isPro && jobs.length >= 5) {
      alert('Free tier allows up to 5 conversion jobs in queue. Upgrade to Pro for unlimited queueing!');
      return;
    }

    const options = buildCurrentOptions(tool);
    const newJob: ConversionJob = {
      id: 'job_' + Math.random().toString(36).substring(2, 9),
      file: mediaInfo,
      options,
      status: 'queued',
      progress: { percent: 0 },
    };

    setJobs((prev) => [...prev, newJob]);
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const clearAllJobs = () => {
    if (isConvertingAll) return;
    setJobs([]);
  };

  const runSingleJob = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'converting', progress: { percent: 20, speed: '2.4x' }, startedAt: Date.now() }
          : j
      )
    );

    try {
      const rawFile = rawFilesRef.current.get(job.file.id);
      let res: Response;

      if (rawFile) {
        const formData = new FormData();
        formData.append('file', rawFile);
        formData.append('options', JSON.stringify(job.options));
        if (job.options.outputDirectory) {
          formData.append('outputDirectory', job.options.outputDirectory);
        }
        res = await fetch('/api/convert', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputPath: job.file.path,
            outputDirectory: job.options.outputDirectory,
            options: job.options,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      const completedJob: ConversionJob = {
        ...job,
        status: 'completed',
        progress: { percent: 100 },
        outputPath: data.outputPath,
        outputSizeBytes: data.outputSizeBytes || Math.round(job.file.sizeBytes * 0.7),
        bytesSaved: Math.max(0, job.file.sizeBytes - (data.outputSizeBytes || job.file.sizeBytes * 0.7)),
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
        presetUsed: completedJob.options.presetId || completedJob.options.toolType || 'custom',
        encoderUsed: completedJob.encoderUsed || 'libx264',
        isGpuAccelerated: Boolean(completedJob.isGpuAccelerated),
        status: 'completed',
        durationSeconds: Math.round(data.durationSeconds || 4),
        timestamp: Date.now(),
      });
      refreshHistory();
    } catch (err: any) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'failed', errorMessage: err.message || 'Error occurred during processing' }
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

  const generatePreview = async (
    tool: 'convert' | 'compress' | 'enhance',
    startSec = 0,
    durationSec = 5
  ) => {
    if (!selectedFile || !mediaInfo) {
      alert('Please upload a video to generate a visual preview.');
      return;
    }

    setPreviewState({
      previewUrl: null,
      isGenerating: true,
      durationSeconds: durationSec,
      error: null,
    });

    try {
      const options = buildCurrentOptions(tool);
      const rawFile = rawFilesRef.current.get(mediaInfo.id);
      let res: Response;

      if (rawFile) {
        const formData = new FormData();
        formData.append('file', rawFile);
        formData.append('options', JSON.stringify(options));
        formData.append('startTimeSeconds', startSec.toString());
        formData.append('durationSeconds', durationSec.toString());
        res = await fetch('/api/preview', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputPath: mediaInfo.path,
            options,
            startTimeSeconds: startSec,
            durationSeconds: durationSec,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to render preview snippet');
      }

      setPreviewState({
        previewUrl: data.previewUrl,
        isGenerating: false,
        durationSeconds: durationSec,
        outputSizeBytes: data.outputSizeBytes,
        outputResolution: data.resolution,
      });
    } catch (err: any) {
      console.error('Preview failed:', err);
      setPreviewState((prev) => ({
        ...prev,
        isGenerating: false,
        error: err.message || 'Preview generation failed',
      }));
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        selectedFile,
        mediaInfo,
        objectUrl,
        handleFileSelected,
        requestFileRemoval,
        confirmFileRemoval,
        cancelFileRemoval,
        isRemoveModalOpen,
        convertSettings,
        setConvertSettings,
        compressSettings,
        setCompressSettings,
        enhanceSettings,
        setEnhanceSettings,
        jobs,
        addJobFromCurrentTool,
        removeJob,
        runSingleJob,
        convertAll,
        clearAllJobs,
        isConvertingAll,
        gpuCaps,
        outputDir,
        setOutputDir,
        history,
        refreshHistory,
        deleteHistoryItem,
        clearHistory,
        previewState,
        generatePreview,
        formatSize,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

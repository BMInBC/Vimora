"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/authContext';
import { CREATOR_PRESETS, getPresetById } from '@/lib/ffmpeg/presets';
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
import { WorkflowStepper } from '@/components/WorkflowStepper';
import { WorkstationStatusStrip } from '@/components/WorkstationStatusStrip';
import { QuickActionGrid } from '@/components/QuickActionGrid';
import { DestinationPresetPicker } from '@/components/DestinationPresetPicker';
import { TargetSizePanel } from '@/components/TargetSizePanel';
import { SmartVerticalPanel } from '@/components/SmartVerticalPanel';
import { ErrorDisplayCard } from '@/components/ErrorDisplayCard';
import { UpgradePromptBanner } from '@/components/UpgradePromptBanner';
import { validateTargetSizeOutput } from '@/lib/ffmpeg/bitrateBudget';
import { generateOutputFilename, isDuplicateJob } from '@/lib/ffmpeg/filenamePattern';
import { recordLocalBenchmark } from '@/lib/ffmpeg/changes';
import {
  checkBatchLimitEntitlement,
  FREE_TIER_LIMITS,
} from '@/lib/entitlements';
import {
  getCustomPresets,
  hasCompletedFirstConversion,
  markFirstConversionCompleted,
} from '@/lib/storage/customPresets';
import {
  ConversionJob,
  ConversionOptions,
  CreatorPreset,
  GpuCapabilities,
  MediaFileInfo,
  OutputFormat,
  LocalHistoryRecord,
  AspectRatioMode,
  SubjectFocus,
  QuickActionItem,
  QualityPreset,
  TargetSizeRecoveryAction,
  WorkflowStep,
} from '@/lib/types';
import {
  buildSafeFfmpegArgs,
  buildTwoPassFfmpegArgs,
  shouldUseCpuTwoPass,
} from '@/lib/ffmpeg/converter';
import {
  isDesktopApp,
  convertDesktopMedia,
  cancelDesktopConversion,
  openDesktopFolder,
  pickDesktopFiles,
  pickDesktopFolderFiles,
  expandDesktopMediaPaths,
  pickDesktopOutputDirectory,
  getDesktopDownloadDir,
  getDesktopFileSize,
  probeDesktopMedia,
} from '@/lib/desktop/tauriBridge';
import {
  extractFilesFromDataTransfer,
  filterMediaFiles,
} from '@/lib/media/fileDrop';
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  FolderPlus,
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
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

function getProcessingEngineMessage(gpuCaps: GpuCapabilities | null): string {
  if (gpuCaps?.hasGpu && gpuCaps.type !== 'cpu') {
    switch (gpuCaps.type) {
      case 'nvenc':
        return 'Processed 100% locally using NVIDIA NVENC.';
      case 'qsv':
        return 'Processed 100% locally using Intel Quick Sync.';
      case 'amf':
        return 'Processed 100% locally using AMD AMF.';
      case 'videotoolbox':
        return 'Processed 100% locally using Apple VideoToolbox.';
    }
  }
  return 'Processed 100% locally using CPU encoding.';
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
  const [subjectFocus, setSubjectFocus] = useState<SubjectFocus>('center');
  const [cropPositionX, setCropPositionX] = useState<number>(50);
  const [cropPositionY, setCropPositionY] = useState<number>(50);
  const [activeQuickActionId, setActiveQuickActionId] = useState<string | null>('tiktok_reels');
  const [showAdvancedOutput, setShowAdvancedOutput] = useState<boolean>(false);
  const [isRecheckingHw, setIsRecheckingHw] = useState<boolean>(false);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRecheckHardware = async () => {
    setIsRecheckingHw(true);
    try {
      const fresh = await detectGpuCapabilities({ forceRefresh: true });
      setGpuCaps(fresh);
    } finally {
      setIsRecheckingHw(false);
    }
  };

  const handleRetryWithDifferentSettings = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'queued', errorMessage: undefined, progress: { percent: 0 } }
          : j
      )
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queueSectionRef = useRef<HTMLDivElement>(null);
  
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

  const handleSubjectFocusChange = (focus: SubjectFocus) => {
    setSubjectFocus(focus);
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                subjectFocus: focus,
              },
            }
          : job
      )
    );
  };

  const handleCropPositionChange = (x: number, y: number) => {
    setCropPositionX(x);
    setCropPositionY(y);
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                subjectFocus: 'manual',
                cropPositionX: x,
                cropPositionY: y,
              },
            }
          : job
      )
    );
  };

  // Target File Size Limit & Range state (Default is auto conversion with no specified size limit)
  const [sizeLimitMode, setSizeLimitMode] = useState<'auto' | 'limit'>('auto');
  const [targetSizeMb, setTargetSizeMb] = useState<number>(20);
  const [targetSizeInput, setTargetSizeInput] = useState<string>('20');
  const [selectedSizePreset, setSelectedSizePreset] = useState<'auto' | 'discord' | 'whatsapp' | 'email' | 'social' | 'custom'>('auto');
  const [qualityPreference, setQualityPreference] = useState<QualityPreset>('balanced');
  const [strictTwoPass, setStrictTwoPass] = useState<boolean>(false);
  const [isSizeCardExpanded, setIsSizeCardExpanded] = useState<boolean>(true);

  const handleStrictTwoPassChange = (enabled: boolean) => {
    setStrictTwoPass(enabled);
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                strictTwoPass: enabled,
              },
            }
          : job
      )
    );
  };

  const handleQualityPreferenceChange = (quality: QualityPreset) => {
    setQualityPreference(quality);
    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                quality,
              },
            }
          : job
      )
    );
  };

  const handleApplyRecoveryAction = (action: TargetSizeRecoveryAction) => {
    if (action.type === 'increase_size' && action.recommendedTargetMb) {
      handleSizeSettingChange('limit', 'custom', action.recommendedTargetMb, true);
      return;
    }

    setJobs((prev) =>
      prev.map((job) => {
        if (job.status !== 'queued') return job;
        const nextOptions = { ...job.options };
        if (action.type === 'reduce_resolution' && action.recommendedResolution) {
          nextOptions.resolution = action.recommendedResolution;
        } else if (action.type === 'reduce_fps' && action.recommendedFps) {
          nextOptions.fps = action.recommendedFps;
        } else if (action.type === 'remove_audio') {
          nextOptions.keepAudio = false;
        } else if (action.type === 'efficient_codec' && action.recommendedCodec) {
          nextOptions.videoCodec = action.recommendedCodec;
        }
        return { ...job, options: nextOptions };
      })
    );

    if (action.type === 'reduce_resolution' && action.recommendedResolution) {
      setSelectedPreset((prev) => ({ ...prev, resolution: action.recommendedResolution }));
    } else if (action.type === 'reduce_fps' && action.recommendedFps) {
      setSelectedPreset((prev) => ({ ...prev, fps: action.recommendedFps }));
    } else if (action.type === 'efficient_codec' && action.recommendedCodec) {
      setSelectedPreset((prev) => ({ ...prev, videoCodec: action.recommendedCodec }));
    }
  };

  const handleSizeSettingChange = (
    mode: 'auto' | 'limit',
    presetKey: 'auto' | 'discord' | 'whatsapp' | 'email' | 'social' | 'custom',
    mbValue: number,
    syncInput = true
  ) => {
    setSizeLimitMode(mode);
    setSelectedSizePreset(presetKey);
    setTargetSizeMb(mbValue);
    if (syncInput) {
      setTargetSizeInput(mbValue.toString());
    }

    const effectiveMb = mode === 'auto' ? undefined : mbValue;

    setJobs((prev) =>
      prev.map((job) =>
        job.status === 'queued'
          ? {
              ...job,
              options: {
                ...job.options,
                targetSizeMb: effectiveMb,
                sizeLimitPreset: mode === 'auto' ? 'auto' : presetKey,
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

  // Ref for desktop paths & browser files handlers to avoid stale closures in window listeners
  const handleDesktopPathsRef = useRef<(paths: string[]) => void>(() => {});
  const handleFilesAddedRef = useRef<(files: FileList | File[] | null) => void>(() => {});

  useEffect(() => {
    detectGpuCapabilities().then(setGpuCaps);
    refreshHistory();
    const settings = getAppSettings();
    if (settings.defaultOutputDirectory) {
      setOutputDir(settings.defaultOutputDirectory);
    } else if (isDesktopApp()) {
      getDesktopDownloadDir().then((dir) => {
        if (dir) setOutputDir(dir);
      });
    }

    if (isDesktopApp()) {
      let unlisten: (() => void) | undefined;
      (async () => {
        try {
          const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const appWindow = getCurrentWebviewWindow();
          unlisten = await appWindow.onDragDropEvent((event) => {
            if (event.payload.type === 'enter' || event.payload.type === 'over') {
              setDragActive(true);
            } else if (event.payload.type === 'leave') {
              setDragActive(false);
            } else if (event.payload.type === 'drop') {
              setDragActive(false);
              const paths = event.payload.paths;
              if (paths && paths.length > 0) {
                handleDesktopPathsRef.current(paths);
              }
            }
          });
        } catch (err) {
          console.warn('[converter] onDragDropEvent listener failed:', err);
        }
      })();

      return () => {
        if (unlisten) unlisten();
      };
    }

    // Browser mode: allow dropping files or folders anywhere on the page cleanly
    const onWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        setDragActive(true);
      }
    };
    const onWindowDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) {
        setDragActive(false);
      }
    };
    const onWindowDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      setDragActive(false);
      const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
      handleFilesAddedRef.current(extracted);
    };

    window.addEventListener('dragover', onWindowDragOver);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);

    return () => {
      window.removeEventListener('dragover', onWindowDragOver);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
    };
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

  // Apply URL parameters (?preset=, ?targetMb=, ?custom=1, ?view=queue) safely for static export
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const presetParam = params.get('preset');
    const targetMbParam = params.get('targetMb');
    const customParam = params.get('custom');
    const viewParam = params.get('view');

    if (presetParam) {
      const found =
        getPresetById(presetParam) ||
        getCustomPresets().find((p) => p.id === presetParam);
      if (found && (!found.requiresPro || isPro)) {
        handlePresetSelect(found);
      }
    }
    if (targetMbParam) {
      const mb = parseInt(targetMbParam, 10);
      if (!isNaN(mb) && mb > 0) {
        handleSizeSettingChange('limit', 'custom', mb, true);
        setIsSizeCardExpanded(true);
      }
    }
    if (customParam === '1') {
      setShowAdvancedOutput(true);
    }
    if (viewParam === 'queue') {
      setTimeout(() => {
        queueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  const handleQuickActionSelect = (action: QuickActionItem) => {
    setActiveQuickActionId(action.id);
    const preset = getPresetById(action.presetId);
    if (preset) {
      handlePresetSelect(preset);
    }
    if (action.enableTargetSize) {
      const mb = action.defaultTargetSizeMb || 25;
      const presetKey =
        action.id === 'whatsapp'
          ? 'whatsapp'
          : action.id === 'discord'
          ? 'discord'
          : 'custom';
      handleSizeSettingChange('limit', presetKey, mb, true);
      setIsSizeCardExpanded(true);
    } else if (action.id !== 'whatsapp' && action.id !== 'discord') {
      handleSizeSettingChange('auto', 'auto', targetSizeMb, false);
    }
    if (action.openCustomControls) {
      setShowAdvancedOutput(true);
    }
  };

  const handleBrowseFolderClick = async () => {
    if (isDesktopApp()) {
      try {
        const selected = await pickDesktopFolderFiles();
        if (selected && selected.length > 0) {
          await handleDesktopPathsAdded(selected);
        }
      } catch (err) {
        console.error('[converter] pickDesktopFolderFiles failed:', err);
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  const workflowProgress = useMemo((): {
    currentStep: WorkflowStep;
    completedSteps: WorkflowStep[];
  } => {
    if (jobs.length === 0) {
      return { currentStep: 'import', completedSteps: [] };
    }
    const anyConverting = jobs.some((j) => j.status === 'converting');
    const allCompleted = jobs.every((j) => j.status === 'completed');
    if (allCompleted) {
      return {
        currentStep: 'export',
        completedSteps: ['import', 'destination', 'review', 'convert', 'export'],
      };
    }
    if (anyConverting) {
      return {
        currentStep: 'convert',
        completedSteps: ['import', 'destination', 'review'],
      };
    }
    return {
      currentStep: 'review',
      completedSteps: ['import', 'destination'],
    };
  }, [jobs]);

  const handlePresetSelect = (preset: CreatorPreset) => {
    if (preset.requiresPro && !isPro) {
      setUpgradePrompt(
        `${preset.name} is a Vimora Pro preset. Free includes unlimited 1080p exports and GPU acceleration.`
      );
      return;
    }
    setSelectedPreset(preset);
    setSelectedFormat(preset.outputFormat);
    setIsDropdownOpen(false);
    if (preset.isCustom) {
      setShowAdvancedOutput(true);
    }

    const isVertical = preset.resolution && (() => {
      const p = preset.resolution.split('x');
      return p.length === 2 && parseInt(p[1], 10) > parseInt(p[0], 10);
    })();
    const presetFraming = preset.aspectRatioMode || (isVertical ? 'crop_fill' : 'pad_black');
    setFramingMode(presetFraming);

    let activeSizeMode = sizeLimitMode;
    let activeSizePreset = selectedSizePreset;
    let activeSizeMb = targetSizeMb;

    if (preset.maxFileSizeMb && preset.maxFileSizeMb > 0) {
      activeSizeMode = 'limit';
      activeSizePreset =
        preset.id === 'discord_compress'
          ? 'discord'
          : preset.id === 'whatsapp_compress'
          ? 'whatsapp'
          : 'social';
      activeSizeMb = preset.maxFileSizeMb;
      setSizeLimitMode('limit');
      setSelectedSizePreset(activeSizePreset);
      setTargetSizeMb(activeSizeMb);
      setTargetSizeInput(activeSizeMb.toString());
    }

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
                targetSizeMb: activeSizeMode === 'auto' ? undefined : activeSizeMb,
                sizeLimitPreset: activeSizeMode === 'auto' ? 'auto' : activeSizePreset,
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

  const handleFilesAdded = (rawFiles: FileList | File[] | null) => {
    const files = filterMediaFiles(rawFiles);
    if (files.length === 0) {
      if (rawFiles && (Array.isArray(rawFiles) ? rawFiles.length > 0 : rawFiles.length > 0)) {
        setImportNotice('No supported video or audio files were found in that selection or folder.');
      }
      return;
    }
    setImportNotice(null);

    // Fair Free plan batch limit (3 files per batch; Pro is unlimited)
    const currentCount = jobs.length;
    const batchCheck = checkBatchLimitEntitlement(isPro, currentCount, files.length);
    const allowedNew = isPro
      ? files.length
      : Math.max(0, FREE_TIER_LIMITS.maxBatchFiles - currentCount);

    if (!batchCheck.allowed) {
      if (hasCompletedFirstConversion() || currentCount >= FREE_TIER_LIMITS.maxBatchFiles) {
        setUpgradePrompt(batchCheck.reason || 'Upgrade to Pro for unlimited batch queues.');
      }
    }

    const newJobs: ConversionJob[] = [];
    const countToAdd = Math.min(files.length, allowedNew);

    for (let i = 0; i < countToAdd; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|mkv|avi|webm|wmv|flv|m4v|ts|mts|3gp|ogv)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|aac|flac|ogg|m4a|wma|opus|aiff)$/i.test(file.name);
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
        targetSizeMb: sizeLimitMode === 'auto' ? undefined : targetSizeMb,
        sizeLimitPreset: sizeLimitMode === 'auto' ? 'auto' : selectedSizePreset,
      };

      const newJobOptions: ConversionOptions = options;
      if (isDuplicateJob([...jobs, ...newJobs], fileInfo.path || fileInfo.name, newJobOptions)) {
        continue;
      }

      newJobs.push({
        id: 'job_' + Math.random().toString(36).substring(2, 9),
        file: fileInfo,
        options: newJobOptions,
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

  const handleDesktopPathsAdded = async (rawPaths: string[]) => {
    if (!rawPaths || rawPaths.length === 0) return;

    // Expand any dropped folders recursively into individual media file paths
    const paths = await expandDesktopMediaPaths(rawPaths);
    if (paths.length === 0) {
      setImportNotice('No supported video or audio files were found in the dropped files or folder.');
      return;
    }
    setImportNotice(null);

    // Fair Free plan batch limit (3 files per batch; Pro is unlimited)
    const currentCount = jobs.length;
    const batchCheck = checkBatchLimitEntitlement(isPro, currentCount, paths.length);
    const allowedNew = isPro
      ? paths.length
      : Math.max(0, FREE_TIER_LIMITS.maxBatchFiles - currentCount);

    if (!batchCheck.allowed) {
      if (hasCompletedFirstConversion() || currentCount >= FREE_TIER_LIMITS.maxBatchFiles) {
        setUpgradePrompt(batchCheck.reason || 'Upgrade to Pro for unlimited batch queues.');
      }
    }

    const newJobs: ConversionJob[] = [];
    const countToAdd = Math.min(paths.length, allowedNew);

    for (let i = 0; i < countToAdd; i++) {
      const filePath = paths[i];
      const name = filePath.split(/[\\/]/).pop() || filePath;
      const isVideo = /\.(mp4|mov|mkv|avi|webm|wmv|flv|m4v|ts|mts)$/i.test(name);
      const isAudio = /\.(mp3|wav|aac|flac|ogg|m4a|wma|opus|aiff)$/i.test(name);
      const fileId = 'file_' + Math.random().toString(36).substring(2, 9);

      const fileInfo: MediaFileInfo = {
        id: fileId,
        name,
        path: filePath,
        sizeBytes: 0,
        format: name.split('.').pop()?.toLowerCase() || 'unknown',
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
        targetSizeMb: sizeLimitMode === 'auto' ? undefined : targetSizeMb,
        sizeLimitPreset: sizeLimitMode === 'auto' ? 'auto' : selectedSizePreset,
      };

      const newJobOptions: ConversionOptions = options;
      if (isDuplicateJob([...jobs, ...newJobs], fileInfo.path || fileInfo.name, newJobOptions)) {
        continue;
      }

      newJobs.push({
        id: 'job_' + Math.random().toString(36).substring(2, 9),
        file: fileInfo,
        options: newJobOptions,
        status: 'queued',
        progress: { percent: 0 },
      });

      // Asynchronously probe accurate local file streams & metadata directly
      probeDesktopMedia(filePath).then((data) => {
        if (!data) return;
        setJobs((curr) =>
          curr.map((j) =>
            j.file.id === fileId
              ? {
                  ...j,
                  file: {
                    ...j.file,
                    sizeBytes: data.sizeBytes || j.file.sizeBytes,
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
      }).catch((err) => console.warn('[converter] probeDesktopMedia failed:', err));
    }

    setJobs((prev) => [...prev, ...newJobs]);
  };

  handleDesktopPathsRef.current = handleDesktopPathsAdded;
  handleFilesAddedRef.current = handleFilesAdded;

  const handleBrowseClick = async () => {
    if (isDesktopApp()) {
      try {
        const selected = await pickDesktopFiles();
        if (selected && selected.length > 0) {
          await handleDesktopPathsAdded(selected);
        }
      } catch (err) {
        console.error('[converter] pickDesktopFiles failed:', err);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isDesktopApp()) return;

    const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
    handleFilesAdded(extracted);
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
          ? { ...j, status: 'converting', progress: { percent: 1, speed: 'Preparing...' }, startedAt: Date.now(), errorMessage: undefined }
          : j
      )
    );

    try {
      const rawFile = rawFilesRef.current.get(job.file.id);
      const inputPath = job.file.path || (rawFile as any)?.path;

      if (isDesktopApp()) {
        const isAbsolute = inputPath && (inputPath.includes(':') || inputPath.startsWith('/') || inputPath.startsWith('\\\\'));
        if (!isAbsolute) {
          throw new Error('Please click "Browse" or drop the file directly into the app to use its full local path for conversion.');
        }

        // Desktop native direct hardware conversion
        let outDir = job.options.outputDirectory;
        if (!outDir || outDir === 'Downloads') {
          outDir = (await getDesktopDownloadDir()) || '';
        }
        if (!outDir && inputPath) {
          const lastSlash = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
          outDir = lastSlash > 0 ? inputPath.substring(0, lastSlash) : '.';
        }
        const ext = job.options.outputFormat.toLowerCase();
        const appSettings = getAppSettings();
        const generatedFileName = job.options.customOutputName
          ? `${job.options.customOutputName}.${ext}`
          : generateOutputFilename({
              originalFileName: job.file.name,
              outputFormat: ext,
              preset: selectedPreset,
              resolution: job.options.resolution || selectedPreset.resolution,
              pattern: appSettings.filenamePattern,
            });
        const baseName = generatedFileName.replace(/\.[^/.]+$/, '');
        const normalizedDir = outDir ? outDir.replace(/[\\/]+$/, '') : '.';
        const outputPath = `${normalizedDir}/${generatedFileName}`;

        const gpuEnabled = Boolean(
          gpuCaps?.hasGpu &&
          getAppSettings().gpuAccelerationEnabled &&
          !(job.options.targetSizeMb && job.options.strictTwoPass)
        );
        const useTwoPass = shouldUseCpuTwoPass({
          options: job.options,
          gpuCaps: gpuCaps || undefined,
          enableGpu: gpuEnabled,
          durationSeconds: job.file.durationSeconds,
        });

        controller.signal.addEventListener('abort', () => {
          cancelDesktopConversion(job.id);
        });

        const makeProgressHandler =
          (minPct: number, maxPct: number, stagePrefix?: string) =>
          (p: {
            percentage: number;
            fps: number;
            speed: string;
            outTimeSeconds: number;
            totalDurationSeconds: number;
          }) => {
            setJobs((prev) =>
              prev.map((j) => {
                if (j.id !== jobId) return j;
                const scaledPercent = Math.round(minPct + (p.percentage / 100) * (maxPct - minPct));
                const currentTime = p.outTimeSeconds;
                const totalTime = p.totalDurationSeconds || j.file.durationSeconds || 0;
                let timeRemaining: string | undefined;
                if (p.percentage > 0 && p.percentage < 100 && totalTime > 0) {
                  const rem = Math.max(0, totalTime - currentTime);
                  const remM = Math.floor(rem / 60);
                  const remS = Math.floor(rem % 60);
                  timeRemaining = remM > 0 ? `${remM}m ${remS}s` : `${remS}s`;
                }
                return {
                  ...j,
                  progress: {
                    percent: scaledPercent,
                    currentFps: p.fps,
                    speed: stagePrefix ? `${stagePrefix} • ${p.speed}` : p.speed,
                    currentTimeSeconds: currentTime,
                    totalTimeSeconds: totalTime,
                    timeRemaining,
                  },
                };
              })
            );
          };

        if (useTwoPass) {
          const isWin = inputPath.includes('\\') || /^[a-zA-Z]:/.test(inputPath);
          const nullTarget = isWin ? 'NUL' : '/dev/null';
          const passLogPrefix = `${normalizedDir}/${baseName}_${job.id}_2pass`;
          const { pass1Args, pass2Args } = buildTwoPassFfmpegArgs(
            {
              inputPath,
              outputPath,
              options: job.options,
              gpuCaps: gpuCaps || undefined,
              enableGpu: false,
              durationSeconds: job.file.durationSeconds,
            },
            passLogPrefix,
            nullTarget
          );

          const p1OutIdx = pass1Args.length - 1;
          const p1Args = [...pass1Args.slice(0, p1OutIdx), '-progress', 'pipe:1', pass1Args[p1OutIdx]];
          await convertDesktopMedia({
            jobId: job.id,
            inputPath,
            outputPath: nullTarget,
            args: p1Args,
            durationSeconds: job.file.durationSeconds,
            onProgress: makeProgressHandler(0, 45, 'Pass 1/2'),
          });

          const p2OutIdx = pass2Args.length - 1;
          const p2Args = [...pass2Args.slice(0, p2OutIdx), '-progress', 'pipe:1', pass2Args[p2OutIdx]];
          await convertDesktopMedia({
            jobId: job.id,
            inputPath,
            outputPath,
            args: p2Args,
            durationSeconds: job.file.durationSeconds,
            onProgress: makeProgressHandler(45, 100, 'Pass 2/2'),
          });
        } else {
          const rawArgs = buildSafeFfmpegArgs({
            inputPath,
            outputPath,
            options: job.options,
            gpuCaps: gpuCaps || undefined,
            enableGpu: gpuEnabled,
            durationSeconds: job.file.durationSeconds,
          });
          const outIdx = rawArgs.length - 1;
          const ffmpegArgs = [...rawArgs.slice(0, outIdx), '-progress', 'pipe:1', rawArgs[outIdx]];

          await convertDesktopMedia({
            jobId: job.id,
            inputPath,
            outputPath,
            args: ffmpegArgs,
            durationSeconds: job.file.durationSeconds,
            onProgress: makeProgressHandler(0, 100),
          });
        }

        const realOutputBytes = await getDesktopFileSize(outputPath);
        const outputSizeBytes = realOutputBytes !== null ? realOutputBytes : 0;
        const bytesSaved =
          realOutputBytes !== null && job.file.sizeBytes > 0
            ? Math.max(0, job.file.sizeBytes - realOutputBytes)
            : 0;
        const sizeValidation =
          job.options.targetSizeMb && realOutputBytes !== null
            ? validateTargetSizeOutput(realOutputBytes, job.options.targetSizeMb)
            : undefined;

        const completedJob: ConversionJob = {
          ...job,
          status: 'completed',
          progress: { percent: 100 },
          outputPath,
          outputSizeBytes,
          bytesSaved,
          sizeValidation,
          downloadUrl: undefined,
          completedAt: Date.now(),
          encoderUsed: gpuEnabled && gpuCaps?.hasGpu ? gpuCaps.supportedVideoEncoders[0] : 'libx264',
          isGpuAccelerated: gpuEnabled,
        };

        setJobs((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));
        markFirstConversionCompleted();
        if (job.startedAt && job.file.durationSeconds) {
          const elapsedSec = Math.max(0.5, (Date.now() - job.startedAt) / 1000);
          recordLocalBenchmark(gpuEnabled, job.file.durationSeconds / elapsedSec);
        }

        addLocalHistoryRecord({
          id: completedJob.id,
          userId: user?.uid,
          originalFileName: completedJob.file.name,
          originalSizeBytes: completedJob.file.sizeBytes,
          outputFormat: completedJob.options.outputFormat,
          outputSizeBytes: completedJob.outputSizeBytes || 0,
          bytesSaved: completedJob.bytesSaved || 0,
          outputPath,
          presetUsed: selectedPreset.name,
          presetId: selectedPreset.id,
          encoderUsed: completedJob.encoderUsed || 'libx264',
          isGpuAccelerated: Boolean(completedJob.isGpuAccelerated),
          status: 'completed',
          durationSeconds: Math.round(job.file.durationSeconds || 5),
          targetSizeMb: completedJob.options.targetSizeMb,
          timestamp: Date.now(),
        }, user?.uid);
        refreshHistory();
        return;
      }

      let res: Response;

      if (rawFile) {
        // Browser file mode: send file locally via FormData so FFmpeg receives real disk data
        const formData = new FormData();
        formData.append('file', rawFile);
        formData.append('options', JSON.stringify(job.options));
        if (job.file.durationSeconds) {
          formData.append('durationSeconds', job.file.durationSeconds.toString());
        }
        if (job.options.outputDirectory) {
          formData.append('outputDirectory', job.options.outputDirectory);
        }
        res = await fetch('/api/convert?stream=true', {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/x-ndjson',
            'x-vimora-plan': isPro ? 'pro' : 'free',
          },
          signal: controller.signal,
        });
      } else {
        // Direct path mode via web API
        res = await fetch('/api/convert?stream=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/x-ndjson',
            'x-vimora-plan': isPro ? 'pro' : 'free',
          },
          body: JSON.stringify({
            inputPath: job.file.path,
            outputDirectory: job.options.outputDirectory || undefined,
            options: job.options,
            durationSeconds: job.file.durationSeconds,
          }),
          signal: controller.signal,
        });
      }

      if (!res.ok) {
        if (controller.signal.aborted) return;
        const errText = await res.text();
        if (res.status === 413) {
          throw new Error('File exceeds web server upload limit (HTTP 413). Please use the Vimora Desktop app for unlimited offline conversions of large files.');
        }
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errText);
          parsedMessage = parsed.error?.message || (typeof parsed.error === 'string' ? parsed.error : '');
        } catch {}
        throw new Error(parsedMessage || errText || `Conversion failed: HTTP ${res.status}`);
      }

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/x-ndjson') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              if (event.type === 'progress') {
                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === jobId
                      ? {
                          ...j,
                          progress: {
                            percent: event.percent,
                            speed: event.speed,
                            currentFps: event.fps,
                            currentTimeSeconds: event.currentTimeSeconds,
                            totalTimeSeconds: event.totalTimeSeconds,
                          },
                        }
                      : j
                  )
                );
              } else if (event.type === 'stage') {
                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === jobId
                      ? {
                          ...j,
                          progress: {
                            ...j.progress,
                            speed: event.stage === 'encoding' ? 'Encoding…' : event.stage,
                          },
                        }
                      : j
                  )
                );
              } else if (event.type === 'complete') {
                data = event;
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Conversion process failed');
              } else if (event.type === 'aborted') {
                return; // Handled by pauseJob
              }
            } catch (jsonErr: any) {
              if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                throw jsonErr;
              }
            }
          }
        }
      } else if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Conversion failed: Unexpected server response`);
      }

      if (!data || !data.success) {
        if (controller.signal.aborted) return;
        throw new Error(data?.error || 'Conversion failed to produce output');
      }

      const realOutputSize = typeof data.outputSizeBytes === 'number' ? data.outputSizeBytes : 0;
      const webSizeValidation =
        job.options.targetSizeMb && realOutputSize > 0
          ? validateTargetSizeOutput(realOutputSize, job.options.targetSizeMb)
          : undefined;
      const webGpuUsed = Boolean(gpuCaps?.hasGpu && gpuCaps.type !== 'cpu');

      const completedJob: ConversionJob = {
        ...job,
        status: 'completed',
        progress: { percent: 100 },
        outputPath: data.outputPath,
        outputSizeBytes: realOutputSize,
        bytesSaved: realOutputSize > 0 ? Math.max(0, job.file.sizeBytes - realOutputSize) : 0,
        sizeValidation: webSizeValidation,
        downloadUrl: data.downloadUrl,
        completedAt: Date.now(),
        encoderUsed: webGpuUsed && gpuCaps ? gpuCaps.supportedVideoEncoders[0] : 'libx264',
        isGpuAccelerated: webGpuUsed,
      };

      setJobs((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));
      markFirstConversionCompleted();
      if (job.startedAt && (data.durationSeconds || job.file.durationSeconds)) {
        const dur = data.durationSeconds || job.file.durationSeconds || 0;
        const elapsedSec = Math.max(0.5, (Date.now() - job.startedAt) / 1000);
        if (dur > 0) recordLocalBenchmark(webGpuUsed, dur / elapsedSec);
      }

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
        presetId: selectedPreset.id,
        encoderUsed: completedJob.encoderUsed || 'libx264',
        isGpuAccelerated: Boolean(completedJob.isGpuAccelerated),
        status: 'completed',
        durationSeconds: Math.round(data.durationSeconds || 5),
        targetSizeMb: completedJob.options.targetSizeMb,
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
      if (isDesktopApp()) {
        await openDesktopFolder(folderPath);
        return;
      }
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

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {activeTab === 'workspace' ? (
          <>
            {/* Local Privacy & Hardware Status Strip */}
            <WorkstationStatusStrip
              gpuCaps={gpuCaps}
              onRecheckHardware={handleRecheckHardware}
              isRechecking={isRecheckingHw}
            />

            {/* Contextual Non-Intrusive Upgrade Prompt */}
            {upgradePrompt && (
              <UpgradePromptBanner
                message={upgradePrompt}
                onDismiss={() => setUpgradePrompt(null)}
              />
            )}

            {/* 5-Step Conversion Workflow Indicator */}
            <WorkflowStepper
              currentStep={workflowProgress.currentStep}
              completedSteps={workflowProgress.completedSteps}
            />

            {/* Step 1: Import Media (Drag & Drop + Choose Files / Folder) */}
            <section
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragActive(false);
                }
              }}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-[#0B6FFB] bg-blue-50/50 scale-[0.99]'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,.mkv,.flac"
                onChange={(e) => {
                  handleFilesAdded(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error webkitdirectory is supported by Chromium/Safari/Firefox for folder picking
                webkitdirectory=""
                onChange={(e) => {
                  handleFilesAdded(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-md">
                <UploadCloud className="w-6 h-6 text-[#0BB3FA]" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Drop files or folders here to export locally
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 max-w-lg mx-auto">
                Drag and drop individual videos, audio files, or entire folders — ready for{' '}
                <strong className="text-slate-800">{selectedPreset.name}</strong> (.{selectedFormat.toUpperCase()}).{' '}
                {getProcessingEngineMessage(gpuCaps)}
              </p>
              {importNotice && (
                <p className="mt-2.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
                  {importNotice}
                </p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#0BB3FA]" />
                  <span>Choose files</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseFolderClick();
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
                  <span>Choose folder</span>
                </button>
              </div>
            </section>

            {/* Step 2: Choose Destination (Quick Actions + Grouped Destinations) */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs relative space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#0B6FFB]" />
                    <span>Where is this video going?</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pick a destination to apply optimal format, framing, and size limits automatically — no technical setup required.
                  </p>
                </div>
                <Link
                  href="/presets"
                  className="text-xs font-bold text-[#0B6FFB] hover:text-[#0958cc] inline-flex items-center gap-1 shrink-0"
                >
                  <span>Browse all presets</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Quick-Action Destination Cards */}
              <QuickActionGrid
                activeQuickActionId={activeQuickActionId}
                activePresetId={selectedPreset.id}
                sizeLimitMode={sizeLimitMode}
                onSelectQuickAction={handleQuickActionSelect}
              />

              {/* Grouped Destination Dropdown */}
              <DestinationPresetPicker
                selectedPreset={selectedPreset}
                isPro={isPro}
                isOpen={isDropdownOpen}
                onToggle={() => setIsDropdownOpen((prev) => !prev)}
                onSelect={(preset) => {
                  setActiveQuickActionId(null);
                  handlePresetSelect(preset);
                }}
                dropdownRef={dropdownRef}
              />

              {/* Progressive Disclosure: Custom / Advanced Output Format Controls */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOutput((prev) => !prev)}
                  aria-expanded={showAdvancedOutput}
                  className="flex items-center justify-between w-full text-left py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <span>Custom container & format override (.{selectedFormat.toUpperCase()})</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      showAdvancedOutput ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showAdvancedOutput && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex-wrap">
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
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>

                    <div className="hidden sm:block text-slate-300">|</div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 shrink-0">Audio:</span>
                      {(['mp3', 'wav', 'flac', 'aac', 'ogg'] as OutputFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleFormatSelect(fmt)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold uppercase font-mono transition-all cursor-pointer ${
                            selectedFormat === fmt
                              ? 'bg-[#0B6FFB] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Repost 9:16 Vertical Framing & Pre-Export Platform Validation */}
              <SmartVerticalPanel
                file={jobs[0]?.file}
                rawFile={jobs[0] ? rawFilesRef.current.get(jobs[0].file.id) : undefined}
                options={
                  jobs[0]?.options || {
                    outputFormat: selectedFormat,
                    presetId: selectedPreset.id,
                    videoCodec: selectedPreset.videoCodec,
                    audioCodec: selectedPreset.audioCodec,
                    resolution: selectedPreset.resolution,
                    fps: selectedPreset.fps,
                    aspectRatioMode: framingMode,
                    subjectFocus,
                    cropPositionX,
                    cropPositionY,
                    targetSizeMb: sizeLimitMode === 'limit' ? targetSizeMb : undefined,
                  }
                }
                preset={selectedPreset}
                framingMode={framingMode}
                subjectFocus={subjectFocus}
                cropPositionX={cropPositionX}
                cropPositionY={cropPositionY}
                onFramingModeChange={handleFramingModeChange}
                onSubjectFocusChange={handleSubjectFocusChange}
                onCropPositionChange={handleCropPositionChange}
              />

            {/* Flagship Compress to Target Size Panel */}
            <TargetSizePanel
              mode={sizeLimitMode}
              targetSizeMb={targetSizeMb}
              targetSizeInput={targetSizeInput}
              selectedSizePreset={selectedSizePreset}
              qualityPreference={qualityPreference}
              isExpanded={isSizeCardExpanded}
              onToggleExpand={() => setIsSizeCardExpanded((prev) => !prev)}
              onSizeSettingChange={handleSizeSettingChange}
              onTargetSizeInputChange={setTargetSizeInput}
              onQualityPreferenceChange={handleQualityPreferenceChange}
              strictTwoPass={strictTwoPass}
              onStrictTwoPassChange={handleStrictTwoPassChange}
              hasGpu={Boolean(gpuCaps?.hasGpu && gpuCaps.type !== 'cpu')}
              onApplyRecoveryAction={handleApplyRecoveryAction}
              sampleFile={jobs[0]?.file}
              outputFormat={selectedFormat}
              resolution={jobs[0]?.options.resolution || selectedPreset.resolution}
              fps={jobs[0]?.options.fps || selectedPreset.fps}
              videoCodec={jobs[0]?.options.videoCodec || selectedPreset.videoCodec}
              keepAudio={jobs[0]?.options.keepAudio !== false}
            />

            {/* Live Preset Capabilities & Changes Preview */}
            <div className="pt-3.5 border-t border-slate-100 flex items-start gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
              <div className="p-2 rounded-lg bg-[#0B6FFB]/10 text-[#0B6FFB] shrink-0 mt-0.5">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">Selected Destination:</span>
                  <span className="font-bold text-[#0B6FFB]">{selectedPreset.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold uppercase">
                    .{selectedFormat} &bull; {selectedPreset.resolution || 'Original resolution'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {selectedPreset.description}
                </p>
              </div>
            </div>
        </section>

        {/* Recent Local Conversions Strip (when queue is empty) */}
        {jobs.length === 0 && history.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#0B6FFB]" />
                <h3 className="text-sm font-extrabold text-slate-900">Recent Conversions</h3>
              </div>
              <Link
                href="/history"
                className="text-xs font-bold text-[#0B6FFB] hover:text-[#0958cc] inline-flex items-center gap-1"
              >
                <span>View all history</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.originalFileName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.presetUsed || `.${item.outputFormat.toUpperCase()}`} • {formatSize(item.outputSizeBytes)}
                    </p>
                  </div>
                  {item.presetId && (
                    <button
                      type="button"
                      onClick={() => {
                        const found = getPresetById(item.presetId);
                        if (found) handlePresetSelect(found);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0B6FFB] text-[11px] font-bold text-slate-700 hover:text-[#0B6FFB] shrink-0 cursor-pointer"
                      title="Reuse this preset"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reuse</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Queue & Pre-Conversion Review Anchor */}
        <div ref={queueSectionRef} id="conversion-queue-section" />

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
          } else if (gpuCaps?.hasGpu && gpuCaps.type !== 'cpu') {
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
                    <span>Target Planned Output</span>
                  </p>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Selected Format:</span><span className="font-bold text-[#0B6FFB]">{targetFormat}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Target Resolution:</span><span className="font-semibold">{targetRes}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Target Frame Rate:</span><span className="font-semibold">{targetFps}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Selected Encoder:</span><span className="font-semibold">{targetEncoder}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1"><span className="text-slate-500">Framing Method:</span><span className="font-semibold">{framingMethod}</span></div>
                    <div className="flex justify-between border-b border-blue-100/60 pb-1">
                      <span className="text-slate-500">Target File Size:</span>
                      <span className="font-semibold text-slate-900">
                        {sampleJob.options.targetSizeMb
                          ? `≤ ${sampleJob.options.targetSizeMb} MB (${sampleJob.options.sizeLimitPreset ? sampleJob.options.sizeLimitPreset.toUpperCase() : 'Custom Limit'})`
                          : 'Auto'}
                      </span>
                    </div>
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
                          {job.options.targetSizeMb ? (
                            <>
                              <span>&bull;</span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#0B6FFB]/10 text-[#0B6FFB]">
                                ≤ {job.options.targetSizeMb} MB
                              </span>
                            </>
                          ) : (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-400 text-[11px]">Auto Size</span>
                            </>
                          )}
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
                          <div className="flex flex-col items-end gap-1">
                            <div className="w-28 sm:w-36 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[#0B6FFB] h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(2, job.progress.percent))}%` }}
                              />
                            </div>
                            {job.progress.speed && (
                              <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                {job.progress.speed}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-800 w-10 text-right">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {job.sizeValidation ? (
                            <div
                              title={job.sizeValidation.message}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                                job.sizeValidation.status === 'hit'
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : job.sizeValidation.status === 'warning'
                                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                                  : 'text-red-700 bg-red-50 border-red-200'
                              }`}
                            >
                              {job.sizeValidation.status === 'hit' ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 shrink-0" />
                              )}
                              <span>
                                {job.sizeValidation.status === 'hit'
                                  ? `Target met (${job.sizeValidation.actualSizeMb} MB)`
                                  : job.sizeValidation.status === 'warning'
                                  ? `Slightly over (${job.sizeValidation.actualSizeMb} / ${job.sizeValidation.targetSizeMb} MB)`
                                  : `Over target (${job.sizeValidation.actualSizeMb} / ${job.sizeValidation.targetSizeMb} MB)`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              {job.outputSizeBytes && job.outputSizeBytes > 0
                                ? `${formatSize(job.outputSizeBytes)}${job.bytesSaved ? ` (-${formatSize(job.bytesSaved)})` : ''}`
                                : 'Completed'}
                            </div>
                          )}

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
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Export failed</span>
                        </span>
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

                  {/* Plain-English Error Display Card (Phase 9) */}
                  {job.status === 'failed' && (
                    <ErrorDisplayCard
                      rawError={job.errorMessage}
                      onRetryWithDifferentSettings={() => handleRetryWithDifferentSettings(job.id)}
                    />
                  )}

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
                      <p className="text-sm font-bold text-slate-900 truncate max-w-sm md:max-w-md" title={item.outputPath ? item.outputPath.split(/[/\\]/).pop() : item.originalFileName}>
                        {item.outputPath ? item.outputPath.split(/[/\\]/).pop() : item.originalFileName}
                      </p>
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {item.outputFormat}
                      </span>
                      {item.isGpuAccelerated && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                          <Zap className="w-2.5 h-2.5" /> GPU
                        </span>
                      )}
                      {item.targetSizeMb && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-[#0B6FFB] border border-blue-200 px-1.5 py-0.2 rounded font-mono">
                          ≤ {item.targetSizeMb}MB
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
                      {item.outputPath && item.originalFileName !== item.outputPath.split(/[/\\]/).pop() && (
                        <>
                          <span className="text-slate-500">source: <span className="text-slate-700 font-medium">{item.originalFileName}</span></span>
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
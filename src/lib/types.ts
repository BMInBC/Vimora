export type OutputFormat = 'mp4' | 'webm' | 'mov' | 'mp3' | 'wav' | 'aac' | 'flac' | 'ogg';

export type VideoCodec = 'h264' | 'hevc' | 'vp9' | 'av1' | 'copy';
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'flac' | 'wav' | 'copy';

export type QualityPreset = 'smaller' | 'balanced' | 'high' | 'custom';

export type GpuEncoderType = 'nvenc' | 'qsv' | 'amf' | 'videotoolbox' | 'cpu';

export type DestinationGroupId =
  | 'short_form_vertical'
  | 'social_feed'
  | 'messaging'
  | 'youtube'
  | 'audio'
  | 'archive_custom';

export type AspectRatioPolicy =
  | 'vertical_9_16'
  | 'square_1_1'
  | 'portrait_4_5'
  | 'landscape_16_9'
  | 'original'
  | 'audio_only';

export type FpsPolicy =
  | 'preserve'
  | 'cap_30'
  | 'cap_60'
  | 'fixed_24'
  | 'fixed_30'
  | 'fixed_60';

export type BitrateStrategy =
  | 'crf_balanced'
  | 'crf_high'
  | 'target_size'
  | 'cbr_audio'
  | 'lossless'
  | 'archival';

export type WorkflowStep = 'import' | 'destination' | 'review' | 'convert' | 'export';

export type QuickActionId =
  | 'tiktok_reels'
  | 'youtube'
  | 'whatsapp'
  | 'discord'
  | 'twitter_x'
  | 'extract_mp3'
  | 'compress_target'
  | 'custom_export';

export interface QuickActionItem {
  id: QuickActionId;
  label: string;
  subtitle: string;
  presetId: string;
  iconId: string;
  badge?: string;
  enableTargetSize?: boolean;
  defaultTargetSizeMb?: number;
  openCustomControls?: boolean;
}

export interface DestinationGroup {
  id: DestinationGroupId;
  name: string;
  description: string;
}

export interface GpuCapabilities {
  hasGpu: boolean;
  type: GpuEncoderType;
  displayName: string;
  supportedVideoEncoders: string[];
  fallbackEncoder: string;
}

export interface CreatorPreset {
  id: string;
  name: string;
  /** Legacy broad category kept for backwards compatibility */
  category: 'social' | 'video' | 'audio' | 'archive';
  /** Destination-first group for creator workflows */
  destinationGroup: DestinationGroupId;
  /** Icon identifier for PlatformIcon */
  iconId?: string;
  description: string;
  outputFormat: OutputFormat;
  videoCodec?: VideoCodec;
  fallbackVideoCodec?: VideoCodec;
  audioCodec: AudioCodec;
  resolution?: string;
  aspectRatioPolicy?: AspectRatioPolicy;
  videoBitrate?: string;
  bitrateStrategy?: BitrateStrategy;
  audioBitrate?: string;
  audioSampleRate?: number;
  audioChannels?: 1 | 2;
  fps?: number;
  fpsPolicy?: FpsPolicy;
  quality?: QualityPreset;
  maintainAspect?: boolean;
  aspectRatioMode?: AspectRatioMode;
  maxFileSizeMb?: number;
  gpuRecommended?: boolean;
  compatibilityLabel: string;
  normalizeAudio?: boolean;
  removeAudio?: boolean;
  requiresPro?: boolean;
  isCustom?: boolean;
}

export type AspectRatioMode = 'crop_fill' | 'blur_pad' | 'pad_black' | 'keep_original' | 'stretch';

export type SubjectFocus = 'center' | 'top' | 'bottom' | 'manual';

export type SourceOrientation = 'landscape' | 'portrait' | 'square' | 'unknown';

export type PlatformValidationSeverity = 'info' | 'warning';

export interface PlatformValidationIssue {
  id: string;
  severity: PlatformValidationSeverity;
  category:
    | 'aspect_ratio'
    | 'resolution'
    | 'duration'
    | 'file_size'
    | 'audio'
    | 'codec'
    | 'fps'
    | 'crop_loss';
  title: string;
  message: string;
  recommendation?: string;
}

export interface PlatformValidationReport {
  platformName: string;
  sourceOrientation: SourceOrientation;
  isVerticalTarget: boolean;
  cropLossPercent: number;
  issues: PlatformValidationIssue[];
  hasWarnings: boolean;
}

export interface ConversionOptions {
  outputFormat: OutputFormat;
  presetId?: string;
  quality?: QualityPreset;
  videoCodec?: VideoCodec;
  audioCodec?: AudioCodec;
  resolution?: string;
  fps?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  audioSampleRate?: number;
  audioChannels?: 1 | 2;
  keepAudio?: boolean;
  normalizeAudio?: boolean;
  preserveMetadata?: boolean;
  maintainAspect?: boolean;
  aspectRatioMode?: AspectRatioMode;
  subjectFocus?: SubjectFocus;
  /** Manual horizontal crop position (0 = left, 50 = center, 100 = right) */
  cropPositionX?: number;
  /** Manual vertical crop position (0 = top, 50 = center, 100 = bottom) */
  cropPositionY?: number;
  customOutputName?: string;
  outputDirectory?: string;
  targetSizeMb?: number;
  sizeLimitPreset?: 'auto' | 'discord' | 'whatsapp' | 'email' | 'social' | 'custom';
  /** When true with targetSizeMb, forces standard FFmpeg 2-pass CPU encoding for strictest size accuracy */
  strictTwoPass?: boolean;
}

export interface MediaFileInfo {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  format: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  lastModified?: number;
}

export type JobStatus = 'queued' | 'probing' | 'converting' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface ConversionProgress {
  percent: number;
  currentFps?: number;
  speed?: string;
  currentTimeSeconds?: number;
  totalTimeSeconds?: number;
  estimatedTimeRemainingSeconds?: number;
  timeRemaining?: string;
  targetSizeKbytes?: number;
}

export type TargetSizeFeasibility = 'optimal' | 'moderate' | 'tight' | 'impossible';

export type TargetSizeRecoveryActionType =
  | 'increase_size'
  | 'reduce_resolution'
  | 'reduce_fps'
  | 'remove_audio'
  | 'efficient_codec';

export interface TargetSizeRecoveryAction {
  type: TargetSizeRecoveryActionType;
  label: string;
  description: string;
  recommendedTargetMb?: number;
  recommendedResolution?: string;
  recommendedFps?: number;
  recommendedCodec?: VideoCodec;
}

export interface TargetSizeBudget {
  targetSizeMb: number;
  durationSeconds: number;
  containerOverheadPercent: number;
  totalBitrateKbps: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  estimatedOutputMb: number;
  feasibility: TargetSizeFeasibility;
  isAchievable: boolean;
  qualityImpactLabel: string;
  warning?: string;
  recoveryActions: TargetSizeRecoveryAction[];
  isAudioOnly: boolean;
  isLosslessFormat: boolean;
}

export interface TargetSizeValidationResult {
  status: 'hit' | 'warning' | 'missed';
  actualSizeMb: number;
  targetSizeMb: number;
  deltaMb: number;
  message: string;
}

export interface ConversionJob {
  id: string;
  file: MediaFileInfo;
  options: ConversionOptions;
  status: JobStatus;
  progress: ConversionProgress;
  outputPath?: string;
  outputSizeBytes?: number;
  encoderUsed?: string;
  isGpuAccelerated?: boolean;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  bytesSaved?: number;
  downloadUrl?: string;
  sizeValidation?: TargetSizeValidationResult;
}

export interface LocalHistoryRecord {
  id: string;
  userId?: string;
  originalFileName: string;
  originalSizeBytes: number;
  outputFormat: string;
  outputSizeBytes: number;
  bytesSaved: number;
  outputPath: string;
  presetUsed?: string;
  presetId?: string;
  encoderUsed: string;
  isGpuAccelerated: boolean;
  status: 'completed' | 'failed';
  errorMessage?: string;
  durationSeconds: number;
  targetSizeMb?: number;
  timestamp: number;
}

export type PlanType = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
  plan: PlanType;
  accountStatus: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
  lastActiveAt: string;
  licenceStatus: 'none' | 'active' | 'revoked' | 'expired';
}

export interface UserStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  totalFilesProcessed: number;
  estimatedBytesSaved: number;
  lastConversionAt?: string;
  updatedAt: string;
}

export type FfmpegErrorCode =
  | 'file_not_found'
  | 'unsupported_codec'
  | 'corrupt_media'
  | 'disk_space'
  | 'permission_denied'
  | 'ffmpeg_missing'
  | 'gpu_unavailable'
  | 'target_size_impossible'
  | 'invalid_destination'
  | 'canceled_by_user'
  | 'unknown';

export interface MappedFfmpegError {
  code: FfmpegErrorCode;
  title: string;
  explanation: string;
  likelyCause: string;
  recommendedAction: string;
  technicalDetails?: string;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
  upgradeTrigger?:
    | 'batch_limit'
    | 'resolution_4k'
    | 'custom_preset_limit'
    | 'archival_codec'
    | 'watch_folders'
    | 'multi_output';
}

export interface AppSettings {
  defaultOutputDirectory: string;
  gpuAccelerationEnabled: boolean;
  gpuPreference?: 'auto' | GpuEncoderType;
  maxCpuThreads?: number;
  keepOriginalFile?: boolean;
  filenamePattern?: string;
  autoOverwrite: boolean;
  preserveFolderStructure: boolean;
  theme: 'light' | 'dark' | 'system';
  telemetryOptIn: boolean;
  maxConcurrentJobs: number;
}

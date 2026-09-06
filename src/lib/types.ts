export type OutputFormat = 'mp4' | 'webm' | 'mov' | 'mkv' | 'mp3' | 'wav' | 'aac' | 'flac' | 'ogg';

export type VideoCodec = 'h264' | 'hevc' | 'vp9' | 'av1' | 'copy';
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'flac' | 'wav' | 'copy';

export type QualityPreset = 'smaller' | 'balanced' | 'high' | 'custom';

export type GpuEncoderType = 'nvenc' | 'qsv' | 'amf' | 'videotoolbox' | 'cpu';

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
  category: 'social' | 'video' | 'audio' | 'archive';
  description?: string;
  outputFormat: OutputFormat;
  videoCodec?: VideoCodec;
  audioCodec: AudioCodec;
  resolution?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  audioSampleRate?: number;
  audioChannels?: 1 | 2;
  fps?: number;
  maintainAspect?: boolean;
  normalizeAudio?: boolean;
  removeAudio?: boolean;
  requiresPro?: boolean;
}

export type QualityGoal = 'enhance' | 'preserve' | 'reduce';

export interface CompressOptions {
  mode: 'target_size' | 'percentage' | 'quality';
  targetSizeMb?: number;
  reductionPercent?: number; // e.g. 50%
  qualityLevel?: 'balanced' | 'small' | 'ultra';
  qualityGoal?: QualityGoal;
  clarityBoost?: 'subtle' | 'crisp' | 'ultra';
  enhanceClarity?: boolean;
  colorPolish?: boolean;
  denoiseArtifacts?: boolean;
  downscaleIfLarge?: boolean;
  outputFormat?: OutputFormat;
}

export interface EnhanceOptions {
  upscaleTarget?: 'none' | '1080p' | '4k';
  denoise?: number; // 0 - 100
  sharpen?: number; // 0 - 100
  eqContrast?: number; // 0.5 - 2.0, default 1.0
  eqBrightness?: number; // -0.5 - 0.5, default 0
  eqSaturation?: number; // 0 - 3.0, default 1.0
  normalizeAudio?: boolean;
}

export interface ConversionOptions {
  toolType?: 'convert' | 'compress' | 'enhance';
  outputFormat: OutputFormat;
  presetId?: string;
  quality: QualityPreset;
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
  customOutputName?: string;
  outputDirectory?: string;
  // Specific tool options
  compress?: CompressOptions;
  enhance?: EnhanceOptions;
  // Video filter options
  customVideoFilter?: string;
  autoEnhanceQuality?: boolean;
}

export interface PreviewRequest {
  startTimeSeconds?: number;
  durationSeconds?: number;
  options: ConversionOptions;
}

export interface PreviewResult {
  previewUrl: string;
  durationSeconds: number;
  originalSizeBytes?: number;
  estimatedSizeBytes?: number;
  originalResolution?: string;
  outputResolution?: string;
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
  hasVideo: boolean;
  hasAudio: boolean;
  lastModified?: number;
}

export type JobStatus = 'queued' | 'converting' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface ConversionProgress {
  percent: number;
  currentFps?: number;
  speed?: string;
  currentTimeSeconds?: number;
  totalTimeSeconds?: number;
  estimatedTimeRemainingSeconds?: number;
  targetSizeKbytes?: number;
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
}

export interface LocalHistoryRecord {
  id: string;
  originalFileName: string;
  originalSizeBytes: number;
  outputFormat: string;
  outputSizeBytes: number;
  bytesSaved: number;
  outputPath: string;
  presetUsed?: string;
  encoderUsed: string;
  isGpuAccelerated: boolean;
  status: 'completed' | 'failed';
  errorMessage?: string;
  durationSeconds: number;
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

export interface AppSettings {
  defaultOutputDirectory: string;
  gpuAccelerationEnabled: boolean;
  autoOverwrite: boolean;
  preserveFolderStructure: boolean;
  theme: 'light' | 'dark' | 'system';
  telemetryOptIn: boolean;
  maxConcurrentJobs: number;
}
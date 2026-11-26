import type {
  ConversionOptions,
  CreatorPreset,
  MediaFileInfo,
  PlatformValidationIssue,
  PlatformValidationReport,
  SourceOrientation,
} from '../types';

interface PlatformRule {
  name: string;
  recommendedAspect: '9:16' | '1:1' | '16:9' | 'any';
  recommendedMinHeight?: number;
  maxDurationSeconds?: number;
  maxFileSizeMb?: number;
  preferredFormats: string[];
  preferredVideoCodecs: string[];
  expectsAudio: boolean;
}

const PLATFORM_RULES: Record<string, PlatformRule> = {
  tiktok_vertical: {
    name: 'TikTok',
    recommendedAspect: '9:16',
    recommendedMinHeight: 1080,
    maxDurationSeconds: 600,
    preferredFormats: ['mp4', 'mov'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  instagram_reel: {
    name: 'Instagram Reels',
    recommendedAspect: '9:16',
    recommendedMinHeight: 1080,
    maxDurationSeconds: 180,
    preferredFormats: ['mp4'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    recommendedAspect: '9:16',
    recommendedMinHeight: 1080,
    maxDurationSeconds: 180,
    preferredFormats: ['mp4', 'mov'],
    preferredVideoCodecs: ['h264', 'hevc'],
    expectsAudio: true,
  },
  instagram_feed: {
    name: 'Instagram Feed',
    recommendedAspect: '1:1',
    recommendedMinHeight: 1080,
    maxDurationSeconds: 60,
    preferredFormats: ['mp4'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  twitter_x: {
    name: 'X / Twitter',
    recommendedAspect: '16:9',
    maxDurationSeconds: 140,
    maxFileSizeMb: 512,
    preferredFormats: ['mp4'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  facebook_feed: {
    name: 'Facebook',
    recommendedAspect: '16:9',
    preferredFormats: ['mp4', 'mov'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  whatsapp_compress: {
    name: 'WhatsApp',
    recommendedAspect: 'any',
    maxFileSizeMb: 16,
    preferredFormats: ['mp4'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  discord_compress: {
    name: 'Discord',
    recommendedAspect: 'any',
    maxFileSizeMb: 20,
    preferredFormats: ['mp4', 'webm'],
    preferredVideoCodecs: ['h264', 'vp9'],
    expectsAudio: true,
  },
  telegram_share: {
    name: 'Telegram',
    recommendedAspect: 'any',
    maxFileSizeMb: 50,
    preferredFormats: ['mp4'],
    preferredVideoCodecs: ['h264'],
    expectsAudio: true,
  },
  youtube_1080p: {
    name: 'YouTube 1080p',
    recommendedAspect: '16:9',
    recommendedMinHeight: 1080,
    preferredFormats: ['mp4', 'mov'],
    preferredVideoCodecs: ['h264', 'hevc'],
    expectsAudio: true,
  },
  youtube_hq: {
    name: 'YouTube HQ',
    recommendedAspect: '16:9',
    recommendedMinHeight: 1080,
    preferredFormats: ['mp4', 'mov'],
    preferredVideoCodecs: ['h264', 'hevc'],
    expectsAudio: true,
  },
  youtube_4k: {
    name: 'YouTube 4K',
    recommendedAspect: '16:9',
    recommendedMinHeight: 2160,
    preferredFormats: ['mp4', 'mov'],
    preferredVideoCodecs: ['hevc', 'h264'],
    expectsAudio: true,
  },
};

export function detectSourceOrientation(width?: number, height?: number): SourceOrientation {
  if (!width || !height || width <= 0 || height <= 0) return 'unknown';
  const ratio = width / height;
  if (ratio > 1.05) return 'landscape';
  if (ratio < 0.95) return 'portrait';
  return 'square';
}

export function isVerticalResolution(resolution?: string): boolean {
  if (!resolution) return false;
  const parts = resolution.split('x');
  if (parts.length !== 2) return false;
  const w = parseInt(parts[0], 10);
  const h = parseInt(parts[1], 10);
  return !isNaN(w) && !isNaN(h) && h > w;
}

/**
 * Estimates what percentage of the source frame area will be cropped away
 * when using crop_fill into a target resolution.
 */
export function estimateCropLossPercent(
  sourceWidth?: number,
  sourceHeight?: number,
  targetResolution?: string
): number {
  if (!sourceWidth || !sourceHeight || !targetResolution) return 0;
  const parts = targetResolution.split('x');
  if (parts.length !== 2) return 0;
  const targetW = parseInt(parts[0], 10);
  const targetH = parseInt(parts[1], 10);
  if (isNaN(targetW) || isNaN(targetH) || targetW <= 0 || targetH <= 0) return 0;

  const srcRatio = sourceWidth / sourceHeight;
  const dstRatio = targetW / targetH;
  if (Math.abs(srcRatio - dstRatio) < 0.02) return 0;

  const keptFraction = srcRatio > dstRatio ? dstRatio / srcRatio : srcRatio / dstRatio;
  return Math.max(0, Math.min(95, Math.round((1 - keptFraction) * 100)));
}

export function validateForPlatform(
  file: MediaFileInfo | undefined,
  options: ConversionOptions,
  preset: CreatorPreset
): PlatformValidationReport {
  const rule = PLATFORM_RULES[preset.id];
  const platformName = rule?.name || preset.name;
  const targetRes = options.resolution || preset.resolution;
  const isVerticalTarget = isVerticalResolution(targetRes);
  const sourceOrientation = detectSourceOrientation(file?.width, file?.height);
  const isAudioOnlyTarget = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(
    (options.outputFormat || preset.outputFormat).toLowerCase()
  );

  const framingMode = options.aspectRatioMode || preset.aspectRatioMode || 'crop_fill';
  const cropLossPercent =
    !isAudioOnlyTarget && framingMode === 'crop_fill'
      ? estimateCropLossPercent(file?.width, file?.height, targetRes)
      : 0;

  const issues: PlatformValidationIssue[] = [];

  if (!file) {
    return {
      platformName,
      sourceOrientation,
      isVerticalTarget,
      cropLossPercent,
      issues,
      hasWarnings: false,
    };
  }

  // 1. Landscape → Vertical crop loss warning
  if (!isAudioOnlyTarget && isVerticalTarget && sourceOrientation === 'landscape') {
    if (framingMode === 'crop_fill' && cropLossPercent >= 30) {
      issues.push({
        id: 'crop_loss',
        severity: 'warning',
        category: 'crop_loss',
        title: `Cropping removes ~${cropLossPercent}% of the horizontal frame`,
        message: `Your source video is landscape (${file.width}×${file.height}). Filling a 9:16 vertical frame will crop the left and right edges.`,
        recommendation:
          'Adjust Subject Focus below to keep the main subject centered, or switch to Blurred Background to keep the full width.',
      });
    } else if (framingMode === 'keep_original') {
      issues.push({
        id: 'vertical_aspect_mismatch',
        severity: 'info',
        category: 'aspect_ratio',
        title: `Keeping landscape aspect ratio for ${platformName}`,
        message: `${platformName} prefers 9:16 vertical video. Keeping the original landscape ratio may display smaller in vertical feeds.`,
        recommendation: 'Switch to Crop to fill or Blurred background for full-screen vertical playback.',
      });
    }
  }

  // 2. Duration check
  if (rule?.maxDurationSeconds && file.durationSeconds && file.durationSeconds > rule.maxDurationSeconds) {
    const maxMin = Math.round(rule.maxDurationSeconds / 60);
    const srcMin = (file.durationSeconds / 60).toFixed(1);
    issues.push({
      id: 'duration_exceeded',
      severity: 'warning',
      category: 'duration',
      title: `Video length (${srcMin} min) exceeds ${platformName} limit`,
      message: `${platformName} typically limits uploads to ${maxMin} minutes (${rule.maxDurationSeconds}s). You can still export, but the platform may trim or reject it.`,
      recommendation: 'Trim your clip to fit the platform duration limit before uploading.',
    });
  }

  // 3. File size check when no targetSizeMb is set
  const maxMb = rule?.maxFileSizeMb || preset.maxFileSizeMb;
  if (maxMb && !options.targetSizeMb && file.sizeBytes > maxMb * 1024 * 1024) {
    const srcMb = (file.sizeBytes / (1024 * 1024)).toFixed(1);
    issues.push({
      id: 'size_exceeded',
      severity: 'warning',
      category: 'file_size',
      title: `Source (${srcMb} MB) is larger than ${platformName}'s ${maxMb} MB limit`,
      message: `Target-size compression is currently off, so the output could exceed ${maxMb} MB.`,
      recommendation: `Enable "Compress to target size" and set it to ${maxMb} MB.`,
    });
  }

  // 4. Codec / container compatibility check
  if (!isAudioOnlyTarget && rule) {
    const outFmt = (options.outputFormat || preset.outputFormat).toLowerCase();
    const outCodec = (options.videoCodec || preset.videoCodec || 'h264').toLowerCase();
    if (!rule.preferredFormats.includes(outFmt)) {
      issues.push({
        id: 'container_compat',
        severity: 'warning',
        category: 'codec',
        title: `.${outFmt.toUpperCase()} may have limited compatibility on ${platformName}`,
        message: `${platformName} works most reliably with ${rule.preferredFormats.map((f) => `.${f.toUpperCase()}`).join(' or ')}.`,
        recommendation: `Switch output container to .${rule.preferredFormats[0].toUpperCase()} for widest compatibility.`,
      });
    } else if (outCodec !== 'copy' && !rule.preferredVideoCodecs.includes(outCodec)) {
      issues.push({
        id: 'codec_compat',
        severity: 'warning',
        category: 'codec',
        title: `${outCodec.toUpperCase()} may be re-encoded or rejected by ${platformName}`,
        message: `${platformName} recommends ${rule.preferredVideoCodecs.map((c) => c.toUpperCase()).join(' / ')} video.`,
      });
    }
  }

  // 5. Missing audio check
  if (rule?.expectsAudio && (!file.hasAudio || options.keepAudio === false)) {
    issues.push({
      id: 'missing_audio',
      severity: 'info',
      category: 'audio',
      title: options.keepAudio === false ? 'Audio track is muted' : 'No audio track detected',
      message: `This export will have no sound. ${platformName} supports silent clips, but most viewers expect audio.`,
    });
  }

  // 6. Unusual frame rate check
  if (!isAudioOnlyTarget && file.fps && (file.fps > 60 || file.fps < 15)) {
    issues.push({
      id: 'unusual_fps',
      severity: 'warning',
      category: 'fps',
      title: `Unusual source frame rate (${file.fps} FPS)`,
      message: `Source frame rate is ${file.fps} FPS. Most social platforms normalize playback to 30 or 60 FPS.`,
      recommendation: options.fps
        ? `Vimora will normalize output to ${options.fps} FPS automatically.`
        : 'Using a standard 30 or 60 FPS preset helps avoid choppy playback.',
    });
  }

  // 7. Upscaling check (source smaller than target)
  if (!isAudioOnlyTarget && file.width && file.height && targetRes) {
    const parts = targetRes.split('x');
    const tw = parseInt(parts[0], 10);
    const th = parseInt(parts[1], 10);
    if (!isNaN(tw) && !isNaN(th) && framingMode !== 'keep_original') {
      if (file.width < tw * 0.75 && file.height < th * 0.75) {
        issues.push({
          id: 'upscaling_notice',
          severity: 'info',
          category: 'resolution',
          title: `Source (${file.width}×${file.height}) is smaller than ${targetRes}`,
          message: 'Vimora will upscale using high-quality Lanczos filtering, though upscaling cannot add new detail.',
        });
      }
    }
  }

  return {
    platformName,
    sourceOrientation,
    isVerticalTarget,
    cropLossPercent,
    issues,
    hasWarnings: issues.some((i) => i.severity === 'warning'),
  };
}

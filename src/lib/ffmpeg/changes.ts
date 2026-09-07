import { MediaFileInfo, ConversionOptions, CreatorPreset, GpuCapabilities } from '../types';

export interface ConversionChangeItem {
  id: string;
  category: 'format' | 'resolution' | 'codec' | 'fps' | 'bitrate' | 'audio' | 'audio_norm' | 'size';
  title: string;
  description: string;
  before: string;
  after: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan' | 'slate';
  isUnchanged?: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getResolutionLabel(w: number, h: number): string {
  const max = Math.max(w, h);
  const min = Math.min(w, h);
  if (max >= 3840) return '4K Ultra HD';
  if (max >= 2560) return '1440p QHD';
  if (max >= 1920) return h > w ? '1080p Vertical' : '1080p Full HD';
  if (max >= 1280) return '720p HD';
  if (max >= 854) return '480p SD';
  return `${w}×${h}`;
}

function getResolutionLabelFromStr(res: string): string {
  if (res.includes('3840')) return '4K Ultra HD';
  if (res.includes('2560')) return '1440p QHD';
  if (res.includes('1920x1080')) return '1080p Full HD';
  if (res.includes('1080x1920')) return '1080p Vertical (9:16)';
  if (res.includes('1080x1080')) return 'Square (1:1)';
  if (res.includes('1280')) return '720p HD';
  if (res.includes('854')) return '480p SD';
  return res;
}

export function getPlannedChanges(
  file: MediaFileInfo,
  options: ConversionOptions,
  preset?: CreatorPreset,
  gpuCaps?: GpuCapabilities | null,
  isPro?: boolean
): ConversionChangeItem[] {
  const changes: ConversionChangeItem[] = [];

  const inputExt = (file.format || file.name.split('.').pop() || '').toLowerCase();
  const outputExt = options.outputFormat.toLowerCase();
  const isTargetAudioOnly = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(outputExt);
  const isSourceAudioOnly = !file.hasVideo && file.hasAudio;

  // 1. Container / File Format
  if (inputExt !== outputExt) {
    changes.push({
      id: 'format',
      category: 'format',
      title: isTargetAudioOnly && !isSourceAudioOnly ? 'Audio Stream Extraction' : 'Container Format Transcode',
      before: `.${inputExt.toUpperCase()}`,
      after: `.${outputExt.toUpperCase()}`,
      description: isTargetAudioOnly && !isSourceAudioOnly
        ? `Extracts pure audio stream and strips all video frames into an optimized .${outputExt.toUpperCase()} audio file.`
        : `Re-packages multimedia streams from .${inputExt.toUpperCase()} into a universal .${outputExt.toUpperCase()} container.`,
      badge: isTargetAudioOnly && !isSourceAudioOnly ? 'Audio Extract' : 'New Container',
      badgeColor: 'blue',
    });
  } else {
    changes.push({
      id: 'format',
      category: 'format',
      title: 'Container Format',
      before: `.${inputExt.toUpperCase()}`,
      after: `.${outputExt.toUpperCase()}`,
      description: `Retains .${outputExt.toUpperCase()} container while re-encoding internal streams for optimal efficiency.`,
      isUnchanged: true,
      badge: 'Maintained',
      badgeColor: 'slate',
    });
  }

  // 2. Resolution & Aspect Ratio (for video targets)
  if (!isTargetAudioOnly) {
    const inputRes = file.width && file.height ? `${file.width}×${file.height}` : null;
    const targetRes = options.resolution || preset?.resolution;

    if (inputRes && targetRes) {
      const isSame = inputRes.replace(/\s/g, '') === targetRes.replace(/\s/g, '');
      const parts = targetRes.split('x');
      const targetW = parseInt(parts[0], 10);
      const targetH = parseInt(parts[1], 10);
      const isTargetVertical = !isNaN(targetW) && !isNaN(targetH) && targetH > targetW;
      const isSourceLandscape = file.width && file.height ? file.width > file.height : false;
      const mode = options.aspectRatioMode || (isTargetVertical ? 'crop_fill' : options.maintainAspect !== false ? 'pad_black' : 'stretch');

      let desc = `Scales video frames to ${targetRes} (${options.maintainAspect !== false ? 'aspect ratio preserved' : 'stretched to frame'}).`;
      let badge = isSame ? 'Original 1:1' : 'Rescaled';
      let badgeColor: 'slate' | 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan' = isSame ? 'slate' : 'purple';
      let title = isSame ? 'Resolution Preserved' : 'Resolution & Framing';

      if (!isSame && isTargetVertical && isSourceLandscape) {
        title = '9:16 Vertical Reframing';
        badge = mode === 'blur_pad' ? 'Blurred Canvas' : 'Full 9:16 Screen';
        badgeColor = 'purple';
        desc = mode === 'blur_pad'
          ? 'Centers full horizontal content with dynamic blurred video fill on top and bottom.'
          : 'Converts horizontal video to full 9:16 vertical frame (1080×1920) filling the entire mobile screen with 0 black bars.';
      }

      changes.push({
        id: 'resolution',
        category: 'resolution',
        title,
        before: `${inputRes} (${getResolutionLabel(file.width!, file.height!)})`,
        after: `${targetRes} (${getResolutionLabelFromStr(targetRes)})`,
        description: isSame
          ? 'Pixel dimensions preserved 1:1 without scaling blur or geometric distortion.'
          : desc,
        badge,
        badgeColor,
        isUnchanged: isSame,
      });
    } else if (targetRes) {
      const parts = targetRes.split('x');
      const targetW = parseInt(parts[0], 10);
      const targetH = parseInt(parts[1], 10);
      const isTargetVertical = !isNaN(targetW) && !isNaN(targetH) && targetH > targetW;
      const mode = options.aspectRatioMode || (isTargetVertical ? 'crop_fill' : 'pad_black');

      changes.push({
        id: 'resolution',
        category: 'resolution',
        title: isTargetVertical ? '9:16 Vertical Reframing' : 'Target Resolution',
        before: 'Source Dimensions',
        after: `${targetRes} (${getResolutionLabelFromStr(targetRes)})`,
        description: isTargetVertical
          ? 'Converts video to full 9:16 vertical frame (1080×1920) with no black bars for TikTok / Reels.'
          : `Scales output frames to ${targetRes} to match target platform standards.`,
        badge: isTargetVertical ? 'Full 9:16' : 'Target Res',
        badgeColor: isTargetVertical ? 'purple' : 'purple',
      });
    } else {
      changes.push({
        id: 'resolution',
        category: 'resolution',
        title: 'Resolution',
        before: inputRes || 'Source Dimensions',
        after: inputRes || '100% Native Resolution',
        description: 'Original native video dimensions are preserved 1:1 without downscaling or stretching.',
        badge: 'Original 1:1',
        badgeColor: 'slate',
        isUnchanged: true,
      });
    }

    // 3. Video Codec & GPU Acceleration
    const targetVideoCodec = options.videoCodec || preset?.videoCodec || 'h264';
    const hasGpu = Boolean(gpuCaps?.hasGpu && isPro);
    const gpuName = gpuCaps?.displayName || 'Dedicated GPU';
    const encoder = hasGpu
      ? `${targetVideoCodec.toUpperCase()} (${gpuCaps?.type.toUpperCase()} GPU Accelerated)`
      : `${targetVideoCodec.toUpperCase()} (CPU High Efficiency - libx264)`;

    changes.push({
      id: 'codec',
      category: 'codec',
      title: 'Video Stream Encoding',
      before: 'Source Video Stream',
      after: encoder,
      description: hasGpu
        ? `Hardware-accelerated encoding using your ${gpuName} for 10x-50x faster batch rendering.`
        : 'Multi-threaded software CPU encoding with balanced compression and universal playback compatibility.',
      badge: hasGpu ? 'GPU Accelerated' : 'CPU Encoded',
      badgeColor: hasGpu ? 'emerald' : 'slate',
    });

    // 4. Framerate (FPS)
    const targetFps = options.fps || preset?.fps;
    if (targetFps) {
      changes.push({
        id: 'fps',
        category: 'fps',
        title: 'Framerate Delivery',
        before: 'Native / Variable FPS',
        after: `${targetFps} FPS (Constant Frame Rate)`,
        description: `Converts to a stable ${targetFps} frames-per-second CFR stream, preventing audio-video sync drift.`,
        badge: `${targetFps} FPS`,
        badgeColor: 'cyan',
      });
    }

    // 5. Video Bitrate
    const targetBitrate = options.videoBitrate || preset?.videoBitrate;
    if (targetBitrate) {
      changes.push({
        id: 'bitrate',
        category: 'bitrate',
        title: 'Target Video Bitrate',
        before: 'Source Bitrate',
        after: targetBitrate,
        description: `Targets a clean ${targetBitrate} bitstream rate, tuned for high visual quality without unnecessary file bloat.`,
        badge: targetBitrate,
        badgeColor: 'blue',
      });
    }
  }

  // 6. Audio Codec & Channels
  const targetAudioCodec = options.audioCodec || preset?.audioCodec || (isTargetAudioOnly ? outputExt : 'aac');
  const targetAudioBitrate = options.audioBitrate || preset?.audioBitrate || (isTargetAudioOnly ? '320k' : '192k');
  const targetSampleRate = options.audioSampleRate || preset?.audioSampleRate || 48000;

  changes.push({
    id: 'audio',
    category: 'audio',
    title: isTargetAudioOnly ? 'Master Audio Stream' : 'Audio Track Encoding',
    before: 'Source Audio Track',
    after: `${targetAudioCodec.toUpperCase()} @ ${targetAudioBitrate} (${(targetSampleRate / 1000).toFixed(1)} kHz)`,
    description: `Re-encodes audio tracks to ${targetAudioCodec.toUpperCase()} stereo (2 channels) with ${targetAudioBitrate} fidelity.`,
    badge: `${targetAudioCodec.toUpperCase()} ${targetAudioBitrate}`,
    badgeColor: 'blue',
  });

  // 7. Audio Loudness Normalization
  if (options.normalizeAudio || preset?.normalizeAudio) {
    changes.push({
      id: 'audio_norm',
      category: 'audio_norm',
      title: 'Audio Loudness Normalization',
      before: 'Raw Unregulated Levels',
      after: 'EBU R128 Peak Normalized (-14 LUFS)',
      description: 'Balances volume to eliminate quiet dialogue and loud volume spikes. Meets YouTube, Spotify, and TikTok standards.',
      badge: 'Volume Balanced',
      badgeColor: 'emerald',
    });
  }

  // 8. Size Estimate
  const estimatedRatio = isTargetAudioOnly ? 0.08 : (preset?.resolution?.includes('3840') ? 0.9 : 0.65);
  const estimatedBytes = Math.round(file.sizeBytes * estimatedRatio);
  const savedBytes = Math.max(0, file.sizeBytes - estimatedBytes);
  const pctSaved = Math.round((savedBytes / file.sizeBytes) * 100);

  if (pctSaved > 0) {
    changes.push({
      id: 'size',
      category: 'size',
      title: 'Estimated Output Size',
      before: formatBytes(file.sizeBytes),
      after: `~${formatBytes(estimatedBytes)} (Est. ${pctSaved}% smaller)`,
      description: `Optimized encoding parameters are projected to reduce file weight by ~${pctSaved}%.`,
      badge: `-${pctSaved}% Est. Size`,
      badgeColor: 'emerald',
    });
  }

  return changes;
}

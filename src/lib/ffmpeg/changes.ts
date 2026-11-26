import type {
  MediaFileInfo,
  ConversionOptions,
  CreatorPreset,
  GpuCapabilities,
} from '../types';
import { calculateTargetSizeBudget } from './bitrateBudget';
import { resolveEncoderForCodec } from './detector';

export interface ConversionChangeItem {
  id: string;
  category:
    | 'format'
    | 'resolution'
    | 'aspect'
    | 'codec'
    | 'fps'
    | 'bitrate'
    | 'audio'
    | 'audio_norm'
    | 'size'
    | 'gpu';
  title: string;
  before?: string;
  after?: string;
  value: string;
  isUnchanged?: boolean;
}

const BENCHMARK_KEY = 'vimora_local_speed_benchmark';

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatAspectRatio(width?: number, height?: number): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.06) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.04) return '9:16';
  if (Math.abs(ratio - 1) < 0.04) return '1:1';
  if (Math.abs(ratio - 4 / 5) < 0.04) return '4:5';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
  return `${width}:${height}`;
}

export function recordLocalBenchmark(isGpu: boolean, speedMultiplier: number): void {
  if (typeof window === 'undefined' || !speedMultiplier || speedMultiplier <= 0) return;
  try {
    const raw = localStorage.getItem(BENCHMARK_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const key = isGpu ? 'gpuSpeed' : 'cpuSpeed';
    const prev = typeof data[key] === 'number' ? data[key] : speedMultiplier;
    // Exponential moving average
    data[key] = Number((prev * 0.6 + speedMultiplier * 0.4).toFixed(2));
    localStorage.setItem(BENCHMARK_KEY, JSON.stringify(data));
  } catch {}
}

export function estimateConversionSeconds(
  durationSeconds: number | undefined,
  isGpu: boolean,
  isAudioOnly: boolean,
  isTwoPass = false
): number | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  if (isAudioOnly) {
    return Math.max(1, Math.round(durationSeconds / 25));
  }

  let speedMultiplier = isGpu ? 6.0 : 1.6;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(BENCHMARK_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const stored = isGpu ? data.gpuSpeed : data.cpuSpeed;
        if (typeof stored === 'number' && stored > 0.2) {
          speedMultiplier = stored;
        }
      }
    } catch {}
  }

  const baseSeconds = durationSeconds / speedMultiplier;
  return Math.max(2, Math.round(isTwoPass ? baseSeconds * 1.75 : baseSeconds));
}

export function formatEtaLabel(seconds: number | null): string {
  if (seconds === null) return 'Calculated on start';
  if (seconds < 60) return `~${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`;
}

export function getPlannedChanges(
  file: MediaFileInfo,
  options: ConversionOptions,
  preset?: CreatorPreset,
  gpuCaps?: GpuCapabilities | null,
  _isPro?: boolean
): ConversionChangeItem[] {
  const changes: ConversionChangeItem[] = [];

  const inputExt = (file.format || file.name.split('.').pop() || '').toLowerCase();
  const outputExt = (options.outputFormat || preset?.outputFormat || 'mp4').toLowerCase();
  const isTargetAudioOnly = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(outputExt);

  // 1. Container Format
  changes.push({
    id: 'format',
    category: 'format',
    title: 'Format',
    before: inputExt ? `.${inputExt.toUpperCase()}` : undefined,
    after: `.${outputExt.toUpperCase()}`,
    value:
      inputExt && inputExt !== outputExt
        ? `.${inputExt.toUpperCase()} → .${outputExt.toUpperCase()}`
        : `.${outputExt.toUpperCase()}`,
    isUnchanged: inputExt === outputExt,
  });

  if (!isTargetAudioOnly) {
    // 2. Resolution diff
    const inputRes = file.width && file.height ? `${file.width}×${file.height}` : undefined;
    const rawTargetRes = options.resolution || preset?.resolution;
    const targetRes = rawTargetRes ? rawTargetRes.replace('x', '×') : inputRes || 'Original';
    if (rawTargetRes || inputRes) {
      const changed = Boolean(inputRes && targetRes !== inputRes);
      changes.push({
        id: 'resolution',
        category: 'resolution',
        title: 'Resolution',
        before: inputRes,
        after: targetRes,
        value: changed ? `${inputRes} → ${targetRes}` : targetRes,
        isUnchanged: !changed,
      });
    }

    // 3. Aspect ratio diff
    const srcAspect = formatAspectRatio(file.width, file.height);
    let dstAspect = srcAspect;
    if (rawTargetRes && options.aspectRatioMode !== 'keep_original') {
      const parts = rawTargetRes.split('x');
      if (parts.length === 2) {
        dstAspect = formatAspectRatio(parseInt(parts[0], 10), parseInt(parts[1], 10));
      }
    }
    if (srcAspect && dstAspect) {
      const changed = srcAspect !== dstAspect;
      changes.push({
        id: 'aspect',
        category: 'aspect',
        title: 'Aspect ratio',
        before: srcAspect,
        after: dstAspect,
        value: changed ? `${srcAspect} → ${dstAspect}` : `${dstAspect} (unchanged)`,
        isUnchanged: !changed,
      });
    }

    // 4. Video Codec diff
    const srcCodec = file.videoCodec ? file.videoCodec.toUpperCase() : undefined;
    const targetVideoCodec = (options.videoCodec || preset?.videoCodec || 'h264').toUpperCase();
    changes.push({
      id: 'codec',
      category: 'codec',
      title: 'Video codec',
      before: srcCodec,
      after: targetVideoCodec,
      value: srcCodec ? `${srcCodec} → ${targetVideoCodec}` : targetVideoCodec,
      isUnchanged: srcCodec === targetVideoCodec,
    });

    // 5. Frame Rate
    const targetFps = options.fps || preset?.fps;
    if (targetFps || file.fps) {
      const srcFpsLabel = file.fps ? `${file.fps} FPS` : undefined;
      const dstFpsLabel = targetFps ? `${targetFps} FPS` : `${file.fps} FPS`;
      const changed = Boolean(srcFpsLabel && dstFpsLabel !== srcFpsLabel);
      changes.push({
        id: 'fps',
        category: 'fps',
        title: 'Frame rate',
        before: srcFpsLabel,
        after: dstFpsLabel,
        value: changed ? `${srcFpsLabel} → ${dstFpsLabel}` : dstFpsLabel,
        isUnchanged: !changed,
      });
    }
  }

  // 6. Audio Track
  if (options.keepAudio === false || preset?.removeAudio) {
    changes.push({
      id: 'remove_audio',
      category: 'audio',
      title: 'Audio',
      value: 'Muted (removed)',
    });
  } else {
    const targetAudioCodec = (
      options.audioCodec ||
      preset?.audioCodec ||
      (isTargetAudioOnly ? outputExt : 'aac')
    ).toUpperCase();
    const targetAudioBitrate = options.audioBitrate || preset?.audioBitrate || '192k';
    const channels = (options.audioChannels || preset?.audioChannels || 2) === 1 ? 'mono' : 'stereo';
    changes.push({
      id: 'audio',
      category: 'audio',
      title: 'Audio',
      value: `${targetAudioCodec} ${targetAudioBitrate} ${channels}`,
    });
  }

  // 7. Estimated Output Size (when targetSizeMb is set)
  if (options.targetSizeMb && options.targetSizeMb > 0) {
    const budget = calculateTargetSizeBudget({
      targetSizeMb: options.targetSizeMb,
      durationSeconds: file.durationSeconds,
      sourceSizeBytes: file.sizeBytes,
      width: file.width,
      height: file.height,
      fps: options.fps || file.fps,
      outputFormat: outputExt as any,
      videoCodec: options.videoCodec || preset?.videoCodec,
      keepAudio: options.keepAudio,
      hasAudio: file.hasAudio,
      qualityPreference: options.quality,
    });
    const srcSizeStr = file.sizeBytes > 0 ? formatBytes(file.sizeBytes) : undefined;
    const estStr = `~${budget.estimatedOutputMb} MB (≤${options.targetSizeMb} MB)`;
    changes.push({
      id: 'target_size',
      category: 'size',
      title: 'Size',
      before: srcSizeStr,
      after: estStr,
      value: srcSizeStr ? `${srcSizeStr} → ${estStr}` : estStr,
    });
  }

  // 8. Resolved Encoder (honest GPU vs CPU)
  if (!isTargetAudioOnly) {
    const resolved = resolveEncoderForCodec(
      options.videoCodec || preset?.videoCodec,
      gpuCaps,
      !(options.targetSizeMb && options.strictTwoPass)
    );
    changes.push({
      id: 'gpu',
      category: 'gpu',
      title: 'Encoder',
      value: resolved.isGpu
        ? `${resolved.gpuType.toUpperCase()} (${resolved.encoder})`
        : `CPU (${resolved.encoder})`,
    });
  }

  return changes;
}

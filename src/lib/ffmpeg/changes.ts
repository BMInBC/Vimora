import { MediaFileInfo, ConversionOptions, CreatorPreset, GpuCapabilities } from '../types';

export interface ConversionChangeItem {
  id: string;
  category: 'format' | 'resolution' | 'codec' | 'fps' | 'bitrate' | 'audio' | 'audio_norm' | 'size' | 'gpu';
  title: string;
  value: string;
  isUnchanged?: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
  const outputExt = (options.outputFormat || preset?.outputFormat || 'mp4').toLowerCase();
  const isTargetAudioOnly = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(outputExt);
  const isSourceAudioOnly = !file.hasVideo && file.hasAudio;

  // 1. Container / File Format
  if (inputExt !== outputExt) {
    changes.push({
      id: 'format',
      category: 'format',
      title: 'Container Format',
      value: `.${outputExt.toUpperCase()}`,
    });
  } else {
    // If format is same, still list Container Format if explicit
    changes.push({
      id: 'format',
      category: 'format',
      title: 'Container Format',
      value: `.${outputExt.toUpperCase()}`,
    });
  }

  // 2. Resolution & Aspect Ratio (for video targets)
  if (!isTargetAudioOnly) {
    const inputRes = file.width && file.height ? `${file.width}×${file.height}` : null;
    const targetRes = options.resolution || preset?.resolution;

    if (targetRes) {
      const parts = targetRes.split('x');
      const targetW = parseInt(parts[0], 10);
      const targetH = parseInt(parts[1], 10);
      const isTargetVertical = !isNaN(targetW) && !isNaN(targetH) && targetH > targetW;
      const isSame = inputRes && inputRes.replace(/\s/g, '') === targetRes.replace(/\s/g, '');

      if (!isSame) {
        changes.push({
          id: 'resolution',
          category: 'resolution',
          title: isTargetVertical ? 'Resolution (9:16 Vertical)' : 'Resolution',
          value: targetRes,
        });
      }
    }

    // 3. Video Codec
    const targetVideoCodec = options.videoCodec || preset?.videoCodec || 'h264';
    if (targetVideoCodec !== 'copy') {
      changes.push({
        id: 'codec',
        category: 'codec',
        title: 'Video Codec',
        value: targetVideoCodec.toUpperCase(),
      });
    }

    // 4. Framerate (FPS)
    const targetFps = options.fps || preset?.fps;
    if (targetFps) {
      changes.push({
        id: 'fps',
        category: 'fps',
        title: 'Frame Rate',
        value: `${targetFps} FPS`,
      });
    }

    // 5. Video Bitrate
    const targetBitrate = options.videoBitrate || preset?.videoBitrate;
    if (targetBitrate) {
      changes.push({
        id: 'bitrate',
        category: 'bitrate',
        title: 'Video Bitrate',
        value: targetBitrate,
      });
    }
  }

  // 6. Audio Codec & Fidelity
  if (options.keepAudio === false || preset?.removeAudio) {
    changes.push({
      id: 'remove_audio',
      category: 'audio',
      title: 'Audio Track',
      value: 'Muted',
    });
  } else {
    const targetAudioCodec = options.audioCodec || preset?.audioCodec || (isTargetAudioOnly ? outputExt : 'aac');
    const targetAudioBitrate = options.audioBitrate || preset?.audioBitrate;
    changes.push({
      id: 'audio',
      category: 'audio',
      title: isTargetAudioOnly ? 'Audio Master' : 'Audio Codec',
      value: targetAudioBitrate ? `${targetAudioCodec.toUpperCase()} (${targetAudioBitrate})` : targetAudioCodec.toUpperCase(),
    });
  }

  // 7. Audio Dynamics & Voice Preservation
  if (options.keepAudio !== false) {
    changes.push({
      id: 'audio_voice',
      category: 'audio_norm',
      title: 'Voice & Volume',
      value: 'Original Level Preserved',
    });
  }

  // 8. GPU Acceleration
  if (gpuCaps?.hasGpu && isPro) {
    changes.push({
      id: 'gpu',
      category: 'gpu',
      title: 'GPU Acceleration',
      value: `${gpuCaps.type.toUpperCase()}`,
    });
  }

  return changes;
}

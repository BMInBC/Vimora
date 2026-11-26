import type { GpuCapabilities, GpuEncoderType, VideoCodec } from '../types';

let cachedCapabilities: GpuCapabilities | null = null;

export function getFallbackCapabilities(): GpuCapabilities {
  return {
    hasGpu: false,
    type: 'cpu',
    displayName: 'CPU Software (x264 / x265 / VP9)',
    supportedVideoEncoders: ['libx264', 'libx265', 'libvpx-vp9'],
    fallbackEncoder: 'libx264',
  };
}

export function clearGpuCapabilitiesCache(): void {
  cachedCapabilities = null;
}

export function parseEncoderOutput(stdout: string): GpuCapabilities {
  const encoders = stdout.toLowerCase();

  const hasNvenc = encoders.includes('h264_nvenc');
  const hasQsv = encoders.includes('h264_qsv');
  const hasAmf = encoders.includes('h264_amf');
  const hasVt = encoders.includes('h264_videotoolbox');

  if (hasNvenc) {
    const list: string[] = ['h264_nvenc'];
    if (encoders.includes('hevc_nvenc')) list.push('hevc_nvenc');
    if (encoders.includes('av1_nvenc')) list.push('av1_nvenc');
    return {
      hasGpu: true,
      type: 'nvenc',
      displayName: 'NVIDIA NVENC Hardware Acceleration',
      supportedVideoEncoders: list,
      fallbackEncoder: 'libx264',
    };
  }

  if (hasQsv) {
    const list: string[] = ['h264_qsv'];
    if (encoders.includes('hevc_qsv')) list.push('hevc_qsv');
    if (encoders.includes('av1_qsv')) list.push('av1_qsv');
    return {
      hasGpu: true,
      type: 'qsv',
      displayName: 'Intel Quick Sync Video (QSV)',
      supportedVideoEncoders: list,
      fallbackEncoder: 'libx264',
    };
  }

  if (hasAmf) {
    const list: string[] = ['h264_amf'];
    if (encoders.includes('hevc_amf')) list.push('hevc_amf');
    if (encoders.includes('av1_amf')) list.push('av1_amf');
    return {
      hasGpu: true,
      type: 'amf',
      displayName: 'AMD AMF Hardware Acceleration',
      supportedVideoEncoders: list,
      fallbackEncoder: 'libx264',
    };
  }

  if (hasVt) {
    const list: string[] = ['h264_videotoolbox'];
    if (encoders.includes('hevc_videotoolbox')) list.push('hevc_videotoolbox');
    return {
      hasGpu: true,
      type: 'videotoolbox',
      displayName: 'Apple VideoToolbox Hardware Acceleration',
      supportedVideoEncoders: list,
      fallbackEncoder: 'libx264',
    };
  }

  return getFallbackCapabilities();
}

export interface ResolvedEncoder {
  encoder: string;
  isGpu: boolean;
  gpuType: GpuEncoderType;
  fallbackReason?: string;
}

/**
 * Validates actual hardware encoder availability for the requested codec and
 * safely falls back to CPU without ever falsely claiming GPU acceleration.
 */
export function resolveEncoderForCodec(
  codec: VideoCodec | undefined,
  gpuCaps: GpuCapabilities | null | undefined,
  enableGpu = true,
  gpuPreference: 'auto' | GpuEncoderType = 'auto'
): ResolvedEncoder {
  const targetCodec = codec || 'h264';
  if (targetCodec === 'copy') {
    return { encoder: 'copy', isGpu: false, gpuType: 'cpu' };
  }

  const cpuEncoder =
    targetCodec === 'hevc'
      ? 'libx265'
      : targetCodec === 'vp9'
      ? 'libvpx-vp9'
      : targetCodec === 'av1'
      ? 'libsvtav1'
      : 'libx264';

  if (!enableGpu || gpuPreference === 'cpu' || !gpuCaps?.hasGpu || gpuCaps.type === 'cpu') {
    return {
      encoder: cpuEncoder,
      isGpu: false,
      gpuType: 'cpu',
      fallbackReason: !enableGpu || gpuPreference === 'cpu' ? 'CPU encoding selected' : undefined,
    };
  }

  // VP9 is software-encoded on consumer GPUs in FFmpeg
  if (targetCodec === 'vp9') {
    return {
      encoder: 'libvpx-vp9',
      isGpu: false,
      gpuType: 'cpu',
      fallbackReason: 'VP9 uses CPU software encoding for maximum compatibility',
    };
  }

  const suffix = gpuCaps.type;
  const candidate = `${targetCodec}_${suffix}`;
  if (gpuCaps.supportedVideoEncoders.includes(candidate)) {
    return {
      encoder: candidate,
      isGpu: true,
      gpuType: gpuCaps.type,
    };
  }

  return {
    encoder: cpuEncoder,
    isGpu: false,
    gpuType: 'cpu',
    fallbackReason: `${candidate} is not supported by this hardware; using ${cpuEncoder} CPU fallback`,
  };
}

export async function detectGpuCapabilities(options?: { forceRefresh?: boolean }): Promise<GpuCapabilities> {
  if (options?.forceRefresh) {
    cachedCapabilities = null;
  }
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  try {
    const { isDesktopApp, getDesktopGpuCaps } = await import('../desktop/tauriBridge');
    if (isDesktopApp()) {
      const desktopCaps = await getDesktopGpuCaps();
      if (desktopCaps) {
        cachedCapabilities = desktopCaps;
        return desktopCaps;
      }
    }
  } catch (err) {
    console.warn('[detector] Desktop GPU detection failed:', err);
  }

  try {
    const res = await fetch('/api/gpu', { method: 'GET', cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      cachedCapabilities = data;
      return data;
    }
  } catch (err) {
    console.warn('Unable to query /api/gpu endpoint, falling back to CPU:', err);
  }

  const fallback = getFallbackCapabilities();
  cachedCapabilities = fallback;
  return fallback;
}

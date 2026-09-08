import { GpuCapabilities, GpuEncoderType } from '../types';

let cachedCapabilities: GpuCapabilities | null = null;

export function getFallbackCapabilities(): GpuCapabilities {
  return {
    hasGpu: false,
    type: 'cpu',
    displayName: 'CPU Software (x264 / VP9 / LAME)',
    supportedVideoEncoders: ['libx264', 'libx265', 'libvpx-vp9'],
    fallbackEncoder: 'libx264',
  };
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

export async function detectGpuCapabilities(): Promise<GpuCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  try {
    const res = await fetch('/api/gpu', { method: 'GET' });
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
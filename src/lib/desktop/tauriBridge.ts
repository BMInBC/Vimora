import { GpuCapabilities } from '../types';

export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_METADATA__
  );
}

export async function openDesktopFolder(folderPath: string): Promise<boolean> {
  if (!isDesktopApp()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('tauri_open_folder', { folderPath });
    return true;
  } catch (err) {
    console.error('[tauriBridge] openDesktopFolder failed:', err);
    return false;
  }
}

export async function pickDesktopFiles(): Promise<string[]> {
  if (!isDesktopApp()) return [];
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: true,
      directory: false,
      title: 'Select Video or Audio Files to Convert',
      filters: [
        {
          name: 'Media Files',
          extensions: [
            'mp4', 'mov', 'mkv', 'webm', 'avi', 'wmv', 'flv', 'm4v', 'ts', 'mts',
            'mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'opus', 'aiff'
          ],
        },
        { name: 'All Files', extensions: ['*'] }
      ],
    });

    if (Array.isArray(selected)) {
      return selected;
    } else if (typeof selected === 'string') {
      return [selected];
    }
    return [];
  } catch (err) {
    console.error('[tauriBridge] pickDesktopFiles failed:', err);
    return [];
  }
}

export async function pickDesktopOutputDirectory(): Promise<string | null> {
  if (!isDesktopApp()) return null;
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Output Destination Folder',
    });
    return typeof selected === 'string' ? selected : null;
  } catch (err) {
    console.error('[tauriBridge] pickDesktopOutputDirectory failed:', err);
    return null;
  }
}

const SUPPORTED_MEDIA_EXT_REGEX =
  /\.(mp4|mov|mkv|webm|avi|wmv|flv|m4v|ts|mts|mp3|wav|aac|flac|ogg|m4a|wma|opus|aiff)$/i;

export async function expandDesktopMediaPaths(paths: string[]): Promise<string[]> {
  if (!isDesktopApp() || !paths || paths.length === 0) return [];
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const expanded = await invoke<string[]>('tauri_collect_media_files', { paths });
    if (Array.isArray(expanded)) {
      return expanded;
    }
  } catch (err) {
    console.warn('[tauriBridge] tauri_collect_media_files failed, returning raw media paths:', err);
  }
  return paths.filter((p) => SUPPORTED_MEDIA_EXT_REGEX.test(p));
}

export async function pickDesktopFolderFiles(): Promise<string[]> {
  if (!isDesktopApp()) return [];
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const folder = await open({
      directory: true,
      multiple: false,
      title: 'Select Folder Containing Video or Audio Files',
    });
    if (typeof folder !== 'string' || !folder) return [];

    const fromRust = await expandDesktopMediaPaths([folder]);
    if (fromRust.length > 0) return fromRust;

    const { readDir } = await import('@tauri-apps/plugin-fs');
    const entries = await readDir(folder);
    const sep = folder.includes('\\') ? '\\' : '/';
    const normalizedFolder = folder.replace(/[\\/]+$/, '');

    const mediaPaths: string[] = [];
    for (const entry of entries) {
      if (entry.isFile && entry.name && SUPPORTED_MEDIA_EXT_REGEX.test(entry.name)) {
        mediaPaths.push(`${normalizedFolder}${sep}${entry.name}`);
      }
    }
    return mediaPaths;
  } catch (err) {
    console.error('[tauriBridge] pickDesktopFolderFiles failed:', err);
    return [];
  }
}

export async function getDesktopDownloadDir(): Promise<string | null> {
  if (!isDesktopApp()) return null;
  try {
    const { downloadDir } = await import('@tauri-apps/api/path');
    return await downloadDir();
  } catch (err) {
    console.warn('[tauriBridge] getDesktopDownloadDir failed:', err);
    return null;
  }
}

export async function getDesktopGpuCaps(): Promise<GpuCapabilities | null> {
  if (!isDesktopApp()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const caps = await invoke<any>('tauri_get_gpu_caps');
    if (caps) {
      return {
        hasGpu: Boolean(caps.has_gpu),
        type: caps['r#type'] || caps.type || 'cpu',
        displayName: caps.display_name || caps.displayName || 'Hardware Accelerator',
        supportedVideoEncoders: caps.supported_video_encoders || caps.supportedVideoEncoders || ['libx264'],
        fallbackEncoder: caps.fallback_encoder || caps.fallbackEncoder || 'libx264',
      };
    }
  } catch (err) {
    console.warn('[tauriBridge] tauri_get_gpu_caps invocation failed:', err);
  }
  return null;
}

export interface ProbedMediaData {
  success: boolean;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  durationSeconds?: number;
  sizeBytes?: number;
}

export async function probeDesktopMedia(filePath: string): Promise<ProbedMediaData | null> {
  if (!isDesktopApp()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const raw = await invoke<any>('tauri_probe_media', { filePath });
    if (!raw) return null;

    let width: number | undefined;
    let height: number | undefined;
    let fps: number | undefined;
    let videoCodec: string | undefined;
    let audioCodec: string | undefined;
    let durationSeconds: number | undefined;
    let sizeBytes: number | undefined;

    if (raw.streams && Array.isArray(raw.streams)) {
      const vStream = raw.streams.find((s: any) => s.codec_type === 'video');
      const aStream = raw.streams.find((s: any) => s.codec_type === 'audio');

      if (vStream) {
        width = typeof vStream.width === 'number' ? vStream.width : parseInt(vStream.width, 10) || undefined;
        height = typeof vStream.height === 'number' ? vStream.height : parseInt(vStream.height, 10) || undefined;
        videoCodec = vStream.codec_name;
        if (vStream.r_frame_rate) {
          const parts = vStream.r_frame_rate.split('/');
          if (parts.length === 2) {
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            if (den > 0) fps = Math.round(num / den);
          }
        } else if (vStream.avg_frame_rate) {
          const parts = vStream.avg_frame_rate.split('/');
          if (parts.length === 2) {
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            if (den > 0) fps = Math.round(num / den);
          }
        }
      }

      if (aStream) {
        audioCodec = aStream.codec_name;
      }
    }

    if (raw.format) {
      if (raw.format.duration) {
        durationSeconds = parseFloat(raw.format.duration);
      }
      if (raw.format.size) {
        sizeBytes = parseInt(raw.format.size, 10);
      }
    }

    return {
      success: true,
      width,
      height,
      fps,
      videoCodec,
      audioCodec,
      durationSeconds,
      sizeBytes,
    };
  } catch (err) {
    console.warn('[tauriBridge] tauri_probe_media failed:', err);
    return null;
  }
}

export interface DesktopConvertParams {
  jobId: string;
  inputPath: string;
  outputPath: string;
  args: string[];
  durationSeconds?: number;
  onProgress: (progress: {
    percentage: number;
    fps: number;
    speed: string;
    outTimeSeconds: number;
    totalDurationSeconds: number;
    status: 'processing' | 'completed' | 'error';
    error?: string;
  }) => void;
}

export async function convertDesktopMedia(
  params: DesktopConvertParams
): Promise<{ success: boolean; outputPath: string }> {
  if (!isDesktopApp()) {
    throw new Error('convertDesktopMedia called outside Tauri environment');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');

  return new Promise(async (resolve, reject) => {
    let unlisten: (() => void) | null = null;

    try {
      unlisten = await listen<any>(`conversion-progress-${params.jobId}`, (event) => {
        const payload = event.payload;
        if (!payload) return;

        const percentage = Number(payload.percentage || 0);
        const fps = Number(payload.fps || 0);
        const speed = String(payload.speed || '1.0x');
        const outTimeSeconds = Number(payload.out_time_seconds || 0);
        const totalDurationSeconds = Number(payload.total_duration_seconds || params.durationSeconds || 0);
        const status = payload.status || 'processing';
        const error = payload.error;

        params.onProgress({
          percentage,
          fps,
          speed,
          outTimeSeconds,
          totalDurationSeconds,
          status,
          error,
        });

        if (status === 'completed') {
          if (unlisten) unlisten();
          resolve({ success: true, outputPath: params.outputPath });
        } else if (status === 'error') {
          if (unlisten) unlisten();
          reject(new Error(error || 'Conversion failed in desktop engine'));
        }
      });

      await invoke('tauri_convert_media', {
        jobId: params.jobId,
        inputPath: params.inputPath,
        outputPath: params.outputPath,
        args: params.args,
        durationSeconds: params.durationSeconds || 0,
      });
    } catch (err) {
      if (unlisten) unlisten();
      reject(err);
    }
  });
}

export async function cancelDesktopConversion(jobId: string): Promise<void> {
  if (!isDesktopApp()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('tauri_cancel_conversion', { jobId });
  } catch (err) {
    console.warn('[tauriBridge] cancelDesktopConversion failed:', err);
  }
}

export async function getDesktopFileSize(filePath: string): Promise<number | null> {
  if (!isDesktopApp() || !filePath) return null;
  try {
    const { stat } = await import('@tauri-apps/plugin-fs');
    const info = await stat(filePath);
    return typeof info?.size === 'number' ? info.size : null;
  } catch (err) {
    console.warn('[tauriBridge] getDesktopFileSize failed:', err);
    return null;
  }
}

import { GpuCapabilities } from '../types';

let _isTauriCached: boolean | null = null;

export function isDesktopApp(): boolean {
  if (_isTauriCached !== null) return _isTauriCached;
  if (typeof window === 'undefined') return false;

  const hasTauriInternals = '__TAURI_INTERNALS__' in window;
  const hasTauriObject = '__TAURI__' in window;
  _isTauriCached = Boolean(hasTauriInternals || hasTauriObject);
  return _isTauriCached;
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

export async function probeDesktopMedia(filePath: string): Promise<any | null> {
  if (!isDesktopApp()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const meta = await invoke<any>('tauri_probe_media', { filePath });
    return meta;
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

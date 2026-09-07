import { ConversionOptions, GpuCapabilities, OutputFormat } from '../types';

export interface BuildArgsParams {
  inputPath: string;
  outputPath: string;
  options: ConversionOptions;
  gpuCaps?: GpuCapabilities;
  enableGpu?: boolean;
}

export function buildSafeFfmpegArgs(params: BuildArgsParams): string[] {
  const { inputPath, outputPath, options, gpuCaps, enableGpu = true } = params;

  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid input path');
  }
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('Invalid output path');
  }

  const args: string[] = ['-hide_banner', '-y'];

  // Input file flag
  args.push('-i', inputPath);

  const format = options.outputFormat.toLowerCase() as OutputFormat;
  const isAudioOnly = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(format);

  if (isAudioOnly) {
    args.push('-vn');
    args.push('-map', '0:a:0?');
  } else if (options.keepAudio === false) {
    args.push('-an');
  }

  // Video options (if not audio-only format)
  if (!isAudioOnly) {
    let videoEncoder = 'libx264'; // Default safe CPU fallback

    if (enableGpu && gpuCaps?.hasGpu) {
      if (gpuCaps.type === 'nvenc') {
        videoEncoder = options.videoCodec === 'hevc' ? 'hevc_nvenc' : 'h264_nvenc';
      } else if (gpuCaps.type === 'qsv') {
        videoEncoder = options.videoCodec === 'hevc' ? 'hevc_qsv' : 'h264_qsv';
      } else if (gpuCaps.type === 'amf') {
        videoEncoder = options.videoCodec === 'hevc' ? 'hevc_amf' : 'h264_amf';
      } else if (gpuCaps.type === 'videotoolbox') {
        videoEncoder = options.videoCodec === 'hevc' ? 'hevc_videotoolbox' : 'h264_videotoolbox';
      }
    } else {
      if (options.videoCodec === 'hevc') {
        videoEncoder = 'libx265';
      } else if (options.videoCodec === 'vp9') {
        videoEncoder = 'libvpx-vp9';
      } else if (options.videoCodec === 'copy') {
        videoEncoder = 'copy';
      }
    }

    args.push('-c:v', videoEncoder);

    // Hardware encoder presets vs software
    if (videoEncoder.includes('nvenc')) {
      args.push('-preset', 'p4', '-tune', 'hq');
    } else if (videoEncoder === 'libx264' || videoEncoder === 'libx265') {
      args.push('-preset', 'medium');
    }

    // Resolution & Aspect Ratio filter
    if (options.resolution && options.videoCodec !== 'copy') {
      const parts = options.resolution.split('x');
      if (parts.length === 2) {
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h)) {
          const isVerticalTarget = h > w;
          const mode =
            options.aspectRatioMode ||
            (isVerticalTarget ? 'crop_fill' : options.maintainAspect !== false ? 'pad_black' : 'stretch');

          if (mode === 'crop_fill') {
            // Fills frame completely (ideal for vertical TikTok / Reels / Shorts with 0 black bars)
            args.push('-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`);
          } else if (mode === 'blur_pad') {
            // Fills canvas with stylish blurred video background
            args.push(
              '-vf',
              `split[fg][bg];[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=25:5[bgblur];[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[fgfit];[bgblur][fgfit]overlay=(W-w)/2:(H-h)/2`
            );
          } else if (mode === 'stretch' || options.maintainAspect === false) {
            args.push('-vf', `scale=${w}:${h}`);
          } else {
            // pad_black: keep aspect ratio and pad with black borders
            args.push('-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
          }
        }
      }
    }

    // Framerate
    if (options.fps && options.fps > 0) {
      args.push('-r', options.fps.toString());
    }

    // Video Bitrate
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    } else {
      // Quality presets
      if (options.quality === 'smaller') {
        if (videoEncoder.includes('nvenc')) {
          args.push('-cq', '28');
        } else {
          args.push('-crf', '28');
        }
      } else if (options.quality === 'high') {
        if (videoEncoder.includes('nvenc')) {
          args.push('-cq', '19');
        } else {
          args.push('-crf', '18');
        }
      } else if (options.quality === 'balanced') {
        if (videoEncoder.includes('nvenc')) {
          args.push('-cq', '23');
        } else {
          args.push('-crf', '23');
        }
      }
    }
  }

  // Audio options
  if (options.keepAudio !== false) {
    let audioEncoder = 'aac';
    if (format === 'mp3' || options.audioCodec === 'mp3') {
      audioEncoder = 'libmp3lame';
    } else if (format === 'flac' || options.audioCodec === 'flac') {
      audioEncoder = 'flac';
    } else if (format === 'wav' || options.audioCodec === 'wav') {
      audioEncoder = 'pcm_s16le';
    } else if (format === 'ogg' || options.audioCodec === 'opus') {
      audioEncoder = 'libopus';
    } else if (options.audioCodec === 'copy') {
      audioEncoder = 'copy';
    }

    args.push('-c:a', audioEncoder);

    if (options.audioBitrate && audioEncoder !== 'copy' && audioEncoder !== 'flac' && audioEncoder !== 'pcm_s16le') {
      args.push('-b:a', options.audioBitrate);
    }

    if (options.audioSampleRate && audioEncoder !== 'copy') {
      args.push('-ar', options.audioSampleRate.toString());
    }

    if (options.audioChannels && audioEncoder !== 'copy') {
      args.push('-ac', options.audioChannels.toString());
    }

    const shouldNormalize = options.normalizeAudio === true || (isAudioOnly && options.normalizeAudio !== false);
    if (shouldNormalize && audioEncoder !== 'copy') {
      args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
    }
  }

  // Fast start for web playback
  if (format === 'mp4' || format === 'mov') {
    args.push('-movflags', '+faststart');
  }

  // Output file
  args.push(outputPath);

  return args;
}

export interface ParsedProgress {
  timeSeconds?: number;
  fps?: number;
  speed?: string;
  sizeKb?: number;
}

export function parseFfmpegStderrLine(line: string): ParsedProgress | null {
  const result: ParsedProgress = {};

  // Parse time=00:01:23.45
  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (timeMatch) {
    const hours = parseFloat(timeMatch[1]);
    const minutes = parseFloat(timeMatch[2]);
    const seconds = parseFloat(timeMatch[3]);
    result.timeSeconds = hours * 3600 + minutes * 60 + seconds;
  }

  // Parse fps= 45.2
  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  if (fpsMatch) {
    result.fps = parseFloat(fpsMatch[1]);
  }

  // Parse speed= 1.85x
  const speedMatch = line.match(/speed=\s*([\d.]+x)/);
  if (speedMatch) {
    result.speed = speedMatch[1];
  }

  // Parse size= 1240kB
  const sizeMatch = line.match(/size=\s*(\d+)kB/);
  if (sizeMatch) {
    result.sizeKb = parseInt(sizeMatch[1], 10);
  }

  return Object.keys(result).length > 0 ? result : null;
}
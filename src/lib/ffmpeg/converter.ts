import { ConversionOptions, GpuCapabilities, OutputFormat } from '../types';

export interface BuildArgsParams {
  inputPath: string;
  outputPath: string;
  options: ConversionOptions;
  gpuCaps?: GpuCapabilities;
  enableGpu?: boolean;
  durationSeconds?: number;
}

export function buildSafeFfmpegArgs(params: BuildArgsParams): string[] {
  const { inputPath, outputPath, options, gpuCaps, enableGpu = true, durationSeconds } = params;

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

  const hasTargetSize = typeof options.targetSizeMb === 'number' && options.targetSizeMb > 0;
  let calculatedVideoBitrateKbps: number | null = null;
  let calculatedAudioBitrateKbps: number | null = null;

  if (hasTargetSize) {
    const targetMb = options.targetSizeMb!;
    const dur = durationSeconds && durationSeconds > 0 ? durationSeconds : 0;

    if (dur > 0) {
      // 94% safe budget to account for container muxing, moov atom, and VBR packet fluctuations
      const safeBudgetBits = targetMb * 1024 * 1024 * 8 * 0.94;
      const totalBitrateKbps = Math.floor((safeBudgetBits / dur) / 1000);

      if (isAudioOnly) {
        calculatedAudioBitrateKbps = Math.min(320, Math.max(32, totalBitrateKbps));
      } else {
        // Allocate audio bitrate smartly based on overall budget
        let audioK = 192;
        if (totalBitrateKbps < 180) {
          audioK = 64;
        } else if (totalBitrateKbps < 360) {
          audioK = 96;
        } else if (totalBitrateKbps < 750) {
          audioK = 128;
        }
        calculatedAudioBitrateKbps = audioK;
        calculatedVideoBitrateKbps = Math.max(50, totalBitrateKbps - audioK);
      }
    }
  }

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

    // Resolution & Aspect Ratio filter with Lanczos scaling & BT.709 color matrix preservation
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

          const scaleFlags = 'flags=lanczos+accurate_rnd';
          const isHD = w >= 1280 || h >= 720;
          const colorMatrix = isHD ? 'in_color_matrix=auto:out_color_matrix=bt709:' : '';

          if (mode === 'crop_fill') {
            // Fills frame completely (ideal for vertical TikTok / Reels / Shorts with 0 black bars)
            args.push('-vf', `scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=increase,crop=${w}:${h}`);
          } else if (mode === 'blur_pad') {
            // Fills canvas with stylish blurred video background
            args.push(
              '-vf',
              `split[fg][bg];[bg]scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=25:5[bgblur];[fg]scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=decrease[fgfit];[bgblur][fgfit]overlay=(W-w)/2:(H-h)/2`
            );
          } else if (mode === 'stretch' || options.maintainAspect === false) {
            args.push('-vf', `scale=${w}:${h}:${colorMatrix}${scaleFlags}`);
          } else {
            // pad_black: keep aspect ratio and pad with black borders
            args.push('-vf', `scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
          }
        }
      }
    }

    // Framerate: enforce target fps (e.g. 60fps for YouTube Full HD)
    if (options.fps && options.fps > 0) {
      args.push('-r', options.fps.toString());
    }

    // Rate Control & Quality
    if (videoEncoder !== 'copy') {
      args.push('-pix_fmt', 'yuv420p');

      // Tag BT.709 colorimetry for HD/UHD targets to prevent washed out colors
      if (options.resolution) {
        const parts = options.resolution.split('x');
        if (parts.length === 2) {
          const w = parseInt(parts[0], 10);
          const h = parseInt(parts[1], 10);
          if (w >= 1280 || h >= 720) {
            args.push('-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv');
          }
        }
      }

      if (hasTargetSize && calculatedVideoBitrateKbps !== null) {
        // Enforce calculated video bitrate budget to strictly hit target size limit
        const vBitrate = `${calculatedVideoBitrateKbps}k`;
        const maxrate = `${Math.round(calculatedVideoBitrateKbps * 1.15)}k`;
        const bufsize = `${Math.round(calculatedVideoBitrateKbps * 1.8)}k`;
        args.push('-b:v', vBitrate, '-maxrate', maxrate, '-bufsize', bufsize);
      } else {
        const isHigh = options.quality === 'high' || !options.quality;
        const isSmaller = options.quality === 'smaller';

        if (videoEncoder.includes('nvenc')) {
          const cq = isSmaller ? '28' : isHigh ? '18' : '23';
          args.push('-cq', cq);
          if (options.videoBitrate) {
            args.push('-b:v', options.videoBitrate, '-maxrate', options.videoBitrate);
          }
        } else if (videoEncoder === 'libx264' || videoEncoder === 'libx265') {
          // High quality uses visually lossless CRF 17 for cinema-grade clarity
          const crf = isSmaller ? '28' : isHigh ? '17' : '22';
          args.push('-crf', crf);
          if (options.videoBitrate) {
            const num = parseInt(options.videoBitrate, 10);
            const unit = options.videoBitrate.replace(/^[0-9.]+/, '') || 'M';
            const buf = num ? `${num * 2}${unit}` : '32M';
            args.push('-maxrate', options.videoBitrate, '-bufsize', buf);
          }
        } else if (options.videoBitrate) {
          args.push('-b:v', options.videoBitrate);
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

    if (hasTargetSize && calculatedAudioBitrateKbps !== null && audioEncoder !== 'copy' && audioEncoder !== 'flac' && audioEncoder !== 'pcm_s16le') {
      args.push('-b:a', `${calculatedAudioBitrateKbps}k`);
    } else if (options.audioBitrate && audioEncoder !== 'copy' && audioEncoder !== 'flac' && audioEncoder !== 'pcm_s16le') {
      args.push('-b:a', options.audioBitrate);
    } else if (audioEncoder !== 'copy' && audioEncoder !== 'flac' && audioEncoder !== 'pcm_s16le') {
      // Default to 256k high-fidelity bitrate to preserve rich vocal harmonics and audio fullness
      args.push('-b:a', '256k');
    }

    if (options.audioSampleRate && audioEncoder !== 'copy') {
      args.push('-ar', options.audioSampleRate.toString());
    }

    if (options.audioChannels && audioEncoder !== 'copy') {
      args.push('-ac', options.audioChannels.toString());
    }
  }

  // Fast start for web playback
  if (format === 'mp4' || format === 'mov') {
    args.push('-movflags', '+faststart');
  }

  // Enforce hard file size cap if target size is specified
  if (hasTargetSize) {
    const maxBytes = Math.floor(options.targetSizeMb! * 1024 * 1024);
    args.push('-fs', maxBytes.toString());
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
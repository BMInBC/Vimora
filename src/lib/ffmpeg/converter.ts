import type { ConversionOptions, GpuCapabilities, OutputFormat } from '../types';
import { calculateTargetSizeBudget } from './bitrateBudget';
import { resolveEncoderForCodec } from './detector';

export function buildVideoFilterExpression(options: ConversionOptions): string | null {
  if (!options.resolution || options.videoCodec === 'copy') return null;
  const parts = options.resolution.split('x');
  if (parts.length !== 2) return null;
  const w = parseInt(parts[0], 10);
  const h = parseInt(parts[1], 10);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;

  const isVerticalTarget = h > w;
  const mode =
    options.aspectRatioMode ||
    (isVerticalTarget ? 'crop_fill' : options.maintainAspect !== false ? 'pad_black' : 'stretch');

  const scaleFlags = 'flags=lanczos+accurate_rnd';
  const isHD = w >= 1280 || h >= 720;
  const colorMatrix = isHD ? 'in_color_matrix=auto:out_color_matrix=bt709:' : '';

  if (mode === 'crop_fill') {
    const focus = options.subjectFocus || 'center';
    let cropX = '(iw-ow)/2';
    let cropY = '(ih-oh)/2';

    if (focus === 'top') {
      cropY = '0';
    } else if (focus === 'bottom') {
      cropY = 'ih-oh';
    } else if (focus === 'manual') {
      const pctX = Math.max(0, Math.min(100, options.cropPositionX ?? 50)) / 100;
      const pctY = Math.max(0, Math.min(100, options.cropPositionY ?? 50)) / 100;
      cropX = `(iw-ow)*${Number(pctX.toFixed(3))}`;
      cropY = `(ih-oh)*${Number(pctY.toFixed(3))}`;
    }

    return `scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=increase,crop=${w}:${h}:${cropX}:${cropY}`;
  }

  if (mode === 'blur_pad') {
    return `split[fg][bg];[bg]scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=25:5[bgblur];[fg]scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=decrease[fgfit];[bgblur][fgfit]overlay=(W-w)/2:(H-h)/2`;
  }

  if (mode === 'keep_original') {
    // Fit within target bounds preserving original aspect ratio and even dimensions (no crop, no bars)
    const maxDim = Math.max(w, h);
    return `scale='min(${maxDim},iw)':'min(${maxDim},ih)':${colorMatrix}${scaleFlags}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;
  }

  if (mode === 'stretch' || options.maintainAspect === false) {
    return `scale=${w}:${h}:${colorMatrix}${scaleFlags}`;
  }

  // pad_black: keep aspect ratio and pad with black borders
  return `scale=${w}:${h}:${colorMatrix}${scaleFlags}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
}

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
    let targetW: number | undefined;
    let targetH: number | undefined;
    if (options.resolution) {
      const parts = options.resolution.split('x');
      if (parts.length === 2) {
        targetW = parseInt(parts[0], 10) || undefined;
        targetH = parseInt(parts[1], 10) || undefined;
      }
    }

    const dur = durationSeconds && durationSeconds > 0 ? durationSeconds : 0;
    if (dur > 0) {
      const budget = calculateTargetSizeBudget({
        targetSizeMb: options.targetSizeMb!,
        durationSeconds: dur,
        width: targetW,
        height: targetH,
        fps: options.fps,
        outputFormat: format,
        videoCodec: options.videoCodec,
        keepAudio: options.keepAudio,
        qualityPreference: options.quality,
      });

      if (!budget.isLosslessFormat) {
        if (isAudioOnly) {
          calculatedAudioBitrateKbps = budget.audioBitrateKbps;
        } else {
          calculatedVideoBitrateKbps = budget.videoBitrateKbps;
          calculatedAudioBitrateKbps = budget.audioBitrateKbps;
        }
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
    const forceCpuForTwoPass = Boolean(hasTargetSize && options.strictTwoPass);
    const resolved = resolveEncoderForCodec(
      options.videoCodec,
      gpuCaps,
      enableGpu && !forceCpuForTwoPass
    );
    const videoEncoder = resolved.encoder;

    args.push('-c:v', videoEncoder);

    // Hardware encoder presets vs software
    if (videoEncoder.includes('nvenc')) {
      args.push('-preset', 'p4', '-tune', 'hq');
    } else if (videoEncoder === 'libx264' || videoEncoder === 'libx265') {
      args.push('-preset', 'medium');
    }

    // Resolution & Aspect Ratio filter with Lanczos scaling, subject-focus crop & BT.709 color preservation
    const vfExpr = buildVideoFilterExpression(options);
    if (vfExpr) {
      args.push('-vf', vfExpr);
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
        // Enforce calculated video bitrate budget to hit target size limit accurately
        const vBitrate = `${calculatedVideoBitrateKbps}k`;
        const maxrate = `${Math.round(calculatedVideoBitrateKbps * 1.15)}k`;
        const bufsize = `${Math.round(calculatedVideoBitrateKbps * 1.8)}k`;

        if (videoEncoder.includes('nvenc')) {
          // Hardware-native NVENC VBR + fullres multipass + VBV rate control
          args.push('-rc', 'vbr', '-multipass', 'fullres', '-b:v', vBitrate, '-maxrate', maxrate, '-bufsize', bufsize);
        } else {
          args.push('-b:v', vBitrate, '-maxrate', maxrate, '-bufsize', bufsize);
        }
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

  // Note: We deliberately avoid FFmpeg's -fs flag because it truncates the end of
  // the media stream when reached. Instead, we enforce target size via accurate
  // container-overhead bitrate budgeting + VBV rate control (-b:v, -maxrate, -bufsize)
  // and validate the real output size after conversion.

  // Output file
  args.push(outputPath);

  return args;
}

export interface TwoPassFfmpegArgs {
  pass1Args: string[];
  pass2Args: string[];
  passLogPrefix: string;
}

export function shouldUseCpuTwoPass(params: {
  options: ConversionOptions;
  gpuCaps?: GpuCapabilities;
  enableGpu?: boolean;
  durationSeconds?: number;
}): boolean {
  const { options, gpuCaps, enableGpu = true, durationSeconds } = params;
  const format = (options.outputFormat || 'mp4').toLowerCase() as OutputFormat;
  const isAudioOnly = ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(format);
  const hasTargetSize = typeof options.targetSizeMb === 'number' && options.targetSizeMb > 0;
  if (!hasTargetSize || isAudioOnly || !durationSeconds || durationSeconds <= 0) {
    return false;
  }
  if (options.videoCodec === 'copy') {
    return false;
  }
  const willUseGpu = Boolean(enableGpu && !options.strictTwoPass && gpuCaps?.hasGpu && gpuCaps.type !== 'cpu');
  return !willUseGpu;
}

export function buildTwoPassFfmpegArgs(
  params: BuildArgsParams,
  passLogPrefix: string,
  nullOutputTarget: string
): TwoPassFfmpegArgs {
  // Always use CPU software encoding for standard FFmpeg 2-pass
  const cpuBaseArgs = buildSafeFfmpegArgs({
    ...params,
    enableGpu: false,
  });

  // Pass 2: insert -pass 2 -passlogfile <prefix> right before outputPath
  const outIdx = cpuBaseArgs.length - 1;
  const pass2Args = [
    ...cpuBaseArgs.slice(0, outIdx),
    '-pass',
    '2',
    '-passlogfile',
    passLogPrefix,
    cpuBaseArgs[outIdx],
  ];

  // Pass 1: derive directly from cpuBaseArgs so video bitrate (-b:v) matches Pass 2 identically,
  // stripping only audio & movflags and routing to the null muxer
  const filteredPass1: string[] = [];
  const skipWithVal = new Set(['-c:a', '-b:a', '-ar', '-ac', '-movflags']);
  for (let i = 0; i < cpuBaseArgs.length - 1; i++) {
    const token = cpuBaseArgs[i];
    if (skipWithVal.has(token)) {
      i++; // skip flag value
      continue;
    }
    if (token === '-an') {
      continue;
    }
    filteredPass1.push(token);
  }
  const pass1Args = [
    ...filteredPass1,
    '-an',
    '-pass',
    '1',
    '-passlogfile',
    passLogPrefix,
    '-f',
    'null',
    nullOutputTarget,
  ];

  return { pass1Args, pass2Args, passLogPrefix };
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
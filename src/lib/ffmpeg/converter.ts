import { ConversionOptions, GpuCapabilities, OutputFormat } from '../types';

export interface BuildArgsParams {
  inputPath: string;
  outputPath: string;
  options: ConversionOptions;
  gpuCaps?: GpuCapabilities;
  enableGpu?: boolean;
  startTimeSeconds?: number;
  durationSeconds?: number;
}

export function buildSafeFfmpegArgs(params: BuildArgsParams): string[] {
  const { inputPath, outputPath, options, gpuCaps, enableGpu = true, startTimeSeconds, durationSeconds } = params;

  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid input path');
  }
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('Invalid output path');
  }

  const args: string[] = ['-hide_banner', '-y'];

  // Fast seek before input if specified
  if (startTimeSeconds && startTimeSeconds > 0) {
    args.push('-ss', startTimeSeconds.toString());
  }

  // Input file flag
  args.push('-i', inputPath);

  // Duration limit if specified (e.g. 5-10s preview snippet)
  if (durationSeconds && durationSeconds > 0) {
    args.push('-t', durationSeconds.toString());
  }

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

    // Video filters chain
    const vfList: string[] = [];

    // Resolution & Aspect Ratio filter
    if (options.resolution && options.videoCodec !== 'copy') {
      const parts = options.resolution.split('x');
      if (parts.length === 2) {
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h)) {
          if (options.maintainAspect !== false) {
            vfList.push(`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
          } else {
            vfList.push(`scale=${w}:${h}`);
          }
        }
      }
    }

    // Enhance: Resolution Upscale filter (Lanczos)
    if (options.enhance?.upscaleTarget && options.enhance.upscaleTarget !== 'none') {
      const targetRes = options.enhance.upscaleTarget === '4k' ? '3840:2160' : '1920:1080';
      vfList.push(`scale=${targetRes}:flags=lanczos`);
    }

    // Enhance: Denoise filter (HQDN3D)
    if (options.enhance?.denoise && options.enhance.denoise > 0) {
      const intensity = Math.min(10, (options.enhance.denoise / 100) * 10);
      const lumaS = (intensity * 0.8).toFixed(1);
      const chromaS = (intensity * 0.6).toFixed(1);
      const lumaT = (intensity * 1.2).toFixed(1);
      const chromaT = (intensity * 0.9).toFixed(1);
      vfList.push(`hqdn3d=${lumaS}:${chromaS}:${lumaT}:${chromaT}`);
    }

    // Enhance: Sharpening filter (Unsharp mask)
    if (options.enhance?.sharpen && options.enhance.sharpen > 0) {
      const lumaAmount = Math.min(2.5, (options.enhance.sharpen / 100) * 2.2).toFixed(2);
      vfList.push(`unsharp=5:5:${lumaAmount}:5:5:0.0`);
    }

    // Enhance: Color, Contrast, Brightness, Saturation (EQ filter)
    if (options.enhance) {
      const contrast = (options.enhance.eqContrast ?? 1.0).toFixed(2);
      const brightness = (options.enhance.eqBrightness ?? 0.0).toFixed(2);
      const saturation = (options.enhance.eqSaturation ?? 1.0).toFixed(2);
      if (contrast !== '1.00' || brightness !== '0.00' || saturation !== '1.00') {
        vfList.push(`eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`);
      }
    }

    // Compress: Quality Goal filter chain
    if (options.compress?.qualityGoal === 'enhance') {
      // 1. Subtle spatial denoise to clean source sensor grain/macroblocks so bits aren't wasted
      if (options.compress.denoiseArtifacts !== false) {
        vfList.push('hqdn3d=1.5:1.2:2.2:1.8');
      }

      // 2. Unsharp filter for edge clarity, text sharpness, and texture definition
      const clarity = options.compress.clarityBoost || 'crisp';
      const unsharpVal = clarity === 'ultra' ? '1.85' : clarity === 'subtle' ? '1.10' : '1.45';
      if (options.compress.enhanceClarity !== false) {
        vfList.push(`unsharp=5:5:${unsharpVal}:5:5:0.0`);
      }

      // 3. Dynamic contrast and vibrance polish (eliminates washed out tones)
      if (options.compress.colorPolish !== false) {
        vfList.push('eq=contrast=1.07:brightness=0.01:saturation=1.12');
      }
    } else if (options.compress?.qualityGoal === 'reduce' && options.compress.downscaleIfLarge) {
      // Optional smart downscale for extreme compression if video is higher than 720p
      vfList.push('scale=-2:min(720\\,ih)');
    }

    // Convert: Automatically improve video quality (edge clarity, artifact cleanup, dynamic color polish)
    const isConvertTool = options.toolType === 'convert' || (!options.compress && !options.enhance);
    if (isConvertTool && options.autoEnhanceQuality !== false && options.videoCodec !== 'copy') {
      // 1. Subtle spatial denoise to clean source sensor noise & previous compression blocking
      vfList.push('hqdn3d=1.2:1.0:1.8:1.5');
      // 2. Unsharp filter for crisp edge definition, text clarity, and sharp textures
      vfList.push('unsharp=5:5:1.25:5:5:0.0');
      // 3. Dynamic contrast and color polish so converted video is vibrant and never dull
      vfList.push('eq=contrast=1.05:brightness=0.01:saturation=1.08');
    }

    if (options.customVideoFilter) {
      vfList.push(options.customVideoFilter);
    }

    if (vfList.length > 0 && options.videoCodec !== 'copy') {
      args.push('-vf', vfList.join(','));
    }

    // Framerate
    if (options.fps && options.fps > 0) {
      args.push('-r', options.fps.toString());
    }

    // Video Bitrate / Compression
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    } else if (options.compress) {
      let targetCrf = 23;
      const goal = options.compress.qualityGoal || 'preserve';

      if (options.compress.mode === 'percentage') {
        const reduction = options.compress.reductionPercent || 50;
        if (goal === 'enhance') {
          // Keep CRF high fidelity (18-24) while filtering boosts clarity
          targetCrf = Math.round(18 + (reduction / 100) * 8);
        } else if (goal === 'reduce') {
          // Aggressive size drop (26-35)
          targetCrf = Math.round(26 + (reduction / 100) * 11);
        } else {
          // Balanced preserve (20-28)
          targetCrf = Math.round(20 + (reduction / 100) * 10);
        }
      } else if (options.compress.mode === 'quality') {
        const lvl = options.compress.qualityLevel || 'balanced';
        if (goal === 'enhance') {
          targetCrf = lvl === 'ultra' ? 18 : lvl === 'small' ? 23 : 20;
        } else if (goal === 'reduce') {
          targetCrf = lvl === 'ultra' ? 24 : lvl === 'small' ? 33 : 29;
        } else {
          targetCrf = lvl === 'ultra' ? 19 : lvl === 'small' ? 28 : 23;
        }
      } else {
        // Target size mode
        const mb = options.compress.targetSizeMb || 25;
        if (goal === 'enhance') {
          targetCrf = mb <= 10 ? 23 : mb <= 25 ? 20 : 18;
        } else if (goal === 'reduce') {
          targetCrf = mb <= 10 ? 32 : mb <= 25 ? 29 : 26;
        } else {
          targetCrf = mb <= 10 ? 28 : mb <= 25 ? 24 : 22;
        }
      }

      const crfStr = targetCrf.toString();
      if (videoEncoder.includes('nvenc')) {
        args.push('-cq', crfStr);
      } else {
        args.push('-crf', crfStr);
      }
    } else {
      // Quality presets for Convert (defaults to high-fidelity CRF 18 to enhance clarity and avoid quality degradation)
      if (options.quality === 'smaller') {
        if (videoEncoder.includes('nvenc')) {
          args.push('-cq', '24');
        } else {
          args.push('-crf', '24');
        }
      } else if (options.quality === 'balanced') {
        if (videoEncoder.includes('nvenc')) {
          args.push('-cq', '20');
        } else {
          args.push('-crf', '20');
        }
      } else {
        // 'high' or default
        if (videoEncoder.includes('nvenc')) {
          args.push('-cq', '18');
        } else {
          args.push('-crf', '18');
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